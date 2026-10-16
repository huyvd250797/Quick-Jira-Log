const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {server}=require('./serve.cjs');
async function capture(page,name){if(!process.env.QJL_QA_OUTPUT)return;fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,name)});}
(async()=>{
 await new Promise(r=>server.listen(4190,'127.0.0.1',r));
 const browser=await chromium.launch({...(process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const items=[
 {id:'1',key:'ALPHA-1',date:'2026-10-12',start:'08:00',end:'12:00',minutes:240,summary:'Hỗ trợ triển khai hệ thống quản lý đào tạo',overtime:false},
 {id:'2',key:'ALPHA-2',date:'2026-10-12',start:'13:30',end:'17:30',minutes:240,summary:'Review và kiểm tra dữ liệu theo yêu cầu',overtime:false},
 {id:'3',key:'BETA-1',date:'2026-10-13',start:'08:00',end:'09:00',minutes:60,summary:'Xử lý yêu cầu tích hợp'},
 {id:'4',key:'GAMMA-1',date:'2026-10-13',start:'09:00',end:'11:00',minutes:120,summary:'Phân tích nghiệp vụ và kiểm thử'},
 {id:'5',key:'ALPHA-3',date:'2026-10-14',start:'17:30',end:'18:00',minutes:30,summary:'Hỗ trợ ngoài giờ',overtime:true},
 {id:'6',key:'BETA-2',date:'2026-10-14',start:'18:00',end:'18:15',minutes:15,summary:'Xác nhận sau triển khai',overtime:true},
 {id:'7',key:'DELTA-1',date:'2026-10-15',start:'08:00',end:'10:00',minutes:120,summary:'OT đã được đánh dấu trên Jira',overtime:true},
 {id:'8',key:'ZERO-1',date:'2026-10-16',start:'08:00',end:'08:00',minutes:0,summary:'Không có thời lượng'}];
 for(const viewport of [{width:315,height:683},{width:390,height:844},{width:430,height:1200},{width:568,height:320},{width:667,height:375},{width:844,height:390},{width:1440,height:1000}]){
  const context=await browser.newContext({viewport,serviceWorkers:'block',timezoneId:'Asia/Ho_Chi_Minh'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...a.length?a:['2026-10-16T02:00:00Z']);}static now(){return D.parse('2026-10-16T02:00:00Z');}};Object.defineProperty(Element.prototype,'requestFullscreen',{configurable:true,value:undefined});Object.defineProperty(screen.orientation,'lock',{configurable:true,value:undefined});});
  let calls=0;
  await page.route('**/api?*',async route=>{calls++;const u=new URL(route.request().url()),a=u.searchParams.get('action');let data={ok:true};if(a==='status')data={ok:true,authenticated:true,user:{displayName:'Boss',username:'boss'}};if(a==='subtasks')data={ok:true,issues:[]};if(a==='worklog-history')data={ok:true,items:items.filter(x=>x.date>=u.searchParams.get('date')&&x.date<=(u.searchParams.get('endDate')||u.searchParams.get('date')))};await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});});
  const open=async()=>{await page.locator(viewport.width>=900?'#historyBtn':'#mobileHistoryBtn').click();await page.waitForFunction(()=>state.historyLoaded&&!state.historyLoading);await page.waitForTimeout(280);};
  await page.goto('http://127.0.0.1:4190');await page.waitForFunction(()=>!document.body.classList.contains('booting'));await open();
  const block=k=>page.locator('.week-worklog-block').filter({has:page.locator('strong',{hasText:k})});
  assert.equal(await page.locator('.week-worklog-block').count(),7,'zero worklogs omitted');
  assert.equal(await page.locator('#calendarProjectColorsBtn').innerText(),'');
  assert.equal(await page.locator('#calendarProjectColorsBtn').getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('.week-day-heading.is-complete').count(),1);
  assert.equal(await page.locator('.week-day-heading.is-complete i b').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(36, 155, 94)');
  assert(!(await page.locator('#calendarControls').innerText()).match(/\b0m\b/));assert(!(await page.locator('.week-grid-heading').innerText()).match(/\b0m\b/));
  assert((await page.locator('.week-day-heading').first().innerText()).includes('8h / 8h'));
  const before=calls;
  await page.locator('#calendarProjectColorsBtn').click();assert.equal(calls,before,'color switch does not request Jira');
  const backgrounds=await page.locator('.has-project-color').evaluateAll(es=>es.map(e=>getComputedStyle(e).backgroundColor));
  assert.equal(backgrounds[0],backgrounds[1],'same project same color');assert.equal(new Set(backgrounds).size,3,'different projects distinct colors');
  const palette=await page.evaluate(()=>JSON.stringify(state.projectPalette));
  for(const theme of ['light','dark']){
   await page.evaluate(t=>applyTheme(t),theme);await page.waitForTimeout(200);
   assert.equal(await page.locator('.week-worklog-block.is-ot').count(),3);
   for(const el of await page.locator('.week-worklog-block.is-ot').all()){
    assert.equal(await el.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 243, 176)');assert.equal(await el.evaluate(e=>getComputedStyle(e).position),'absolute','OT remains positioned by time');
    assert(await el.locator('.ot-ribbon').evaluate(e=>getComputedStyle(e).display!=='none'),'short/tiny OT labels remain visible');assert.equal(await el.getAttribute('class').then(c=>c.includes('has-project-color')),false);
   }
   await page.locator('#calendarFullscreenBtn').click();await page.waitForTimeout(180);
   const geometry=await page.evaluate(()=>{const results=document.getElementById('historyResults'),body=document.querySelector('.week-grid-body'),inner=document.querySelector('.weekly-inner'),header=document.querySelector('.week-grid-heading'),overlay=document.getElementById('historyOverlay');return {height:results.clientHeight,body:body.getBoundingClientRect().height,header:header.offsetHeight,scale:parseFloat(inner.style.getPropertyValue('--week-minute-px')),range:Number(body.dataset.minuteRange),width:overlay.getBoundingClientRect().width,viewport:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth};});
   assert(Math.abs(geometry.width-geometry.viewport)<2);assert(!geometry.overflow);assert(geometry.scale>=1);
   if(geometry.height-geometry.header>geometry.range)assert(Math.abs(geometry.body+geometry.header+2-geometry.height)<2,JSON.stringify(geometry));
   const one=await block('BETA-1').evaluate(e=>e.getBoundingClientRect().height),two=await block('GAMMA-1').evaluate(e=>e.getBoundingClientRect().height);assert(Math.abs(two/one-2)<.01,'minute ratio preserved');
   assert(await page.locator('#calendarControls').evaluate(e=>{const r=e.getBoundingClientRect();return [...e.querySelectorAll('button,input')].filter(x=>x.getClientRects().length).every(x=>{const b=x.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1;});}),'fullscreen controls fit');
   await capture(page,`${viewport.width}-v1113-fullscreen-${theme}.png`);
   await page.locator('#calendarFullscreenBtn').click();
  }
  await page.locator('#calendarProjectColorsBtn').click();assert.equal(await page.locator('.has-project-color').count(),0);assert.equal(await page.locator('.is-ot').count(),3);
  await page.locator('#calendarProjectColorsBtn').click();assert.equal(await page.evaluate(()=>JSON.stringify(state.projectPalette)),palette);
  await page.reload();await page.waitForFunction(()=>!document.body.classList.contains('booting'));await open();assert.equal(await page.locator('#calendarProjectColorsBtn').getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>JSON.stringify(state.projectPalette)),palette);
  await page.locator('#calendarMonthBtn').click();await page.waitForFunction(()=>!state.historyLoading);await page.locator('.calendar-day[data-date="2026-10-14"]').click();assert.equal(await page.locator('.calendar-event.is-ot').count(),2);assert.equal(await page.locator('.calendar-event.is-ot').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 243, 176)');
  assert.deepEqual(errors,[]);console.log('V1.11.3 fullscreen fill, fixed OT/ribbon, green progress, compact durations and persistent project toggle passed',viewport);await context.close();
 }
 await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);server.close();process.exit(1)});
