'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),crypto=require('node:crypto');
const api=require('../api'),{createSessionCookie}=require('../lib/session'),{describe}=require('../lib/jira-create-fields');
assert.equal(describe('summary',{name:'Summary',schema:{type:'string'},required:true}).kind,'text','Create metadata without operations remains usable');
assert.equal(describe('summary',{schema:{type:'string'},operations:['add']}).kind,'unsupported','Explicit operation restrictions still apply');
const original=global.fetch,old=process.env.APP_SESSION_SECRET;let server;
(async()=>{
 process.env.APP_SESSION_SECRET='saved-filter-tests-secret-more-than-32-characters';const cookie=createSessionCookie({mode:'basic',username:'boss',password:'fixture',me:{name:'boss'}}).split(';')[0];let mode='',calls=[];
 const jql='project = CAL AND summary ~ "ORDER BY example"\nORDER BY priority DESC, key ASC';
 const filter=(id,name,owner='boss')=>({id,name,owner:{name:owner,displayName:owner,emailAddress:'private-email'},jql,subscriptions:'private',sharePermissions:['private'],favourite:false});
 const issue=i=>({key:'CAL-'+i,fields:{summary:'Công việc '+i,project:{key:'CAL'},issuetype:{id:'1',name:'Story'},status:{id:'1',name:'To Do',statusCategory:{key:'new'}}}});
 global.fetch=async(url,options={})=>{const u=new URL(url),method=options.method||'GET',body=options.body?JSON.parse(options.body):null;calls.push({path:u.pathname,method,body,query:u.searchParams});assert.equal(options.headers.Authorization,'Basic '+Buffer.from('boss:fixture').toString('base64'));
  if(mode==='expired')return Response.json({}, {status:401});
  if(u.pathname==='/rest/api/2/filter/my')return mode==='legacy'?Response.json({}, {status:404}):Response.json([filter('12','Owned'),filter('13','Also favourite')]);
  if(u.pathname==='/rest/api/2/filter/favourite')return Response.json([filter('13','Also favourite'),filter('14','Shared','alice')]);
  if(u.pathname==='/rest/api/2/filter/search'){assert(u.searchParams.has('owner')||u.searchParams.has('filterName'));return Response.json({values:[filter('15','Found'),filter('16','Other','alice')]});}
  if(u.pathname==='/rest/api/2/filter/12'){
   if(mode==='denied')return Response.json({}, {status:403});if(mode==='missing')return Response.json({}, {status:404});
   const row=filter('12','Owned');if(mode==='changed')row.jql='project = OTHER ORDER BY created';if(mode==='wrong-id')row.id='99';return Response.json(row);
  }
  if(u.pathname==='/rest/api/2/search'){
   if(mode==='fallback'&&method==='POST')return Response.json({}, {status:405});
   assert.equal(body?.jql||u.searchParams.get('jql'),jql,'Saved query and ordering are used without reconstruction');
   const startAt=Number(body?.startAt??u.searchParams.get('startAt')??0);return Response.json({startAt,total:26,issues:Array.from({length:startAt?1:25},(_,i)=>issue(startAt+i+1))});
  }throw Error('Unexpected '+u.pathname);
 };
 server=http.createServer((req,res)=>api(req,res).catch(e=>{res.statusCode=500;res.end(JSON.stringify({error:e.message}));}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const request=async(action,q={},method='GET',authenticated=true)=>{const r=await original(`http://127.0.0.1:${server.address().port}/api?`+new URLSearchParams({action,...q}),{method,headers:authenticated?{cookie}:{}});return {status:r.status,data:await r.json(),headers:r.headers};};
 let r=await request('jira-saved-filters');assert.equal(r.status,200);assert.equal(r.data.filters.length,3);assert(r.data.filters.find(f=>f.id==='13').favourite);assert(!JSON.stringify(r.data).includes('private'));assert(!JSON.stringify(r.data).includes(jql));assert(r.headers.get('cache-control').includes('no-store'));
 mode='legacy';r=await request('jira-saved-filters');assert(r.data.filters.some(f=>f.id==='15'));assert(!r.data.filters.some(f=>f.id==='16'),'Fallback owner listing does not relabel shared rows as owned');
 mode='';r=await request('jira-saved-filters',{q:'Other'});assert.equal(r.data.filters[0].id,'16');
 r=await request('jira-filter-issues',{filterId:'12'});assert.equal(r.status,200);assert.equal(r.data.issues.length,25);assert(r.data.hasMore);assert(!JSON.stringify(r.data).includes(jql));const revision=r.data.revision;assert.equal(revision,crypto.createHash('sha256').update(JSON.stringify(['12',jql])).digest('hex'));
 r=await request('jira-filter-issues',{filterId:'12',startAt:'25',revision});assert.equal(r.data.issues.length,1);assert(!r.data.hasMore);
 mode='changed';const count=calls.length;r=await request('jira-filter-issues',{filterId:'12',startAt:'25',revision});assert.equal(r.status,409);assert.equal(calls.length,count+1,'Changed filter stops before executing another search');
 mode='fallback';r=await request('jira-filter-issues',{filterId:'12'});assert.equal(r.status,200);assert.equal(calls.at(-1).method,'GET');
 for(const [value,status]of [['denied',403],['missing',404],['wrong-id',502]]){mode=value;r=await request('jira-filter-issues',{filterId:'12'});assert.equal(r.status,status);}
 mode='';for(const id of ['1 OR 1','../12','abc','']){r=await request('jira-filter-issues',{filterId:id});assert.equal(r.status,400);}
 r=await request('jira-filter-issues',{filterId:'12',startAt:'-1'});assert.equal(r.status,400);r=await request('jira-saved-filters',{q:'x'.repeat(101)});assert.equal(r.status,400);
 for(const action of ['jira-saved-filters','jira-filter-issues']){r=await request(action,{},'POST');assert.equal(r.status,405);r=await request(action,{},'GET',false);assert.equal(r.status,401);}
 mode='expired';r=await request('jira-saved-filters');assert.equal(r.status,401);assert(r.headers.get('set-cookie'));
 assert(calls.every(c=>c.method==='GET'||c.method==='POST'&&c.path==='/rest/api/2/search'));
 console.log('Saved filters: owned/favourites/shared search, sanitization, exact JQL/order, paging/revision, rights/fallback, no writes; create operations compatibility passed');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{global.fetch=original;if(old===undefined)delete process.env.APP_SESSION_SECRET;else process.env.APP_SESSION_SECRET=old;if(server)await new Promise(r=>server.close(r));});
