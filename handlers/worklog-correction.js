'use strict';

const { sendJson, readJson, assertSameOrigin, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const { JiraError, getMyself, getIssueWorklogs, getWorklog, updateWorklog, deleteWorklog } = require('../lib/jira');
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
const { readLabel, textOf } = require('../lib/worklog-label');
const worklogpro = require('../lib/worklogpro');

const { validDate } = require('../lib/ui-tools');
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

    const moveOnly = body.moveOnly === true;
    const calendarEdit = body.calendarEdit === true;
    if ((body.calendarEdit !== undefined && typeof body.calendarEdit !== 'boolean') || (calendarEdit && moveOnly) ||
        (calendarEdit && (!Number.isSafeInteger(body.targetSeconds) || body.targetSeconds <= 0 || body.targetSeconds > 57600))) {
      return sendJson(res, 400, { ok: false, error: 'Thời lượng chỉnh trên lịch không hợp lệ.' });
    }
    const preserveFields = moveOnly || calendarEdit;
    if (body.moveOnly !== undefined && typeof body.moveOnly !== 'boolean') return sendJson(res, 400, { ok: false, error: 'Thao tác di chuyển không hợp lệ.' });
    if (preserveFields && (!Number.isFinite(Date.parse(body.expectedStarted)) || !Number.isSafeInteger(body.expectedSeconds) || body.expectedSeconds <= 0)) {
      return sendJson(res, 400, { ok: false, error: 'Thiếu thông tin worklog gốc. Hãy tải lại lịch.' });
    }
    if (preserveFields && (Date.parse(body.expectedStarted) !== Date.parse(current.started) || body.expectedSeconds !== Number(current.timeSpentSeconds))) {
      return sendJson(res, 409, { ok: false, error: 'Worklog đã thay đổi trên Jira. Hãy tải lại lịch trước khi kéo thả.', code: 'WORKLOG_STALE' });
    }
    const date = String(body.date || '').trim();
    const start = String(body.start || '').trim();
    const timeSpent = String(body.timeSpent || '').trim();
    const description = preserveFields ? textOf(current.comment) : readLabel(String(body.description || '')).description.trim();
    if ((body.overtime !== undefined && typeof body.overtime !== 'boolean') ||
        (body.updateOvertime !== undefined && typeof body.updateOvertime !== 'boolean') ||
        (body.updateOvertime === true && typeof body.overtime !== 'boolean')) {
      return sendJson(res, 400, { ok: false, error: 'Trạng thái Overtime không hợp lệ.' });
    }
    if (!validDate(date) || !validTime(start) || (!preserveFields && (!timeSpent || !description))) {
      return sendJson(res, 400, { ok: false, error: 'Vui lòng nhập đúng Date, Start, TimeSpent và Description.' });
    }

    let minutes;
    try { minutes = calendarEdit ? body.targetSeconds / 60 : moveOnly ? Number(current.timeSpentSeconds) / 60 : parseTimeSpent(timeSpent); }
    catch { return sendJson(res, 400, { ok: false, error: 'TimeSpent không hợp lệ.' }); }

    const seconds = calendarEdit ? body.targetSeconds : moveOnly ? Number(current.timeSpentSeconds) : minutes * 60;
    const startMinute = hhmmToMinute(start);
    const segment = { start: startMinute, end: startMinute + minutes, minutes };
    const oldParsed = parseJiraStartedAtWorkTimezone(current?.started || '');
    if (calendarEdit && oldParsed?.date === date && oldParsed?.minute === startMinute && Date.parse(current.started) % 60000 !== 0) {
      return sendJson(res, 409, { ok: false, code: 'WORKLOG_START_PRECISION', error: 'Giờ bắt đầu có giây lẻ. Mở chi tiết worklog để chỉnh thời lượng chính xác.' });
    }
    const scheduleChanged = oldParsed?.date !== date || oldParsed?.minute !== startMinute || Number(current.timeSpentSeconds) !== seconds;
    if (scheduleChanged) {
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
    }
    const started = scheduleChanged ? jiraStarted(date, startMinute) : current.started;
    let updated, overtime, overtimeVerified = false, editProvider = 'jira';
    const invalidate = () => Promise.all([
      oldParsed?.date ? invalidateWorklogCaches(session, oldParsed.date, [key]) : Promise.resolve(),
      date !== oldParsed?.date ? invalidateWorklogCaches(session, date, [key]) : Promise.resolve()
    ]);
    const overtimeChangeRequested = !preserveFields && typeof body.overtime === 'boolean' && body.updateOvertime !== false;
    if (overtimeChangeRequested) {
      // Resolve the worklog BOOL field from WorklogPRO, not Jira /field or editmeta.
      const attribute = await perf.step('worklogproAttribute', () => worklogpro.getOvertimeAttribute(session));
      const native = await perf.step('worklogproRead', () => worklogpro.getWorklog(worklogId, session));
      if (current.author?.key && String(current.author.key) !== String(native.authorUserKey)) {
        throw new JiraError('Tác giả worklog trên Jira và WorklogPRO không khớp. Hãy tải lại lịch trước khi sửa.', 409);
      }
      overtime = body.overtime;
      try {
        await perf.step('worklogproUpdateAndVerify', () => worklogpro.updateNativeWorklog({
          key, worklogId, current: native, attribute, overtime, started, seconds: seconds, description
        }, session));
      } finally {
        // Invalidate even after an interrupted response: the write may already be committed.
        await invalidate();
      }
      updated = { started };
      overtimeVerified = true;
      editProvider = 'worklogpro-form';
    } else {
      // Ordinary changes are independent of WorklogPRO availability and preserve native OT.
      let written = false;
      try {
        try {
          await perf.step('updateWorklog', () => updateWorklog(key, worklogId, {
            started, seconds: seconds, description
          }, session));
        } catch (error) {
          // Retry through another provider only after a definite rejection, never a timeout.
          if (error.status !== 403) throw error;
          const attribute = await worklogpro.getOvertimeAttribute(session);
          const native = await worklogpro.getWorklog(worklogId, session);
          if (current.author?.key && String(current.author.key) !== String(native.authorUserKey)) throw new JiraError('Tác giả worklog không khớp.', 409);
          overtime = worklogpro.overtimeOf(native, attribute);
          await worklogpro.updateNativeWorklog({ key, worklogId, current: native, attribute, overtime, started, seconds: seconds, description }, session);
          overtimeVerified = true;
          editProvider = 'worklogpro-form';
        }
        written = true;
        updated = await perf.step('verifyWorklog', () => getWorklog(key, worklogId, session));
        if (String(updated?.id) !== worklogId || Date.parse(updated.started) !== Date.parse(started) ||
            Number(updated.timeSpentSeconds) !== seconds || (preserveFields ? textOf(updated.comment) : readLabel(updated.comment).description) !== description || !authorMatches(updated, me)) {
          throw new JiraError('Dữ liệu đọc lại từ Jira chưa khớp yêu cầu.', 502, { provider: 'jira', stage: 'verifyWorklog' }, 'JIRA_WORKLOG_VERIFY_FAILED');
        }
      } catch (error) {
        if (written || [500, 502, 503, 504].includes(error.status)) {
          throw new JiraError('Chưa xác nhận được kết quả sửa worklog trên Jira. Hãy tải lại lịch/Jira để kiểm tra trước khi lưu lại.', error.status || 502,
            { ...(error.details && typeof error.details === 'object' ? error.details : {}), provider: 'jira', resultUnknown: true }, 'JIRA_WORKLOG_RESULT_UNKNOWN');
        }
        throw error;
      } finally { await invalidate(); }
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
      worklogVerified: true,
      ...(preserveFields ? { moved: true, timeSpentSeconds: seconds, ...(calendarEdit ? { resized: true } : {}) } : {}),
      editProvider,
      overtimeChangeRequested,
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
