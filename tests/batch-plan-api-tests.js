'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),api=require('../api'),{createSessionCookie}=require('../lib/session');
process.env.APP_SESSION_SECRET='batch-plan-api-test-secret-32-characters';const me={key:'ME',name:'boss'},cookie=createSessionCookie({mode:'basic',username:'boss',password:'test',me}).split(';')[0],original=global.fetch;
let logs=[],writes=0,seq=0,subtask=true,fail=false;
global.fetch=async(url,o={})=>{const u=new URL(String(url)),method=o.method||'GET';
 if(u.pathname.endsWith('/worklog/updated'))return Response.json({}, {status:404});
 if(u.pathname.endsWith('/search'))return Response.json({total:1,issues:[{key:'EPU-1',fields:{project:{key:'EPU'},summary:'Example',status:{name:'Done'},issuetype:{subtask}}}]});
 const m=u.pathname.match(/\/issue\/EPU-1\/worklog(?:\/(\d+))?$/);
 if(m){if(method==='POST'){if(fail&&writes===1)return Response.json({}, {status:403});const b=JSON.parse(o.body);const row={...b,id:String(++seq),author:me};logs.push(row);writes++;return Response.json(row);}if(method==='DELETE'){logs=logs.filter(x=>x.id!==m[1]);return new Response(null,{status:204});}return Response.json({worklogs:logs,total:logs.length});}
 if(u.pathname.endsWith('/transitions'))return Response.json({transitions:[]});
 throw Error('Unexpected '+u.pathname);
};
(async()=>{const server=http.createServer((req,res)=>api(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
 const body={date:'2026-10-19',items:[{key:'EPU-1',project:'EPU',timeSpent:'120m',description:'Preserve this',overtime:false}],exactPlan:[{key:'EPU-1',date:'2026-10-19',segments:[{start:'11:00',minutes:60},{start:'13:30',minutes:60}]}]};
 const post=async b=>{const r=await original(`http://127.0.0.1:${server.address().port}/api?action=bulk-worklog`,{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify(b)});return {status:r.status,data:await r.json()};};
 let r=await post({...body,requestId:'exact-plan-api-0001'});assert.equal(r.status,200,JSON.stringify(r));assert.equal(writes,2);assert.deepEqual(logs.map(x=>x.started.slice(11,16)),['11:00','13:30']);assert(logs.every(x=>x.comment==='Preserve this'));r=await post({...body,requestId:'exact-plan-api-0001'});assert.equal(r.status,200);assert.equal(writes,2);
 r=await post({...body,requestId:'exact-plan-api-0002'});assert.equal(r.status,409);assert.equal(writes,2,'fresh conflict prevents writes');logs=[];
 r=await post({...body,exactPlan:[{...body.exactPlan[0],date:'2026-10-20'}]});assert.equal(r.status,409);assert.equal(writes,2);
 r=await post({...body,exactPlan:[{...body.exactPlan[0],segments:[{start:'12:00',minutes:120}]}]});assert.equal(r.status,409);assert.equal(writes,2);
 r=await post({...body,items:[{...body.items[0],timeSpent:'1h'}]});assert.equal(r.status,400);assert.equal(writes,2);
 subtask=false;r=await post(body);assert.equal(r.status,400);assert.equal(writes,2);subtask=true;
 writes=0;fail=true;r=await post(body);assert.notEqual(r.status,200);assert.equal(logs.length,0,'new segments roll back on failed creation');
 console.log('Exact plan API: real session/router, exact times and descriptions, replay, fresh overlap, same-day, windows, totals, subtype and rollback passed.');
 }finally{await new Promise(r=>server.close(r));global.fetch=original;}
})().catch(e=>{console.error(e);process.exit(1);});
