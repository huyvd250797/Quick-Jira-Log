'use strict';
const assert=require('node:assert/strict'),http=require('node:http');
const api=require('../api'),{createSessionCookie}=require('../lib/session');
const originalFetch=global.fetch,secret=process.env.APP_SESSION_SECRET;let server;
(async()=>{
 process.env.APP_SESSION_SECRET='working-tree-fixture-secret-at-least-32-characters';
 const cookie=createSessionCookie({mode:'basic',username:'boss',password:'fixture',me:{name:'boss'}}).split(';')[0];let mode='',calls=[];
 global.fetch=async(url,opts={})=>{
  const u=new URL(url);calls.push({path:u.pathname,method:opts.method||'GET',body:opts.body?JSON.parse(opts.body):null,query:u.searchParams});
  if(mode==='expired')return Response.json({}, {status:401});if(mode==='denied')return Response.json({}, {status:403});
  if(u.pathname.endsWith('/field'))return Response.json(mode==='missing'?[]:[{id:'customfield_10001',schema:{custom:'com.pyxis.greenhopper.jira:gh-epic-link'}}]);
  if(u.pathname.endsWith('/issuetype'))return Response.json([{id:'10',name:'Epic'}]);
  if(u.pathname.includes('/issue/'))return Response.json({key:'EPU01-1',fields:{issuetype:{id:'10',name:'Epic'}}});
  if(mode==='fallback'&&opts.method==='POST')return Response.json({}, {status:405});
  const b=opts.body?JSON.parse(opts.body):Object.fromEntries(u.searchParams);
  if(mode==='partial'){const start=Number(b.startAt);return Response.json({issues:start?[{key:'EPU01-2831',fields:{summary:'Quản lý Hồ sơ',issuetype:{id:'1',name:'Story'}}}]:Array.from({length:25},(_,i)=>({key:'EPU01-'+(i+10),fields:{summary:'Khác',issuetype:{id:'1',name:'Story'}}})),total:26,startAt:start});}
  return Response.json({issues:[{key:'OTHER-2',fields:{summary:'<script>literal</script>',issuetype:{id:'1',name:'Story'},project:{key:'OTHER'},customfield_10001:'EPU01-1'}}],total:26,startAt:mode==='bad'?99:Number(b.startAt)});
 };
 server=http.createServer((req,res)=>api(req,res).catch(e=>{res.statusCode=500;res.end(JSON.stringify({error:e.message}));}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const request=async(q={},auth=true,method='GET')=>{const r=await originalFetch(`http://127.0.0.1:${server.address().port}/api?`+new URLSearchParams({action:'jira-working-tree',project:'EPU01',...q}),{method,headers:auth?{cookie}:{}});return {status:r.status,data:await r.json(),headers:r.headers};};
 let r=await request();assert.equal(r.status,200);assert.equal(r.data.source,'jira');assert.equal(r.data.hasMore,true);assert(r.headers.get('cache-control').includes('no-store'));assert(calls.at(-1).body.jql.includes('issuetype = "10"'));
 r=await request({kind:'children',key:'EPU01-1'});assert.equal(r.status,200);assert.equal(r.data.issues[0].epic,'EPU01-1');assert(calls.at(-1).body.jql.includes('cf[10001] = "EPU01-1"'));assert(!calls.at(-1).body.jql.includes('project ='),'Epic children may cross projects');
 r=await request({kind:'search',q:'hello " OR project=X'});assert.equal(r.status,200);assert(calls.at(-1).body.jql.includes('subTaskIssueTypes()'));assert(!calls.at(-1).body.jql.includes('text ~'),'Partial matching uses source pages, not exact Lucene phrase');
 r=await request({kind:'epics',q:'EPU01-1',startAt:'25'});assert.equal(r.status,200);assert(!calls.at(-1).body.jql.includes('key ='),'Partial codes must not become exact-key filters');assert.equal(r.data.hasMore,false);
 r=await request({kind:'children',key:'EPU01-1',q:'other-'});assert.equal(r.data.issues.length,1);assert.equal(r.data.filtered,true);
 r=await request({kind:'children',key:'EPU01-1',q:'script'});assert.equal(r.data.issues.length,1);
 for(const q of [{project:'EPU01 OR 1=1'},{kind:'bad'},{kind:'children',key:'x"'},{startAt:'-1'}])assert.equal((await request(q)).status,400);
 assert.equal((await request({kind:'subtasks',key:'EPU01-1'})).status,400);
 for(const [m,status] of [['missing',422],['expired',401],['denied',403],['bad',502]]){mode=m;assert.equal((await request()).status,status,m);}
 mode='partial';r=await request({kind:'children',key:'EPU01-1',q:'quan ho'});assert.equal(r.data.issues[0].key,'EPU01-2831');assert.equal(r.data.nextStartAt,26);r=await request({kind:'children',key:'EPU01-1',q:'283'});assert.equal(r.data.issues[0].key,'EPU01-2831');
 mode='fallback';assert.equal((await request()).status,200);assert.equal(calls.at(-1).method,'GET');
 mode='';const count=calls.length;assert.equal((await request({},false)).status,401);assert.equal((await request({},true,'POST')).status,405);assert.equal(calls.length,count);
 r=await request({kind:'children',key:'EPU01-1',status:'3',assignee:'@me'});assert.equal(r.status,200);assert(calls.at(-1).body.jql.includes('status = "3" AND assignee = currentUser()'));assert(!calls.at(-1).body.jql.includes('project ='));
 r=await request({kind:'children',key:'EPU01-1',assignee:'@unassigned'});assert(calls.at(-1).body.jql.includes('assignee is EMPTY'));
 r=await request({kind:'children',key:'EPU01-1',assignee:'a" OR project=X'});assert.equal(r.status,200);assert(calls.at(-1).body.jql.includes('assignee = "a\\" OR project=X"'));
 for(const q of [{status:'3 OR 1=1'},{assignee:'bad\nuser'},{assignee:'x'.repeat(256)}])assert.equal((await request(q)).status,400);
 assert(calls.every(c=>c.method==='GET'||c.path.endsWith('/search')),'No Jira mutations');
 console.log('Working Tree API: hierarchy discovery, cross-project children, literal search, paging, permissions, read-only and error handling passed');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{global.fetch=originalFetch;if(secret===undefined)delete process.env.APP_SESSION_SECRET;else process.env.APP_SESSION_SECRET=secret;if(server)await new Promise(r=>server.close(r));});
