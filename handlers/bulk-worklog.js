'use strict';

const { sendJson, readJson, assertSameOrigin, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const { BULK_MAX_ITEMS, MAX_REGULAR_MINUTES } = require('../lib/config');
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
const { parseTimeSpent, jiraStarted, displaySegments, windowsLabel, minutesInsideWindows, workWindowsFor } = require('../lib/scheduler');
const { loadOccupiedRangesStable } = require('../lib/worklog-guard');
const { planBulkItems } = require('../lib/bulk');
const { normalizeRequestId, runIdempotent } = require('../lib/idempotency');
const { mapWithConcurrency, settleMapWithConcurrency } = require('../lib/async');

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function fmtMinutes(minutes) {
  return `${Math.floor(minutes / 60)}h${minutes % 60 ? `${minutes % 60}m` : ''}`;
}

function toBoolean(value) {
  return value === true || value === 1 || String(value || '').toLowerCase() === 'true';
}

function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems) || !rawItems.length) throw new JiraError('Hãy chọn ít nhất một issue để Bulk Logwork.', 400);
  if (rawItems.length > BULK_MAX_ITEMS) throw new JiraError(`Mỗi lần Bulk Logwork tối đa ${BULK_MAX_ITEMS} issue.`, 400);

  const seen = new Set();
  return rawItems.map((raw, index) => {
    const key = String(raw?.key || '').trim().toUpperCase();
    const project = String(raw?.project || '').trim().toUpperCase();
    const timeSpent = String(raw?.timeSpent || '').trim();
    const description = String(raw?.description || '').trim();
    const overtime = toBoolean(raw?.overtime);
    if (!key || !project || !timeSpent) throw new JiraError(`Dòng ${index + 1}: thiếu KEY, PROJECT hoặc TimeSpent.`, 400);
    if (!key.startsWith(`${project}-`)) throw new JiraError(`Dòng ${index + 1}: KEY ${key} không khớp PROJECT ${project}.`, 400);
    if (seen.has(key)) throw new JiraError(`KEY ${key} đang xuất hiện nhiều hơn một lần trong danh sách Bulk.`, 400);
    seen.add(key);

    let minutes;
    try { minutes = parseTimeSpent(timeSpent); }
    catch (error) {
      throw new JiraError(error.message === 'TIME_SPENT_TOO_LARGE'
        ? `Dòng ${index + 1}: TimeSpent quá lớn.`
        : `Dòng ${index + 1}: TimeSpent không hợp lệ. Ví dụ 30m, 1h, 1h30m.`, 400);
    }
    if (!overtime && minutes > MAX_REGULAR_MINUTES) {
      throw new JiraError(`Dòng ${index + 1}: worklog thường tối đa 8h. Hãy bật Overtime nếu cần log ngoài giờ.`, 400);
    }
    return { key, project, timeSpent, description, overtime, minutes, order: index };
  });
}

function planningError(error, item, date) {
  const overtime = item?.overtime === true;
  if (error?.message === 'NOT_ENOUGH_TIME') {
    return new JiraError(`Không đủ thời gian trống để xếp ${item?.key || 'Bulk Logwork'} trong khung ${windowsLabel(date, overtime)}. Còn ${fmtMinutes(error.availableMinutes || 0)}, cần ${fmtMinutes(error.requiredMinutes || 0)}.`, 409);
  }
  if (error?.message === 'SEGMENT_OUTSIDE_WORK_WINDOWS') {
    return new JiraError(`Hệ thống phát hiện giờ Bulk Logwork nằm ngoài khung ${windowsLabel(date, overtime)} nên đã chặn thao tác.`, 409);
  }
  if (error?.message === 'SEGMENT_OVERLAP') {
    return new JiraError('Hệ thống phát hiện Bulk Logwork bị trùng giờ với worklog hiện có nên đã chặn thao tác.', 409);
  }
  return error;
}

