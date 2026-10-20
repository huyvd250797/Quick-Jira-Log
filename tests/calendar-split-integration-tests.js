'use strict';
const assert=require('node:assert/strict'),http=require('node:http');
const api=require('../api'),{createSessionCookie}=require('../lib/session'),D=require('../lib/calendar-drafts');
const {render,values,action,openAction,bootstrap}=require('./fixtures/native-form');
const old=global.fetch;process.env.APP_SESSION_SECRET='full-split-integration-secret-minimum32';
const me={key:'ME1',name:'me'},cookie=createSessionCookie({mode:'basic',username:'me',password:'test',me}).split(';')[0];
let logs=[],writes=[],server,seq=100,rejectCore=false;
const native=raw=>({id:Number(raw.id),issueKey:'CAL-1',authorUserKey:me.key,workStart:Date.parse(raw.started),timeSpent:raw.timeSpentSeconds,comment:raw.comment,canEdit:true,workLogAttributes:structuredClone(raw.attributes)});
const reset=()=>{logs=[{id:'1',key:'CAL-1',author:me,started:'2026-10-20T13:30:00.000+0700',timeSpentSeconds:9000,comment:'Giữ mô tả tiếng Việt & <tag>',attributes:[{attrTypeId:1,attrValue:'yes'},{attrTypeId:9,attrValue:'CUSTOM'}]}];writes=[];};reset();
global.fetch=async(url,o={})=>{
 const u=new URL(String(url)),method=o.method||'GET';
 if(u.pathname.endsWith('/search'))return Response.json({issues:[{key:'CAL-1'}],total:1});
 if(u.pathname.endsWith('/worklog/updated'))return Response.json({}, {status:404});
 if(u.pathname.endsWith('/attr'))return Response.json([{id:1,name:'Over Time?',type:'BOOL',enabled:true}]);
 if(u.pathname.includes('/rest/com.deniz.jira.worklog/latest/worklog')){
  const raw=logs.find(x=>x.id===u.searchParams.get('id'));return raw?Response.json({projects:[{issues:[{workLogs:[native(raw)]}]}]}):Response.json({}, {status:404});
 }
 if(u.pathname.startsWith('/browse/'))return new Response(bootstrap);
 if(u.pathname===openAction){const raw=logs.find(x=>x.id===u.searchParams.get('worklogId'));assert(raw);return new Response(render('CAL-1',native(raw)));}
 if(u.pathname===action){
  const f=new URLSearchParams(o.body),raw=logs.find(x=>x.id===f.get('worklogId'));assert(raw);assert.equal(method,'POST');writes.push(['native',raw.id]);const n=values(f,native(raw));raw.started=n.workStart;raw.timeSpentSeconds=n.timeSpent;raw.comment=n.comment;raw.attributes=n.workLogAttributes;return new Response('Saved');
 }
 const match=u.pathname.match(/\/issue\/(CAL-1)\/worklog(?:\/(\d+))?$/);
 if(match){const id=match[2],raw=logs.find(x=>x.id===id);
  if(method==='PUT'){if(rejectCore)return Response.json({errorMessages:['Core permission denied']},{status:403});const b=JSON.parse(o.body);assert(raw);writes.push(['PUT',raw.id]);Object.assign(raw,{started:b.started,timeSpentSeconds:b.timeSpentSeconds,comment:b.comment});return Response.json(raw);}
  if(method==='POST'){const b=JSON.parse(o.body),raw={id:String(++seq),key:'CAL-1',author:me,started:b.started,timeSpentSeconds:b.timeSpentSeconds,comment:b.comment,attributes:[{attrTypeId:1,attrValue:'no'},{attrTypeId:9,attrValue:''}]};logs.push(raw);writes.push(['POST',raw.id]);return Response.json(raw);}
  if(method==='DELETE'){logs=logs.filter(x=>x.id!==id);return new Response(null,{status:204});}
  if(id)return raw?Response.json(raw):Response.json({}, {status:404});
  return Response.json({worklogs:logs,total:logs.length});
 }
 throw new Error('Unexpected '+method+' '+u.pathname);
};
(async()=>{
 server=http.createServer((req,res)=>api(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const b={requestId:'full-split-integration-123',key:'CAL-1',worklogId:'1',expectedStarted:logs[0].started,expectedSeconds:9000,targetSeconds:9000,segments:[{date:'2026-10-20',start:'11:00',targetSeconds:3600},{date:'2026-10-20',start:'13:30',targetSeconds:5400}]};
 const call=async body=>{const r=await old(`http://127.0.0.1:${server.address().port}/api?action=calendar-split`,{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify(body)});return{status:r.status,data:await r.json()};};
 const r=await call(b);assert.equal(r.status,200,JSON.stringify(r));assert.equal(logs.length,2);assert.equal(logs.reduce((n,x)=>n+x.timeSpentSeconds,0),9000);assert(logs.every(x=>x.attributes[0].attrValue==='yes'&&x.attributes[1].attrValue==='CUSTOM'));assert.deepEqual(writes.map(x=>x[0]),['PUT','POST','native']);
 const count=writes.length;assert.equal((await call({...b,verifyOnly:true})).status,200);assert.equal(writes.length,count);
 for(const ot of ['yes','no']){
  reset();rejectCore=true;logs[0].attributes[0].attrValue=ot;
  const nativeResult=await call({...b,requestId:'full-split-native-'+ot+'-123'});assert.equal(nativeResult.status,200,JSON.stringify(nativeResult));assert.equal(logs.reduce((n,x)=>n+x.timeSpentSeconds,0),9000);assert(logs.every(x=>x.attributes[0].attrValue===ot&&x.attributes[1].attrValue==='CUSTOM'));assert.deepEqual(writes.map(x=>x[0]),['native','POST','native']);
 }
 console.log('Full split integration: router, Jira fresh guard, correction shrink, single core creation, real native form copy/readback and verify-only without writes passed.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{global.fetch=old;if(server)await new Promise(r=>server.close(r));});
