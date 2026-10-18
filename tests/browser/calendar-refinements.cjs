'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{server}=require('./serve.cjs');
(async()=>{
 await new Promise(r=>server.listen(4203,'127.0.0.1',r));
 const browser=await chromium.launch({...(process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:320,height:683},{width:844,height:390}]){
  const mobile=viewport.width<900,context=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile,serviceWorkers:'block',timezoneId:'Asia/Ho_Chi_Minh'}),page=await context.newPage(),errors=[],lookups=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...a.length?a:['2026-10-16T13:00:00Z']);}static now(){return D.parse('2026-10-16T13:00:00Z');}};});
  const person={key:'JIRAUSER123',username:'nguyen.an',displayName:'Nguyễn An'},slowPerson={key:'SLOW',username:'slow',displayName:'Old result'};
  const logs=[{id:'1',key:'CAL-1',date:'2026-10-16',start:'08:00',end:'09:00',minutes:60,timeSpentSeconds:3600,summary:'Hỗ trợ vận hành',description:'Giữ nguyên logwork',overtimeKnown:true,overtime:false},{id:'2',key:'CAL-2',date:'2026-10-16',start:'15:00',end:'16:00',minutes:60,timeSpentSeconds:3600,summary:'Review tài liệu',overtimeKnown:true,overtime:true}];
  await page.route('**/api?*',async route=>{const u=new URL(route.request().url()),a=u.searchParams.get('action');let data={ok:true},status=200;
   if(a==='status')data={ok:true,authenticated:true,user:{username:'boss',displayName:'Boss'}};
   if(a==='subtasks')data={ok:true,issues:[]};
   if(a==='day-audit')data={ok:true,occupied:[],available:[],freeMinutes:360,regularOccupiedMinutes:120};
   if(a==='worklog-history')data={ok:true,items:logs};
   if(a==='calendar-users'){const q=u.searchParams.get('query');lookups.push(q);if(q==='slow')await new Promise(r=>setTimeout(r,650));if(q==='denied'){status=403;data={ok:false,error:'Cần quyền Browse Users trên Jira.'};}else data={ok:true,users:[q==='slow'?slowPerson:person]};}
   if(a==='calendar-history')data={ok:true,readOnly:true,viewedUser:person,items:logs.map(x=>({...x,calendarReadOnly:true}))};
   if(['worklog','bulk-worklog','calendar-moves','worklog-correction'].includes(a))writes.push(a);
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:4203');await page.waitForFunction(()=>!document.getElementById('bootSplash')||document.getElementById('bootSplash').classList.contains('hidden'));await page.locator(mobile?'#mobileHistoryBtn':'#historyBtn').click();await page.waitForFunction(()=>state.historyLoaded&&!state.historyLoading&&!document.getElementById('historyOverlay').classList.contains('qjl-opening'));
  const testEdges=async()=>{
   const result=await page.evaluate(()=>{
    const r=document.getElementById('historyResults'),target=document.querySelector('.week-day-column'),header=document.getElementById('calendarControls');
    const maxX=r.scrollWidth-r.clientWidth,maxY=r.scrollHeight-r.clientHeight;
    const touch=(type,target,x,y,multi=false)=>{const points=[new Touch({identifier:1,target,clientX:x,clientY:y})];if(multi)points.push(new Touch({identifier:2,target,clientX:x+10,clientY:y+10}));const e=new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'?[]:points,changedTouches:points});target.dispatchEvent(e);return e.defaultPrevented;};
    const pan=(left,top,dx,dy,targetElement=target)=>{r.scrollTo(left,top);touch('touchstart',targetElement,150,250);const prevented=touch('touchmove',targetElement,150+dx,250+dy);touch('touchend',targetElement,150+dx,250+dy);return{prevented,left:r.scrollLeft,top:r.scrollTop};};
    const first=pan(0,0,90,130),last=pan(maxX,maxY,-90,-130);
    const diagonal=pan(0,Math.min(50,maxY),50,-25);
    r.scrollTo(Math.min(40,maxX/2),Math.min(40,maxY/2));const dx=maxX>100?-10:0,dy=maxY>100?-10:0;
    touch('touchstart',target,150,250);const interior=touch('touchmove',target,150+dx,250+dy);touch('touchend',target,150+dx,250+dy);
    const toolbar=pan(0,0,70,90,header);
    touch('touchstart',target,150,250,true);const pinch=touch('touchmove',target,160,260,true);touch('touchend',target,160,260);
    r.scrollTo(0,0);const wheel=new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaX:-100,deltaY:-100});target.dispatchEvent(wheel);
    const heading=document.querySelector('.week-grid-heading').getBoundingClientRect(),frame=r.getBoundingClientRect();
    return{first,last,diagonal,interior,toolbar,pinch,wheel:wheel.defaultPrevented,maxX,maxY,overscroll:getComputedStyle(r).overscrollBehavior,gapX:heading.left-frame.left,gapY:heading.top-frame.top};
   });
   assert.equal(result.first.prevented,true);assert.equal(result.first.left,0);assert.equal(result.first.top,0);
   assert.equal(result.last.prevented,true);assert(Math.abs(result.last.left-result.maxX)<1&&Math.abs(result.last.top-result.maxY)<1);
   assert.equal(result.diagonal.left,0);assert.equal(result.interior,false);assert.equal(result.toolbar.prevented,true);assert.equal(result.pinch,false);assert.equal(result.wheel,true);assert.equal(result.overscroll,'none');assert(result.gapX<3&&result.gapY<3,'No empty strip at the grid origin');
  };
  await testEdges();
  // Genuine touch still pans inside a scrollable grid (not globally touch-locked).
  if(mobile){const info=await page.locator('#historyResults').evaluate(r=>({r:r.getBoundingClientRect().toJSON(),max:r.scrollWidth-r.clientWidth}));if(info.max>50){const session=await context.newCDPSession(page),p={x:info.r.left+info.r.width*.7,y:info.r.top+info.r.height*.55};await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});for(let i=1;i<=5;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x-i*14,y:p.y}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(180);assert(await page.locator('#historyResults').evaluate(r=>r.scrollLeft>20),'Legitimate horizontal pan must work');await session.detach();}}
  await page.locator('#calendarFullscreenBtn').click();await page.waitForFunction(()=>state.calendarFullscreen);await testEdges();
  await page.locator('#calendarViewerBtn').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'calendarUserCloseBtn');
  const input=page.locator('#calendarUserSearch');await input.fill('nguyen');await page.waitForFunction(()=>document.querySelectorAll('#calendarUserResults button').length===1);assert.equal(lookups.at(-1),'nguyen','Typing alone must request suggestions without Enter');assert.equal(await input.getAttribute('aria-expanded'),'true');assert.equal(await page.locator('#calendarUserRecentSection').isVisible(),false);assert.equal(await page.locator('#calendarUserMeBtn').isVisible(),false);assert((await page.locator('#calendarUserResults').textContent()).includes('Nguyễn An'));
  const count=lookups.length;await input.evaluate(e=>{e.value='Nguyễn';e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));e.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));});await page.waitForTimeout(350);assert.equal(lookups.length,count,'IME composition must not send half-typed requests');await input.evaluate(e=>e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})));await page.waitForFunction(()=>document.querySelectorAll('#calendarUserResults button').length===1);assert.equal(lookups.at(-1),'Nguyễn');
  await input.fill('slow');await page.waitForFunction(()=>document.getElementById('calendarUserResults').getAttribute('aria-busy')==='true');await page.waitForTimeout(30);await input.fill('an');await page.waitForFunction(()=>document.querySelectorAll('#calendarUserResults button').length===1);await page.waitForTimeout(700);assert(!(await page.locator('#calendarUserResults').textContent()).includes('Old result'));assert((await page.locator('#calendarUserResults').textContent()).includes('Nguyễn An'));
  // Simulate the visual viewport reduced by an on-screen keyboard.
  if(mobile){await page.evaluate(()=>{window.__vvHeight=Object.getOwnPropertyDescriptor(window.visualViewport,'height');window.__vvTop=Object.getOwnPropertyDescriptor(window.visualViewport,'offsetTop');Object.defineProperty(window.visualViewport,'height',{configurable:true,value:280});Object.defineProperty(window.visualViewport,'offsetTop',{configurable:true,value:30});window.visualViewport.dispatchEvent(new Event('resize'));});await page.waitForTimeout(80);const r=await page.locator('#calendarUserDialog').boundingBox();assert(r.y>=41&&r.y+r.height<=299,'Suggestions must fit above the keyboard');await page.evaluate(()=>{if(window.__vvHeight)Object.defineProperty(window.visualViewport,'height',window.__vvHeight);else delete window.visualViewport.height;if(window.__vvTop)Object.defineProperty(window.visualViewport,'offsetTop',window.__vvTop);else delete window.visualViewport.offsetTop;window.visualViewport.dispatchEvent(new Event('resize'));});await page.waitForTimeout(80);}
  await input.fill('denied');await page.waitForFunction(()=>document.getElementById('calendarUserSearchState').textContent.includes('Browse Users'));assert.equal(await page.locator('#calendarUserResults button').count(),0);await input.fill('an');await page.waitForFunction(()=>document.querySelectorAll('#calendarUserResults button').length===1);
  await input.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('role')),'option');await page.keyboard.press('Enter');await page.waitForFunction(()=>!state.historyLoading&&state.historyLoaded&&calendarReadOnly());assert.equal(await page.evaluate(()=>calendarViewedUser.key),person.key);await testEdges();assert.equal(await page.evaluate(()=>state.calendarDrafts.size),0);
  if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`calendar-bounds-${viewport.width}.png`)});await page.locator('#calendarViewerBtn').click();await input.fill('nguyen');await page.waitForFunction(()=>document.querySelectorAll('#calendarUserResults button').length===1);await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`personnel-suggestions-${viewport.width}.png`)});await page.locator('#calendarUserCloseBtn').click();}
  assert.equal(writes.length,0);assert.deepEqual(errors,[]);await context.close();console.log('Calendar bounds + automatic personnel suggestions: edge/diagonal/toolbar/wheel guards, native interior pan, fullscreen/readonly, type without Enter, IME, stale/error and keyboard selection passed',viewport);
 }
 await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);server.close();process.exit(1)});
