'use strict';

// Opt-in NDJSON on the existing POST. No polling, extra function or retry of writes.
function createProgressChannel(req, res) {
  if (!String(req.headers.accept || '').includes('application/x-ndjson') || typeof res.write !== 'function') return () => {};
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  res.qjlStream = true;
  res.flushHeaders?.();
  let percent = 0;
  const started = Date.now();
  const report = (value, phase) => {
    if (res.destroyed || res.writableEnded) return;
    percent = Math.max(percent, Math.min(100, Math.round(Number(value) || 0)));
    try { res.write(`${JSON.stringify({ type: 'progress', percent, phase, elapsedMs: Date.now() - started })}\n`); } catch {}
  };
  res.qjlProgress = report;
  report(2, 'Đã nhận yêu cầu; đang kiểm tra dữ liệu');
  return report;
}

module.exports = { createProgressChannel };
