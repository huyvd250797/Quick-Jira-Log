'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'),{server}=require('./serve.cjs');
(async()=>{
 await new Promise(r=>server.listen(4198,'127.0.0.1',r));
 const browser=await chromium.launch({...(process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const viewport of [{width:1440,height:1100},{width:390,height:1000},{width:320,height:900},{width:844,height:440}]){
  const mobile=viewport.width<900,context=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile,serviceWorkers:'block',timezoneId:'Asia/Ho_Chi_Minh'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...a.length?a:['2026-10-16T13:00:00Z']);}static now(){return D.parse('2026-10-16T13:00:00Z');}};});
  const make=(id,start,minutes=60,date='2026-10-16')=>({id:String(id),key:'CAL-'+id,project:'CAL',date,start,end:`${String(parseInt(start)+minutes/60).padStart(2,'0')}:${start.slice(3)}`,started:`${date}T${start}:00.000+0700`,minutes,timeSpentSeconds:minutes*60,summary:'Worklog '+id,description:'Mô tả '+id,overtimeKnown:true,overtime:id===1});
  let logs=[make(1,'15:00'),make(2,'08:00')],batchCalls=[],reject=false;
  await page.route('**/api?*',async route=>{
   const u=new URL(route.request().url()),action=u.searchParams.get('action');let data={ok:true},status=200;
   if(action==='status')data={ok:true,authenticated:true,user:{displayName:'Boss',username:'boss'}};
   if(action==='subtasks')data={ok:true,issues:[]};
   if(action==='day-audit')data={ok:true,regularOccupiedMinutes:60,occupied:[],available:[],freeMinutes:420};
   if(action==='worklog-history')data={ok:true,items:logs.filter(x=>x.date>=u.searchParams.get('date')&&x.date<=(u.searchParams.get('endDate')||u.searchParams.get('date')))};
   if(action==='calendar-moves'){
    const body=route.request().postDataJSON();batchCalls.push(body);assert.equal(body.moves.length,2);assert(body.requestId);
    if(reject){status=422;data={ok:false,error:'Chưa đổi được lịch; đã phục hồi vị trí gốc.',details:{rolledBack:true}};}
    else{for(const m of body.moves){const x=logs.find(x=>x.id===m.worklogId);assert.equal(x.started,m.expectedStarted);assert.equal(x.timeSpentSeconds,m.expectedSeconds);Object.assign(x,{date:m.date,start:m.start,end:`${String(parseInt(m.start)+x.minutes/60).padStart(2,'0')}:${m.start.slice(3)}`,started:`${m.date}T${m.start}:00.000+0700`});}data={ok:true,moved:true,worklogVerified:true,items:logs};}
   }
   if(action==='worklog-correction')throw new Error('A cyclic pair must use the swap server operation');
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:4198');await page.waitForFunction(()=>!document.body.classList.contains('booting'));await page.locator(mobile?'#mobileHistoryBtn':'#historyBtn').click();await page.waitForFunction(()=>state.historyLoaded&&!state.historyLoading);await page.waitForTimeout(200);
  if(viewport.width===844){await page.locator('#calendarFullscreenBtn').click();await page.waitForFunction(()=>state.calendarFullscreen);await page.waitForTimeout(250);}
  const drag=async({invalid=false,cancel=false,empty=false}={})=>{
   await page.evaluate(()=>{const c=document.querySelector('[data-calendar-date="2026-10-16"]');document.getElementById('historyResults').scrollLeft=c.offsetLeft-55;document.getElementById('historyResults').scrollTop=0;});
   if(viewport.height<600)await page.evaluate(()=>{const e=[...document.querySelectorAll('[data-week-event]')].find(x=>calendarRenderedItems[Number(x.dataset.weekEvent)].id==='1'),r=document.getElementById('historyResults');r.scrollTop=Math.max(0,r.scrollTop+e.getBoundingClientRect().top-r.getBoundingClientRect().top-100);});
   const points=await page.evaluate(()=>{const blocks=[...document.querySelectorAll('[data-week-event]')],r=id=>blocks.find(b=>calendarRenderedItems[Number(b.dataset.weekEvent)].id===id).getBoundingClientRect();const a=r('1'),b=r('2');return{a:{x:a.left+30,y:a.top+8},b:{x:b.left+30,y:b.top+8}};});
   if(empty)points.b=await page.evaluate(()=>{const c=document.querySelector('[data-calendar-date="2026-10-16"]'),r=c.getBoundingClientRect(),scale=r.height/Number(c.parentElement.dataset.minuteRange);return{x:r.left+30,y:r.top+(810-Number(c.dataset.fromMinute))*scale+8};});
   let session;
   if(mobile){session=await context.newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[points.a]});await page.waitForTimeout(600);
    if(viewport.height<600){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:points.a.x,y:points.a.y-15}]});await page.evaluate(()=>{document.getElementById('historyResults').scrollTop=0;});points.b=await page.evaluate(()=>{const e=[...document.querySelectorAll('[data-week-event]')].find(x=>calendarRenderedItems[Number(x.dataset.weekEvent)].id==='2'),r=e.getBoundingClientRect();return{x:r.left+30,y:r.top+8};});}
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[points.b]});}
   else{await page.mouse.move(points.a.x,points.a.y);await page.mouse.down();await page.mouse.move(points.b.x,points.b.y,{steps:8});}
   await page.waitForTimeout(150);if(await page.locator('.calendar-drop-highlight').count()!==(empty?1:2))console.log('DRAG DEBUG',viewport,points,await page.evaluate(()=>({gesture:calendarGesture&&{dragging:calendarGesture.dragging,target:calendarGesture.target,proposal:calendarGesture.proposal,x:calendarGesture.x,y:calendarGesture.y},dialogs:[...document.querySelectorAll('dialog[open]')].map(x=>x.id),state:document.getElementById('calendarInteractionState').textContent,events:calendarRenderedItems.map(x=>({id:x.id,start:x.start}))})));assert.equal(await page.locator('.calendar-drop-highlight').count(),empty?1:2);
   const highlight=await page.locator('.calendar-drop-highlight').first().boundingBox();assert(highlight.width>50&&highlight.height>8);
   const expected=await page.evaluate(empty=>{const source=calendarRenderedItems.find(x=>x.id==='1'),target=calendarRenderedItems.find(x=>x.id==='2'),col=document.querySelector('[data-calendar-date="2026-10-16"]'),r=col.getBoundingClientRect(),scale=r.height/Number(col.parentElement.dataset.minuteRange);const n=t=>Number(t.slice(0,2))*60+Number(t.slice(3));return{x:r.left+2,y:r.top+(n(empty?'13:30':target.start)-Number(col.dataset.fromMinute))*scale,height:source.minutes*scale};},empty);
   assert(Math.abs(highlight.y-expected.y)<2&&Math.abs(highlight.x-expected.x)<2&&Math.abs(highlight.height-expected.height)<2,'Highlight must match minute grid and source duration');
   const ghost=await page.locator('.calendar-drag-ghost').boundingBox();assert(ghost.y>=highlight.y+highlight.height||ghost.y+ghost.height<=highlight.y,'Tooltip must leave destination highlight visible');

   assert.equal(await page.locator('.calendar-drop-highlight.is-swap').count(),empty?0:2);assert.equal(await page.locator('.calendar-drop-highlight.is-invalid').count(),invalid?2:0);
   if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`swap-drag-${viewport.width}${invalid?'-invalid':''}.png`)});}
   if(cancel){await page.keyboard.press('Escape');if(mobile)await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();}
   else if(mobile)await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();
   if(session)await session.detach();assert.equal(await page.locator('.calendar-drop-highlight').count(),0);
  };
  if(viewport.height>=600){await drag({cancel:true,empty:true});assert.equal(await page.evaluate(()=>state.calendarDrafts.size),0);await page.waitForTimeout(650);}
  await drag({cancel:true});assert.equal(await page.evaluate(()=>state.calendarDrafts.size),0);assert.equal(batchCalls.length,0);await page.waitForTimeout(650);
  await drag();assert.equal(await page.evaluate(()=>state.calendarDrafts.size),2);assert.equal(batchCalls.length,0);assert.equal(logs[0].start,'15:00');
  if(viewport.height>=600){await drag();assert.equal(await page.evaluate(()=>state.calendarDrafts.size),0);assert.equal(batchCalls.length,0);assert.equal(await page.locator('#calendarSaveBtn').isVisible(),false);await drag();assert.equal(await page.evaluate(()=>state.calendarDrafts.size),2);}
  const preview=await page.evaluate(()=>calendarPreviewItems().map(x=>({id:x.id,start:x.start,ot:x.overtime})));assert.equal(preview.find(x=>x.id==='1').start,'08:00');assert.equal(preview.find(x=>x.id==='2').start,'15:00');assert.equal(preview.find(x=>x.id==='1').ot,true);
  await page.locator('#calendarSaveBtn').click();assert.equal(await page.locator('#calendarSaveList li').count(),2);await page.locator('#calendarCancelSaveBtn').click();assert.equal(batchCalls.length,0);
  await page.locator('#calendarSaveBtn').click();await page.locator('#calendarConfirmSaveBtn').click();await page.waitForFunction(()=>!state.calendarMovePending&&!state.historyLoading&&!document.getElementById('calendarSaveDialog').open);assert.equal(batchCalls.length,1);assert.equal(logs[0].start,'08:00');assert.equal(logs[1].start,'15:00');assert.equal(await page.locator('#calendarSaveBtn').isVisible(),false);
  // Unequal duration swap is invalid if it would extend into a third worklog.
  logs=[make(1,'15:00'),make(2,'08:00',120),make(3,'16:00')];
  await page.evaluate(()=>loadWorklogHistory({quiet:true,force:true}));await page.waitForTimeout(650);await drag({invalid:true});assert.equal(await page.evaluate(()=>state.calendarDrafts.size),0);assert.equal(batchCalls.length,1);
  logs=[make(1,'15:00'),make(2,'08:00')];await page.evaluate(()=>loadWorklogHistory({quiet:true,force:true}));await page.waitForTimeout(650);
  await drag();reject=true;await page.locator('#calendarSaveBtn').click();await page.locator('#calendarConfirmSaveBtn').click();await page.waitForFunction(()=>!state.calendarMovePending&&!state.historyLoading);assert.equal(await page.evaluate(()=>state.calendarDrafts.size),2);assert.equal(logs[0].start,'15:00');assert((await page.locator('#calendarSaveError').textContent()).includes('phục hồi'));
  await page.locator('#calendarDiscardBtn').click();assert.deepEqual(errors,[]);await context.close();console.log('Calendar highlight/swap PC/mobile: two target regions, cancel cleanup, drafts/confirm/server batch, OT, third-block rejection and failed save retention passed',viewport);
 }
 await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);server.close();process.exit(1)});
