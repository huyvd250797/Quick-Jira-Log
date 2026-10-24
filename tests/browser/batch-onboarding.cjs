'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{chromium}=require('playwright'),{server}=require('./serve.cjs');
(async()=>{await new Promise(r=>server.listen(4258,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.QJL_CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:683},{width:844,height:390}]){
 const context=await browser.newContext({viewport,isMobile:viewport.width<900,hasTouch:viewport.width<900,timezoneId:'Asia/Ho_Chi_Minh',serviceWorkers:'block'}),page=await context.newPage(),errors=[],posts=[];let who='boss',confirms=0,late=false;
 const old=[{id:'900',key:'EPU-9',project:'EPU',date:'2026-10-20',start:'08:00',end:'09:00',minutes:60,timeSpentSeconds:3600,summary:'Existing project log',description:'Already saved',overtime:false,overtimeKnown:true},{id:'901',key:'EPU-10',project:'EPU',date:'2026-10-20',start:'11:00',end:'12:00',minutes:60,timeSpentSeconds:3600,summary:'Existing overtime log',description:'Already saved OT',overtime:true,overtimeKnown:true}];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{confirms++;d.accept();});
 await page.route('**/api?*',async route=>{const req=route.request(),u=new URL(req.url()),a=u.searchParams.get('action');let data={ok:true};
  if(a==='status')data={ok:true,authenticated:true,user:{username:who,displayName:'Same display name'}};
  if(a==='subtasks')data={ok:true,issues:[{key:'EPU-1',project:'EPU',summary:'New draft in the same project',status:'In Progress'}]};
  if(a==='day-audit')data={ok:true,occupied:[...old.filter(x=>x.date===u.searchParams.get('date')).map(x=>({start:x.start,end:x.end})),...(late&&u.searchParams.get('date')==='2026-10-20'?[{start:'14:30',end:'15:30'}]:[])],regularOccupiedMinutes:120};
  if(a==='day-audit'&&u.searchParams.has('dates'))data={ok:true,days:u.searchParams.get('dates').split(',').map(date=>({date,occupied:old.filter(x=>x.date===date).map(x=>({start:x.start,end:x.end}))}))};
  if(a==='worklog-history')data={ok:true,items:old};
  if(a==='bulk-worklog'){posts.push(req.postDataJSON());data={ok:true,transitions:[]};}
  await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });
 const login=async()=>{await page.goto('http://127.0.0.1:4258');await page.waitForFunction(()=>state.filterLoaded);};
 const enter=async()=>{await page.locator('#logAllBtn').click();};const exit=async()=>{await page.locator('#cancelBulkBtn').click();await page.waitForFunction(()=>$('bulkCard').classList.contains('hidden'));};
 await login();await enter();assert(await page.locator('#bulkAllocationHelpDialog').isVisible());assert(!(await page.locator('#bulkHelpHide').isChecked()));
 assert.match(await page.locator('#bulkAllocationHelpDialog').innerText(),/5 Subtask/);assert.match(await page.locator('#bulkAllocationHelpDialog').innerText(),/40h/);
 assert.equal(await page.locator('#bulkHelpRule').count(),0);assert.match(await page.locator('#bulkAllocationHelpDialog').innerText(),/Bật Phân bổ tự động/);
 assert.equal(await page.locator('.bulk-help-modes section').count(),2);
 // The real modal stays in the top layer while shrinking to the visible i icon.
 const flight=await page.evaluate(()=>{finishBulkHelp();const d=$('bulkAllocationHelpDialog'),t=$('bulkAllocationHelpBtn').getBoundingClientRect(),r=d.getBoundingClientRect(),a=bulkHelpFlight?.animation;return {open:d.open,closing:d.classList.contains('is-help-closing'),duration:a?.effect.getTiming().duration,last:a?.effect.getKeyframes().at(-1),dx:t.x+t.width/2-r.x-r.width/2,dy:t.y+t.height/2-r.y-r.height/2};});
 assert(flight.open&&flight.closing);assert.equal(flight.duration,380);assert.equal(Number(flight.last.opacity),0);const xy=flight.last.transform.match(/translate\(([-\d.]+)px, ?([-\d.]+)px\)/);assert(xy,JSON.stringify(flight));assert(Math.abs(Number(xy[1])-flight.dx)<.1&&Math.abs(Number(xy[2])-flight.dy)<.1,JSON.stringify(flight));
 await page.waitForFunction(()=>!$('bulkAllocationHelpDialog').open);assert.equal(await page.evaluate(()=>document.activeElement.id),'bulkAllocationHelpBtn');await exit();await enter();
 // Reduced motion acknowledges instantly, without a scale flight.
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#bulkAllocationHelpDone').click();assert(!(await page.locator('#bulkAllocationHelpDialog').isVisible()));assert.equal(await page.evaluate(()=>bulkHelpFlight),null);await page.emulateMedia({reducedMotion:'no-preference'});await exit();await enter();
 await page.locator('#bulkHelpHide').check();await page.locator('#bulkAllocationHelpClose').click();assert(await page.evaluate(()=>bulkHelpFlight&&!bulkHelpFlight.opening));await page.waitForFunction(()=>!$('bulkAllocationHelpDialog').open);await exit();await enter();assert(await page.locator('#bulkAllocationHelpDialog').isVisible());assert(!(await page.locator('#bulkHelpHide').isChecked()),'X does not save the checkbox');
 await page.locator('#bulkAllocationHelpDone').click();await exit();await enter();assert(await page.locator('#bulkAllocationHelpDialog').isVisible(),'Done without checkbox does not suppress');
 await page.locator('#bulkHelpHide').check();await page.locator('#bulkAllocationHelpDone').click();await exit();await enter();assert(!(await page.locator('#bulkAllocationHelpDialog').isVisible()));
 await page.locator('#bulkAllocationHelpBtn').click();await page.waitForFunction(()=>!bulkHelpFlight);assert(await page.locator('#bulkHelpHide').isChecked());await page.locator('#bulkAllocationHelpDone').click();await exit();
 // Account isolation and persistence through reload, with deliberately identical display names.
 who='other';await login();await enter();assert(await page.locator('#bulkAllocationHelpDialog').isVisible());assert(!(await page.locator('#bulkHelpHide').isChecked()));await page.locator('#bulkAllocationHelpDone').click();await exit();
 who='boss';await login();await enter();assert(!(await page.locator('#bulkAllocationHelpDialog').isVisible()),'Boss preference survives reload and account switching');await exit();
 if(viewport.width===390){
  who='storage-test';await login();await enter();await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('qjl:bulk-help:'))throw new DOMException('Blocked','QuotaExceededError');return original.call(this,k,v);};});
  await page.locator('#bulkHelpHide').check();await page.locator('#bulkAllocationHelpDone').click();assert.match(await page.locator('#toast').innerText(),/Chưa lưu được/);await login();await enter();assert(await page.locator('#bulkAllocationHelpDialog').isVisible());await page.locator('#bulkAllocationHelpDone').click();await exit();who='boss';await login();
 }
 await enter();await page.locator('#bulkAllocationHelpBtn').click();
 const opening=await page.evaluate(()=>({opening:bulkHelpFlight?.opening,frames:bulkHelpFlight?.animation?.effect.getKeyframes()}));assert(opening.opening);assert.equal(Number(opening.frames[0].opacity),0);assert.equal(Number(opening.frames.at(-1).opacity),1);await page.waitForFunction(()=>!bulkHelpFlight);
 if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`help-${viewport.width}.png`)});}await page.locator('#bulkAllocationHelpClose').click();
 await page.locator('#bulkAutoAllocate').uncheck();await page.locator('#bulkDate').fill('2026-10-20');await page.locator('#bulkDate').dispatchEvent('change');await page.locator('.bulk-time').fill('1h');await page.locator('#bulkLogBtn').click();await page.waitForFunction(()=>QuickJiraBatch.active&&!QuickJiraBatch.running);
 // No overlap or replacement of existing logs, including resize across one.
 const before=await page.evaluate(()=>JSON.stringify([...state.calendarDrafts.values()].map(d=>d.target))),count=confirms;
 await page.evaluate(()=>stageCalendarMove(calendarPreviewItems().find(x=>x.batchNew),{date:'2026-10-20',start:'08:00'}));assert.equal(await page.evaluate(()=>JSON.stringify([...state.calendarDrafts.values()].map(d=>d.target))),before);assert.equal(confirms,count);assert.match(await page.locator('#toast').innerText(),/đã log/);
 await page.evaluate(()=>{const item=calendarPreviewItems().find(x=>x.batchNew);stageCalendarResize(item,QuickJiraBatch.proposeResize(item,720));});assert.equal(await page.evaluate(()=>JSON.stringify([...state.calendarDrafts.values()].map(d=>d.target))),before);
 // Original palette + typography remain, with a 28% black veil over the entire saved block (not the draft).
 for(const theme of ['light','dark']){
  await page.evaluate(t=>{applyTheme(t);state.projectColors=true;renderWorklogHistory();},theme);await page.waitForTimeout(120);
  const colors=await page.evaluate(()=>{const block=key=>[...$('weeklyCalendar').querySelectorAll('[data-week-event]')].find(el=>calendarRenderedItems[Number(el.dataset.weekEvent)].key===key),old=block('EPU-9'),fresh=block('EPU-1'),ot=block('EPU-10'),a=getComputedStyle(old),b=getComputedStyle(fresh);return {old:a.backgroundColor,fresh:b.backgroundColor,veil:getComputedStyle(old,'::after').backgroundColor,veilHit:getComputedStyle(old,'::after').pointerEvents,veilInset:getComputedStyle(old,'::after').inset,newVeil:getComputedStyle(fresh,'::after').backgroundColor,opacity:a.opacity,oldText:getComputedStyle(old.querySelector('strong')).color,newText:getComputedStyle(fresh.querySelector('strong')).color,ot:getComputedStyle(ot).backgroundColor};});
  assert.equal(colors.old,colors.fresh,'same project retains the same underlying palette');assert.equal(colors.oldText,colors.newText,'text is not dimmed');assert.equal(colors.veil,'rgba(0, 0, 0, 0.55)');assert.equal(colors.veilHit,'none');assert.equal(colors.veilInset,'0px');assert.notEqual(colors.newVeil,colors.veil);assert.equal(colors.opacity,'1');assert.notEqual(colors.ot,colors.old,'OT palette remains distinct');
  await page.locator('.week-worklog-block.is-calendar-draft').filter({hasText:'EPU-1'}).scrollIntoViewIfNeeded();if(process.env.QJL_QA_OUTPUT)await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`palette-${viewport.width}-${theme}.png`)});
 }
 // Even after an old worklog appears during review, preflight blocks before POST.
 await page.evaluate(()=>stageCalendarMove(calendarPreviewItems().find(x=>x.batchNew),{date:'2026-10-20',start:'14:30'}));late=true;await page.locator('#batchPreviewSave').click();await page.locator('#batchConfirmSave').click();await page.waitForFunction(()=>!QuickJiraBatch.job.running);assert.equal(posts.length,0);assert.match(await page.locator('#batchConfirmError').innerText(),/đã log/);
 assert.deepEqual(errors,[]);console.log('Day/week help, fly-to-i/reduced motion, per-account preference/storage failures, full-block veil/palette preservation, strict existing-log move/resize guard and fresh-save conflict passed',viewport);await context.close();
}await browser.close();await new Promise(r=>server.close(r));})().catch(e=>{console.error(e);server.close();process.exit(1);});
