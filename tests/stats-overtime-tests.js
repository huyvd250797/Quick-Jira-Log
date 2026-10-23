'use strict';
const assert=require('node:assert/strict');
const {enrichHistory}=require('../lib/worklogpro');
const {readStatsOvertime}=require('../lib/stats-overtime');
const {withJiraReadScope}=require('../lib/jira-read-scope');
const original=global.fetch;
let mode='direct',directs=0,natives=0,attrs=0,active=0,peak=0,headers=[];
const row=id=>({id,workLogAttributes:[{attrTypeId:1,attrValue:Number(id)%2?'yes':'no'}]});
const reset=value=>{mode=value;directs=natives=attrs=active=peak=0;headers=[];};
global.fetch=async(url,opts={})=>{
 const u=new URL(url),p=u.pathname;assert.equal(u.origin,'https://task.ascvn.com.vn');assert.equal(opts.method||'GET','GET');headers.push(opts.headers);
 if(p.endsWith('/attr')){attrs++;return mode==='attr-denied'?Response.json({}, {status:403}):Response.json([{id:1,name:'Over Time?',type:'BOOL',enabled:true}]);}
 if(p.includes('/1.0/worklog/')){
  directs++;active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,8));active--;
  if(mode==='fallback')return Response.json({}, {status:404});
  if(mode==='expired')return Response.json({}, {status:401});
  const id=p.split('/').at(-1);return Response.json(mode==='malformed'?{id,workLogAttributes:null}:row(id));
 }
 if(p.endsWith('/latest/worklog')){natives++;if(mode==='bench'){active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,8));active--;}const id=u.searchParams.get('id');return Response.json({projects:[{issues:[{key:'CAL-1',workLogs:[row(id)]}]}]});}
 throw Error('Unexpected '+p);
};
(async()=>{
 delete process.env.WORKLOGPRO_OVERTIME_ATTRIBUTE_ID;
 const auth={mode:'basic',username:'boss',password:'fixture'},ids=Array.from({length:50},(_,i)=>String(i+1));
 let result=await withJiraReadScope(()=>readStatsOvertime(ids,auth));
 assert.equal(result.items.length,50);assert(result.items.every(x=>x.overtimeKnown));assert.equal(result.items.filter(x=>x.overtime).length,25);
 assert.equal(directs,50);assert.equal(natives,0);assert.equal(attrs,1);assert(peak>6&&peak<=10);
 reset('fallback');result=await withJiraReadScope(()=>readStatsOvertime(ids,auth));assert.equal(result.reader,'native');assert.equal(directs,1);assert.equal(natives,50);assert(result.items.every(x=>x.overtimeKnown));
 reset('fallback');await withJiraReadScope(()=>readStatsOvertime(ids,auth,'native'));assert.equal(directs,0);assert.equal(natives,50);
 reset('malformed');result=await withJiraReadScope(()=>readStatsOvertime(['1','2'],auth));assert.equal(result.reader,'native');assert(result.items.every(x=>x.overtimeKnown));
 reset('attr-denied');result=await withJiraReadScope(()=>readStatsOvertime(ids,auth));assert.equal(directs+natives,0);assert.equal(result.unavailable,50);assert(result.items.every(x=>!x.overtimeKnown));
 reset('expired');await assert.rejects(withJiraReadScope(()=>readStatsOvertime(ids,auth)),e=>e.status===401);assert.equal(directs,1);assert.equal(natives,0);
 reset('direct');await withJiraReadScope(()=>readStatsOvertime(['1'],{mode:'session',cookie:'fixture',worklogproAuth:{username:'plugin-user',password:'plugin-fixture'}}));assert(headers.every(h=>h.Authorization==='Basic '+Buffer.from('plugin-user:plugin-fixture').toString('base64')));
 const all=Array.from({length:200},(_,i)=>String(i+1)),oldItems=all.map(id=>({id}));
 async function lanes(chunks,work){let cursor=0;await Promise.all([0,1].map(async()=>{while(cursor<chunks.length)await work(chunks[cursor++]);}));}
 reset('bench');let start=performance.now();const oldGroups=[];for(let i=0;i<all.length;i+=25)oldGroups.push(oldItems.slice(i,i+25));
 await lanes(oldGroups,group=>withJiraReadScope(()=>enrichHistory(group,auth)));const oldMs=performance.now()-start,oldPeak=peak;assert.equal(attrs,8);assert.equal(natives,200);
 reset('bench');start=performance.now();const probe=await withJiraReadScope(()=>readStatsOvertime(all.slice(0,1),auth)),newItems=[...probe.items],groups=[];for(let i=1;i<all.length;i+=50)groups.push(all.slice(i,i+50));
 await lanes(groups,async ids=>{const result=await withJiraReadScope(()=>readStatsOvertime(ids,auth,probe.reader));newItems.push(...result.items);});
 const newMs=performance.now()-start;assert.equal(attrs,5);assert(peak<=20);assert.equal(directs,200);
 const values=rows=>rows.map(x=>[x.id,x.overtime,x.overtimeKnown]).sort((a,b)=>Number(a[0])-Number(b[0]));
 assert.deepEqual(values(newItems),values(oldItems));
 console.log('Mock 200 OT reads / 8ms I/O: old '+Math.round(oldMs)+'ms, new '+Math.round(newMs)+'ms; peak '+oldPeak+'→'+peak+'; exact values equal (not a production benchmark).');
 console.log('Stats OT: exact IDs/BOOL, 50-item batch, <=10 concurrency, direct/native fallback and hint, unknown/auth/plugin credentials/read-only passed.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>global.fetch=original);
