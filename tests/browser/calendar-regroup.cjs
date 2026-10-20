'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{server}=require('./serve.cjs');
(async()=>{
 await new Promise(r=>server.listen(4224,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.QJL_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{for(const viewport of (process.env.QJL_REGROUP_MOBILE?[{width:390,height:1000}]:[{width:1440,height:1100},{width:390,height:1000},{width:320,height:900},{width:844,height:390}])){
  const mobile=viewport.width<900,ctx=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile,serviceWorkers:'block',timezoneId:'Asia/Ho_Chi_Minh'}),page=await ctx.newPage(),errors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...a.length?a:['2026-10-16T13:00:00Z']);}static now(){return D.parse('2026-10-16T13:00:00Z');}};});
  const make=(id,start,minutes,date='2026-10-16',key='CAL-1')=>({id:String(id),key,project:'CAL',date,start,end:`${String(Math.floor((parseInt(start)*60+Number(start.slice(3))+minutes)/60)).padStart(2,'0')}:${String((Number(start.slice(3))+minutes)%60).padStart(2,'0')}`,started:`${date}T${start}:00.000+0700`,timeSpentSeconds:minutes*60,minutes,summary:'Nhóm lịch thử nghiệm',description:'Giữ mô tả gốc',overtimeKnown:true,overtime:true});
  let logs=[make(1,'15:00',150),make(9,'08:00',30,'2026-10-12')];
  await page.route('**/api?*',async route=>{
   const u=new URL(route.request().url()),a=u.searchParams.get('action');let data={ok:true};
   if(a==='status')data={ok:true,authenticated:true,user:{username:'boss',displayName:'Boss'}};
   if(a==='subtasks')data={ok:true,issues:[]};if(a==='day-audit')data={ok:true,occupied:[],available:[]};
   if(a==='worklog-history')data={ok:true,items:logs.filter(x=>x.date>=u.searchParams.get('date')&&x.date<=(u.searchParams.get('endDate')||u.searchParams.get('date'))),skipped:[]};
   if(a==='worklog-correction'){
    const b=route.request().postDataJSON(),raw=logs.find(x=>x.id===b.worklogId&&x.key===b.key);assert(raw);assert.equal(b.expectedStarted,raw.started);assert.equal(b.expectedSeconds,raw.timeSpentSeconds);writes.push({a,b});
    Object.assign(raw,make(Number(raw.id),b.start,(b.targetSeconds??raw.timeSpentSeconds)/60,b.date,raw.key));
    data={ok:true,moved:true,worklogVerified:true,timeSpentSeconds:raw.timeSpentSeconds,...(b.calendarEdit?{resized:true}:{})};
   }
   if(a==='calendar-split'){
    const b=route.request().postDataJSON(),raw=logs.find(x=>x.id===b.worklogId);writes.push({a,b});assert.equal(b.expectedStarted,raw.started);assert.equal(b.expectedSeconds,raw.timeSpentSeconds);
    const parts=b.segments.map((s,i)=>make(i?20+i:Number(raw.id),s.start,s.targetSeconds/60,s.date,raw.key));logs=logs.filter(x=>x.id!==raw.id).concat(parts);data={ok:true,split:true,worklogVerified:true,items:parts};
   }
   if(a==='calendar-moves'){
    const b=route.request().postDataJSON();writes.push({a,b});const items=b.moves.map(m=>{const raw=logs.find(x=>x.id===m.worklogId&&x.key===m.key);assert.equal(m.expectedStarted,raw.started);assert.equal(m.expectedSeconds,raw.timeSpentSeconds);Object.assign(raw,make(Number(raw.id),m.start,(m.targetSeconds??raw.timeSpentSeconds)/60,m.date,raw.key));return raw;});data={ok:true,moved:true,worklogVerified:true,items};
   }
   await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:4224');await page.waitForFunction(()=>!QuickJiraBusy.active&&!document.body.classList.contains('booting'));
  await page.locator(mobile?'#mobileHistoryBtn':'#historyBtn').click();await page.waitForFunction(()=>state.historyLoaded&&!state.historyLoading&&!QuickJiraBusy.active);await page.waitForTimeout(250);
  await page.locator('#calendarFullscreenBtn').click();await page.waitForTimeout(250);
  const point=(m,date='2026-10-16')=>page.evaluate(({m,date})=>{const col=document.querySelector(`[data-calendar-date="${date}"]`),results=document.getElementById('historyResults');const before=col.getBoundingClientRect(),bounds=results.getBoundingClientRect();if(before.left+25<bounds.left+12||before.left+25>bounds.right-12)results.scrollLeft=col.offsetLeft-54;const box=col.getBoundingClientRect(),scale=box.height/Number(col.parentElement.dataset.minuteRange);const y=box.top+(m-Number(col.dataset.fromMinute))*scale;if(y<bounds.top+70||y>bounds.bottom-35)results.scrollTop+=y-bounds.top-100;const r=col.getBoundingClientRect();return{x:r.left+25,y:r.top+(m-Number(col.dataset.fromMinute))*scale+8};},{m,date});
  const source=(index=1)=>page.evaluate(index=>{const item=calendarRenderedItems.find(x=>x.calendarSplitRoot&&x.calendarSplitIndex===index),node=calendarBlockFor(item),results=document.getElementById('historyResults'),col=node.closest('.week-day-column');results.scrollLeft=col.offsetLeft-54;const b=node.getBoundingClientRect(),area=results.getBoundingClientRect();if(b.bottom>area.bottom)results.scrollTop+=b.bottom-area.bottom+12;if(node.getBoundingClientRect().top<area.top+50)results.scrollTop+=node.getBoundingClientRect().top-area.top-80;const r=node.getBoundingClientRect();return{x:r.left+20,y:r.top+8};},index);
  const session=mobile?await ctx.newCDPSession(page):null;
  const move=async p=>{if(mobile)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p]});else await page.mouse.move(p.x,p.y);};
  const begin=async(index=1)=>{const p=await source(index);if(mobile){await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await page.waitForTimeout(600);await move({x:p.x+8,y:p.y});await page.waitForTimeout(25);}else{await page.mouse.move(p.x,p.y);await page.mouse.down();}};
  const end=async(cancel=false)=>{if(mobile)await session.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});else{if(cancel)await page.keyboard.press('Escape');await page.mouse.up();}};
  const seed=async()=>{
   await page.evaluate(()=>{resetCalendarInteraction();state.calendarDrafts.clear();const item=state.historyItems.find(x=>x.id==='1');stageCalendarMove(item,{date:'2026-10-16',start:'11:00'});});
   assert.equal(await page.locator('.is-calendar-draft').count(),2);assert.equal(await page.locator('.is-calendar-draft [data-calendar-resize]').count(),0);
  };
  const snapshot=()=>page.evaluate(()=>JSON.stringify([...state.calendarDrafts]));
  if(viewport.width===320)await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>setCalendarZoom('time',150));await page.waitForTimeout(160);
  await seed();const originalDraft=await snapshot();
  // Pulling the SECOND part uses the entire 2h30 group, not that part's 1h30.
  await begin(1);await move(await point(480));await page.waitForTimeout(180);
  assert.equal(await page.locator('.is-regroup-source').count(),2);assert.equal(await page.locator('.calendar-drag-ghost').count(),1);assert((await page.locator('.calendar-drag-ghost strong').textContent()).includes('2h 30m'));assert.equal(await page.locator('.calendar-drop-highlight').count(),1);assert.equal(await snapshot(),originalDraft);assert.equal(writes.length,0);
  assert.equal(await page.evaluate(()=>document.getElementById('calendarSaveDialog').open),false);
  const info=await page.evaluate(()=>{const ghost=document.querySelector('.calendar-drag-ghost'),r=ghost.getBoundingClientRect(),frame=document.getElementById('historyResults').getBoundingClientRect();return {visible:getComputedStyle(ghost).visibility!=='hidden',inside:r.left>=frame.left&&r.right<=frame.right&&r.top>=frame.top&&r.bottom<=frame.bottom,overlap:[...document.querySelectorAll('.calendar-drop-highlight')].some(el=>{const b=el.getBoundingClientRect();return r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top;})};});
  if(info.visible){assert(info.inside,'Drag info must stay inside calendar');assert(!info.overlap,'Drag info must not cover any preview');}
  if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`regroup-held-${viewport.width}.png`)});}
  await end(true);await page.waitForTimeout(160);assert.equal(await snapshot(),originalDraft);assert.equal(await page.locator('.is-regroup-source,.calendar-drag-ghost').count(),0);
  // Invalid release restores the two parts; it does not retain half a placement.
  await begin(0);await move(await point(1020));await page.waitForTimeout(50);await end();assert.equal(await snapshot(),originalDraft);assert.equal(await page.locator('.is-regroup-source').count(),0);
  // Swap a regrouped source with two real partners. Both fly into the two
  // visible old source intervals; no imagined contiguous source is used.
  logs.push(make(2,'08:00',90,'2026-10-16','CAL-2'),make(3,'09:30',60,'2026-10-16','CAL-3'));
  await page.evaluate(async()=>{await loadWorklogHistory({quiet:true,force:true});});await page.waitForFunction(()=>!QuickJiraBusy.active);
  await begin(1);await move(await point(480));await page.waitForFunction(()=>calendarHoverMotions.size===2);
  assert.equal(await page.locator('.calendar-drop-highlight').count(),3);assert.equal(writes.length,0);await end();
  assert.equal(await page.evaluate(()=>state.calendarDrafts.size),3);assert.deepEqual(await page.evaluate(()=>calendarPreviewItems().filter(x=>['1','2','3'].includes(x.id)).map(x=>[x.id,x.start])),[['1','08:00'],['2','13:30'],['3','11:00']]);
  logs=logs.filter(x=>!['2','3'].includes(x.id));await page.evaluate(async()=>{resetCalendarInteraction();state.calendarDrafts.clear();await loadWorklogHistory({quiet:true,force:true});});await page.waitForFunction(()=>!QuickJiraBusy.active);await seed();
  // Regroup to one block, and save only its original worklog ID with full duration.
  await begin(1);await move(await point(480));await page.waitForTimeout(60);await end();assert.equal(await page.locator('.is-calendar-draft').count(),1);assert.equal(await page.locator('.is-calendar-draft [data-calendar-resize]').count(),1);assert.equal(await page.evaluate(()=>[...state.calendarDrafts.values()][0].target.segments),undefined);assert.equal(await page.evaluate(()=>calendarPreviewItems().find(x=>x.id==='1').timeSpentSeconds),9000);assert.equal(writes.length,0);
  await page.locator('#calendarSaveBtn').click();await page.locator('#calendarConfirmSaveBtn').click();await page.waitForFunction(()=>!state.calendarMovePending&&!state.historyLoading&&!QuickJiraBusy.active);assert.equal(writes.length,1);assert.equal(writes[0].a,'worklog-correction');assert.equal(writes[0].b.worklogId,'1');assert.equal(writes[0].b.start,'08:00');assert.equal(logs.find(x=>x.id==='9').minutes,30);
  // Return the group to its real Jira original: remove the draft without a write.
  await seed();await begin(0);await move(await point(480));await page.waitForTimeout(60);await end();assert.equal(await page.evaluate(()=>state.calendarDrafts.size),0);assert.equal(writes.length,1);
  // Re-split on another date; cancel >2 consent preserves the old group exactly.
  logs.push(make(7,'14:00',30,'2026-10-15','CAL-7'),make(8,'15:00',30,'2026-10-15','CAL-8'));
  await page.evaluate(async()=>{await loadWorklogHistory({quiet:true,force:true});});await page.waitForFunction(()=>!QuickJiraBusy.active);await seed();const prior=await snapshot();
  await begin(1);await move(await point(660,'2026-10-15'));await page.waitForTimeout(60);await end();assert(await page.locator('#calendarSplitDialog').evaluate(e=>e.open));assert.equal(await page.locator('#calendarSplitList li').count(),4);await page.locator('#calendarSplitCancelBtn').click();assert.equal(await snapshot(),prior);
  await begin(0);await move(await point(660,'2026-10-15'));await page.waitForTimeout(60);await end();await page.locator('#calendarSplitConfirmBtn').click();assert.equal(await page.locator('.is-calendar-draft').count(),4);assert.equal(await page.evaluate(()=>[...state.calendarDrafts.values()][0].original.started),'2026-10-16T08:00:00.000+0700');assert.equal(writes.length,1);
  // Any of four pieces can merge again; repeated preview never overwrites the snapshot.
  await begin(3);await move(await point(810));await page.waitForTimeout(60);await end();assert.equal(await page.locator('.is-calendar-draft').count(),1);assert.equal(await page.evaluate(()=>[...state.calendarDrafts.values()][0].target.start),'13:30');assert.equal(await page.evaluate(()=>[...state.calendarDrafts.values()][0].original.start),'08:00');
  // Preserve split save path after a later regroup/re-split.
  await page.evaluate(()=>{const item=calendarPreviewItems().find(x=>x.id==='1');stageCalendarMove(item,{date:'2026-10-16',start:'11:00'});});assert.equal(await page.locator('.is-calendar-draft').count(),2);
  await page.locator('#calendarSaveBtn').click();await page.locator('#calendarConfirmSaveBtn').click();await page.waitForFunction(()=>!QuickJiraBusy.active&&!state.calendarMovePending&&!state.historyLoading);assert.equal(writes.length,2);assert.equal(writes[1].a,'calendar-split');assert.equal(writes[1].b.expectedSeconds,9000);assert.equal(writes[1].b.segments.reduce((n,x)=>n+x.targetSeconds,0),9000);assert.equal(await page.evaluate(()=>calendarPreviewItems().filter(x=>x.calendarSplitRoot).length),0,'Saved worklogs must not be auto-grouped by issue');
  assert.deepEqual(errors,[]);await ctx.close();console.log('Regroup gestures: second/first/fourth piece, full duration, single ghost, cancel/invalid, merge/save/original reset, >2 re-split consent, preserved snapshot, no unrelated merge passed',viewport);
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exit(1);});
