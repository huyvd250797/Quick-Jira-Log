'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),api=require('../api'),{createSessionCookie}=require('../lib/session');
const fixture=require('./fixtures/native-form');
const originalFetch=global.fetch,oldSecret=process.env.APP_SESSION_SECRET;let server;
(async()=>{
 process.env.APP_SESSION_SECRET='creation-native-form-test-at-least-32-characters';
 const me={name:'create-user',key:'USER1'},cookie=createSessionCookie({mode:'basic',username:me.name,password:'test-only',me}).split(';')[0];
 let id=100,mode='',logs=[],records={},formWrites=0,coreWrites=0,calls=[];
 const issue=key=>({key,fields:{project:{key:'EDIT'},summary:'Native OT creation',status:{name:'Done',statusCategory:{key:'done'}}}});
 const add=(key,started,seconds)=>{const n=String(++id),w={id:n,key,author:me,started,timeSpentSeconds:seconds,comment:'OT description & unicode tiếng Việt'};logs.push(w);records[n]={id:Number(n),issueKey:key,workStart:Date.parse(started),timeSpent:seconds,authorUserKey:me.key,comment:w.comment,canEdit:true,workLogAttributes:[{attrTypeId:1,attrValue:'no'},{attrTypeId:9,attrValue:'CUSTOM'}]};return w;};
 global.fetch=async(url,options={})=>{
  const u=new URL(String(url)),method=options.method||'GET',body=options.body?(u.pathname===fixture.action?Object.fromEntries(new URLSearchParams(options.body)):JSON.parse(options.body)):{};calls.push({path:u.pathname,method});
  if(u.pathname.endsWith('/search'))return Response.json({issues:[...new Set(['EDIT-1','EDIT-2',...logs.map(w=>w.key)])].map(issue),total:2});
  if(u.pathname.endsWith('/worklog/updated'))return new Response('{}',{status:404});
  const core=u.pathname.match(/\/issue\/(EDIT-\d+)\/worklog(?:\/(\d+))?$/);
  if(core){const key=core[1],wid=core[2];if(method==='DELETE'){if(mode==='rollback-denied')return Response.json({}, {status:403});logs=logs.filter(w=>w.id!==wid);delete records[wid];return new Response(null,{status:204});}
   if(method==='POST'){coreWrites++;const w=add(key,body.started,body.timeSpentSeconds);w.comment=body.comment;records[w.id].comment=body.comment;return Response.json(w);}
   return Response.json({worklogs:logs.filter(w=>w.key===key),total:logs.filter(w=>w.key===key).length});}
  if(/\/issue\/EDIT-\d+$/.test(u.pathname))return Response.json(issue(u.pathname.split('/').at(-1)));
  if(u.pathname.endsWith('/1.0/attr'))return Response.json([{id:1,name:'Over Time?',type:'BOOL',enabled:true}]);
  if(u.pathname.endsWith('/latest/worklog')){const rec=records[u.searchParams.get('id')];return Response.json({projects:[{issues:[{key:rec?.issueKey,workLogs:rec?[rec]:[]}]}]});}
  if(/^\/browse\/EDIT-\d+$/.test(u.pathname))return new Response(fixture.bootstrap,{headers:{'set-cookie':'issueRoute=one; Path=/'}});
  if(u.pathname===fixture.action&&method==='GET')return Response.json({}, {status:403});
  if(u.pathname===fixture.action||u.pathname===fixture.openAction){const wid=method==='POST'?body.worklogId:u.searchParams.get('worklogId'),rec=records[wid];
   if(method==='GET'){assert.equal(u.searchParams.get('atl_token'),'issue-page-token');return new Response(fixture.render(rec.issueKey,rec),{headers:{'set-cookie':'xsrf=fresh; Path=/'}});}
   formWrites++;assert.equal(u.searchParams.get('atl_token'),'fresh-xsrf-token');assert.equal(body.wa_1,'on');assert.equal(body.adjustEstimate,'leave');assert.equal(body.wa_9,'CUSTOM');
   if(['denied','rollback-denied'].includes(mode))return Response.json({}, {status:403});
   const value=fixture.values(new URLSearchParams(options.body),rec);Object.assign(rec,value,{workStart:Date.parse(value.workStart)});
   if(mode==='ignored')rec.workLogAttributes[0].attrValue='no';
   return new Response('<div>Saved</div>');}
  throw Error('Unexpected '+method+' '+u.pathname);
 };
 server=http.createServer((req,res)=>api(req,res).catch(e=>{res.statusCode=500;res.end(JSON.stringify({error:e.message}));}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const body={key:'EDIT-1',project:'EDIT',date:'2026-10-16',timeSpent:'1h',description:'OT description & unicode tiếng Việt'};
 const post=async(action,payload)=>{const r=await originalFetch(`http://127.0.0.1:${server.address().port}/api?action=${action}`,{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify(payload)});return {status:r.status,data:await r.json()};};
 // Normal creation remains independent of plugin writes.
 let r=await post('worklog',body);assert.equal(r.status,200,JSON.stringify(r));assert.equal(formWrites,0);logs=[];records={};
 add('EDIT-1','2026-10-16T08:00:00.000+0700',4*3600);add('EDIT-1','2026-10-16T13:30:00.000+0700',4*3600);
 const existing=structuredClone(logs);let before=coreWrites;
 r=await post('worklog',body);assert.equal(r.status,409);assert.equal(coreWrites,before,'regular work still capped at 8h');
 r=await post('worklog',{...body,overtime:true,timeSpent:'2h',requestId:'ot-create-unique-001'});assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.data.overtimeVerified,true);assert.equal(r.data.segments[0].start,'17:30');assert.equal(logs.at(-1).timeSpentSeconds,7200);assert.equal(records[logs.at(-1).id].workLogAttributes[0].attrValue,'yes');
 const count=logs.length;r=await post('worklog',{...body,overtime:true,timeSpent:'2h',requestId:'ot-create-unique-001'});assert.equal(r.status,200);assert.equal(logs.length,count,'retry of successful request does not duplicate creation');
 r=await post('bulk-worklog',{date:body.date,items:[{...body,overtime:true,timeSpent:'30m'},{...body,key:'EDIT-2',overtime:true,timeSpent:'30m'}]});assert.equal(r.status,200,JSON.stringify(r));assert.deepEqual(r.data.items.map(x=>x.segments[0].start),['19:30','20:00']);assert(r.data.items.every(x=>x.overtimeVerified));
 r=await post('worklog',{...body,overtime:true,overtimeStart:'22:00'});assert.equal(r.status,200);assert.equal(r.data.segments[0].start,'22:00');
 before=coreWrites;r=await post('worklog',{...body,overtime:true,overtimeStart:'25:00'});assert.equal(r.status,400);assert.equal(coreWrites,before);
 r=await post('worklog',{...body,overtime:true,timeSpent:'8h'});assert.equal(r.status,409);assert.equal(coreWrites,before,'insufficient evening space is rejected before write');
 // A failed OT sync cannot leave an unmarked log silently or delete existing records.
 for(const failure of ['denied','ignored']){mode=failure;const snapshot=structuredClone(logs);r=await post('worklog',{...body,overtime:true,timeSpent:'15m'});assert.notEqual(r.status,200);assert.deepEqual(logs,snapshot,'new worklog rolled back after failed OT sync');}
 mode='';assert.deepEqual(logs.slice(0,2),existing);
 // Mixed regular + OT rows use separate windows and retain the selected type.
 r=await post('bulk-worklog',{date:'2026-10-19',items:[{...body,timeSpent:'1h',overtime:false},{...body,key:'EDIT-2',timeSpent:'1h',overtime:true}]});assert.equal(r.status,200,JSON.stringify(r));assert.deepEqual(r.data.items.map(x=>x.segments[0].start),['08:00','17:30']);
 r=await post('worklog',{...body,date:'2026-10-17',overtime:true,timeSpent:'30m'});assert.equal(r.status,200);assert.equal(r.data.segments[0].start,'08:00','weekend OT uses configured daytime windows');
 mode='rollback-denied';r=await post('worklog',{...body,overtime:true,timeSpent:'15m'});assert.equal(r.status,502);assert.equal(r.data.details.resultUnknown,true);assert.equal(r.data.details.remainingWorklogIds.length,1);
 assert(!calls.some(p=>/editmeta|\/field$/.test(p.path)));assert(!calls.some(p=>p.path.includes('/com.deniz.')&&p.method==='PUT'));
 console.log('V1.12.1 single/bulk OT: full-day + overtime, mixed rows, start hint, overlap/windows, native checkbox readback, idempotency, rollback and incomplete rollback passed');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{global.fetch=originalFetch;if(oldSecret==null)delete process.env.APP_SESSION_SECRET;else process.env.APP_SESSION_SECRET=oldSecret;if(server)await new Promise(r=>server.close(r));});
