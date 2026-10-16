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
  parseJiraStartedAtWorkTimezone,
  workWindowsFor,
  isWeekendDate
} = require('../lib/scheduler');
const { loadOccupiedRanges } = require('../lib/worklog-guard');
const { invalidateWorklogCaches } = require('../lib/app-cache');
const { createPerf } = require('../lib/perf');
const { readLabel } = require('../lib/worklog-label');
const worklogpro = require('../lib/worklogpro');

function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')); }
function validTime(value) { return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(value || '')); }

module.exports = async function handler(req, res) {
  if (!['PATCH', 'DELETE'].includes(req.method)) return methodNotAllowed(res, ['PATCH', 'DELETE']);
  if (!assertSameOrigin(req)) return sendJson(res, 403, { ok: false, error: 'INVALID_ORIGIN' });
  const session = getSession(req);
  if (!session) return sendJson(res, 401, { ok: false, error: 'Vui lòng đăng nhập Jira.' });

  const perf = createPerf();
  try {
    const body = await perf.step('readRequest', () => readJson(req));
    const key = String(body.key || '').trim().toUpperCase();
    const worklogId = String(body.worklogId || '').trim();
    if (!/^[A-Z][A-Z0-9_]*-\d+$/.test(key) || !/^\d+$/.test(worklogId)) return sendJson(res, 400, { ok: false, error: 'KEY hoặc Worklog ID không hợp lệ.' });

    const me = session.me || await perf.step('myself', () => getMyself(session));
    const worklogs = await perf.step('worklogs', () => getIssueWorklogs(key, session));
    const current = worklogs.find(w => String(w?.id || '') === worklogId);
    if (!current) return sendJson(res, 404, { ok: false, error: 'Không tìm thấy worklog cần xử lý.' });
    if (!authorMatches(current, me)) return sendJson(res, 403, { ok: false, error: 'Bạn chỉ được sửa/xóa worklog của chính mình.' });

    if (req.method === 'DELETE') {
      const oldParsed = parseJiraStartedAtWorkTimezone(current?.started || '');
      const ok = await perf.step('deleteWorklog', () => deleteWorklog(key, worklogId, session));
      if (!ok) return sendJson(res, 502, { ok: false, error: 'Jira không xóa được worklog.' });
      if (oldParsed?.date) await invalidateWorklogCaches(session, oldParsed.date, [key]);
      const performance = perf.snapshot();
      res.setHeader('Server-Timing', perf.serverTimingHeader());
      return sendJson(res, 200, { ok: true, deleted: true, key, worklogId, performance });
    }

    const date = String(body.date || '').trim();
    const start = String(body.start || '').trim();
    const timeSpent = String(body.timeSpent || '').trim();
    const description = readLabel(String(body.description || '')).description.trim();
    if ((body.overtime !== undefined && typeof body.overtime !== 'boolean') ||
        (body.updateOvertime !== undefined && typeof body.updateOvertime !== 'boolean') ||
        (body.updateOvertime === true && typeof body.overtime !== 'boolean')) {
      return sendJson(res, 400, { ok: false, error: 'Trạng thái Overtime không hợp lệ.' });
    }
    if (!validDate(date) || !validTime(start) || !timeSpent || !description) {
      return sendJson(res, 400, { ok: false, error: 'Vui lòng nhập đúng Date, Start, TimeSpent và Description.' });
    }

    let minutes;
    try { minutes = parseTimeSpent(timeSpent); }
    catch { return sendJson(res, 400, { ok: false, error: 'TimeSpent không hợp lệ.' }); }

    const startMinute = hhmmToMinute(start);
    const segment = { start: startMinute, end: startMinute + minutes, minutes };
    const guard = await loadOccupiedRanges(date, [key], me, session, { excludeWorklogIds: [worklogId] });
    const allowedWindows = isWeekendDate(date)
      ? workWindowsFor(date, false)
      : [...workWindowsFor(date, false), ...workWindowsFor(date, true)];
    try { validateScheduledSegments([segment], guard.occupied, allowedWindows); }
    catch (error) {
      if (error.message === 'SEGMENT_OVERLAP') return sendJson(res, 409, { ok: false, error: 'Khoảng giờ sửa bị trùng với worklog khác trong ngày.' });
      if (error.message === 'SEGMENT_OUTSIDE_WORK_WINDOWS') return sendJson(res, 409, { ok: false, error: 'Worklog phải nằm trong 08:00–12:00, 13:30–17:30; ngày Thứ 2–Thứ 6 cho phép giờ ngoài giờ từ 17:30–23:59.' });
      throw error;
    }

    const oldParsed = parseJiraStartedAtWorkTimezone(current?.started || '');
    const started = jiraStarted(date, startMinute);
    let updated, overtime, overtimeVerified = false;
    const invalidate = () => Promise.all([
      oldParsed?.date ? invalidateWorklogCaches(session, oldParsed.date, [key]) : Promise.resolve(),
      date !== oldParsed?.date ? invalidateWorklogCaches(session, date, [key]) : Promise.resolve()
    ]);
    if (typeof body.overtime === 'boolean') {
      // Resolve the worklog BOOL field from WorklogPRO, not Jira /field or editmeta.
      const attribute = await perf.step('worklogproAttribute', () => worklogpro.getOvertimeAttribute(session));
      const native = await perf.step('worklogproRead', () => worklogpro.getWorklog(worklogId, session));
      if (current.author?.key && String(current.author.key) !== String(native.authorUserKey)) {
        throw new JiraError('Tác giả worklog trên Jira và WorklogPRO không khớp. Hãy tải lại lịch trước khi sửa.', 409);
      }
      const previousOvertime = worklogpro.overtimeOf(native, attribute);
      // No toggle intent: preserve the current Jira value even if the open calendar was stale.
      overtime = body.updateOvertime === false ? previousOvertime : body.overtime;
      try {
        await perf.step('worklogproUpdateAndVerify', () => worklogpro.updateNativeWorklog({
          worklogId, current: native, attribute, overtime, started, seconds: minutes * 60, description
        }, session));
      } finally {
        // Invalidate even after an interrupted response: the write may already be committed.
        await invalidate();
      }
      updated = { started };
      overtimeVerified = true;
    } else {
      // Legacy clients that do not send an OT field keep ordinary edits working.
      // Jira's standard worklog update preserves plugin attributes and never sets OT.
      updated = await perf.step('updateWorklog', () => updateWorklog(key, worklogId, {
        started, seconds: minutes * 60, description
      }, session));
    }

    const parsed = parseJiraStartedAtWorkTimezone(updated?.started || jiraStarted(date, startMinute));
    const newDate = parsed?.date || date;
    await Promise.all([
      oldParsed?.date ? invalidateWorklogCaches(session, oldParsed.date, [key]) : Promise.resolve(),
      newDate !== oldParsed?.date ? invalidateWorklogCaches(session, newDate, [key]) : Promise.resolve()
    ]);
    const performance = perf.snapshot();
    res.setHeader('Server-Timing', perf.serverTimingHeader());
    return sendJson(res, 200, {
      ok: true,
      key,
      worklogId,
      date: newDate,
      start,
      minutes,
      description,
      ...(overtimeVerified ? { overtime, overtimeKnown: true, overtimeVerified: true, overtimeSource: 'worklogpro' } : { overtimeKnown: false }),
      performance
    });
  } catch (error) {
    if (error instanceof JiraError) {
      if (error.status === 401) res.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(res, error.status || 500, { ok: false, error: error.message, code: error.code, details: error.details || undefined });
    }
    return sendJson(res, 500, { ok: false, error: 'Không xử lý được worklog.' });
  }
};
