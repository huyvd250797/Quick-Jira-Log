'use strict';
const assert = require('node:assert/strict');
const summary = require('../lib/worklog-summary');
const ui = require('../lib/ui-tools');
const range = ui.weekRange('2026-10-16');
const item = (id, seconds, extra = {}) => ({ id, key: `EPU01-${id}`, project: 'EPU01', date: '2026-10-16', timeSpentSeconds: seconds, minutes: seconds / 60, overtimeKnown: true, overtime: false, isSubtask: true, issueType: 'Sub-task', issueTypeId: '5', subtaskTypeKnown: true, subtaskType: 'Supporting', subtaskTypeId: '101', subtaskTypeFieldId: 'customfield_12345', ...extra });
const a = item('1', 7 * 3600), b = item('2', 2 * 3600, { overtime: true }), c = item('3', 3600, { overtimeKnown: false, legacyOvertime: true }), d = item('4', 3600, { project: 'INTRA', subtaskType: 'Review Document', subtaskTypeId: '102' });
let result = summary.aggregate([a, b, c, d, a, item('5', 9999, { date: '2026-09-01' })], range, '', '2026-10-16');
assert.equal(result.regular, 8 * 3600); assert.equal(result.overtime, 7200); assert.equal(result.unknown, 3600); assert.equal(result.total, 11 * 3600);
assert.equal(result.target, 40 * 3600); assert.equal(result.credited, 8 * 3600);
assert.equal(result.types.length, 2); assert.equal(result.types[0].name, 'Supporting'); assert(!result.types.some(x => x.name === 'Sub-task')); assert.equal(result.types[0].total, 10 * 3600);
assert.equal(result.projects.reduce((s, row) => s + row.total, 0), result.total);
assert.equal(result.types.reduce((s, row) => s + row.total, 0), result.total);
assert.equal(summary.aggregate([a, b, c, d], range, 'INTRA').total, 3600);
assert.equal(summary.classification({ overtime: false }), 'unknown');
assert.equal(summary.classification({ overtimeKnown: true, overtime: 'false' }), 'unknown');
assert.equal(summary.classification({ overtimeKnown: true, overtime: false, legacyOvertime: true }), 'regular');
assert.equal(summary.typeOf({ isSubtask: false, issueType: 'Bug', issueTypeId: '1' }).id, 'other');
assert.equal(summary.typeOf({ isSubtask: true }).id, 'unknown');
// Saturday regular hours and overlong Monday cannot hide another day's deficit.
result = summary.aggregate([item('6', 9 * 3600, { date: '2026-10-12' }), item('7', 8 * 3600, { date: '2026-10-17' })], range, '', '2026-10-13');
assert.equal(result.regular, 17 * 3600); assert.equal(result.credited, 8 * 3600);
assert.deepEqual(result.deficits.map(x => x.date), ['2026-10-13']);
assert.equal(summary.aggregate([], ui.monthRange('2026-02-02')).target, 20 * 8 * 3600);
const chunks = summary.chunks(ui.monthRange('2028-02-29'));
assert.equal(chunks[0].start, '2028-02-01'); assert.equal(chunks.at(-1).end, '2028-02-29');
assert.equal(chunks.reduce((s, c) => s + summary.dates(c).length, 0), 29);
const regular = ui.workSummary([a, b, c, d], '2026-10-16');
assert.equal(regular.daily, 480); assert.equal(regular.weekly, 480);
console.log('V1.13.0 aggregation: exact seconds, dedup, native OT/unknown, type/project grouping, period/filter, leap month and regular targets passed.');

