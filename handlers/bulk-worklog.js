'use strict';

const { sendJson, readJson, assertSameOrigin, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const worklogpro = require('../lib/worklogpro');
const { BULK_MAX_ITEMS, MAX_REGULAR_MINUTES } = require('../lib/config');
const {
  JiraError,
  getMyself,
  getIssuesByKeys,
  createWorklog,
  deleteWorklog,
  transitionIssueToDone
} = require('../lib/jira');
const { parseTimeSpent, jiraStarted, displaySegments, windowsLabel, minutesInsideWindows, workWindowsFor } = require('../lib/scheduler');
const { loadOccupiedRangesStable } = require('../lib/worklog-guard');
const batchPlan = require('../lib/batch-plan');
const { planBulkItems } = require('../lib/bulk');
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
    const overtimeStart = overtime ? String(raw?.overtimeStart || '') : '';
    if (overtimeStart && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(overtimeStart)) throw new JiraError(`Dòng ${index + 1}: giờ Overtime không hợp lệ.`, 400);
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
      throw new JiraError(`Dòng ${index + 1}: worklog thường tối đa 8h. Chọn Overtime để log ngoài giờ.`, 400);
    }
    return { key, project, timeSpent, description, overtime, overtimeStart, minutes, order: index };
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

async function performBulk(body, session, perf) {
  const date = String(body.date || '').trim();
  if (!validDate(date)) throw new JiraError('Ngày Bulk Logwork không hợp lệ.', 400);

  const items = normalizeItems(body.items);
  if(body.exactPlan!==undefined&&!Array.isArray(body.exactPlan))throw new JiraError('Danh sách lịch xem trước không hợp lệ.',400);
  perf.report?.(5, 'Đang đọc thông tin các task');
  const mePromise = session.me ? Promise.resolve(session.me) : perf.step('myself', () => getMyself(session));
  const issueDetailsPromise = perf.step('issueBatch', () => getIssuesByKeys(items.map(item => item.key), session, body.exactPlan ? {extraFields:['issuetype']} : {}));
  const verifiedPromise = issueDetailsPromise.then(issueDetails => {
    const issueMap = new Map((issueDetails || []).map(issue => [String(issue?.key || '').toUpperCase(), issue]));

    const verified = items.map((item) => {
      const issue = issueMap.get(item.key);
      if (!issue) throw new JiraError(`Không tải được thông tin issue ${item.key} từ Jira.`, 404);
      const actualProject = String(issue?.fields?.project?.key || '').toUpperCase();
      if (actualProject !== item.project) {
        throw new JiraError(`Issue ${item.key} thuộc PROJECT ${actualProject || 'khác'}, không phải ${item.project}.`, 400);
      }
      if (body.exactPlan && issue?.fields?.issuetype?.subtask !== true) throw new JiraError('Phân bổ lịch chỉ hỗ trợ Subtask.',400);
      const summary = String(issue?.fields?.summary || '');
      return { ...item, summary, description: item.description || summary };
    });
    if (verified.some(item => !item.description)) throw new JiraError('Có issue không có Description/Summary để logwork.', 400);

    return { issueMap, verified };
  });
  const targetKeys = items.map(item => item.key);
  const guardPromise = mePromise.then(me => perf.step('guard', () =>
    loadOccupiedRangesStable(date, targetKeys, me, session, { beforeRead: verifiedPromise })));
  const [me, { issueMap, verified }, initialGuard] = await Promise.all([mePromise, verifiedPromise, guardPromise]);
  perf.report?.(25, 'Đã kiểm tra giờ trống; đang phân lịch');
  const alreadyRegular = minutesInsideWindows(initialGuard.occupied, workWindowsFor(date, false));
  const requestedRegular = verified.filter(item => !item.overtime).reduce((sum, item) => sum + item.minutes, 0);
  const overlapConfirmed=Array.isArray(body.exactPlan)&&body.confirmOverlaps===true&&body.exactPlan.some(p=>p.allowOverlap===true);
  if (alreadyRegular + requestedRegular > MAX_REGULAR_MINUTES && !overlapConfirmed) {
    throw new JiraError(`Ngày ${date} đã có ${fmtMinutes(alreadyRegular)} trong giờ thường. Tổng worklog thường của batch này sẽ vượt 8h. Chọn Overtime cho các dòng cần log ngoài giờ.`, 409);
  }
  let planned;
  try {
    if (body.exactPlan) {
      if(body.exactPlan.some(p=>p.allowOverlap===true)&&body.confirmOverlaps!==true)throw new JiraError('Phải xác nhận cảnh báo xếp trùng trước khi ghi lịch.',400);
      batchPlan.validate(body.exactPlan,{[date]:initialGuard.occupied},[date]);
      if (body.exactPlan.length !== verified.length || verified.some(item=>item.overtime || !body.exactPlan.some(p=>p.key===item.key&&p.segments.reduce((n,s)=>n+s.minutes,0)===item.minutes))) throw new JiraError('Phân bổ không khớp Subtask/thời lượng đã xác nhận.',400);
      planned=body.exactPlan.map(p=>({...p,segments:p.segments.map(s=>({start:batchPlan.minute(s.start),end:batchPlan.minute(s.start)+s.minutes,minutes:s.minutes}))}));
    } else planned = planBulkItems(verified, initialGuard.occupied, { date }).plans;
  }
  catch (error) { if(body.exactPlan && !(error instanceof JiraError)) throw new JiraError(error.message,409); throw planningError(error, error.bulkItem || verified[0], date); }

  const created = [];
  const attribute = verified.some(item => item.overtime) ? await worklogpro.getOvertimeAttribute(session) : null;
  const actualPlans = planned.map(plan => {
    const item = verified.find(x => x.key === plan.key) || plan;
    return { ...item, segments: plan.segments };
  });
  try {
    const creationJobs = actualPlans.flatMap(item => item.segments.map(segment => ({ item, segment })));
    let completedSegments = 0;
    perf.report?.(40, `Đang ghi ${creationJobs.length} worklog`);
    const creationResults = await perf.step('createWorklogs', () => settleMapWithConcurrency(creationJobs, 4, async ({ item, segment }) => {
      const worklog = await createWorklog(item.key, {
        started: jiraStarted(date, segment.start),
        seconds: segment.minutes * 60,
        description: item.description
      }, session);
      if (!worklog?.id) throw new JiraError('Jira chưa trả về ID worklog. Hãy tải lại lịch trước khi thử lại.', 502);
      created.push({ key: item.key, id: worklog.id, segment });
      if (item.overtime) {
        const current = await worklogpro.getWorklog(worklog.id, session);
        await worklogpro.updateNativeWorklog({ key: item.key, worklogId: worklog.id, current, attribute, overtime: true,
          started: jiraStarted(date, segment.start), seconds: segment.minutes * 60, description: item.description }, session);
      }
      completedSegments += 1;
      perf.report?.(40 + 40 * completedSegments / creationJobs.length, `Đã ghi ${completedSegments}/${creationJobs.length} worklog`);
      return { key: item.key, id: worklog?.id, segment };
    }));

    const failedCreation = creationResults.find(x => x.status === 'rejected');
    if (failedCreation) throw failedCreation.reason;

  } catch (error) {
    perf.report?.(80, 'Có lỗi; đang xử lý hoàn tác, vui lòng chờ');
    const rollback = await Promise.allSettled(created.filter(x => x.id).map(x => deleteWorklog(x.key, x.id, session)));
    await invalidateWorklogCaches(session, date, targetKeys);
    const remaining = created.filter((x, i) => rollback[i]?.status !== 'fulfilled' || rollback[i]?.value !== true);
    if (remaining.length) throw new JiraError('Logwork bị gián đoạn và chưa hoàn tác hết. Hãy tải lại lịch/Jira trước khi log lại để tránh trùng.', 502,
      { resultUnknown: true, remainingWorklogIds: remaining.map(x => String(x.id)) }, 'WORKLOG_ROLLBACK_INCOMPLETE');
    throw error;
  }

  perf.report?.(90, 'Đang cập nhật trạng thái các task');
  const transitionResults = await perf.step('transitions', () => settleMapWithConcurrency(verified, 4, async (item) => ({
    key: item.key,
    ...(await transitionIssueToDone(item.key, session, issueMap.get(item.key)))
  })));
  const expiredSession = transitionResults.find(x => x.status === 'rejected' && x.reason instanceof JiraError && x.reason.status === 401);
  if (expiredSession && !body.exactPlan) throw expiredSession.reason;
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
      overtimeVerified: item.overtime === true,
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
    const perf = createPerf();
    const body = await perf.step('readRequest', () => readJson(req, 96 * 1024));
    perf.report = createProgressChannel(req, res);
    const requestId = normalizeRequestId(body.requestId || req.headers['x-request-id']);
    const result = await runIdempotent('bulk-worklog', requestId, () => performBulk(body, session, perf));
    perf.report?.(98, 'Đang cập nhật dữ liệu và hoàn tất');
    await invalidateWorklogCaches(session, result.value.date, (result.value.items || []).map(item => item.key));
    const performance = perf.snapshot({ replayed: result.replayed ? 1 : 0 });
    if (!res.headersSent) res.setHeader('Server-Timing', perf.serverTimingHeader({ replayed: result.replayed ? 1 : 0 }));
    return sendJson(res, 200, { ...result.value, performance, idempotencyStore: result.store, requestId: result.requestId || undefined, replayed: result.replayed || undefined });
  } catch (error) {
    if (error?.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { ok: false, error: 'Dữ liệu Bulk quá lớn.' });
    if (error?.message === 'INVALID_JSON') return sendJson(res, 400, { ok: false, error: 'Dữ liệu Bulk không hợp lệ.' });
    if (error?.code === 'IDEMPOTENCY_IN_PROGRESS') return sendJson(res, 409, { ok: false, error: error.message, code: error.code });
    if (error?.code === 'IDEMPOTENCY_STORE_UNAVAILABLE') return sendJson(res, 503, { ok: false, error: error.message, code: error.code });
    if (error instanceof JiraError) {
      if (error.status === 401 && !res.headersSent) res.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(res, error.status || 500, { ok: false, error: error.message, details: error.details || undefined });
    }
    return sendJson(res, 500, { ok: false, error: 'Bulk Logwork thất bại. Các worklog vừa tạo (nếu có) đã được rollback.' });
  }
};
