'use strict';
const assert=require('node:assert/strict'),http=require('node:http');
const D=require('../lib/calendar-drafts'),{schedule}=require('../lib/calendar-moves');
const api=require('../api'),{createSessionCookie}=require('../lib/session');
const fixture=require('./fixtures/native-form');
const item=(id,start='08:00',seconds=3600,date='2026-10-16')=>({key:'CAL-1',id:String(id),date,start,started:`${date}T${start}:00.000+0700`,timeSpentSeconds:seconds,minutes:seconds/60,end:D.minute(start)+seconds/60,description:'Exact description',overtime:true});
const a=item(1),b=item(2,'10:00');
let proposed=D.resize(a,570,[a,b]);assert.equal(proposed.problem,'');assert.equal(proposed.changes[0].timeSpentSeconds,5400);assert.equal(proposed.changes[0].end,'09:30');assert.equal(a.timeSpentSeconds,3600);assert.equal(proposed.changes[0].overtime,true);
assert.equal(D.resize(a,510,[a,b]).changes[0].timeSpentSeconds,1800);
assert(D.resize(a,480,[a,b]).problem);assert(D.resize(a,490,[a,b]).problem);
assert(D.resize(a,630,[a,b]).problem);assert.equal(D.resize(a,630,[a,b]).swap,undefined);
assert(D.resize(item(3,'11:00'),750,[]).problem);assert(D.resize(item(4,'17:30'),1200,[]).problem==='');
assert(D.resize(item(5,'17:30',1800,'2026-10-17'),1140,[]).problem);assert(D.resize(item(6,'17:30'),1440,[]).problem);
assert.equal(D.resize(item(7,'08:15'),540,[]).changes[0].timeSpentSeconds,2700);
const odd={...a,started:'2026-10-16T08:00:30.000+0700'};
assert.equal(D.preview(odd,{date:a.date,start:a.start,targetSeconds:5400}).started,odd.started);assert(D.resize(odd,570,[]).problem);
const target={date:a.date,start:a.start,targetSeconds:5400},drafts=new Map([[D.key(a),{original:a,target}]]);
assert.equal(D.project([a],drafts)[0].minutes,90);assert.equal(a.minutes,60);
const resizeThenSwap=D.drop(D.preview(a,target),{date:a.date,start:'10:00'},[D.preview(a,target),b],b);
assert.equal(resizeThenSwap.problem,'');assert.equal(D.seconds(resizeThenSwap.changes[0]),5400);assert.equal(D.seconds(resizeThenSwap.changes[1]),3600,'swap does not copy partner duration');
const contiguous=item(2,'09:00');
const chain=new Map([[D.key(a),{original:a,target:{date:a.date,start:'08:00',targetSeconds:5400}}],[D.key(contiguous),{original:contiguous,target:{date:a.date,start:'09:30',targetSeconds:1800}}]]);
assert.deepEqual(D.plan(chain,[a,contiguous]).map(x=>x.original.id),['2','1'],'shrink/move frees room before extension');
const steps=schedule([a,b],[D.preview(a,{date:a.date,start:'10:00',targetSeconds:5400}),D.preview(b,{date:a.date,start:'08:00',targetSeconds:1800})],[]);
assert.equal(steps.length,3);assert.equal(steps.filter(x=>x.temporary).length,1);
console.log('Resize planner: bounds/windows, no implicit swap, duration-aware preview/moves/dependencies and exact start snapshot passed.');

