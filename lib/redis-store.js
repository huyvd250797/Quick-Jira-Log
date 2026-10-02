'use strict';

const crypto = require('crypto');

function redisConfig() {
  const url = String(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
  const token = String(process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '');
  return url && token ? { url, token } : null;
}

function redisEnabled() {
  return Boolean(redisConfig());
}

function stableHash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 32);
}

async function redisCommand(args, timeoutMs = 1800) {
  const cfg = redisConfig();
  if (!cfg) return { enabled: false, result: null };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`REDIS_HTTP_${response.status}`);
    const data = await response.json();
    if (data?.error) throw new Error(String(data.error));
    return { enabled: true, result: data?.result ?? null };
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(key) {
  const out = await redisCommand(['GET', key]);
  if (!out.enabled || out.result == null) return { enabled: out.enabled, value: null };
  try { return { enabled: true, value: JSON.parse(String(out.result)) }; }
  catch { return { enabled: true, value: null }; }
}

async function setJson(key, value, ttlMs, { nx = false } = {}) {
  const args = ['SET', key, JSON.stringify(value), 'PX', String(Math.max(1000, Number(ttlMs) || 1000))];
  if (nx) args.push('NX');
  const out = await redisCommand(args);
  return { enabled: out.enabled, stored: out.result === 'OK' };
}

async function delKey(key) {
  const out = await redisCommand(['DEL', key]);
  return { enabled: out.enabled, deleted: Number(out.result || 0) > 0 };
}

async function incrementWindow(key, ttlMs) {
  const inc = await redisCommand(['INCR', key]);
  if (!inc.enabled) return { enabled: false, count: 0, ttlMs: 0 };
  const count = Number(inc.result || 0);
  if (count === 1) await redisCommand(['PEXPIRE', key, String(Math.max(1000, Number(ttlMs) || 1000))]);
  const ttl = await redisCommand(['PTTL', key]);
  return { enabled: true, count, ttlMs: Math.max(0, Number(ttl.result || ttlMs || 0)) };
}

module.exports = {
  redisEnabled,
  redisCommand,
  getJson,
  setJson,
  delKey,
  incrementWindow,
  stableHash
};
