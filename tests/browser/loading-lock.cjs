'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright'),{server}=require('./serve.cjs');
(async()=>{
 await new Promise(r=>server.listen(4223,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.QJL_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:844,height:390}]){
  const mobile=viewport.width<900,ctx=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile,serviceWorkers:'block'}),page=await ctx.newPage(),errors=[],calls=[],held=[];
  let hold=new Set(['subtasks','worklog-history']),fail=new Set(),malformed=false,networkError=false;
  page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...a.length?a:['2026-10-16T13:00:00Z']);}static now(){return D.parse('2026-10-16T13:00:00Z');}};});
  const logs=[{id:'1',key:'LOAD-1',date:'2026-10-16',start:'08:00',end:'09:00',started:'2026-10-16T08:00:00.000+0700',minutes:60,timeSpentSeconds:3600,summary:'Công việc fixture',description:'Giữ mô tả',overtimeKnown:true,overtime:false}];
  await page.route('**/api?*',async route=>{
   const u=new URL(route.request().url()),a=u.searchParams.get('action');calls.push(a);if(a==='worklog')return route.continue();
   if(hold.has(a))await new Promise(resolve=>held.push({a,resolve}));
   if(networkError&&a==='issue-info'){await route.abort('failed');return;}
   if(malformed&&a==='issue-info'){await route.fulfill({contentType:'application/json',body:'{broken'});return;}
   let data=a==='status'?{ok:true,authenticated:true,user:{username:'boss',displayName:'Boss'}}:a==='worklog-history'?{ok:true,items:logs,skipped:[]}:a==='subtasks'?{ok:true,issues:[{key:'LOAD-1',project:'LOAD',summary:'Công việc fixture',status:'In Progress'}]}:a==='day-audit'?{ok:true,regularOccupiedMinutes:60,occupied:[],available:[]}:a==='calendar-users'?{ok:true,users:[{key:'TEST',username:'other',displayName:'Other User'}]}:a==='issue-info'?{ok:true,issue:{key:'LOAD-1',summary:'Fixture'}}:{ok:true,worklogVerified:true};
   if(fail.has(a))data={ok:false,error:'Fixture request failed'};
   await route.fulfill({status:fail.has(a)?503:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  const release=a=>{for(const w of held.filter(x=>x.a===a))w.resolve();for(let i=held.length-1;i>=0;i--)if(held[i].a===a)held.splice(i,1);};
  const waitHold=a=>page.waitForFunction(()=>QuickJiraBusy.active).then(async()=>{for(let i=0;i<200&&!held.some(x=>x.a===a);i++)await page.waitForTimeout(10);assert(held.some(x=>x.a===a),'Missing held '+a);});
  const ready=()=>page.waitForFunction(()=>!QuickJiraBusy.active&&QuickJiraBusy.count===0);
  const blocked=async id=>{
   const before=calls.length,node=page.locator('#'+id),r=await node.boundingBox();
   if(r){if(mobile)await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);else await page.mouse.click(r.x+r.width/2,r.y+r.height/2);}
   await page.evaluate(id=>document.getElementById(id).click(),id);
   await page.keyboard.press('Escape');await page.keyboard.press('Control+k');await page.keyboard.press('Control+Enter');await page.keyboard.press('Tab');
   assert(await page.evaluate(()=>QuickJiraBusy.active&&document.getElementById('dataLoadingFeedback').open));assert.equal(calls.length,before,'Background action must not send requests');
  };
  await page.goto('http://127.0.0.1:4223');await waitHold('subtasks');await waitHold('worklog-history');
  await blocked(mobile?'mobileHistoryBtn':'historyBtn');assert.equal(await page.locator('#historyOverlay').isVisible(),false);
  hold.delete('subtasks');release('subtasks');await page.waitForTimeout(60);assert(await page.evaluate(()=>QuickJiraBusy.active),'Another pending request keeps the lock');
  hold.delete('worklog-history');release('worklog-history');await ready();
  await page.locator(mobile?'#mobileHistoryBtn':'#historyBtn').click();await ready();await page.waitForFunction(()=>state.historyLoaded&&!state.historyLoading);
  hold.add('worklog-history');await page.locator('#calendarRefreshBtn').click();await waitHold('worklog-history');
  await blocked('closeHistoryBtn');assert.equal(await page.locator('#historyOverlay').isVisible(),true);
  const scroll=await page.evaluate(()=>({x:document.getElementById('historyResults').scrollLeft,y:document.getElementById('historyResults').scrollTop,page:scrollY}));
  await page.mouse.wheel(100,300);await page.waitForTimeout(80);assert.deepEqual(await page.evaluate(()=>({x:document.getElementById('historyResults').scrollLeft,y:document.getElementById('historyResults').scrollTop,page:scrollY})),scroll);
  hold.delete('worklog-history');release('worklog-history');await ready();
  // HTTP failures unlock so retry is usable; no stale disabled/inert state is written.
  hold.add('worklog-history');fail.add('worklog-history');await page.locator('#calendarRefreshBtn').click();await waitHold('worklog-history');hold.clear();release('worklog-history');await ready();assert(await page.locator('.history-retry-btn').isVisible());fail.clear();await page.locator('.history-retry-btn').click();await ready();
  // Native top-layer picker: the close button, task list and keyboard are blocked.
  await page.evaluate(()=>{void openCalendarLog('2026-10-16','15:00');});await ready();
  hold.add('subtasks');await page.locator('#calendarTaskRefreshBtn').click();await waitHold('subtasks');await blocked('closeCalendarLogBtn');assert(await page.locator('#calendarLogDialog').evaluate(x=>x.open));
  assert.equal(await page.evaluate(()=>document.activeElement.id),'dataLoadingFeedback');
  hold.clear();release('subtasks');await ready();await page.locator('#closeCalendarLogBtn').click();
  // Re-entrant requests and idempotent releases: one finish cannot unlock another.
  await page.evaluate(()=>{window.releaseOne=QuickJiraBusy.begin('Một');window.releaseTwo=QuickJiraBusy.begin('Hai');releaseOne();releaseOne();});
  assert.equal(await page.evaluate(()=>QuickJiraBusy.count),1);await blocked('closeHistoryBtn');
  // A new native modal opened by application code cannot rise above the blocker.
  await page.evaluate(()=>document.getElementById('calendarUserDialog').showModal());await page.waitForTimeout(20);assert(await page.evaluate(()=>document.getElementById('dataLoadingFeedback').matches(':modal')&&document.activeElement.id==='dataLoadingFeedback'));
  await page.evaluate(()=>{document.getElementById('calendarUserDialog').close();releaseTwo();});await ready();
  // Deduped GET and malformed/network responses always release exactly once.
  for(const mode of ['malformed','network']){
   malformed=mode==='malformed';networkError=mode==='network';
   const result=await page.evaluate(async()=>{const a=api('/api?action=issue-info&key=LOAD-1'),b=api('/api?action=issue-info&key=LOAD-1');return (await Promise.allSettled([a,b])).map(x=>x.status);});assert.deepEqual(result,['rejected','rejected']);await ready();
  }malformed=false;networkError=false;
  // Existing log progress is the sole visible indicator; the modal shield is transparent.
  await page.evaluate(()=>startLogProgress('single'));await page.waitForFunction(()=>QuickJiraBusy.active);await blocked('closeHistoryBtn');
  assert(await page.locator('#dataLoadingFeedback').evaluate(e=>e.hasAttribute('data-shield')));assert.equal(await page.locator('.data-loading-card').isVisible(),false);assert(await page.locator('#logProgressDialog').evaluate(e=>e.open));
  await page.evaluate(()=>finishLogProgress(false,new Error('Fixture complete')));await ready();await page.locator('#closeLogProgressBtn').click();await page.waitForTimeout(250);
  // Real streamed progress: keep the lock until the NDJSON final result/body end.
  await page.evaluate(()=>{startLogProgress('single');window.streaming=api('/api?action=worklog',{method:'POST',body:JSON.stringify({key:'LOAD-1',project:'LOAD',date:'2026-10-16',timeSpent:'1h',description:'Fixture'}),onProgress:updateLogProgress}).then(()=>finishLogProgress(true));});
  await page.waitForFunction(()=>state.logProgress.active&&state.logProgress.percent>=25);await blocked('closeHistoryBtn');assert.equal(await page.evaluate(()=>QuickJiraBusy.count),1);
  await page.evaluate(()=>window.streaming);await ready();assert.equal(await page.evaluate(()=>state.logProgress.percent),100);await page.locator('#closeLogProgressBtn').click();await page.waitForTimeout(250);
  // Fullscreen hosts still receive the same real modal blocker.
  await page.locator('#calendarFullscreenBtn').click();await page.waitForTimeout(220);hold.add('worklog-history');await page.locator('#calendarNextBtn').click();await waitHold('worklog-history');await blocked('calendarFullscreenBtn');
  assert(await page.locator('#dataLoadingFeedback').evaluate(el=>!document.fullscreenElement||document.fullscreenElement.contains(el)));
  hold.clear();release('worklog-history');await ready();
  await page.evaluate(async()=>{if(state.calendarFullscreen)await exitCalendarFullscreen();});await page.locator('#closeHistoryBtn').click();
  hold.add('worklog-history');await page.locator(mobile?'#mobilePlannerBtn':'#plannerBtn').click();await waitHold('worklog-history');await blocked('closePlannerBtn');
  hold.clear();release('worklog-history');await ready();assert.equal(await page.evaluate(()=>state.summary.loading),false);await page.locator('#closePlannerBtn').click();
  assert.deepEqual(errors,[]);await ctx.close();
  console.log('Global loading lock: concurrent/early requests, mouse/touch/keyboard/wheel, native modal/fullscreen, error/retry/dedup/network cleanup and single progress passed',viewport);
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exit(1);});
