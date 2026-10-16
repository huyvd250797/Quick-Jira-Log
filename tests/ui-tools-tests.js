'use strict';

const assert = require('node:assert/strict');
const { stepDuration, durationMinutes, monthCells, monthRange, shiftMonth, validDate } = require('../lib/ui-tools');
const { parseTimeSpent } = require('../lib/scheduler');

assert.equal(stepDuration('1h', 1), '1h 30m');
assert.equal(stepDuration('1h 30m', -1), '1h');
assert.equal(stepDuration('30m', -1), '30m');
assert.equal(stepDuration('', 1), '30m');
assert.equal(stepDuration('15h 30m', 1), '16h');
assert.equal(stepDuration('16h', 1), '16h');
assert.equal(stepDuration('1.5h', 1), '2h');
assert.equal(stepDuration('invalid', 1), null);
assert.equal(durationMinutes('1h 30m'), 90);
assert.equal(parseTimeSpent(stepDuration('1h', 1)), 90, 'stepped value must work with the existing server parser');
assert.equal(validDate('2026-02-30'), false);
assert.equal(validDate('2024-02-29'), true);
assert.deepEqual(monthRange('2024-02-16'), { start: '2024-02-01', end: '2024-02-29' });
assert.equal(monthCells('2026-10-16').filter(Boolean).length, 31);
assert.equal(monthCells('2026-10-16').indexOf('2026-10-01'), 3, 'calendar starts on Monday');
assert.equal(shiftMonth('2026-01-31', 1), '2026-02-28');
assert.equal(shiftMonth('2024-01-31', 1), '2024-02-29');
assert.equal(shiftMonth('2026-12-15', 1), '2027-01-15');
console.log('V1.9.0 duration stepper and calendar date tests passed.');

const handler = require('../handlers/worklog-history');
const { createSessionCookie } = require('../lib/session');
const oldFetch = global.fetch;
const oldSecret = process.env.APP_SESSION_SECRET;

(async () => {
  process.env.APP_SESSION_SECRET = 'local-automated-test-secret-longer-than-32';
  const cookie = createSessionCookie({ mode: 'basic', username: 'tester', password: 'test-only', me: { name: 'tester' } }).split(';')[0];
  const calls = [];
  let failSearch = false;
  global.fetch = async (url, options = {}) => {
    const target = String(url);
    const body = options.body ? JSON.parse(options.body) : {};
    calls.push({ target, body });
    if (target.includes('/search')) {
      if (failSearch) return new Response(JSON.stringify({ errorMessages: ['Search unavailable'] }), { status: 503 });
      const issues = body.jql?.startsWith('key in')
        ? [{ key: 'TEST-1', fields: { project: { key: 'TEST' }, summary: 'Calendar task', status: { name: 'Done' } } }]
        : [{ key: 'TEST-1' }, { key: 'TEST-2' }];
      return Response.json({ issues, total: issues.length });
    }
    if (target.includes('/TEST-2/worklog')) return new Response('{}', { status: 403 });
    if (target.includes('/TEST-1/worklog')) {
      const make = (id, started, author = 'tester') => ({ id, started, author: { name: author }, timeSpentSeconds: 3600, comment: 'Work' });
      return Response.json({ total: 5, worklogs: [
        make('first', '2026-09-30T18:00:00.000+0000'),
        make('mid', '2026-10-15T08:00:00.000+0700'),
        make('last', '2026-10-31T10:00:00.000+0700'),
        make('next', '2026-10-31T18:00:00.000+0000'),
        make('other', '2026-10-15T08:00:00.000+0700', 'someone-else')
      ] });
    }
    throw new Error(`Unexpected test request ${target}`);
  };
  const run = query => new Promise(async (resolve, reject) => {
    const res = { statusCode: 200, setHeader() {}, end(body) { resolve({ status: this.statusCode, data: JSON.parse(body) }); } };
    try { await handler({ method: 'GET', query, headers: { cookie } }, res); } catch (error) { reject(error); }
  });
  try {
    const monthly = await run({ date: '2026-10-01', endDate: '2026-10-31', force: '1' });
    assert.equal(monthly.status, 200);
    assert.deepEqual(monthly.data.items.map(x => x.id), ['last', 'mid', 'first']);
    assert.equal(monthly.data.items.find(x => x.id === 'first').date, '2026-10-01');
    assert.equal(monthly.data.skipped.length, 1, 'partial history must be visible to the UI');
    const discovery = calls.find(x => x.body.jql?.includes('worklogAuthor = currentUser()'));
    assert(discovery.body.jql.includes('worklogDate >= "2026-09-30"'));
    assert(discovery.body.jql.includes('worklogDate <= "2026-11-01"'));
    assert(calls.filter(x => x.target.includes('/TEST-1/worklog')).length === 1, 'month loads each candidate task once, not once per day');
    const single = await run({ date: '2026-10-15', key: 'TEST-1', force: '1' });
    assert.deepEqual(single.data.items.map(x => x.id), ['mid'], 'single-day history remains compatible');
    assert.equal((await run({ date: '2026-02-30' })).status, 400);
    assert.equal((await run({ date: '2026-10-01', endDate: '2026-11-01' })).status, 400);
    assert.equal((await run({ date: '2026-10-15', endDate: '2026-10-01' })).status, 400);
    failSearch = true;
    assert.equal((await run({ date: '2020-01-01', endDate: '2020-01-31', force: '1' })).status, 502, 'failed search must not look like an empty calendar');
    console.log('V1.9.0 monthly worklog history, timezone, author filtering and error integration tests passed.');
  } finally {
    global.fetch = oldFetch;
    if (oldSecret === undefined) delete process.env.APP_SESSION_SECRET;
    else process.env.APP_SESSION_SECRET = oldSecret;
  }
})().catch(error => { console.error(error); process.exit(1); });
