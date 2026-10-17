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

  function exactDuration(minutes) {
    const total = Math.max(0, Math.round(Number(minutes) || 0));
    return `${Math.floor(total / 60)}h ${total % 60}m`;
  }

  function shiftDate(date, days) {
    if (!validDate(date)) throw new Error('INVALID_DATE');
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  }

  function weekRange(date) {
    if (!validDate(date)) throw new Error('INVALID_DATE');
    const offset = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
    const start = shiftDate(date, -offset);
    return { start, end: shiftDate(start, 6), workEnd: shiftDate(start, 4), days: Array.from({ length: 7 }, (_, index) => shiftDate(start, index)) };
  }

  function workSummary(items, date) {
    const week = weekRange(date);
    const totalFor = target => (items || []).filter(item => item.date === target && item.overtime !== true && item.overtimeKnown !== false).reduce((sum, item) => sum + Math.max(0, Number(item.minutes) || 0), 0);
    const daily = totalFor(date);
    const weekly = week.days.slice(0, 5).reduce((sum, day) => sum + totalFor(day), 0);
    const weekend = week.days.slice(5).reduce((sum, day) => sum + totalFor(day), 0);
    const dayTarget = week.days.indexOf(date) < 5 ? 480 : 0;
    return { daily, weekly, weekend, dayTarget, dayRemaining: Math.max(0, dayTarget - daily), weekRemaining: Math.max(0, 2400 - weekly), week };
  }

  function minuteOfDay(value) {
    const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
  }

  // Allocate lanes for overlapping worklogs without hiding one beneath another.
  function timedLayout(items) {
    const events = (items || []).map((item, index) => ({ item, index, start: minuteOfDay(item.start), end: Math.min(1440, minuteOfDay(item.start) + Math.max(1, Number(item.minutes) || 1)) })).sort((a, b) => a.start - b.start || b.end - a.end);
    let group = [], groupEnd = -1;
    const finish = () => {
      const lanes = [];
      for (const event of group) {
        let lane = lanes.findIndex(end => end <= event.start);
        if (lane < 0) lane = lanes.length;
        lanes[lane] = event.end;
        event.lane = lane;
      }
      for (const event of group) event.lanes = lanes.length;
      group = [];
    };
    for (const event of events) {
      if (group.length && event.start >= groupEnd) finish();
      if (!group.length) groupEnd = event.end;
      group.push(event);
      groupEnd = Math.max(groupEnd, event.end);
    }
    finish();
    return events;
  }

  return { durationMinutes, durationLabel, stepDuration, validDate, monthRange, monthCells, shiftMonth, exactDuration, shiftDate, weekRange, workSummary, minuteOfDay, timedLayout };
});
