'use strict';

const { sendJson, readJson, assertSameOrigin, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const { BULK_MAX_ITEMS } = require('../lib/config');
const {
  JiraError,
  getMyself,
  getIssue,
  searchIssuesWorkedOnDate,
  getIssueWorklogs,
  createWorklog,
  deleteWorklog
} = require('../lib/jira');
const {
  parseTimeSpent,
  normalizeExistingWorklogs,
  jiraStarted,
  displaySegments,
  mergeRanges
} = require('../lib/scheduler');
const { planBulkItems } = require('../lib/bulk');

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function fmtMinutes(minutes) {
  return `${Math.floor(minutes / 60)}h${minutes % 60 ? `${minutes % 60}m` : ''}`;
}

async function loadOccupiedRanges(date, targetKeys, me, session) {
  const searchedKeys = await searchIssuesWorkedOnDate(date, session);
  const issueKeys = [...new Set([...(searchedKeys || []), ...(targetKeys || [])].filter(Boolean))];
  const worklogLists = await Promise.all(issueKeys.map(async issueKey => {
    try { return await getIssueWorklogs(issueKey, session); }
    catch (error) {
      throw new JiraError(`Không kiểm tra đầy đủ worklog của ${issueKey}; tạm dừng để tránh log trùng thời gian.`, error.status || 502);
    }
  }));
  return mergeRanges(normalizeExistingWorklogs(worklogLists.flat(), date, me));
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

    if (verified.some(item => !item.description)) {
      throw new JiraError('Có issue không có Description/Summary để logwork.', 400);
    }

    const targetKeys = verified.map(item => item.key);

    // Guard lần 1 để preview/kiểm tra khả năng xếp lịch.
    let occupied = await loadOccupiedRanges(date, targetKeys, me, session);
    try { planBulkItems(verified, occupied); }
    catch (error) {
      throw planningError(error, error.bulkItem || verified[0]);
    }

    // Khi tạo thật, đọc lại occupied trước TỪNG issue. Issue sau vì thế luôn thấy
    // worklog vừa tạo của issue trước, đồng thời cũng né các worklog mới xuất hiện từ bên ngoài.
    const created = [];
    const actualPlans = [];
    try {
      for (const item of verified) {
        const liveOccupied = await loadOccupiedRanges(date, targetKeys, me, session);
        let livePlan;
        try { livePlan = planBulkItems([item], liveOccupied).plans[0]; }
        catch (error) { throw planningError(error, error.bulkItem || item); }

        for (const segment of livePlan.segments) {
          const worklog = await createWorklog(item.key, {
            started: jiraStarted(date, segment.start),
            seconds: segment.minutes * 60,
            description: item.description
          }, session);
          created.push({ key: item.key, id: worklog?.id, segment });
        }
        actualPlans.push(livePlan);
      }
    } catch (error) {
      await Promise.allSettled(created.filter(x => x.id).map(x => deleteWorklog(x.key, x.id, session)));
      throw error;
    }

    return sendJson(res, 200, {
      ok: true,
      date,
      totalMinutes: verified.reduce((sum, item) => sum + item.minutes, 0),
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
