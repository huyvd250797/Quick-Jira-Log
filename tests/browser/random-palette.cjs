const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');const {server}=require('./serve.cjs');
(async()=>{await new Promise(r=>server.listen(4196,'127.0.0.1',r));const browser=await chromium.launch({...(process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1440,height:1000}]){
 const page=await browser.newPage({viewport,serviceWorkers:'block',timezoneId:'Asia/Ho_Chi_Minh'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const D=Date,origin=D.now(),base=D.parse('2026-10-16T02:00:00Z');window.Date=class extends D{constructor(...a){super(...a.length?a:[base+D.now()-origin]);}static now(){return base+D.now()-origin;}};localStorage.setItem('quick-jira-log:project-colors:v1','true');});
 const items=[];for(let i=0;i<6;i++){const project=['EPU','INTRA','HIU'][i%3];items.push({id:String(i),key:`${project}-${i+1}`,date:`2026-10-${12+i%5}`,start:i<3?'08:00':'13:30',end:i<3?'12:00':'17:30',minutes:240,summary:'Hỗ trợ triển khai và kiểm tra nghiệp vụ dự án',description:'Nội dung chi tiết',overtime:false});}items.push({id:'OT',key:'EPU-99',date:'2026-10-14',start:'17:30',end:'18:30',minutes:60,summary:'Hỗ trợ ngoài giờ',overtime:true});
 await page.route('**/api?*',r=>{const action=new URL(r.request().url()).searchParams.get('action');return r.fulfill({contentType:'application/json',body:JSON.stringify(action==='status'?{ok:true,authenticated:true,user:{displayName:'Boss',username:'boss'}}:action==='worklog-history'?{ok:true,items}:{ok:true,issues:[]})});});
 const open=async()=>{await page.locator(viewport.width>=900?'#historyBtn':'#mobileHistoryBtn').click();await page.waitForFunction(()=>state.historyLoaded&&!state.historyLoading);await page.waitForTimeout(230);};
 const palette=()=>page.evaluate(()=>JSON.parse(JSON.stringify(state.projectPalette)));
 const changed=(a,b)=>{for(const key of Object.keys(a))assert.notEqual(a[key].h,b[key].h,'project receives another hue each new viewing');};
 await page.goto('http://127.0.0.1:4196');await page.waitForFunction(()=>!document.body.classList.contains('booting'));await open();let first=await palette();
 assert.equal(Object.keys(first).length,3);
 const selected=page.locator('.week-day-heading.is-selected');assert.equal(await selected.evaluate(e=>getComputedStyle(e).boxShadow),'none','selected day has no underline');
 assert(await selected.evaluate(e=>getComputedStyle(e).backgroundColor!==getComputedStyle(e.parentElement.querySelector('.week-day-heading:not(.is-selected)')).backgroundColor),'selection retains header background');
 assert(await selected.locator('i > b').count(),'daily progress remains');
 await page.locator('.week-day-heading').first().click();await page.waitForFunction(()=>document.querySelector('.week-day-heading.is-selected').dataset.weekDay==='2026-10-12');
 assert.equal(await selected.evaluate(e=>getComputedStyle(e).boxShadow),'none');
 assert(await selected.evaluate(e=>getComputedStyle(e).backgroundColor!==getComputedStyle(document.querySelector('.week-day-heading.is-today')).backgroundColor),'new selected day retains background, today is identified by text');
 for(const theme of ['light','dark']){await page.evaluate(t=>applyTheme(t),theme);await page.waitForTimeout(200);assert.deepEqual(await palette(),first,'theme never rerolls project colors');
  const colors=await page.locator('.has-project-color').evaluateAll(es=>es.map(e=>({key:e.querySelector('strong').textContent.split('-')[0],bg:getComputedStyle(e).backgroundColor,s:e.style.getPropertyValue('--project-saturation')})));
  for(const project of ['EPU','INTRA','HIU'])assert.equal(new Set(colors.filter(c=>c.key===project).map(c=>c.bg)).size,1);
  assert.equal(new Set(colors.map(c=>c.bg)).size,3);assert(colors.every(c=>parseInt(c.s)<=38));
  assert.equal(await page.locator('.is-ot').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 243, 176)');
  if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`${viewport.width}-v1117-calendar-${theme}.png`)});}
 }
 await page.locator('#calendarRefreshBtn').click();await page.waitForFunction(()=>!state.historyLoading);let second=await palette();changed(first,second);
 await page.locator('#closeHistoryBtn').click();await page.locator('#historyOverlay').waitFor({state:'hidden'});await open();let third=await palette();changed(second,third);
 await page.reload();await page.waitForFunction(()=>!document.body.classList.contains('booting'));await open();let fourth=await palette();changed(third,fourth);
 await page.evaluate(()=>startLogProgress('single'));await page.evaluate(()=>updateLogProgress({percent:37,phase:'Đang ghi worklog'}));await page.waitForTimeout(650);
 assert.equal(await page.locator('#logProgressEta').count(),0);assert(!/ước tính|ETA|còn ~|dự kiến/i.test(await page.locator('#logProgressPanel').innerText()));assert.equal(await page.locator('#logProgressPercent').innerText(),'37%');assert((await page.locator('#logProgressElapsed').innerText()).startsWith('Đã chạy'));
 assert.equal(await page.evaluate(()=>'expected' in state.logProgress||'samples' in state.logProgress),false,'no ETA machinery remains');
 if(process.env.QJL_QA_OUTPUT)await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`${viewport.width}-v1117-progress-no-eta.png`)});
 await page.evaluate(()=>finishLogProgress(false,new Error('Lỗi thử nghiệm')));assert(!/ước tính|ETA|còn ~|dự kiến/i.test(await page.locator('#logProgressPanel').innerText()));await page.locator('#closeLogProgressBtn').click();await page.waitForFunction(()=>!document.getElementById('logProgressDialog').open);
 assert.deepEqual(errors,[]);console.log('V1.11.7 muted colors: same project consistency, reopen/refresh/reload reroll, fixed OT, no ETA passed',viewport);await page.close();
}await browser.close();await new Promise(r=>server.close(r));})().catch(e=>{console.error(e);server.close();process.exit(1)});
