'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'),{server}=require('./serve.cjs');
(async()=>{
 await new Promise(r=>server.listen(4200,'127.0.0.1',r));
 const browser=await chromium.launch({...(process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const viewport of [{width:1440,height:1100},{width:390,height:1000},{width:320,height:900}]){
  const mobile=viewport.width<900,context=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile,serviceWorkers:'block',timezoneId:'Asia/Ho_Chi_Minh'}),page=await context.newPage(),errors=[];let mutations=0;
  page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...a.length?a:['2026-10-16T13:00:00Z']);}static now(){return D.parse('2026-10-16T13:00:00Z');}};});
  const logs=[{id:'1',key:'CAL-1',date:'2026-10-16',start:'15:00',end:'16:00',minutes:60,timeSpentSeconds:3600,summary:'Công việc A',description:'Nội dung A',started:'2026-10-16T15:00:00.000+0700',overtimeKnown:true,overtime:true},{id:'2',key:'CAL-2',date:'2026-10-16',start:'08:00',end:'09:00',minutes:60,timeSpentSeconds:3600,summary:'Công việc B',description:'Nội dung B',started:'2026-10-16T08:00:00.000+0700',overtimeKnown:true,overtime:true},{id:'3',key:'CAL-3',date:'2026-10-16',start:'09:00',end:'10:00',minutes:60,timeSpentSeconds:3600,summary:'Công việc C',overtimeKnown:true,overtime:false}];
  await page.route('**/api?*',async route=>{const u=new URL(route.request().url()),action=u.searchParams.get('action');let data={ok:true};
   if(action==='status')data={ok:true,authenticated:true,user:{displayName:'Boss',username:'boss'}};
   if(action==='subtasks')data={ok:true,issues:[]};
   if(action==='day-audit')data={ok:true,regularOccupiedMinutes:60,freeMinutes:420,occupied:[],available:[]};
   if(action==='worklog-history')data={ok:true,items:logs.filter(x=>x.date>=u.searchParams.get('date')&&x.date<=(u.searchParams.get('endDate')||u.searchParams.get('date')))};
   if(['worklog-correction','calendar-moves','worklog'].includes(action))mutations++;
   await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:4200');await page.waitForFunction(()=>!document.getElementById('bootSplash')||document.getElementById('bootSplash').classList.contains('hidden'));await page.locator(mobile?'#mobileHistoryBtn':'#historyBtn').click();await page.waitForFunction(()=>state.historyLoaded&&!state.historyLoading&&!document.getElementById('historyOverlay').classList.contains('qjl-opening'));
  await page.evaluate(()=>{const r=document.getElementById('historyResults'),c=document.querySelector('[data-calendar-date="2026-10-16"]');r.scrollLeft=c.offsetLeft-54;});

  const info=()=>page.evaluate(()=>({drafts:state.calendarDrafts.size,jobs:[...calendarHoverMotions.values()].map(j=>({id:j.item.id,mode:j.mode,goal:j.goal})),canonical:state.historyItems.map(x=>({id:x.id,start:x.start}))}));
  const point=async id=>page.evaluate(id=>{const r=calendarBlockFor(calendarRenderedItems.find(x=>x.id===id)).getBoundingClientRect();return{x:r.left+30,y:r.top+8};},id);
  const blank=()=>page.evaluate(()=>{const c=document.querySelector('[data-calendar-date="2026-10-16"]'),r=c.getBoundingClientRect();return{x:r.left+30,y:r.top+(810-Number(c.dataset.fromMinute))*r.height/Number(c.parentElement.dataset.minuteRange)+8};});
  let session=mobile?await context.newCDPSession(page):null;
  const move=async p=>{if(mobile)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p]});else await page.mouse.move(p.x,p.y);};
  const begin=async()=>{const a=await point('1');if(mobile){await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});await page.waitForTimeout(600);}else{await page.mouse.move(a.x,a.y);await page.mouse.down();}await move(await point('2'));await page.waitForFunction(()=>calendarHoverMotions.get('CAL-2:2')?.mode==='away');};
  const end=async cancel=>{if(mobile)await session.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});else{if(cancel)await page.keyboard.press('Escape');await page.mouse.up();}};
  const frame=async(id,t)=>page.evaluate(async({id,t})=>{const job=[...calendarHoverMotions.values()].find(j=>j.item.id===id),a=job.animation;await a.ready;a.pause();a.currentTime=a.effect.getTiming().duration*t;const r=job.clone.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};},{id,t});
  const near=(a,b)=>assert(Math.hypot(a.x-b.x,a.y-b.y)<4,'Retarget must start at the currently visible frame, without teleporting');
  const reset=async()=>{await page.evaluate(()=>{resetCalendarInteraction();state.calendarDrafts.clear();renderCalendarDrafts();document.getElementById('historyResults').scrollTop=0;});await page.waitForTimeout(650);};
  // Before release: B flies, logical slot/hit testing and canonical data stay put.
  await begin();let details=await info();assert.equal(details.drafts,0);assert.equal(mutations,0);assert.equal(details.jobs[0].mode,'away');assert((await page.locator('.calendar-swap-flight').textContent()).includes('15:00–16:00'));assert.equal(details.canonical.find(x=>x.id==='2').start,'08:00');assert.equal(await page.locator('#calendarSaveBtn').isVisible(),false);
  assert(await page.evaluate(()=>{const j=calendarHoverMotions.get('CAL-2:2'),p=calendarBlockFor(calendarRenderedItems.find(x=>x.id==='2')).getBoundingClientRect();return document.elementFromPoint(p.left+30,p.top+8)===j.node||j.node.contains(document.elementFromPoint(p.left+30,p.top+8));}));
  const start=await frame('2',0),middle=await frame('2',.4);assert(Math.abs(middle.y-start.y)>40&&Math.abs(middle.x-start.x)>5,'Must visibly travel along a curved route while held');
  await move(await blank());await page.waitForFunction(()=>calendarHoverMotions.get('CAL-2:2')?.mode==='return');near(middle,await frame('2',0));const returning=await frame('2',.35);
  await move(await point('2'));await page.waitForFunction(()=>calendarHoverMotions.get('CAL-2:2')?.mode==='away');near(returning,await frame('2',0));
  // Rapid reversals keep one job and never jump back to a stale endpoint.
  for(let i=0;i<4;i++){
   const beforeReturn=await frame('2',.25);await move(await blank());await page.waitForFunction(()=>calendarHoverMotions.get('CAL-2:2')?.mode==='return');near(beforeReturn,await frame('2',0));
   const beforeAway=await frame('2',.25);await move(await point('2'));await page.waitForFunction(()=>calendarHoverMotions.get('CAL-2:2')?.mode==='away');near(beforeAway,await frame('2',0));assert.equal((await info()).drafts,0);
  }
  // B→C: B returns and C takes its place concurrently, with no draft mutation.
  await move(await point('3'));await page.waitForFunction(()=>calendarHoverMotions.get('CAL-2:2')?.mode==='return'&&calendarHoverMotions.get('CAL-3:3')?.mode==='away');assert.equal((await info()).drafts,0);assert.equal(mutations,0);
  await page.waitForTimeout(720);assert.equal((await info()).jobs.length,1);assert.equal((await info()).jobs[0].id,'3');assert.equal((await info()).jobs[0].mode,'away');
  if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`hover-held-${viewport.width}.png`)});}
  await move(await blank());await page.waitForFunction(()=>calendarHoverMotions.get('CAL-3:3')?.mode==='return');await end();assert.equal((await info()).drafts,1);assert.equal(await page.evaluate(()=>calendarPreviewItems().find(x=>x.id==='1').start),'13:30');assert.equal(await page.evaluate(()=>calendarPreviewItems().find(x=>x.id==='3').start),'09:00');await page.waitForFunction(()=>!calendarHoverMotions.size);assert.equal(await page.locator('.calendar-swap-layer,.is-swap-landing').count(),0);
  // Release during flight adopts the current frame instead of replaying from B.
  await reset();await begin();const preDrop=await frame('2',.3);await end();assert.equal((await info()).drafts,2);assert.equal((await info()).jobs[0].mode,'commit');near(preDrop,await frame('2',0));assert.equal(await page.evaluate(()=>calendarPreviewItems().find(x=>x.id==='2').start),'15:00');assert.equal(mutations,0);await page.evaluate(()=>{for(const j of calendarHoverMotions.values())j.animation?.finish();});await page.waitForFunction(()=>!calendarHoverMotions.size);
  assert.equal(await page.locator('#calendarSaveBtn').isVisible(),true);await page.locator('#calendarSaveBtn').click();assert.equal(await page.locator('#calendarSaveList li').count(),2);await page.locator('#calendarCancelSaveBtn').click();assert.equal(mutations,0);
  // Cancel the gesture while B is displaced: animate it home, create no draft.
  await reset();await begin();await frame('2',.5);await end(true);assert.equal((await info()).drafts,0);await page.waitForFunction(()=>!calendarHoverMotions.size);assert.equal(await page.locator('.is-swap-landing').count(),0);
  // Resize/render/scroll cleanup and reduced motion retain the same data rules.
  await reset();await begin();await page.evaluate(()=>window.dispatchEvent(new Event('resize')));await end(true);await page.waitForFunction(()=>!calendarHoverMotions.size);
  await reset();await page.emulateMedia({reducedMotion:'reduce'});await begin();assert.equal(await page.locator('.is-hover-preview').evaluate(e=>getComputedStyle(e).display),'block');assert.equal(await page.evaluate(()=>calendarHoverMotions.get('CAL-2:2').animation),null);assert.equal((await info()).drafts,0);await move(await blank());await page.waitForFunction(()=>!calendarHoverMotions.size);await end(true);assert.equal((await info()).drafts,0);
  await page.emulateMedia({reducedMotion:'no-preference'});await reset();await begin();await page.evaluate(()=>renderWorklogHistory());assert.equal(await page.locator('.calendar-swap-layer,.is-swap-landing').count(),0);await end();
  await reset();await page.locator('#calendarFullscreenBtn').click();await page.waitForFunction(()=>state.calendarFullscreen);await page.waitForTimeout(250);
  await page.evaluate(()=>{const c=document.querySelector('[data-calendar-date="2026-10-16"]');document.getElementById('historyResults').scrollLeft=c.offsetLeft-54;});
  await begin();assert.equal((await info()).drafts,0);await end(true);await page.waitForFunction(()=>!calendarHoverMotions.size);await page.locator('#calendarFullscreenBtn').click();await page.waitForFunction(()=>!state.calendarFullscreen);
  assert.equal(mutations,0);assert.deepEqual(errors,[]);if(session)await session.detach();await context.close();console.log('Live swap preview: held flight, stable hit test, continuous reversal, B→C, draft only on release, adoption, cancel/reduced/cleanup and no Jira writes passed',viewport);
 }
 await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);server.close();process.exit(1)});
