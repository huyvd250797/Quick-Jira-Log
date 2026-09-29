'use strict';

const STORE_KEY = '__quickJiraLogIdempotencyV090';
const DEFAULT_TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 500;

function store() {
  if (!globalThis[STORE_KEY]) globalThis[STORE_KEY] = new Map();
  return globalThis[STORE_KEY];
}

function normalizeRequestId(value) {
  const id = String(value || '').trim();
  if (!/^[A-Za-z0-9._:-]{8,120}$/.test(id)) return '';
  return id;
}

function cleanup(now = Date.now()) {
  const map = store();
  for (const [key, entry] of map) {
    if (!entry || now - Number(entry.createdAt || 0) > Number(entry.ttlMs || DEFAULT_TTL_MS)) map.delete(key);
  }
  if (map.size <= MAX_ENTRIES) return;
  const sorted = [...map.entries()].sort((a, b) => Number(a[1]?.createdAt || 0) - Number(b[1]?.createdAt || 0));
  for (const [key] of sorted.slice(0, map.size - MAX_ENTRIES)) map.delete(key);
}

async function runIdempotent(operation, requestId, fn, ttlMs = DEFAULT_TTL_MS) {
  const id = normalizeRequestId(requestId);
  if (!id) return { value: await fn(), replayed: false, requestId: '' };
  cleanup();
  const key = `${operation}:${id}`;
  const map = store();
  const existing = map.get(key);
  if (existing?.promise) {
    const value = await existing.promise;
    return { value, replayed: true, requestId: id };
  }

  const promise = Promise.resolve().then(fn);
  map.set(key, { promise, createdAt: Date.now(), ttlMs });
  try {
    const value = await promise;
    return { value, replayed: false, requestId: id };
  } catch (error) {
    map.delete(key);
    throw error;
  }
}

module.exports = { normalizeRequestId, runIdempotent };
