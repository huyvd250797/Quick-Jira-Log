'use strict';
const assert=require('node:assert/strict'),http=require('node:http');
const handler=require('../handlers/worklog-correction'),{createSessionCookie}=require('../lib/session');
const originalFetch=global.fetch,oldSecret=process.env.APP_SESSION_SECRET;
let server;
(async()=>{
 process.env.APP_SESSION_SECRET='correction-overtime-test-at-least-32-secret';
 const cookie=createSessionCookie({mode:'basic',username:'edit-ot-user',password:'test-only',me:{name:'edit-ot-user'}}).split(';')[0];
 let logs=[],field=[],schema='array',failField=false,failWorklog=false,failRollback=false,failRead=false,calls=[];
 const original={id:'7',author:{name:'edit-ot-user'},started:'2026-10-16T08:00:00.000+0700',timeSpentSeconds:3600,comment:'Original description'};
 const reset=()=>{logs=[structuredClone(original)];field=[];schema='array';failField=false;failWorklog=false;failRollback=false;failRead=false;calls=[];};reset();
 global.fetch=async(url,options={})=>{
  const u=new URL(String(url)),method=options.method||'GET',body=options.body?JSON.parse(options.body):{};calls.push({path:u.pathname,method,body});
  if(u.pathname.endsWith('/search'))return Response.json({issues:[{key:'EDIT-1'}],total:1});
  if(u.pathname.endsWith('/worklog/updated'))return new Response('{}',{status:404});
  if(u.pathname.endsWith('/EDIT-1/worklog'))return Response.json({worklogs:logs,total:logs.length});
  if(u.pathname.endsWith('/EDIT-1/editmeta'))return Response.json({fields:{customfield_9999:{name:'Overtime',schema:{type:schema},allowedValues:[{id:'11',value:'Overtime'}]}}});
  if(u.pathname.endsWith('/EDIT-1/worklog/7')&&method==='PUT'){
   if(failWorklog||(failRollback&&body.comment===original.comment))return Response.json({errorMessages:['Worklog denied']},{status:403});
   logs[0]={...logs[0],started:body.started,timeSpentSeconds:body.timeSpentSeconds,comment:body.comment};return Response.json(logs[0]);
  }
  if(u.pathname.endsWith('/EDIT-1')){
   if(method==='PUT'){if(failField==='ambiguous'){field=body.fields.customfield_9999;failField=false;return Response.json({errorMessages:['Timeout after write']},{status:503});}if(failField)return Response.json({errorMessages:['Overtime denied']},{status:403});field=body.fields.customfield_9999;return new Response(null,{status:204});}
   if(failRead)return Response.json({errorMessages:['No field read permission']},{status:403});return Response.json({key:'EDIT-1',fields:{customfield_9999:field}});
  }
  throw Error('Unexpected '+method+' '+u.pathname);
 };
 server=http.createServer((req,res)=>handler(req,res).catch(e=>{res.statusCode=500;res.end(JSON.stringify({error:e.message}));}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const patch=async(extra={})=>{const r=await originalFetch(`http://127.0.0.1:${server.address().port}`,{method:'PATCH',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({key:'EDIT-1',worklogId:'7',date:'2026-10-16',start:'17:30',timeSpent:'1h',description:'Changed description',...extra})});return {status:r.status,data:await r.json()};};
 let r=await patch({overtime:true,updateOvertime:true});assert.equal(r.status,200);assert.deepEqual(field,[{id:'11'}]);assert.equal(logs[0].started,'2026-10-16T17:30:00.000+0700');assert(r.data.overtimeUpdated);
 r=await patch({overtime:false,updateOvertime:true,start:'09:00'});assert.equal(r.status,200);assert.deepEqual(field,[]);assert(logs[0].started.includes('T09:00'));
 for(const [type,expected] of [['boolean',false],['number',0],['option',null],['string',null]]){
  reset();schema=type;field=true;r=await patch({overtime:false,updateOvertime:true,start:'09:00'});assert.equal(r.status,200);assert.equal(field,expected,'correct clear value for '+type);
 }
 reset();r=await patch({overtime:false,updateOvertime:false,start:'09:00'});assert.equal(r.status,200);assert(!calls.some(c=>c.path.endsWith('/editmeta')||c.path.endsWith('/EDIT-1')&&c.method==='PUT'),'unchanged checkbox must not mutate issue field');
 reset();r=await patch({overtime:true,updateOvertime:true,start:'09:00'});assert.equal(r.status,409);assert(!calls.some(c=>c.method==='PUT'),'invalid OT time has no writes');
 reset();r=await patch({overtime:false,updateOvertime:true});assert.equal(r.status,409);assert(!calls.some(c=>c.method==='PUT'));
 reset();logs.push({...original,id:'8',started:'2026-10-16T17:30:00.000+0700'});r=await patch({overtime:true,updateOvertime:true});assert.equal(r.status,409,'overlap blocked');assert(!calls.some(c=>c.method==='PUT'));
 reset();logs[0].author.name='another-user';r=await patch({overtime:true,updateOvertime:true});assert.equal(r.status,403);assert(!calls.some(c=>c.method==='PUT'));
 reset();failRead=true;r=await patch({overtime:true,updateOvertime:true});assert.equal(r.status,409);assert(!calls.some(c=>c.method==='PUT'),'unreadable field prevents all writes');
 reset();failField='ambiguous';r=await patch({overtime:true,updateOvertime:true});assert.equal(r.status,503);assert.equal(r.data.partial,false);assert.deepEqual(logs[0],original);assert.deepEqual(field,[],'ambiguous field write is restored');
 reset();failField=true;r=await patch({overtime:true,updateOvertime:true});assert.equal(r.status,403);assert.equal(r.data.partial,false);assert.deepEqual(logs[0],original,'failed field update restores worklog');
 reset();failField=true;failRollback=true;r=await patch({overtime:true,updateOvertime:true});assert.equal(r.data.partial,true);assert(r.data.error.includes('kiểm tra Jira'));
 reset();failWorklog=true;r=await patch({overtime:true,updateOvertime:true});assert.equal(r.status,403);assert(!calls.some(c=>c.path.endsWith('/EDIT-1')&&c.method==='PUT'),'failed worklog never writes OT');
 reset();r=await patch({overtime:'false',updateOvertime:true});assert.equal(r.status,400);assert(!calls.some(c=>c.method==='PUT'));
 reset();r=await patch({overtime:true,updateOvertime:true,date:'2026-10-17',start:'08:00'});assert.equal(r.status,200,'weekend OT uses daytime windows');
 console.log('V1.11.4 correction OT on/off, field schemas, unchanged save, guard/ownership and rollback passed');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{global.fetch=originalFetch;if(oldSecret==null)delete process.env.APP_SESSION_SECRET;else process.env.APP_SESSION_SECRET=oldSecret;if(server)await new Promise(r=>server.close(r));});
