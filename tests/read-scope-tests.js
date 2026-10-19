'use strict';
const assert = require('node:assert/strict');
const { jiraFetch, getIssuesByKeys } = require('../lib/jira');
const { withJiraReadScope, currentJiraReadScope } = require('../lib/jira-read-scope');
const realFetch = global.fetch;
const wait = ms => new Promise(r => setTimeout(r, ms));
const deferred = () => { let resolve; return { promise: new Promise(r => { resolve = r; }), get resolve() { return resolve; } }; };
const auth = { mode: 'basic', username: 'boss', password: 'fixture-only' };
(async () => {
  let calls = 0;
  global.fetch = async () => { calls++; await wait(10); return Response.json({ item: { hours: 1 } }); };
  await withJiraReadScope(async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => jiraFetch('/rest/api/2/issue/READ-1/worklog', {}, auth)));
    assert.equal(calls, 1); results[0].data.item.hours = 99; assert.equal(results[1].data.item.hours, 1, 'Consumers receive independent JSON');
    await jiraFetch('/rest/api/2/issue/READ-1/worklog', {}, auth);
    assert.equal(calls, 2, 'Completed values must never be reused');
    assert.equal(currentJiraReadScope().pending.size, 0);
  });
  calls = 0;
  await Promise.all([withJiraReadScope(() => jiraFetch('/same', {}, auth)), withJiraReadScope(() => jiraFetch('/same', {}, auth))]);
  assert.equal(calls, 2, 'Separate API requests stay isolated');
  calls = 0;
  await withJiraReadScope(() => Promise.all([
    jiraFetch('/same', {}, auth), jiraFetch('/same', {}, { ...auth, password: 'different' }),
    jiraFetch('/same', { timeoutMs: 9000 }, auth), jiraFetch('/same', { headers: { 'X-Test': 'other' } }, auth)
  ])); assert.equal(calls, 4, 'Different credentials, timeout and headers never share');

  // A read-back must not join the old GET even while it is still pending.
  const oldRead = deferred(); let gets = 0, writes = 0;
  global.fetch = async (url, options) => {
    if (options.method === 'GET') { gets++; if (gets === 1) { await oldRead.promise; return Response.json({ version: 'before' }); } return Response.json({ version: 'after' }); }
    writes++; return Response.json({ id: '123' });
  };
  await withJiraReadScope(async () => {
    const before = jiraFetch('/same', {}, auth);
    await Promise.all([jiraFetch('/worklog', { method: 'POST', body: { value: 1 } }, auth), jiraFetch('/worklog', { method: 'POST', body: { value: 1 } }, auth)]);
    const after = await jiraFetch('/same', {}, auth); assert.equal(after.data.version, 'after');
    oldRead.resolve(); assert.equal((await before).data.version, 'before'); assert.equal(gets, 2); assert.equal(writes, 2, 'Writes are never coalesced');
  });
  calls = 0;
  global.fetch = async () => { calls++; await wait(5); return Response.json({}, { status: calls === 1 ? 401 : 200 }); };
  await withJiraReadScope(async () => {
    const pair = await Promise.all([jiraFetch('/auth', {}, auth), jiraFetch('/auth', {}, auth)]);
    assert(pair.every(x => x.response.status === 401)); assert.equal(calls, 1);
    assert.equal((await jiraFetch('/auth', {}, auth)).response.status, 200); assert.equal(calls, 2, 'Failures are not retained');
  });
  let methods = [], revision = 0, getDenied = false;
  global.fetch = async (url, options) => {
    methods.push(options.method);
    const body = options.body ? JSON.parse(options.body) : Object.fromEntries(new URL(url).searchParams);
    if (options.method === 'POST' && !getDenied) return Response.json({}, { status: 403 });
    if (options.method === 'GET' && getDenied) return Response.json({}, { status: 403 });
    const key = /READ-\d+/.exec(body.jql)[0]; return Response.json({ total: 1, issues: [{ key, fields: { revision: ++revision } }] });
  };
  await withJiraReadScope(async () => {
    const first = await getIssuesByKeys(['READ-1'], auth), second = await getIssuesByKeys(['READ-2'], auth);
    assert.deepEqual(methods, ['POST', 'GET', 'GET']); assert.equal(first[0].fields.revision, 1); assert.equal(second[0].fields.revision, 2);
    getDenied = true; await getIssuesByKeys(['READ-3'], auth); await getIssuesByKeys(['READ-4'], auth);
    assert.deepEqual(methods.slice(3), ['GET', 'POST', 'POST'], 'A failed preferred method can fall back and recover');
  });
  methods = []; getDenied = false;
  await withJiraReadScope(() => getIssuesByKeys(['READ-5'], auth));
  assert.deepEqual(methods, ['POST', 'GET'], 'Method hints do not cross API requests');
  // Actual API dispatcher: five fresh Jira pages need only one rejected POST
  // probe, and the next API operation still sees changed Jira data.
  const http = require('node:http'), api = require('../api');
  const oldSecret = process.env.APP_SESSION_SECRET;
  process.env.APP_SESSION_SECRET = 'read-scope-integration-secret-at-least-32';
  const { createSessionCookie } = require('../lib/session');
  const cookie = createSessionCookie({ ...auth, me: { name: 'boss', key: 'BOSS' } }).split(';')[0];
  let requests = [], dataRevision = 1;
  global.fetch = async (url, options) => {
    assert(options.headers.Authorization); requests.push(options.method);
    if (options.method === 'POST') return Response.json({}, { status: 403 });
    const p = new URL(url).searchParams, start = Number(p.get('startAt'));
    return Response.json({ total: 500, issues: Array.from({ length: 100 }, (_, i) => ({ key: `READ-${start+i+1}`, fields: { summary: `Revision ${dataRevision}`, project: { key: 'READ' } } })) });
  };
  const server = http.createServer(api); await new Promise(r => server.listen(0, '127.0.0.1', r));
  try {
    for (const revision of [1, 2]) {
      requests = []; dataRevision = revision;
      const response = await realFetch(`http://127.0.0.1:${server.address().port}/api?action=subtasks`, { headers: { cookie } });
      const data = await response.json(); assert.equal(response.status, 200); assert.equal(data.issues.length, 500);
      assert.equal(data.issues[0].summary, `Revision ${revision}`);
      assert.deepEqual(requests, ['POST', 'GET', 'GET', 'GET', 'GET', 'GET']);
    }
  } finally { await new Promise(r => server.close(r)); if (oldSecret == null) delete process.env.APP_SESSION_SECRET; else process.env.APP_SESSION_SECRET = oldSecret; }
  console.log('Read scope: concurrent-only reuse, independent payloads, auth/request isolation, fresh reads after writes, no coalesced mutations/failure cache and safe search-method fallback passed.');
})().finally(() => { global.fetch = realFetch; }).catch(e => { console.error(e); process.exitCode = 1; });
