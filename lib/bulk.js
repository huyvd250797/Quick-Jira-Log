'use strict';

const { schedule, validateScheduledSegments, mergeRanges } = require('./scheduler');

function planBulkItems(items, occupied = []) {
  let busy = mergeRanges(occupied);
  const plans = [];

  for (const item of items || []) {
    let segments;
    try {
      segments = schedule(item.minutes, busy);
      validateScheduledSegments(segments, busy);
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
