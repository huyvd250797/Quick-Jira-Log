'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {server}=require('./serve.cjs');let browser;
const issues=Array.from({length:4},(_,i)=>({key:`EPU01-${3001+i}`,project:'EPU01',summary:`Hỗ trợ vận hành và xử lý công việc ${i+1}`,status:'To Do'}));
const reveal=async(locator)=>{await locator.evaluate(el=>{const card=el.closest('#bulkCard'),top=card.querySelector('.bulk-sticky-header').getBoundingClientRect().bottom;card.scrollTop+=el.getBoundingClientRect().top-top-12;});};
const fits=async(page,root)=>page.locator(root).evaluate(e=>{const r=e.getBoundingClientRect();return [...e.querySelectorAll('input,textarea')].filter(x=>x.getClientRects().length).every(x=>{const b=x.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1;});});
(async()=>{
 await new Promise(r=>server.listen(4225,'127.0.0.1',r));browser=await chromium.launch({...(process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const viewport of [{width:315,height:683},{width:390,height:844},{width:844,height:390},{width:1440,height:900}]){
  const context=await browser.newContext({viewport,serviceWorkers:'block',timezoneId:'Asia/Ho_Chi_Minh'}),page=await context.newPage(),mutations=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...a.length?a:['2026-10-16T02:00:00Z']);}static now(){return D.parse('2026-10-16T02:00:00Z');}};});
  await page.route('**/api?*',async route=>{
   const a=new URL(route.request().url()).searchParams.get('action');let data={ok:true};
   if(a==='status')data={ok:true,authenticated:true,user:{username:'boss',displayName:'Boss'}};
   if(a==='subtasks')data={ok:true,issues};
   if(a==='day-audit')data={ok:true,regularOccupiedMinutes:480,occupiedMinutes:480,freeMinutes:0,occupied:[],available:[]};
   if(a==='worklog'||a==='bulk-worklog'){
    const body=route.request().postDataJSON();mutations.push({a,body});
    const list=(a==='worklog'?[body]:body.items).map(x=>({...x,summary:x.description,minutes:120,overtimeVerified:x.overtime,segments:[{start:x.overtimeStart||'17:30',end:'21:30',minutes:120}]}));
    data=a==='worklog'?{ok:true,date:body.date,issue:{key:body.key,summary:body.description},totalMinutes:120,overtime:body.overtime,overtimeVerified:body.overtime,segments:list[0].segments,transition:{ok:true}}:{ok:true,date:body.date,totalMinutes:list.length*120,items:list,transitions:[]};
   }
   await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:4225');await page.waitForFunction(()=>!document.body.classList.contains('booting'));await page.locator('.issue-main').first().click();await page.waitForFunction(()=>state.singleCapacity.regularLoggedMinutes===480&&!state.singleCapacity.loading);
  await page.locator('#timeSpent').fill('2h');assert(await page.locator('#logBtn').isDisabled());
  await page.locator('#worklogCard .overtime-toggle').click();assert(await page.locator('#overtime').isChecked());assert(await page.locator('#logBtn').isEnabled());assert(await page.locator('#overtimeStart').isVisible());
  await page.locator('#overtimeStart').fill('19:30');assert(await fits(page,'#worklogCard'));assert((await page.locator('#singleOvertimeDraft').innerText()).includes('2h'));
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('singleCapacityBar')).backgroundColor==='rgb(22, 148, 90)');
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#overtime + .overtime-control')).backgroundColor==='rgb(245, 158, 11)');
  if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`${viewport.width}-v1120-create-ot.png`)});}
  await page.locator('#logBtn').click();await page.locator('#confirmLogBtn').click();await page.waitForFunction(()=>!state.submitInFlight&&document.getElementById('resultCard').classList.contains('ok'));assert.equal(mutations[0].body.overtime,true);assert.equal(mutations[0].body.overtimeStart,'19:30');
  // Progress modal blocks other surfaces until finished; close after completion.
  await page.waitForFunction(()=>!document.getElementById('logProgressDialog').open);await page.locator('#logAllBtn').click();await page.waitForFunction(()=>state.bulkCapacity.regularLoggedMinutes===480&&!state.bulkCapacity.loading);
  assert(await page.locator('#bulkLogBtn').isDisabled());const rows=page.locator('#bulkItems .bulk-item');
  for(let i=0;i<await rows.count();i++){const row=rows.nth(i);await reveal(row.locator('.bulk-ot-toggle'));await row.locator('.bulk-ot-toggle').click({position:{x:22,y:22}});await reveal(row.locator('.bulk-ot-start'));await row.locator('.bulk-ot-start').fill('18:30');}
  assert(await page.locator('#bulkLogBtn').isEnabled());assert(await fits(page,'#bulkCard'));assert.equal(await page.locator('.bulk-ot-start:visible').count(),await rows.count());
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#bulkItems .bulk-ot-toggle:last-of-type .overtime-control') || document.querySelector('#bulkItems .bulk-ot-toggle .overtime-control')).backgroundColor==='rgb(245, 158, 11)');
  if(process.env.QJL_QA_OUTPUT)await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`${viewport.width}-v1120-bulk-ot.png`)});
  await page.locator('#bulkLogBtn').click();await page.locator('#confirmLogBtn').click();await page.waitForFunction(()=>!state.bulkSubmitInFlight);const bulk=mutations.find(m=>m.a==='bulk-worklog');assert(bulk);assert(bulk.body.items.every(x=>x.overtime===true&&x.overtimeStart==='18:30'));assert.deepEqual(errors,[]);
  console.log('V1.12.0 UI full-day capacity → single/Bulk OT controls, selected start, verified payloads and bounded inputs passed',viewport);await context.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();await new Promise(r=>server.close(r));});
