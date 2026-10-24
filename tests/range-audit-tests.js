'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),api=require('../api'),{createSessionCookie}=require('../lib/session');
process.env.APP_SESSION_SECRET='range-audit-test-secret-32-characters';
const me={key:'ME',name:'boss'},cookie=createSessionCookie({mode:'basic',username:'boss',password:'fixture',me}).split(';')[0],real=global.fetch;
let reads=0,writes=0,deny=false,hour=8,slow=false;
global.fetch=async(url,o={})=>{const u=new URL(String(url));if(o.method&&!['GET','POST'].includes(o.method))writes++;
 if(u.pathname.endsWith('/worklog/updated'))return Response.json({},{status:404});
 if(u.pathname.endsWith('/search'))return Response.json({total:1,issues:[{key:'EPU-1'}]});
 if(u.pathname.endsWith('/issue/EPU-1/worklog')){reads++;if(slow)await new Promise(r=>setTimeout(r,80));if(deny)return Response.json({},{status:403});return Response.json({total:2,worklogs:[{id:'1',author:me,started:`2026-10-19T${String(hour).padStart(2,"0")}:00:00.000+0700`,timeSpentSeconds:3600},{id:'2',author:{name:'other'},started:'2026-10-20T08:00:00.000+0700',timeSpentSeconds:3600}]});}
 throw Error('Unexpected '+u.pathname);
};
(async()=>{const server=http.createServer(api);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/api?action=day-audit&`,dates=Array.from({length:7},(_,i)=>'2026-10-'+(19+i));
 const get=async(q,auth=true)=>{const r=await real(base+q,{headers:auth?{cookie}:{}});return {status:r.status,data:await r.json()};};
 try{
 let r=await get('dates='+dates.join(','));assert.equal(r.status,200,JSON.stringify(r));assert.equal(reads,1,'Same issue read once for seven days');assert.equal(r.data.days.length,7);assert.equal(r.data.days[0].occupied[0].start,'08:00');assert(r.data.days.slice(1).every(d=>d.occupied.length===0),'Filter actual author/date');
 hour=9;r=await get('dates='+dates.join(','));assert.equal(reads,2,'Never share between requests');assert.equal(r.data.days[0].occupied[0].start,'09:00');
 r=await get('date=2026-10-19&force=1');assert.equal(reads,3);assert.equal(r.data.occupied[0].start,'09:00');
 // Native streaming sends progress before the expensive worklog read finishes.
 slow=true;const response=await real(base+'dates='+dates.join(','),{headers:{cookie,accept:'application/x-ndjson'}});assert.match(response.headers.get('content-type'),/ndjson/);
 const reader=response.body.getReader(),decoder=new TextDecoder();let text='',chunks=0;
 while(true){const next=await reader.read();if(next.done)break;const chunk=decoder.decode(next.value);if(chunks++===0)assert(!chunk.includes('"type":"result"'),'progress received before final response');text+=chunk;}
 const events=text.trim().split('\n').map(JSON.parse),values=events.filter(x=>x.type==='progress').map(x=>x.percent);assert(new Set(values).size>=4,JSON.stringify(values));assert(values.every((n,i)=>!i||n>=values[i-1]));assert.equal(values.at(-1),100);assert.equal(events.at(-1).data.days.length,7);slow=false;
 deny=true;r=await get('dates='+dates.join(','));assert.equal(r.status,403,'Required issue denied must fail closed');
 const failed=await real(base+'dates='+dates.join(','),{headers:{cookie,accept:'application/x-ndjson'}});const failedEvents=(await failed.text()).trim().split('\n').map(JSON.parse);assert.equal(failedEvents.at(-1).status,403);assert(!failedEvents.some(x=>x.type==='progress'&&x.percent===100),'Failed audit never reports success');deny=false;
 for(const q of ['dates=2026-02-30','dates='+dates.concat('2026-10-26').join(','),'dates=2026-10-19,2026-10-19'])assert.equal((await get(q)).status,400);
 assert.equal((await get('dates='+dates.join(','),false)).status,401);assert.equal(writes,0);
 console.log('Range audit: 7 days/one shared issue: 7→1 worklog reads, exact author/date, fresh next request/single guard, auth/validation/fail-closed passed.');
 }finally{global.fetch=real;await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1);});
