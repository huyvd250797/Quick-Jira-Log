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

// Share one concurrency budget across multiple groups of reads.
function createConcurrencyLimiter(limit) {
  let active = 0;
  const waiting = [];
  function startNext() {
    if (active >= limit || !waiting.length) return;
    const { run, resolve, reject } = waiting.shift();
    active++;
    Promise.resolve().then(run).then(resolve, reject).finally(() => {
      active--;
      startNext();
    });
  }
  return run => new Promise((resolve, reject) => {
    waiting.push({ run, resolve, reject });
    startNext();
  });
}

module.exports = { mapWithConcurrency, settleMapWithConcurrency, createConcurrencyLimiter };
