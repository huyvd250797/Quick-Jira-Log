'use strict';

const assert = require('assert');

(async () => {
  const oldEnv = {
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN
  };
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  try {
    const { runIdempotent } = require('../lib/idempotency');
    let executions = 0;
    const worker = async () => {
      executions += 1;
      await new Promise(resolve => setTimeout(resolve, 20));
      return { ok: true, value: 42 };
    };
    const [a, b] = await Promise.all([
      runIdempotent('test', 'request-12345678', worker),
      runIdempotent('test', 'request-12345678', worker)
    ]);
    assert.equal(executions, 1, 'same request id must execute only once in memory fallback');
    assert.deepStrictEqual(a.value, { ok: true, value: 42 });
    assert.deepStrictEqual(b.value, { ok: true, value: 42 });
    assert.equal([a.replayed, b.replayed].filter(Boolean).length, 1);

    const { cacheGet, cacheSet, cacheDelete } = require('../lib/runtime-cache');
    await cacheSet('hardening-test', { ok: true }, 5000);
    const cached = await cacheGet('hardening-test');
    assert.equal(cached.hit, true);
    assert.deepStrictEqual(cached.value, { ok: true });
    await cacheDelete('hardening-test');
    const missing = await cacheGet('hardening-test');
    assert.equal(missing.hit, false);

    const { createPerf } = require('../lib/perf');
    const perf = createPerf();
    await perf.step('sample', async () => new Promise(resolve => setTimeout(resolve, 5)));
    const timing = perf.snapshot();
    assert(timing.totalMs >= 0);
    assert(timing.sample >= 0);
    assert(perf.serverTimingHeader().includes('sample;dur='));

    console.log('V1.8.0 idempotency/cache/performance hardening tests passed.');
  } finally {
    for (const [key, value] of Object.entries(oldEnv)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
