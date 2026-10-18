'use strict';
const assert=require('node:assert/strict'),http=require('node:http');
const api=require('../api'),{createSessionCookie}=require('../lib/session');
const D=require('../lib/calendar-drafts'),{schedule}=require('../lib/calendar-moves');
const oldFetch=global.fetch,oldSecret=process.env.APP_SESSION_SECRET;
let server;
(async()=>{
 process.env.APP_SESSION_SECRET='calendar-swap-fixture-secret-minimum-32';
 const me={name:'swap-user',key:'SWAP1'},cookie=createSessionCookie({mode:'basic',username:me.name,password:'fixture',me}).split(';')[0];
 let logs=[],writes=[],failure='',putCount=0;
 const make=(id,start,seconds=3600,date='2026-10-16',key='CAL-1')=>({id:String(id),key,author:me,started:`${date}T${start}:00.000+0700`,timeSpentSeconds:seconds,comment:'Mô tả '+id+' [Quick Jira Log: Overtime]',nativeOvertime:id===1});
 const reset=()=>{logs=[make(1,'08:00'),make(2,'15:00',1800,'2026-10-16','CAL-2')];writes=[];failure='';putCount=0;};reset();
 const parsed=w=>{const date=w.started.slice(0,10),start=w.started.slice(11,16);return{...w,date,start};};
 global.fetch=async(url,options={})=>{
  const u=new URL(String(url)),method=options.method||'GET';
  if(u.pathname.endsWith('/search'))return Response.json({issues:[...new Set(logs.map(x=>x.key))].map(key=>({key})),total:2});
  if(u.pathname.endsWith('/worklog/updated'))return new Response('{}',{status:404});
  const match=u.pathname.match(/\/issue\/(CAL-\d+)\/worklog(?:\/(\d+))?$/);
  if(match){const [,key,id]=match,w=logs.find(x=>x.key===key&&x.id===id);
   if(method==='PUT'){
    putCount++;const body=JSON.parse(options.body);
    if(failure==='second'&&putCount===2)return Response.json({errorMessages:['Denied edit']},{status:422});
    if(failure==='rollback-denied'&&putCount>=2)return Response.json({errorMessages:['Denied recovery']},{status:422});
    const target=parsed({...w,started:body.started,timeSpentSeconds:body.timeSpentSeconds});
    assert(!logs.some(x=>x.id!==w.id&&D.overlaps(parsed(x),target)),'Never permit even transient overlap in fixture');
    writes.push({id:w.id,started:body.started,seconds:body.timeSpentSeconds});Object.assign(w,{started:body.started,timeSpentSeconds:body.timeSpentSeconds,comment:body.comment});
    if(failure==='lost-first'&&putCount===1)throw new Error('Disconnected after temporary move committed');
    return Response.json(w);
   }
   if(id)return w?Response.json(w):Response.json({}, {status:404});
   return Response.json({worklogs:logs.filter(x=>x.key===key),total:logs.filter(x=>x.key===key).length});
  }
  throw new Error('Unexpected '+method+' '+u.pathname);
 };
 server=http.createServer((req,res)=>api(req,res).catch(e=>{res.statusCode=500;res.end(JSON.stringify({error:e.message}));}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const call=async(body,extraHeaders={})=>{const r=await oldFetch(`http://127.0.0.1:${server.address().port}/api?action=calendar-moves`,{method:'POST',headers:{cookie,'content-type':'application/json',...extraHeaders},body:JSON.stringify(body)});return{status:r.status,data:await r.json()};};
 let serial=0;
 const payload=()=>({requestId:'calendar-swap-request-'+(++serial),moves:logs.filter(x=>['1','2'].includes(x.id)).map((w,i)=>({key:w.key,worklogId:w.id,expectedStarted:w.started,expectedSeconds:w.timeSpentSeconds,date:'2026-10-16',start:i?'08:00':'15:00'}))});
 const body=payload(),originals=logs.map(x=>({...x}));let r=await call(body);assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.data.items.length,2);assert.equal(writes.length,3);assert.equal(logs[0].started,'2026-10-16T15:00:00.000+0700');assert.equal(logs[1].started,'2026-10-16T08:00:00.000+0700');
 assert.equal(logs[0].timeSpentSeconds,3600);assert.equal(logs[1].timeSpentSeconds,1800);assert.equal(logs[0].comment,originals[0].comment);assert.equal(logs[0].nativeOvertime,true);assert.equal(logs[1].nativeOvertime,false);
 let before=writes.length;r=await call(body);assert.equal(r.status,200);assert.equal(r.data.replayed,true);assert.equal(writes.length,before);
 // Independent replay after process cache expiry also only reads the final pair.
 r=await call({...body,requestId:'calendar-new-replay-0001'});assert.equal(r.status,200);assert.equal(writes.length,before);
 reset();let b=payload();b.moves[0].expectedSeconds++;r=await call(b);assert.equal(r.status,409);assert.equal(writes.length,0);
 reset();b=payload();logs[1].author={name:'not-me'};r=await call(b);assert.equal(r.status,403);assert.equal(writes.length,0);
 reset();b=payload();logs.push(make(3,'15:45'));r=await call(b);assert.equal(r.status,409);assert.equal(writes.length,0);
 reset();b=payload();b.moves[0].start='11:30';r=await call(b);assert.equal(r.status,409);assert.equal(writes.length,0);
 reset();b=payload();failure='second';r=await call(b);assert.equal(r.data.details.rolledBack,true,JSON.stringify(r));assert.equal(logs[0].started,b.moves[0].expectedStarted);assert.equal(logs[1].started,b.moves[1].expectedStarted);assert.equal(writes.length,2,'temporary move + guarded rollback');
 reset();b=payload();failure='lost-first';r=await call(b);assert.equal(r.data.details.rolledBack,true,JSON.stringify(r));assert.equal(logs[0].started,b.moves[0].expectedStarted);assert.equal(writes.length,2,'uncertain write is read and reverted without replay');
 reset();b=payload();failure='rollback-denied';r=await call(b);assert.equal(r.data.code,'CALENDAR_SWAP_RESULT_UNKNOWN');assert.equal(r.data.details.resultUnknown,true);assert.equal(r.data.details.actual.length,2);assert(logs.some((x,i)=>x.started!==b.moves[i].expectedStarted));
 reset();b=payload();r=await call(b,{cookie:''});assert.equal(r.status,401);assert.equal(writes.length,0);
 reset();b=payload();r=await call(b,{origin:'https://wrong.example',host:'localhost'});assert.equal(r.status,403);assert.equal(writes.length,0);
 reset();b=payload();b.moves.push({...b.moves[0]});r=await call(b);assert.equal(r.status,400);
 reset();b=payload();b.requestId='';r=await call(b);assert.equal(r.status,400);
 reset();logs[1].started='2026-10-17T15:00:00.000+0700';b=payload();b.moves[0].date='2026-10-17';b.moves[1].date='2026-10-16';r=await call(b);assert.equal(r.status,200,JSON.stringify(r));assert.equal(logs[0].started,'2026-10-17T15:00:00.000+0700');assert.equal(logs[1].started,'2026-10-16T08:00:00.000+0700');
 reset();logs=[make(1,'08:00',14400,'2026-10-17'),make(2,'13:30',14400,'2026-10-17','CAL-2')];b=payload();b.moves[0].date='2026-10-17';b.moves[0].start='13:30';b.moves[1].date='2026-10-17';r=await call(b);assert.equal(r.status,409);assert.equal(writes.length,0);assert(r.data.error.includes('trống trung gian'));
 // Three-block cyclic swaps use one parking step, including second precision.
 const a=parsed(make(1,'08:00',3601)),bb=parsed(make(2,'10:00')),c=parsed(make(3,'15:00',1800));
 const cycle=schedule([a,bb,c],[D.preview(a,{date:a.date,start:'10:00'}),D.preview(bb,{date:a.date,start:'15:00'}),D.preview(c,{date:a.date,start:'08:00'})],[]);assert.equal(cycle.length,4);assert.equal(cycle.filter(x=>x.temporary).length,1);
 const occupied=[{date:'2026-10-17',start:'08:00',timeSpentSeconds:14400},{date:'2026-10-17',start:'13:30',timeSpentSeconds:14400}];
 const weekend=[{...a,date:'2026-10-17',start:'08:00',timeSpentSeconds:14400},{...bb,date:'2026-10-17',start:'13:30',timeSpentSeconds:14400}];
 assert.throws(()=>schedule(weekend,[D.preview(weekend[0],weekend[1]),D.preview(weekend[1],weekend[0])],occupied),/trống trung gian/);
 console.log('Calendar swap API: cross-issue unequal duration, native OT/comment/seconds preserved, no transient overlap, verified/replay, stale/author/final conflict, rollback, lost response recovery, unresolved recovery and parking cycles passed.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{global.fetch=oldFetch;if(oldSecret===undefined)delete process.env.APP_SESSION_SECRET;else process.env.APP_SESSION_SECRET=oldSecret;if(server)await new Promise(r=>server.close(r));});
