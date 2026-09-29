'use strict';

const assert = require('assert');
const { parseTimeSpent, schedule, displaySegments, normalizeExistingWorklogs, validateScheduledSegments, isRangeInsideWorkWindows, parseJiraStartedAtWorkTimezone } = require('../lib/scheduler');
const { planBulkItems } = require('../lib/bulk');

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


// V0.6.2 - Bulk vẫn phải dùng chung occupied timeline, item sau không được đè item trước.
const bulkPlan = planBulkItems([
  { key: 'A-1', minutes: 120 },
  { key: 'B-2', minutes: 120 }
], [{ start: 480, end: 540 }]).plans;
assert.deepStrictEqual(displaySegments(bulkPlan[0].segments), [
  { start: '09:00', end: '11:00', minutes: 120 }
]);
assert.deepStrictEqual(displaySegments(bulkPlan[1].segments), [
  { start: '11:00', end: '12:00', minutes: 60 },
  { start: '13:30', end: '14:30', minutes: 60 }
]);
assert.throws(() => planBulkItems([
  { key: 'A-1', minutes: 240 },
  { key: 'B-2', minutes: 240 },
  { key: 'C-3', minutes: 30 }
], []), /NOT_ENOUGH_TIME/);


// V0.6.2 - nhận diện author không phân biệt hoa/thường và có username alias.
const normalizedCaseInsensitive = normalizeExistingWorklogs([
  { author: { name: 'huyvo' }, started: '2026-09-28T08:00:00.000+0700', timeSpentSeconds: 3600 },
  { author: { name: 'HUYVO' }, started: '2026-09-28T09:00:00.000+0700', timeSpentSeconds: 1800 }
], '2026-09-28', { name: 'HuyVo', username: 'HuyVo' });
assert.deepStrictEqual(normalizedCaseInsensitive, [{ start: 480, end: 570 }]);
assert.deepStrictEqual(displaySegments(schedule(60, normalizedCaseInsensitive)), [
  { start: '09:30', end: '10:30', minutes: 60 }
]);
console.log('V0.6.2 reliability tests passed.');


// V0.6.2 - Worklog trả UTC phải được quy đổi về giờ Việt Nam trước khi xếp lịch.
assert.deepStrictEqual(parseJiraStartedAtWorkTimezone('2026-09-28T01:00:00.000+0000'), { date: '2026-09-28', minute: 480 });
assert.deepStrictEqual(parseJiraStartedAtWorkTimezone('2026-09-28T02:00:00.000+0000'), { date: '2026-09-28', minute: 540 });
const normalizedUtc = normalizeExistingWorklogs([
  { author: { name: 'HuyVo' }, started: '2026-09-28T01:00:00.000+0000', timeSpentSeconds: 3600 },
  { author: { name: 'HuyVo' }, started: '2026-09-28T02:00:00.000+0000', timeSpentSeconds: 1800 }
], '2026-09-28', { name: 'huyvo' });
assert.deepStrictEqual(normalizedUtc, [{ start: 480, end: 570 }]);
assert.deepStrictEqual(displaySegments(schedule(60, normalizedUtc)), [
  { start: '09:30', end: '10:30', minutes: 60 }
]);
console.log('V0.6.2 timezone guard tests passed.');

// V1.0.1 - danh sách Sub-task vẫn dùng JQL cố định, không phụ thuộc Saved Filter.
const { WORKLOG_SUBTASK_JQL } = require('../lib/config');
assert(WORKLOG_SUBTASK_JQL.includes('issuetype = Sub-task'));
assert(WORKLOG_SUBTASK_JQL.includes('assignee = currentUser()'));
assert(WORKLOG_SUBTASK_JQL.includes('createdDate > "2025-10-19"'));
assert(WORKLOG_SUBTASK_JQL.includes('(timespent is EMPTY OR timespent = 0)'));
console.log('V1.0.1 fixed Sub-task JQL tests passed.');

const packageJson = require('../package.json');
assert.equal(packageJson.version, '1.0.3');
console.log('V1.0.3 workflow transition hotfix version test passed.');


// V1.0.3 - To Do phải tìm transition sang In Progress trước, sau đó mới Done.
const {
  statusLooksTodo,
  statusLooksInProgress,
  statusLooksDone,
  findTransitionToInProgress,
  findTransitionToDone
} = require('../lib/jira');

const todoStatus = { name: 'To Do', statusCategory: { key: 'new' } };
const inProgressStatus = { name: 'In Progress', statusCategory: { key: 'indeterminate' } };
const doneStatus = { name: 'Done', statusCategory: { key: 'done' } };
assert.equal(statusLooksTodo(todoStatus), true);
assert.equal(statusLooksInProgress(inProgressStatus), true);
assert.equal(statusLooksDone(doneStatus), true);

const todoTransitions = [
  { id: '11', name: 'Start Progress', to: inProgressStatus },
  { id: '99', name: 'Cancel', to: { name: 'Cancelled', statusCategory: { key: 'done' } } }
];
assert.equal(findTransitionToInProgress(todoTransitions)?.id, '11');

const progressTransitions = [
  { id: '21', name: 'Stop Progress', to: todoStatus },
  { id: '31', name: 'Done', to: doneStatus }
];
assert.equal(findTransitionToDone(progressTransitions)?.id, '31');
console.log('V1.0.3 sequential workflow transition selector tests passed.');

(async () => {
  const { transitionIssueToDone } = require('../lib/jira');
  const originalFetch = global.fetch;
  const calls = [];
  let transitionReads = 0;
  global.fetch = async (url, options = {}) => {
    const method = String(options.method || 'GET').toUpperCase();
    calls.push({ url: String(url), method, body: options.body || '' });
    if (String(url).includes('/transitions?')) {
      transitionReads += 1;
      const transitions = transitionReads === 1
        ? [{ id: '11', name: 'Start Progress', to: { name: 'In Progress', statusCategory: { key: 'indeterminate' } } }]
        : [{ id: '31', name: 'Done', to: { name: 'Done', statusCategory: { key: 'done' } } }];
      return new Response(JSON.stringify({ transitions }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (String(url).endsWith('/transitions') && method === 'POST') {
      return new Response(null, { status: 204 });
    }
    if (String(url).includes('/issue/ABC-1?fields=')) {
      return new Response(JSON.stringify({
        key: 'ABC-1',
        fields: { project: { key: 'ABC' }, summary: 'Test', status: { name: 'In Progress', statusCategory: { key: 'indeterminate' } } }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`Unexpected fetch: ${method} ${url}`);
  };

  try {
    const result = await transitionIssueToDone('ABC-1', { mode: 'basic', username: 'u', password: 'p' }, {
      key: 'ABC-1',
      fields: { status: { name: 'To Do', statusCategory: { key: 'new' } } }
    });
    assert.equal(result.ok, true);
    assert.deepStrictEqual(result.path, ['To Do', 'In Progress', 'Done']);
    assert.equal(calls.filter(c => c.method === 'POST' && c.url.endsWith('/transitions')).length, 2);
    const postedIds = calls
      .filter(c => c.method === 'POST' && c.url.endsWith('/transitions'))
      .map(c => JSON.parse(c.body).transition.id);
    assert.deepStrictEqual(postedIds, ['11', '31']);
    console.log('V1.0.3 sequential To Do -> In Progress -> Done integration test passed.');
  } finally {
    global.fetch = originalFetch;
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
