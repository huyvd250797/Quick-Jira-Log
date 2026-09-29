'use strict';

const { sendJson, readJson, assertSameOrigin, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const { JiraError, getMyself, getIssueWorklogs, updateWorklog, deleteWorklog } = require('../lib/jira');
const {
  parseTimeSpent,
  jiraStarted,
  hhmmToMinute,
  validateScheduledSegments,
  authorMatches,
  parseJiraStartedAtWorkTimezone
} = require('../lib/scheduler');
const { loadOccupiedRanges } = require('../lib/worklog-guard');

function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')); }
function validTime(value) { return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(value || '')); }

module.exports = async function handler(req, res) {
  if (!['PATCH', 'DELETE'].includes(req.method)) return methodNotAllowed(res, ['PATCH', 'DELETE']);
  if (!assertSameOrigin(req)) return sendJson(res, 403, { ok: false, error: 'INVALID_ORIGIN' });
  const session = getSession(req);
  if (!session) return sendJson(res, 401, { ok: false, error: 'Vui lòng đăng nhập Jira.' });

  try {
    const body = await readJson(req);
    const key = String(body.key || '').trim().toUpperCase();
    const worklogId = String(body.worklogId || '').trim();
    if (!key || !worklogId) return sendJson(res, 400, { ok: false, error: 'Thiếu KEY hoặc Worklog ID.' });

    const me = session.me || await getMyself(session);
    const worklogs = await getIssueWorklogs(key, session);
    const current = worklogs.find(w => String(w?.id || '') === worklogId);
    if (!current) return sendJson(res, 404, { ok: false, error: 'Không tìm thấy worklog cần xử lý.' });
    if (!authorMatches(current, me)) return sendJson(res, 403, { ok: false, error: 'Bạn chỉ được sửa/xóa worklog của chính mình.' });

    if (req.method === 'DELETE') {
      const ok = await deleteWorklog(key, worklogId, session);
      if (!ok) return sendJson(res, 502, { ok: false, error: 'Jira không xóa được worklog.' });
      return sendJson(res, 200, { ok: true, deleted: true, key, worklogId });
    }

    const date = String(body.date || '').trim();
    const start = String(body.start || '').trim();
    const timeSpent = String(body.timeSpent || '').trim();
    const description = String(body.description || '').trim();
    if (!validDate(date) || !validTime(start) || !timeSpent || !description) {
      return sendJson(res, 400, { ok: false, error: 'Vui lòng nhập đúng Date, Start, TimeSpent và Description.' });
    }

    let minutes;
    try { minutes = parseTimeSpent(timeSpent); }
    catch { return sendJson(res, 400, { ok: false, error: 'TimeSpent không hợp lệ.' }); }

    const startMinute = hhmmToMinute(start);
    const segment = { start: startMinute, end: startMinute + minutes, minutes };
    const guard = await loadOccupiedRanges(date, [key], me, session, { excludeWorklogIds: [worklogId] });
    try { validateScheduledSegments([segment], guard.occupied); }
    catch (error) {
      if (error.message === 'SEGMENT_OVERLAP') return sendJson(res, 409, { ok: false, error: 'Khoảng giờ sửa bị trùng với worklog khác trong ngày.' });
      if (error.message === 'SEGMENT_OUTSIDE_WORK_WINDOWS') return sendJson(res, 409, { ok: false, error: 'Worklog phải nằm trong 08:00–12:00 hoặc 13:30–17:30.' });
      throw error;
    }

    const updated = await updateWorklog(key, worklogId, {
      started: jiraStarted(date, startMinute),
      seconds: minutes * 60,
      description
    }, session);

    const parsed = parseJiraStartedAtWorkTimezone(updated?.started || jiraStarted(date, startMinute));
    return sendJson(res, 200, {
      ok: true,
      key,
      worklogId,
      date: parsed?.date || date,
      start,
      minutes,
      description
    });
  } catch (error) {
    if (error instanceof JiraError) {
      if (error.status === 401) res.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(res, error.status || 500, { ok: false, error: error.message, details: error.details || undefined });
    }
    return sendJson(res, 500, { ok: false, error: 'Không xử lý được worklog.' });
  }
};
