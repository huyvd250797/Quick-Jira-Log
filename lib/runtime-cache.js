'use strict';

const { getJson, setJson, delKey } = require('./redis-store');

const MEMORY_KEY = '__quickJiraLogRuntimeCacheV180';
const MAX_ENTRIES = 300;

function memory() {
  if (!globalThis[MEMORY_KEY]) globalThis[MEMORY_KEY] = new Map();
  return globalThis[MEMORY_KEY];
}

function cleanup(now = Date.now()) {
  const store = memory();
  for (const [key, entry] of store) {
    if (!entry || Number(entry.expiresAt || 0) <= now) store.delete(key);
  }
  if (store.size <= MAX_ENTRIES) return;
  const sorted = [...store.entries()].sort((a, b) => Number(a[1]?.expiresAt || 0) - Number(b[1]?.expiresAt || 0));
  for (const [key] of sorted.slice(0, store.size - MAX_ENTRIES)) store.delete(key);
}

async function cacheGet(key) {
  cleanup();
  const local = memory().get(key);
  if (local && local.expiresAt > Date.now()) return { hit: true, value: local.value, source: 'memory' };
  try {
    const remote = await getJson(`qjl:cache:${key}`);
    if (remote.enabled && remote.value && Number(remote.value.expiresAt || 0) > Date.now()) {
      memory().set(key, remote.value);
      return { hit: true, value: remote.value.value, source: 'redis' };
    }
  } catch {}
  return { hit: false, value: null, source: 'miss' };
}

async function cacheSet(key, value, ttlMs = 15000) {
  const entry = { value, expiresAt: Date.now() + Math.max(1000, Number(ttlMs) || 15000) };
  memory().set(key, entry);
  cleanup();
  try { await setJson(`qjl:cache:${key}`, entry, ttlMs); } catch {}
  return value;
}

async function cacheDelete(key) {
  memory().delete(key);
  try { await delKey(`qjl:cache:${key}`); } catch {}
}

module.exports = { cacheGet, cacheSet, cacheDelete };
