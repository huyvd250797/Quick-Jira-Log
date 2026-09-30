'use strict';

const { sendJson, readJson, assertSameOrigin, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const { MAX_REGULAR_MINUTES, BULK_MAX_ITEMS } = require('../lib/config');
const { JiraError, getMyself } = require('../lib/jira');
const {
  parseTimeSpent,
  displaySegments,
  windowsLabel,
  minutesInsideWindows,
  workWindowsFor
} = require('../lib/scheduler');
const { loadOccupiedRangesStable } = require('../lib/worklog-guard');
const { planBulkItems } = require('../lib/bulk');

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function toBoolean(value) {
  return value === true || value === 1 || String(value || '').toLowerCase() === 'true';
}

function fmtMinutes(minutes) {
  const h = Math.floor(Number(minutes || 0) / 60);
  const m = Number(minutes || 0) % 60;
  return `${h ? `${h}h` : ''}${m ? `${m}m` : ''}` || '0m';
}

function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems) || !rawItems.length) throw new JiraError('Chưa có Sub-task để lập dự kiến.', 400);
  if (rawItems.length > BULK_MAX_ITEMS) throw new JiraError(`Mỗi lần tối đa ${BULK_MAX_ITEMS} Sub-task.`, 400);
  return rawItems.map((raw, index) => {
    const key = String(raw?.key || '').trim().toUpperCase();
    const timeSpent = String(raw?.timeSpent || '').trim();
    const overtime = toBoolean(raw?.overtime);
    if (!key || !timeSpent) throw new JiraError(`Dòng ${index + 1}: thiếu KEY hoặc TimeSpent.`, 400);
    let minutes;
    try { minutes = parseTimeSpent(timeSpent); }
    catch (error) {
      throw new JiraError(error.message === 'TIME_SPENT_TOO_LARGE'
        ? `Dòng ${index + 1}: TimeSpent quá lớn.`
        : `Dòng ${index + 1}: TimeSpent không hợp lệ. Ví dụ 30m, 1h, 1h30m.`, 400);
    }
    if (!overtime && minutes > MAX_REGULAR_MINUTES) {
      throw new JiraError(`Dòng ${index + 1}: worklog thường tối đa 8h.`, 400);
    }
    return { key, timeSpent, overtime, minutes, order: index };
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!assertSameOrigin(req)) return sendJson(res, 403, { ok: false, error: 'INVALID_ORIGIN' });
  const session = getSession(req);
  if (!session) return sendJson(res, 401, { ok: false, error: 'Vui lòng đăng nhập Jira.' });

  try {
    const body = await readJson(req);
    const date = String(body.date || '').trim();
    if (!validDate(date)) throw new JiraError('Ngày logwork không hợp lệ.', 400);
    const items = normalizeItems(body.items);
    const me = session.me || await getMyself(session);
    const targetKeys = items.map(item => item.key);
    const guard = await loadOccupiedRangesStable(date, targetKeys, me, session);

    const alreadyRegular = minutesInsideWindows(guard.occupied, workWindowsFor(date, false));
    const requestedRegular = items.filter(item => !item.overtime).reduce((sum, item) => sum + item.minutes, 0);
    if (alreadyRegular + requestedRegular > MAX_REGULAR_MINUTES) {
      throw new JiraError(`Ngày ${date} đã có ${fmtMinutes(alreadyRegular)} trong giờ thường. Phần dự kiến mới sẽ vượt 8h.`, 409);
    }

    let planned;
    try {
      planned = planBulkItems(items, guard.occupied, { date }).plans;
    } catch (error) {
      if (error?.message === 'NOT_ENOUGH_TIME') {
        const item = error.bulkItem || items[0];
        throw new JiraError(`Không đủ thời gian trống trong khung ${windowsLabel(date, item?.overtime === true)}.`, 409);
      }
      if (error?.message === 'SEGMENT_OVERLAP') throw new JiraError('Dự kiến bị trùng với worklog đã có.', 409);
      if (error?.message === 'SEGMENT_OUTSIDE_WORK_WINDOWS') throw new JiraError('Dự kiến nằm ngoài khung giờ cho phép.', 409);
      throw error;
    }

    return sendJson(res, 200, {
      ok: true,
      date,
      items: planned.map(item => ({
        key: item.key,
        overtime: item.overtime === true,
        minutes: item.minutes,
        workWindow: windowsLabel(date, item.overtime === true),
        segments: displaySegments(item.segments)
      }))
    });
  } catch (error) {
    if (error?.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { ok: false, error: 'Dữ liệu gửi lên quá lớn.' });
    if (error?.message === 'INVALID_JSON') return sendJson(res, 400, { ok: false, error: 'Dữ liệu gửi lên không hợp lệ.' });
    if (error instanceof JiraError) {
      if (error.status === 401) res.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(res, error.status || 500, { ok: false, error: error.message, details: error.details || undefined });
    }
    return sendJson(res, 500, { ok: false, error: 'Không lập được dự kiến giờ logwork.' });
  }
};
