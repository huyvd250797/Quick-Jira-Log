'use strict';

const { sendJson, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const {
  JiraError,
  getMyself,
  getIssue,
  getIssueWorklogs,
  searchIssuesWorkedOnDate,
  searchIssuesWithWorklogDate
} = require('../lib/jira');
const { authorMatches, parseJiraStartedAtWorkTimezone, minuteToHHMM } = require('../lib/scheduler');

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function commentText(comment) {
  if (typeof comment === 'string') return comment;
  if (!comment || typeof comment !== 'object') return '';
  const out = [];
  const walk = node => {
    if (!node) return;
    if (typeof node === 'string') return out.push(node);
    if (Array.isArray(node)) return node.forEach(walk);
    if (typeof node.text === 'string') out.push(node.text);
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  walk(comment);
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const session = getSession(req);
  if (!session) return sendJson(res, 401, { ok: false, error: 'Vui lòng đăng nhập Jira.' });

  const date = String(req.query?.date || '').trim();
  const requestedKey = String(req.query?.key || '').trim().toUpperCase();
  if (!validDate(date)) return sendJson(res, 400, { ok: false, error: 'Ngày lịch sử không hợp lệ.' });

  try {
    const me = session.me || await getMyself(session);
    const keySet = new Set(requestedKey ? [requestedKey] : []);
    const sources = await Promise.allSettled([
      searchIssuesWorkedOnDate(date, session),
      searchIssuesWithWorklogDate(date, session)
    ]);
    for (const result of sources) {
      if (result.status === 'fulfilled') for (const key of result.value || []) keySet.add(key);
      else if (result.reason?.status === 401) throw result.reason;
    }

    const keys = [...keySet].slice(0, 500);
    const items = [];
    const skipped = [];
    const concurrency = 8;
    for (let i = 0; i < keys.length; i += concurrency) {
      const batch = keys.slice(i, i + concurrency);
      const results = await Promise.all(batch.map(async key => {
        try {
          const [issue, worklogs] = await Promise.all([getIssue(key, session), getIssueWorklogs(key, session)]);
          return { key, issue, worklogs };
        } catch (error) {
          if (error?.status === 401) throw error;
          skipped.push({ key, status: error?.status || 0 });
          return { key, issue: null, worklogs: [] };
        }
      }));

      for (const result of results) {
        for (const worklog of result.worklogs || []) {
          if (!authorMatches(worklog, me)) continue;
          const parsed = parseJiraStartedAtWorkTimezone(worklog.started);
          if (!parsed || parsed.date !== date) continue;
          const minutes = Math.max(1, Math.ceil(Number(worklog.timeSpentSeconds || 0) / 60));
          const endMinute = parsed.minute + minutes;
          items.push({
            id: String(worklog.id || ''),
            key: result.key,
            project: String(result.issue?.fields?.project?.key || result.key.split('-')[0] || ''),
            summary: String(result.issue?.fields?.summary || ''),
            status: String(result.issue?.fields?.status?.name || ''),
            date,
            start: minuteToHHMM(parsed.minute),
            end: minuteToHHMM(endMinute),
            minutes,
            timeSpentSeconds: Number(worklog.timeSpentSeconds || 0),
            description: commentText(worklog.comment),
            started: String(worklog.started || '')
          });
        }
      }
    }

    items.sort((a, b) => b.start.localeCompare(a.start) || a.key.localeCompare(b.key));
    return sendJson(res, 200, { ok: true, date, items, skipped, issueCount: keys.length });
  } catch (error) {
    if (error instanceof JiraError) {
      if (error.status === 401) res.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(res, error.status || 500, { ok: false, error: error.message, details: error.details || undefined });
    }
    return sendJson(res, 500, { ok: false, error: 'Không tải được lịch sử worklog.' });
  }
};
