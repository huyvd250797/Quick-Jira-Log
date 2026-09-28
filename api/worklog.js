'use strict';

const { sendJson, readJson, assertSameOrigin, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
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
  schedule,
  jiraStarted,
  displaySegments
} = require('../lib/scheduler');

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
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

    const issueKeys = await searchIssuesWorkedOnDate(date, session);
    const worklogLists = await Promise.all(issueKeys.map(async issueKey => {
      try { return await getIssueWorklogs(issueKey, session); }
      catch { return []; }
    }));
    const existing = normalizeExistingWorklogs(worklogLists.flat(), date, me);

    let segments;
    try { segments = schedule(minutes, existing); }
    catch (error) {
      if (error.message === 'NOT_ENOUGH_TIME') {
        const fmt = m => `${Math.floor(m / 60)}h${m % 60 ? `${m % 60}m` : ''}`;
        return sendJson(res, 409, {
          ok: false,
          error: `Không đủ thời gian trống trong 2 khung giờ làm việc. Còn ${fmt(error.availableMinutes)}, cần ${fmt(error.requiredMinutes)}.`
        });
      }
      throw error;
    }

    const created = [];
    try {
      for (const seg of segments) {
        const worklog = await createWorklog(key, {
          started: jiraStarted(date, seg.start),
          seconds: seg.minutes * 60,
          description
        }, session);
        created.push({ id: worklog?.id, segment: seg });
      }
    } catch (error) {
      // Best effort rollback để tránh log nửa chừng khi một đoạn phía sau lỗi.
      await Promise.allSettled(created.filter(x => x.id).map(x => deleteWorklog(key, x.id, session)));
      throw error;
    }

    return sendJson(res, 200, {
      ok: true,
      issue: { key, summary: issue?.fields?.summary || '' },
      project,
      date,
      totalMinutes: minutes,
      segments: displaySegments(segments)
    });
  } catch (error) {
    if (error instanceof JiraError) {
      if (error.status === 401) res.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(res, error.status || 500, { ok: false, error: error.message });
    }
    return sendJson(res, 500, { ok: false, error: 'Logwork thất bại. Vui lòng thử lại.' });
  }
};
