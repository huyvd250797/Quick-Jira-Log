'use strict';

const { sendJson, readJson, assertSameOrigin, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const { JiraError, getMyself, getIssue, createWorklog, deleteWorklog } = require('../lib/jira');
const { parseTimeSpent, schedule, jiraStarted, displaySegments, validateScheduledSegments } = require('../lib/scheduler');
const { loadOccupiedRanges, loadOccupiedRangesStable } = require('../lib/worklog-guard');

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

    const [me, issue] = await Promise.all([getMyself(session), getIssue(key, session)]);
    const actualProject = String(issue?.fields?.project?.key || '').toUpperCase();
    if (actualProject !== project) {
      return sendJson(res, 400, { ok: false, error: `Issue ${key} thuộc PROJECT ${actualProject || 'khác'}, không phải ${project}.` });
    }

    // Guard lần 1: phải nhìn thấy toàn bộ worklog hiện tại trước khi bắt đầu.
    const initialGuard = await loadOccupiedRangesStable(date, [key], me, session);
    try {
      const initialPlan = schedule(minutes, initialGuard.occupied);
      validateScheduledSegments(initialPlan, initialGuard.occupied);
    } catch (error) {
      const response = planningResponse(res, error);
      if (response) return response;
      throw error;
    }

    // Reliability guard: trước TỪNG segment đều đọc Jira lại và tính slot lại.
    // Nhờ vậy nếu 08:00–09:00 / 09:00–09:30 đã tồn tại hoặc vừa được tạo từ nơi khác,
    // segment mới sẽ tự né thay vì tiếp tục dùng kế hoạch cũ.
    let remaining = minutes;
    const created = [];
    const actualSegments = [];
    try {
      while (remaining > 0) {
        const liveGuard = await loadOccupiedRanges(date, [key], me, session);
        let livePlan;
        try {
          livePlan = schedule(remaining, liveGuard.occupied);
          validateScheduledSegments(livePlan, liveGuard.occupied);
        } catch (error) {
          const mapped = planningResponse(res, error);
          if (mapped) {
            // Response đã được gửi, rollback trước khi thoát bằng sentinel.
            const sent = new Error('RESPONSE_ALREADY_SENT');
            sent.responseAlreadySent = true;
            throw sent;
          }
          throw error;
        }

        const seg = livePlan[0];
        if (!seg) throw new JiraError('Không tìm được khoảng giờ hợp lệ để logwork.', 409);
        const worklog = await createWorklog(key, {
          started: jiraStarted(date, seg.start),
          seconds: seg.minutes * 60,
          description
        }, session);
        created.push({ id: worklog?.id, segment: seg });
        actualSegments.push(seg);
        remaining -= seg.minutes;
      }
    } catch (error) {
      await Promise.allSettled(created.filter(x => x.id).map(x => deleteWorklog(key, x.id, session)));
      if (error.responseAlreadySent) return;
      throw error;
    }

    return sendJson(res, 200, {
      ok: true,
      issue: { key, summary: issue?.fields?.summary || '' },
      project,
      date,
      totalMinutes: minutes,
      segments: displaySegments(actualSegments),
      audit: {
        checkedIssues: initialGuard.issueKeys.length,
        checkedWorklogs: initialGuard.checkedWorklogs,
        occupiedBefore: displaySegments(initialGuard.occupied.map(r => ({ ...r, minutes: r.end - r.start }))),
        sources: initialGuard.sources
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
