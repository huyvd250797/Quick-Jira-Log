'use strict';
const assert=require('node:assert/strict'),http=require('node:http');
const handler=require('../handlers/worklog-correction'),history=require('../handlers/worklog-history'),{createSessionCookie}=require('../lib/session');
const {readLabel}=require('../lib/worklog-label');
const native=require('../lib/worklogpro');
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
  const u=new URL(String(url)),method=options.method||'GET',body=options.body?JSON.parse(options.body):{};calls.push({path:u.pathname,method,body});
  if(u.pathname==='/rest/com.deniz.jira.worklog/1.0/attr'){
   if(mode==='attr-denied')return Response.json({}, {status:403});
   if(mode==='attr-missing')return Response.json({}, {status:404});
   return Response.json(attributes);
  }
  const match=u.pathname.match(/^\/rest\/com.deniz.jira.worklog\/1.0\/worklog\/(\d+)$/);
  if(match){const id=match[1];if(!records[id])return Response.json({}, {status:404});
   if(method==='PUT'){
    if(mode==='put-denied')return Response.json({}, {status:403});
    if(mode==='network-after-write'){records[id]={...records[id],...body,workStart:Date.parse(body.workStart)};logs.find(x=>x.id===id).comment=body.comment;throw Error('Connection lost after commit');}
    const attrs=mode==='ignored-ot'?records[id].workLogAttributes:body.workLogAttributes;
    records[id]={...records[id],...body,workStart:Date.parse(body.workStart),workLogAttributes:attrs};
    Object.assign(logs.find(x=>x.id===id),{comment:body.comment,started:body.workStart,timeSpentSeconds:body.timeSpent});
    return Response.json(records[id]);
   }
   if(mode==='verify-denied'&&calls.at(-2)?.method==='PUT')return Response.json({}, {status:403});
   if(mode==='slow-clock'&&advanceClock)advanceClock();
   return Response.json(records[id]);
  }
  if(u.pathname.endsWith('/search'))return Response.json({issues:[{key:'EDIT-1',fields:{summary:'Native OT',project:{key:'EDIT'},status:{name:'Done'}}}],total:1});
  if(u.pathname.endsWith('/worklog/updated'))return new Response('{}',{status:404});
  if(u.pathname.endsWith('/EDIT-1/worklog'))return Response.json({worklogs:logs,total:logs.length});
  if(u.pathname.endsWith('/EDIT-1/worklog/7')&&method==='PUT'){Object.assign(logs[0],{started:body.started,timeSpentSeconds:body.timeSpentSeconds,comment:body.comment});records[7].comment=body.comment;return Response.json(logs[0]);}
  throw Error('Unexpected '+method+' '+u.pathname);
 };
 server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');req.query=Object.fromEntries(u.searchParams);(req.method==='GET'?history:handler)(req,res).catch(e=>{res.statusCode=500;res.end(JSON.stringify({error:e.message}));});});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const patch=async(extra={})=>{const r=await originalFetch(`http://127.0.0.1:${server.address().port}`,{method:'PATCH',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({key:'EDIT-1',worklogId:'7',date:'2026-10-16',start:'08:00',timeSpent:'1h',description:'Changed description',...extra})});return {status:r.status,data:await r.json()};};
 const read=async()=>{const r=await originalFetch(`http://127.0.0.1:${server.address().port}/?date=2026-10-16&key=EDIT-1&force=1`,{headers:{cookie}});assert.equal(r.status,200);return r.json();};
 const puts=()=>calls.filter(c=>c.method==='PUT').length;
 let result=await read(),byId=Object.fromEntries(result.items.map(x=>[x.id,x]));assert.equal(byId['7'].overtime,false,'legacy marker never overrides unchecked Jira field');assert.equal(byId['7'].legacyOvertime,true);assert.equal(byId['7'].overtimeKnown,true);assert.equal(byId['8'].overtime,true,'native OT works without a marker');
 const sibling=structuredClone(records[8]);
 let r=await patch({overtime:true,updateOvertime:true});assert.equal(r.status,200);assert.equal(r.data.overtimeVerified,true);assert.equal(r.data.overtimeSource,'worklogpro');assert(native.overtimeOf(records[7],{id:23}));assert.equal(logs[0].comment,'Changed description');assert.equal(logs[0].started,original.started,'checkbox never shifts time');assert.deepEqual(records[8],sibling,'other worklogs untouched');
 assert.deepEqual(records[7].workLogAttributes.filter(a=>a.attrTypeId!==23),[{attrTypeId:9,attrValue:'yes'},{attrTypeId:12,attrValue:'CUSTOM'}]);
 const put=calls.find(c=>c.method==='PUT');assert.equal(put.path,'/rest/com.deniz.jira.worklog/1.0/worklog/7');assert.equal(put.body.adjustEstimate,'leave');assert.equal(put.body.authorUserKey,'JIRAUSER123');assert(!put.body.comment.includes('Quick Jira Log:'));
 const written=calls.findIndex(c=>c.method==='PUT');assert.equal(calls[written+1].method,'GET','success requires a separate read-back');
 r=await patch({overtime:false,updateOvertime:false,description:'Only text changed'});assert.equal(r.status,200);assert.equal(r.data.overtime,true,'untouched stale checkbox preserves actual Jira OT');
 r=await patch({description:'Legacy client without OT'});assert.equal(r.status,200);assert(native.overtimeOf(records[7],{id:23}),'legacy no-OT edit preserves plugin attributes');
 r=await patch({overtime:false,updateOvertime:true});assert.equal(r.status,200);assert.equal(native.overtimeOf(records[7],{id:23}),false);
 let before=puts();r=await patch({overtime:true,start:'10:00'});assert.equal(r.status,409);assert.equal(puts(),before,'overlap blocked before plugin write');r=await patch({overtime:true,start:'12:30'});assert.equal(r.status,409);assert.equal(puts(),before);
 for(const failure of ['attr-denied','attr-missing','put-denied']){mode=failure;const snapshot=structuredClone(records);r=await patch({overtime:true});assert.notEqual(r.status,200);assert.deepEqual(records,snapshot);}
 mode='';const goodAttributes=attributes;for(const invalid of [[],[...attributes, {...attributes[0],id:24}], [{...attributes[0],type:'STRING'}],[{...attributes[0],enabled:false}]]){attributes=invalid;before=puts();r=await patch({overtime:true});assert.equal(r.status,409);assert.equal(puts(),before);}attributes=goodAttributes;
 process.env.WORKLOGPRO_OVERTIME_ATTRIBUTE_ID='23';attributes=[...attributes,{...attributes[0],id:24}];r=await patch({overtime:true});assert.equal(r.status,200,'explicit ID disambiguates two OT fields');delete process.env.WORKLOGPRO_OVERTIME_ATTRIBUTE_ID;attributes=goodAttributes;
 r=await patch({overtime:false});assert.equal(r.status,200);
 for(const failure of ['ignored-ot','verify-denied','network-after-write']){mode=failure;before=puts();r=await patch({overtime:true});assert.notEqual(r.status,200);assert.equal(r.data.details.resultUnknown,true);assert.equal(puts(),before+1,'non-idempotent plugin PUT is never retried');mode='';await patch({overtime:false});}
 const realNow=Date.now;let clock=realNow();Date.now=()=>clock;advanceClock=()=>{clock+=19000;};mode='slow-clock';
 try{const many=Array.from({length:20},(_,i)=>({id:String(i+7),overtime:true}));const enriched=await native.enrichHistory(many,auth);assert.equal(enriched.unavailable,19);assert.equal(many.filter(x=>x.overtimeKnown===true).length,1,'budget retains verified items and explicitly marks unqueried entries unknown');assert(many.slice(1).every(x=>x.overtimeKnown===false&&!x.overtime));}finally{Date.now=realNow;mode='';advanceClock=null;}
 mode='attr-denied';result=await read();assert.equal(result.sourceDetails.overtimeUnavailable,2);assert(result.items.every(x=>x.overtimeKnown===false&&!x.overtime));mode='';
 logs[0].author.name='another-user';logs[0].author.key='OTHER';before=puts();r=await patch({overtime:true});assert.equal(r.status,403);assert.equal(puts(),before);
 assert(!calls.some(c=>/editmeta|\/field$/.test(c.path)||c.path.endsWith('/issue/EDIT-1')),'never uses issue-level OT fields');
 console.log('V1.11.8 native WorklogPRO OT: field discovery, same-worklog PUT/readback, on/off/history, legacy marker cleanup, preserve attributes, rights/guards, ambiguity, unknown results and no write retries passed');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{global.fetch=originalFetch;if(oldSecret==null)delete process.env.APP_SESSION_SECRET;else process.env.APP_SESSION_SECRET=oldSecret;if(oldId==null)delete process.env.WORKLOGPRO_OVERTIME_ATTRIBUTE_ID;else process.env.WORKLOGPRO_OVERTIME_ATTRIBUTE_ID=oldId;if(server)await new Promise(r=>server.close(r));});
