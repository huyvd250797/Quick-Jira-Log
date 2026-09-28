'use strict';

const { WORK_WINDOWS, TIMEZONE_OFFSET, MAX_DAILY_MINUTES } = require('./config');

function parseTimeSpent(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/,/g, '.');
  if (!raw) throw new Error('TIME_SPENT_REQUIRED');

  if (/^\d+(\.\d+)?h$/.test(raw)) {
    const hours = Number(raw.slice(0, -1));
    const minutes = Math.round(hours * 60);
    return validateMinutes(minutes);
  }

  if (/^\d+m$/.test(raw)) return validateMinutes(Number(raw.slice(0, -1)));

  const compact = raw.replace(/\s+/g, '');
  const match = compact.match(/^(?:(\d+)h)?(?:(\d+)m)?$/);
  if (match && (match[1] || match[2])) {
    return validateMinutes(Number(match[1] || 0) * 60 + Number(match[2] || 0));
  }

  if (/^\d+$/.test(raw)) return validateMinutes(Number(raw) * 60); // "2" = 2h
  throw new Error('TIME_SPENT_INVALID');
}

function validateMinutes(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) throw new Error('TIME_SPENT_INVALID');
  if (minutes > MAX_DAILY_MINUTES) throw new Error('TIME_SPENT_TOO_LARGE');
  return minutes;
}

function hhmmToMinute(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function minuteToHHMM(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function jiraDateFromStarted(started) {
  if (typeof started !== 'string' || started.length < 10) return null;
  return started.slice(0, 10);
}

function minuteFromStarted(started) {
  const match = String(started || '').match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function normalizeIdentity(value) {
  return String(value || '').trim().toLocaleLowerCase('en-US');
}

function identityValues(person) {
  return [
    person?.name, person?.key, person?.accountId, person?.emailAddress,
    person?.displayName, person?.username
  ].map(normalizeIdentity).filter(Boolean);
}

function authorMatches(worklog, me) {
  const author = worklog?.author || {};
  const candidates = identityValues(author);
  const mine = new Set(identityValues(me));
  return candidates.some(value => mine.has(value));
}

function normalizeExistingWorklogs(worklogs, date, me) {
  const ranges = [];
  for (const w of worklogs || []) {
    if (!authorMatches(w, me)) continue;
    if (jiraDateFromStarted(w.started) !== date) continue;
    const start = minuteFromStarted(w.started);
    const seconds = Number(w.timeSpentSeconds || 0);
    if (start == null || seconds <= 0) continue;
    const end = start + Math.ceil(seconds / 60);
    ranges.push({ start, end });
  }
  return mergeRanges(ranges);
}

function mergeRanges(ranges) {
  const sorted = ranges
    .filter(r => Number.isFinite(r.start) && Number.isFinite(r.end) && r.end > r.start)
    .sort((a, b) => a.start - b.start);
  const merged = [];
  for (const item of sorted) {
    const last = merged[merged.length - 1];
    if (!last || item.start > last.end) merged.push({ ...item });
    else last.end = Math.max(last.end, item.end);
  }
  return merged;
}

function availableSlots(occupied) {
  const slots = [];
  for (const window of WORK_WINDOWS) {
    const wStart = hhmmToMinute(window.start);
    const wEnd = hhmmToMinute(window.end);
    let cursor = wStart;
    for (const busy of occupied) {
      if (busy.end <= wStart || busy.start >= wEnd) continue;
      const start = Math.max(busy.start, wStart);
      const end = Math.min(busy.end, wEnd);
      if (start > cursor) slots.push({ start: cursor, end: start });
      cursor = Math.max(cursor, end);
    }
    if (cursor < wEnd) slots.push({ start: cursor, end: wEnd });
  }
  return slots;
}

function schedule(minutes, occupied) {
  const slots = availableSlots(occupied);
  const totalAvailable = slots.reduce((sum, s) => sum + (s.end - s.start), 0);
  if (totalAvailable < minutes) {
    const err = new Error('NOT_ENOUGH_TIME');
    err.availableMinutes = totalAvailable;
    err.requiredMinutes = minutes;
    throw err;
  }

  let remaining = minutes;
  const segments = [];
  for (const slot of slots) {
    if (remaining <= 0) break;
    const duration = Math.min(remaining, slot.end - slot.start);
    if (duration > 0) segments.push({ start: slot.start, end: slot.start + duration, minutes: duration });
    remaining -= duration;
  }
  return segments;
}


function isRangeInsideWorkWindows(start, end) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return false;
  return WORK_WINDOWS.some(window => {
    const wStart = hhmmToMinute(window.start);
    const wEnd = hhmmToMinute(window.end);
    return start >= wStart && end <= wEnd;
  });
}

function rangesOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

function validateScheduledSegments(segments, occupied = []) {
  for (const seg of segments || []) {
    if (!isRangeInsideWorkWindows(seg.start, seg.end)) {
      const err = new Error('SEGMENT_OUTSIDE_WORK_WINDOWS');
      err.segment = seg;
      throw err;
    }
    if ((occupied || []).some(busy => rangesOverlap(seg, busy))) {
      const err = new Error('SEGMENT_OVERLAP');
      err.segment = seg;
      throw err;
    }
  }
  return true;
}

function jiraStarted(date, minute) {
  const hhmm = minuteToHHMM(minute);
  return `${date}T${hhmm}:00.000${TIMEZONE_OFFSET}`;
}

function displaySegments(segments) {
  return segments.map(s => ({
    start: minuteToHHMM(s.start),
    end: minuteToHHMM(s.end),
    minutes: s.minutes
  }));
}

module.exports = {
  parseTimeSpent,
  normalizeExistingWorklogs,
  schedule,
  jiraStarted,
  displaySegments,
  minuteToHHMM,
  hhmmToMinute,
  availableSlots,
  mergeRanges,
  isRangeInsideWorkWindows,
  rangesOverlap,
  validateScheduledSegments
};
