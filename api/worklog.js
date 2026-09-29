'use strict';

const { sendJson, readJson, assertSameOrigin, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const { JiraError, getMyself, getIssue, createWorklog, deleteWorklog, transitionIssueToDone } = require('../lib/jira');
const { parseTimeSpent, schedule, jiraStarted, displaySegments, validateScheduledSegments } = require('../lib/scheduler');
const { loadOccupiedRangesStable } = require('../lib/worklog-guard');

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function fmtMinutes(minutes) {
  return `${Math.floor(minutes / 60)}h${minutes % 60 ? `${minutes % 60}m` : ''}`;
}

function planningResponse(res, error) {
  if (error.message === 'NOT_ENOUGH_TIME') {
    return sendJson(res, 409, {
      ok: false,
      error: `Không đủ thời gian trống trong 2 khung giờ làm việc. Còn ${fmtMinutes(error.availableMinutes)}, cần ${fmtMinutes(error.requiredMinutes)}.`
    });
  }
  if (error.message === 'SEGMENT_OUTSIDE_WORK_WINDOWS') {
    return sendJson(res, 409, { ok: false, error: 'Hệ thống phát hiện giờ log nằm ngoài 08:00–12:00 hoặc 13:30–17:30 nên đã chặn thao tác.' });
  }
  if (error.message === 'SEGMENT_OVERLAP') {
    return sendJson(res, 409, { ok: false, error: 'Hệ thống phát hiện khoảng giờ bị trùng worklog hiện có nên đã chặn thao tác.' });
  }
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!assertSameOrigin(req)) return sendJson(res, 403, { ok: false, error: 'INVALID_ORIGIN' });

  const session = getSession(req);
  if (!session) return sendJson(res, 401, { ok: false, error: 'Vui lòng đăng nhập Jira.' });

  try {
    const body = await readJson(req);
    const key = String(body.key || '').trim().toUpperCase();
    const project = String(body.project || '').trim().toUpperCase();
    const timeSpent = String(body.timeSpent || '').trim();
    const date = String(body.date || '').trim();
    const description = String(body.description || '').trim();

    if (!key || !project || !timeSpent || !date || !description) {
      return sendJson(res, 400, { ok: false, error: 'Vui lòng nhập đủ KEY, PROJECT, TimeSpent, Date và Description.' });
    }
    if (!validDate(date)) return sendJson(res, 400, { ok: false, error: 'Ngày không hợp lệ.' });
    if (!key.startsWith(`${project}-`)) {
      return sendJson(res, 400, { ok: false, error: `KEY ${key} không khớp PROJECT ${project}.` });
    }

    let minutes;
    try { minutes = parseTimeSpent(timeSpent); }
    catch (e) {
      const msg = e.message === 'TIME_SPENT_TOO_LARGE'
        ? 'TimeSpent tối đa 8h/ngày.'
        : 'TimeSpent không hợp lệ. Ví dụ: 30m, 1h, 1h30m, 2.5h.';
      return sendJson(res, 400, { ok: false, error: msg });
    }

    // V0.8.0: reuse encrypted identity from the app session to remove one Jira round-trip.
    const mePromise = session.me ? Promise.resolve(session.me) : getMyself(session);
    const issuePromise = getIssue(key, session);
    const [me, issue] = await Promise.all([mePromise, issuePromise]);

    const actualProject = String(issue?.fields?.project?.key || '').toUpperCase();
    if (actualProject !== project) {
      return sendJson(res, 400, { ok: false, error: `Issue ${key} thuộc PROJECT ${actualProject || 'khác'}, không phải ${project}.` });
    }

    // Guard V0.8: two fast exhaustive scans, then commit the full deterministic plan.
    // This keeps the anti-overlap rules but removes the expensive full-day scan before every segment.
    const guard = await loadOccupiedRangesStable(date, [key], me, session);
    let plan;
    try {
      plan = schedule(minutes, guard.occupied);
      validateScheduledSegments(plan, guard.occupied);
    } catch (error) {
      const response = planningResponse(res, error);
      if (response) return response;
      throw error;
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

    // Worklog is authoritative. Status transition is best-effort and must never delete a successful worklog.
    let transition = { ok: false, message: 'Chưa kiểm tra transition.' };
    try {
      transition = await transitionIssueToDone(key, session, issue);
    } catch (error) {
      if (error instanceof JiraError && error.status === 401) throw error;
      transition = { ok: false, message: error?.message || 'Worklog đã tạo nhưng chưa chuyển được sang Done.' };
    }

    return sendJson(res, 200, {
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
    });
  } catch (error) {
    if (error instanceof JiraError) {
      if (error.status === 401) res.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(res, error.status || 500, { ok: false, error: error.message, details: error.details || undefined });
    }
    return sendJson(res, 500, { ok: false, error: 'Logwork thất bại. Vui lòng thử lại.' });
  }
};
