'use strict';
const assert=require('node:assert/strict'),http=require('node:http');
const api=require('../api'),{createSessionCookie}=require('../lib/session'),{aggregate}=require('../lib/project-stats'),{filters}=require('../handlers/project-stats');
const original=global.fetch;let server,mode='',writes=0,queries=[];
const log=(id,author='a',started='2026-10-22T08:00:00.000+0700')=>({id:String(id),author:{key:author,displayName:author},started,timeSpentSeconds:1800,comment:'Fixture'});
(async()=>{
 process.env.APP_SESSION_SECRET='project-stats-v131-tests-secret-longer-than-32';delete process.env.WORKLOGPRO_OVERTIME_ATTRIBUTE_ID;
 const cookie=createSessionCookie({mode:'basic',username:'boss',password:'fixture',me:{name:'boss'}}).split(';')[0];
 global.fetch=async(url,opts={})=>{const u=new URL(url),p=u.pathname,m=opts.method||'GET';assert.equal(u.origin,'https://task.ascvn.com.vn');
  if(p==='/rest/api/2/search'){
   const b=m==='POST'?JSON.parse(opts.body):Object.fromEntries(u.searchParams);queries.push(b);assert(!b.jql.includes('worklogDate'));assert(!b.jql.includes('worklogAuthor'));assert(!b.jql.includes('assignee'));
   if(mode==='unauth')return Response.json({}, {status:401});if(mode==='denied')return Response.json({}, {status:403});
   const start=Number(b.startAt),project=b.jql.includes('project = "CAL"')?'CAL':'OTHER';
   return Response.json({startAt:mode==='bad-page'?start+1:start,total:mode==='empty'?0:start+1,issues:mode==='empty'?[]:[{key:project+'-1',fields:{summary:'Fixture',project:{key:project},issuetype:{subtask:true}}}]});
  }
  if(p.includes('/issue/')&&p.endsWith('/worklog')){
   if(m!=='GET'){writes++;throw Error('No writes allowed');}
   if(mode==='worklog-denied')return Response.json({}, {status:403});const start=Number(u.searchParams.get('startAt'));
   if(mode==='bad-worklog')return Response.json({total:2,startAt:start});
   const rows=start===0?[log(101),log(102,'b','2012-01-01T08:00:00.000+0700'),log(103,'a','2026-10-21T17:30:00.000Z')]:[log(104)];
   return Response.json({total:4,startAt:start,worklogs:rows});
  }
  if(p.endsWith('/attr'))return mode==='ot-denied'?Response.json({}, {status:403}):Response.json([{id:1,name:'Over Time?',type:'BOOL',enabled:true}]);
  if(p.includes('/latest/worklog')){const id=u.searchParams.get('id');return Response.json({projects:[{issues:[{key:'CAL-1',workLogs:[{id,workLogAttributes:[{attrTypeId:1,attrValue:id==='101'?'yes':'no'}]}]}]}]});}
  throw Error('Unexpected '+m+' '+p);
 };
 server=http.createServer((req,res)=>api(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const request=async(q={},auth=true,method='GET')=>{const r=await original(base+'/api?'+new URLSearchParams({action:'project-stats',from:'2026-10-22',to:'2026-10-22',...q}),{method,headers:auth?{cookie}:{}});return {status:r.status,data:await r.json(),headers:r.headers};};
 let r=await request();assert.equal(r.status,200);assert.equal(queries.at(-1).jql,'ORDER BY id ASC');assert.equal(r.data.issues[0].project,'OTHER');assert.equal(r.headers.get('cache-control'),'no-store');
 r=await request({project:'CAL',startAt:7000});assert.equal(r.status,200);assert.equal(queries.at(-1).startAt,7000,'No 5000 issue cap');
 r=await request({from:'2000-01-01',to:'2026-12-31'});assert.equal(r.status,200,'No date range cap');
 r=await request({op:'worklogs',project:'CAL',key:'CAL-1'});assert.equal(r.data.items.length,2);assert(r.data.hasMore);assert.equal(r.data.nextStartAt,3);assert(r.data.items[0].overtimeKnown);assert(r.data.items[0].overtime);
 let next=await request({op:'worklogs',project:'CAL',key:'CAL-1',startAt:3});assert(!next.data.hasMore);assert.equal(aggregate([...r.data.items,...next.data.items]).seconds,5400);
 r=await request({op:'worklogs',key:'CAL-1',all:1,from:'',to:''});assert.equal(r.data.items.length,3,'All time includes old worklogs');assert.equal(r.data.items[1].authorId,'b');
 assert.equal(filters({all:'1',startAt:'10001'}).startAt,10001);
 for(const q of [{project:'CAL" OR 1=1'},{from:'2026-02-30'},{to:'2020-01-01'},{startAt:-1},{startAt:'1.2'},{op:'delete'},{op:'worklogs',key:'OTHER-1',project:'CAL'}])assert.equal((await request(q)).status,400);
 assert.equal((await request({},false)).status,401);assert.equal((await request({},true,'POST')).status,405);
 mode='bad-page';assert.equal((await request()).status,502);mode='bad-worklog';assert.equal((await request({op:'worklogs',key:'CAL-1'})).status,502);mode='worklog-denied';assert.equal((await request({op:'worklogs',key:'CAL-1'})).status,403);
 mode='ot-denied';r=await request({op:'worklogs',key:'CAL-1'});assert(r.data.items.every(x=>!x.overtimeKnown));mode='denied';assert.equal((await request()).status,403);mode='empty';r=await request();assert.equal(r.data.issues.length,0);assert(!r.data.hasMore);
 mode='unauth';r=await request();assert.equal(r.status,401);assert(r.headers.get('set-cookie'));assert.equal(writes,0);
 console.log('Project stats V1.31: all/one projects, unlimited valid range/all-time, paged issues/worklogs beyond old caps, timezone/author/native OT, auth/validation/errors/no writes passed.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{global.fetch=original;if(server)await new Promise(r=>server.close(r));});
