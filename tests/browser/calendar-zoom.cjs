'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{server}=require('./serve.cjs');
(async()=>{
 await new Promise(r=>server.listen(4218,'127.0.0.1',r));
 const browser=await chromium.launch({...(process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
 for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:320,height:683},{width:844,height:390}].filter(v=>!process.env.QJL_ZOOM_WIDTH||v.width===Number(process.env.QJL_ZOOM_WIDTH))){
  const mobile=viewport.width<900,context=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile,serviceWorkers:'block',timezoneId:'Asia/Ho_Chi_Minh',reducedMotion:viewport.width===320?'reduce':'no-preference'}),page=await context.newPage(),errors=[],requests=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({native})=>{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:['2026-10-12T02:00:00Z']));}static now(){return D.parse('2026-10-12T02:00:00Z');}};if(!native)Object.defineProperty(Element.prototype,'requestFullscreen',{configurable:true,value:undefined});},{native:viewport.width===1440});
  const make=(id,start,minutes,extra={})=>({id,key:'CAL-'+id,project:'CAL',summary:'Hỗ trợ kiểm tra và xử lý dữ liệu',description:'Preserve exact description',date:'2026-10-12',start,end:`${String(Math.floor((parseInt(start)*60+Number(start.slice(3))+minutes)/60)).padStart(2,'0')}:${String((Number(start.slice(3))+minutes)%60).padStart(2,'0')}`,minutes,timeSpentSeconds:minutes*60,started:`2026-10-12T${start}:00.000+0700`,overtimeKnown:true,overtime:false,...extra});
  const logs=[make('1','08:00',60),make('2','11:00',60),make('3','17:30',30,{overtime:true})];
  await page.route('**/api?*',async route=>{
   const a=new URL(route.request().url()).searchParams.get('action');requests.push(a);let data={ok:true};
   if(a==='status')data={ok:true,authenticated:true,user:{username:'boss',displayName:'Boss'}};
   if(a==='subtasks')data={ok:true,issues:[{key:'CAL-NEW',project:'CAL',summary:'New task',issueType:'Sub-task',status:'In Progress'}]};
   if(a==='worklog-history')data={ok:true,items:logs};
   if(a==='calendar-history')data={ok:true,readOnly:true,viewedUser:{key:'OTHER',username:'other',displayName:'Other User'},items:logs.map(x=>({...x,calendarReadOnly:true}))};
   if(!['GET','HEAD'].includes(route.request().method())){
    const b=route.request().postDataJSON();writes.push({action:a,body:b});
    if(a==='worklog-correction'){
     const raw=logs.find(x=>x.id===b.worklogId),secs=b.calendarEdit?b.targetSeconds:raw.timeSpentSeconds;
     assert.equal(b.expectedSeconds,raw.timeSpentSeconds);assert.equal(b.expectedStarted,raw.started);
     Object.assign(raw,make(raw.id,b.start,secs/60,{date:b.date,overtime:raw.overtime}));
     data={ok:true,moved:true,resized:b.calendarEdit===true,worklogVerified:true,timeSpentSeconds:secs};
    }
   }
   await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  const open=async()=>{await page.locator((await page.viewportSize()).width<900?'#mobileHistoryBtn':'#historyBtn').click();await page.waitForFunction(()=>state.historyLoaded&&!state.historyLoading&&!document.querySelector('#historyOverlay.qjl-opening'));};
  const metrics=async()=>{await page.waitForFunction(()=>{const c=document.querySelector('.week-day-column'),g=calendarZoomGrid?.geometry;if(!c||!g||weekFitFrame)return false;const b=c.getBoundingClientRect();return Math.abs(b.width-g.dayWidth)<.05&&Math.abs(b.height/Number(c.parentElement.dataset.minuteRange)-g.minutePx)<.002;});return page.evaluate(()=>{const r=document.getElementById('historyResults'),inner=document.querySelector('.weekly-inner'),body=inner.querySelector('.week-grid-body'),col=body.querySelector('.week-day-column');return{scale:col.getBoundingClientRect().height/Number(body.dataset.minuteRange),day:col.getBoundingClientRect().width,prefs:{...calendarZoomSettings()},drafts:JSON.stringify([...state.calendarDrafts]),geometry:calendarZoomGrid.geometry,style:inner.getAttribute('style'),bodyStyle:getComputedStyle(body).gridTemplateColumns,innerWidth:inner.getBoundingClientRect().width,anchor:QuickJiraZoom.anchor({left:r.scrollLeft,top:r.scrollTop},calendarZoomGrid.geometry),top:r.scrollTop,left:r.scrollLeft,maxTop:r.scrollHeight-r.clientHeight,maxLeft:r.scrollWidth-r.clientWidth};});};
  const openZoom=async()=>{await page.locator('#calendarZoomBtn').click();assert(await page.locator('#calendarZoomDialog').evaluate(e=>e.open));assert.equal(await page.evaluate(()=>document.activeElement.id),'calendarZoomCloseBtn');};
  const closeZoom=async()=>{await page.locator('#calendarZoomCloseBtn').click();assert.equal(await page.locator('#calendarZoomBtn').getAttribute('aria-expanded'),'false');};
  const slider=async(axis,value)=>{const el=page.locator('#calendarZoom-'+axis);await el.focus();await page.keyboard.press('Home');for(let n=75;n<value;n+=5)await page.keyboard.press('ArrowRight');assert.equal(await el.inputValue(),String(value));};
  const bounds=async()=>{
   await page.waitForFunction(()=>{const r=document.getElementById('calendarZoomDialog').getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;});
   const g=await page.evaluate(()=>{const d=document.getElementById('calendarZoomDialog'),r=d.getBoundingClientRect();return{rect:r.toJSON(),w:innerWidth,h:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,focus:document.activeElement.tagName,animation:getComputedStyle(d).animationName};});
   assert(!g.overflow);assert(g.rect.x>=0&&g.rect.y>=0&&g.rect.right<=g.w+1&&g.rect.bottom<=g.h+1,JSON.stringify(g));
   if(viewport.width===320)assert.equal(g.animation,'none');
  };
  await page.goto('http://127.0.0.1:4218');await open();const base=await metrics();assert.deepEqual(base.prefs,{time:100,day:100});
  await page.evaluate(()=>stageCalendarMove(calendarPreviewItems()[0],{date:'2026-10-12',start:'09:00'}));const draft=(await metrics()).drafts,readCount=requests.length;
  await openZoom();await bounds();
  for(let i=0;i<2;i++)await page.locator('[data-zoom-axis="time"][data-zoom-step="1"]').click();
  for(let i=0;i<2;i++)await page.locator('[data-zoom-axis="day"][data-zoom-step="1"]').click();
  await page.waitForTimeout(80);let g=await metrics();assert(Math.abs(g.scale/base.scale-1.5)<.002);assert(Math.abs(g.day/base.day-1.5)<.02,JSON.stringify({viewport,base,g}));assert.equal(g.drafts,draft);
  await slider('time',200);await slider('day',200);assert(await page.locator('[data-zoom-axis="time"][data-zoom-step="1"]').isDisabled());
  await closeZoom();await page.evaluate(()=>{const r=document.getElementById('historyResults');r.scrollTop=Math.min(180,r.scrollHeight-r.clientHeight);r.scrollLeft=Math.min(180,r.scrollWidth-r.clientWidth);});const focal=(await metrics()).anchor;
  await openZoom();await page.locator('[data-zoom-axis="time"][data-zoom-step="-1"]').click();await page.locator('[data-zoom-axis="day"][data-zoom-step="-1"]').click();g=await metrics();
  assert(Math.abs(g.anchor.minute-focal.minute)<2,JSON.stringify({focal,g}));assert(Math.abs(g.anchor.day-focal.day)<.03);
  // Keyboard-accessible 5% steps, click-to-reset values, full reset and 75% bound.
  await page.locator('#calendarZoomValue-time').click();assert.equal((await metrics()).prefs.time,100);
  await slider('time',75);assert(await page.locator('[data-zoom-axis="time"][data-zoom-step="-1"]').isDisabled());assert(Math.abs((await metrics()).scale/base.scale-.75)<.002);
  await page.locator('#calendarZoomResetBtn').click();assert.deepEqual((await metrics()).prefs,{time:100,day:100});
  assert.equal((await metrics()).drafts,draft);assert.equal(requests.length,readCount,'zoom has no data requests');assert.equal(writes.length,0);
  // Pointer movement of a slider drives the real input path too.
  const track=await page.locator('#calendarZoom-day').boundingBox();await page.mouse.move(track.x+track.width*.2,track.y+track.height/2);await page.mouse.down();await page.mouse.move(track.x+track.width*.8,track.y+track.height/2,{steps:8});await page.mouse.up();assert((await metrics()).prefs.day>=160);
  await slider('time',150);await slider('day',150);
  for(const theme of ['light','dark']){await page.evaluate(t=>applyTheme(t),theme);await page.waitForTimeout(200);await bounds();if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`zoom-${viewport.width}-${theme}.png`)});}}
  await page.keyboard.press('Escape');assert(!await page.locator('#calendarZoomDialog').evaluate(e=>e.open));assert(await page.locator('#historyOverlay').isVisible());
  await openZoom();await bounds();await page.mouse.click(viewport.width-2,viewport.height-2);assert(!await page.locator('#calendarZoomDialog').evaluate(e=>e.open));assert.equal(await page.evaluate(()=>state.calendarLogContext),null,'backdrop tap never creates a worklog');
  // Retain independent settings across fullscreen/rotation; keep the draft byte-for-byte.
  await page.locator('#calendarFullscreenBtn').click();await page.waitForTimeout(100);if(viewport.width===1440)assert(await page.evaluate(()=>!!document.fullscreenElement),'native document fullscreen supports the zoom dialog');assert.deepEqual((await metrics()).prefs,{time:150,day:150});
  const rotated=viewport.width>viewport.height?{width:390,height:844}:{width:844,height:390};await page.setViewportSize(rotated);await page.waitForTimeout(100);assert.deepEqual((await metrics()).prefs,{time:150,day:150});assert.equal((await metrics()).drafts,draft);
  await openZoom();await bounds();await closeZoom();await page.setViewportSize(viewport);await page.locator('#calendarFullscreenBtn').click();await page.waitForTimeout(150);
  await page.evaluate(()=>{clearCalendarDrafts();renderWorklogHistory();});
  await page.locator('#calendarMonthBtn').click();await page.waitForFunction(()=>!state.historyLoading&&state.calendarMode==='month');assert(!await page.locator('#calendarZoomBtn').isVisible());
  await page.locator('#calendarWeekBtn').click();await page.waitForFunction(()=>!state.historyLoading&&state.calendarMode==='week');assert.deepEqual((await metrics()).prefs,{time:150,day:150});
  // Reload persists the fixed device profile. No worklog is modified by it.
  await page.reload();await open();assert.deepEqual((await metrics()).prefs,{time:150,day:150});
  const profile=await page.evaluate(()=>calendarZoomProfile);assert.equal(profile,mobile?'mobile':'desktop');
  const data=await page.evaluate(()=>JSON.parse(localStorage.getItem(CALENDAR_ZOOM_KEY)));assert.deepEqual(data[profile],{time:150,day:150});assert.deepEqual(data[mobile?'desktop':'mobile'],{time:100,day:100});
  // A short landscape window uses fullscreen for the long edge gesture.
  if(viewport.height<450){await page.locator('#calendarFullscreenBtn').click();await page.waitForTimeout(150);}
  // Real coordinate-based creation, move and edge resize at 150%, touch or mouse.
  const reveal=async(minute)=>page.evaluate(m=>{const r=document.getElementById('historyResults'),col=document.querySelector('.week-day-column'),s=col.getBoundingClientRect().height/Number(col.parentElement.dataset.minuteRange);r.scrollLeft=0;r.scrollTop=Math.max(0,(m-480)*s-100);},minute);
  const point=async(minute)=>page.evaluate(m=>{const c=document.querySelector('.week-day-column'),r=c.getBoundingClientRect(),s=r.height/Number(c.parentElement.dataset.minuteRange);return{x:r.x+35,y:r.y+(m-Number(c.dataset.fromMinute))*s};},minute);
  await reveal(630);let p=await point(630);await page.mouse.click(p.x,p.y);await page.waitForFunction(()=>document.getElementById('calendarLogDialog').open);assert.equal(await page.evaluate(()=>state.calendarLogContext.start),'10:30');await page.evaluate(()=>closeCalendarLog({force:true}));await page.waitForTimeout(250);
  const block=()=>page.locator('[data-week-event]').filter({has:page.locator('strong',{hasText:'CAL-1'})});
  await reveal(480);let rect=await block().boundingBox(),session;
  if(mobile){session=await context.newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+30,y:rect.y+12}]});await page.waitForTimeout(620);}
  else{await page.mouse.move(rect.x+30,rect.y+12);await page.mouse.down();}
  p=await point(540);p.y+=12;
  if(mobile){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p]});await page.waitForTimeout(80);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await page.mouse.move(p.x,p.y,{steps:8});await page.waitForTimeout(80);await page.mouse.up();}
  await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>calendarPreviewItems().find(x=>x.id==='1').start),'09:00');assert.equal(logs[0].start,'08:00');assert.equal(writes.length,0);
  await reveal(540);const handle=block().locator('[data-calendar-resize]');rect=await handle.boundingBox();p=await point(630);const start={x:rect.x+rect.width/2,y:rect.y+rect.height/2};p.x=start.x;p.y-=rect.height/2;
  if(mobile){await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p]});}
  else{await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(p.x,p.y,{steps:8});}
  await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>calendarGesture?.resize),true);assert((await page.locator('.calendar-drop-highlight').innerText()).includes('10:30'));
  if(mobile){await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}else await page.mouse.up();
  await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>calendarPreviewItems().find(x=>x.id==='1').timeSpentSeconds),5400);assert.equal(writes.length,0);
  await page.locator('#calendarSaveBtn').click();await page.locator('#calendarConfirmSaveBtn').click();await page.waitForFunction(()=>!state.calendarMovePending&&!state.historyLoading);assert.equal(logs[0].start,'09:00');assert.equal(logs[0].timeSpentSeconds,5400);assert.equal(writes.length,1);assert.equal(writes[0].body.calendarEdit,true);assert.equal(writes[0].body.targetSeconds,5400);
  // Read-only calendars can zoom without acquiring any editing capability.
  if(!await page.evaluate(()=>state.calendarFullscreen))await page.locator('#calendarFullscreenBtn').click();await page.evaluate(u=>selectCalendarUser(u),{key:'OTHER',username:'other',displayName:'Other User'});await page.waitForFunction(()=>calendarReadOnly()&&!state.historyLoading);await openZoom();await slider('time',200);await bounds();await closeZoom();assert.equal(await page.locator('[data-calendar-resize]').count(),0);assert.equal(writes.length,1);
  assert.deepEqual(errors,[]);console.log('Calendar zoom controls/limits/anchors/profile/persistence/rotation/drafts + real create/move/resize/save and readonly passed',viewport);await context.close();
 }
 await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);server.close();process.exit(1);});
