'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{chromium}=require('playwright'),{server}=require('./serve.cjs');
(async()=>{await new Promise(r=>server.listen(4254,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.QJL_CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:683},{width:844,height:390}]){
 const mobile=viewport.width<900,context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,timezoneId:'Asia/Ho_Chi_Minh',serviceWorkers:'block'}),page=await context.newPage(),errors=[],posts=[],created={};let failKey='',unknown=false;
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const issues=Array.from({length:6},(_,i)=>({key:'EPU-'+(i+1),project:'EPU',summary:'Subtask example '+i,status:'In Progress'}));
 await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:['2026-10-19T03:00:00Z']));}static now(){return D.parse('2026-10-19T03:00:00Z');}};});
 await page.route('**/api?*',async route=>{const req=route.request(),u=new URL(req.url()),a=u.searchParams.get('action');let data={ok:true},status=200;
  if(a==='status')data={ok:true,authenticated:true,user:{username:'boss',displayName:'Boss'}};
  if(a==='subtasks')data={ok:true,issues};if(a==='worklog-history'){const from=u.searchParams.get('date'),to=u.searchParams.get('endDate')||from;data={ok:true,items:from<='2026-10-20'&&to>='2026-10-20'?[{id:'991',key:'EPU-99',project:'EPU',summary:'Actual already logged',description:'Read only',date:'2026-10-20',start:'08:00',end:'09:00',minutes:60,timeSpentSeconds:3600,overtime:false,overtimeKnown:true}]:[]};}
  if(a==='day-audit'){const date=u.searchParams.get('date'),occupied=[...(date==='2026-10-20'?[{start:'08:00',end:'09:00'}]:[]),...(created[date]||[])];data={ok:true,occupied,regularOccupiedMinutes:occupied.reduce((n,x)=>n+QuickMinute(x.end)-QuickMinute(x.start),0)};}
  if(a==='bulk-worklog'){const b=req.postDataJSON();posts.push(b);if(b.items[0].key===failKey){if(unknown){await route.abort();return;}status=403;data={ok:false,error:'Fixture permission denied'};}else{for(const p of b.exactPlan){(created[p.date]||=[]).push(...p.segments.map(s=>({start:s.start,end:tm(QuickMinute(s.start)+s.minutes)})));}data={ok:true,items:b.items,transitions:[]};}}
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('http://127.0.0.1:4254');await page.waitForFunction(()=>state.filterLoaded);await page.locator('#logAllBtn').click();await page.locator('#bulkPeriod').selectOption('week');await page.locator('#bulkRedistributeBtn').click();await page.waitForFunction(()=>window.QuickJiraBatch?.active,{},{timeout:6000}).catch(async e=>{console.error(errors,await page.locator('#toast').innerText());throw e;});
 assert.equal(posts.length,0);assert.equal(await page.locator('.week-worklog-block').filter({hasText:'EPU-99'}).count(),1);assert(await page.locator('#batchPreviewBar').isVisible());let plans=await page.evaluate(()=>QuickJiraBatchPlan.validate(QuickJiraBatch.job?calendarPreviewItems().filter(x=>x.batchNew).reduce((all,x)=>{let p=all.find(p=>p.key===x.key);if(!p){p={key:x.key,date:x.date,segments:[]};all.push(p);}if(p.date!==x.date)throw Error('two dates');p.segments.push({start:x.start,minutes:x.minutes});return all;},[]):[]));
 assert.equal(plans.length,6);assert(plans.every(p=>p.date>='2026-10-19'&&p.date<='2026-10-23'));
 assert(await page.locator('#calendarPrevBtn').isDisabled());assert.equal(await page.locator('.week-day-heading').count(),7);
 const result=await page.evaluate(()=>{const item=calendarPreviewItems().find(x=>x.batchNew&&x.date==='2026-10-19'&&x.start==='08:00');stageCalendarMove(item,{date:'2026-10-19',start:'13:30'});return calendarPreviewItems().filter(x=>x.batchNew&&x.date==='2026-10-19').map(x=>({key:x.key,start:x.start}));});
 assert.equal(result.find(x=>x.key===plans[0].key).start,'13:30','swap uses normal calendar staging');
 await page.evaluate(()=>{const item=calendarPreviewItems().find(x=>x.batchNew&&x.date==='2026-10-19'&&x.start==='08:00');stageCalendarResize(item,QuickJiraDrafts.resize(item,11*60,calendarPreviewItems()));});
 if(viewport.width===1440||viewport.width===390){
  const block=page.locator('.week-worklog-block').filter({hasText:'EPU-6'}).first();await block.scrollIntoViewIfNeeded();const b=await block.boundingBox();
  const delta=await block.evaluate(el=>{const c=el.closest('.week-day-column');return c.getBoundingClientRect().height/Number(c.parentElement.dataset.minuteRange)*60;});
  if(mobile){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+30,y:b.y+15}]});await page.waitForTimeout(620);assert(await page.evaluate(()=>calendarEditMode));for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+30,y:b.y+15+delta*i/6}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
  else{await page.mouse.move(b.x+30,b.y+15);await page.mouse.down();await page.mouse.move(b.x+30,b.y+15+delta,{steps:8});await page.mouse.up();}
  await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>calendarPreviewItems().find(x=>x.key==='EPU-6').start),'09:00');await page.evaluate(()=>resetCalendarInteraction());
 }
 // Scope/locked ranges are not movable, and one segment cannot escape its grouped day.
 const before=await page.evaluate(()=>JSON.stringify([...state.calendarDrafts.values()].map(x=>x.target)));
 await page.evaluate(()=>{const item=calendarPreviewItems().find(x=>x.batchNew);stageCalendarMove(item,{date:'2026-10-24',start:'08:00'});});
 assert.equal(await page.evaluate(()=>JSON.stringify([...state.calendarDrafts.values()].map(x=>x.target))),before);
 for(const theme of ['light','dark']){await page.evaluate(t=>applyTheme(t),theme);await page.waitForTimeout(200);const r=await page.locator('#historyResults').boundingBox();assert(r.height>100,JSON.stringify(r));const overflow=await page.locator('.history-tool-sheet').evaluate(el=>el.scrollWidth>el.clientWidth+1);if(overflow){console.error('OVERFLOW',await page.locator('.history-tool-sheet').evaluate(el=>({w:el.clientWidth,sw:el.scrollWidth,outer:el.getBoundingClientRect().toJSON(),els:[...el.querySelectorAll('*')].filter(x=>{const r=x.getBoundingClientRect();return r.right>el.getBoundingClientRect().right+1&&!x.closest('#historyResults');}).map(x=>({tag:x.tagName,id:x.id,cl:x.className,w:x.getBoundingClientRect().width,x:x.getBoundingClientRect().x,css:getComputedStyle(x).width})).slice(0,15)})));}assert(!overflow);if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`batch-${viewport.width}-${theme}.png`)});}}
 failKey=plans[1].key;await page.locator('#batchPreviewSave').click();await page.locator('#batchConfirmSave').click();await page.waitForFunction(()=>QuickJiraBatch.job&&!QuickJiraBatch.job.running);await page.waitForTimeout(100);
 assert.equal(posts.length,2);assert.equal(await page.evaluate(()=>QuickJiraBatch.job.status['EPU-1']),'Đã log');assert.match(await page.locator('#batchConfirmError').innerText(),/Fixture permission denied/);
 failKey='';await page.locator('#batchConfirmSave').click();await page.waitForFunction(()=>QuickJiraBatch.job&&!QuickJiraBatch.job.running);await page.waitForTimeout(100);
 assert.equal(posts.filter(x=>x.items[0].key==='EPU-1').length,1,'successful row never sent again');assert.equal(posts.length,7);
 assert.equal(await page.evaluate(()=>Object.values(QuickJiraBatch.job.status).filter(x=>x==='Đã log').length),6);
 assert(posts.every(b=>b.exactPlan.length===1&&b.exactPlan[0].date===b.date));
 await page.locator('#batchConfirmClose').click();await page.locator('#batchPreviewBack').click();await page.waitForFunction(()=>!QuickJiraBatch.active);assert.equal(await page.evaluate(()=>state.calendarDrafts.size),0);
 // New day-mode run: fixed durations, lost response locks the uncertain row and leaves others retryable.
 await page.locator('#logAllBtn').click();await page.locator('#bulkPeriod').selectOption('day');await page.locator('#bulkKeepDurations').check();
 await page.locator('#bulkDate').fill('2026-10-26');await page.locator('#bulkDate').dispatchEvent('change');await page.locator('#bulkRedistributeBtn').click();await page.waitForFunction(()=>QuickJiraBatch.active);
 assert.equal(await page.evaluate(()=>new Set(calendarPreviewItems().filter(x=>x.batchNew).map(x=>x.date)).size),1);
 failKey='EPU-1';unknown=true;const previousCount=posts.length;await page.locator('#batchPreviewSave').click();await page.locator('#batchConfirmSave').click();await page.waitForFunction(()=>!QuickJiraBatch.job.running);assert.equal(posts.length,previousCount+1);assert.equal(await page.evaluate(()=>QuickJiraBatch.job.status['EPU-1']),'Cần kiểm tra Jira');
 failKey='';await page.locator('#batchConfirmSave').click();await page.waitForFunction(()=>!QuickJiraBatch.job.running);assert.equal(posts.slice(previousCount).filter(x=>x.items[0].key==='EPU-1').length,1);
 await page.locator('#batchConfirmClose').click();await page.locator('#batchPreviewBack').click();await page.waitForFunction(()=>!QuickJiraBatch.active);
 assert.deepEqual(errors,[]);console.log('Batch UI: allocation/no writes, scope, swap/resize, responsive preview, explicit confirmation and partial retry without duplicates passed',viewport);await context.close();
}
await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);server.close();process.exit(1);});
function QuickMinute(s){return Number(s.slice(0,2))*60+Number(s.slice(3));}function tm(n){return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
