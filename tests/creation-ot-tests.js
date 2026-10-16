'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),api=require('../api'),{createSessionCookie}=require('../lib/session');
const originalFetch=global.fetch,oldSecret=process.env.APP_SESSION_SECRET;let server;
(async()=>{
 process.env.APP_SESSION_SECRET='creation-no-ot-field-test-32-characters';const cookie=createSessionCookie({mode:'basic',username:'create-user',password:'test-only',me:{name:'create-user'}}).split(';')[0];let writes=0,calls=[];
 const issue={key:'EDIT-1',fields:{project:{key:'EDIT'},summary:'Create test',status:{name:'Done',statusCategory:{key:'done'}}}};
 global.fetch=async(url,options={})=>{const u=new URL(String(url)),method=options.method||'GET',body=options.body?JSON.parse(options.body):{};calls.push(u.pathname);
  if(u.pathname.endsWith('/search'))return Response.json({issues:body.jql?.startsWith('key in')?[issue]:[],total:body.jql?.startsWith('key in')?1:0});
  if(u.pathname.endsWith('/worklog/updated'))return new Response('{}',{status:404});
  if(u.pathname.endsWith('/EDIT-1/worklog')){if(method==='POST'){writes++;return Response.json({id:String(writes),...body});}return Response.json({worklogs:[],total:0});}
  if(u.pathname.endsWith('/EDIT-1')&&method==='GET')return Response.json(issue);
  throw Error('Unexpected API '+method+' '+u.pathname);
 };
 server=http.createServer((req,res)=>api(req,res).catch(e=>{res.statusCode=500;res.end(JSON.stringify({error:e.message}));}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const body={key:'EDIT-1',project:'EDIT',date:'2026-10-16',timeSpent:'1h',description:'Create without OT'};
 const post=async(action,payload)=>{const r=await originalFetch(`http://127.0.0.1:${server.address().port}/api?action=${action}`,{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify(payload)});return {status:r.status,data:await r.json()};};
 let r=await post('worklog',{...body,overtime:true});assert.equal(r.status,400);assert.equal(writes,0);assert.equal(calls.length,0,'stale OT request rejected before any Jira call');
 r=await post('bulk-worklog',{date:body.date,items:[{...body,overtime:true}]});assert.equal(r.status,400);assert.equal(writes,0);
 r=await post('worklog',body);assert.equal(r.status,200);assert.equal(writes,1);
 r=await post('bulk-worklog',{date:body.date,items:[body]});assert.equal(r.status,200);assert.equal(writes,2);
 assert(!calls.some(p=>/editmeta|\/field$/.test(p)));console.log('V1.11.5 single/Bulk create without issue OT field, stale OT payload rejection passed');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{global.fetch=originalFetch;if(oldSecret==null)delete process.env.APP_SESSION_SECRET;else process.env.APP_SESSION_SECRET=oldSecret;if(server)await new Promise(r=>server.close(r));});
