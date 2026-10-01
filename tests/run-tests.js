'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const { parseTimeSpent, schedule, scheduleForDate, displaySegments, normalizeExistingWorklogs, validateScheduledSegments, isRangeInsideWorkWindows, parseJiraStartedAtWorkTimezone, workWindowsFor, isWeekendDate } = require('../lib/scheduler');
const { planBulkItems } = require('../lib/bulk');

assert.equal(parseTimeSpent('30m'), 30);
assert.equal(parseTimeSpent('1h'), 60);
assert.equal(parseTimeSpent('1h30m'), 90);
assert.equal(parseTimeSpent('1h 30m'), 90);
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
  { key: 'C-3', minutes: 60 }
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


// V1.3.2 - OT ngày thường chỉ xếp từ 17:30 trở đi.
assert.deepStrictEqual(displaySegments(scheduleForDate(120, [], '2026-09-30', true)), [
  { start: '17:30', end: '19:30', minutes: 120 }
]);
assert.equal(isWeekendDate('2026-10-03'), true); // Thứ 7
assert.equal(isWeekendDate('2026-10-04'), true); // Chủ nhật
assert.equal(isWeekendDate('2026-09-30'), false);
assert.deepStrictEqual(workWindowsFor('2026-10-03', true), [
  { start: '08:00', end: '12:00' },
  { start: '13:30', end: '17:30' }
]);
assert.deepStrictEqual(displaySegments(scheduleForDate(300, [], '2026-10-03', true)), [
  { start: '08:00', end: '12:00', minutes: 240 },
  { start: '13:30', end: '14:30', minutes: 60 }
]);
console.log('V1.3.2 overtime scheduling tests passed.');

// V1.0.1 - danh sách Sub-task vẫn dùng JQL cố định, không phụ thuộc Saved Filter.
const { WORKLOG_SUBTASK_JQL } = require('../lib/config');
assert(WORKLOG_SUBTASK_JQL.includes('issuetype = Sub-task'));
assert(WORKLOG_SUBTASK_JQL.includes('assignee = currentUser()'));
assert(WORKLOG_SUBTASK_JQL.includes('createdDate > "2025-10-19"'));
assert(WORKLOG_SUBTASK_JQL.includes('(timespent is EMPTY OR timespent = 0)'));
console.log('V1.0.1 fixed Sub-task JQL tests passed.');

const packageJson = require('../package.json');
assert.equal(packageJson.version, '1.6.0');
console.log('V1.6.0 version test passed.');

