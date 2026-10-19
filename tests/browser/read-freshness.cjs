'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{server}=require('./serve.cjs');
(async()=>{
 await new Promise(r=>server.listen(4215,'127.0.0.1',r));
 const browser=await chromium.launch({...(process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));let hold=false;const history=[],audit=[];
  await page.route('**/api?*',async route=>{const p=new URL(route.request().url()).searchParams,a=p.get('action');let data={ok:true};
   if(hold&&a==='worklog-history'&&p.get('date')==='2026-09-14'){history.push(route);return;}
   if(hold&&a==='day-audit'&&p.get('date')==='2026-09-14'){audit.push(route);return;}
   if(a==='status')data={ok:true,authenticated:true,user:{username:'boss',displayName:'Boss'}};
   if(a==='subtasks')data={ok:true,issues:[]};if(a==='worklog-history')data={ok:true,items:[]};
   await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:4215');await page.waitForFunction(()=>!document.body.classList.contains('booting')&&state.filterLoaded);hold=true;
  const until=async fn=>{for(let i=0;i<100&&!fn();i++)await page.waitForTimeout(10);assert(fn(),'Second revision must make its own request');};
  const respond=(route,data)=>route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,...data})});
  await page.evaluate(()=>{window.oldHistory=fetchHistoryRange({start:'2026-09-14',end:'2026-09-20'});});await until(()=>history.length===1);
  await page.evaluate(()=>{invalidateHistoryCache();window.newHistory=fetchHistoryRange({start:'2026-09-14',end:'2026-09-20'});});await until(()=>history.length===2);
  assert.notEqual(new URL(history[0].request().url()).searchParams.get('revision'),new URL(history[1].request().url()).searchParams.get('revision'));
  await respond(history[1],{items:[{id:'new'}]});await page.evaluate(()=>window.newHistory);await respond(history[0],{items:[{id:'old'}]});await page.evaluate(()=>window.oldHistory);
  assert.equal(await page.evaluate(()=>state.historyCache.get('2026-09-14|2026-09-20||history').data.items[0].id),'new');
  await page.evaluate(()=>{window.oldAudit=fetchDayAudit('2026-09-14');});await until(()=>audit.length===1);
  await page.evaluate(()=>{invalidateDayAuditCache('2026-09-14');window.newAudit=fetchDayAudit('2026-09-14');});await until(()=>audit.length===2);
  await respond(audit[1],{regularOccupiedMinutes:120});await page.evaluate(()=>window.newAudit);await respond(audit[0],{regularOccupiedMinutes:30});await page.evaluate(()=>window.oldAudit);
  assert.equal(await page.evaluate(()=>state.dayAuditCache.get('2026-09-14|').data.regularOccupiedMinutes),120);
  // Changing the active account also fences the pending old response out.
  await page.evaluate(()=>{invalidateDayAuditCache();window.accountAudit=fetchDayAudit('2026-09-14');});await until(()=>audit.length===3);
  await page.evaluate(()=>{state.user={username:'other',displayName:'Other'};invalidateDayAuditCache();});
  await respond(audit[2],{regularOccupiedMinutes:480});await page.evaluate(()=>window.accountAudit);
  assert.equal(await page.evaluate(()=>state.dayAuditCache.size),0);assert.deepEqual(errors,[]);
  await context.close();console.log('Frontend fresh reads: revisions isolate in-flight calls; late history/day-audit responses and old-account results cannot replace current caches.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exit(1)});
