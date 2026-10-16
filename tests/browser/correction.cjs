const fs=require('node:fs');
async function capture(page,name){if(!process.env.QJL_QA_OUTPUT)return;fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:require('node:path').join(process.env.QJL_QA_OUTPUT,require('node:path').basename(name))});}
const {chromium,devices}=require('playwright');
const assert=require('node:assert/strict'),path=require('path');
const {server}=require('./serve.cjs');
(async()=>{
 await new Promise(r=>server.listen(4179,'127.0.0.1',r));
 const browser=await chromium.launch({...(process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
 for(const viewport of [{width:1440,height:900},{width:1024,height:600},{width:900,height:720},{width:390,height:844},{width:315,height:683}]){
  const desktop=viewport.width>=900;
  const context=await browser.newContext({...!desktop?devices['iPhone 13']:{},viewport,timezoneId:'Asia/Ho_Chi_Minh',serviceWorkers:'block'});
  const page=await context.newPage(),errors=[],mutations=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...args){super(...args.length?args:['2026-10-16T02:00:00Z']);}static now(){return D.parse('2026-10-16T02:00:00Z');}};});
  let fail=false;
  let item={id:'log-1',key:'EPU01-2810',date:'2026-10-12',start:'08:00',end:'09:00',minutes:60,summary:'Hướng dẫn & hỗ trợ xuất mẫu khảo sát giảng viên',description:'Nội dung worklog chi tiết để kiểm tra popup.'};
  await page.route('**/api?*',async route=>{
   const u=new URL(route.request().url()),action=u.searchParams.get('action');let data={ok:true},status=200;
   if(action==='status')data={ok:true,authenticated:true,user:{displayName:'Boss',username:'boss'}};
   if(action==='subtasks')data={ok:true,issues:[]};
   if(action==='worklog-history')data={ok:true,items:item&&item.date>=u.searchParams.get('date')&&item.date<=(u.searchParams.get('endDate')||u.searchParams.get('date'))?[item]:[]};
   if(action==='worklog-correction'){
    const body=route.request().postDataJSON(),method=route.request().method();mutations.push({method,body});
    if(fail){status=502;data={ok:false,error:'Không lưu được do Jira tạm lỗi.'};}
    else if(method==='DELETE')item=null;
    else item={...item,date:body.date,start:body.start,minutes:90,end:'10:00',description:body.description};
   }
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:4179');await page.locator(desktop?'#historyBtn':'#mobileHistoryBtn').click();await page.waitForFunction(()=>!state.historyLoading);
  await page.locator('#historyCalendarViewBtn').click();await page.locator('.week-worklog-block').waitFor();await page.waitForTimeout(220);
  const block=page.locator('.week-worklog-block');
  const scroll=await page.locator('#historyResults').evaluate(e=>e.scrollTop);
  await block.click();await page.locator('#worklogCorrectionPanel').waitFor({state:'visible'});
  assert.equal(await page.locator('#worklogCorrectionDialog').evaluate(e=>e.open),desktop);
  assert.equal(await page.locator('#worklogCorrectionPanel').evaluate(e=>e.parentElement.id),desktop?'worklogCorrectionDialog':'historyResults');
  assert.equal(await page.locator('#correctionKey').inputValue(),'EPU01-2810');
  assert.equal(await page.locator('#correctionDescription').inputValue(),item.description);
  if(desktop){
   assert.equal(await page.locator('#historyResults').evaluate(e=>e.scrollTop),scroll);
   assert.equal(await page.locator('#correctionIssueSummary').innerText(),item.summary);
   assert(await page.locator('#correctionIssueSummary').isVisible());
   for(let i=0;i<14;i++){await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.getElementById('worklogCorrectionDialog').contains(document.activeElement)),`focus trap ${viewport.width}`);}
   await page.keyboard.press('Escape');assert.equal(await page.locator('#worklogCorrectionDialog').evaluate(e=>e.open),false);
   assert(await page.locator('#historyOverlay').isVisible());assert.equal(await page.locator('#historyResults').evaluate(e=>e.scrollTop),scroll);
   assert(await block.evaluate(e=>document.activeElement===e));
   await block.click();await page.mouse.click(5,5);await page.waitForFunction(()=>!document.getElementById('worklogCorrectionDialog').open);
   assert(await page.locator('#historyOverlay').isVisible());
   await block.click();await page.locator('#correctionDescription').fill('');await page.locator('#saveCorrectionBtn').click();
   await page.locator('#correctionFeedback').waitFor({state:'visible',timeout:5000});assert.equal(mutations.length,0);
   await page.locator('#correctionDescription').fill('Nội dung đã chỉnh từ popup.');
   await page.locator('#worklogCorrectionDialog [data-step="1"]').click();assert.equal(await page.locator('#correctionTimeSpent').inputValue(),'1h 30m');
   await page.locator('#correctionStart').fill('08:30');await page.locator('#correctionDate').fill('2026-10-13');
   fail=true;await page.locator('#saveCorrectionBtn').click();await page.locator('#correctionFeedback').waitFor({state:'visible'});assert.equal(mutations.length,1);assert(await page.locator('#worklogCorrectionDialog').evaluate(e=>e.open));
   fail=false;const savedScroll=await page.locator('#historyResults').evaluate(e=>{e.scrollTop=100;return e.scrollTop;});await page.locator('#saveCorrectionBtn').click();await page.waitForFunction(()=>!state.historyLoading&&!document.getElementById('worklogCorrectionDialog').open);
   await page.waitForTimeout(120);assert(Math.abs(await page.locator('#historyResults').evaluate(e=>e.scrollTop)-savedScroll)<2);
   assert.equal(mutations.at(-1).body.date,'2026-10-13');assert.equal(mutations.at(-1).body.start,'08:30');assert.equal(mutations.at(-1).body.timeSpent,'1h 30m');assert.equal(mutations.at(-1).body.description,'Nội dung đã chỉnh từ popup.');
   await page.locator('.week-worklog-block').click();
   await page.locator('#correctionDescription').fill('Bản nháp giữ khi đổi kích thước.');
   await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>!document.getElementById('worklogCorrectionDialog').open);
   assert.equal(await page.locator('#worklogCorrectionPanel').evaluate(e=>e.parentElement.id),'historyResults');
   assert.equal(await page.locator('#correctionDescription').inputValue(),'Bản nháp giữ khi đổi kích thước.');
   await page.setViewportSize(viewport);await page.waitForFunction(()=>document.getElementById('worklogCorrectionDialog').open);
   assert.equal(await page.locator('#correctionDescription').inputValue(),'Bản nháp giữ khi đổi kích thước.');
   await page.locator('#cancelCorrectionBtn').click();
   await page.locator('#calendarDate').fill('2026-10-13');await page.locator('#calendarDate').dispatchEvent('change');await page.waitForFunction(()=>!state.historyLoading);
   await page.locator('#calendarMonthBtn').click();await page.locator('.calendar-event').waitFor();await page.locator('.calendar-event').click();assert(await page.locator('#worklogCorrectionDialog').evaluate(e=>e.open));await page.locator('#cancelCorrectionBtn').click();
   await page.locator('#historyListViewBtn').click();await page.waitForFunction(()=>!state.historyLoading);
   await page.locator('.history-edit-btn').click();assert(await page.locator('#worklogCorrectionDialog').evaluate(e=>e.open));
   page.once('dialog',d=>d.dismiss());await page.locator('#deleteCorrectionBtn').click();assert.equal(mutations.length,2);assert(await page.locator('#worklogCorrectionDialog').evaluate(e=>e.open));
   fail=true;page.once('dialog',d=>d.accept());await page.locator('#deleteCorrectionBtn').click();await page.locator('#correctionFeedback').waitFor({state:'visible'});assert(await page.locator('#worklogCorrectionDialog').evaluate(e=>e.open));
   fail=false;page.once('dialog',d=>d.accept());await page.locator('#deleteCorrectionBtn').click();await page.waitForFunction(()=>!state.historyLoading&&!document.getElementById('worklogCorrectionDialog').open);assert.equal(item,null);
   assert.equal(await page.locator('#worklogCorrectionPanel').evaluate(e=>e.parentElement.id),'historyResults');
  }else{
   assert.equal(await page.locator('#correctionIssueSummary').isVisible(),false);assert.equal(await page.locator('#correctionTitle').innerText(),'Sửa EPU01-2810');
   await page.locator('#correctionTimeSpent').fill('1h 30m');await page.locator('#saveCorrectionBtn').click();await page.waitForFunction(()=>!state.historyLoading);await page.locator('#worklogCorrectionPanel').waitFor({state:'hidden'});assert.equal(mutations.at(-1).body.timeSpent,'1h 30m');
  }
  // Capture popup on desktop and inline form on mobile with a fresh fixture.
  item={id:'log-2',key:'EPU01-2810',date:'2026-10-12',start:'08:00',end:'09:00',minutes:60,summary:'Hướng dẫn & hỗ trợ xuất mẫu khảo sát giảng viên',description:'Nội dung chi tiết worklog, có thể sửa trực tiếp hoặc xóa sau khi xác nhận.'};
  await page.locator('#historyCalendarViewBtn').click();await page.locator('#calendarDate').fill('2026-10-12');await page.locator('#calendarDate').dispatchEvent('change');await page.locator('#calendarWeekBtn').click();await page.waitForFunction(()=>!state.historyLoading);await page.locator('#calendarRefreshBtn').click();await page.waitForFunction(()=>!state.historyLoading);
  await page.locator('.week-worklog-block').click();
  for(const theme of ['light','dark']){await page.evaluate(t=>applyTheme(t),theme);await page.waitForTimeout(220);await capture(page,`${viewport.width}-v111-correction-${theme}.png`);}
  await page.locator('#cancelCorrectionBtn').click();await page.locator('#closeHistoryBtn').click();await page.locator('#historyOverlay').waitFor({state:'hidden'});
  assert.equal(await page.locator('#worklogCorrectionDialog').evaluate(e=>e.open),false);
  assert.deepEqual(errors,[]);console.log('Popup/inline correction passed',viewport);await context.close();
 }
 await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);server.close();process.exit(1)});
