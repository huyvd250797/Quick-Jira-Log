'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{server}=require('./serve.cjs');
(async()=>{
 await new Promise(r=>server.listen(4220,'127.0.0.1',r));
 let baselineServer=null;
 if(process.env.QJL_BASELINE_ROOT){baselineServer=require(path.join(process.env.QJL_BASELINE_ROOT,'tests/browser/serve.cjs')).server;await new Promise(r=>baselineServer.listen(4221,'127.0.0.1',r));}
 const browser=await chromium.launch({...(process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
 const records=[];
 for(const variant of baselineServer?['baseline','current']:['current']){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block',timezoneId:'Asia/Ho_Chi_Minh'}),page=await context.newPage(),errors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:['2026-10-19T02:00:00Z']));}static now(){return D.parse('2026-10-19T02:00:00Z');}};
   Object.defineProperty(Element.prototype,'requestFullscreen',{configurable:true,value:undefined});
   window.probe={reads:0,applies:0,stores:0,enabled:false};
   for(const key of ['scrollWidth','scrollHeight','clientWidth','clientHeight']){
    const descriptor=Object.getOwnPropertyDescriptor(Element.prototype,key);if(!descriptor?.get)continue;
    Object.defineProperty(Element.prototype,key,{...descriptor,get(){if(probe.enabled&&this.id==='historyResults')probe.reads++;return descriptor.get.call(this);}});
   }
   const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(probe.enabled&&key==='quick-jira-log:calendar-zoom:v1')probe.stores++;return set.call(this,key,value);};
  });
  const logs=Array.from({length:400},(_,i)=>{const slot=i%16,minute=slot<8?480+slot*30:810+(slot-8)*30,start=`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`,date='2026-10-'+String(19+i%5).padStart(2,'0');return{id:String(i),key:'PERF-'+i,project:'PERF',date,start,end:start,started:`${date}T${start}:00.000+0700`,minutes:15,timeSpentSeconds:900,summary:'Worklog stress fixture '+i,overtime:false,overtimeKnown:true};});
  await page.route('**/api?*',async route=>{const a=new URL(route.request().url()).searchParams.get('action');if(!['GET','HEAD'].includes(route.request().method()))writes.push(a);const data=a==='status'?{ok:true,authenticated:true,user:{username:'boss',displayName:'Boss'}}:a==='worklog-history'?{ok:true,items:logs}:{ok:true,issues:[]};await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});});
  await page.goto('http://127.0.0.1:'+(variant==='baseline'?4221:4220));await page.locator('#mobileHistoryBtn').click();await page.waitForFunction(()=>state.historyLoaded&&!state.historyLoading&&!document.querySelector('#historyOverlay.qjl-opening'));await page.waitForTimeout(200);
  assert.equal(await page.locator('[data-week-event]').count(),400);
  const session=await context.newCDPSession(page);let blocking=0;
  for(const id of ['document','body','weeklyCalendar','historyOverlay','historyResults']){
   const expression=id==='document'?'document':id==='body'?'document.body':`document.getElementById('${id}')`;
   const remote=await session.send('Runtime.evaluate',{expression,objectGroup:'scroll-probe'});
   const {listeners}=await session.send('DOMDebugger.getEventListeners',{objectId:remote.result.objectId});
   if(process.env.QJL_PERF_DEBUG)console.log(variant,id,listeners.map(x=>({type:x.type,passive:x.passive})));
   blocking+=listeners.filter(x=>['touchstart','touchmove','wheel'].includes(x.type)&&!x.passive).length;
  }
  const scrollProbe=await page.evaluate(()=>{
   const r=document.getElementById('historyResults'),target=document.querySelector('.week-day-column');r.scrollLeft=100;r.scrollTop=0;
   probe.reads=0;probe.enabled=true;
   for(let i=0;i<60;i++)r.dispatchEvent(new Event('scroll'));
   const reads=probe.reads;probe.enabled=false;
   const touch=(type,x,y)=>{const t=new Touch({identifier:1,target,clientX:x,clientY:y});const e=new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'?[]:[t],changedTouches:[t]});target.dispatchEvent(e);return e.defaultPrevented;};
   touch('touchstart',200,300);const prevented=touch('touchmove',150,310);touch('touchend',150,310);
   return{reads,prevented};
  });
  // A burst of slider events is one rendering transaction in the new version.
  await page.locator('#calendarZoomBtn').click();
  await page.evaluate(()=>{const apply=applyCalendarZoomGeometry;applyCalendarZoomGeometry=function(){if(probe.enabled)probe.applies++;return apply();};probe.applies=0;probe.stores=0;probe.enabled=true;const slider=document.getElementById('calendarZoom-time');for(let i=0;i<100;i++){slider.value=String(75+i%26*5);slider.dispatchEvent(new Event('input',{bubbles:true}));}});
  await page.waitForTimeout(250);const zoomProbe=await page.evaluate(()=>{probe.enabled=false;return{applies:probe.applies,stores:probe.stores};});
  await page.locator('#calendarZoomCloseBtn').click();
  if(variant==='current'){
   assert.equal(blocking,0,'no blocking touch/wheel listeners on the grid scroll route');assert.equal(scrollProbe.reads,0,'no dimension reads in the scroll event hot path');assert.equal(scrollProbe.prevented,false,'a slight outward diagonal does not steal native horizontal pan');assert(zoomProbe.applies<=2,JSON.stringify(zoomProbe));assert.equal(zoomProbe.stores,1);
   await page.evaluate(()=>{setCalendarZoom('both',100);const r=document.getElementById('historyResults');r.scrollLeft=120;r.scrollTop=0;});await page.waitForTimeout(80);
   const area=await page.locator('#historyResults').boundingBox(),start={x:area.x+area.width*.7,y:area.y+area.height*.55};const before=await page.locator('#historyResults').evaluate(r=>r.scrollLeft);
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});
   for(let i=1;i<=8;i++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x-i*15,y:start.y+i*1.5}]});await page.waitForTimeout(16);}
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(180);assert(await page.locator('#historyResults').evaluate(r=>r.scrollLeft)>before+25,'real diagonal touch pans inside the calendar');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   // A stationary drag does not keep a JS animation loop alive.
   await page.evaluate(()=>{const r=document.getElementById('historyResults');r.scrollLeft=0;r.scrollTop=0;});
   const el=page.locator('[data-week-event]').first(),rect=await el.boundingBox();
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+6,y:rect.y+4}]});await page.waitForTimeout(620);
   await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rect.x+14,y:rect.y+40}]});await page.waitForTimeout(100);
   assert.equal(await page.evaluate(()=>!!calendarGesture?.dragging),true);
   assert.equal(await page.evaluate(()=>calendarDragFrame),0,'stationary interior drag sleeps between pointer events');
   await page.keyboard.press('Escape');await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  records.push({variant,worklogs:400,blockingGridListeners:blocking,scrollDimensionReadsFor60Events:scrollProbe.reads,diagonalTouchPrevented:scrollProbe.prevented,zoomAppliesFor100Inputs:zoomProbe.applies,zoomStorageWritesFor100Inputs:zoomProbe.stores});
  assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);await session.detach();await context.close();
 }
 if(records.length===2){assert(records[1].blockingGridListeners<records[0].blockingGridListeners);assert(records[1].scrollDimensionReadsFor60Events<records[0].scrollDimensionReadsFor60Events);assert(records[1].zoomAppliesFor100Inputs<records[0].zoomAppliesFor100Inputs);}
 if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});fs.writeFileSync(path.join(process.env.QJL_QA_OUTPUT,'calendar-performance.json'),JSON.stringify(records,null,2));}
 console.log(JSON.stringify(records,null,2));await browser.close();await new Promise(r=>server.close(r));if(baselineServer)await new Promise(r=>baselineServer.close(r));
})().catch(e=>{console.error(e);server.close();process.exit(1);});
