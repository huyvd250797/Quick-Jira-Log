'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{server}=require('./serve.cjs');
(async()=>{
 await new Promise(r=>server.listen(4222,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.QJL_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const viewport of (process.env.QJL_FIT_NARROW?[{width:320,height:900},{width:844,height:390}]:[{width:1440,height:1100},{width:390,height:1000},{width:320,height:900},{width:844,height:390}])){
  const mobile=viewport.width<900,ctx=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile,serviceWorkers:'block',timezoneId:'Asia/Ho_Chi_Minh'}),page=await ctx.newPage(),errors=[];let mutations=[],loseSplit=false,verifyReads=0;
  page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...a.length?a:['2026-10-16T13:00:00Z']);}static now(){return D.parse('2026-10-16T13:00:00Z');}};});
  const make=(id,start,minutes)=>({id:String(id),key:'CAL-'+id,date:'2026-10-16',start,end:`${String(Math.floor((parseInt(start)*60+Number(start.slice(3))+minutes)/60)).padStart(2,'0')}:${String((Number(start.slice(3))+minutes)%60).padStart(2,'0')}`,started:`2026-10-16T${start}:00.000+0700`,timeSpentSeconds:minutes*60,minutes,summary:'Công việc '+id,description:'Giữ mô tả',overtimeKnown:true,overtime:true});
  let logs=[make(1,'15:00',120),make(2,'08:00',90),make(3,'09:30',30)];
  await page.route('**/api?*',async route=>{
   const u=new URL(route.request().url()),action=u.searchParams.get('action');let data={ok:true};
   if(action==='status')data={ok:true,authenticated:true,user:{displayName:'Boss',username:'boss'}};
   if(action==='subtasks')data={ok:true,issues:[]};if(action==='day-audit')data={ok:true,occupied:[],available:[]};
   if(action==='worklog-history')data={ok:true,items:logs.filter(x=>x.date>=u.searchParams.get('date')&&x.date<=(u.searchParams.get('endDate')||u.searchParams.get('date'))),skipped:[]};
   if(action==='calendar-moves'){
    const b=route.request().postDataJSON();mutations.push({action,b});assert.equal(b.moves.length,3);
    for(const m of b.moves){const item=logs.find(x=>x.id===m.worklogId);Object.assign(item,make(Number(item.id),m.start,item.minutes));}
    data={ok:true,moved:true,worklogVerified:true,items:logs};
   }
   if(action==='calendar-split'){
    const b=route.request().postDataJSON();
    if(b.verifyOnly){verifyReads++;const parts=b.segments.map(s=>logs.find(x=>x.key===b.key&&x.date===s.date&&x.start===s.start&&x.timeSpentSeconds===s.targetSeconds));assert(parts.every(Boolean));await route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,split:true,worklogVerified:true,items:parts})});return;}
    mutations.push({action,b});assert(b.allowMany);assert.equal(b.segments.length,4);
    const source=logs.find(x=>x.id===b.worklogId),parts=b.segments.map((s,i)=>({...source,...make(i?10+i:Number(source.id),s.start,s.targetSeconds/60),key:source.key}));
    logs=logs.filter(x=>x.id!==b.worklogId).concat(parts);if(loseSplit){loseSplit=false;await route.abort('failed');return;}data={ok:true,split:true,worklogVerified:true,items:parts};
   }
   await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:4222');await page.waitForFunction(()=>!document.body.classList.contains('booting'));
  await page.locator(mobile?'#mobileHistoryBtn':'#historyBtn').click();await page.waitForFunction(()=>state.historyLoaded&&!state.historyLoading);await page.waitForTimeout(220);
  // Fit all active hours into the viewport so gesture endpoints stay visible in landscape.
  await page.evaluate(()=>{state.calendarFullscreen=true;document.getElementById('historyOverlay').classList.add('is-calendar-fullscreen');fitWeekToViewport();});await page.waitForTimeout(250);
  await page.evaluate(()=>{const c=document.querySelector('[data-calendar-date="2026-10-16"]');document.getElementById('historyResults').scrollLeft=c.offsetLeft-54;});
  const point=minute=>page.evaluate(m=>{const c=document.querySelector('[data-calendar-date="2026-10-16"]');if(innerHeight<500){const results=document.getElementById("historyResults"),body=c.getBoundingClientRect();results.scrollTop+=body.top+(m-Number(c.dataset.fromMinute))*body.height/Number(c.parentElement.dataset.minuteRange)-100;}const r=c.getBoundingClientRect();return{x:r.left+30,y:r.top+(m-Number(c.dataset.fromMinute))*r.height/Number(c.parentElement.dataset.minuteRange)+8};},minute);
  const source=()=>page.evaluate(()=>{const node=calendarBlockFor(calendarRenderedItems.find(x=>x.id==='1'));if(innerHeight<500){const results=document.getElementById('historyResults'),b=node.getBoundingClientRect(),a=results.getBoundingClientRect();results.scrollTop+=Math.max(0,b.bottom-a.bottom+12);}const r=node.getBoundingClientRect();return{x:r.left+20,y:r.top+8};});
  const session=mobile?await ctx.newCDPSession(page):null;
  const move=async p=>{if(mobile)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p]});else await page.mouse.move(p.x,p.y);};
  const begin=async()=>{const p=await source();if(mobile){await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await page.waitForTimeout(610);}else{await page.mouse.move(p.x,p.y);await page.mouse.down();}};
  const end=async()=>{if(mobile)await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();};
  await begin();await move(await point(480));await page.waitForTimeout(90);
  if(await page.evaluate(()=>calendarHoverMotions.size)!==2){console.log('Gesture debug',viewport,await source(),await point(480),await page.evaluate(()=>({gesture:calendarGesture&&{dragging:calendarGesture.dragging,ready:calendarGesture.ready,target:calendarGesture.target,proposal:calendarGesture.proposal},fullscreen:state.calendarFullscreen,rect:document.getElementById('historyResults').getBoundingClientRect().toJSON()})));await page.screenshot({path:'/workspace/scratch/45a3f0ef73da/qa/v1190/fit-failure.png'});}assert.equal(await page.evaluate(()=>calendarHoverMotions.size),2,'Both partners fly before drop');assert.equal(await page.locator('.calendar-drop-highlight').count(),3);assert.equal(await page.evaluate(()=>state.calendarDrafts.size),0);assert.equal(mutations.length,0);
  await move(await point(810));await page.waitForTimeout(40);assert(await page.evaluate(()=>[...calendarHoverMotions.values()].every(j=>j.mode==='return')));
  await move(await point(480));await page.waitForTimeout(60);await end();assert.equal(await page.evaluate(()=>state.calendarDrafts.size),3);assert.equal(mutations.length,0);
  assert.deepEqual(await page.evaluate(()=>calendarPreviewItems().map(x=>[x.id,x.start])),[['1','08:00'],['2','15:00'],['3','16:30']]);
  await page.locator('#calendarSaveBtn').click();assert.equal(await page.locator('#calendarSaveList li').count(),3);await page.locator('#calendarConfirmSaveBtn').click();await page.waitForFunction(()=>!state.calendarMovePending&&!state.historyLoading);assert.equal(mutations.length,1);assert.equal(await page.evaluate(()=>state.calendarDrafts.size),0);
  logs=[make(1,'13:30',150),make(2,'14:00',30),make(3,'15:00',30)];
  await page.evaluate(async()=>{await loadWorklogHistory({quiet:true,force:true});});await page.waitForTimeout(200);
  await begin();await move(await point(660));await page.waitForTimeout(80);assert.equal(await page.locator('.calendar-drop-highlight').count(),4);await end();
  assert(await page.locator('#calendarSplitDialog').evaluate(e=>e.open));assert.equal(await page.locator('#calendarSplitList li').count(),4);assert.equal(await page.evaluate(()=>state.calendarDrafts.size),0);await page.locator('#calendarSplitCancelBtn').click();assert.equal(mutations.length,1);
  await begin();await move(await point(660));await page.waitForTimeout(80);await end();await page.locator('#calendarSplitConfirmBtn').click();assert.equal(await page.evaluate(()=>state.calendarDrafts.size),1);assert.equal(await page.locator('.is-calendar-draft').count(),4);assert.equal(mutations.length,1);
  await page.locator('#calendarSaveBtn').click();const review=await page.locator('#calendarSaveList').textContent();assert(review.includes('4 phần'));assert(review.includes('11:00–12:00'));assert(review.includes('15:30–16:00'));
  await page.waitForTimeout(240);const fit=await page.locator('#calendarSaveDialog').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight+1;});assert(fit);
  if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`smart-split-${viewport.width}.png`)});}
  await page.locator('#calendarConfirmSaveBtn').click();await page.waitForFunction(()=>!state.calendarMovePending&&!state.historyLoading);assert.equal(mutations.length,2);assert.equal(await page.evaluate(()=>state.calendarDrafts.size),0);assert.equal(logs.filter(x=>x.key==='CAL-1').reduce((n,x)=>n+x.timeSpentSeconds,0),9000);assert.deepEqual(errors,[]);
  // A lost split response must show actual server records without duplicate ghosts,
  // then confirm through the read-only branch, never create the tails again.
  logs=[make(1,'13:30',150),make(2,'14:00',30),make(3,'15:00',30)];
  await page.evaluate(async()=>{await loadWorklogHistory({quiet:true,force:true});const item=calendarPreviewItems().find(x=>x.id==='1'),target={date:item.date,start:'11:00'},p=QuickJiraDrafts.drop(item,target,calendarPreviewItems());stageCalendarMove(item,target,{...p,confirmed:true});});
  loseSplit=true;await page.locator('#calendarSaveBtn').click();await page.locator('#calendarConfirmSaveBtn').click();await page.waitForFunction(()=>!state.calendarMovePending&&!state.historyLoading);
  assert.equal(await page.evaluate(()=>[...state.calendarDrafts.values()][0].status),'unknown');assert.equal(await page.evaluate(()=>calendarPreviewItems().length),6);assert.equal(mutations.length,3);
  await page.locator('#calendarConfirmSaveBtn').click();await page.waitForFunction(()=>!state.calendarMovePending&&!state.historyLoading&&!state.calendarDrafts.size);assert.equal(verifyReads,1);assert.equal(mutations.length,3);assert.deepEqual(errors,[]);
  await ctx.close();console.log('Multi-swap held/reverse/highlights and split confirm/cancel/review/explicit save passed',viewport);
 }
 await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);server.close();process.exit(1);});
