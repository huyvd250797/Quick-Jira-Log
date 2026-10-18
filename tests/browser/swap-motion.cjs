'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'),{server}=require('./serve.cjs');
(async()=>{
 await new Promise(r=>server.listen(4199,'127.0.0.1',r));
 const browser=await chromium.launch({...(process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const viewport of [{width:1440,height:1100},{width:390,height:1000},{width:320,height:900}]){
  const mobile=viewport.width<900,context=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile,serviceWorkers:'block',timezoneId:'Asia/Ho_Chi_Minh'}),page=await context.newPage(),errors=[];let mutations=0;
  page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...a.length?a:['2026-10-16T13:00:00Z']);}static now(){return D.parse('2026-10-16T13:00:00Z');}};});
  const logs=[{id:'1',key:'CAL-1',date:'2026-10-16',start:'15:00',end:'16:00',minutes:60,timeSpentSeconds:3600,summary:'Công việc A',description:'Nội dung A',started:'2026-10-16T15:00:00.000+0700',overtimeKnown:true,overtime:true},{id:'2',key:'CAL-2',date:'2026-10-16',start:'08:00',end:'09:00',minutes:60,timeSpentSeconds:3600,summary:'Công việc B',description:'Nội dung B',started:'2026-10-16T08:00:00.000+0700',overtimeKnown:true,overtime:true}];
  await page.route('**/api?*',async route=>{const u=new URL(route.request().url()),action=u.searchParams.get('action');let data={ok:true};
   if(action==='status')data={ok:true,authenticated:true,user:{displayName:'Boss',username:'boss'}};
   if(action==='subtasks')data={ok:true,issues:[]};
   if(action==='day-audit')data={ok:true,regularOccupiedMinutes:60,freeMinutes:420,occupied:[],available:[]};
   if(action==='worklog-history')data={ok:true,items:logs.filter(x=>x.date>=u.searchParams.get('date')&&x.date<=(u.searchParams.get('endDate')||u.searchParams.get('date')))};
   if(['worklog-correction','calendar-moves','worklog'].includes(action))mutations++;
   await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:4199');await page.waitForFunction(()=>!document.getElementById('bootSplash')||document.getElementById('bootSplash').classList.contains('hidden'));await page.locator(mobile?'#mobileHistoryBtn':'#historyBtn').click();await page.waitForFunction(()=>state.historyLoaded&&!state.historyLoading&&!document.getElementById('historyOverlay').classList.contains('qjl-opening'));
  await page.evaluate(()=>{const r=document.getElementById('historyResults'),c=document.querySelector('[data-calendar-date="2026-10-16"]');r.scrollLeft=c.offsetLeft-54;});
  const stage=async()=>page.evaluate(()=>{
   const a=calendarPreviewItems().find(x=>x.id==='1'),b=calendarPreviewItems().find(x=>x.id==='2');
   const source=calendarBlockFor(b),from=source.getBoundingClientRect().toJSON(),background=getComputedStyle(source).backgroundColor,ribbon=source.querySelector('.ot-ribbon')&&getComputedStyle(source.querySelector('.ot-ribbon')).transform;stageCalendarMove(a,b,QuickJiraDrafts.drop(a,b,calendarPreviewItems(),b));
   const job=calendarSwapMotion;if(!job)return null;
   job.animations.forEach(x=>x.pause());
   return{background,ribbon,from,to:job.destination.getBoundingClientRect().toJSON(),duration:job.animations[0].effect.getTiming().duration,frames:job.animations[0].effect.getKeyframes().map(x=>x.transform),cloneKey:job.layer.querySelector('strong').textContent};
  });
  const motion=await stage();assert(motion);assert.equal(motion.cloneKey,'CAL-2');assert.equal(await page.locator('.calendar-swap-flight').evaluate(x=>getComputedStyle(x).backgroundColor),motion.background);assert.equal(await page.locator('.calendar-swap-flight .ot-ribbon').evaluate(x=>getComputedStyle(x).transform),motion.ribbon);assert.equal(await page.locator('.calendar-swap-layer').count(),1);assert.equal(await page.evaluate(()=>getComputedStyle(calendarSwapMotion.destination).opacity),'0');
  const at=async t=>page.evaluate(async t=>{const a=calendarSwapMotion.animations[0];await a.ready;a.currentTime=t;const r=calendarSwapMotion.layer.firstElementChild.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};},t);
  const first=await at(0);assert(Math.abs(first.x-motion.from.x)<2&&Math.abs(first.y-motion.from.y)<2);
  const mid=await at(motion.duration*.35);assert(Math.abs(mid.x-motion.from.x)>8,'Flight must bow away from a vertical straight line');
  if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`swap-flight-${viewport.width}.png`)});}
  const last=await at(motion.duration);assert(Math.abs(last.x-motion.to.x)<2&&Math.abs(last.y-motion.to.y)<2,'Flight lands on actual new grid position');
  await page.evaluate(()=>calendarSwapMotion.animations.forEach(x=>x.finish()));await page.waitForFunction(()=>!calendarSwapMotion);assert.equal(await page.locator('.calendar-swap-layer,.is-swap-landing').count(),0);assert.equal(mutations,0);assert.equal(await page.evaluate(()=>state.calendarDrafts.size),2);
  const second=await stage();assert(second);assert.notDeepEqual(second.frames,motion.frames);assert.equal(await page.evaluate(()=>state.calendarDrafts.size),0);
  // A fresh swap cancels the earlier flight, leaving a single compositor layer.
  await stage();assert.equal(await page.locator('.calendar-swap-layer').count(),1);assert.equal(await page.locator('.is-swap-landing').count(),1);
  await page.evaluate(()=>window.dispatchEvent(new Event('resize')));assert.equal(await page.locator('.calendar-swap-layer,.is-swap-landing').count(),0);
  await stage();await page.locator('#calendarSaveBtn').isVisible();await page.keyboard.press('Escape');assert.equal(await page.locator('.calendar-swap-layer,.is-swap-landing').count(),0);
  await page.emulateMedia({reducedMotion:'reduce'});const reduced=await stage();assert.equal(reduced,null);assert.equal(await page.locator('.calendar-swap-layer,.is-swap-landing').count(),0);assert.equal(mutations,0);
  await page.emulateMedia({reducedMotion:'no-preference'});await stage();await page.evaluate(()=>renderWorklogHistory());assert.equal(await page.locator('.calendar-swap-layer,.is-swap-landing').count(),0);
  await page.evaluate(()=>applyTheme('dark'));await page.locator('#calendarFullscreenBtn').click();await page.waitForFunction(()=>state.calendarFullscreen);await page.waitForTimeout(250);assert(await stage());await page.keyboard.press('Escape');assert.equal(await page.locator('.calendar-swap-layer,.is-swap-landing').count(),0);await page.locator('#calendarFullscreenBtn').click();await page.waitForFunction(()=>!state.calendarFullscreen);
  await stage();await page.locator('#closeHistoryBtn').click();assert.equal(await page.locator('.calendar-swap-layer,.is-swap-landing').count(),0);
  assert.deepEqual(errors,[]);await context.close();console.log('Swap flight: curved actual frames, exact landing, native OT clone, repeated/cancel/reduced-motion cleanup and no Jira write passed',viewport);
 }
 await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);server.close();process.exit(1)});
