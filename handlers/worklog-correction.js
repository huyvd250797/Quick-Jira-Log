'use strict';

const { sendJson, readJson, assertSameOrigin, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const { JiraError, getMyself, getIssueWorklogs, updateWorklog, deleteWorklog, prepareOvertimeUpdate, applyOvertimeUpdate, restoreOvertimeUpdate } = require('../lib/jira');
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
    if (!key || !worklogId) return sendJson(res, 400, { ok: false, error: 'Thiếu KEY hoặc Worklog ID.' });

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
    const description = String(body.description || '').trim();
    if ((body.overtime !== undefined && typeof body.overtime !== 'boolean') ||
        (body.updateOvertime !== undefined && typeof body.updateOvertime !== 'boolean') ||
        (body.updateOvertime === true && typeof body.overtime !== 'boolean')) {
      return sendJson(res, 400, { ok: false, error: 'Trạng thái Overtime không hợp lệ.' });
    }
    // Only an explicit switch change may edit the issue-level field. Merely opening
    // and saving a historical worklog must not clear/set Overtime on the issue.
    const updateOvertime = body.updateOvertime === true;
    const overtime = body.overtime === true;
    if (!validDate(date) || !validTime(start) || !timeSpent || !description) {
      return sendJson(res, 400, { ok: false, error: 'Vui lòng nhập đúng Date, Start, TimeSpent và Description.' });
    }

    let minutes;
    try { minutes = parseTimeSpent(timeSpent); }
    catch { return sendJson(res, 400, { ok: false, error: 'TimeSpent không hợp lệ.' }); }

    const startMinute = hhmmToMinute(start);
    const segment = { start: startMinute, end: startMinute + minutes, minutes };
    const guard = await loadOccupiedRanges(date, [key], me, session, { excludeWorklogIds: [worklogId] });
    const allowedWindows = updateOvertime ? workWindowsFor(date, overtime) : isWeekendDate(date)
      ? workWindowsFor(date, false)
      : [...workWindowsFor(date, false), ...workWindowsFor(date, true)];
    try { validateScheduledSegments([segment], guard.occupied, allowedWindows); }
    catch (error) {
      if (error.message === 'SEGMENT_OVERLAP') return sendJson(res, 409, { ok: false, error: 'Khoảng giờ sửa bị trùng với worklog khác trong ngày.' });
      if (error.message === 'SEGMENT_OUTSIDE_WORK_WINDOWS') return sendJson(res, 409, { ok: false, error: updateOvertime
        ? overtime ? 'Overtime ngày thường phải nằm trong 17:30–23:59; cuối tuần dùng 08:00–12:00, 13:30–17:30. Hãy chỉnh giờ bắt đầu phù hợp.' : 'Khi tắt Overtime, worklog phải nằm trong 08:00–12:00 hoặc 13:30–17:30. Hãy chỉnh giờ bắt đầu phù hợp.'
        : 'Worklog phải nằm trong 08:00–12:00, 13:30–17:30; ngày Thứ 2–Thứ 6 cho phép OT từ 17:30–23:59.' });
      throw error;
    }

    const oldParsed = parseJiraStartedAtWorkTimezone(current?.started || '');
    const overtimePrepared = updateOvertime ? await perf.step('otPreflight', () => prepareOvertimeUpdate(key, session, overtime)) : null;
    if (overtimePrepared && overtimePrepared.previousValue === undefined) {
      return sendJson(res, 409, { ok: false, error: 'Không đọc được trạng thái Overtime hiện tại trên Jira; chưa lưu thay đổi. Hãy tải lại rồi thử lại.' });
    }
    const updated = await perf.step('updateWorklog', () => updateWorklog(key, worklogId, {
      started: jiraStarted(date, startMinute),
      seconds: minutes * 60,
      description
    }, session));

    if (overtimePrepared) {
      try {
        await perf.step('applyOvertime', () => applyOvertimeUpdate(overtimePrepared, session));
      } catch (error) {
        // Jira has no transaction across these two endpoints. Restore the worklog
        // if its paired field update fails; ambiguous network/server errors also
        // require restoring the previous field value.
        const jobs = [updateWorklog(key, worklogId, {
          started: current.started,
          seconds: Number(current.timeSpentSeconds),
          description: current.comment ?? ''
        }, session)];
        if (!error.status || error.status >= 500) jobs.push(restoreOvertimeUpdate(overtimePrepared, session));
        const rollback = await Promise.allSettled(jobs);
        const rollbackOk = rollback.every(result => result.status === 'fulfilled' && result.value !== false);
        await Promise.all([invalidateWorklogCaches(session, date, [key]), oldParsed?.date ? invalidateWorklogCaches(session, oldParsed.date, [key]) : Promise.resolve()]);
        if (error.status === 401) res.setHeader('Set-Cookie', clearSessionCookie());
        return sendJson(res, error.status || 502, { ok: false, partial: !rollbackOk,
          error: rollbackOk ? `Không cập nhật được Overtime; đã hoàn tác worklog. ${error.message || ''}`
            : 'Không hoàn tác được đầy đủ. Worklog hoặc Overtime có thể đã thay đổi; tải lại lịch và kiểm tra Jira trước khi lưu tiếp.' });
      }
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
      overtimeUpdated: updateOvertime,
      performance
    });
  } catch (error) {
    if (error instanceof JiraError) {
      if (error.status === 401) res.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(res, error.status || 500, { ok: false, error: error.message, details: error.details || undefined });
    }
    return sendJson(res, 500, { ok: false, error: 'Không xử lý được worklog.' });
  }
};
