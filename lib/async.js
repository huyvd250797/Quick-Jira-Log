'use strict';

async function mapWithConcurrency(items, limit, worker) {
  const list = Array.from(items || []);
  if (!list.length) return [];
  const concurrency = Math.max(1, Math.min(Number(limit) || 1, list.length));
  const results = new Array(list.length);
  let cursor = 0;

  async function run() {
    while (true) {
      const index = cursor++;
      if (index >= list.length) return;
      results[index] = await worker(list[index], index);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => run()));
  return results;
}

async function settleMapWithConcurrency(items, limit, worker) {
  const list = Array.from(items || []);
  if (!list.length) return [];
  const concurrency = Math.max(1, Math.min(Number(limit) || 1, list.length));
  const results = new Array(list.length);
  let cursor = 0;

  async function run() {
    while (true) {
      const index = cursor++;
      if (index >= list.length) return;
      try {
        results[index] = { status: 'fulfilled', value: await worker(list[index], index) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => run()));
  return results;
}

module.exports = { mapWithConcurrency, settleMapWithConcurrency };
