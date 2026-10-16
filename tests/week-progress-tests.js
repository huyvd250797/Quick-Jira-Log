'use strict';
const assert = require('node:assert/strict');
const http = require('node:http');
const ui = require('../lib/ui-tools');

assert.deepEqual(ui.weekRange('2026-11-01').days, ['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01']);
assert.equal(ui.weekRange('2027-01-01').start, '2026-12-28');
assert.equal(ui.exactDuration(90), '1h 30m');
assert.equal(ui.exactDuration(0), '0h 0m');
const totals = ui.workSummary([{ date:'2026-10-16', minutes:450 }, { date:'2026-10-12', minutes:480 }, { date:'2026-10-17', minutes:120 }, { date:'2026-10-09', minutes:1000 }], '2026-10-16');
assert.equal(totals.daily, 450); assert.equal(totals.dayRemaining, 30);
assert.equal(totals.weekly, 930); assert.equal(totals.weekRemaining, 1470); assert.equal(totals.weekend, 120);
assert.equal(ui.workSummary([], '2026-10-17').dayTarget, 0);
assert.equal(ui.workSummary([{ date:'2026-10-16', minutes:510 }], '2026-10-16').dayRemaining, 0);
const events = ui.timedLayout([{ id:'a', start:'08:00', minutes:60 }, { id:'b', start:'08:30', minutes:120 }, { id:'c', start:'11:00', minutes:30 }]);
assert.equal(events[0].end - events[0].start, 60);
assert.equal(events[1].end - events[1].start, 120);
assert.equal(events[0].lanes, 2); assert.equal(events[1].lanes, 2);
assert.notEqual(events[0].lane, events[1].lane); assert.equal(events[2].lanes, 1);
console.log('V1.10.0 week boundaries, dashboard targets and timed block layout tests passed.');

const api = require('../api');
const { createSessionCookie } = require('../lib/session');
const originalFetch = global.fetch;
const originalSecret = process.env.APP_SESSION_SECRET;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let server;
(async () => {
  process.env.APP_SESSION_SECRET = 'progress-integration-test-secret-at-least-32';
  const cookie = createSessionCookie({ mode:'basic', username:'progress-user', password:'test-only', me:{ name:'progress-user' } }).split(';')[0];
  const logs = new Map(); let created = 0;
  const metadata = key => ({ key, fields:{ project:{key:'TEST'}, summary:'Progress test', status:{name:'Done',statusCategory:{key:'done'}} } });
  global.fetch = async (url, options = {}) => {
    const target = new URL(String(url)); const method = options.method || 'GET'; const body = options.body ? JSON.parse(options.body) : {};
    if (target.pathname.endsWith('/search')) {
      const keys = body.jql?.startsWith('key in') ? [...body.jql.matchAll(/"(TEST-\d+)"/g)].map(x=>x[1]) : [];
      return Response.json({ issues:keys.map(metadata), total:keys.length });
    }
    if (target.pathname.endsWith('/worklog/updated')) return new Response('{}',{status:404});
    const match = target.pathname.match(/\/issue\/(TEST-\d+)\/worklog$/);
    if (match) {
      const key = match[1];
      if (method === 'POST') {
        await delay(60); created += 1;
        const entry = { id:String(created), started:body.started, timeSpentSeconds:body.timeSpentSeconds, comment:body.comment, author:{name:'progress-user'} };
        logs.set(key,[...(logs.get(key)||[]),entry]); return Response.json(entry);
      }
      return Response.json({ worklogs:logs.get(key)||[], total:(logs.get(key)||[]).length });
    }
    const issue = target.pathname.match(/\/issue\/(TEST-\d+)$/);
    if (issue) { await delay(20); return Response.json(metadata(issue[1])); }
    throw new Error(`Unexpected Jira request ${method} ${target.pathname}`);
  };
  server = http.createServer((req,res) => { api(req,res).catch(error => { if (!res.headersSent) res.statusCode=500;res.end(JSON.stringify({error:error.message})); }); });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function post(action, body, stream=true) {
    const response = await originalFetch(`${base}?action=${action}`, { method:'POST', headers:{cookie, 'content-type':'application/json', ...(stream?{accept:'application/x-ndjson'}:{})}, body:JSON.stringify(body) });
    if (!stream) return { response, data:await response.json() };
    assert(response.headers.get('content-type').includes('application/x-ndjson'));
    const reader=response.body.getReader(); const decoder=new TextDecoder(); let text='',chunks=0;
    while (true) { const next=await reader.read(); if(next.done)break;chunks++;text+=decoder.decode(next.value,{stream:true}); }
    text+=decoder.decode();
    return { events:text.trim().split('\n').map(line=>JSON.parse(line)),chunks };
  }
  const payload={key:'TEST-1',project:'TEST',date:'2026-10-12',timeSpent:'1h',description:'Test work',requestId:'progress-test-0001'};
  const first=await post('worklog',payload);
  const percentages=first.events.filter(e=>e.type==='progress').map(e=>e.percent);
  assert(percentages.length >= 5); assert(percentages.every((p,i)=>i===0||p>=percentages[i-1]));
  assert.equal(percentages.at(-1),100); assert(first.chunks>1,'server must send progress before the final result');
  assert.equal(first.events.at(-1).data.ok,true); assert.equal(first.events.at(-1).status,200);
  const replay=await post('worklog',payload); assert.equal(created,1); assert.equal(replay.events.at(-1).data.replayed,true);
  const bulk=await post('bulk-worklog',{date:'2026-10-12',requestId:'progress-test-bulk1',items:[{...payload,key:'TEST-2'},{...payload,key:'TEST-3'}]});
  assert.equal(bulk.events.at(-1).data.items.length,2); assert(bulk.events.some(e=>String(e.phase).includes('2/2')));
  const invalid=await post('worklog',{...payload,requestId:'progress-test-invalid',timeSpent:'wrong'});
  assert.equal(invalid.events.at(-1).status,400); assert(!invalid.events.some(e=>e.type==='progress'&&e.percent===100),'failure cannot show 100%');
  const legacy=await post('worklog',{...payload,requestId:'progress-test-legacy',key:'TEST-4'},false);
  assert.equal(legacy.response.status,200); assert.equal(legacy.data.ok,true,'JSON callers remain supported');
  console.log('V1.10.0 real HTTP streaming single/Bulk, failure, idempotent replay and JSON compatibility tests passed.');
})().catch(error=>{ console.error(error);process.exitCode=1; }).finally(async()=>{
  global.fetch=originalFetch;
  if(originalSecret===undefined)delete process.env.APP_SESSION_SECRET;else process.env.APP_SESSION_SECRET=originalSecret;
  if(server)await new Promise(resolve=>server.close(resolve));
});
