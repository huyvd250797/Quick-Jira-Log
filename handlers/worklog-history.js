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
const { validDate } = require('../lib/ui-tools');
const { readLabel } = require('../lib/worklog-label');
const { enrichHistory } = require('../lib/worklogpro');


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
    const keys = await fn();
    return { ok: true, keys, truncated: !!keys.truncated, error: '' };
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
  const endDate = String(req.query?.endDate || date).trim();
  const isRange = endDate !== date;
  const summaryScope = req.query?.scope === 'summary';
  const requestedKey = String(req.query?.key || '').trim().toUpperCase();
  const force = String(req.query?.force || '') === '1';
  if (!validDate(date) || !validDate(endDate) || endDate < date || dayDistance(date, endDate) > 30) {
    return sendJson(res, 400, { ok: false, error: 'Khoảng ngày lịch sử không hợp lệ (tối đa 31 ngày).' });
  }
  if (requestedKey && !/^[A-Z][A-Z0-9_]*-\d+$/.test(requestedKey)) {
    return sendJson(res, 400, { ok: false, error: 'KEY Jira không hợp lệ.' });
  }

  const perf = createPerf();
  try {
    const cacheKey = historyKey(session, date, requestedKey);
    if (!force && !isRange && !summaryScope) {
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
      const today = vietnamToday();
      const recentDate = dayDistance(date, today) <= 1 || dayDistance(endDate, today) <= 1 || (date <= today && endDate >= today);
      const [authorDay, recentWorked] = await perf.step('discoverIssues', () => Promise.all([
        safeKeys(() => searchIssuesWorkedOnDate(date, session, endDate)),
        recentDate ? safeKeys(() => searchRecentlyWorkedIssues(session)) : Promise.resolve({ ok: true, keys: [], skipped: true })
      ]));

      for (const key of authorDay.keys || []) keySet.add(key);
      for (const key of recentWorked.keys || []) keySet.add(key);
      sourceDetails.discoveryTruncated = !!(authorDay.truncated || recentWorked.truncated);
      source = authorDay.ok ? 'author-day' : 'fallback-worklog-date';
      sourceDetails.authorDay = { ok: authorDay.ok, issues: authorDay.keys.length, error: authorDay.error || null };
      sourceDetails.recentWorked = { ok: recentWorked.ok, issues: recentWorked.keys.length, skipped: Boolean(recentWorked.skipped), error: recentWorked.error || null };

      if (!authorDay.ok) {
        const anyDay = await perf.step('fallbackIssueScan', () => safeKeys(() => searchIssuesWithWorklogDate(date, session, endDate)));
        sourceDetails.discoveryTruncated ||= !!anyDay.truncated;
        for (const key of anyDay.keys || []) keySet.add(key);
        sourceDetails.anyDay = { ok: anyDay.ok, issues: anyDay.keys.length, error: anyDay.error || null };
      } else {
        sourceDetails.anyDay = { ok: false, issues: 0, skipped: true };
      }
    }

    if (!requestedKey && sourceDetails.authorDay?.ok === false && sourceDetails.anyDay?.ok === false) {
      throw new JiraError('Không thể tìm worklog trên Jira. Vui lòng tải lại hoặc tìm bằng KEY.', 502);
    }
    const limit = summaryScope ? 2000 : 500;
    const truncated = keySet.size > limit || !!sourceDetails.discoveryTruncated;
    const keys = [...keySet].slice(0, limit);
    if (!keys.length) {
      const payload = { ok: true, date, endDate, items: [], skipped: [], truncated, issueCount: 0, source, sourceDetails };
      if (!isRange && !summaryScope) await cacheSet(cacheKey, payload, HISTORY_CACHE_MS);
      const performance = perf.snapshot({ cacheHit: 0 });
      res.setHeader('Server-Timing', perf.serverTimingHeader({ cacheHit: 0 }));
      return sendJson(res, 200, { ...payload, cache: { hit: false }, performance });
    }

    const metadataPromise = perf.step('metadataBatch', () => getIssuesByKeys(keys, session, { extraFields: ['issuetype'] }))
      .then(issues => ({ ok: true, issues }))
      .catch(error => {
        return { ok: false, issues: [], error: error?.message || String(error), fatal: error?.status === 401 ? error : null };
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
    if (metadata.fatal) throw metadata.fatal;
    if (!metadata.ok) sourceDetails.metadataError = metadata.error;
    const issueMap = new Map((metadata.issues || []).map(issue => [String(issue?.key || '').toUpperCase(), issue]));
    if (keys.some(key => !issueMap.has(key.toUpperCase()))) sourceDetails.metadataError ||= 'Một số task chưa có thông tin phân loại.';
    const items = [];
    const seen = new Set();

    for (const result of worklogResults) {
      const issue = issueMap.get(String(result.key).toUpperCase());
      for (const worklog of result.worklogs || []) {
        if (!authorMatches(worklog, me)) continue;
        const parsed = parseJiraStartedAtWorkTimezone(worklog.started);
        if (!parsed || parsed.date < date || parsed.date > endDate) continue;
        const identity = `${result.key}|${worklog.id}`;
        if (seen.has(identity)) continue;
        seen.add(identity);
        const seconds = Number(worklog.timeSpentSeconds || 0);
        if (!Number.isFinite(seconds) || seconds <= 0) continue;
        const minutes = Math.ceil(seconds / 60);
        const label = readLabel(worklog.comment);
        const endMinute = parsed.minute + minutes;
        items.push({
          id: String(worklog.id || ''),
          key: result.key,
          project: String(issue?.fields?.project?.key || result.key.split('-')[0] || ''),
          summary: String(issue?.fields?.summary || ''),
          status: String(issue?.fields?.status?.name || ''),
          issueType: String(issue?.fields?.issuetype?.name || ''),
          issueTypeId: String(issue?.fields?.issuetype?.id || ''),
          isSubtask: typeof issue?.fields?.issuetype?.subtask === 'boolean' ? issue.fields.issuetype.subtask : null,
          date: parsed.date,
          start: minuteToHHMM(parsed.minute),
          end: minuteToHHMM(endMinute),
          minutes,
          overtime: false,
          overtimeKnown: false,
          overtimeSource: '',
          legacyOvertime: label.overtime,
          timeSpentSeconds: Number(worklog.timeSpentSeconds || 0),
          description: label.description,
          started: String(worklog.started || '')
        });
      }
    }

    const nativeOvertime = await perf.step('worklogproOvertime', () => enrichHistory(items, session));
    if (nativeOvertime.unavailable) sourceDetails.overtimeUnavailable = nativeOvertime.unavailable;
    items.sort((a, b) => b.date.localeCompare(a.date) || b.start.localeCompare(a.start) || a.key.localeCompare(b.key));
    const payload = { ok: true, date, endDate, items, skipped, truncated, issueCount: keys.length, source, sourceDetails };
    // Range results are client-cached only: existing per-day invalidation remains authoritative.
    if (!isRange && !summaryScope) await perf.step('cacheWrite', () => cacheSet(cacheKey, payload, HISTORY_CACHE_MS));
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
