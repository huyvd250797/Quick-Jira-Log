'use strict';
const assert = require('node:assert/strict');
const http = require('node:http');
const jira = require('../lib/jira');
const original = { ...jira }, realFetch = global.fetch;
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const until = async predicate => { const end = Date.now() + 2000; while (!predicate()) { if (Date.now() > end) throw Error('Concurrency condition timed out'); await new Promise(r => setTimeout(r, 5)); } };
(async () => {
  // A slow request must not leave the other eleven worker slots idle.
  const first = deferred(), validation = deferred(), started = [];
  let active = 0, peak = 0;
  Object.assign(jira, {
    searchIssuesWorkedOnDate: async () => Array.from({ length: 24 }, (_, i) => `PERF-${i + 1}`),
    searchIssuesWithWorklogDate: async () => [], searchRecentlyWorkedIssues: async () => [], searchRecentlyUpdatedIssues: async () => [],
    getRecentlyChangedWorklogs: async () => ({ supported: false, worklogs: [] }),
    getIssueWorklogs: async key => {
      started.push(key); active++; peak = Math.max(peak, active);
      if (key === 'PERF-1') await first.promise;
      else await new Promise(r => setTimeout(r, 4));
      active--; return [];
    }
  });
  delete require.cache[require.resolve('../lib/worklog-guard')];
  const guard = require('../lib/worklog-guard');
  const job = guard.loadOccupiedRanges('2026-10-12', ['PERF-1'], { name: 'boss' }, { username: 'boss' }, { beforeRead: validation.promise });
  await new Promise(r => setTimeout(r, 15)); assert.equal(started.length, 0, 'No authoritative reads before task validation');
  validation.resolve(); await until(() => started.includes('PERF-24'));
  assert(peak <= 12); assert(active > 0, 'Slow first request is still pending while later work starts');
  first.resolve(); const result = await job; assert.equal(result.issueKeys.length, 24); assert.equal(started.length, 24);
  Object.assign(jira, original);

  // Batch metadata reads overlap at most three chunks; pagination stays ordered
  // inside each chunk, even if Jira caps pages below the requested page size.
  const release = deferred(), batches = new Set(); let reads = 0, maxReads = 0;
  global.fetch = async (url, options = {}) => {
    const u = new URL(url), body = options.body ? JSON.parse(options.body) : Object.fromEntries(u.searchParams);
    assert.equal(options.headers.Authorization, 'Basic ' + Buffer.from('boss:fixture').toString('base64'));
    const keys = [...body.jql.matchAll(/"(PERF-\d+)"/g)].map(m => m[1]);
    batches.add(keys[0]); reads++; maxReads = Math.max(maxReads, reads);
    if (keys[0] === 'PERF-1' && Number(body.startAt) === 0) await release.promise;
    else await new Promise(r => setTimeout(r, 3));
    reads--; const start = Number(body.startAt), page = keys.slice(start, start + 20);
    assert(body.fields.includes('customfield_123'));
    return Response.json({ total: keys.length, startAt: start, issues: page.map(key => ({ key, fields: { summary: key } })) });
  };
  const keys = Array.from({ length: 350 }, (_, i) => `PERF-${i + 1}`);
  const batchJob = jira.getIssuesByKeys([...keys, 'perf-1'], { mode: 'basic', username: 'boss', password: 'fixture' }, { extraFields: ['customfield_123'] });
  await until(() => batches.has('PERF-301')); assert(maxReads <= 3); release.resolve();
  assert.deepEqual((await batchJob).map(i => i.key), keys);
  global.fetch = async () => Response.json({}, { status: 401 });
  await assert.rejects(jira.getIssuesByKeys(['PERF-1'], {}), e => e.status === 401);
  global.fetch = realFetch;

  // Exercise the actual single and Bulk handlers. Discovery starts while issue
  // metadata is pending, but worklog reads and writes wait for validation.
  let metadata, discovered, worklogReads, writes, wrongProject = false;
  Object.assign(jira, {
    searchIssuesWorkedOnDate: async () => { discovered = true; return ['PERF-1']; },
    searchIssuesWithWorklogDate: async () => [], searchRecentlyWorkedIssues: async () => [], searchRecentlyUpdatedIssues: async () => [],
    getRecentlyChangedWorklogs: async () => ({ supported: false, worklogs: [] }),
    getIssueWorklogs: async () => { worklogReads++; return []; },
    getIssue: async key => { await metadata.promise; return { key, fields: { project: { key: wrongProject ? 'OTHER' : 'PERF' }, summary: 'Fixture task' } }; },
    getIssuesByKeys: async keys => Promise.all(keys.map(key => jira.getIssue(key))),
    createWorklog: async () => { assert(worklogReads > 0); writes++; return { id: '123' }; },
    transitionIssueToDone: async () => ({ ok: true, status: 'Done' })
  });
  delete require.cache[require.resolve('../lib/worklog-guard')];
  const single = require('../handlers/worklog'), bulk = require('../handlers/bulk-worklog');
  const oldSecret = process.env.APP_SESSION_SECRET; process.env.APP_SESSION_SECRET = 'performance-test-session-secret-at-least-32';
  const { createSessionCookie } = require('../lib/session');
  const cookie = createSessionCookie({ mode: 'basic', username: 'boss', password: 'fixture', me: { name: 'boss', key: 'BOSS' } }).split(';')[0];
  const server = http.createServer((req, res) => (req.url.startsWith('/bulk') ? bulk : single)(req, res));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  try {
    for (const mode of ['single', 'bulk']) for (const bad of [false, true]) {
      metadata = deferred(); discovered = false; worklogReads = 0; writes = 0; wrongProject = bad;
      const item = { key: 'PERF-1', project: 'PERF', timeSpent: '30m', description: 'Fixture', overtime: false };
      const body = mode === 'bulk' ? { date: '2026-10-12', items: [item] } : { ...item, date: '2026-10-12' };
      const request = realFetch(`http://127.0.0.1:${server.address().port}/${mode}`, { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      await until(() => discovered); assert.equal(worklogReads, 0); assert.equal(writes, 0);
      metadata.resolve(); const response = await request, data = await response.json();
      assert.equal(response.status, bad ? 400 : 200, JSON.stringify(data)); assert.equal(writes, bad ? 0 : 1);
      if (bad) assert.equal(worklogReads, 0);
    }
  } finally { await new Promise(r => server.close(r)); if (oldSecret == null) delete process.env.APP_SESSION_SECRET; else process.env.APP_SESSION_SECRET = oldSecret; }
  console.log('Performance: continuous 12-worker guard, validation barrier, bounded 3-batch metadata with full pagination, single/Bulk overlap and zero writes on invalid project passed.');
})().finally(() => { Object.assign(jira, original); global.fetch = realFetch; }).catch(e => { console.error(e); process.exitCode = 1; });
