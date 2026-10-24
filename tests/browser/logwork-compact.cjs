'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{server,state:backend}=require('./serve.cjs');
(async()=>{
 await new Promise(r=>server.listen(4251,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.QJL_CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
 for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:683},{width:844,height:390}]){
  const mobile=viewport.width<900,context=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile,serviceWorkers:'block',timezoneId:'Asia/Ho_Chi_Minh'}),page=await context.newPage(),errors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:['2026-10-24T03:00:00Z']));}static now(){return D.parse('2026-10-24T03:00:00Z');}};});
  const issues=Array.from({length:8},(_,i)=>({key:'EPU01-'+(2800+i),project:'EPU01',summary:'Hỗ trợ kiểm tra dữ liệu và đối chiếu thông tin theo yêu cầu của trường '+(i+1),status:'In Progress'}));
  await page.route('**/api?*',async route=>{
   const req=route.request(),u=new URL(req.url()),action=u.searchParams.get('action');
   if(['worklog','bulk-worklog'].includes(action)){
    const b=req.postDataJSON();writes.push({action,body:b});const items=(action==='bulk-worklog'?b.items:[b]).map(x=>({...x,summary:x.description,minutes:30,overtimeVerified:true,worklogVerified:true,segments:[{start:b.startTime||'09:00',end:'10:00',minutes:30}]}));
    return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,date:b.date,items,issue:{key:b.key,summary:b.description},segments:items[0].segments,totalMinutes:90,transitions:[],transition:{ok:true,status:'Done'}})});
   }
   let data={ok:true};
   if(action==='status')data={ok:true,authenticated:true,user:{username:'boss',displayName:'Boss'}};
   if(action==='subtasks')data={ok:true,issues};
   if(action==='day-audit')data={ok:true,regularOccupiedMinutes:0,occupiedMinutes:0,freeMinutes:480,occupied:[],available:[]};
   if(action==='worklog-history')data={ok:true,items:[]};
   await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  backend.mode='success';
  await page.goto('http://127.0.0.1:4251');await page.waitForFunction(()=>state.filterLoaded);
  await page.locator('#logAllBtn').click();await page.waitForFunction(()=>bulkCapacityReady());
  assert.equal(await page.locator('.bulk-item').count(),8);
  // Outer gestures cannot move the editor; native scrolling remains in its list.
  const geometry=()=>page.locator('#bulkCard').evaluate(el=>({y:el.getBoundingClientRect().y,transform:getComputedStyle(el).transform,scroll:el.scrollTop,page:scrollY}));
  await page.waitForFunction(()=>!$('bulkCard').classList.contains('qjl-opening'));
  const beforeOuter=await geometry();
  const cap=await page.locator('#bulkCapacityCard').boundingBox();
  await page.mouse.move(cap.x+cap.width/2,cap.y+10);await page.mouse.down();await page.mouse.move(cap.x+cap.width/2,cap.y+130,{steps:8});await page.mouse.up();
  assert.deepEqual(await geometry(),beforeOuter,'header drag must not translate the sheet');
  await page.mouse.move(cap.x+5,cap.y+5);await page.mouse.wheel(0,300);await page.waitForTimeout(70);assert.deepEqual(await geometry(),beforeOuter);
  if(mobile){
   const cdp=await context.newCDPSession(page);
   const swipe=async(x,y,delta)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+delta*i/6}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(120);};
   await swipe(cap.x+cap.width/2,cap.y+8,90);assert.deepEqual(await geometry(),beforeOuter,'touch header must stay fixed');
   const lr=await page.locator('#bulkItems').boundingBox();await swipe(lr.x+lr.width/2,lr.y+lr.height-15,-Math.min(120,lr.height-30));assert(await page.locator('#bulkItems').evaluate(el=>el.scrollTop>0),'touch list still scrolls');
   assert.deepEqual(await geometry(),beforeOuter);
   await page.locator('#bulkItems').evaluate(el=>{el.scrollTop=0;});await cdp.detach();
  }

  await page.locator('#bulkDate').fill('2026-10-24');await page.locator('#bulkDate').dispatchEvent('change');await page.waitForFunction(()=>bulkCapacityReady());
  // Set fewer regular hours so the old "missing 6h" weekend case is exercised.
  await page.evaluate(()=>{for(const x of bulkDraftList().slice(2)){state.bulkSelectedKeys.delete(x.key);state.bulkDrafts.delete(x.key);}renderBulkItems();});
  assert.equal(await page.locator('#bulkCapacityStatus').innerText(),'');
  assert(await page.locator('#bulkLogWeekday').isVisible());
  assert.match(await page.locator('#bulkLogWeekday').innerText(),/Thứ Bảy/);
  assert(!(await page.locator('#bulkCapacityProjected').innerText()).includes('/ 8h'));
  assert(!(await page.locator('#bulkCapacityCard .bulk-capacity-meter').isVisible()));
  await page.locator('#bulkDate').fill('2026-10-23');await page.locator('#bulkDate').dispatchEvent('change');await page.waitForFunction(()=>bulkCapacityReady());
  await page.waitForTimeout(250);
  const meter=page.locator('#bulkCapacityCard .bulk-capacity-meter');assert(await meter.isVisible(),'weekday meter visible');
  const color=()=>page.locator('#bulkCapacityBar').evaluate(el=>getComputedStyle(el).backgroundColor);
  const expected=async token=>page.evaluate(token=>{const el=document.createElement('span');el.style.color='var('+token+')';$('bulkCapacityCard').append(el);const color=getComputedStyle(el).color;el.remove();return color;},token);
  assert.equal(await color(),await expected('--primary'));
  await page.locator('.bulk-item').first().locator('.bulk-time').fill('7h');await page.locator('.bulk-item').first().locator('.bulk-time').dispatchEvent('input');await page.waitForTimeout(250);
  assert.equal(await color(),await expected('--ok'),'8h is green');
  await page.locator('.bulk-item').first().locator('.bulk-time').fill('8h');await page.locator('.bulk-item').first().locator('.bulk-time').dispatchEvent('input');await page.waitForTimeout(250);
  assert.equal(await color(),await expected('--danger'),'9h is red');assert(await page.locator('#bulkLogBtn').isDisabled());
  await page.locator('.bulk-item').first().locator('.bulk-time').fill('1h');await page.locator('.bulk-item').first().locator('.bulk-time').dispatchEvent('input');await page.waitForTimeout(250);

  await page.locator('#bulkDate').fill('2026-10-23');await page.locator('#bulkDate').dispatchEvent('change');await page.waitForFunction(()=>bulkCapacityReady());
  assert.match(await page.locator('#bulkCapacityStatus').innerText(),/Còn thiếu 6h/);
  await page.locator('#bulkDate').fill('2026-10-25');await page.locator('#bulkDate').dispatchEvent('change');await page.waitForFunction(()=>bulkCapacityReady());
  assert.equal(await page.locator('#bulkCapacityStatus').innerText(),'');
  const row=page.locator('.bulk-item').first();
  assert.equal(await row.locator('.bulk-ot-toggle small').count(),0);
  const pos=await row.evaluate(el=>{const a=el.querySelector('.duration-stepper').getBoundingClientRect(),b=el.querySelector('.bulk-ot-toggle').getBoundingClientRect();return {ay:a.y,by:b.y,ar:a.right,bl:b.left};});
  assert(Math.abs(pos.ay-pos.by)<2&&pos.ar<=pos.bl-5,JSON.stringify(pos));
  await row.locator('.bulk-preset-btn[data-time="30m"]').click();
  assert.equal(await row.locator('.bulk-time').inputValue(),'30m');
  await row.locator('.bulk-ot-toggle').click();assert(await row.locator('.bulk-overtime').isChecked());assert(await row.locator('.bulk-ot-start-field').isVisible());
  await row.locator('.bulk-ot-start').fill('09:00');
  await row.locator('.bulk-description-details summary').click();await row.locator('.bulk-description').fill('Mô tả đã chỉnh');await row.locator('.bulk-description-details summary').click();
  for(const theme of ['light','dark']){
   await page.evaluate(t=>applyTheme(t),theme);await page.waitForTimeout(200);
   const layout=await page.evaluate(()=>{const card=$('bulkCard'),list=$('bulkItems'),footer=card.querySelector('.bulk-footer'),header=card.querySelector('.bulk-sticky-header');return {list:list.getBoundingClientRect().toJSON(),card:card.getBoundingClientRect().toJSON(),footer:footer.getBoundingClientRect().toJSON(),header:header.getBoundingClientRect().toJSON(),wide:card.scrollWidth>card.clientWidth+1,outerScroll:card.scrollHeight>card.clientHeight+1};});
   assert(!layout.wide&&!layout.outerScroll,JSON.stringify(layout));assert(layout.list.y>=layout.header.bottom-1);assert(layout.list.bottom<=layout.footer.y+1);
   assert(layout.list.height>(viewport.height>500?viewport.height*.51:120),JSON.stringify(layout));
   if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`bulk-${viewport.width}-${theme}.png`)});}
  }
  // The list scrolls independently and the first title is not hidden behind a sticky header.
  const headerY=await page.locator('.bulk-sticky-header').evaluate(el=>el.getBoundingClientRect().y);
  await page.locator('#bulkItems').evaluate(el=>{el.scrollTop=el.scrollHeight;});
  assert.equal(await page.locator('.bulk-sticky-header').evaluate(el=>el.getBoundingClientRect().y),headerY);
  await page.locator('#bulkLogBtn').click();await page.locator('#confirmLogBtn').click();await page.waitForFunction(()=>state.logProgress&&!state.logProgress.active&&!state.bulkSubmitInFlight);assert.equal(writes.length,1);await page.locator('#closeLogProgressBtn').click();await page.waitForFunction(()=>!$('logProgressDialog').open);
  assert.equal(writes[0].body.items[0].overtime,true);assert.equal(writes[0].body.items[0].description,'Mô tả đã chỉnh');assert.equal(writes[0].body.items[0].timeSpent,'30m');assert.equal(writes[0].body.items[0].overtimeStart,'09:00');
  // Calendar always exposes weekends and exact cell times, including the bottom of each cell.
  await page.locator(mobile?'#mobileHistoryBtn':'#historyBtn').click();await page.waitForFunction(()=>state.historyLoaded&&!state.historyLoading);
  const blocked=page.locator('[data-calendar-date="2026-10-24"] [data-calendar-slot="12:30"]');
  await blocked.scrollIntoViewIfNeeded();await blocked.click();
  assert(await blocked.evaluate(el=>el.classList.contains('is-invalid')));assert(!(await page.locator('#calendarLogDialog').isVisible()));
  assert.match(await page.locator('#toast').innerText(),/Không thể log/);
  assert.equal(await page.locator('.week-day-heading.is-weekend').count(),2);
  assert.equal(await page.locator('#calendarWeekendBtn').count(),0);assert.equal(await page.locator('.week-day-heading').count(),7);
  for(const start of ['08:00','08:30','09:00']){
   const cell=page.locator('[data-calendar-date="2026-10-24"] [data-calendar-slot="'+start+'"]');
   await cell.scrollIntoViewIfNeeded();const rect=await cell.boundingBox();
   if(mobile)await page.touchscreen.tap(rect.x+rect.width/2,rect.y+rect.height-3);
   else {await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height-3);await page.mouse.down();await page.waitForTimeout(80);assert.notEqual(await cell.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)',JSON.stringify(await cell.evaluate(el=>({rect:el.getBoundingClientRect().toJSON(),active:el.matches(':active'),disabled:el.disabled,hit:document.elementFromPoint(el.getBoundingClientRect().x+el.getBoundingClientRect().width/2,el.getBoundingClientRect().bottom-3)?.outerHTML.slice(0,600),vars:[getComputedStyle(el).getPropertyValue('--primary-soft'),getComputedStyle(el).zIndex]}))));await page.mouse.up();}
   await page.locator('#calendarLogDialog').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>state.calendarLogContext.start),start);assert(await cell.evaluate(el=>el.classList.contains('is-selected')));
   await page.locator('[data-calendar-task]').first().click();assert.equal(await page.locator('#calendarStart').inputValue(),start);assert.equal(await page.locator('#date').inputValue(),'2026-10-24');await page.waitForFunction(()=>!state.singleCapacity.loading);assert.equal(await page.locator('#singleCapacityStatus').innerText(),'');
   if(start==='08:30'){
    await page.locator('#timeSpent').fill('30m');await page.locator('#timeSpent').dispatchEvent('input');await page.locator('#logBtn').click();await page.locator('#confirmLogBtn').click();await page.waitForFunction(()=>state.logProgress&&!state.logProgress.active&&!state.submitInFlight);assert.equal(writes.at(-1).body.startTime,'08:30');await page.locator('#closeLogProgressBtn').click();await page.waitForFunction(()=>!$('logProgressDialog').open);
   }
   await page.evaluate(()=>closeCalendarLog({force:true}));assert.equal(await page.locator('.calendar-time-slot.is-selected').count(),0);
  }
  // Read-only calendars do not become editable via new empty cells.
  await page.evaluate(()=>{calendarViewedUser={key:'OTHER',username:'other',displayName:'Other User'};renderWorklogHistory();});
  assert(await page.locator('[data-calendar-slot]').first().isDisabled());
  assert.deepEqual(errors,[]);console.log('Compact bulk, weekend/no-target, exact30-minute cells/POST and read-only passed',viewport);await context.close();
 }
 await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);server.close();process.exit(1);});
