'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{chromium}=require('playwright'),{server}=require('./serve.cjs');
(async()=>{await new Promise(r=>server.listen(4256,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.QJL_CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:683},{width:844,height:390}]){
 const mobile=viewport.width<900,context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,serviceWorkers:'block',timezoneId:'Asia/Ho_Chi_Minh'}),page=await context.newPage(),errors=[],posts=[];let choice=true,overlapWarnings=0;
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{if(d.message().includes('xếp trùng')){overlapWarnings++;return choice?d.accept():d.dismiss();}return d.accept();});
 await page.route('**/api?*',async route=>{const req=route.request(),a=new URL(req.url()).searchParams.get('action');let data={ok:true};
  if(a==='status')data={ok:true,authenticated:true,user:{username:'boss',displayName:'Boss'}};
  if(a==='subtasks')data={ok:true,issues:[1,2,3].map(i=>({key:'EPU-'+i,project:'EPU',summary:'Subtask review '+i,status:'In Progress'}))};
  if(a==='day-audit'){await new Promise(r=>setTimeout(r,130));data={ok:true,occupied:[],regularOccupiedMinutes:0};}
  if(a==='worklog-history'){await new Promise(r=>setTimeout(r,180));data={ok:true,items:[]};}
  if(a==='bulk-worklog'){posts.push(req.postDataJSON());data={ok:true,transitions:[]};}
  await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.addInitScript(()=>localStorage.setItem('qjl:bulk-help:v1:boss','1'));await page.goto('http://127.0.0.1:4256');await page.waitForFunction(()=>state.filterLoaded);await page.locator('#logAllBtn').click();await page.locator('#bulkPeriodWeek').check();await page.locator('#bulkWeek').fill('2026-10-21');await page.locator('#bulkWeek').dispatchEvent('change');
 assert.equal(await page.locator('#bulkWeekRange').innerText(),'19/10/2026 – 25/10/2026');assert.equal(await page.locator('#bulkLogBtn').innerText(),'Xem trước logwork');
 await page.locator('#bulkLogBtn').click();await page.waitForFunction(()=>QuickJiraBatch.running);
 assert(await page.locator('#bulkLogBtn').isDisabled());assert.match(await page.locator('#bulkLogBtn').innerText(),/Đang xử lý/);assert(await page.locator('#bulkPreviewProgress').isVisible());
 await page.waitForFunction(()=>Number($('bulkPreviewMeter').getAttribute('aria-valuenow'))>0&&Number($('bulkPreviewMeter').getAttribute('aria-valuenow'))<100);assert.equal(posts.length,0);
 await page.waitForFunction(()=>QuickJiraBatch.active&&!QuickJiraBatch.running);
 // Whole-day split groups exchange atomically; both split pieces show resize handles.
 const first=await page.evaluate(()=>{const item=calendarPreviewItems().find(x=>x.key==='EPU-1');stageCalendarMove(item,{date:'2026-10-20',start:'08:00'});return calendarPreviewItems().filter(x=>x.batchNew).map(x=>({key:x.key,date:x.date,start:x.start,minutes:x.minutes}));});
 assert(first.filter(x=>x.key==='EPU-1').every(x=>x.date==='2026-10-20'));assert(first.filter(x=>x.key==='EPU-2').every(x=>x.date==='2026-10-19'));assert.equal(overlapWarnings,0);
 assert.equal(await page.locator('.week-worklog-block').filter({hasText:'EPU-1'}).locator('[data-calendar-resize]').count(),2);
 if(viewport.width===1440||viewport.width===390){
  const handle=page.locator('.week-worklog-block').filter({hasText:'EPU-1'}).last().locator('[data-calendar-resize]');await handle.scrollIntoViewIfNeeded();let box=await handle.boundingBox();
  if(mobile){const cdp=await context.newCDPSession(page);const touch=async(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});await touch('touchStart',box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(620);await touch('touchEnd');await page.waitForTimeout(150);
   box=await handle.boundingBox();const goal=await handle.evaluate(el=>{const c=el.closest('.week-day-column'),r=c.getBoundingClientRect();return {x:r.x+30,y:r.y+(660-Number(c.dataset.fromMinute))*r.height/Number(c.parentElement.dataset.minuteRange)-3};});
   await touch('touchStart',box.x+box.width/2,box.y+box.height/2);for(let i=1;i<=8;i++)await touch('touchMove',box.x+box.width/2+(goal.x-box.x-box.width/2)*i/8,box.y+box.height/2+(goal.y-box.y-box.height/2)*i/8);await touch('touchEnd');await cdp.detach();
  }else{const goal=await handle.evaluate(el=>{const c=el.closest('.week-day-column'),r=c.getBoundingClientRect();return {x:r.x+30,y:r.y+(660-Number(c.dataset.fromMinute))*r.height/Number(c.parentElement.dataset.minuteRange)-3};});await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(goal.x,goal.y,{steps:10});await page.mouse.up();}
  await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>calendarPreviewItems().filter(x=>x.key==='EPU-1').reduce((n,x)=>n+x.minutes,0)),180,'actual split-group edge resize works');await page.evaluate(()=>resetCalendarInteraction());
 }
 // Reduce an 8h group to 1h using the preview integration.
 await page.evaluate(()=>{const item=calendarPreviewItems().find(x=>x.key==='EPU-1');stageCalendarResize(item,QuickJiraBatch.proposeResize(item,540));});
 assert.equal(await page.evaluate(()=>calendarPreviewItems().filter(x=>x.key==='EPU-1').reduce((n,x)=>n+x.minutes,0)),60);
 // Actual edge pointer drag to a whole working day; lunch must become a gap.
 const block=page.locator('.week-worklog-block').filter({hasText:'EPU-1'}).first();await block.scrollIntoViewIfNeeded();
 if(viewport.width===1440){
  const handle=block.locator('[data-calendar-resize]'),box=await handle.boundingBox();const goal=await block.evaluate(el=>{const c=el.closest('.week-day-column'),r=c.getBoundingClientRect();return {x:r.x+30,y:r.y+(1050-Number(c.dataset.fromMinute))*r.height/Number(c.parentElement.dataset.minuteRange)-3};});
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(goal.x,goal.y,{steps:12});await page.mouse.up();await page.waitForTimeout(200);
 } else {
  await page.evaluate(()=>{const item=calendarPreviewItems().find(x=>x.key==='EPU-1');stageCalendarResize(item,QuickJiraBatch.proposeResize(item,1050));});
 }
 assert.deepEqual(await page.evaluate(()=>calendarPreviewItems().filter(x=>x.key==='EPU-1').map(x=>[x.start,x.end,x.minutes])),[['08:00','12:00',240],['13:30','17:30',240]]);
 // Remove only EPU-3's pending worklogs by tapping its block; no Jira DELETE.
 await page.evaluate(()=>resetCalendarInteraction());await page.waitForTimeout(650);await page.locator('.week-worklog-block').filter({hasText:'EPU-3'}).first().click();await page.locator('#batchDraftRemove').click();assert.equal(posts.length,0);assert.equal(await page.locator('.week-worklog-block').filter({hasText:'EPU-3'}).count(),0);
 // Shrink A, then attempt a partial collision with full-day B; reject first.
 await page.evaluate(()=>{const item=calendarPreviewItems().find(x=>x.key==='EPU-1');stageCalendarResize(item,QuickJiraBatch.proposeResize(item,540));});
 const before=await page.evaluate(()=>JSON.stringify(calendarPreviewItems().filter(x=>x.batchNew)));choice=false;
 await page.evaluate(()=>stageCalendarMove(calendarPreviewItems().find(x=>x.key==='EPU-1'),{date:'2026-10-19',start:'09:00'}));
 assert.equal(await page.evaluate(()=>JSON.stringify(calendarPreviewItems().filter(x=>x.batchNew))),before);
 choice=true;await page.evaluate(()=>stageCalendarMove(calendarPreviewItems().find(x=>x.key==='EPU-1'),{date:'2026-10-19',start:'09:00'}));assert.equal(overlapWarnings,2);
 assert.equal(await page.evaluate(()=>calendarPreviewItems().find(x=>x.key==='EPU-1').start),'09:00');assert(await page.evaluate(()=>QuickJiraBatch.job.approved['EPU-1']));
 assert.deepEqual(await page.evaluate(()=>calendarPreviewItems().filter(x=>x.key==='EPU-2').map(x=>[x.start,x.end])),[['08:00','12:00'],['13:30','17:30']]);
 assert.equal(await page.evaluate(()=>QuickJiraBatch.job.unused),1920,'overlapping hour does not consume the same free space twice');await page.locator('.week-worklog-block').filter({hasText:'EPU-1'}).first().scrollIntoViewIfNeeded();
 for(const theme of ['light','dark']){await page.evaluate(t=>applyTheme(t),theme);await page.waitForTimeout(100);assert(!(await page.locator('.history-tool-sheet').evaluate(el=>el.scrollWidth>el.clientWidth+1)));if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`review-${viewport.width}-${theme}.png`)});}}
 await page.locator('#batchPreviewSave').click();assert.match(await page.locator('#batchConfirmError').innerText(),/xếp trùng/);await page.locator('#batchConfirmSave').click();await page.waitForFunction(()=>!QuickJiraBatch.active&&!state.historyLoading);
 assert.equal(posts.length,1,'overlapping pending group is written together');assert.equal(posts[0].items.length,2);assert(posts[0].items.every(p=>p.key!=='EPU-3'));assert(posts.every(p=>p.confirmOverlaps&&p.exactPlan[0].allowOverlap),'both pending sides acknowledge the overlap so write order cannot reject the second row');
 assert.deepEqual(errors,[]);console.log('Preview edits: calendar week, button/progress, split8h swap, whole-day resize, removal, reject/accept overlap and exact confirmed writes passed',viewport);await context.close();
}await browser.close();await new Promise(r=>server.close(r));})().catch(e=>{console.error(e);server.close();process.exit(1);});
