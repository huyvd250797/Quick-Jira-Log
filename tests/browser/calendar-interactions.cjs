'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'),{server}=require('./serve.cjs');
(async()=>{
 await new Promise(r=>server.listen(4197,'127.0.0.1',r));
 const browser=await chromium.launch({...(process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const viewport of (process.env.QJL_TOUCH_ONLY ? [{width:390,height:1000}] : [{width:1440,height:1100},{width:390,height:1000},{width:320,height:900}])){
  const mobile=viewport.width<900,context=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile,serviceWorkers:'block',timezoneId:'Asia/Ho_Chi_Minh'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...args){super(...args.length?args:['2026-10-16T13:00:00Z']);}static now(){return D.parse('2026-10-16T13:00:00Z');}};});
  let logs=[],posts=[],patches=[],rejectMove=false,unknownMove=false,rejectId='';
  const make=(id,start,minutes)=>({id:String(id),key:'CAL-1',project:'CAL',summary:'Hỗ trợ vận hành hệ thống',description:'Giữ nguyên mô tả',date:'2026-10-16',start,end:`${String(Math.floor((parseInt(start)*60+Number(start.slice(3))+minutes)/60)).padStart(2,'0')}:${String((Number(start.slice(3))+minutes)%60).padStart(2,'0')}`,minutes,timeSpentSeconds:minutes*60,started:`2026-10-16T${start}:00.000+0700`,overtimeKnown:true,overtime:false});
  logs.push(make('2','09:00',60));
  await page.route('**/api?*',async route=>{
   const url=new URL(route.request().url()),action=url.searchParams.get('action');let data={ok:true},status=200;
   if(action==='status')data={ok:true,authenticated:true,user:{displayName:'Boss',username:'boss'}};
   if(action==='subtasks')data={ok:true,issues:[{key:'CAL-1',project:'CAL',summary:'Hỗ trợ vận hành hệ thống',issueType:'Sub-task',status:'In Progress'}]};
   if(action==='day-audit')data={ok:true,regularOccupiedMinutes:logs.reduce((s,x)=>s+x.minutes,0),occupiedMinutes:60,freeMinutes:420,occupied:[],available:[]};
   if(action==='worklog-history')data={ok:true,items:logs.filter(x=>x.date>=url.searchParams.get('date')&&x.date<=(url.searchParams.get('endDate')||url.searchParams.get('date'))),skipped:[]};
   if(action==='worklog'){
    const body=route.request().postDataJSON();posts.push(body);assert.equal(body.startTime,'15:00');
    logs.push(make('1',body.startTime,60));
    data={ok:true,issue:{key:'CAL-1',summary:'Hỗ trợ vận hành hệ thống'},date:body.date,project:'CAL',exactStart:true,startTime:body.startTime,totalMinutes:60,segments:[{start:body.startTime,end:'16:00',minutes:60}],transition:{ok:true,status:'Done'}};
   }
   if(action==='worklog-correction'){
    const body=route.request().postDataJSON();patches.push(body);
    if(rejectMove||body.worklogId===rejectId){status=403;data={ok:false,error:'Jira không cho phép sửa worklog này.'};}
    else{const log=logs.find(x=>x.id===body.worklogId);const n=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
     assert(!logs.some(x=>x.id!==body.worklogId&&x.date===body.date&&n(body.start)<n(x.start)+x.minutes&&n(body.start)+log.minutes>n(x.start)),'Save order must free occupied originals before moving into them');
     assert.equal(body.moveOnly,true);assert.equal(body.expectedSeconds,log.timeSpentSeconds);assert.equal(body.expectedStarted,log.started);
     log.date=body.date;log.start=body.start;log.end=`${String(parseInt(body.start)+1).padStart(2,'0')}:${body.start.slice(3)}`;log.started=`${body.date}T${body.start}:00.000+0700`;
     data={ok:true,moved:true,worklogVerified:true,date:body.date,start:body.start,timeSpentSeconds:log.timeSpentSeconds};
     if(unknownMove){unknownMove=false;await route.abort('failed');return;}}
   }
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:4197');await page.waitForFunction(()=>!document.body.classList.contains('booting'));
  await page.locator(mobile?'#mobileHistoryBtn':'#historyBtn').click();await page.waitForFunction(()=>state.historyLoaded&&!state.historyLoading);await page.waitForTimeout(200);
  const point=async(time,date="2026-10-16")=>page.evaluate(({minute,date})=>{
   const col=document.querySelector(`[data-calendar-date="${date}"]`),results=document.getElementById('historyResults');
   results.scrollLeft=Math.max(0,col.offsetLeft-54);results.scrollTop=0;
   const r=col.getBoundingClientRect(),scale=r.height/Number(col.parentElement.dataset.minuteRange),from=Number(col.dataset.fromMinute);
   return{x:Math.min(innerWidth-20,r.left+40),y:r.top+(minute-from)*scale+2};
  },{minute:time,date});
  assert.equal(await page.locator('#calendarSaveBtn').isVisible(),false);
  const slot=await point(900);await page.mouse.click(slot.x,slot.y);
  await page.waitForFunction(()=>document.getElementById('calendarLogDialog').open);
  assert.equal(await page.evaluate(()=>['INPUT','TEXTAREA'].includes(document.activeElement.tagName)),false);
  await page.locator('.calendar-task-row').click();
  assert.equal(await page.locator('#calendarStart').inputValue(),'15:00');assert.equal(await page.locator('#date').inputValue(),'2026-10-16');
  assert.equal(await page.locator('#logNextBtn').isVisible(),false);
  assert.equal(await page.evaluate(()=>['INPUT','TEXTAREA'].includes(document.activeElement.tagName)),false);
  const formFit = await page.locator('#calendarLogDialog').evaluate(dialog=>{const r=dialog.getBoundingClientRect();return [...dialog.querySelectorAll('input,textarea,button')].filter(x=>x.getClientRects().length).every(x=>{const b=x.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1;});});assert(formFit);
  if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`calendar-form-${viewport.width}.png`)});}
  await page.locator('#timeSpent').fill('1h');await page.locator('#logBtn').click();
  await page.locator('#confirmLogBtn').click();
  await page.waitForFunction(()=>!document.getElementById('calendarLogDialog').open&&state.historyLoaded&&!state.historyLoading);
  await page.waitForFunction(()=>!document.getElementById('logProgressDialog').open);
  await page.waitForTimeout(200);
  assert.equal(posts.length,1);assert.equal(logs.find(x=>x.id==='1').start,'15:00');
  const drag=async(to,{long=true,targetDate="2026-10-16"}={})=>{
   await point(480);
   const geometry=await page.evaluate(()=>{const button=[...document.querySelectorAll('[data-week-event]')].find(b=>state.historyItems[Number(b.dataset.weekEvent)].id==='1');const r=button.getBoundingClientRect();return{x:r.left+30,y:r.top+8};});
   const target=await point(to,targetDate);target.y+=6;
   if(mobile){const session=await context.newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:geometry.x,y:geometry.y}]});
    if(long){await page.waitForTimeout(650);await page.waitForFunction(()=>calendarEditMode);}
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:target.x,y:target.y}]});await page.waitForTimeout(80);
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
   }else{await page.mouse.move(geometry.x,geometry.y);await page.mouse.down();await page.mouse.move(target.x,target.y,{steps:12});await page.mouse.up();}
  };
  const confirmSave=async()=>{await page.locator('#calendarSaveBtn').click();await page.waitForFunction(()=>document.getElementById('calendarSaveDialog').open);await page.locator('#calendarConfirmSaveBtn').click();await page.waitForFunction(()=>!state.calendarMovePending&&!state.historyLoading);};
  const draftCount=()=>page.evaluate(()=>state.calendarDrafts.size);
  await drag(480);assert.equal(await draftCount(),1);assert.equal(patches.length,0);assert.equal(logs.find(x=>x.id==='1').start,'15:00');
  assert.equal(await page.locator('#calendarSaveBtn').isVisible(),true);assert.equal(await page.locator('.is-calendar-draft').count(),1);
  const headerFit=await page.locator('.history-header-actions').evaluate(e=>[...e.querySelectorAll('button')].filter(x=>x.getClientRects().length).every(x=>{const r=x.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}));assert(headerFit);
  // Leaving mobile edit mode preserves the pending move without opening a log form.
  if(mobile){assert.equal(await page.evaluate(()=>calendarEditMode),true);const blank=await point(660);await page.mouse.click(blank.x,blank.y);assert.equal(await page.evaluate(()=>calendarEditMode),false);assert.equal(await page.locator('#calendarLogDialog').evaluate(x=>x.open),false);assert.equal(await draftCount(),1);}
  await page.locator('#calendarSaveBtn').click();assert.equal(patches.length,0);assert((await page.locator('#calendarSaveList').textContent()).includes('08:00'));
  await page.locator('#calendarCancelSaveBtn').click();assert.equal(await draftCount(),1);assert.equal(patches.length,0);
  // Refresh and fullscreen must retain drafts and expose a usable save icon.
  await page.locator('#calendarRefreshBtn').click();await page.waitForFunction(()=>!state.historyLoading);assert.equal(await page.locator('.is-calendar-draft').count(),1);
  await page.locator('#calendarFullscreenBtn').click();await page.waitForFunction(()=>state.calendarFullscreen);await page.waitForTimeout(200);
  const fullscreenFit=await page.locator('#calendarSaveBtn').evaluate(e=>{const r=e.getBoundingClientRect();return r.width>20&&r.left>=0&&r.right<=innerWidth;});assert(fullscreenFit);
  await page.locator('#calendarSaveBtn').click();assert(await page.locator('#calendarSaveDialog').evaluate(e=>e.open));await page.waitForTimeout(220);
  if(process.env.QJL_QA_OUTPUT)await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`calendar-review-fullscreen-${viewport.width}.png`)});
  await page.locator('#calendarCancelSaveBtn').click();
  await page.locator('#calendarFullscreenBtn').click();await page.waitForFunction(()=>!state.calendarFullscreen);await page.waitForTimeout(200);
  if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`calendar-draft-${viewport.width}.png`)});}
  await confirmSave();await page.waitForFunction(()=>!document.getElementById('calendarSaveDialog').open);
  assert.equal(patches.length,1);assert.equal(logs.find(x=>x.id==='1').start,'08:00');assert.equal(logs.find(x=>x.id==='1').end,'09:00');assert.equal(logs.find(x=>x.id==='1').description,'Giữ nguyên mô tả');assert.equal(await page.locator('#calendarSaveBtn').isVisible(),false);assert((await page.locator('#toast').textContent()).includes('Lưu lịch thành công'));
  // Returning a preview to its original position removes the draft without a write.
  await drag(600);assert.equal(await draftCount(),1);await drag(480);assert.equal(await draftCount(),0);assert.equal(patches.length,1);assert.equal(await page.locator('#calendarSaveBtn').isVisible(),false);
  const before=patches.length;await drag(540);await page.waitForTimeout(150);assert.equal(patches.length,before);assert.equal(await draftCount(),2);assert((await page.locator('#calendarInteractionState').textContent()).includes('đổi chỗ'));
  await page.locator('#calendarSaveBtn').click();await page.locator('#calendarDiscardBtn').click();await page.waitForFunction(()=>!state.historyLoading);
  if(mobile){const blank=await point(660);await page.mouse.click(blank.x,blank.y);}
  rejectMove=true;await drag(810);assert.equal(patches.length,before);await confirmSave();
  assert.equal(patches.length,before+1);assert.equal(logs.find(x=>x.id==='1').start,'08:00');assert.equal(await draftCount(),1);assert((await page.locator('#calendarSaveError').textContent()).includes('không cho phép'));assert.equal(await page.locator('#calendarSaveBtn').isVisible(),true);
  await page.locator('#calendarCancelSaveBtn').click();assert.equal(await draftCount(),1);
  await page.locator('#closeHistoryBtn').click();assert(await page.locator('#calendarSaveDialog').evaluate(e=>e.open));assert.equal(await page.locator('#historyOverlay').isVisible(),true);
  await page.locator('#calendarCancelSaveBtn').click();await page.locator('#calendarSaveBtn').click();await page.locator('#calendarDiscardBtn').click();await page.waitForFunction(()=>!state.historyLoading);assert.equal(await draftCount(),0);assert.equal(logs.find(x=>x.id==='1').start,'08:00');rejectMove=false;
  // A lost response after commit is reconciled using GET before another PATCH.
  await drag(600);unknownMove=true;await confirmSave();assert.equal(await draftCount(),1);assert.equal(logs.find(x=>x.id==='1').start,'10:00');const afterUnknown=patches.length;
  await page.locator('#calendarConfirmSaveBtn').click();await page.waitForFunction(()=>!state.calendarMovePending&&!document.getElementById('calendarSaveDialog').open);assert.equal(patches.length,afterUnknown);assert.equal(await draftCount(),0);
  if(!mobile){await drag(810,{targetDate:'2026-10-12'});assert.equal(logs.find(x=>x.id==='1').date,'2026-10-16');await confirmSave();assert.equal(logs.find(x=>x.id==='1').date,'2026-10-12');assert.equal(logs.find(x=>x.id==='1').start,'13:30');}
  else{
   const blank=await point(660);await page.touchscreen.tap(blank.x,blank.y);await page.waitForTimeout(650);
   await point(480);
   const source=await page.evaluate(()=>{const e=[...document.querySelectorAll('[data-week-event]')].find(e=>state.historyItems[Number(e.dataset.weekEvent)].id==='1'),r=e.getBoundingClientRect();return{x:r.left+25,y:r.top+12};});
   // A short tap still opens details; a scroll beginning before long-press must not enable edit mode.
   await page.touchscreen.tap(source.x,source.y);await page.waitForFunction(()=>document.getElementById('worklogCorrectionDialog').open);
   await page.locator('#cancelCorrectionBtn').click();await page.waitForTimeout(300);
   const session=await context.newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[source]});await page.waitForTimeout(80);
   await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:source.x,y:source.y+45}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(650);await session.detach();
   assert.equal(await page.evaluate(()=>calendarEditMode),false);assert.equal(await page.locator('#calendarLogDialog').evaluate(e=>e.open),false);
  }
  if(!mobile){
   logs=[make('1','15:00',60),make('2','08:00',60)];
   await page.evaluate(async()=>{document.getElementById('historyDate').value='2026-10-16';await loadWorklogHistory({quiet:true,force:true});});
   const stage=async(id,start)=>page.evaluate(({id,start})=>stageCalendarMove(state.historyItems.find(x=>x.id===id),{date:'2026-10-16',start}),{id,start});
   // First A targets B's old slot, then B vacates it: the save must order B first.
   await stage('2','10:00');await stage('1','08:00');
   const orderBefore=patches.length;await confirmSave();assert.deepEqual(patches.slice(orderBefore).map(x=>x.worklogId),['2','1']);
   assert.equal(await draftCount(),0);assert.equal(logs.find(x=>x.id==='1').start,'08:00');
   // A confirmed success is removed; only the rejected second item remains/retries.
   await stage('1','13:30');await stage('2','15:00');rejectId='2';const partialBefore=patches.length;await confirmSave();
   assert.equal(await draftCount(),1);assert.equal(logs.find(x=>x.id==='1').start,'13:30');assert.equal(logs.find(x=>x.id==='2').start,'10:00');assert((await page.locator('#calendarSaveError').textContent()).includes('1/2'));
   rejectId='';await page.locator('#calendarConfirmSaveBtn').click();await page.waitForFunction(()=>!state.calendarMovePending&&!document.getElementById('calendarSaveDialog').open);
   assert.deepEqual(patches.slice(partialBefore).map(x=>x.worklogId),['1','2','2']);assert.equal(await draftCount(),0);
   // A fresh remote change is detected before any PATCH, keeping the pending move.
   await stage('1','08:00');const staleBefore=patches.length;logs.find(x=>x.id==='1').started='2026-10-16T14:30:00.000+0700';logs.find(x=>x.id==='1').start='14:30';
   await confirmSave();assert.equal(patches.length,staleBefore);assert.equal(await draftCount(),1);assert((await page.locator('#calendarSaveError').textContent()).includes('đã thay đổi'));
   await page.locator('#calendarDiscardBtn').click();await page.waitForFunction(()=>!state.historyLoading);
   // Closing with a pending position requires a decision; discard closes safely.
   await stage('1','08:00');await page.locator('#closeHistoryBtn').click();await page.locator('#calendarDiscardBtn').click();await page.waitForTimeout(250);assert.equal(await page.locator('#historyOverlay').isVisible(),false);assert.equal(await draftCount(),0);
  }
  assert.deepEqual(errors,[]);await context.close();console.log('V1.16.0 click-to-log, staged drag, explicit confirm/cancel/save/discard, refresh/fullscreen, mobile hold/exit, overlap, rejected save and unknown-result reconciliation passed',viewport);
 }
 await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);server.close();process.exit(1)});