const http = require('node:http');
const api = require('../api');
const { createSessionCookie } = require('../lib/session');
const originalFetch = global.fetch, secret = process.env.APP_SESSION_SECRET;
let server;
(async () => {
  process.env.APP_SESSION_SECRET = 'summary-integration-test-secret-at-least-32';
  const cookie = createSessionCookie({ mode: 'basic', username: 'boss', password: 'test-only', me: { name: 'boss' } }).split(';')[0];
  let many = false, pluginFail = false, fieldDenied = false, discoverCount = 2, typeFieldRequests = 0;
  const metadata = key => ({ key, fields: { summary: key, project: { key: 'EPU01' }, status: { name: 'Done' }, issuetype: { id: '5', name: 'Sub-task', subtask: true }, customfield_12345: { id: key === 'EPU01-1' ? '101' : '102', value: key === 'EPU01-1' ? 'Testing' : 'Supporting' } } });
  const log = (key, id, extra = {}) => ({ id: String(id), started: '2026-10-16T16:00:00.000+0700', timeSpentSeconds: 1800, author: { name: 'boss' }, comment: 'Test', ...extra });
  global.fetch = async (url, options = {}) => {
    const u = new URL(String(url)), body = options.body ? JSON.parse(options.body) : {};
    if (u.pathname === '/rest/api/2/field' && fieldDenied) return new Response('{}', {status:403});
    if (u.pathname === '/rest/api/2/field') return Response.json([{id:'issuetype',name:'Issue Type'},{id:'customfield_12345',name:'Sub-task Type',custom:true,schema:{type:'option'}}]);
    if (u.pathname.endsWith('/search')) {
      const jql = body.jql || u.searchParams.get('jql') || '';
      const start = Number(body.startAt || u.searchParams.get('startAt') || 0);
      if (jql.startsWith('key in')) {
        if (body.fields?.includes('customfield_12345')) typeFieldRequests++;
        const keys = [...jql.matchAll(/"(EPU01-\d+)"/g)].map(x => x[1]);
        const page = keys.slice(start, start + (many ? 100 : 1)).map(metadata);
        return Response.json({ issues: page, total: keys.length, startAt: start });
      }
      if (jql.includes('updated >= -1d')) return Response.json({ issues: [], total: 0 });
      return Response.json({ issues: Array.from({ length: Math.min(100, discoverCount - start) }, (_, i) => ({ key: `EPU01-${start + i + 1}` })), total: discoverCount, startAt: start });
    }
    const worklog = u.pathname.match(/\/issue\/(EPU01-\d+)\/worklog$/);
    if (worklog) {
      const start = Number(u.searchParams.get('startAt'));
      const logs = many ? [log(worklog[1], worklog[1].split('-')[1])] : [log(worklog[1], worklog[1] === 'EPU01-1' ? 1 : 4), log(worklog[1], worklog[1] === 'EPU01-1' ? 2 : 5, { author: { name: 'other' } }), log(worklog[1], worklog[1] === 'EPU01-1' ? 3 : 6, { started: '2026-10-15T19:00:00.000-0400' })];
      return Response.json({ worklogs: logs.slice(start, start + 1), total: logs.length, startAt: start, maxResults: 1 });
    }
    if (u.pathname.endsWith('/latest/worklog')) {
      if (pluginFail) return new Response('{}', { status: 403 });
      const id = u.searchParams.get('id');
      return Response.json({projects:[{issues:[{key:'EPU01-1',workLogs:[{id,workLogAttributes:[{attrTypeId:1,attrValue:id==='3'?'yes':'no'}]}]}]}]});
    }
    if (u.pathname.endsWith('/attr')) return Response.json([{ id: 1, name: 'Over Time?', type: 'BOOL', enabled: true }]);
    if (/\/rest\/com.deniz.jira.worklog\/1.0\/worklog\//.test(u.pathname)) {
      if (pluginFail) return new Response('{}', { status: 403 });
      return Response.json({ workLogAttributes: [{ attrTypeId: 1, attrValue: u.pathname.endsWith('/3') ? 'yes' : 'no' }] });
    }
    throw new Error(`Unexpected request ${u.pathname}`);
  };
  server = http.createServer((req, res) => { api(req, res).catch(e => { res.statusCode = 500; res.end(e.message); }); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api?action=worklog-history&date=2026-10-16&force=1`;
  async function get(params = '') { const r = await originalFetch(base + params, { headers: { cookie } }); return { status: r.status, data: await r.json() }; }
  let response = await get('&scope=summary');
  assert.equal(response.status, 200); assert.equal(response.data.items.length, 4, 'paginate even when server returns one worklog of requested 1000; filter author and use Vietnam date');
  assert(response.data.items.every(x => x.issueType === 'Sub-task' && x.issueTypeId === '5' && x.isSubtask));
  assert(typeFieldRequests>0, 'request the resolved custom field in Jira issue metadata');
  assert.equal(response.data.sourceDetails.subtaskTypeField.id, 'customfield_12345');
  assert.equal(response.data.items.find(x=>x.key==='EPU01-1').subtaskType, 'Testing');
  assert.equal(response.data.items.find(x=>x.key==='EPU01-2').subtaskType, 'Supporting');
  const groups = summary.aggregate(response.data.items,range).types;
  assert.deepEqual(groups.map(x=>x.name).sort(), ['Supporting','Testing']);
  assert(groups.every(x=>x.total===3600), 'sum worklog seconds, not sub-task count');
  assert(response.data.items.find(x => x.id === '3').overtime);
  pluginFail = true; response = await get('&scope=summary');
  assert.equal(response.data.sourceDetails.overtimeUnavailable, 4); assert(response.data.items.every(x => x.overtimeKnown === false));
  pluginFail = false; fieldDenied = true; response = await get('&scope=summary');
  assert.equal(response.data.items.length,4); assert.equal(response.data.sourceDetails.subtaskTypeUnavailable,4);
  assert.equal(response.data.sourceDetails.subtaskTypeField.ok,false);
  assert(response.data.items.every(x=>!x.subtaskTypeKnown));
  assert.deepEqual(summary.aggregate(response.data.items,range).types.map(x=>x.name),['Chưa xác định']);
  assert.equal(summary.aggregate(response.data.items,range).total,7200,'field failure must not drop hours');
  fieldDenied = false; many = true; discoverCount = 501;
  response = await get('&scope=summary'); assert.equal(response.data.items.length, 501); assert.equal(response.data.truncated, false);
  response = await get(); assert.equal(response.data.items.length, 500); assert.equal(response.data.truncated, true);
  // Limits are surfaced, never silently claimed as complete.
  discoverCount = 2001; response = await get('&scope=summary'); assert.equal(response.data.truncated, true);
  console.log('V1.13.0 API: issue and worklog pagination, timezone/author, true type metadata, native OT/unknown, >500 summary and explicit discovery limits passed.');
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => {
  global.fetch = originalFetch;
  if (secret === undefined) delete process.env.APP_SESSION_SECRET; else process.env.APP_SESSION_SECRET = secret;
  if (server) await new Promise(resolve => server.close(resolve));
});
