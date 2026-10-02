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
const { mapWithConcurrency } = require('../lib/async');
const { historyKey, cacheGet, cacheSet } = require('../lib/app-cache');
const { createPerf } = require('../lib/perf');

const HISTORY_CACHE_MS = 15 * 1000;

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
  const force = String(req.query?.force || '') === '1';
  if (!validDate(date)) return sendJson(res, 400, { ok: false, error: 'Ngày lịch sử không hợp lệ.' });

  const perf = createPerf();
  try {
    const cacheKey = historyKey(session, date, requestedKey);
    if (!force) {
      const cached = await perf.step('cacheRead', () => cacheGet(cacheKey));
      if (cached.hit) {
        const performance = perf.snapshot({ cacheHit: 1 });
        res.setHeader('Server-Timing', perf.serverTimingHeader({ cacheHit: 1 }));
        return sendJson(res, 200, { ...cached.value, cache: { hit: true, source: cached.source }, performance });
      }
    }

    const me = session.me || await perf.step('myself', () => getMyself(session));
    const keySet = new Set();
    let source = 'direct-key';
    const sourceDetails = {};

    if (requestedKey) {
      keySet.add(requestedKey);
    } else {
      const recentDate = dayDistance(date, vietnamToday()) <= 1;
      const [authorDay, recentWorked] = await perf.step('discoverIssues', () => Promise.all([
        safeKeys(() => searchIssuesWorkedOnDate(date, session)),
        recentDate ? safeKeys(() => searchRecentlyWorkedIssues(session)) : Promise.resolve({ ok: true, keys: [], skipped: true })
      ]));

      for (const key of authorDay.keys || []) keySet.add(key);
      for (const key of recentWorked.keys || []) keySet.add(key);
      source = authorDay.ok ? 'author-day' : 'fallback-worklog-date';
      sourceDetails.authorDay = { ok: authorDay.ok, issues: authorDay.keys.length, error: authorDay.error || null };
      sourceDetails.recentWorked = { ok: recentWorked.ok, issues: recentWorked.keys.length, skipped: Boolean(recentWorked.skipped), error: recentWorked.error || null };

      if (!authorDay.ok) {
        const anyDay = await perf.step('fallbackIssueScan', () => safeKeys(() => searchIssuesWithWorklogDate(date, session)));
        for (const key of anyDay.keys || []) keySet.add(key);
        sourceDetails.anyDay = { ok: anyDay.ok, issues: anyDay.keys.length, error: anyDay.error || null };
      } else {
        sourceDetails.anyDay = { ok: false, issues: 0, skipped: true };
      }
    }

    const keys = [...keySet].slice(0, 500);
    if (!keys.length) {
      const payload = { ok: true, date, items: [], skipped: [], issueCount: 0, source, sourceDetails };
      await cacheSet(cacheKey, payload, HISTORY_CACHE_MS);
      const performance = perf.snapshot({ cacheHit: 0 });
      res.setHeader('Server-Timing', perf.serverTimingHeader({ cacheHit: 0 }));
      return sendJson(res, 200, { ...payload, cache: { hit: false }, performance });
    }

    const metadataPromise = perf.step('metadataBatch', () => getIssuesByKeys(keys, session))
      .then(issues => ({ ok: true, issues }))
      .catch(error => {
        if (error?.status === 401) throw error;
        return { ok: false, issues: [], error: error?.message || String(error) };
      });

    const skipped = [];
    const worklogResults = await perf.step('worklogs', () => mapWithConcurrency(keys, 12, async key => {
      try {
        return { key, worklogs: await getIssueWorklogs(key, session) };
      } catch (error) {
        if (error?.status === 401) throw error;
        skipped.push({ key, status: error?.status || 0 });
        return { key, worklogs: [] };
      }
    }));

    const metadata = await metadataPromise;
    if (!metadata.ok) sourceDetails.metadataError = metadata.error;
    const issueMap = new Map((metadata.issues || []).map(issue => [String(issue?.key || '').toUpperCase(), issue]));
    const items = [];

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
    const payload = { ok: true, date, items, skipped, issueCount: keys.length, source, sourceDetails };
    await perf.step('cacheWrite', () => cacheSet(cacheKey, payload, HISTORY_CACHE_MS));
    const performance = perf.snapshot({ cacheHit: 0 });
    res.setHeader('Server-Timing', perf.serverTimingHeader({ cacheHit: 0 }));
    return sendJson(res, 200, { ...payload, cache: { hit: false }, performance });
  } catch (error) {
    if (error instanceof JiraError) {
      if (error.status === 401) res.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(res, error.status || 500, { ok: false, error: error.message, details: error.details || undefined });
    }
    return sendJson(res, 500, { ok: false, error: 'Không tải được lịch sử worklog.' });
  }
};
