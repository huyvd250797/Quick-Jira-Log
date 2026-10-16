(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.QuickJiraUi = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function durationMinutes(value) {
    const text = String(value || '').trim().toLowerCase().replace(/,/g, '.').replace(/\s+/g, '');
    if (!text) return 0;
    if (/^\d+(\.\d+)?h$/.test(text)) return Math.round(Number(text.slice(0, -1)) * 60);
    if (/^\d+$/.test(text)) return Number(text) * 60;
    const match = text.match(/^(?:(\d+)h)?(?:(\d+)m)?$/);
    if (!match || (!match[1] && !match[2])) return NaN;
    return Number(match[1] || 0) * 60 + Number(match[2] || 0);
  }

  function durationLabel(minutes) {
    const total = Math.max(0, Math.round(Number(minutes) || 0));
    return [Math.floor(total / 60) ? `${Math.floor(total / 60)}h` : '', total % 60 ? `${total % 60}m` : ''].filter(Boolean).join(' ') || '0m';
  }

  function stepDuration(value, direction) {
    const minutes = durationMinutes(value);
    if (!Number.isFinite(minutes)) return null;
    return durationLabel(Math.min(960, Math.max(30, minutes + (direction > 0 ? 30 : -30))));
  }

  function validDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return false;
    const parsed = new Date(`${date}T12:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
  }

  function monthRange(date) {
    if (!validDate(date)) throw new Error('INVALID_DATE');
    const [year, month] = date.split('-').map(Number);
    const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    return { start: `${date.slice(0, 7)}-01`, end };
  }

  function monthCells(date) {
    const { start, end } = monthRange(date);
    const first = new Date(`${start}T12:00:00Z`);
    const offset = (first.getUTCDay() + 6) % 7;
    const count = Number(end.slice(-2));
    const size = Math.ceil((offset + count) / 7) * 7;
    return Array.from({ length: size }, (_, i) => {
      const day = i - offset + 1;
      return day > 0 && day <= count ? `${start.slice(0, 7)}-${String(day).padStart(2, '0')}` : '';
    });
  }

  function shiftMonth(date, delta) {
    if (!validDate(date)) throw new Error('INVALID_DATE');
    const [year, month, day] = date.split('-').map(Number);
    const target = new Date(Date.UTC(year, month - 1 + delta, 1));
    const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(day, last));
    return target.toISOString().slice(0, 10);
  }

  return { durationMinutes, durationLabel, stepDuration, validDate, monthRange, monthCells, shiftMonth };
});
