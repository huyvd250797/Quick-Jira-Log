'use strict';

const { hhmmToMinute, scheduleForDate, validateScheduledSegments, mergeRanges, workWindowsFor } = require('./scheduler');

function overtimeBusy(occupied, start) {
  if (!start) return occupied;
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(start)) throw new Error('INVALID_OVERTIME_START');
  return [...occupied, { start: 0, end: hhmmToMinute(start) }];
}

function planBulkItems(items, occupied = [], { date } = {}) {
  let busy = mergeRanges(occupied);
  const plans = [];

  for (const item of items || []) {
    let segments;
    try {
      const windows = workWindowsFor(date, item.overtime === true);
      segments = scheduleForDate(item.minutes, item.overtime ? overtimeBusy(busy, item.overtimeStart) : busy, date, item.overtime === true);
      validateScheduledSegments(segments, busy, windows);
    } catch (error) {
      error.bulkItem = item;
      throw error;
    }
    plans.push({ ...item, segments });
    busy = mergeRanges([...busy, ...segments.map(segment => ({ start: segment.start, end: segment.end }))]);
  }

  return { plans, occupiedAfter: busy };
}

module.exports = { planBulkItems, overtimeBusy };
