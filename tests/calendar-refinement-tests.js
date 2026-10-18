'use strict';
const assert=require('node:assert/strict'),http=require('node:http');
const {step}=require('../lib/calendar-scroll-bounds');
assert.deepEqual(step(0,0,400,700,-80,-120),{left:0,top:0,blocked:true});
assert.deepEqual(step(400,700,400,700,80,120),{left:400,top:700,blocked:true});
assert.deepEqual(step(0,120,400,700,-50,35),{left:0,top:155,blocked:true});
assert.deepEqual(step(120,0,400,700,35,-50),{left:155,top:0,blocked:true});
assert.deepEqual(step(100,120,400,700,20,35),{left:120,top:155,blocked:false});
assert.deepEqual(step(-130,-230,400,700,0,0),{left:0,top:0,blocked:true});
assert.deepEqual(step(600,900,400,700,0,0),{left:400,top:700,blocked:true});
assert.deepEqual(step(0,0,0,0,20,25),{left:0,top:0,blocked:true});
assert.equal(step(1.5,2.5,5.5,9.5,.25,.5).left,1.75);
console.log('Calendar bounds: both axes, diagonal corners, negative Safari offsets, fractional values and native interior movement passed.');
const api=require('../api'),{createSessionCookie}=require('../lib/session');
const oldFetch=global.fetch,oldSecret=process.env.APP_SESSION_SECRET;let server;
(async()=>{
 process.env.APP_SESSION_SECRET='calendar-refinement-secret-at-least-32';
 const cookie=createSessionCookie({mode:'basic',username:'boss',password:'fixture-only',me:{name:'boss'}}).split(';')[0];
 const person={name:'nguyen.an',key:'JIRAUSER123',displayName:'Nguyễn An',active:true,emailAddress:'private@example.com'};
 let mode='keyless',calls=[];
 global.fetch=async(url,options={})=>{
  const u=new URL(String(url));calls.push(u);assert.equal(options.method||'GET','GET');assert.equal(options.headers.Authorization,'Basic '+Buffer.from('boss:fixture-only').toString('base64'));
  if(u.pathname.endsWith('/user/picker')){
   if(mode==='expired')return Response.json({}, {status:401});
   if(['fallback','denied'].includes(mode))return Response.json({}, {status:mode==='denied'?403:404});
   if(mode==='empty')return Response.json({users:[]});
   if(mode==='malformed')return Response.json({raw:'<html>not JSON user data</html>'});
   if(mode==='no-key-access')return Response.json({users:[{name:person.name}]});
   const row=mode==='alias'?{...person,key:person.name}:mode==='username'?{username:person.name,displayName:person.displayName}:{name:person.name,displayName:person.displayName};
   const users=[row,{...row,html:'<img onerror=alert(1)>'},{name:'inactive',key:'INACTIVE',active:false}];
   return Response.json(mode==='nested'?{users:{users}}:{users});
  }
  if(u.pathname.endsWith('/user/search')){
   assert.equal(u.searchParams.get('username'),'nguyen');assert.equal(u.searchParams.get('includeInactive'),'false');
   if(mode==='denied')return Response.json({}, {status:403});
   if(mode==='no-key-access')return Response.json([{name:person.name}]);
   return Response.json([person]);
  }
  if(u.pathname.endsWith('/user')){
   assert.equal(u.searchParams.get('username'),person.name);
   if(mode==='no-key-access')return Response.json({}, {status:404});
   return Response.json(person);
  }
  throw new Error('Unexpected '+u.pathname);
 };
 server=http.createServer((req,res)=>api(req,res).catch(e=>{res.statusCode=500;res.end(JSON.stringify({error:e.message}));}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const request=async(query='nguyen')=>{const r=await oldFetch(`http://127.0.0.1:${server.address().port}/api?action=calendar-users&query=${encodeURIComponent(query)}`,{headers:{cookie}});return {status:r.status,data:await r.json()};};
 for(mode of ['keyless','alias','username','nested','fallback','empty','malformed']){
  calls=[];const r=await request();assert.equal(r.status,200,JSON.stringify(r));assert.deepEqual(r.data.users,[{key:person.key,username:person.name,displayName:person.displayName}]);assert(!JSON.stringify(r.data).includes('private@'));assert(!JSON.stringify(r.data).includes('html'));assert(calls.every(u=>u.pathname.startsWith('/rest/api/2/user')));
  if(['keyless','alias','username','nested'].includes(mode))assert(calls.some(u=>u.searchParams.get('username')===person.name));
  else assert(calls.some(u=>u.pathname.endsWith('/user/search')));
 }
 mode='denied';assert.equal((await request()).status,403);mode='expired';calls=[];assert.equal((await request()).status,401);assert.equal(calls.length,1);
 mode='no-key-access';const failed=await request();assert.equal(failed.status,502);assert(failed.data.error.includes('định danh'));
 calls=[];assert.equal((await request('n')).status,400);assert.equal(calls.length,0);
 console.log('Personnel suggestions: keyless/alias canonical lookup, username/nested/array formats, search fallback, dedup/inactive filtering, caller auth, explicit 401/403/unresolved errors and no writes passed.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{global.fetch=oldFetch;if(oldSecret===undefined)delete process.env.APP_SESSION_SECRET;else process.env.APP_SESSION_SECRET=oldSecret;if(server)await new Promise(r=>server.close(r));});
