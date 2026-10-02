'use strict';

const crypto = require('crypto');
const { redisEnabled, getJson, setJson, delKey } = require('./redis-store');

const STORE_KEY = '__quickJiraLogIdempotencyV180';
const DEFAULT_TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 500;
const REMOTE_WAIT_MS = 30000;

class IdempotencyStoreError extends Error {
  constructor(message = 'Hệ thống chống log trùng đang tạm thời không khả dụng. Vui lòng thử lại sau để đảm bảo không tạo worklog trùng.') {
    super(message);
    this.code = 'IDEMPOTENCY_STORE_UNAVAILABLE';
    this.status = 503;
  }
}

class IdempotencyInProgressError extends Error {
  constructor() {
    super('Yêu cầu Logwork này đang được Jira xử lý. Vui lòng chờ kết quả, không gửi lại để tránh log trùng.');
    this.code = 'IDEMPOTENCY_IN_PROGRESS';
    this.status = 409;
  }
}

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

async function runMemory(operation, id, fn, ttlMs) {
  cleanup();
  const key = `${operation}:${id}`;
  const map = store();
  const existing = map.get(key);
  if (existing?.promise) {
    const value = await existing.promise;
    return { value, replayed: true, requestId: id, store: 'memory' };
  }
  const promise = Promise.resolve().then(fn);
  map.set(key, { promise, createdAt: Date.now(), ttlMs });
  try {
    const value = await promise;
    return { value, replayed: false, requestId: id, store: 'memory' };
  } catch (error) {
    map.delete(key);
    throw error;
  }
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function waitForRemoteResult(key, requestId) {
  const deadline = Date.now() + REMOTE_WAIT_MS;
  while (Date.now() < deadline) {
    await sleep(150);
    const current = await getJson(key);
    if (!current.enabled) return null;
    if (current.value?.state === 'done') {
      return { value: current.value.value, replayed: true, requestId, store: 'redis' };
    }
    if (!current.value) return null;
  }
  throw new IdempotencyInProgressError();
}

async function runRemote(operation, id, fn, ttlMs) {
  const key = `qjl:idem:${operation}:${id}`;
  const token = crypto.randomBytes(12).toString('hex');
  const claim = await setJson(key, { state: 'pending', token, createdAt: Date.now() }, ttlMs, { nx: true });
  if (!claim.enabled) return null;

  if (!claim.stored) {
    const current = await getJson(key);
    if (current.value?.state === 'done') return { value: current.value.value, replayed: true, requestId: id, store: 'redis' };
    const waited = await waitForRemoteResult(key, id);
    if (waited) return waited;
    return null;
  }

  let value;
  try {
    value = await fn();
  } catch (error) {
    // Chỉ xóa claim khi nghiệp vụ Jira thật sự thất bại/đã rollback.
    try { await delKey(key); } catch {}
    throw error;
  }

  try {
    const completed = await setJson(key, { state: 'done', token, value, completedAt: Date.now() }, ttlMs);
    if (!completed.enabled || !completed.stored) throw new Error('IDEMPOTENCY_RESULT_NOT_PERSISTED');
    return { value, replayed: false, requestId: id, store: 'redis' };
  } catch {
    // Jira đã ghi thành công: KHÔNG xóa pending lock. Giữ lock tới TTL để request retry
    // trên instance khác bị chặn thay vì có nguy cơ tạo worklog lần hai.
    const memoryKey = `${operation}:${id}`;
    store().set(memoryKey, { promise: Promise.resolve(value), createdAt: Date.now(), ttlMs });
    return { value, replayed: false, requestId: id, store: 'redis-degraded' };
  }
}

async function runIdempotent(operation, requestId, fn, ttlMs = DEFAULT_TTL_MS) {
  const id = normalizeRequestId(requestId);
  if (!id) return { value: await fn(), replayed: false, requestId: '', store: 'none' };

  if (redisEnabled()) {
    try {
      const remote = await runRemote(operation, id, fn, ttlMs);
      if (remote) return remote;
      throw new IdempotencyStoreError();
    } catch (error) {
      if (error instanceof IdempotencyInProgressError || error instanceof IdempotencyStoreError) throw error;
      // Khi Redis/KV đã được cấu hình, fail closed nếu store gặp lỗi. Không được
      // âm thầm chạy lại ở memory vì request trước có thể đã claim lock ở instance khác.
      throw new IdempotencyStoreError();
    }
  }
  return runMemory(operation, id, fn, ttlMs);
}

module.exports = { normalizeRequestId, runIdempotent, IdempotencyInProgressError, IdempotencyStoreError };
