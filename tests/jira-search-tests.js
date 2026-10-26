'use strict';
const assert=require('node:assert/strict'),http=require('node:http');
const {searchParams,publicIssue}=require('../lib/jira-search');
const api=require('../api'),{createSessionCookie}=require('../lib/session');
assert.equal(searchParams({q:'epu01-123',project:'EPU01',status:'3',type:'5',assignee:'@me'}).jql,'key = "EPU01-123" AND project = "EPU01" AND status = "3" AND issuetype = "5" AND assignee = currentUser() ORDER BY updated DESC, key ASC');
assert(searchParams({q:'hỗ trợ "test" OR assignee = admin'}).jql.startsWith('text ~ "\\"'));
assert(searchParams({assignee:'@unassigned'}).jql.includes('assignee is EMPTY'));
assert(searchParams({assignee:'a" OR project=X'}).jql.includes('assignee = "a\\" OR project=X"'));
for(const q of [{q:'x'},{q:'a\nb'},{q:'x'.repeat(161)},{project:'../x'},{startAt:'-1'},{startAt:'10001'}])assert.throws(()=>searchParams(q),e=>e.status===400);
assert.equal(publicIssue({key:'<script>'}),null);
const oldFetch=global.fetch,secret=process.env.APP_SESSION_SECRET;let server;
(async()=>{
 process.env.APP_SESSION_SECRET='jira-search-tests-only-secret-32-characters';
 const cookie=createSessionCookie({mode:'basic',username:'boss',password:'fixture',me:{name:'boss'}}).split(';')[0];
 let mode='',calls=[];
 const issue={key:'EPU01-123',fields:{summary:'<img src=x onerror=alert(1)>',project:{key:'EPU01',name:'Điện lực'},issuetype:{id:'5',name:'Sub-task',subtask:true},status:{id:'3',name:'In Progress',statusCategory:{key:'indeterminate'}},assignee:{name:'someone',displayName:'Nhân sự',emailAddress:'must-not-expose'},priority:{name:'High'},updated:'2026-10-22T08:00:00.000+0700',parent:{key:'EPU01-12'},description:'must-not-expose'}};
 global.fetch=async(url,options={})=>{
  const u=new URL(String(url)),method=options.method||'GET',body=options.body?JSON.parse(options.body):{};calls.push({path:u.pathname,method,body,query:u.searchParams});
  assert.equal(options.headers.Authorization,'Basic '+Buffer.from('boss:fixture').toString('base64'));
  if(mode==='expired')return Response.json({}, {status:401});
  if(mode==='denied')return Response.json({}, {status:403});
  if(u.pathname.endsWith('/search')){
   if(mode==='fallback'&&method==='POST')return Response.json({}, {status:405});
   if(mode==='bad-search')return Response.json({issues:null,total:1});
   if(mode==='invalid-jql')return Response.json({errorMessages:['private diagnostic']},{status:400});
   const startAt=Number(body.startAt??u.searchParams.get('startAt')??0);
   return Response.json({issues:mode==='empty'?[]:[issue],total:mode==='empty'?0:26,startAt});
  }
  assert.equal(method,'GET');
  if(u.pathname==='/rest/api/2/project')return Response.json([{key:'EPU01',name:'Điện lực',secret:'private'}]);
  if(u.pathname==='/rest/api/2/status')return mode==='partial'?Response.json({}, {status:403}):Response.json([{id:'3',name:'In Progress'},{id:'3',name:'In Progress'}]);
  if(u.pathname==='/rest/api/2/issuetype')return Response.json([{id:'5',name:'Sub-task'},{id:'1',name:'Story'}]);
  if(u.pathname==='/rest/api/2/project/EPU01/statuses')return Response.json([{id:'5',name:'Sub-task',statuses:[{id:'3',name:'In Progress'}]}]);
  throw Error('Unexpected endpoint '+u.pathname);
 };
 server=http.createServer((req,res)=>api(req,res).catch(e=>{res.statusCode=500;res.end(JSON.stringify({error:e.message}));}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const request=async(action,params={},auth=true,method='GET')=>{const r=await oldFetch(`http://127.0.0.1:${server.address().port}/api?`+new URLSearchParams({action,...params}),{method,headers:auth?{cookie}:{}});return {status:r.status,data:await r.json(),headers:r.headers};};
 let r=await request('jira-search',{q:'EPU01-123'});assert.equal(r.status,200);assert.equal(r.data.issues[0].parent,'EPU01-12');assert.equal(r.data.issues[0].url,'https://task.ascvn.com.vn/browse/EPU01-123');assert.equal(r.data.hasMore,true);assert.equal(r.data.nextStartAt,1);assert(!JSON.stringify(r.data).includes('must-not-expose'));assert(r.headers.get('cache-control').includes('no-store'));
 r=await request('jira-search',{q:'Supporting',startAt:'25',assignee:'someone'});assert.equal(r.data.startAt,25);assert.equal(r.data.hasMore,false);assert(calls.at(-1).body.jql.includes('assignee = "someone"'));
 mode='fallback';r=await request('jira-search',{q:'EPU01-123'});assert.equal(r.status,200);assert.equal(calls.at(-1).method,'GET');assert(calls.at(-1).query.get('jql').includes('key = "EPU01-123"'));
 mode='empty';r=await request('jira-search',{q:'nothing'});assert.deepEqual(r.data.issues,[]);assert.equal(r.data.hasMore,false);
 mode='';r=await request('jira-search-options');assert.equal(r.data.statuses.length,1);assert.equal(r.data.types.length,2);assert.deepEqual(r.data.projects,[{key:'EPU01',name:'Điện lực'}]);
 r=await request('jira-search-options',{project:'EPU01'});assert.equal(r.data.types[0].name,'Sub-task');assert.equal(r.data.statuses[0].id,'3');
 mode='partial';r=await request('jira-search-options');assert.equal(r.status,200);assert.equal(r.data.statuses.length,0);assert.equal(r.data.warnings.length,1);
 mode='bad-search';r=await request('jira-search');assert.equal(r.status,502);
 mode='invalid-jql';r=await request('jira-search');assert.equal(r.status,400);assert(!JSON.stringify(r.data).includes('private diagnostic'));
 mode='denied';r=await request('jira-search');assert.equal(r.status,403);
 mode='expired';for(const action of ['jira-search','jira-search-options']){r=await request(action);assert.equal(r.status,401);assert(r.headers.get('set-cookie'));}
 mode='';const before=calls.length;for(const action of ['jira-search','jira-search-options']){r=await request(action,{},false);assert.equal(r.status,401);r=await request(action,{},true,'POST');assert.equal(r.status,405);}assert.equal(calls.length,before);
 r=await request('jira-search',{q:'x'});assert.equal(r.status,400);r=await request('jira-search-options',{project:'../x'});assert.equal(r.status,400);
 mode='';r=await request('jira-search',{keys:'EPU01-123,EPU01-12'});assert.equal(r.status,200);assert.equal(calls.at(-1).body.jql,'key in ("EPU01-123","EPU01-12") ORDER BY key ASC');assert.equal(calls.at(-1).body.maxResults,10);
 for(const keys of ['EPU01-1) OR project=X','../bad',Array.from({length:11},(_,i)=>'EPU01-'+i).join(',')]){r=await request('jira-search',{keys});assert.equal(r.status,400);}
 assert(calls.every(x=>x.method==='GET'||(x.method==='POST'&&x.path==='/rest/api/2/search')),'Feature performs no Jira writes');
 console.log('Jira search: literal queries, exact keys, filters, pagination, metadata, permissions, expired sessions, read-only and data minimization passed');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{global.fetch=oldFetch;if(secret===undefined)delete process.env.APP_SESSION_SECRET;else process.env.APP_SESSION_SECRET=secret;if(server)await new Promise(r=>server.close(r));});
