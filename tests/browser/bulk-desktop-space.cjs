'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright'),{server}=require('./serve.cjs');
const measure=page=>page.locator('#bulkCard').evaluate(card=>{
 const list=document.getElementById('bulkItems'),header=card.querySelector('.bulk-sticky-header'),footer=card.querySelector('.bulk-footer'),r=el=>el.getBoundingClientRect().toJSON(),b=r(list),rects=[...list.children].map(r);
 return {card:r(card),list:b,header:r(header),footer:r(footer),cols:getComputedStyle(list).gridTemplateColumns.split(' ').length,full:rects.filter(x=>x.top>=b.top-1&&x.bottom<=b.bottom+1).length,heights:rects.map(x=>x.height),overflow:card.scrollWidth>card.clientWidth+1||card.scrollHeight>card.clientHeight+1,scroll:list.scrollHeight>list.clientHeight+1,fields:[...list.children].map(el=>{const f=el.querySelector('.bulk-item-fields');return {height:f.clientHeight,scroll:f.scrollHeight};})};
});
(async()=>{await new Promise(r=>server.listen(4269,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.QJL_CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox']});
try{for(const viewport of [{width:1920,height:1080},{width:1904,height:884},{width:1523,height:707,scale:1.25},{width:1366,height:768},{width:1280,height:600},{width:1024,height:768},{width:900,height:650},{width:390,height:844},{width:320,height:683},{width:844,height:390}]){
 const mobile=viewport.width<900,context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:viewport.scale||1,serviceWorkers:'block',hasTouch:mobile,isMobile:mobile}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('qjl:bulk-help:v1:boss','1'));
 await page.route('**/api?*',async route=>{const a=new URL(route.request().url()).searchParams.get('action');let d={ok:true};if(a==='status')d={ok:true,authenticated:true,user:{username:'boss',displayName:'Boss'}};if(a==='subtasks')d={ok:true,issues:Array.from({length:6},(_,i)=>({key:'EPU01-'+(i+1),project:'EPU01',summary:i%2?'Nội dung dài kiểm tra danh sách Subtask '.repeat(20):'Nội dung ngắn',issueType:'Sub-task',isSubtask:true}))};if(a==='day-audit')d={ok:true,occupied:[],regularOccupiedMinutes:0};if(a==='worklog-history')d={ok:true,items:[]};await route.fulfill({contentType:'application/json',body:JSON.stringify(d)});});
 await page.goto('http://127.0.0.1:4269');await page.waitForFunction(()=>state.filterLoaded&&!QuickJiraBusy.count&&!QuickJiraBusy.active);await page.locator('#logAllBtn').click();await page.locator('#bulkAutoAllocate').uncheck();await page.locator('#bulkDate').fill('2026-11-03');await page.locator('#bulkDate').dispatchEvent('change');await page.waitForFunction(()=>bulkCapacityReady());await page.waitForTimeout(300);
 const g=await measure(page);console.log(JSON.stringify({viewport,ratio:g.list.height/g.card.height,full:g.full,height:g.list.height,header:g.header.height,cols:g.cols,fields:g.fields[0],overflow:g.overflow}));
 if(!mobile){
  assert(!g.overflow&&g.card.x>=0&&g.card.right<=viewport.width&&g.card.bottom<=viewport.height,'Bounded shell '+JSON.stringify(g));
  assert(g.card.width>=viewport.width-34&&g.card.height>=viewport.height-26,'Near full viewport');
  assert(g.list.height/g.card.height>.62,'List gets most space');assert(g.list.bottom<=g.footer.y+1&&g.list.y>=g.header.bottom-1,'Header/footer never cover list');
  assert(g.fields.every(f=>f.scroll<=f.height+1),'Closed card controls remain fully visible');
  assert(g.full<=6&&g.full>0);assert(Math.max(...g.heights)-Math.min(...g.heights)<1);
  if(viewport.width>=1100&&viewport.height>=600)assert.equal(g.full,6,'Six whole cards at normal desktop/125% viewport');
  await page.evaluate(()=>applyTheme('dark'));await page.waitForTimeout(250);await page.screenshot({path:`/tmp/qjl1374-space-${viewport.width}-${viewport.height}.png`});
  // Preparation progress, wrapped status and weekend/auto/week controls resize the list.
  await page.evaluate(()=>{document.getElementById('bulkPreviewProgress').hidden=false;document.getElementById('bulkCapacityStatus').textContent='Đang đối chiếu giờ trống. '.repeat(12);});await page.waitForTimeout(150);let x=await measure(page);assert(!x.overflow&&x.list.bottom<=x.footer.y+1);assert(x.list.height<g.list.height,'Progress reserves its own room');
  await page.evaluate(()=>{document.getElementById('bulkPreviewProgress').hidden=true;updateBulkTotal();});
  await page.locator('#bulkPeriodWeek').check();assert(await page.locator('#bulkWeekField').isVisible());
  await page.locator('#bulkAutoAllocate').check();await page.waitForTimeout(100);x=await measure(page);assert(!x.overflow);assert(x.list.height>g.list.height,'Auto mode recovers capacity space');
  await page.locator('#bulkAutoAllocate').uncheck();await page.waitForTimeout(100);await page.locator('#bulkPeriodDay').check();await page.locator('#bulkDate').fill('2026-11-07');await page.locator('#bulkDate').dispatchEvent('change');await page.waitForFunction(()=>bulkCapacityReady());assert(await page.locator('#bulkCapacityCard .bulk-capacity-meter').isHidden());assert.match(await page.locator('#bulkLogWeekday').innerText(),/Thứ Bảy/);
  // Equal cards and bounded 6-tile window also hold for a longer list.
  await page.evaluate(()=>{for(let i=7;i<=30;i++){const item={...bulkDraftList()[0],key:'EPU01-'+i};state.bulkDrafts.set(item.key,item);state.bulkSelectedKeys.add(item.key);}renderBulkItems();});await page.waitForTimeout(100);x=await measure(page);assert(x.scroll&&x.full<=6&&!x.overflow);
  const l=page.locator('#bulkItems');await l.evaluate(el=>el.scrollTop=el.scrollHeight);await page.setViewportSize({width:viewport.width,height:viewport.height+50});await page.waitForTimeout(150);assert(await l.evaluate(el=>el.scrollTop>0),'Resize keeps position near the edited tasks');await page.setViewportSize({width:viewport.width,height:viewport.height});await page.waitForTimeout(100);
 }else{
  const before=await measure(page);await page.evaluate(()=>document.querySelector('link[href="/desktop-workspace.css"]').disabled=true);const after=await measure(page);assert.deepEqual(after,before,'Desktop layout does not affect mobile');
 }
 assert.deepEqual(errors,[]);await context.close();
}}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
