'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{server}=require('./serve.cjs');
(async()=>{
 await new Promise(r=>server.listen(4202,'127.0.0.1',r));
 const browser=await chromium.launch({...(process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const viewport of [{width:1440,height:1100},{width:390,height:1000},{width:320,height:900},{width:844,height:440}]){
  const mobile=viewport.width<900,context=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile,serviceWorkers:'block',timezoneId:'Asia/Ho_Chi_Minh'}),page=await context.newPage(),errors=[],writes=[],historyCalls=[];
  let denyLookup=false,delayB=false;
  page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...a.length?a:['2026-10-16T13:00:00Z']);}static now(){return D.parse('2026-10-16T13:00:00Z');}};});
  const users=Array.from({length:5},(_,i)=>({key:'U'+(i+1),username:'person'+(i+1),displayName:i===0?'Nguyễn An <script>x</script>':'Người dùng '+(i+1)}));
  const make=(id,start,extra={})=>({id,key:'CAL-'+id,project:'CAL',summary:'Task '+id,description:'Mô tả '+id,date:'2026-10-16',start,end:String(parseInt(start)+1).padStart(2,'0')+':00',minutes:60,timeSpentSeconds:3600,started:`2026-10-16T${start}:00.000+0700`,overtimeKnown:true,overtime:false,...extra});
  const mine=make('own','15:00');
  await page.route('**/api?*',async route=>{
   const u=new URL(route.request().url()),a=u.searchParams.get('action');let data={ok:true},status=200;
   if(a==='status')data={ok:true,authenticated:true,user:{username:'boss',displayName:'Boss'}};
   if(a==='subtasks')data={ok:true,issues:[]};
   if(a==='day-audit')data={ok:true,occupied:[],available:[],regularOccupiedMinutes:60,freeMinutes:420};
   if(a==='worklog-history'){historyCalls.push('self');data={ok:true,items:[mine]};}
   if(a==='calendar-users'){if(denyLookup){status=403;data={ok:false,error:'Cần quyền Browse Users trên Jira.'};}else data={ok:true,users};}
   if(a==='calendar-history'){
    const key=u.searchParams.get('userKey'),person=users.find(x=>x.key===key);historyCalls.push(key);
    if(key==='U2'&&delayB)await new Promise(r=>setTimeout(r,700));
    if(key==='U5'){status=403;data={ok:false,error:'Không có quyền đọc lịch này.'};}
    else data={ok:true,readOnly:true,viewedUser:person,items:[make(key,'09:00',{calendarReadOnly:true,overtime:key==='U1',overtimeKnown:key!=='U4'})]};
   }
   if(['worklog','bulk-worklog','worklog-correction','calendar-moves'].includes(a))writes.push({a,method:route.request().method()});
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:4202');await page.waitForFunction(()=>!document.getElementById('bootSplash')||document.getElementById('bootSplash').classList.contains('hidden'));
  const personal=await page.evaluate(()=>['date','timeSpent','description','project'].map(id=>document.getElementById(id).value));
  const open=async()=>{await page.locator(mobile?'#mobileHistoryBtn':'#historyBtn').click();await page.waitForFunction(()=>state.historyLoaded&&!state.historyLoading&&!document.getElementById('historyOverlay').classList.contains('qjl-opening'));};
  const full=async()=>{await page.locator('#calendarFullscreenBtn').click();await page.waitForFunction(()=>state.calendarFullscreen);};
  const scrollToLog=async()=>page.evaluate(()=>{const r=document.getElementById('historyResults'),c=document.querySelector('[data-calendar-date="2026-10-16"]');r.scrollLeft=c.offsetLeft-55;r.scrollTop=0;});
  const choose=async n=>{await page.locator('#calendarViewerBtn').click();await page.locator('#calendarUserSearch').fill('person');await page.locator('#calendarUserSearch').press('Enter');await page.waitForFunction(()=>document.querySelectorAll('#calendarUserResults button').length===5);await page.locator('#calendarUserResults button').nth(n-1).click();await page.waitForFunction(()=>!state.historyLoading&&state.historyLoaded);};
  await open();assert.equal(await page.locator('#calendarViewerBtn').isVisible(),false);assert.equal(await page.evaluate(()=>calendarReadOnly()),false);
  await full();assert(await page.locator('#calendarViewerBtn').isVisible());assert((await page.locator('#calendarViewerLabel').textContent()).includes('(Tôi)'));
  await page.locator('#calendarViewerBtn').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'calendarUserCloseBtn');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>state.calendarFullscreen),true);
  await choose(1);assert.equal(await page.evaluate(()=>state.user.username),'boss');assert.equal(await page.evaluate(()=>state.historyItems[0].id),'U1');assert.equal(await page.locator('#calendarGestureHint').isVisible(),false);assert(await page.locator('#calendarViewerMode').isVisible());
  await scrollToLog();const block=page.locator('[data-week-event]').first();await block.click();await page.waitForFunction(()=>document.getElementById('calendarReadDialog').open);assert.equal(await page.locator('#worklogCorrectionDialog').evaluate(e=>e.open),false);assert.equal(await page.locator('#calendarReadDialog input,#calendarReadDialog textarea,#calendarReadDialog select').count(),0);assert((await page.locator('#calendarReadOwner').textContent()).includes('Chỉ xem'));assert.equal(await page.locator('#calendarReadInfo').locator('script').count(),0);await page.locator('#calendarReadCloseBtn').click();
  const rect=await block.boundingBox();
  if(mobile){const session=await context.newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+20,y:rect.y+10}]});await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>calendarEditMode),false);await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rect.x+20,y:rect.y+25}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}
  else{await page.mouse.move(rect.x+20,rect.y+10);await page.mouse.down();await page.mouse.move(rect.x+20,rect.y+40);await page.mouse.up();}
  assert.equal(await page.evaluate(()=>state.calendarDrafts.size),0);assert.equal(await page.locator('.calendar-drop-highlight,.calendar-drag-ghost').count(),0);await page.evaluate(()=>document.getElementById('calendarReadDialog').close());
  await page.evaluate(()=>openCalendarLog('2026-10-16','13:30'));assert.equal(await page.locator('#calendarLogDialog').evaluate(e=>e.open),false);
  await page.locator('#calendarMonthBtn').click();await page.waitForFunction(()=>!state.historyLoading);await page.locator('.calendar-event').first().click();assert(await page.locator('#calendarReadDialog').evaluate(e=>e.open));await page.keyboard.press('Escape');assert(await page.evaluate(()=>state.calendarFullscreen));await page.locator('#calendarWeekBtn').click();await page.waitForFunction(()=>!state.historyLoading);
  for(const n of [2,3,4])await choose(n);assert.deepEqual(await page.evaluate(()=>recentCalendarUsers().map(x=>x.key)),['U4','U3','U2']);await page.locator('#calendarViewerBtn').click();assert.equal(await page.locator('#calendarUserRecent button').count(),3);await page.locator('#calendarUserRecent button').nth(2).click();await page.waitForFunction(()=>!state.historyLoading);assert.deepEqual(await page.evaluate(()=>recentCalendarUsers().map(x=>x.key)),['U2','U4','U3']);
  // Late B cannot replace C or be remembered as the most recent result.
  await page.evaluate(()=>calendarViewerCache.clear());delayB=true;await page.evaluate(user=>selectCalendarUser(user),users[1]);await page.waitForTimeout(60);await page.evaluate(user=>selectCalendarUser(user),users[2]);await page.waitForFunction(()=>!state.historyLoading&&state.historyItems[0]?.id==='U3');await page.waitForTimeout(800);assert.equal(await page.evaluate(()=>state.historyItems[0].id),'U3');assert.equal(await page.evaluate(()=>recentCalendarUsers()[0].key),'U3');delayB=false;
  await page.locator('#calendarViewerBtn').click();denyLookup=true;await page.locator('#calendarUserSearch').fill('xx');await page.locator('#calendarUserSearch').press('Enter');await page.waitForFunction(()=>document.getElementById('calendarUserSearchState').textContent.includes('Browse Users'));await page.locator('#calendarUserCloseBtn').click();denyLookup=false;
  // Forbidden selection must not show another person's stale records or add MRU.
  await page.locator('#calendarViewerBtn').click();await page.locator('#calendarUserSearch').fill('person');await page.locator('#calendarUserSearch').press('Enter');await page.waitForFunction(()=>document.querySelectorAll('#calendarUserResults button').length===5);await page.locator('#calendarUserResults button').nth(4).click();await page.waitForFunction(()=>!state.historyLoading&&!!state.historyError);assert.equal(await page.evaluate(()=>state.historyItems.length),0);assert(!(await page.evaluate(()=>recentCalendarUsers().map(x=>x.key))).includes('U5'));
  await page.locator('#calendarViewerBtn').click();await page.locator('#calendarUserMeBtn').click();await page.waitForFunction(()=>!state.historyLoading&&state.historyLoaded);assert.equal(await page.evaluate(()=>calendarReadOnly()),false);assert.equal(await page.evaluate(()=>state.historyItems[0].id),'own');
  // Leaving fullscreen while another person's response is in flight restores self.
  await page.evaluate(()=>calendarViewerCache.clear());delayB=true;await page.evaluate(user=>selectCalendarUser(user),users[1]);await page.waitForTimeout(60);await page.locator('#calendarFullscreenBtn').click();await page.waitForFunction(()=>!state.calendarFullscreen&&!state.historyLoading);await page.waitForTimeout(800);assert.equal(await page.evaluate(()=>state.historyItems[0].id),'own');assert.equal(await page.evaluate(()=>calendarReadOnly()),false);delayB=false;await full();
  // Existing drafts are never discarded by opening the picker.
  await page.evaluate(()=>{const a=calendarPreviewItems()[0];stageCalendarMove(a,{date:a.date,start:'13:30'});});assert.equal(await page.evaluate(()=>state.calendarDrafts.size),1);await page.locator('#calendarViewerBtn').click();assert(await page.locator('#calendarSaveDialog').evaluate(e=>e.open));assert.equal(await page.locator('#calendarUserDialog').evaluate(e=>e.open),false);assert.equal(await page.evaluate(()=>state.calendarDrafts.size),1);await page.locator('#calendarDiscardBtn').click();await page.waitForFunction(()=>!state.historyLoading);
  await choose(1);await page.evaluate(()=>applyTheme('dark'));await scrollToLog();
  if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`calendar-other-${viewport.width}.png`)});await page.locator('#calendarViewerBtn').click();await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`calendar-picker-${viewport.width}.png`)});await page.locator('#calendarUserCloseBtn').click();}
  await page.locator('#calendarFullscreenBtn').click();await page.waitForFunction(()=>!state.calendarFullscreen&&!state.historyLoading);assert.equal(await page.evaluate(()=>calendarReadOnly()),false);assert.equal(await page.locator('#calendarViewerBtn').isVisible(),false);assert.equal(await page.evaluate(()=>state.historyItems[0].id),'own');await page.locator('#closeHistoryBtn').click();await open();assert.equal(await page.evaluate(()=>calendarReadOnly()),false);
  assert.deepEqual(await page.evaluate(()=>['date','timeSpent','description','project'].map(id=>document.getElementById(id).value)),personal);assert.equal(writes.length,0);
  await page.evaluate(()=>{const old=state.user;state.user={username:'another-account'};window.__recentOtherAccount=recentCalendarUsers();state.user=old;});assert.deepEqual(await page.evaluate(()=>window.__recentOtherAccount),[]);
  await page.reload();await page.waitForFunction(()=>!!state.user);await open();await full();await page.locator('#calendarViewerBtn').click();assert.equal(await page.locator('#calendarUserRecent button').count(),3);assert.equal(await page.evaluate(()=>calendarReadOnly()),false);
  assert.deepEqual(errors,[]);await context.close();console.log('Calendar viewer fullscreen-only, readonly mouse/touch/month/details, MRU 3 persistence/isolation, stale/403, draft guard, reset and unchanged personal form passed',viewport);
 }
 await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);server.close();process.exit(1)});
