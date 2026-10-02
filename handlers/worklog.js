'use strict';

const { sendJson, readJson, assertSameOrigin, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const { MAX_REGULAR_MINUTES } = require('../lib/config');
const {
  JiraError,
  getMyself,
  getIssue,
  createWorklog,
  deleteWorklog,
  transitionIssueToDone,
  prepareOvertimeUpdate,
  applyOvertimeUpdate,
  restoreOvertimeUpdate
} = require('../lib/jira');
const {
  parseTimeSpent,
  scheduleForDate,
  jiraStarted,
  displaySegments,
  validateScheduledSegments,
  workWindowsFor,
  windowsLabel,
  minutesInsideWindows
} = require('../lib/scheduler');
const { loadOccupiedRangesStable } = require('../lib/worklog-guard');
const { normalizeRequestId, runIdempotent } = require('../lib/idempotency');
const { settleMapWithConcurrency } = require('../lib/async');
const { invalidateWorklogCaches } = require('../lib/app-cache');
const { createPerf } = require('../lib/perf');

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function fmtMinutes(minutes) {
  return `${Math.floor(minutes / 60)}h${minutes % 60 ? `${minutes % 60}m` : ''}`;
}

function toBoolean(value) {
  return value === true || value === 1 || String(value || '').toLowerCase() === 'true';
}

function planningError(error, date, overtime) {
  if (error.message === 'NOT_ENOUGH_TIME') {
    return new JiraError(`Không đủ thời gian trống trong khung ${windowsLabel(date, overtime)}. Còn ${fmtMinutes(error.availableMinutes)}, cần ${fmtMinutes(error.requiredMinutes)}.`, 409);
  }
  if (error.message === 'SEGMENT_OUTSIDE_WORK_WINDOWS') {
    return new JiraError(`Hệ thống phát hiện giờ log nằm ngoài khung ${windowsLabel(date, overtime)} nên đã chặn thao tác.`, 409);
  }
  if (error.message === 'SEGMENT_OVERLAP') {
    return new JiraError('Hệ thống phát hiện khoảng giờ bị trùng worklog hiện có nên đã chặn thao tác.', 409);
  }
  return error;
}

async function performWorklog(body, session, perf) {
  const key = String(body.key || '').trim().toUpperCase();
  const project = String(body.project || '').trim().toUpperCase();
  const timeSpent = String(body.timeSpent || '').trim();
  const date = String(body.date || '').trim();
  const description = String(body.description || '').trim();
  const overtime = toBoolean(body.overtime);

  if (!key || !project || !timeSpent || !date || !description) {
    throw new JiraError('Vui lòng nhập đủ KEY, PROJECT, TimeSpent, Date và Description.', 400);
  }
  if (!validDate(date)) throw new JiraError('Ngày không hợp lệ.', 400);
  if (!key.startsWith(`${project}-`)) throw new JiraError(`KEY ${key} không khớp PROJECT ${project}.`, 400);

  let minutes;
  try { minutes = parseTimeSpent(timeSpent); }
  catch (error) {
    throw new JiraError(error.message === 'TIME_SPENT_TOO_LARGE'
      ? 'TimeSpent quá lớn.'
      : 'TimeSpent không hợp lệ. Ví dụ: 30m, 1h, 1h30m, 2.5h.', 400);
  }
  if (!overtime && minutes > MAX_REGULAR_MINUTES) {
    throw new JiraError('Worklog thường tối đa 8h. Nếu cần log ngoài giờ, hãy bật Overtime cho Sub-task.', 400);
  }

  const mePromise = session.me ? Promise.resolve(session.me) : perf.step('myself', () => getMyself(session));
  const issuePromise = perf.step('issue', () => getIssue(key, session));
  const [me, issue] = await Promise.all([mePromise, issuePromise]);

  const actualProject = String(issue?.fields?.project?.key || '').toUpperCase();
  if (actualProject !== project) {
    throw new JiraError(`Issue ${key} thuộc PROJECT ${actualProject || 'khác'}, không phải ${project}.`, 400);
  }

  // Chạy kiểm tra timeline và preflight OT song song để giảm thời gian chờ Jira.
  const [guard, overtimePrepared] = await Promise.all([
    perf.step('guard', () => loadOccupiedRangesStable(date, [key], me, session)),
    overtime ? perf.step('otPreflight', () => prepareOvertimeUpdate(key, session)) : Promise.resolve(null)
  ]);
  const windows = workWindowsFor(date, overtime);
  if (!overtime) {
    const alreadyRegular = minutesInsideWindows(guard.occupied, workWindowsFor(date, false));
    if (alreadyRegular + minutes > MAX_REGULAR_MINUTES) {
      throw new JiraError(`Ngày ${date} đã có ${fmtMinutes(alreadyRegular)} trong giờ thường. Tổng worklog thường không được vượt 8h; hãy bật Overtime cho phần ngoài giờ.`, 409);
    }
  }
  let plan;
  try {
    plan = scheduleForDate(minutes, guard.occupied, date, overtime);
    validateScheduledSegments(plan, guard.occupied, windows);
  } catch (error) {
    throw planningError(error, date, overtime);
  }

  const created = [];
  let overtimeApplied = false;
  try {
    const creationResults = await perf.step('createWorklogs', () => settleMapWithConcurrency(plan, 2, async seg => {
      const worklog = await createWorklog(key, {
        started: jiraStarted(date, seg.start),
        seconds: seg.minutes * 60,
        description
      }, session);
      return { id: worklog?.id, segment: seg };
    }));
    created.push(...creationResults.filter(x => x.status === 'fulfilled').map(x => x.value));
    const failedCreation = creationResults.find(x => x.status === 'rejected');
    if (failedCreation) throw failedCreation.reason;

    if (overtimePrepared) {
      await perf.step('applyOvertime', () => applyOvertimeUpdate(overtimePrepared, session));
      overtimeApplied = true;
    }
  } catch (error) {
    await Promise.allSettled(created.filter(x => x.id).map(x => deleteWorklog(key, x.id, session)));
    if (overtimeApplied && overtimePrepared) await restoreOvertimeUpdate(overtimePrepared, session);
    throw error;
  }

  let transition = { ok: false, message: 'Chưa kiểm tra transition.' };
  try {
    transition = await perf.step('transition', () => transitionIssueToDone(key, session, issue));
  } catch (error) {
    if (error instanceof JiraError && error.status === 401) throw error;
    transition = { ok: false, message: error?.message || 'Worklog đã tạo nhưng chưa chuyển được sang Done.' };
  }

  return {
    ok: true,
    issue: { key, summary: issue?.fields?.summary || '', previousStatus: issue?.fields?.status?.name || '' },
    project,
    date,
    overtime,
    overtimeField: overtimePrepared ? { fieldId: overtimePrepared.fieldId, fieldName: overtimePrepared.fieldName } : null,
    workWindow: windowsLabel(date, overtime),
    totalMinutes: minutes,
    segments: displaySegments(plan),
    worklogIds: created.map(x => String(x.id || '')).filter(Boolean),
    transition,
    audit: {
      checkedIssues: guard.issueKeys.length,
      checkedWorklogs: guard.checkedWorklogs,
      occupiedBefore: displaySegments(guard.occupied.map(r => ({ ...r, minutes: r.end - r.start }))),
      sources: guard.sources,
      optimizedGuard: true
    }
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!assertSameOrigin(req)) return sendJson(res, 403, { ok: false, error: 'INVALID_ORIGIN' });

  const session = getSession(req);
  if (!session) return sendJson(res, 401, { ok: false, error: 'Vui lòng đăng nhập Jira.' });

  try {
    const perf = createPerf();
    const body = await perf.step('readRequest', () => readJson(req));
    const requestId = normalizeRequestId(body.requestId || req.headers['x-request-id']);
    const result = await runIdempotent('worklog', requestId, () => performWorklog(body, session, perf));
    await invalidateWorklogCaches(session, result.value.date, [result.value.issue?.key]);
    const performance = perf.snapshot({ replayed: result.replayed ? 1 : 0 });
    res.setHeader('Server-Timing', perf.serverTimingHeader({ replayed: result.replayed ? 1 : 0 }));
    return sendJson(res, 200, { ...result.value, performance, idempotencyStore: result.store, requestId: result.requestId || undefined, replayed: result.replayed || undefined });
  } catch (error) {
    if (error?.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { ok: false, error: 'Dữ liệu gửi lên quá lớn.' });
    if (error?.message === 'INVALID_JSON') return sendJson(res, 400, { ok: false, error: 'Dữ liệu gửi lên không hợp lệ.' });
    if (error?.code === 'IDEMPOTENCY_IN_PROGRESS') return sendJson(res, 409, { ok: false, error: error.message, code: error.code });
    if (error?.code === 'IDEMPOTENCY_STORE_UNAVAILABLE') return sendJson(res, 503, { ok: false, error: error.message, code: error.code });
    if (error instanceof JiraError) {
      if (error.status === 401) res.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(res, error.status || 500, { ok: false, error: error.message, details: error.details || undefined });
    }
    return sendJson(res, 500, { ok: false, error: 'Logwork thất bại. Vui lòng thử lại.' });
  }
};
