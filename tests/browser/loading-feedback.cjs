'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{server}=require('./serve.cjs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await new Promise(r=>server.listen(4214,'127.0.0.1',r));
 const browser=await chromium.launch({...(process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:844,height:390}]){
  const mobile=viewport.width<900,context=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile,serviceWorkers:'block'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...a.length?a:['2026-10-16T13:00:00Z']);}static now(){return D.parse('2026-10-16T13:00:00Z');}};});
  let filterDelay=650,historyDelay=0,historyError=false;
  await page.route('**/api?*',async route=>{const action=new URL(route.request().url()).searchParams.get('action');let status=200,data={ok:true};
   if(action==='status')data={ok:true,authenticated:true,user:{username:'boss',displayName:'Boss'}};
   if(action==='subtasks'){await sleep(filterDelay);data={ok:true,issues:[{key:'LOAD-1',project:'LOAD',summary:'Loading fixture',status:'In Progress'}]};}
   if(action==='worklog-history'){const failed=historyError;await sleep(historyDelay);status=failed?503:200;data=failed?{ok:false,error:'Fixture Jira đang bận'}:{ok:true,items:[]};}
   if(action==='day-audit')data={ok:true,occupied:[],available:[],freeMinutes:480};
   try{await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});}catch{}
  });
  await page.goto('http://127.0.0.1:4214');await page.waitForFunction(()=>!document.body.classList.contains('booting'));
  const hud=page.locator('#dataLoadingFeedback');
  await hud.waitFor({state:'visible'});assert((await hud.textContent()).includes('Sub-task'));
  await page.waitForFunction(()=>state.filterLoaded&&!state.filterLoading);await hud.waitFor({state:'hidden'});
  await page.locator(mobile?'#mobileHistoryBtn':'#historyBtn').click();await page.waitForFunction(()=>state.historyLoaded&&!state.historyLoading);
  for(const theme of ['light','dark']){
   await page.evaluate(t=>{applyTheme(t);state.historyCache.clear();},theme);historyDelay=900;
   await page.locator('#calendarNextBtn').click();await hud.waitFor({state:'visible'});await page.waitForTimeout(180);
   const geometry=await hud.locator('.data-loading-card').evaluate(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,x:r.x+r.width/2,y:r.y+r.height/2,w:innerWidth,h:innerHeight,font:parseFloat(getComputedStyle(el.querySelector('strong')).fontSize),motion:getComputedStyle(el.querySelector('.data-loading-spinner')).animationName};});
   assert(Math.abs(geometry.x-geometry.w/2)<3&&Math.abs(geometry.y-geometry.h/2)<3,JSON.stringify(geometry));assert(geometry.left>=0&&geometry.right<=geometry.w&&geometry.top>=0&&geometry.bottom<=geometry.h);assert(geometry.font>=18);assert.equal(geometry.motion,'qjl-data-spin');
   const contrast=await hud.evaluate(el=>({background:getComputedStyle(el).backgroundColor,opacity:getComputedStyle(el).opacity,cardOpacity:getComputedStyle(el.firstElementChild).opacity}));
   const alpha=Number(contrast.background.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/)?.[1]);assert(alpha>=.3&&alpha<=.55,JSON.stringify(contrast));assert.equal(contrast.opacity,'1');assert.equal(contrast.cardOpacity,'1');
   if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`loading-${viewport.width}-${theme}.png`)});}
   // Closing a view during its request immediately removes its feedback.
   await page.locator('#closeHistoryBtn').click();await hud.waitFor({state:'hidden'});
   await page.locator(mobile?'#mobileHistoryBtn':'#historyBtn').click();await page.waitForFunction(()=>state.historyLoaded&&!state.historyLoading);await hud.waitFor({state:'hidden'});
  }
  // Error states must replace loading, including the existing retry control.
  historyError=true;await page.evaluate(()=>state.historyCache.clear());await page.locator('#calendarNextBtn').click();await hud.waitFor({state:'visible'});
  await page.waitForFunction(()=>!state.historyLoading&&!!state.historyError);await hud.waitFor({state:'hidden'});assert(await page.locator('.history-retry-btn').isVisible());historyError=false;
  historyDelay=0;await page.locator('.history-retry-btn').click();await page.waitForFunction(()=>!state.historyLoading&&state.historyLoaded);
  // Fullscreen mounts feedback inside the fullscreen element where required.
  await page.locator('#calendarFullscreenBtn').click();await page.waitForTimeout(250);historyDelay=800;
  await page.locator('#calendarNextBtn').click();await hud.waitFor({state:'visible'});
  assert(await hud.evaluate(el=>!document.fullscreenElement||document.fullscreenElement.contains(el)));
  await page.waitForFunction(()=>!state.historyLoading);await hud.waitFor({state:'hidden'});
  // Loading the native task picker does not focus any input or cover top-layer progress.
  await page.evaluate(()=>{void openCalendarLog('2026-10-16','15:00');});await page.locator('#calendarLogDialog').waitFor({state:'visible'});
  filterDelay=800;await page.locator('#calendarTaskRefreshBtn').click();await hud.waitFor({state:'visible'});
  assert.equal(await hud.evaluate(el=>el.parentElement.id),'calendarLogDialog');
  assert(!['INPUT','TEXTAREA'].includes(await page.evaluate(()=>document.activeElement.tagName)));
  await page.waitForFunction(()=>!state.filterLoading);await hud.waitFor({state:'hidden'});
  await page.locator('#closeCalendarLogBtn').click();await page.locator('#calendarFullscreenBtn').click();await page.waitForFunction(()=>!state.calendarFullscreen);await page.locator('#closeHistoryBtn').click();
  historyDelay=800;await page.locator(mobile?'#mobilePlannerBtn':'#plannerBtn').click();await hud.waitFor({state:'visible'});assert((await hud.textContent()).includes('tổng hợp'));
  await page.locator('#closePlannerBtn').click();await hud.waitFor({state:'hidden'});
  await page.evaluate(()=>startLogProgress('single'));assert.equal(await hud.isVisible(),false);
  assert.equal(await page.locator('#logProgressTitle').evaluate(el=>getComputedStyle(el,'::before').animationName),'qjl-data-spin');
  await page.evaluate(()=>finishLogProgress(true));assert.equal(await page.locator('#logProgressTitle').evaluate(el=>getComputedStyle(el,'::before').content),'none');
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>startLogProgress('single'));assert.equal(await page.locator('#logProgressTitle').evaluate(el=>getComputedStyle(el,'::before').animationName),'none');
  assert.deepEqual(errors,[]);await context.close();console.log('Centered loading, responsive themes, close/reopen, error cleanup, fullscreen, native picker, focus and one progress indicator passed',viewport);
 }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exit(1)});
