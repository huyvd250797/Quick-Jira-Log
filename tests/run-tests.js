'use strict';

const assert = require('assert');
const { parseTimeSpent, schedule, displaySegments, normalizeExistingWorklogs } = require('../lib/scheduler');

assert.equal(parseTimeSpent('30m'), 30);
assert.equal(parseTimeSpent('1h'), 60);
assert.equal(parseTimeSpent('1h30m'), 90);
assert.equal(parseTimeSpent('2.5h'), 150);
assert.equal(parseTimeSpent('2'), 120);

assert.deepStrictEqual(displaySegments(schedule(300, [])), [
  { start: '08:00', end: '12:00', minutes: 240 },
  { start: '13:30', end: '14:30', minutes: 60 }
]);

assert.deepStrictEqual(displaySegments(schedule(180, [{ start: 480, end: 600 }])), [
  { start: '10:00', end: '12:00', minutes: 120 },
  { start: '13:30', end: '14:30', minutes: 60 }
]);

const me = { name: 'huy' };
const normalized = normalizeExistingWorklogs([
  { author: { name: 'huy' }, started: '2026-09-28T08:00:00.000+0700', timeSpentSeconds: 3600 },
  { author: { name: 'other' }, started: '2026-09-28T09:00:00.000+0700', timeSpentSeconds: 3600 },
  { author: { name: 'huy' }, started: '2026-09-27T10:00:00.000+0700', timeSpentSeconds: 3600 }
], '2026-09-28', me);
assert.deepStrictEqual(normalized, [{ start: 480, end: 540 }]);

console.log('All tests passed.');