async function performBulk(body, session) {
  const date = String(body.date || '').trim();
  if (!validDate(date)) throw new JiraError('Ngày Bulk Logwork không hợp lệ.', 400);

  const items = normalizeItems(body.items);
  const mePromise = session.me ? Promise.resolve(session.me) : getMyself(session);
  const issueDetailsPromise = mapWithConcurrency(items, 8, item => getIssue(item.key, session));
  const [me, issueDetails] = await Promise.all([mePromise, issueDetailsPromise]);

  const verified = items.map((item, index) => {
    const issue = issueDetails[index];
    const actualProject = String(issue?.fields?.project?.key || '').toUpperCase();
    if (actualProject !== item.project) {
      throw new JiraError(`Issue ${item.key} thuộc PROJECT ${actualProject || 'khác'}, không phải ${item.project}.`, 400);
    }
    const summary = String(issue?.fields?.summary || '');
    return { ...item, summary, description: item.description || summary };
  });
  if (verified.some(item => !item.description)) throw new JiraError('Có issue không có Description/Summary để logwork.', 400);

  // Preflight toàn bộ field OT song song có giới hạn trước khi tạo bất kỳ worklog nào.
  const overtimePrepared = new Map();
  const overtimeItems = verified.filter(item => item.overtime);
  const preparedOvertime = await mapWithConcurrency(overtimeItems, 5, item => prepareOvertimeUpdate(item.key, session));
  overtimeItems.forEach((item, index) => overtimePrepared.set(item.key, preparedOvertime[index]));

  const targetKeys = verified.map(item => item.key);
  const initialGuard = await loadOccupiedRangesStable(date, targetKeys, me, session);
  const alreadyRegular = minutesInsideWindows(initialGuard.occupied, workWindowsFor(date, false));
  const requestedRegular = verified.filter(item => !item.overtime).reduce((sum, item) => sum + item.minutes, 0);
  if (alreadyRegular + requestedRegular > MAX_REGULAR_MINUTES) {
    throw new JiraError(`Ngày ${date} đã có ${fmtMinutes(alreadyRegular)} trong giờ thường. Tổng worklog thường của batch này sẽ vượt 8h; hãy bật Overtime cho các Sub-task ngoài giờ.`, 409);
  }
  let planned;
  try { planned = planBulkItems(verified, initialGuard.occupied, { date }).plans; }
  catch (error) { throw planningError(error, error.bulkItem || verified[0], date); }

  const created = [];
  const actualPlans = planned.map(plan => {
    const item = verified.find(x => x.key === plan.key) || plan;
    return { ...item, segments: plan.segments };
  });
  const appliedOvertime = [];
  try {
    const creationJobs = actualPlans.flatMap(item => item.segments.map(segment => ({ item, segment })));
    const creationResults = await settleMapWithConcurrency(creationJobs, 4, async ({ item, segment }) => {
      const worklog = await createWorklog(item.key, {
        started: jiraStarted(date, segment.start),
        seconds: segment.minutes * 60,
        description: item.description
      }, session);
      return { key: item.key, id: worklog?.id, segment };
    });
    created.push(...creationResults.filter(x => x.status === 'fulfilled').map(x => x.value));
    const failedCreation = creationResults.find(x => x.status === 'rejected');
    if (failedCreation) throw failedCreation.reason;

    const otApplyResults = await settleMapWithConcurrency(overtimeItems, 4, async item => {
      const prepared = overtimePrepared.get(item.key);
      await applyOvertimeUpdate(prepared, session);
      return prepared;
    });
    appliedOvertime.push(...otApplyResults.filter(x => x.status === 'fulfilled').map(x => x.value));
    const failedOt = otApplyResults.find(x => x.status === 'rejected');
    if (failedOt) throw failedOt.reason;
  } catch (error) {
    await Promise.allSettled(created.filter(x => x.id).map(x => deleteWorklog(x.key, x.id, session)));
    await Promise.allSettled(appliedOvertime.map(prepared => restoreOvertimeUpdate(prepared, session)));
    throw error;
  }

  const transitionResults = await settleMapWithConcurrency(verified, 4, async (item, index) => ({
    key: item.key,
    ...(await transitionIssueToDone(item.key, session, issueDetails[index]))
  }));
  const expiredSession = transitionResults.find(x => x.status === 'rejected' && x.reason instanceof JiraError && x.reason.status === 401);
  if (expiredSession) throw expiredSession.reason;
  const transitions = transitionResults.map((result, index) => result.status === 'fulfilled'
    ? result.value
    : { key: verified[index].key, ok: false, message: result.reason?.message || 'Chưa chuyển được sang Done.' });

  return {
    ok: true,
    date,
    totalMinutes: verified.reduce((sum, item) => sum + item.minutes, 0),
    audit: {
      checkedIssues: initialGuard.issueKeys.length,
      checkedWorklogs: initialGuard.checkedWorklogs,
      occupiedBefore: displaySegments(initialGuard.occupied.map(r => ({ ...r, minutes: r.end - r.start }))),
      sources: initialGuard.sources
    },
    transitions,
    items: actualPlans.map(item => ({
      key: item.key,
      project: item.project,
      summary: item.summary,
      description: item.description,
      overtime: item.overtime === true,
      workWindow: windowsLabel(date, item.overtime === true),
      minutes: item.minutes,
      segments: displaySegments(item.segments)
    }))
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!assertSameOrigin(req)) return sendJson(res, 403, { ok: false, error: 'INVALID_ORIGIN' });

  const session = getSession(req);
  if (!session) return sendJson(res, 401, { ok: false, error: 'Vui lòng đăng nhập Jira.' });

  try {
    const body = await readJson(req, 96 * 1024);
    const requestId = normalizeRequestId(body.requestId || req.headers['x-request-id']);
    const result = await runIdempotent('bulk-worklog', requestId, () => performBulk(body, session));
    return sendJson(res, 200, { ...result.value, requestId: result.requestId || undefined, replayed: result.replayed || undefined });
  } catch (error) {
    if (error?.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { ok: false, error: 'Dữ liệu Bulk quá lớn.' });
    if (error?.message === 'INVALID_JSON') return sendJson(res, 400, { ok: false, error: 'Dữ liệu Bulk không hợp lệ.' });
    if (error instanceof JiraError) {
      if (error.status === 401) res.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(res, error.status || 500, { ok: false, error: error.message, details: error.details || undefined });
    }
    return sendJson(res, 500, { ok: false, error: 'Bulk Logwork thất bại. Các worklog vừa tạo (nếu có) đã được rollback.' });
  }
};
