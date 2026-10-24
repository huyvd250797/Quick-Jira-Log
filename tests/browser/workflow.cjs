const fs=require('node:fs');
async function capture(page,name){if(!process.env.QJL_QA_OUTPUT)return;fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:require('node:path').join(process.env.QJL_QA_OUTPUT,require('node:path').basename(name))});}
const {chromium,devices}=require('playwright');
const assert=require('node:assert/strict'),path=require('path');
const {server,state:backend}=require('./serve.cjs');
const ui=require('../../lib/ui-tools');
(async()=>{
 await new Promise(r=>server.listen(4174,'127.0.0.1',r));
 const browser=await chromium.launch({...(process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
 for(const device of [{name:'desktop',viewport:{width:1440,height:1000}},{name:'iphone',...devices['iPhone 13']}]){
  const {name,defaultBrowserType,...config}=device;
  const context=await browser.newContext({...config,timezoneId:'Asia/Ho_Chi_Minh',serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const Native=Date,origin=Native.now(),base=Native.parse('2026-10-16T02:00:00Z');class TestDate extends Native{constructor(...args){super(...(args.length?args:[base+Native.now()-origin]));}static now(){return base+Native.now()-origin;}}window.Date=TestDate;});
  let loggedIn=true,historyError=false,partial=false;let counter=0;let corrected=0,deleted=0;
  const issues=Array.from({length:4},(_,i)=>({key:`EPU01-${2828+i}`,project:'EPU01',summary:['Xử lý dữ liệu lệch khoa','Hỗ trợ cấu hình gửi mail','Kiểm thử và phân tích yêu cầu','Họp dự án và hỗ trợ trường'][i],status:'In Progress'}));
  const log=(date,start,minutes,index)=>({id:`log-${counter++}`,date,start,end:(()=>{const n=ui.minuteOfDay(start)+minutes;return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;})(),minutes,key:issues[index%4].key,summary:issues[index%4].summary,description:'Hoàn thiện chức năng theo yêu cầu.'});
  let entries=[];for(const [date,segments]of Object.entries({'2026-10-12':[['08:00',240],['13:30',240]],'2026-10-13':[['08:00',240],['13:30',210]],'2026-10-14':[['08:00',240],['13:30',240]],'2026-10-15':[['08:00',240],['13:30',120]],'2026-10-16':[['08:00',60],['09:00',120],['11:00',30]],'2026-10-17':[['08:00',120]]}))segments.forEach(([start,mins],i)=>entries.push(log(date,start,mins,i)));
  backend.mode='success';backend.onMutation=(items,date)=>items.forEach((x,i)=>entries.push(log(date,'13:30',x.minutes,i)));
  await page.route('**/api?*',async route=>{
   const u=new URL(route.request().url()),action=u.searchParams.get('action');
   if(['worklog','bulk-worklog'].includes(action))return route.continue();
   let status=200,data={ok:true};
   if(action==='status')data={ok:true,authenticated:loggedIn,user:{displayName:'Boss',username:'boss'}};
   if(action==='subtasks')data={ok:true,issues};
   if(action==='login'){loggedIn=true;data={ok:true,user:{displayName:'Boss',username:'boss'}};}
   if(action==='day-audit')data={ok:true,regularOccupiedMinutes:0,occupiedMinutes:0,freeMinutes:480,occupied:[],available:[]};
   if(action==='worklog-history'){
    if(historyError){status=502;data={ok:false,error:'Không tải được Jira.'};}
    else{const from=u.searchParams.get('date'),to=u.searchParams.get('endDate')||from,key=u.searchParams.get('key');data={ok:true,items:entries.filter(e=>e.date>=from&&e.date<=to&&(!key||e.key===key)),skipped:partial?[{key:'FAILED-1'}]:[]};}
   }
   if(action==='worklog-correction'){
    const b=route.request().postDataJSON(),index=entries.findIndex(e=>e.id===b.worklogId);
    if(route.request().method()==='DELETE'){entries.splice(index,1);deleted++;}
    else{entries[index]={...entries[index],minutes:ui.durationMinutes(b.timeSpent),description:b.description};corrected++;}
   }
   if(action==='worklog-correction'&&status===200)data={...data,overtimeVerified:true,worklogVerified:true};
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:4174');
  await page.waitForFunction(()=>state.dashboardDate==='2026-10-16');
  assert.equal(await page.locator('#dashboardToday').textContent(),'3h 30m');
  assert.equal(await page.locator('#dashboardWeek').textContent(),'33h');
  assert((await page.locator('#dashboardTodayRemaining').textContent()).includes('4h 30m'));
  assert((await page.locator('#dashboardWeekRemaining').textContent()).includes('7h'));
  assert((await page.locator('#dashboardWeekend').textContent()).includes('2h'));
  await capture(page,`${name}-v111-workflow-dashboard.png`);
  await page.locator(name==='iphone'?'#mobileHistoryBtn':'#historyBtn').click();
  await page.waitForFunction(()=>!state.historyLoading);
  if(!(await page.locator('#historyCalendarViewBtn').isVisible()))await page.locator('#calendarOptionsBtn').click();await page.locator('#historyCalendarViewBtn').click();
  await page.locator('.week-worklog-block').first().waitFor();
  assert.equal(await page.locator('.week-day-heading').count(),7);
  assert((await page.locator('#calendarWeekSummary').textContent()).includes('33h'));
  const friday=page.locator('.week-day-column').nth(4),blocks=friday.locator('.week-worklog-block');
  assert.equal(await blocks.count(),3);
  assert(Math.abs((await blocks.nth(0).boundingBox()).height-60)<.5);
  assert(Math.abs((await blocks.nth(1).boundingBox()).height-120)<.5);
  assert(Math.abs((await blocks.nth(2).boundingBox()).height-30)<.5);
  assert.equal((await blocks.nth(1).evaluate(e=>parseFloat(getComputedStyle(e).top)))-(await blocks.nth(0).evaluate(e=>parseFloat(getComputedStyle(e).top))),60);
  await page.evaluate(()=>applyTheme('dark'));await page.waitForTimeout(200);
  await capture(page,`${name}-v111-workflow-week-dark.png`);
  await page.evaluate(()=>applyTheme('light'));await page.waitForTimeout(200);
  await capture(page,`${name}-v111-workflow-week.png`);
  await blocks.nth(2).click({position:{x:12,y:5}});await page.locator('#worklogCorrectionPanel').waitFor({state:'visible'});
  await page.locator('#worklogCorrectionPanel .duration-stepper button[data-step="1"]').click();
  await page.locator('#saveCorrectionBtn').click();await page.waitForFunction(()=>!state.historyLoading);await page.locator('#worklogCorrectionPanel').waitFor({state:'hidden'});
  assert.equal(corrected,1);
  await page.waitForFunction(()=>document.querySelector('#dashboardToday').textContent==='4h');
  assert.equal(await page.locator('#calendarWeekendBtn').count(),0);assert.equal(await page.locator('.week-day-heading').count(),7);
  await page.locator('#calendarMonthBtn').click();await page.locator('.calendar-day').first().waitFor();assert.equal(await page.locator('.calendar-day').count(),31);
  await page.locator('#calendarWeekBtn').click();await page.locator('.week-worklog-block').first().waitFor();
  await page.locator('#calendarDate').fill('2026-11-01');await page.locator('#calendarDate').dispatchEvent('change');await page.waitForFunction(()=>!state.historyLoading);
  assert((await page.locator('#calendarMonthLabel').textContent()).includes('26/10/2026'));
  assert((await page.locator('#calendarMonthLabel').textContent()).includes('01/11/2026'));
  await page.locator('#calendarTodayBtn').click();await page.waitForFunction(()=>!state.historyLoading);
  await page.locator('.week-worklog-block').first().click();await page.locator('#worklogCorrectionPanel').waitFor({state:'visible'});
  page.once('dialog',dialog=>dialog.accept());await page.locator('#deleteCorrectionBtn').click();await page.waitForFunction(()=>!state.historyLoading);assert.equal(deleted,1);
  await page.locator('#closeHistoryBtn').click();await page.locator('#historyOverlay').waitFor({state:'hidden'});
  await page.locator('.issue-row').first().click();await page.locator('#worklogCard').waitFor({state:'visible'});
  await page.locator('.preset-btn[data-time="1h"]').click();await page.locator('#worklogCard .duration-stepper button[data-step="1"]').click();
  await page.locator('#logBtn').click();await page.locator('#confirmLogBtn').click();
  await page.waitForFunction(()=>state.logProgress?.percent>=20&&state.logProgress.active);
  assert.equal(await page.locator('#logProgressEta').count(),0);
  assert(!(await page.locator('#logProgressPanel').innerText()).includes('Ước tính'));
  assert((await page.locator('#logProgressMeter').getAttribute('aria-valuenow'))!=='100');
  await capture(page,`${name}-v111-workflow-progress.png`);
  await page.waitForFunction(()=>state.logProgress?.percent===100&&!state.logProgress.active);
  await page.locator('#closeLogProgressBtn').click();
  await page.locator('#logAllBtn').click();await page.locator('#bulkLogBtn').click();await page.locator('#confirmLogBtn').click();
  await page.waitForFunction(()=>state.logProgress?.mode==='bulk'&&state.logProgress.active);
  await page.waitForFunction(()=>state.logProgress?.percent===100&&!state.logProgress.active);await page.locator('#closeLogProgressBtn').click();
  backend.mode='interrupted';
  await page.locator('.issue-row').first().click();await page.locator('#logBtn').click();await page.locator('#confirmLogBtn').click();
  await page.waitForFunction(()=>state.logProgress&&!state.logProgress.active&&state.logProgress.percent<100);
  assert((await page.locator('#logProgressPhase').textContent()).includes('Chưa xác định'));
  await page.locator('#closeLogProgressBtn').click();await page.locator('#closeWorklogBtn').click();
  historyError=true;await page.locator('#refreshDashboardBtn').click();await page.waitForFunction(()=>document.querySelector('#dashboardState').textContent.includes('Chưa tải được'));
  assert.equal(await page.locator('#dashboardToday').textContent(),'—');
  historyError=false;partial=true;await page.locator('#refreshDashboardBtn').click();
  await page.waitForFunction(()=>document.querySelector('#dashboardState').textContent.includes('Dữ liệu chưa đầy đủ'));
  assert((await page.locator('#dashboardTodayRemaining').textContent()).includes('Tạm tính'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  console.log(name,'V1.11.2 dashboard, week/month, proportional blocks, edit/delete, streaming progress and interrupted response passed');
  await context.close();
 }
 await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);server.close();process.exit(1)});
