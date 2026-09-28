'use strict';

const { sendJson, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const { JiraError, getMyself } = require('../lib/jira');
const { displaySegments } = require('../lib/scheduler');
const { loadOccupiedRanges } = require('../lib/worklog-guard');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const session = getSession(req);
  if (!session) return sendJson(res, 401, { ok: false, error: 'Vui lòng đăng nhập Jira.' });

  try {
    const url = new URL(req.url, 'http://localhost');
    const date = String(url.searchParams.get('date') || '').trim();
    const key = String(url.searchParams.get('key') || '').trim().toUpperCase();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return sendJson(res, 400, { ok: false, error: 'Ngày audit không hợp lệ.' });
    const me = await getMyself(session);
    const guard = await loadOccupiedRanges(date, key ? [key] : [], me, session);
    const occupied = guard.occupied.map(r => ({ ...r, minutes: r.end - r.start }));
    return sendJson(res, 200, {
      ok: true,
      date,
      checkedIssues: guard.issueKeys.length,
      checkedWorklogs: guard.checkedWorklogs,
      occupied: displaySegments(occupied)
    });
  } catch (error) {
    if (error instanceof JiraError) {
      if (error.status === 401) res.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(res, error.status || 500, { ok: false, error: error.message, details: error.details || undefined });
    }
    return sendJson(res, 500, { ok: false, error: 'Không kiểm tra được worklog trong ngày.' });
  }
};
