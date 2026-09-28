'use strict';

const { sendJson, readJson, assertSameOrigin, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const { BULK_MAX_ITEMS } = require('../lib/config');
const { JiraError, getMyself, getIssue, createWorklog, deleteWorklog } = require('../lib/jira');
const { parseTimeSpent, schedule, jiraStarted, displaySegments, validateScheduledSegments } = require('../lib/scheduler');
const { loadOccupiedRanges } = require('../lib/worklog-guard');
const { planBulkItems } = require('../lib/bulk');

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function fmtMinutes(minutes) {
  return `${Math.floor(minutes / 60)}h${minutes % 60 ? `${minutes % 60}m` : ''}`;
}

function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems) || !rawItems.length) throw new JiraError('Hãy chọn ít nhất một issue để Bulk Logwork.', 400);
  if (rawItems.length > BULK_MAX_ITEMS) throw new JiraError(`Mỗi lần Bulk Logwork tối đa ${BULK_MAX_ITEMS} issue.`, 400);

  const seen = new Set();
  return rawItems.map((raw, index) => {
    const key = String(raw?.key || '').trim().toUpperCase();
    const project = String(raw?.project || '').trim().toUpperCase();
    const timeSpent = String(raw?.timeSpent || '').trim();
    const description = String(raw?.description || '').trim();
    if (!key || !project || !timeSpent) throw new JiraError(`Dòng ${index + 1}: thiếu KEY, PROJECT hoặc TimeSpent.`, 400);
    if (!key.startsWith(`${project}-`)) throw new JiraError(`Dòng ${index + 1}: KEY ${key} không khớp PROJECT ${project}.`, 400);
    if (seen.has(key)) throw new JiraError(`KEY ${key} đang xuất hiện nhiều hơn một lần trong danh sách Bulk.`, 400);
    seen.add(key);

    let minutes;
    try { minutes = parseTimeSpent(timeSpent); }
    catch (error) {
      const message = error.message === 'TIME_SPENT_TOO_LARGE'
        ? `Dòng ${index + 1}: TimeSpent tối đa 8h/ngày.`
        : `Dòng ${index + 1}: TimeSpent không hợp lệ. Ví dụ 30m, 1h, 1h30m.`;
      throw new JiraError(message, 400);
    }
    return { key, project, timeSpent, description, minutes, order: index };
  });
}

function planningError(error, item) {
  if (error?.message === 'NOT_ENOUGH_TIME') {
    return new JiraError(`Không đủ thời gian trống để xếp ${item?.key || 'Bulk Logwork'}. Còn ${fmtMinutes(error.availableMinutes || 0)}, cần ${fmtMinutes(error.requiredMinutes || 0)}.`, 409);
  }
  if (error?.message === 'SEGMENT_OUTSIDE_WORK_WINDOWS') {
    return new JiraError('Hệ thống phát hiện giờ Bulk Logwork nằm ngoài 08:00–12:00 hoặc 13:30–17:30 nên đã chặn thao tác.', 409);
  }
  if (error?.message === 'SEGMENT_OVERLAP') {
    return new JiraError('Hệ thống phát hiện Bulk Logwork bị trùng giờ với worklog hiện có nên đã chặn thao tác.', 409);
  }
  return error;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!assertSameOrigin(req)) return sendJson(res, 403, { ok: false, error: 'INVALID_ORIGIN' });

  const session = getSession(req);
  if (!session) return sendJson(res, 401, { ok: false, error: 'Vui lòng đăng nhập Jira.' });

  try {
    const body = await readJson(req, 96 * 1024);
    const date = String(body.date || '').trim();
    if (!validDate(date)) return sendJson(res, 400, { ok: false, error: 'Ngày Bulk Logwork không hợp lệ.' });

    const items = normalizeItems(body.items);
    const me = await getMyself(session);
    const issueDetails = await Promise.all(items.map(item => getIssue(item.key, session)));

    const verified = items.map((item, index) => {
      const issue = issueDetails[index];
      const actualProject = String(issue?.fields?.project?.key || '').toUpperCase();
      if (actualProject !== item.project) {
        throw new JiraError(`Issue ${item.key} thuộc PROJECT ${actualProject || 'khác'}, không phải ${item.project}.`, 400);
      }
      const summary = String(issue?.fields?.summary || '');
      return { ...item, summary, description: item.description || summary };
    });

    if (verified.some(item => !item.description)) throw new JiraError('Có issue không có Description/Summary để logwork.', 400);

    const targetKeys = verified.map(item => item.key);
    const initialGuard = await loadOccupiedRanges(date, targetKeys, me, session);
    try { planBulkItems(verified, initialGuard.occupied); }
    catch (error) { throw planningError(error, error.bulkItem || verified[0]); }

    const created = [];
    const actualPlans = [];
    try {
      for (const item of verified) {
        let remaining = item.minutes;
        const itemSegments = [];

        while (remaining > 0) {
          // Guard lại Jira trước từng segment để né cả worklog vừa phát sinh từ bên ngoài.
          const liveGuard = await loadOccupiedRanges(date, targetKeys, me, session);
          let livePlan;
          try {
            livePlan = schedule(remaining, liveGuard.occupied);
            validateScheduledSegments(livePlan, liveGuard.occupied);
          } catch (error) {
            throw planningError(error, item);
          }

          const segment = livePlan[0];
          if (!segment) throw new JiraError(`Không tìm được khoảng giờ hợp lệ cho ${item.key}.`, 409);
          const worklog = await createWorklog(item.key, {
            started: jiraStarted(date, segment.start),
            seconds: segment.minutes * 60,
            description: item.description
          }, session);
          created.push({ key: item.key, id: worklog?.id, segment });
          itemSegments.push(segment);
          remaining -= segment.minutes;
        }

        actualPlans.push({ ...item, segments: itemSegments });
      }
    } catch (error) {
      await Promise.allSettled(created.filter(x => x.id).map(x => deleteWorklog(x.key, x.id, session)));
      throw error;
    }

    return sendJson(res, 200, {
      ok: true,
      date,
      totalMinutes: verified.reduce((sum, item) => sum + item.minutes, 0),
      audit: {
        checkedIssues: initialGuard.issueKeys.length,
        checkedWorklogs: initialGuard.checkedWorklogs,
        occupiedBefore: displaySegments(initialGuard.occupied.map(r => ({ ...r, minutes: r.end - r.start })))
      },
      items: actualPlans.map(item => ({
        key: item.key,
        project: item.project,
        summary: item.summary,
        description: item.description,
        minutes: item.minutes,
        segments: displaySegments(item.segments)
      }))
    });
  } catch (error) {
    if (error instanceof JiraError) {
      if (error.status === 401) res.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(res, error.status || 500, { ok: false, error: error.message, details: error.details || undefined });
    }
    return sendJson(res, 500, { ok: false, error: 'Bulk Logwork thất bại. Các worklog vừa tạo (nếu có) đã được rollback.' });
  }
};
