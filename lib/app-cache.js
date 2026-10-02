'use strict';

const { stableHash } = require('./redis-store');
const { cacheGet, cacheSet, cacheDelete } = require('./runtime-cache');

function sessionUserKey(session) {
  const raw = session?.me?.accountId || session?.me?.key || session?.me?.name || session?.username || 'anonymous';
  return stableHash(raw);
}

function dayAuditKey(session, date, key = '') {
  return `day-audit:${sessionUserKey(session)}:${date}:${String(key || '*').toUpperCase()}`;
}

function historyKey(session, date, key = '') {
  return `history:${sessionUserKey(session)}:${date}:${String(key || '*').toUpperCase()}`;
}

async function invalidateWorklogCaches(session, date, keys = []) {
  if (!session || !date) return;
  const normalized = [...new Set((keys || []).map(k => String(k || '').trim().toUpperCase()).filter(Boolean))];
  const targets = [dayAuditKey(session, date), historyKey(session, date)];
  for (const key of normalized) {
    targets.push(dayAuditKey(session, date, key), historyKey(session, date, key));
  }
  await Promise.all(targets.map(cacheDelete));
}

module.exports = {
  sessionUserKey,
  dayAuditKey,
  historyKey,
  cacheGet,
  cacheSet,
  invalidateWorklogCaches
};
