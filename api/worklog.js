'use strict';

const { sendJson, readJson, assertSameOrigin, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const { JiraError, getMyself, getIssue, createWorklog, deleteWorklog, transitionIssueToDone } = require('../lib/jira');
const { parseTimeSpent, schedule, jiraStarted, displaySegments, validateScheduledSegments } = require('../lib/scheduler');
const { loadOccupiedRangesStable } = require('../lib/worklog-guard');
const { normalizeRequestId, runIdempotent } = require('../lib/idempotency');

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function fmtMinutes(minutes) {
  return `${Math.floor(minutes / 60)}h${minutes % 60 ? `${minutes % 60}m` : ''}`;
}

function planningError(error) {
  if (error.message === 'NOT_ENOUGH_TIME') {
    return new JiraError(`Không đủ thời gian trống trong 2 khung giờ làm việc. Còn ${fmtMinutes(error.availableMinutes)}, cần ${fmtMinutes(error.requiredMinutes)}.`, 409);
  }
  if (error.message === 'SEGMENT_OUTSIDE_WORK_WINDOWS') {
    return new JiraError('Hệ thống phát hiện giờ log nằm ngoài 08:00–12:00 hoặc 13:30–17:30 nên đã chặn thao tác.', 409);
  }
  if (error.message === 'SEGMENT_OVERLAP') {
    return new JiraError('Hệ thống phát hiện khoảng giờ bị trùng worklog hiện có nên đã chặn thao tác.', 409);
  }
  return error;
}

async function performWorklog(body, session) {
  const key = String(body.key || '').trim().toUpperCase();
  const project = String(body.project || '').trim().toUpperCase();
  const timeSpent = String(body.timeSpent || '').trim();
  const date = String(body.date || '').trim();
  const description = String(body.description || '').trim();

  if (!key || !project || !timeSpent || !date || !description) {
    throw new JiraError('Vui lòng nhập đủ KEY, PROJECT, TimeSpent, Date và Description.', 400);
  }
  if (!validDate(date)) throw new JiraError('Ngày không hợp lệ.', 400);
  if (!key.startsWith(`${project}-`)) throw new JiraError(`KEY ${key} không khớp PROJECT ${project}.`, 400);

  let minutes;
  try { minutes = parseTimeSpent(timeSpent); }
  catch (error) {
    throw new JiraError(error.message === 'TIME_SPENT_TOO_LARGE'
      ? 'TimeSpent tối đa 8h/ngày.'
      : 'TimeSpent không hợp lệ. Ví dụ: 30m, 1h, 1h30m, 2.5h.', 400);
  }

  const mePromise = session.me ? Promise.resolve(session.me) : getMyself(session);
  const issuePromise = getIssue(key, session);
  const [me, issue] = await Promise.all([mePromise, issuePromise]);

  const actualProject = String(issue?.fields?.project?.key || '').toUpperCase();
  if (actualProject !== project) {
    throw new JiraError(`Issue ${key} thuộc PROJECT ${actualProject || 'khác'}, không phải ${project}.`, 400);
  }

  // Production guard: quét worklog thật trong ngày, rồi mới tạo deterministic plan.
  const guard = await loadOccupiedRangesStable(date, [key], me, session);
  let plan;
  try {
    plan = schedule(minutes, guard.occupied);
    validateScheduledSegments(plan, guard.occupied);
  } catch (error) {
    throw planningError(error);
  }

  const created = [];
  try {
    for (const seg of plan) {
      const worklog = await createWorklog(key, {
        started: jiraStarted(date, seg.start),
        seconds: seg.minutes * 60,
        description
      }, session);
      created.push({ id: worklog?.id, segment: seg });
    }
  } catch (error) {
    await Promise.allSettled(created.filter(x => x.id).map(x => deleteWorklog(key, x.id, session)));
    throw error;
  }

  let transition = { ok: false, message: 'Chưa kiểm tra transition.' };
  try {
    transition = await transitionIssueToDone(key, session, issue);
  } catch (error) {
    if (error instanceof JiraError && error.status === 401) throw error;
    transition = { ok: false, message: error?.message || 'Worklog đã tạo nhưng chưa chuyển được sang Done.' };
  }

  return {
    ok: true,
    issue: { key, summary: issue?.fields?.summary || '', previousStatus: issue?.fields?.status?.name || '' },
    project,
    date,
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
    const body = await readJson(req);
    const requestId = normalizeRequestId(body.requestId || req.headers['x-request-id']);
    const result = await runIdempotent('worklog', requestId, () => performWorklog(body, session));
    return sendJson(res, 200, { ...result.value, requestId: result.requestId || undefined, replayed: result.replayed || undefined });
  } catch (error) {
    if (error?.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { ok: false, error: 'Dữ liệu gửi lên quá lớn.' });
    if (error?.message === 'INVALID_JSON') return sendJson(res, 400, { ok: false, error: 'Dữ liệu gửi lên không hợp lệ.' });
    if (error instanceof JiraError) {
      if (error.status === 401) res.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(res, error.status || 500, { ok: false, error: error.message, details: error.details || undefined });
    }
    return sendJson(res, 500, { ok: false, error: 'Logwork thất bại. Vui lòng thử lại.' });
  }
};
