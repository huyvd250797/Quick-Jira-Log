'use strict';

const assert = require('assert');
const { parseTimeSpent, schedule, displaySegments, normalizeExistingWorklogs, validateScheduledSegments, isRangeInsideWorkWindows } = require('../lib/scheduler');

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


// Không log đè 08:00-09:00: worklog mới phải bắt đầu từ 09:00.
assert.deepStrictEqual(displaySegments(schedule(60, [{ start: 480, end: 540 }])), [
  { start: '09:00', end: '10:00', minutes: 60 }
]);

// Khi cuối ca sáng không đủ, tự chuyển qua ca chiều và tuyệt đối không dùng 12:00-13:30.
assert.deepStrictEqual(displaySegments(schedule(120, [{ start: 480, end: 660 }])), [
  { start: '11:00', end: '12:00', minutes: 60 },
  { start: '13:30', end: '14:30', minutes: 60 }
]);

assert.equal(isRangeInsideWorkWindows(480, 720), true);      // 08:00-12:00
assert.equal(isRangeInsideWorkWindows(810, 1050), true);     // 13:30-17:30
assert.equal(isRangeInsideWorkWindows(720, 810), false);     // nghỉ trưa
assert.equal(isRangeInsideWorkWindows(1020, 1080), false);   // vượt 17:30
assert.equal(validateScheduledSegments([{ start: 540, end: 600, minutes: 60 }], [{ start: 480, end: 540 }]), true);
assert.throws(() => validateScheduledSegments([{ start: 510, end: 570, minutes: 60 }], [{ start: 480, end: 540 }]), /SEGMENT_OVERLAP/);
assert.throws(() => validateScheduledSegments([{ start: 720, end: 780, minutes: 60 }], []), /SEGMENT_OUTSIDE_WORK_WINDOWS/);