const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
assert.match(styles, /#filterCard\s*\{[^}]*grid-column:\s*1;[^}]*grid-row:\s*3;/s);
assert.match(styles, /#worklogCard\s*\{[^}]*grid-column:\s*2;[^}]*grid-row:\s*3;/s);
assert.match(styles, /#bulkCard\s*\{[^}]*grid-column:\s*1 \/ -1;[^}]*grid-row:\s*4;/s);
assert.match(styles, /\.issue-main\s*\{[^}]*flex:\s*1 1 auto;/s);
console.log('V1.0.6 stable desktop grid/alignment tests passed.');

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
assert(indexHtml.includes('id="logAllBtn"'));
assert(!indexHtml.includes('id="bulkModeBtn"'));
assert(!indexHtml.includes('id="selectVisibleBtn"'));
assert(!indexHtml.includes('id="openBulkBtn"'));
assert(indexHtml.includes('id="key" type="hidden"'));
assert(indexHtml.includes('id="project" type="hidden"'));
assert(indexHtml.includes('id="date" type="date"'));
assert(indexHtml.includes('id="bulkDate" type="date"'));
assert(indexHtml.includes('Ngày logwork')); 
assert(indexHtml.includes('TÌM WORKLOG ĐÃ LOG'));
assert(appJs.includes('<small>Đã logwork</small>'));
assert(appJs.includes("$('logAllBtn').addEventListener('click', openBulkAll)"));
console.log('V1.1.1 focused logwork UX + editable date tests passed.');

// V1.2.0 - streamlined navigation, no description templates, flexible Log All selection.
assert(!indexHtml.includes('Mẫu Description'));
assert(!indexHtml.includes('id=\"templateSelect\"'));
assert(indexHtml.includes('id=\"plannerBtn\"'));
assert(indexHtml.includes('id=\"historyBtn\"'));
assert(indexHtml.includes('id=\"mobileTaskbar\"'));
assert(indexHtml.includes('id=\"plannerOverlay\"'));
assert(indexHtml.includes('id=\"historyOverlay\"'));
assert(appJs.includes('bulk-remove-btn'));
assert(appJs.includes('state.bulkSelectedKeys.delete(key)'));
assert(appJs.includes('openPlanner'));
assert(appJs.includes('openHistory'));
console.log('V1.2.0 streamlined navigation & bulk selection tests passed.');

// V1.3.2 - mobile taskbar visible, login labels, OT controls.
assert(indexHtml.includes('<label>Username'));
assert(indexHtml.includes('<label>Password'));
assert(indexHtml.includes('id="overtime"'));
assert(appJs.includes('overtime: $(\'overtime\')?.checked === true'));
assert(appJs.includes('bulk-overtime'));
assert(styles.includes('.mobile-taskbar:not(.hidden) { display: grid; }'));
console.log('V1.3.2 mobile taskbar + overtime UI tests passed.');



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


// V1.4.0 - đúng khung 13:30, mobile bottom sheet và zero-friction (không preview trước log).
assert.deepStrictEqual(displaySegments(schedule(90, [])), [
  { start: '08:00', end: '09:30', minutes: 90 }
]);
assert(indexHtml.includes('id="mobileEditorBackdrop"'));
assert(!indexHtml.includes('id="worklogPreview"'));
assert(!indexHtml.includes('id="bulkPreviewState"'));
assert(!appJs.includes('worklog-preview'));
assert(!fs.existsSync(path.join(root, 'handlers', 'worklog-preview.js')));
assert(styles.includes('#worklogCard.mobile-bottom-sheet'));
assert(styles.includes('#bulkCard.mobile-bottom-sheet'));
console.log('V1.4.0 zero-friction no-preview tests passed.');

// V1.4.0 - Bottom sheet gesture, preset focus, credits và visual system.
assert(indexHtml.includes('class="bottom-sheet-drag-handle"'));
assert(appJs.includes("setupBottomSheetDrag('worklogCard')"));
assert(appJs.includes("setupBottomSheetDrag('bulkCard')"));
assert(appJs.includes('drag.delta >= 110'));
assert(!/document\.querySelectorAll\('\.preset-btn'\)[\s\S]{0,900}\$\('description'\)\.focus\(\)/.test(appJs));
assert(indexHtml.includes('© 2026 HuyVo. All rights reserved.'));
assert(!indexHtml.includes('được xây dựng từ ý tưởng của <strong>HuyVo</strong> với sự hỗ trợ của AI'));
assert(styles.includes('.issue-row.is-selected'));
assert(styles.includes('.filter-skeleton'));
assert(styles.includes('.log-submit-btn'));
assert(appJs.includes('Đã log ${data.issue.key}'));
assert(appJs.includes('segment.start'));
assert.equal(fs.readdirSync(path.join(root, 'api')).filter(name => name.endsWith('.js')).length, 1);
console.log('V1.4.0 visual system + post-log result tests passed.');


// V1.5.0 - One-Tap Daily Workflow UX guards.
const indexV150 = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appV150 = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
assert(indexV150.includes('id="logNextBtn"'));
assert(!indexV150.includes('data-time="15m"'));
assert(indexV150.includes('data-time="30m"'));
assert(indexV150.includes('data-time="1h"'));
assert(indexV150.includes('data-time="2h"'));
assert(indexV150.includes('data-time="3h"'));
assert(indexV150.includes('data-time="4h"'));
assert(!indexV150.includes('Quick Jira Log được xây dựng từ ý tưởng của'));
assert(indexV150.includes('© 2026 HuyVo. All rights reserved.'));
assert(appV150.includes("sessionDate: 'quick-jira-log:session-log-date:v1'"));
assert(appV150.includes('getSessionLogDate()'));
assert(appV150.includes("event.key === '/'"));
assert(appV150.includes("event.ctrlKey || event.metaKey"));
console.log('V1.5.0/V1.5.2 one-tap workflow preset tests passed.');


// V1.5.1 - Bulk Logwork có Preset TimeSpent riêng cho từng Sub-task.
assert(appJs.includes("['30m', '1h', '2h', '3h', '4h']"));
assert(appJs.includes('bulk-preset-btn'));
assert(appJs.includes('data-time="${value}"'));
assert(appJs.includes("row.querySelectorAll('.bulk-preset-btn')"));
assert(appJs.includes('if (draft) draft.timeSpent = value'));
assert(styles.includes('.bulk-preset-row'));
assert(styles.includes('.bulk-preset-btn'));
console.log('V1.5.1 bulk TimeSpent presets tests passed.');


// V1.6.0 - Single/Bulk TimeSpent presets phải đồng nhất format/màu sắc.
assert(indexHtml.includes('data-time="30m"'));
assert(indexHtml.includes('data-time="3h"'));
assert(!indexHtml.includes('data-time="15m"'));
assert(styles.includes('.preset-btn, .bulk-preset-btn'));
assert(styles.includes('html[data-theme="dark"] .preset-btn, html[data-theme="dark"] .bulk-preset-btn'));
assert(appJs.includes('syncSinglePresetState'));
console.log('V1.5.2 unified TimeSpent preset UI tests passed.');


// V1.6.0 - Bulk Daily Capacity + taller mobile sheet + fast logwork pipeline.
assert(indexHtml.includes('id="bulkCapacityCard"'));
assert(indexHtml.includes('id="bulkAlreadyLogged"'));
assert(indexHtml.includes('id="bulkRegularDraft"'));
assert(indexHtml.includes('id="bulkCapacityProjected"'));
assert(appJs.includes('regularOccupiedMinutes ?? data.occupiedMinutes'));
assert(appJs.includes('Còn thiếu ${minutesLabel(480 - projected)} để đủ 8h.'));
assert(appJs.includes('Vượt ${minutesLabel(projected - 480)} so với 8h.'));
assert(styles.includes('max-height: min(95dvh, 920px)'));
assert(styles.includes('.bulk-capacity-card'));
const dayAuditJs = fs.readFileSync(path.join(root, 'handlers', 'day-audit.js'), 'utf8');
const guardJs = fs.readFileSync(path.join(root, 'lib', 'worklog-guard.js'), 'utf8');
const singleHandlerJs = fs.readFileSync(path.join(root, 'handlers', 'worklog.js'), 'utf8');
const bulkHandlerJs = fs.readFileSync(path.join(root, 'handlers', 'bulk-worklog.js'), 'utf8');
const jiraJs = fs.readFileSync(path.join(root, 'lib', 'jira.js'), 'utf8');
assert(dayAuditJs.includes('regularOccupiedMinutes'));
assert(guardJs.includes('fastStableGuard: true'));
assert(singleHandlerJs.includes('settleMapWithConcurrency(plan, 2'));
assert(bulkHandlerJs.includes('settleMapWithConcurrency(creationJobs, 4'));
assert(bulkHandlerJs.includes('settleMapWithConcurrency(verified, 4'));
assert(jiraJs.includes('POST transition đã xác nhận thành công'));
console.log('V1.6.0 daily capacity + fast logwork tests passed.');
