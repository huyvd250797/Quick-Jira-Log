'use strict';

function createPerf() {
  const startedAt = Date.now();
  const phases = {};
  async function step(name, fn) {
    const start = Date.now();
    try { return await fn(); }
    finally { phases[name] = Date.now() - start; }
  }
  function snapshot(extra = {}) {
    return { totalMs: Date.now() - startedAt, ...phases, ...extra };
  }
  function serverTimingHeader(extra = {}) {
    const data = snapshot(extra);
    return Object.entries(data)
      .filter(([, value]) => Number.isFinite(Number(value)))
      .map(([name, value]) => `${String(name).replace(/[^A-Za-z0-9_-]/g, '_')};dur=${Math.max(0, Number(value)).toFixed(0)}`)
      .join(', ');
  }
  return { step, snapshot, serverTimingHeader };
}

module.exports = { createPerf };
