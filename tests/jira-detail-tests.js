'use strict';
const assert=require('node:assert/strict'),http=require('node:http');
const {normalize,render,safeUrl}=require('../lib/jira-content'),{params}=require('../lib/jira-issue-detail');
const api=require('../api'),{createSessionCookie}=require('../lib/session');
for(const key of ['../x','<img>','ABC-1/extra',''])assert.throws(()=>params({key}),e=>e.status===400);
assert.throws(()=>params({key:'ABC-1',startAt:'-1'}));assert.equal(params({key:'abc-1'}).key,'ABC-1');
const rich=render('h2. Mô tả\n* Dòng *đậm*\n||Cột A||Cột B||\n|Một|Hai|\n{code:js}\n<img onerror=x>\n{code}\n[Link|https://example.com/a?q=1&b=2]');
assert(rich.includes('<h3>Mô tả</h3>'));assert(rich.includes('<ul>'));assert(rich.includes('<th>'));assert(rich.includes('&lt;img'));assert(!rich.includes('<img'));assert(rich.includes('rel="noopener noreferrer"'));
for(const url of ['javascript:alert(1)','data:text/html,x','https://user:pass@example.com','https://ex ample.com','\njava\nscript:alert(1)'])assert.equal(safeUrl(url),'');
for(const value of ['<script>alert(1)</script>','[x|javascript:alert(1)]','[x|data:text/html,evil]','*<img src=x onerror=x>*']){const html=render(value);assert(!html.includes('<script'));assert(!html.includes('<img'));assert(!html.includes('href="javascript:'));assert(!html.includes('href="data:'));}
assert.equal(normalize('x'.repeat(200001)).text.length,200000);assert(normalize('x'.repeat(200001)).truncated);
const adf=normalize({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Xin chào '},{type:'mention',attrs:{text:'Boss'}}]},{type:'mediaGroup',content:[{type:'media',attrs:{id:'private'}}]}]});assert(adf.text.includes('Xin chào Boss'));assert(!adf.text.includes('private'));assert(normalize(null).text==='');
const oldFetch=global.fetch,secret=process.env.APP_SESSION_SECRET;let server;
(async()=>{
 process.env.APP_SESSION_SECRET='jira-detail-tests-only-secret-32-characters';
 const cookie=createSessionCookie({mode:'basic',username:'boss',password:'fixture',me:{name:'boss'}}).split(';')[0];let mode='',calls=[];
 const makeIssue=key=>({key,fields:{summary:'Công việc <script>evil</script>',project:{key:'CAL',name:'Dự án'},issuetype:{id:'5',name:key==='CAL-1'?'Story':'Sub-task',subtask:key!=='CAL-1'},status:{id:'3',name:'Doing',statusCategory:{key:'indeterminate'}},assignee:{name:'boss',displayName:'Boss',emailAddress:'private-email'},priority:{id:'2',name:'High'},reporter:{name:'reporter',displayName:'Reporter',emailAddress:'private-email'},created:'2026-10-20T08:00:00.000+0700',updated:'2026-10-22T08:00:00.000+0700',parent:key==='CAL-1'?null:{key:'CAL-1'},description:'h2. Nội dung\n<script>text only</script>\n* Dòng 1'}});
 const worklogs=Array.from({length:60},(_,i)=>({id:String(1000+i),started:'2026-10-22T08:00:00.000+0700',timeSpentSeconds:i===0?3661:i===1?0:i===2?null:1800,author:{name:'boss',displayName:'Boss',emailAddress:'private-email',avatarUrls:{48:'private-url'}},comment:i===0?null:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Đã xử lý <img src=x>'}]}]},visibility:{type:'group',value:'private-group'}}));
 global.fetch=async(url,options={})=>{
  const u=new URL(String(url)),method=options.method||'GET',body=options.body?JSON.parse(options.body):{};calls.push({path:u.pathname,method,body});assert.equal(options.headers.Authorization,'Basic '+Buffer.from('boss:fixture').toString('base64'));
  if(mode==='expired')return Response.json({}, {status:401});
  if(u.pathname==='/rest/api/2/search'){
   if(mode==='fallback'&&method==='POST')return Response.json({}, {status:405});
   const startAt=Number(body.startAt??u.searchParams.get('startAt')??0);assert((body.jql||u.searchParams.get('jql')).includes('parent = "CAL-1"'));
   const rows=Array.from({length:30},(_,i)=>makeIssue('CAL-'+(i+2))).slice(startAt,startAt+25);if(mode==='wrong-parent')rows[0].fields.parent.key='OTHER-1';return Response.json({issues:rows,total:30,startAt});
  }
  if(u.pathname.endsWith('/worklog')){
   if(mode==='worklog-denied')return Response.json({}, {status:403});
   if(mode==='invalid-worklog')return Response.json({worklogs:[{id:'bad'}],total:1,startAt:0});
   if(mode==='worklog-legacy')return Response.json({worklogs,total:60,startAt:0,maxResults:1000000});
   const startAt=Number(u.searchParams.get('startAt')||0);return Response.json({worklogs:worklogs.slice(startAt,startAt+25),total:60,startAt});
  }
  if(u.pathname.startsWith('/rest/api/2/issue/')){
   if(mode==='revoked')return Response.json({}, {status:403});
   if(mode==='missing')return Response.json({}, {status:404});
   const key=u.pathname.split('/').at(-1);return Response.json(makeIssue(mode==='wrong-key'?'CAL-999':key));
  }
  throw Error('Unexpected '+u.pathname);
 };
 server=http.createServer((req,res)=>api(req,res).catch(e=>{res.statusCode=500;res.end(JSON.stringify({error:e.message}));}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const request=async(action,q={},auth=true,method='GET')=>{const r=await oldFetch(`http://127.0.0.1:${server.address().port}/api?`+new URLSearchParams({action,key:'CAL-1',...q}),{method,headers:auth?{cookie}:{}});return {status:r.status,data:await r.json(),headers:r.headers};};
 let r=await request('jira-issue');assert.equal(r.status,200);assert(r.data.issue.description.text.includes('<script>'));assert.equal(r.data.issue.key,'CAL-1');assert.equal(r.data.issue.reporter.displayName,'Reporter');assert.equal(r.data.issue.created,'2026-10-20T08:00:00.000+0700');assert.equal(r.data.issue.priorityId,'2');assert(!JSON.stringify(r.data).includes('private-email'));assert(r.headers.get('cache-control').includes('no-store'));
 r=await request('jira-issue',{key:'CAL-2'});assert.equal(r.data.issue.parent,'CAL-1');
 r=await request('jira-issue-subtasks');assert.equal(r.data.items.length,25);assert.equal(r.data.nextStartAt,25);assert.equal(r.data.hasMore,true);
 r=await request('jira-issue-subtasks',{startAt:'25'});assert.equal(r.data.items.length,5);assert.equal(r.data.hasMore,false);
 mode='fallback';r=await request('jira-issue-subtasks');assert.equal(r.status,200);assert.equal(calls.at(-1).method,'GET');
 mode='wrong-parent';r=await request('jira-issue-subtasks');assert.equal(r.status,502);
 mode='';r=await request('jira-issue-worklogs');assert.equal(r.data.items.length,25);assert.equal(r.data.items[0].timeSpentSeconds,3661);assert.equal(r.data.items[1].timeSpentSeconds,0);assert.equal(r.data.items[2].timeSpentSeconds,null);assert.equal(r.data.items[0].comment.text,'');assert(!JSON.stringify(r.data).includes('private-'));
 const ids=[];mode='worklog-legacy';for(const offset of [0,25,50]){r=await request('jira-issue-worklogs',{startAt:String(offset)});assert.equal(r.status,200);ids.push(...r.data.items.map(x=>x.id));assert.equal(r.data.items.length,offset===50?10:25);}assert.equal(new Set(ids).size,60);assert.equal(r.data.hasMore,false);
 mode='worklog-denied';r=await request('jira-issue-worklogs');assert.equal(r.status,403);mode='';r=await request('jira-issue');assert.equal(r.status,200,'Main description remains independently available');
 mode='invalid-worklog';r=await request('jira-issue-worklogs');assert.equal(r.status,502);
 mode='revoked';const before=calls.length;r=await request('jira-issue-worklogs');assert.equal(r.status,403);assert.equal(calls.length,before+1,'Recheck issue visibility before reading child data');
 mode='missing';r=await request('jira-issue');assert.equal(r.status,404);mode='wrong-key';r=await request('jira-issue');assert.equal(r.status,502);
 mode='expired';for(const action of ['jira-issue','jira-issue-subtasks','jira-issue-worklogs']){r=await request(action);assert.equal(r.status,401);assert(r.headers.get('set-cookie'));}
 mode='';for(const action of ['jira-issue','jira-issue-subtasks','jira-issue-worklogs']){r=await request(action,{},false);assert.equal(r.status,401);r=await request(action,{},true,'POST');assert.equal(r.status,405);r=await request(action,{key:'../x'});assert.equal(r.status,400);}
 assert(calls.every(x=>x.method==='GET'||(x.method==='POST'&&x.path==='/rest/api/2/search')));
 console.log('Issue detail: permissions, parent/subtasks, paged/legacy worklogs, exact seconds, private fields, wiki/ADF safety, errors and read-only API passed');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{global.fetch=oldFetch;if(secret===undefined)delete process.env.APP_SESSION_SECRET;else process.env.APP_SESSION_SECRET=secret;if(server)await new Promise(r=>server.close(r));});