const oldFetch=global.fetch,oldSecret=process.env.APP_SESSION_SECRET;let server;
(async()=>{
 process.env.APP_SESSION_SECRET='calendar-resize-integration-secret-at-least-32';
 const me={key:'RESIZE1',name:'resize-user'},cookie=createSessionCookie({mode:'basic',username:me.name,password:'fixture',me}).split(';')[0];
 let logs=[],records={},writes=[],forms=0,mode='';
 const add=(id,start='08:00',seconds=3600,date='2026-10-16')=>{
  const w={id:String(id),key:'CAL-1',started:`${date}T${start}:00.000+0700`,timeSpentSeconds:seconds,author:me,comment:'Exact Jira comment\n[Quick Jira Log: Overtime]'};
  logs.push(w);records[w.id]={id:Number(id),issueKey:w.key,authorUserKey:me.key,workStart:Date.parse(w.started),timeSpent:seconds,comment:w.comment,workLogAttributes:[{attrTypeId:1,attrValue:'yes'},{attrTypeId:9,attrValue:'KEEP'}]};return w;
 };
 const reset=()=>{logs=[];records={};writes=[];forms=0;mode='';return add(1);};let w=reset();
 global.fetch=async(url,options={})=>{
  const u=new URL(String(url)),method=options.method||'GET';
  if(u.pathname.endsWith('/search'))return Response.json({issues:[{key:'CAL-1'}],total:1});
  if(u.pathname.endsWith('/worklog/updated'))return Response.json({}, {status:404});
  const match=u.pathname.match(/\/issue\/CAL-1\/worklog(?:\/(\d+))?$/);
  if(match){const raw=logs.find(x=>x.id===match[1]);
   if(method==='PUT'){
    const body=JSON.parse(options.body);writes.push(body);assert.equal(u.searchParams.get('adjustEstimate'),'leave');
    if(mode==='denied')return Response.json({}, {status:403});
    if(mode==='third-fails'&&writes.length===3)return Response.json({}, {status:422});
    if(mode!=='ignored'){
     const next={...raw,started:body.started,timeSpentSeconds:body.timeSpentSeconds};
     const parse=x=>({...x,date:x.started.slice(0,10),start:x.started.slice(11,16)});
     assert(!logs.some(x=>x.id!==raw.id&&D.overlaps(parse(x),parse(next))),'no transient overlap');
     Object.assign(raw,next,{comment:body.comment});Object.assign(records[raw.id],{workStart:Date.parse(raw.started),timeSpent:raw.timeSpentSeconds,comment:raw.comment});
    }
    if(mode==='lost'||(mode==='third-lost'&&writes.length===3))throw new Error('Lost response after commit');
    return Response.json(raw);
   }
   return Response.json(match[1]?raw:{worklogs:logs,total:logs.length});
  }
  if(u.pathname.endsWith('/1.0/attr'))return Response.json([{id:1,name:'Over Time?',type:'BOOL',enabled:true}]);
  if(u.pathname.endsWith('/latest/worklog'))return Response.json({projects:[{issues:[{key:'CAL-1',workLogs:[records[u.searchParams.get('id')]]}]}]});
  if(u.pathname==='/browse/CAL-1')return new Response(fixture.bootstrap);
  if(u.pathname===fixture.openAction)return new Response(fixture.render('CAL-1',records[u.searchParams.get('worklogId')]));
  if(u.pathname===fixture.action&&method==='POST'){
   forms++;const fields=new URLSearchParams(options.body),rec=records[fields.get('worklogId')],values=fixture.values(fields,rec);
   values.timeSpent=Number(fields.get('timeLogged').slice(0,-1))*60;
   Object.assign(rec,values,{workStart:Date.parse(values.workStart)});
   Object.assign(logs.find(x=>x.id===String(rec.id)),{started:values.workStart,timeSpentSeconds:values.timeSpent,comment:values.comment});
   assert.equal(fields.get('adjustEstimate'),'leave');return new Response('<div>Saved</div>');
  }
  throw new Error('Unexpected '+method+' '+u.pathname);
 };
 server=http.createServer((req,res)=>api(req,res).catch(e=>{res.statusCode=500;res.end(JSON.stringify({error:e.message}));}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const call=async(action,body,headers={})=>{const r=await oldFetch(`http://127.0.0.1:${server.address().port}/api?action=${action}`,{method:action==='calendar-moves'?'POST':'PATCH',headers:{cookie,'content-type':'application/json',...headers},body:JSON.stringify(body)});return{status:r.status,data:await r.json()};};
 const payload=(extra={})=>({key:w.key,worklogId:w.id,calendarEdit:true,targetSeconds:5400,date:w.started.slice(0,10),start:w.started.slice(11,16),expectedStarted:w.started,expectedSeconds:w.timeSpentSeconds,...extra});
 let r=await call('worklog-correction',payload({description:'Do not replace',overtime:false,updateOvertime:true}));
 assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.data.resized,true);assert.equal(r.data.worklogVerified,true);assert.equal(w.timeSpentSeconds,5400);assert.equal(w.started,'2026-10-16T08:00:00.000+0700');assert.equal(w.comment,'Exact Jira comment\n[Quick Jira Log: Overtime]');assert.equal(records[w.id].workLogAttributes[0].attrValue,'yes');
 r=await call('worklog-correction',payload({targetSeconds:1800}));assert.equal(r.status,200);assert.equal(w.timeSpentSeconds,1800);
 let before=writes.length;
 for(const targetSeconds of [0,-1,57601,1.5,'5400',null]){r=await call('worklog-correction',payload({targetSeconds}));assert.equal(r.status,400);}
 r=await call('worklog-correction',payload({expectedStarted:undefined}));assert.equal(r.status,400);
 r=await call('worklog-correction',payload({expectedSeconds:3600}));assert.equal(r.status,409);assert.equal(r.data.code,'WORKLOG_STALE');
 r=await call('worklog-correction',payload({moveOnly:true}));assert.equal(r.status,400);assert.equal(writes.length,before);
 add(2,'09:00');r=await call('worklog-correction',payload({targetSeconds:7200}));assert.equal(r.status,409);assert.equal(writes.length,before);
 r=await call('worklog-correction',payload({start:'11:30',targetSeconds:3600}));assert.equal(r.status,409);assert.equal(writes.length,before);
 r=await call('worklog-correction',payload({date:'2026-10-17',start:'17:30'}));assert.equal(r.status,409);assert.equal(writes.length,before);
 r=await call('worklog-correction',payload(),{cookie:''});assert.equal(r.status,401);
 r=await call('worklog-correction',payload(),{origin:'https://wrong.example',host:'localhost'});assert.equal(r.status,403);
 w.author={name:'other'};r=await call('worklog-correction',payload());assert.equal(r.status,403);w.author=me;assert.equal(writes.length,before);
 w=reset();w.started='2026-10-16T08:00:30.000+0700';r=await call('worklog-correction',payload());assert.equal(r.status,409);assert.equal(r.data.code,'WORKLOG_START_PRECISION');assert.equal(writes.length,0);
 w=reset();mode='denied';r=await call('worklog-correction',payload());assert.equal(r.status,200,JSON.stringify(r));assert.equal(forms,1);assert.equal(w.timeSpentSeconds,5400);assert.equal(records[w.id].workLogAttributes[0].attrValue,'yes');assert.equal(records[w.id].workLogAttributes[1].attrValue,'KEEP');
 w=reset();mode='ignored';r=await call('worklog-correction',payload());assert.equal(r.status,502);assert(r.data.details.resultUnknown);assert.equal(forms,0);assert.equal(writes.length,1);
 w=reset();mode='lost';r=await call('worklog-correction',payload());assert(r.status>=500);assert(r.data.details.resultUnknown);assert.equal(w.timeSpentSeconds,5400);assert.equal(writes.length,1);assert.equal(forms,0,'no write fallback/retry after uncertain commit');
 // Combined duration edits and cyclic swaps use guarded parking and exact readback.
 w=reset();const partner=add(2,'10:00');const body={requestId:'resize-swap-cycle-0001',moves:[{key:w.key,worklogId:w.id,date:'2026-10-16',start:'10:00',targetSeconds:5400,expectedStarted:w.started,expectedSeconds:3600},{key:partner.key,worklogId:partner.id,date:'2026-10-16',start:'08:00',targetSeconds:1800,expectedStarted:partner.started,expectedSeconds:3600}]};
 r=await call('calendar-moves',body);assert.equal(r.status,200,JSON.stringify(r));assert.equal(w.started,'2026-10-16T10:00:00.000+0700');assert.equal(w.timeSpentSeconds,5400);assert.equal(partner.timeSpentSeconds,1800);assert.equal(writes.length,3);
 r=await call('calendar-moves',{...body,requestId:'resize-swap-new-replay-0001'});assert.equal(r.status,200);assert.equal(writes.length,3,'fresh replay only confirms final start AND duration');
 for(const failure of ['third-fails','third-lost']) {
  w=reset();const second=add(2,'10:00');const rollback={...body,requestId:'resize-rollback-'+failure,moves:body.moves.map((m,i)=>({...m,worklogId:i?second.id:w.id,expectedStarted:i?second.started:w.started,expectedSeconds:3600}))};
  mode=failure;r=await call('calendar-moves',rollback);assert.equal(r.data.details.rolledBack,true,JSON.stringify(r));
  assert.equal(w.started,'2026-10-16T08:00:00.000+0700');assert.equal(w.timeSpentSeconds,3600);
  assert.equal(second.started,'2026-10-16T10:00:00.000+0700');assert.equal(second.timeSpentSeconds,3600,'rollback restores duration as well as position');
 }
 console.log('Resize API: fresh guards/auth/windows, exact duration/start/comment/native OT, native-form fallback, readback/lost response and duration-aware cyclic swap passed.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{global.fetch=oldFetch;if(oldSecret===undefined)delete process.env.APP_SESSION_SECRET;else process.env.APP_SESSION_SECRET=oldSecret;if(server)await new Promise(r=>server.close(r));});
