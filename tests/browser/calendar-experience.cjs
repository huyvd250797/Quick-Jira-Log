'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{server}=require('./serve.cjs');
(async()=>{
 await new Promise(r=>server.listen(4219,'127.0.0.1',r));
 const browser=await chromium.launch({...(process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
 for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:320,height:683},{width:844,height:390}].filter(v=>!process.env.QJL_EXPERIENCE_WIDTH||v.width===Number(process.env.QJL_EXPERIENCE_WIDTH))){
  const mobile=viewport.width<900,context=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile,serviceWorkers:'block',timezoneId:'Asia/Ho_Chi_Minh',reducedMotion:viewport.width===320?'reduce':'no-preference'}),page=await context.newPage(),errors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:['2026-10-19T02:00:00Z']));}static now(){return D.parse('2026-10-19T02:00:00Z');}};Object.defineProperty(Element.prototype,'requestFullscreen',{configurable:true,value:undefined});});
  const make=(id,start,date='2026-10-19',minutes=60)=>({id:String(id),key:'CAL-'+id,project:'CAL',summary:'Hỗ trợ kiểm tra dữ liệu',description:'Exact description',date,start,end:`${String(Math.floor((Number(start.slice(0,2))*60+Number(start.slice(3))+minutes)/60)).padStart(2,'0')}:${String((Number(start.slice(3))+minutes)%60).padStart(2,'0')}`,minutes,timeSpentSeconds:minutes*60,started:`${date}T${start}:00.000+0700`,overtimeKnown:true,overtime:false});
  let logs=[make(1,'08:00'),make(2,'09:00'),make(3,'10:00')],delay=0,readError=false,failId='2',lost=false,batchFail=false;
  await page.route('**/api?*',async route=>{
   const u=new URL(route.request().url()),action=u.searchParams.get('action');let data={ok:true},status=200;
   if(action==='status')data={ok:true,authenticated:true,user:{username:'boss',displayName:'Boss'}};
   if(action==='subtasks')data={ok:true,issues:[]};
   if(action==='worklog-history'){
    if(delay)await new Promise(r=>setTimeout(r,delay));
    if(readError){status=503;data={ok:false,error:'Fixture read failure'};}
    else data={ok:true,items:logs.filter(x=>x.date>=u.searchParams.get('date')&&x.date<=(u.searchParams.get('endDate')||u.searchParams.get('date')))};
   }
   if(action==='calendar-history')data={ok:true,readOnly:true,viewedUser:{key:'OTHER',username:'other',displayName:'Other User'},items:logs.map(x=>({...x,calendarReadOnly:true}))};
   if(action==='worklog-correction'){
    const b=route.request().postDataJSON();writes.push({action,body:b});
    if(b.worklogId===failId){status=403;data={ok:false,error:'Jira từ chối sửa worklog này.'};}
    else{const raw=logs.find(x=>x.id===b.worklogId);assert.equal(raw.started,b.expectedStarted);assert.equal(raw.timeSpentSeconds,b.expectedSeconds);Object.assign(raw,make(raw.id,b.start,b.date,(b.targetSeconds||raw.timeSpentSeconds)/60));if(lost){await route.abort('failed');return;}data={ok:true,moved:true,worklogVerified:true};}
   }
   if(action==='calendar-moves'){
    const b=route.request().postDataJSON();writes.push({action,body:b});
    if(batchFail){status=422;data={ok:false,error:'Nhóm đổi chỗ lỗi; đã phục hồi dữ liệu gốc.',details:{rolledBack:true}};}
    else{for(const move of b.moves){const raw=logs.find(x=>x.id===move.worklogId);Object.assign(raw,make(raw.id,move.start,move.date,(move.targetSeconds||raw.timeSpentSeconds)/60));}data={ok:true,moved:true,worklogVerified:true,items:logs};}
   }
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:4219');await page.locator(mobile?'#mobileHistoryBtn':'#historyBtn').click();await page.waitForFunction(()=>state.historyLoaded&&!state.historyLoading&&!document.querySelector('#historyOverlay.qjl-opening'));
  const settled=()=>page.waitForFunction(()=>!state.historyLoading&&!state.calendarMovePending&&!weekFitFrame);
  const focal=()=>page.evaluate(()=>captureCalendarViewport());
  const refresh=async()=>{await page.evaluate(()=>loadWorklogHistory({quiet:true,force:true}));await settled();await page.waitForTimeout(60);};
  await page.evaluate(()=>{window.unchangedGrid=document.querySelector('.weekly-inner');});await refresh();assert(await page.evaluate(()=>unchangedGrid===document.querySelector('.weekly-inner')),'unchanged data reuses the rendered grid');
  // A refresh keeps the old grid visible under loading, then restores logical
  // date/minute even if an early OT worklog changes the timeline origin.
  await page.evaluate(()=>{setCalendarZoom('time',200);setCalendarZoom('day',200);});await page.waitForTimeout(80);
  await page.evaluate(()=>{const r=document.getElementById('historyResults');r.scrollLeft=260;r.scrollTop=Math.min(240,r.scrollHeight-r.clientHeight);});const before=await focal();
  logs.push({...make(9,'06:00'),overtime:true});delay=220;
  await page.evaluate(()=>{window.oldGrid=document.querySelector('.weekly-inner');window.refreshPromise=loadWorklogHistory({quiet:true,force:true});});
  await page.waitForFunction(()=>state.historyLoading);assert(await page.locator('#worklogCalendar').isVisible());assert(await page.evaluate(()=>oldGrid===document.querySelector('.weekly-inner')),'keep existing nodes while loading');
  await page.evaluate(()=>refreshPromise);await settled();await page.waitForTimeout(80);let after=await focal();assert.equal(after.focal.date,before.focal.date);assert(Math.abs(after.focal.minute-before.focal.minute)<2,JSON.stringify({before,after,diag:await page.evaluate(()=>({stored:state.historyViewportSnapshot,geometry:calendarZoomGrid.geometry,range:document.querySelector('.week-grid-body').dataset.minuteRange,from:document.querySelector('.week-day-column').dataset.fromMinute,top:document.getElementById('historyResults').scrollTop,real:document.querySelector('.weekly-inner').getBoundingClientRect().toJSON()}))}));
  // Failed reload/retry keeps the last good focal point, never an origin reset.
  readError=true;await refresh();assert(await page.locator('#worklogHistoryState').getAttribute('class').then(x=>x.includes('is-error')));readError=false;await refresh();after=await focal();assert.equal(after.focal.date,before.focal.date);assert(Math.abs(after.focal.minute-before.focal.minute)<2);
  delay=0;
  const stage=async(id,start)=>page.evaluate(({id,start})=>stageCalendarMove(calendarPreviewItems().find(x=>x.id===id),{date:'2026-10-19',start}),{id:String(id),start});
  const save=async()=>{await page.locator('#calendarSaveBtn').click();await page.locator('#calendarConfirmSaveBtn').click();await settled();};
  const statuses=()=>page.locator('#calendarSaveList li').evaluateAll(rows=>Object.fromEntries(rows.map(row=>[row.dataset.saveKey,row.querySelector('.calendar-save-status').dataset.saveState])));
  await stage(1,'13:30');await stage(2,'14:30');await stage(3,'15:30');await save();
  let states=await statuses();assert.equal(states['CAL-1:1'],'saved');assert.equal(states['CAL-2:2'],'failed');assert.equal(states['CAL-3:3'],'waiting');assert.equal(writes.length,2);assert.equal(await page.evaluate(()=>state.calendarDrafts.size),2);
  assert((await page.locator('#calendarSaveResult').innerText()).includes('1/3'));assert((await page.locator('#calendarConfirmSaveBtn').innerText()).includes('(2)'));
  // Closing/reopening retains both confirmed rows and the unsubmitted remainder.
  await page.locator('#calendarCancelSaveBtn').click();await page.locator('#calendarSaveBtn').click();assert.equal((await statuses())['CAL-1:1'],'saved');
  for(const theme of ['light','dark']){
   await page.evaluate(t=>applyTheme(t),theme);await page.waitForTimeout(180);
   const bounds=await page.locator('#calendarSaveDialog').evaluate(el=>({rect:el.getBoundingClientRect().toJSON(),w:innerWidth,h:innerHeight,overflow:el.scrollWidth>el.clientWidth+1}));assert(!bounds.overflow);assert(bounds.rect.x>=0&&bounds.rect.right<=bounds.w+1&&bounds.rect.y>=0&&bounds.rect.bottom<=bounds.h+1);
   if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`save-results-${viewport.width}-${theme}.png`)});}
  }
  failId='';await page.locator('#calendarConfirmSaveBtn').click();await settled();await page.waitForFunction(()=>!document.getElementById('calendarSaveDialog').open);
  assert.deepEqual(writes.map(x=>x.body.worklogId),['1','2','2','3'],'only remaining rows are resent after explicit review');assert.equal(await page.evaluate(()=>state.calendarDrafts.size),0);
  // Lost write response remains unknown until a fresh read confirms the target.
  await stage(1,'08:00');lost=true;await save();assert.equal((await statuses())['CAL-1:1'],'unknown');const count=writes.length;lost=false;readError=true;await page.locator('#calendarConfirmSaveBtn').click();await settled();assert.equal((await statuses())['CAL-1:1'],'unknown','a failed reconciliation read must not relabel an uncertain write as unsent');assert.equal(writes.length,count);readError=false;await page.locator('#calendarConfirmSaveBtn').click();await settled();assert.equal(writes.length,count,'reconciliation does not duplicate the committed write');assert.equal(await page.evaluate(()=>state.calendarDrafts.size),0);
  // Swap rollback is labelled as restored, not saved or an uncertain write.
  await stage(1,'14:30');batchFail=true;await save();states=await statuses();assert.equal(states['CAL-1:1'],'rolledback');assert.equal(states['CAL-2:2'],'rolledback');assert.equal(await page.evaluate(()=>state.calendarDrafts.size),2);
  batchFail=false;await page.locator('#calendarConfirmSaveBtn').click();await settled();assert.equal(await page.evaluate(()=>state.calendarDrafts.size),0);
  // A preflight conflict marks the actual row and leaves all writes untouched.
  await stage(1,'08:00');Object.assign(logs.find(x=>x.id==='1'),make(1,'16:00'));const beforeConflict=writes.length;await save();assert.equal((await statuses())['CAL-1:1'],'conflict');assert.equal(writes.length,beforeConflict);
  await page.locator('#calendarDiscardBtn').click();await settled();assert.equal(await page.evaluate(()=>calendarSaveReport),null);
  assert.deepEqual(errors,[]);console.log('Experience: retained refresh/range origin/error retry + per-row partial save/explicit retry/unknown readback/rollback/conflict and bounded light/dark review passed',viewport);await context.close();
 }
 await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);server.close();process.exit(1);});
