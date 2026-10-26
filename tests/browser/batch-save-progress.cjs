'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright'),{server,state:fixture}=require('./serve.cjs');
(async()=>{await new Promise(r=>server.listen(4262,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.QJL_CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox']});
try{for(const [mode,outcome] of [['day','success'],['week','success'],['week','error'],['day','interrupted']]){
 const context=await browser.newContext({viewport:{width:mode==='day'?390:1440,height:900},serviceWorkers:'block'}),page=await context.newPage(),errors=[];let prompts=0,history=[];
 fixture.mode=outcome;fixture.posts=[];fixture.onMutation=(items,date)=>{history=items.flatMap((item,i)=>(fixture.posts.at(-1).body.exactPlan.find(p=>p.key===item.key).segments).map((s,j)=>({id:`${i}-${j}`,key:item.key,project:item.project,date,start:s.start,end:QuickTime(s.start,s.minutes),minutes:s.minutes,summary:item.summary,description:item.description,overtime:false,overtimeKnown:true})));};
 function QuickTime(start,minutes){const [h,m]=start.split(':').map(Number),n=h*60+m+minutes;return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{prompts++;void d.accept();});
 await page.route('**/api?*',async route=>{const a=new URL(route.request().url()).searchParams.get('action');if(a==='bulk-worklog')return route.continue();let data={ok:true};
 if(a==='status')data={ok:true,authenticated:true,user:{username:'boss',displayName:'Boss'}};
 if(a==='subtasks')data={ok:true,issues:[1,2].map(i=>({key:'EPU-'+i,project:'EPU',summary:'Test '+i,status:'In Progress'}))};
 if(a==='day-audit')data={ok:true,occupied:[],regularOccupiedMinutes:0};if(a==='worklog-history')data={ok:true,items:history,skipped:[]};
 await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});});
 await page.addInitScript(()=>localStorage.setItem('qjl:bulk-help:v1:boss','1'));await page.goto('http://127.0.0.1:4262');await page.waitForFunction(()=>state.filterLoaded);await page.locator('#logAllBtn').click();await page.locator('#bulkAutoAllocate').uncheck();
 await page.locator(mode==='week'?'#bulkPeriodWeek':'#bulkPeriodDay').check();await page.locator(mode==='week'?'#bulkWeek':'#bulkDate').fill('2026-10-26');await page.locator(mode==='week'?'#bulkWeek':'#bulkDate').dispatchEvent('change');for(const input of await page.locator('.bulk-time').all())await input.fill('1h');
 await page.locator('#bulkLogBtn').click();await page.waitForFunction(()=>QuickJiraBatch.active&&!QuickJiraBatch.running);await page.locator('#batchPreviewSave').click();await page.locator('#batchConfirmSave').click();
 await page.waitForFunction(()=>state.logProgress?.percent>15&&state.logProgress.percent<95);assert(await page.locator('#logProgressDialog').isVisible());await page.screenshot({path:`/tmp/1356-progress-${mode}-${outcome}.png`});assert.match(await page.locator('#logProgressPercent').innerText(),/%/);assert((await page.locator('#logProgressBar').evaluate(e=>parseFloat(e.style.width)))>0);
 await page.waitForFunction(()=>state.logProgress&&!state.logProgress.active);assert.equal(fixture.posts.filter(p=>p.action==='bulk-worklog').length,1,'same-day independent tasks batched');
 if(outcome==='success'){
  assert.equal(await page.evaluate(()=>state.logProgress.percent),100);assert.equal(await page.evaluate(()=>QuickJiraBatch.active),false);assert.equal(await page.evaluate(()=>state.calendarDrafts.size),0);assert.equal(await page.locator('#historyTitle').innerText(),'Worklog đã log');assert(await page.locator('#batchPreviewBar').isHidden());assert(await page.locator('#calendarSaveBtn').isHidden());assert.equal(await page.locator('.week-worklog-block').count(),2);assert.equal(await page.locator('.week-worklog-block.is-batch-existing').count(),0);
  await page.locator('#closeLogProgressBtn').click();await page.waitForFunction(()=>!$('logProgressDialog').open);await page.locator('#closeHistoryBtn').click();await page.waitForTimeout(400);assert.equal(prompts,0,'closing real calendar has no draft prompt');
 }else{
  assert(await page.evaluate(()=>QuickJiraBatch.active));assert.equal(await page.evaluate(()=>state.calendarDrafts.size),2);assert((await page.evaluate(()=>state.logProgress.percent))<100);
  if(outcome==='interrupted')assert(await page.evaluate(()=>Object.values(QuickJiraBatch.job.status).every(s=>s==='Cần kiểm tra Jira')));else assert(await page.evaluate(()=>Object.keys(QuickJiraBatch.job.status).length===0));
 }
 assert.deepEqual(errors,[]);console.log('Batch streamed progress and completion:',mode,outcome);await context.close();
}}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
