'use strict';

const { scheduleForDate, validateScheduledSegments, mergeRanges, workWindowsFor } = require('./scheduler');

function planBulkItems(items, occupied = [], { date } = {}) {
  let busy = mergeRanges(occupied);
  const plans = [];

  for (const item of items || []) {
    let segments;
    try {
      const windows = workWindowsFor(date, item.overtime === true);
      segments = scheduleForDate(item.minutes, busy, date, item.overtime === true);
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

module.exports = { planBulkItems };
