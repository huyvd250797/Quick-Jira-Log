'use strict';
const assert=require('node:assert/strict'),http=require('node:http');
const handler=require('../handlers/worklog-correction'),history=require('../handlers/worklog-history'),{createSessionCookie,getSession}=require('../lib/session');
const {readLabel}=require('../lib/worklog-label');
const fixture=require('./fixtures/native-form');
const native=require('../lib/worklogpro');const login=require('../handlers/login');const {diagnostics}=require('../lib/jira-diagnostics');
assert.deepEqual(readLabel('Nội dung\nDòng hai\n\n[Quick Jira Log: Overtime]'),{description:'Nội dung\nDòng hai',overtime:true});
assert.equal(readLabel('Nội dung Overtime bình thường').overtime,undefined);
assert.equal(readLabel({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Mô tả'}]},{type:'paragraph',content:[{type:'text',text:'[Quick Jira Log: Regular]'}]}]}).overtime,false);
const originalFetch=global.fetch,oldSecret=process.env.APP_SESSION_SECRET,oldId=process.env.WORKLOGPRO_OVERTIME_ATTRIBUTE_ID;let server;
(async()=>{
 process.env.APP_SESSION_SECRET='native-overtime-test-at-least-32-secret';delete process.env.WORKLOGPRO_OVERTIME_ATTRIBUTE_ID;
 const auth={mode:'basic',username:'edit-ot-user',password:'test-only',me:{name:'edit-ot-user',key:'JIRAUSER123'}};
 const cookie=createSessionCookie(auth).split(';')[0];
 const original={id:'7',author:{name:'edit-ot-user',key:'JIRAUSER123'},started:'2026-10-16T08:00:00.000+0700',timeSpentSeconds:3600,comment:'Original description\n\n[Quick Jira Log: Overtime]'};
 let logs=[structuredClone(original),{...structuredClone(original),id:'8',started:'2026-10-16T10:00:00.000+0700'}],calls=[],mode='',attributes=[{id:23,name:'Over Time?',type:'BOOL',enabled:true},{id:9,name:'Billable',type:'BOOL',enabled:true}];
 let advanceClock=null;
 let records={7:{id:7,workStart:Date.parse(original.started),timeSpent:3600,authorUserKey:'JIRAUSER123',comment:original.comment,workLogAttributes:[{attrTypeId:23,attrValue:'no'},{attrTypeId:9,attrValue:'yes'},{attrTypeId:12,attrValue:'CUSTOM'}]},8:{id:8,workStart:Date.parse(logs[1].started),timeSpent:3600,authorUserKey:'JIRAUSER123',comment:logs[1].comment,workLogAttributes:[{attrTypeId:23,attrValue:'yes'}]}};
 global.fetch=async(url,options={})=>{
  const u=new URL(String(url)),method=options.method||'GET',body=options.body?(u.pathname===fixture.action?Object.fromEntries(new URLSearchParams(options.body)):JSON.parse(options.body)):{};calls.push({path:u.pathname,method,body});
  if(u.pathname==='/rest/auth/1/session')return Response.json({session:{name:'JSESSIONID',value:'server-cookie-only'}});
  if(u.pathname==='/rest/api/2/myself')return Response.json(auth.me);
  if(mode==='require-basic'&&u.pathname.includes('/com.deniz.jira.worklog/')&&options.headers.Authorization!==`Basic ${Buffer.from('edit-ot-user:test-only').toString('base64')}`)return Response.json({errorMessages:['Cookie authentication not accepted']},{status:403,headers:{'x-ausername':'anonymous'}});
  if(u.pathname==='/rest/com.deniz.jira.worklog/1.0/attr'){
   if(mode==='attr-denied')return Response.json({}, {status:403});
   if(mode==='attr-missing')return Response.json({}, {status:404});
   return Response.json(attributes);
  }
  if(u.pathname==='/rest/com.deniz.jira.worklog/latest/worklog'){
   if(mode==='verify-denied'&&calls.at(-2)?.method==='POST')return Response.json({}, {status:403});
   if(mode==='slow-clock'&&advanceClock)advanceClock();
   const record=records[u.searchParams.get('id')];
   return Response.json({projects:[{issues:[{key:'EDIT-1',workLogs:record?[record]:[]}]}]});
  }
  if(u.pathname==='/browse/EDIT-1')return new Response(fixture.bootstrap,{headers:{'set-cookie':'issueRoute=one; Path=/'}});
  if(u.pathname===fixture.action&&method==='GET')return Response.json({}, {status:403});
  if(u.pathname===fixture.action||u.pathname===fixture.openAction){
   const id=method==='POST'?body.worklogId:u.searchParams.get('worklogId'),record=records[id];
   if(method==='GET'){assert.equal(u.searchParams.get('atl_token'),'issue-page-token');return new Response(fixture.render('EDIT-1',record),{headers:{'set-cookie':'atlassian.xsrf.token=fresh-xsrf-token; Path=/'}});}
   assert.equal(u.searchParams.get('atl_token'),'fresh-xsrf-token');assert(options.headers.Cookie.includes('atlassian.xsrf.token=fresh-xsrf-token'));
   assert.equal(body.other,'PRESERVE');assert.equal(body.adjustEstimate,'leave');
   if(mode==='put-denied')return Response.json({}, {status:403});
   const value=fixture.values(new URLSearchParams(options.body),record);
   if(mode==='ignored-ot')value.workLogAttributes=record.workLogAttributes;
   records[id]={...record,...value,workStart:Date.parse(value.workStart)};
   Object.assign(logs.find(x=>x.id===id),{comment:value.comment,started:value.workStart,timeSpentSeconds:value.timeSpent});
   if(mode==='network-after-write')throw Error('Connection lost after commit');
   return new Response('<div>Saved</div>');
  }
  if(u.pathname.endsWith('/search'))return Response.json({issues:[{key:'EDIT-1',fields:{summary:'Native OT',project:{key:'EDIT'},status:{name:'Done'}}}],total:1});
  if(u.pathname.endsWith('/worklog/updated'))return new Response('{}',{status:404});
  if(u.pathname.endsWith('/EDIT-1/worklog'))return Response.json({worklogs:logs,total:logs.length});
  if(u.pathname.endsWith('/EDIT-1/worklog/7')){
   if(method==='PUT'){
    if(mode==='core-denied')return Response.json({errorMessages:['Jira edit permission denied']},{status:403});
    if(mode!=='core-ignored'){Object.assign(logs[0],{started:body.started,timeSpentSeconds:body.timeSpentSeconds,comment:body.comment});Object.assign(records[7],{comment:body.comment,workStart:Date.parse(body.started),timeSpent:body.timeSpentSeconds});}
   }return Response.json(logs[0]);
  }
  throw Error('Unexpected '+method+' '+u.pathname);
 };
 server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');req.query=Object.fromEntries(u.searchParams);(u.pathname==='/login'?login:req.method==='GET'?history:handler)(req,res).catch(e=>{res.statusCode=500;res.end(JSON.stringify({error:e.message}));});});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const patch=async(extra={},requestCookie=cookie)=>{const r=await originalFetch(`http://127.0.0.1:${server.address().port}`,{method:'PATCH',headers:{cookie:requestCookie,'content-type':'application/json'},body:JSON.stringify({key:'EDIT-1',worklogId:'7',date:'2026-10-16',start:'08:00',timeSpent:'1h',description:'Changed description',...extra})});return {status:r.status,data:await r.json()};};
 const read=async()=>{const r=await originalFetch(`http://127.0.0.1:${server.address().port}/?date=2026-10-16&key=EDIT-1&force=1`,{headers:{cookie}});assert.equal(r.status,200);return r.json();};
 const puts=()=>calls.filter(c=>c.method==='POST'&&c.path===fixture.action).length;
 let result=await read(),byId=Object.fromEntries(result.items.map(x=>[x.id,x]));assert.equal(byId['7'].overtime,false,'legacy marker never overrides unchecked Jira field');assert.equal(byId['7'].legacyOvertime,true);assert.equal(byId['7'].overtimeKnown,true);assert.equal(byId['8'].overtime,true,'native OT works without a marker');
 const sibling=structuredClone(records[8]);
 let r=await patch({overtime:true,updateOvertime:true});assert.equal(r.status,200);assert.equal(r.data.overtimeVerified,true);assert.equal(r.data.overtimeSource,'worklogpro');assert(native.overtimeOf(records[7],{id:23}));assert.equal(logs[0].comment,'Changed description');assert.equal(logs[0].started,original.started,'checkbox never shifts time');assert.deepEqual(records[8],sibling,'other worklogs untouched');
 assert.deepEqual(records[7].workLogAttributes.filter(a=>a.attrTypeId!==23),[{attrTypeId:9,attrValue:'yes'},{attrTypeId:12,attrValue:'CUSTOM'}]);
 const put=calls.find(c=>c.method==='POST'&&c.path===fixture.action);assert.equal(put.path,fixture.action);assert.equal(put.body.wa_23,'on');assert.equal(put.body.adjustEstimate,'leave');assert(!put.body.comment.includes('Quick Jira Log:'));
 const written=calls.findIndex(c=>c.method==='POST'&&c.path===fixture.action);assert.equal(calls[written+1].method,'GET','success requires a separate read-back');
 r=await patch({overtime:false,updateOvertime:false,description:'Only text changed'});assert.equal(r.status,200);assert.equal(r.data.editProvider,'jira');assert.equal(r.data.worklogVerified,true);assert(native.overtimeOf(records[7],{id:23}),'untouched stale checkbox preserves actual Jira OT');
 r=await patch({description:'Legacy client without OT'});assert.equal(r.status,200);assert(native.overtimeOf(records[7],{id:23}),'legacy no-OT edit preserves plugin attributes');
 r=await patch({overtime:false,updateOvertime:true});assert.equal(r.status,200);assert.equal(native.overtimeOf(records[7],{id:23}),false);
 let before=puts();r=await patch({overtime:true,start:'10:00'});assert.equal(r.status,409);assert.equal(puts(),before,'overlap blocked before plugin write');r=await patch({overtime:true,start:'12:30'});assert.equal(r.status,409);assert.equal(puts(),before);
 for(const failure of ['attr-denied','attr-missing','put-denied']){mode=failure;const snapshot=structuredClone(records);r=await patch({overtime:true});assert.notEqual(r.status,200);assert.deepEqual(records,snapshot);}
 mode='';const goodAttributes=attributes;for(const invalid of [[],[...attributes, {...attributes[0],id:24}], [{...attributes[0],type:'STRING'}],[{...attributes[0],enabled:false}]]){attributes=invalid;before=puts();r=await patch({overtime:true});assert.equal(r.status,409);assert.equal(puts(),before);}attributes=goodAttributes;
 process.env.WORKLOGPRO_OVERTIME_ATTRIBUTE_ID='23';attributes=[...attributes,{...attributes[0],id:24}];r=await patch({overtime:true});assert.equal(r.status,200,'explicit ID disambiguates two OT fields');delete process.env.WORKLOGPRO_OVERTIME_ATTRIBUTE_ID;attributes=goodAttributes;
 r=await patch({overtime:false});assert.equal(r.status,200);
 for(const failure of ['ignored-ot','verify-denied','network-after-write']){mode=failure;before=puts();r=await patch({overtime:true});assert.notEqual(r.status,200);assert.equal(r.data.details.resultUnknown,true);assert.equal(puts(),before+1,'native form POST is never retried');mode='';await patch({overtime:false});}
 const realNow=Date.now;let clock=realNow();Date.now=()=>clock;advanceClock=()=>{clock+=19000;};mode='slow-clock';
 try{const many=Array.from({length:20},(_,i)=>({id:String(i+7),overtime:true}));const enriched=await native.enrichHistory(many,auth);assert.equal(enriched.unavailable,19);assert.equal(many.filter(x=>x.overtimeKnown===true).length,1,'budget retains verified items and explicitly marks unqueried entries unknown');assert(many.slice(1).every(x=>x.overtimeKnown===false&&!x.overtime));}finally{Date.now=realNow;mode='';advanceClock=null;}
 mode='attr-denied';result=await read();assert.equal(result.sourceDetails.overtimeUnavailable,2);assert(result.items.every(x=>x.overtimeKnown===false&&!x.overtime));mode='';
 // Session-based Jira login must carry the documented Basic auth only for WorklogPRO.
 mode='require-basic';const oldCookie=createSessionCookie({mode:'session',cookie:'JSESSIONID=old-cookie',username:auth.username,me:auth.me}).split(';')[0];
 r=await patch({overtime:true,updateOvertime:true},oldCookie);assert.equal(r.status,403);assert.equal(r.data.details.reauthenticate,true);assert.equal(r.data.details.stage,'readOvertimeAttribute');
 const loginResponse=await originalFetch(`http://127.0.0.1:${server.address().port}/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:auth.username,password:auth.password})});assert.equal(loginResponse.status,200);const publicLogin=await loginResponse.text();assert(!publicLogin.includes(auth.password));const upgradedCookie=loginResponse.headers.get('set-cookie').split(';')[0];const upgraded=getSession({headers:{cookie:upgradedCookie}});assert.equal(upgraded.worklogproAuth.password,auth.password);assert.equal(upgraded.mode,'session');
 r=await patch({overtime:true,updateOvertime:true},upgradedCookie);assert.equal(r.status,200);assert.equal(r.data.overtimeVerified,true);mode='';
 // A forbidden plugin must never block ordinary date/time/duration/comment edits.
 mode='attr-denied';const beforeAttributes=structuredClone(records[7].workLogAttributes);let pluginBefore=calls.filter(c=>c.path.includes('/com.deniz.')).length;
 r=await patch({date:'2026-10-19',start:'09:30',timeSpent:'30m',description:'Ordinary edit despite plugin 403',overtime:false,updateOvertime:false});assert.equal(r.status,200);assert.equal(r.data.worklogVerified,true);assert.equal(r.data.editProvider,'jira');assert.equal(logs[0].started,'2026-10-19T09:30:00.000+0700');assert.equal(logs[0].timeSpentSeconds,1800);assert.deepEqual(records[7].workLogAttributes,beforeAttributes);assert.equal(calls.filter(c=>c.path.includes('/com.deniz.')).length,pluginBefore,'ordinary update never calls WorklogPRO');
 await patch({overtime:false,updateOvertime:false});
 process.env.WORKLOGPRO_OVERTIME_ATTRIBUTE_ID='23';r=await patch({overtime:true,updateOvertime:true});assert.equal(r.status,200,'configured ID avoids needing the forbidden global attribute list');delete process.env.WORKLOGPRO_OVERTIME_ATTRIBUTE_ID;mode='';
 mode='core-denied';r=await patch({overtime:false,updateOvertime:false});assert.equal(r.status,200);assert.equal(r.data.editProvider,'worklogpro-form');mode='core-ignored';r=await patch({description:'Will not be persisted',updateOvertime:false});assert.equal(r.data.details.resultUnknown,true);mode='';
 // OT-only and description-only updates do not revalidate an unchanged legacy schedule.
 logs[0].started='2026-10-16T02:00:23.000+0700';records[7].workStart=Date.parse(logs[0].started);r=await patch({start:'02:00',overtime:true,updateOvertime:true});assert.equal(r.status,409);assert.equal(logs[0].started,'2026-10-16T02:00:23.000+0700','never truncate original seconds in a minute-only native form');r=await patch({start:'02:00',description:'Correct legacy note',updateOvertime:false});assert.equal(r.status,200);await patch({updateOvertime:false});
 const sensitive=diagnostics({provider:'worklogpro',stage:'test',method:'GET',endpoint:'/attr',response:new Response('',{status:403}),data:{errorMessages:[`password=${auth.password} ${Buffer.from(auth.username+':'+auth.password).toString('base64')} old-cookie`],raw:'<input value=secret>'},auth:{...auth,cookie:'JSESSIONID=old-cookie'}});assert(!JSON.stringify(sensitive).includes(auth.password));assert(!JSON.stringify(sensitive).includes('old-cookie'));assert(!JSON.stringify(sensitive).includes('input'));
 logs[0].author.name='another-user';logs[0].author.key='OTHER';before=puts();r=await patch({overtime:true});assert.equal(r.status,403);assert.equal(puts(),before);
 assert(!calls.some(c=>/editmeta|\/field$/.test(c.path)||c.path.endsWith('/issue/EDIT-1')),'never uses issue-level OT fields');
 console.log('V1.12.1 independent edits and native WorklogPRO OT: field discovery, same-worklog form POST/readback, on/off/history, legacy marker cleanup, preserve attributes, rights/guards, ambiguity, unknown results and no write retries passed');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{global.fetch=originalFetch;if(oldSecret==null)delete process.env.APP_SESSION_SECRET;else process.env.APP_SESSION_SECRET=oldSecret;if(oldId==null)delete process.env.WORKLOGPRO_OVERTIME_ATTRIBUTE_ID;else process.env.WORKLOGPRO_OVERTIME_ATTRIBUTE_ID=oldId;if(server)await new Promise(r=>server.close(r));});
