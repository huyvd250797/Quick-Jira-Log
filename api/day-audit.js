'use strict';

const { sendJson, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const { JiraError, getMyself } = require('../lib/jira');
const { displaySegments, availableSlots, hhmmToMinute } = require('../lib/scheduler');
const { WORK_WINDOWS } = require('../lib/config');
const { loadOccupiedRanges } = require('../lib/worklog-guard');

function minutesInsideWorkWindows(ranges) {
  let total = 0;
  for (const r of ranges || []) {
    for (const w of WORK_WINDOWS) {
      const ws = hhmmToMinute(w.start);
      const we = hhmmToMinute(w.end);
      const start = Math.max(r.start, ws);
      const end = Math.min(r.end, we);
      if (end > start) total += end - start;
    }
  }
  return total;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const session = getSession(req);
  if (!session) return sendJson(res, 401, { ok: false, error: 'Vui lòng đăng nhập Jira.' });

  try {
    const url = new URL(req.url, 'http://localhost');
    const date = String(url.searchParams.get('date') || '').trim();
    const key = String(url.searchParams.get('key') || '').trim().toUpperCase();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return sendJson(res, 400, { ok: false, error: 'Ngày planner không hợp lệ.' });

    const me = await getMyself(session);
    const guard = await loadOccupiedRanges(date, key ? [key] : [], me, session);
    const occupiedRaw = guard.occupied.map(r => ({ ...r, minutes: r.end - r.start }));
    const freeRaw = availableSlots(guard.occupied).map(r => ({ ...r, minutes: r.end - r.start }));
    const occupiedMinutes = minutesInsideWorkWindows(guard.occupied);
    const freeMinutes = freeRaw.reduce((sum, r) => sum + r.minutes, 0);

    return sendJson(res, 200, {
      ok: true,
      date,
      checkedIssues: guard.issueKeys.length,
      checkedWorklogs: guard.checkedWorklogs,
      occupiedMinutes,
      freeMinutes,
      occupied: displaySegments(occupiedRaw),
      available: displaySegments(freeRaw),
      sources: guard.sources
    });
  } catch (error) {
    if (error instanceof JiraError) {
      if (error.status === 401) res.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(res, error.status || 500, { ok: false, error: error.message, details: error.details || undefined });
    }
    return sendJson(res, 500, { ok: false, error: 'Không kiểm tra được worklog trong ngày.' });
  }
};
