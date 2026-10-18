'use strict';
const assert=require('node:assert/strict'),http=require('node:http');
const api=require('../api'),{createSessionCookie}=require('../lib/session');
const {authorIsUser,quoteJql}=require('../lib/calendar-users');
assert(!authorIsUser({author:{key:'WRONG',name:'other',displayName:'Same'}},{key:'OTHER',name:'other',displayName:'Same'}));
assert(!authorIsUser({author:{displayName:'Same'}},{key:'OTHER',name:'other',displayName:'Same'}));
assert(authorIsUser({author:{key:'OTHER',name:'old-name'}},{key:'OTHER',name:'renamed'}));
assert.equal(quoteJql('ab" OR x=1\\'), '"ab\\" OR x=1\\\\"');
const oldFetch=global.fetch,oldSecret=process.env.APP_SESSION_SECRET;let server;
(async()=>{
 process.env.APP_SESSION_SECRET='calendar-viewer-test-secret-at-least-32';
 const me={name:'boss',key:'BOSS'},other={name:'other',key:'OTHER',displayName:'Same'},third={name:'third',key:'THIRD',displayName:'Same'};
 const cookie=createSessionCookie({mode:'basic',username:'boss',password:'fixture-only',me}).split(';')[0];
 let mode='',calls=[],allDenied=false;
 const logs=[
  {id:'1',author:me,started:'2026-10-16T15:00:00.000+0700',timeSpentSeconds:3600,comment:'Mine'},
  {id:'2',author:other,started:'2026-10-16T01:00:00.000Z',timeSpentSeconds:3661,comment:'Other OT'},
  {id:'3',author:third,started:'2026-10-16T08:00:00.000+0700',timeSpentSeconds:1800,comment:'Third'},
  {id:'4',author:other,started:'2026-10-15T20:00:00.000+0700',timeSpentSeconds:3600,comment:'Outside range'},
  {id:'5',author:{key:'WRONG',name:'other',displayName:'Same'},started:'2026-10-16T08:00:00.000+0700',timeSpentSeconds:3600,comment:'Wrong stable identity'}
 ];
 global.fetch=async(url,options={})=>{
  const u=new URL(String(url)),method=options.method||'GET',body=options.body?JSON.parse(options.body):{},jql=body.jql||u.searchParams.get('jql')||'';
  calls.push({path:u.pathname,method,jql});assert.equal(options.headers.Authorization,'Basic '+Buffer.from('boss:fixture-only').toString('base64'),'selected user never becomes authentication');
  if(u.pathname.endsWith('/user/picker'))return mode==='picker-denied'?Response.json({}, {status:404}):Response.json({users:[other,third,{...other,html:'<img onerror=x>'},{name:'no-key'}]});
  if(u.pathname.endsWith('/user')){
   if(mode==='resolve-denied')return Response.json({}, {status:403});
   if(mode==='expired')return Response.json({}, {status:401});
   const target=u.searchParams.get('key')==='THIRD'?third:other;return Response.json(mode==='wrong-user'?third:target);
  }
  if(u.pathname.endsWith('/search')){
   if(mode==='post-denied'&&method==='POST'&&jql.startsWith('worklogAuthor'))return Response.json({}, {status:403});
   if(allDenied)return Response.json({}, {status:403});
   const issue={key:'CAL-1',fields:{project:{key:'CAL'},summary:'Shared task',status:{name:'Done'}}};
   return Response.json({issues:[issue],total:1,startAt:0});
  }
  if(u.pathname.endsWith('/issue/CAL-1/worklog')){
   if(mode==='worklogs-denied')return Response.json({}, {status:403});
   const start=Number(u.searchParams.get('startAt')||0);return Response.json({worklogs:logs.slice(start,start+2),total:logs.length,startAt:start});
  }
  if(u.pathname.endsWith('/1.0/attr'))return Response.json([{id:1,name:'Over Time?',type:'BOOL',enabled:true}]);
  if(u.pathname.endsWith('/latest/worklog')){
   if(mode==='ot-denied')return Response.json({}, {status:403});
   const id=u.searchParams.get('id');return Response.json({projects:[{issues:[{key:'CAL-1',workLogs:[{id:Number(id),workLogAttributes:[{attrTypeId:1,attrValue:id==='2'?'true':'false'}]}]}]}]});
  }
  throw new Error('Unexpected '+method+' '+u.pathname);
 };
 server=http.createServer((req,res)=>api(req,res).catch(e=>{res.statusCode=500;res.end(JSON.stringify({error:e.message}));}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const request=async(action,query='',method='GET',auth=true,body=undefined)=>{const r=await oldFetch(`http://127.0.0.1:${server.address().port}/api?action=${action}${query}`,{method,headers:auth?{cookie,'content-type':'application/json'}: {},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 let r=await request('calendar-users','&query=ot');assert.equal(r.status,200);assert.equal(r.data.users.length,2);assert(!JSON.stringify(r.data).includes('html'));
 r=await request('calendar-users','&query=o');assert.equal(r.status,400);
 mode='picker-denied';r=await request('calendar-users','&query=ot');assert.equal(r.status,403);mode='';
 const query='&userKey=OTHER&date=2026-10-16';r=await request('calendar-history',query);assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.data.viewedUser.key,'OTHER');assert.equal(r.data.readOnly,true);assert.equal(r.data.items.length,1);assert.equal(r.data.items[0].id,'2');assert.equal(r.data.items[0].start,'08:00');assert.equal(r.data.items[0].timeSpentSeconds,3661);assert.equal(r.data.items[0].overtime,true);assert(r.data.items.every(x=>x.calendarReadOnly));assert(calls.some(x=>x.jql.includes('worklogAuthor = "other"')));
 r=await request('calendar-history','&userKey=THIRD&date=2026-10-16');assert.equal(r.data.items[0].id,'3');
 // The personal endpoint still ignores a supplied selected user and returns self.
 r=await request('worklog-history','&date=2026-10-16&force=1&userKey=OTHER');assert.equal(r.status,200);assert.equal(r.data.items.length,1);assert.equal(r.data.items[0].id,'1');
 mode='post-denied';r=await request('calendar-history',query);assert.equal(r.status,200);assert.equal(r.data.items[0].id,'2');assert(calls.some(x=>x.method==='GET'&&x.jql.includes('worklogAuthor = "other"')));mode='';
 mode='ot-denied';r=await request('calendar-history',query);assert.equal(r.status,200);assert.equal(r.data.items[0].overtimeKnown,false);assert.equal(r.data.sourceDetails.overtimeUnavailable,1);mode='';
 mode='worklogs-denied';r=await request('calendar-history',query);assert.equal(r.status,200);assert.equal(r.data.items.length,0);assert.equal(r.data.skipped[0].status,403);mode='';
 mode='resolve-denied';const before=calls.length;r=await request('calendar-history',query);assert.equal(r.status,403);assert.equal(calls.length,before+1);mode='wrong-user';r=await request('calendar-history',query);assert.equal(r.status,502);mode='expired';r=await request('calendar-history',query);assert.equal(r.status,401);mode='';
 allDenied=true;r=await request('calendar-history',query);assert.equal(r.status,403);allDenied=false;
 r=await request('calendar-history',query,'PATCH');assert.equal(r.status,405);r=await request('calendar-users','&query=ot','POST');assert.equal(r.status,405);r=await request('calendar-history',query,'GET',false);assert.equal(r.status,401);
 r=await request('calendar-history','&date=2026-10-16');assert.equal(r.status,400);r=await request('calendar-history','&userKey=OTHER&date=2026-01-01&endDate=2026-12-31');assert.equal(r.status,400);
 for(const method of ['PATCH','DELETE']){r=await request('worklog-correction','',method,true,{key:'CAL-1',worklogId:'2',date:'2026-10-16',start:'10:00',timeSpent:'1h',description:'must not change',updateOvertime:true,overtime:false});assert.equal(r.status,403);}
 assert(calls.every(x=>x.method==='GET'||x.path==='/rest/api/2/search'),'calendar feature makes no remote write');
 console.log('Calendar viewer API: caller auth, stable author/date filtering, pagination, native OT/unknown, user lookup, GET fallback, 401/403, self isolation and GET-only passed.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{global.fetch=oldFetch;if(oldSecret===undefined)delete process.env.APP_SESSION_SECRET;else process.env.APP_SESSION_SECRET=oldSecret;if(server)await new Promise(r=>server.close(r));});
