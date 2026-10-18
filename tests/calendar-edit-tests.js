'use strict';
const assert=require('node:assert/strict'), http=require('node:http');
const api=require('../api'),{createSessionCookie}=require('../lib/session');
const fixture=require('./fixtures/native-form');
const oldFetch=global.fetch,oldSecret=process.env.APP_SESSION_SECRET;
let server;
(async()=>{
 process.env.APP_SESSION_SECRET='calendar-edit-integration-secret-at-least-32';
 const me={name:'calendar-user',key:'USER1'},cookie=createSessionCookie({mode:'basic',username:me.name,password:'fixture-only',me}).split(';')[0];
 let logs=[],records={},serial=20,mode='',writes=0,formWrites=0;
 const add=(start,seconds=3600,extra={})=>{const id=String(++serial),w={id,key:'CAL-1',author:me,started:`2026-10-16T${start}:00.000+0700`,timeSpentSeconds:seconds,comment:'Giữ nguyên mô tả\n\n[Quick Jira Log: Overtime]',...extra};logs.push(w);records[id]={id:Number(id),issueKey:'CAL-1',authorUserKey:me.key,workStart:Date.parse(w.started),timeSpent:seconds,comment:w.comment,workLogAttributes:[{attrTypeId:1,attrValue:'yes'},{attrTypeId:9,attrValue:'CUSTOM'}]};return w;};
 const issue={key:'CAL-1',fields:{project:{key:'CAL'},summary:'Calendar worklog',status:{name:'Done',statusCategory:{key:'done'}}}};
 global.fetch=async(url,options={})=>{
  const u=new URL(String(url)),method=options.method||'GET',body=options.body?(u.pathname===fixture.action?Object.fromEntries(new URLSearchParams(options.body)):JSON.parse(options.body)):{};
  if(u.pathname.endsWith('/search'))return Response.json({issues:[issue],total:1});
  if(u.pathname.endsWith('/worklog/updated'))return new Response('{}',{status:404});
  if(u.pathname==='/rest/api/2/issue/CAL-1')return Response.json(issue);
  const core=u.pathname.match(/\/issue\/CAL-1\/worklog(?:\/(\d+))?$/);
  if(core){const id=core[1],w=logs.find(x=>x.id===id);
   if(method==='POST'){writes++;const created=add('08:00',body.timeSpentSeconds,{started:mode==='create-ignored'?'2026-10-16T08:00:00.000+0700':body.started,comment:body.comment});records[created.id].workStart=Date.parse(created.started);return Response.json(created);}
   if(method==='DELETE'){logs=logs.filter(x=>x.id!==id);delete records[id];return new Response(null,{status:204});}
   if(method==='PUT'){
    writes++; if(mode==='denied')return Response.json({}, {status:403});
    if(mode!=='ignored')Object.assign(w,{started:body.started,timeSpentSeconds:body.timeSpentSeconds,comment:body.comment});
    if(mode==='lost-response')throw new Error('Network lost after write');
    return Response.json(w);
   }
   if(id)return w?Response.json(w):Response.json({}, {status:404});
   return Response.json({worklogs:logs,total:logs.length});
  }
  if(u.pathname.endsWith('/1.0/attr'))return Response.json([{id:1,name:'Over Time?',type:'BOOL',enabled:true}]);
  if(u.pathname.endsWith('/latest/worklog')){const rec=records[u.searchParams.get('id')];return Response.json({projects:[{issues:[{key:'CAL-1',workLogs:rec?[rec]:[]}]}]});}
  if(u.pathname==='/browse/CAL-1')return new Response(fixture.bootstrap);
  if(u.pathname===fixture.openAction){const rec=records[u.searchParams.get('worklogId')];return new Response(fixture.render('CAL-1',rec));}
  if(u.pathname===fixture.action&&method==='POST'){
   formWrites++;const rec=records[body.worklogId],values=fixture.values(new URLSearchParams(options.body),rec);
   values.timeSpent = Math.round(parseFloat(body.timeLogged)*60);
   Object.assign(rec,values,{workStart:Date.parse(values.workStart)});Object.assign(logs.find(x=>x.id===body.worklogId),{started:values.workStart,timeSpentSeconds:values.timeSpent,comment:values.comment});
   return new Response('<div>Saved</div>');
  }
  throw new Error('Unexpected '+method+' '+u.pathname);
 };
 server=http.createServer((req,res)=>api(req,res).catch(e=>{res.statusCode=500;res.end(JSON.stringify({error:e.message}));}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const request=async(action,method,body)=>{const r=await oldFetch(`http://127.0.0.1:${server.address().port}/api?action=${action}`,{method,headers:{cookie,'content-type':'application/json'},body:JSON.stringify(body)});return{status:r.status,data:await r.json()};};
 const create={key:'CAL-1',project:'CAL',date:'2026-10-16',startTime:'15:00',timeSpent:'1h',description:'Log đúng 15:00'};
 let r=await request('worklog','POST',{...create,requestId:'calendar-exact-start-0001'});assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.data.exactStart,true);assert.equal(r.data.segments[0].start,'15:00');assert.equal(logs[0].started,'2026-10-16T15:00:00.000+0700');
 const count=logs.length;r=await request('worklog','POST',{...create,requestId:'calendar-exact-start-0001'});assert.equal(r.data.replayed,true);assert.equal(logs.length,count);
 let before=writes;r=await request('worklog','POST',create);assert.equal(r.status,409);assert.equal(writes,before,'never shift an exact slot to next free time');
 r=await request('worklog','POST',{...create,startTime:'12:00'});assert.equal(r.status,409);assert.equal(writes,before);
 r=await request('worklog','POST',{...create,startTime:'11:30'});assert.equal(r.status,409,'cannot split exact creation over lunch');assert.equal(writes,before);
 r=await request('worklog','POST',{...create,startTime:'25:00'});assert.equal(r.status,400);assert.equal(writes,before);
 r=await request('worklog','POST',{...create,startTime:'17:30',overtime:true});assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.data.overtimeVerified,true);assert.equal(r.data.segments[0].start,'17:30');
 logs=[];records={};mode='create-ignored';r=await request('worklog','POST',create);assert.equal(r.status,502);assert.equal(logs.length,0,'readback mismatch rolls back only newly created log');mode='';
 const w=add('15:00',3661),originalComment=w.comment;
 const move=(extra={})=>({key:'CAL-1',worklogId:w.id,moveOnly:true,expectedStarted:w.started,expectedSeconds:w.timeSpentSeconds,date:'2026-10-16',start:'08:00',...extra});
 r=await request('worklog-correction','PATCH',move());assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.data.moved,true);assert.equal(r.data.worklogVerified,true);assert.equal(w.started,'2026-10-16T08:00:00.000+0700');assert.equal(w.timeSpentSeconds,3661);assert.equal(w.comment,originalComment);
 assert.equal(records[w.id].workLogAttributes[0].attrValue,'yes','core move never rewrites OT');
 before=writes;r=await request('worklog-correction','PATCH',move({expectedStarted:'2026-10-16T15:00:00.000+0700',start:'10:00'}));assert.equal(r.status,409);assert.equal(r.data.code,'WORKLOG_STALE');assert.equal(writes,before);
 r=await request('worklog-correction','PATCH',move({expectedSeconds:3600}));assert.equal(r.status,409);assert.equal(writes,before);
 r=await request('worklog-correction','PATCH',move({expectedStarted:undefined}));assert.equal(r.status,400);
 add('10:00');r=await request('worklog-correction','PATCH',move({start:'10:00'}));assert.equal(r.status,409);assert.equal(writes,before);
 r=await request('worklog-correction','PATCH',move({start:'11:30'}));assert.equal(r.status,409);assert.equal(writes,before);
 r=await request('worklog-correction','PATCH',move({date:'2026-10-17',start:'14:00',description:'malicious replacement',timeSpent:'8h',overtime:false,updateOvertime:true}));assert.equal(r.status,200);assert.equal(w.timeSpentSeconds,3661);assert.equal(w.comment,originalComment);assert.equal(records[w.id].workLogAttributes[0].attrValue,'yes');
 w.author={name:'someone-else'};before=writes;r=await request('worklog-correction','PATCH',move());assert.equal(r.status,403);assert.equal(writes,before);w.author=me;
 mode='ignored';r=await request('worklog-correction','PATCH',move({date:'2026-10-16',start:'15:00'}));assert.equal(r.status,502);assert.equal(r.data.details.resultUnknown,true);mode='';
 // Definite core 403 may use native adapter, preserving latest native attributes.
 records[w.id].workStart=Date.parse(w.started);mode='denied';r=await request('worklog-correction','PATCH',move({date:'2026-10-16',start:'15:00'}));assert.equal(r.status,200,JSON.stringify(r));assert.equal(formWrites>0,true);assert.equal(records[w.id].workLogAttributes[0].attrValue,'yes');assert.equal(records[w.id].workLogAttributes[1].attrValue,'CUSTOM');
 const partner=logs.find(x=>x.id!==w.id),formCountBeforeSwap=formWrites;
 const swapBody={requestId:'calendar-native-swap-0001',moves:[{key:w.key,worklogId:w.id,date:'2026-10-16',start:'10:00',expectedStarted:w.started,expectedSeconds:w.timeSpentSeconds},{key:partner.key,worklogId:partner.id,date:'2026-10-16',start:'15:00',expectedStarted:partner.started,expectedSeconds:partner.timeSpentSeconds}]};
 r=await request('calendar-moves','POST',swapBody);assert.equal(r.status,200,JSON.stringify(r));assert.equal(formWrites,formCountBeforeSwap+3);assert.equal(w.started,'2026-10-16T10:00:00.000+0700');assert.equal(w.timeSpentSeconds,3661);assert.equal(records[w.id].workLogAttributes[0].attrValue,'yes');assert.equal(records[w.id].workLogAttributes[1].attrValue,'CUSTOM');
 mode='lost-response';before=writes;const formsBefore=formWrites;r=await request('worklog-correction','PATCH',move({start:'13:30'}));assert.equal(r.status>=500,true);assert.equal(writes,before+1);assert.equal(formWrites,formsBefore,'no retry after unknown write');
 console.log('V1.15.2 exact calendar creation + readback, no silent shift/lunch split, OT, idempotency/rollback; drag move exact seconds/comment/OT, stale/author/conflict/windows, native fallback and no retry after unknown write passed.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{global.fetch=oldFetch;if(oldSecret===undefined)delete process.env.APP_SESSION_SECRET;else process.env.APP_SESSION_SECRET=oldSecret;if(server)await new Promise(r=>server.close(r));});
