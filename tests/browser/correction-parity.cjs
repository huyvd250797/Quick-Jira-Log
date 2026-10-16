const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {server}=require('./serve.cjs');
(async()=>{
 await new Promise(r=>server.listen(4192,'127.0.0.1',r));
 const browser=await chromium.launch({...(process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const viewport of [{width:315,height:683},{width:390,height:844},{width:844,height:390},{width:1440,height:900}]){
  const page=await browser.newPage({viewport,timezoneId:'Asia/Ho_Chi_Minh',serviceWorkers:'block'}),errors=[],mutations=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...a.length?a:['2026-10-16T02:00:00Z']);}static now(){return D.parse('2026-10-16T02:00:00Z');}};localStorage.setItem('quick-jira-log:project-colors:v1','true');localStorage.setItem('quick-jira-log:project-palette:v1',JSON.stringify({EPU01:{h:340,s:48}}));});
  let fail=false,item={id:'1',key:'EPU01-2810',date:'2026-10-12',start:'08:00',end:'09:00',minutes:60,summary:'Hướng dẫn và hỗ trợ triển khai hệ thống',description:'Nội dung giữ nguyên khi chọn thời lượng hoặc Overtime.',overtime:false};
  await page.route('**/api?*',async route=>{const a=new URL(route.request().url()).searchParams.get('action');let data={ok:true},status=200;
   if(a==='status')data={ok:true,authenticated:true,user:{displayName:'Boss',username:'boss'}};
   if(a==='subtasks')data={ok:true,issues:[]};
   if(a==='worklog-history')data={ok:true,items:[item]};
   if(a==='worklog-correction'){const body=route.request().postDataJSON();mutations.push(body);if(fail){status=403;data={ok:false,error:'Không cập nhật được Overtime; đã hoàn tác worklog.'};}else{const minutes=await page.evaluate(t=>QuickJiraUi.durationMinutes(t),body.timeSpent),[h,m]=body.start.split(':').map(Number),end=h*60+m+minutes;item={...item,...body,minutes,end:`${String(Math.floor(end/60)).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`};}}
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:4192');await page.waitForFunction(()=>!document.body.classList.contains('booting'));await page.locator(viewport.width>=900?'#historyBtn':'#mobileHistoryBtn').click();await page.waitForFunction(()=>state.historyLoaded&&!state.historyLoading);await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>state.projectPalette.EPU01.h),145,'old similar palette is replaced');
  await page.locator('.week-worklog-block').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'cancelCorrectionBtn');assert.equal(await page.locator('.correction-overtime strong').innerText(),'Overtime');assert.equal(await page.locator('#correctionOvertime').isChecked(),false);
  assert.equal(await page.locator('.correction-preset-btn').count(),5);
  const mainBefore=await page.locator('#timeSpent').inputValue();
  for(const time of ['30m','1h','2h','3h','4h']){
   await page.locator(`.correction-preset-btn[data-time="${time}"]`).click();assert.equal(await page.locator('#correctionTimeSpent').inputValue(),time);assert.equal(await page.evaluate(()=>document.activeElement.tagName),'BUTTON');assert.equal(await page.locator('.correction-preset-btn.active').count(),1);
  }
  assert.equal(await page.locator('#timeSpent').inputValue(),mainBefore,'correction presets do not change new Logwork draft');
  await page.locator('#worklogCorrectionDialog [data-step="1"]').click();assert.equal(await page.locator('#correctionTimeSpent').inputValue(),'4h 30m');assert.equal(await page.locator('.correction-preset-btn.active').count(),0);
  await page.locator('.correction-preset-btn[data-time="1h"]').click();
  const description=await page.locator('#correctionDescription').inputValue();await page.locator('.correction-overtime').click();assert(await page.locator('#correctionOvertime').isChecked());assert.equal(await page.locator('#correctionDescription').inputValue(),description);assert((await page.locator('#correctionOvertimeHint').innerText()).includes('không tự thay đổi'));
  await page.locator('#correctionDate').fill('2026-10-17');await page.locator('#correctionDate').dispatchEvent('change');assert((await page.locator('#correctionOvertimeHint').innerText()).includes('worklog đã log'));await page.locator('#correctionDate').fill('2026-10-12');await page.locator('#correctionDate').dispatchEvent('change');
  await page.setViewportSize({width:viewport.height,height:viewport.width});await page.waitForTimeout(80);assert(await page.locator('#correctionOvertime').isChecked());assert.equal(await page.locator('#correctionTimeSpent').inputValue(),'1h');await page.setViewportSize(viewport);
  await page.locator('#correctionStart').fill('17:30');
  fail=true;await page.locator('#saveCorrectionBtn').click();await page.locator('#correctionFeedback').waitFor({state:'visible'});assert(await page.locator('#correctionOvertime').isChecked());assert.equal(mutations.at(-1).overtime,true);assert.equal(mutations.at(-1).updateOvertime,true);
  fail=false;await page.locator('#saveCorrectionBtn').click();await page.waitForFunction(()=>!state.historyLoading&&!document.getElementById('worklogCorrectionDialog').open);assert.equal(await page.locator('.week-worklog-block.is-ot').count(),1);
  await page.locator('.week-worklog-block').click();assert(await page.locator('#correctionOvertime').isChecked());await page.locator('.correction-overtime').click();await page.locator('#correctionStart').fill('08:00');await page.locator('#saveCorrectionBtn').click();await page.waitForFunction(()=>!state.historyLoading&&!document.getElementById('worklogCorrectionDialog').open);assert.equal(mutations.at(-1).overtime,false);assert.equal(mutations.at(-1).updateOvertime,true);assert.equal(await page.locator('.week-worklog-block.is-ot').count(),0);
  await page.locator('.week-worklog-block').click();await page.locator('#correctionDescription').fill('Chỉ sửa mô tả');await page.locator('#saveCorrectionBtn').click();await page.waitForFunction(()=>!state.historyLoading&&!document.getElementById('worklogCorrectionDialog').open);assert.equal(mutations.at(-1).updateOvertime,false);
  await page.locator('.week-worklog-block').click();
  for(const theme of ['light','dark']){await page.evaluate(t=>applyTheme(t),theme);await page.waitForTimeout(200);if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.locator('#worklogCorrectionDialog').evaluate(e=>e.scrollTop=0);await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`${viewport.width}-v1114-form-${theme}.png`)});}}
  assert.equal(await page.locator('#worklogCorrectionDialog').evaluate(e=>e.scrollWidth>e.clientWidth+1),false,'form does not scroll sideways');assert(await page.locator('#historyOverlay').evaluate(e=>e.inert));assert.deepEqual(errors,[]);console.log('V1.11.4 correction presets/no auto keyboard, OT on/off, draft/error/resize and palette migration passed',viewport);await page.close();
 }
 await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);server.close();process.exit(1)});
