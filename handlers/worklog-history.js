'use strict';

const { sendJson, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const {
  JiraError,
  getMyself,
  getIssueWorklogs,
  getIssuesByKeys,
  searchIssuesWorkedOnDate,
  searchIssuesWithWorklogDate,
  searchRecentlyWorkedIssues
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

function vietnamToday() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function dayDistance(a, b) {
  const am = Date.parse(`${a}T00:00:00Z`);
  const bm = Date.parse(`${b}T00:00:00Z`);
  return Number.isFinite(am) && Number.isFinite(bm) ? Math.round(Math.abs(am - bm) / 86400000) : Infinity;
}

async function safeKeys(fn) {
  try {
    return { ok: true, keys: await fn(), error: '' };
  } catch (error) {
    if (error?.status === 401) throw error;
    return { ok: false, keys: [], error: error?.message || String(error) };
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const session = getSession(req);
  if (!session) return sendJson(res, 401, { ok: false, error: 'Vui lòng đăng nhập Jira.' });

  const date = String(req.query?.date || '').trim();
  const requestedKey = String(req.query?.key || '').trim().toUpperCase();
  if (!validDate(date)) return sendJson(res, 400, { ok: false, error: 'Ngày lịch sử không hợp lệ.' });

  const startedAt = Date.now();
  try {
    const me = session.me || await getMyself(session);
    const keySet = new Set();
    let source = 'direct-key';
    let sourceDetails = {};

    if (requestedKey) {
      keySet.add(requestedKey);
    } else {
      // Fast path: ưu tiên JQL có worklogAuthor=currentUser(). Không quét toàn bộ worklog
      // của mọi user nếu Jira đã hỗ trợ truy vấn theo author.
      const recentDate = dayDistance(date, vietnamToday()) <= 1;
      const [authorDay, recentWorked] = await Promise.all([
        safeKeys(() => searchIssuesWorkedOnDate(date, session)),
        recentDate ? safeKeys(() => searchRecentlyWorkedIssues(session)) : Promise.resolve({ ok: true, keys: [], skipped: true })
      ]);

      for (const key of authorDay.keys || []) keySet.add(key);
      for (const key of recentWorked.keys || []) keySet.add(key);
      source = authorDay.ok ? 'author-day' : 'fallback-worklog-date';
      sourceDetails.authorDay = { ok: authorDay.ok, issues: authorDay.keys.length, error: authorDay.error || null };
      sourceDetails.recentWorked = { ok: recentWorked.ok, issues: recentWorked.keys.length, skipped: Boolean(recentWorked.skipped), error: recentWorked.error || null };

      // Chỉ dùng scan worklogDate rộng khi truy vấn currentUser không khả dụng.
      if (!authorDay.ok) {
        const anyDay = await safeKeys(() => searchIssuesWithWorklogDate(date, session));
        for (const key of anyDay.keys || []) keySet.add(key);
        sourceDetails.anyDay = { ok: anyDay.ok, issues: anyDay.keys.length, error: anyDay.error || null };
      } else {
        sourceDetails.anyDay = { ok: false, issues: 0, skipped: true };
      }
    }

    const keys = [...keySet].slice(0, 500);
    if (!keys.length) {
      return sendJson(res, 200, {
        ok: true, date, items: [], skipped: [], issueCount: 0,
        source, sourceDetails, elapsedMs: Date.now() - startedAt
      });
    }

    // Batch metadata chạy song song với việc đọc worklog: giảm 1 round-trip nối tiếp.
    const metadataPromise = getIssuesByKeys(keys, session)
      .then(issues => ({ ok: true, issues }))
      .catch(error => {
        if (error?.status === 401) throw error;
        return { ok: false, issues: [], error: error?.message || String(error) };
      });

    const items = [];
    const skipped = [];
    const worklogResults = [];
    const concurrency = 12;
    for (let i = 0; i < keys.length; i += concurrency) {
      const batch = keys.slice(i, i + concurrency);
      const results = await Promise.all(batch.map(async key => {
        try {
          return { key, worklogs: await getIssueWorklogs(key, session) };
        } catch (error) {
          if (error?.status === 401) throw error;
          skipped.push({ key, status: error?.status || 0 });
          return { key, worklogs: [] };
        }
      }));
      worklogResults.push(...results);
    }

    const metadata = await metadataPromise;
    if (!metadata.ok) sourceDetails.metadataError = metadata.error;
    const issueMap = new Map((metadata.issues || []).map(issue => [String(issue?.key || '').toUpperCase(), issue]));

    for (const result of worklogResults) {
      const issue = issueMap.get(String(result.key).toUpperCase());
      for (const worklog of result.worklogs || []) {
          if (!authorMatches(worklog, me)) continue;
          const parsed = parseJiraStartedAtWorkTimezone(worklog.started);
          if (!parsed || parsed.date !== date) continue;
          const minutes = Math.max(1, Math.ceil(Number(worklog.timeSpentSeconds || 0) / 60));
          const endMinute = parsed.minute + minutes;
          items.push({
            id: String(worklog.id || ''),
            key: result.key,
            project: String(issue?.fields?.project?.key || result.key.split('-')[0] || ''),
            summary: String(issue?.fields?.summary || ''),
            status: String(issue?.fields?.status?.name || ''),
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

    items.sort((a, b) => b.start.localeCompare(a.start) || a.key.localeCompare(b.key));
    return sendJson(res, 200, {
      ok: true, date, items, skipped, issueCount: keys.length,
      source, sourceDetails, elapsedMs: Date.now() - startedAt
    });
  } catch (error) {
    if (error instanceof JiraError) {
      if (error.status === 401) res.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(res, error.status || 500, { ok: false, error: error.message, details: error.details || undefined });
    }
    return sendJson(res, 500, { ok: false, error: 'Không tải được lịch sử worklog.' });
  }
};
