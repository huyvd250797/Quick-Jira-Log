'use strict';

const KEY = '__quickJiraLogRateLimitV090';

function bucketStore() {
  if (!globalThis[KEY]) globalThis[KEY] = new Map();
  return globalThis[KEY];
}

function clientIp(req) {
  const raw = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown');
  return raw.split(',')[0].trim().slice(0, 80);
}

function hit(req, scope, identity = '', { limit = 8, windowMs = 5 * 60 * 1000 } = {}) {
  const now = Date.now();
  const key = `${scope}:${clientIp(req)}:${String(identity || '').toLowerCase().slice(0, 120)}`;
  const store = bucketStore();
  const current = store.get(key);
  const entry = !current || now >= current.resetAt ? { count: 0, resetAt: now + windowMs } : current;
  entry.count += 1;
  store.set(key, entry);
  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
  };
}

function reset(req, scope, identity = '') {
  const key = `${scope}:${clientIp(req)}:${String(identity || '').toLowerCase().slice(0, 120)}`;
  bucketStore().delete(key);
}

module.exports = { hit, reset };
