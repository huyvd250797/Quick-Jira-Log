'use strict';

const { sendJson, readJson, assertSameOrigin, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const { overtimeBusy } = require('../lib/bulk');
const worklogpro = require('../lib/worklogpro');
const { MAX_REGULAR_MINUTES } = require('../lib/config');
const {
  JiraError,
  getMyself,
  getIssue,
  createWorklog,
  deleteWorklog,
  transitionIssueToDone
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
const { createProgressChannel } = require('../lib/progress');

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
  const overtimeStart = overtime ? String(body.overtimeStart || '') : '';
  if (overtimeStart && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(overtimeStart)) throw new JiraError('Giờ bắt đầu Overtime không hợp lệ.', 400);

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
    throw new JiraError('Mỗi lần log tối đa 8h trong khung giờ thường. Chọn Overtime nếu cần log ngoài giờ.', 400);
  }

  perf.report?.(5, 'Đang đọc thông tin task');
  const mePromise = session.me ? Promise.resolve(session.me) : perf.step('myself', () => getMyself(session));
  const issuePromise = perf.step('issue', () => getIssue(key, session));
  const [me, issue] = await Promise.all([mePromise, issuePromise]);

  const actualProject = String(issue?.fields?.project?.key || '').toUpperCase();
  if (actualProject !== project) {
    throw new JiraError(`Issue ${key} thuộc PROJECT ${actualProject || 'khác'}, không phải ${project}.`, 400);
  }

  perf.report?.(20, 'Đang kiểm tra giờ trống');
  const guard = await perf.step('guard', () => loadOccupiedRangesStable(date, [key], me, session));
  const windows = workWindowsFor(date, overtime);
  if (!overtime) {
    const alreadyRegular = minutesInsideWindows(guard.occupied, workWindowsFor(date, false));
    if (alreadyRegular + minutes > MAX_REGULAR_MINUTES) {
      throw new JiraError(`Ngày ${date} đã có ${fmtMinutes(alreadyRegular)} trong giờ thường. Tổng worklog thường không được vượt 8h. Chọn Overtime để log thêm ngoài giờ.`, 409);
    }
  }
  let plan;
  try {
    plan = scheduleForDate(minutes, overtime ? overtimeBusy(guard.occupied, overtimeStart) : guard.occupied, date, overtime);
    validateScheduledSegments(plan, guard.occupied, windows);
  } catch (error) {
    throw planningError(error, date, overtime);
  }

  perf.report?.(40, 'Đã kiểm tra xong; đang ghi worklog');
  let completedSegments = 0;
  const created = [];
  const attribute = overtime ? await worklogpro.getOvertimeAttribute(session) : null;
  try {
    const creationResults = await perf.step('createWorklogs', () => settleMapWithConcurrency(plan, 2, async seg => {
      const worklog = await createWorklog(key, {
        started: jiraStarted(date, seg.start),
        seconds: seg.minutes * 60,
        description
      }, session);
      if (!worklog?.id) throw new JiraError('Jira chưa trả về ID worklog. Hãy tải lại lịch trước khi thử lại.', 502);
      created.push({ id: worklog.id, segment: seg });
      if (overtime) {
        const current = await worklogpro.getWorklog(worklog.id, session);
        await worklogpro.updateNativeWorklog({ key, worklogId: worklog.id, current, attribute, overtime: true,
          started: jiraStarted(date, seg.start), seconds: seg.minutes * 60, description }, session);
      }
      completedSegments += 1;
      perf.report?.(40 + 40 * completedSegments / plan.length, `Đã ghi ${completedSegments}/${plan.length} worklog`);
      return { id: worklog?.id, segment: seg };
    }));

    const failedCreation = creationResults.find(x => x.status === 'rejected');
    if (failedCreation) throw failedCreation.reason;

  } catch (error) {
    perf.report?.(80, 'Có lỗi; đang xử lý hoàn tác, vui lòng chờ');
    const rollback = await Promise.allSettled(created.filter(x => x.id).map(x => deleteWorklog(key, x.id, session)));
    await invalidateWorklogCaches(session, date, [key]);
    const remaining = created.filter((x, i) => rollback[i]?.status !== 'fulfilled' || rollback[i]?.value !== true);
    if (remaining.length) throw new JiraError('Logwork bị gián đoạn và chưa hoàn tác hết. Hãy tải lại lịch/Jira trước khi log lại để tránh trùng.', 502,
      { resultUnknown: true, remainingWorklogIds: remaining.map(x => String(x.id)) }, 'WORKLOG_ROLLBACK_INCOMPLETE');
    throw error;
  }

  perf.report?.(90, 'Đang cập nhật trạng thái task');
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
    overtimeVerified: overtime,
    overtimeSource: overtime ? 'worklogpro' : '',
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
    perf.report = createProgressChannel(req, res);
    const requestId = normalizeRequestId(body.requestId || req.headers['x-request-id']);
    const result = await runIdempotent('worklog', requestId, () => performWorklog(body, session, perf));
    perf.report?.(98, 'Đang cập nhật dữ liệu và hoàn tất');
    await invalidateWorklogCaches(session, result.value.date, [result.value.issue?.key]);
    const performance = perf.snapshot({ replayed: result.replayed ? 1 : 0 });
    if (!res.headersSent) res.setHeader('Server-Timing', perf.serverTimingHeader({ replayed: result.replayed ? 1 : 0 }));
    return sendJson(res, 200, { ...result.value, performance, idempotencyStore: result.store, requestId: result.requestId || undefined, replayed: result.replayed || undefined });
  } catch (error) {
    if (error?.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { ok: false, error: 'Dữ liệu gửi lên quá lớn.' });
    if (error?.message === 'INVALID_JSON') return sendJson(res, 400, { ok: false, error: 'Dữ liệu gửi lên không hợp lệ.' });
    if (error?.code === 'IDEMPOTENCY_IN_PROGRESS') return sendJson(res, 409, { ok: false, error: error.message, code: error.code });
    if (error?.code === 'IDEMPOTENCY_STORE_UNAVAILABLE') return sendJson(res, 503, { ok: false, error: error.message, code: error.code });
    if (error instanceof JiraError) {
      if (error.status === 401 && !res.headersSent) res.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(res, error.status || 500, { ok: false, error: error.message, code: error.code, details: error.details || undefined });
    }
    return sendJson(res, 500, { ok: false, error: 'Logwork thất bại. Vui lòng thử lại.' });
  }
};
