const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {server}=require('./serve.cjs');
async function capture(page,name){if(!process.env.QJL_QA_OUTPUT)return;fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,name)});}
(async()=>{
 await new Promise(r=>server.listen(4184,'127.0.0.1',r));
 const browser=await chromium.launch({...process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{},headless:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
 for(const viewport of [{width:315,height:683},{width:390,height:844},{width:430,height:932},{width:844,height:390},{width:667,height:375},{width:1440,height:900}]){
  const page=await browser.newPage({viewport,timezoneId:'Asia/Ho_Chi_Minh',serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...args){super(...args.length?args:['2026-10-16T02:00:00Z']);}static now(){return D.parse('2026-10-16T02:00:00Z');}};window.nativeFullscreenCalls=[];Object.defineProperty(Element.prototype,'requestFullscreen',{configurable:true,writable:true,value:undefined});Object.defineProperty(screen.orientation,'lock',{configurable:true,writable:true,value:undefined});});
  let fail=false,deleted=false,mutations=[];
  const item={id:'1',key:'INTRACOM01-652',date:'2026-10-16',start:'13:30',end:'15:30',minutes:120,summary:'Kiểm tra và hỗ trợ trường xác nhận chức năng đăng ký nhập học trực tuyến',description:'Nội dung công việc chi tiết, giữ nguyên khi sửa lỗi hoặc đổi hướng màn hình.'};
  await page.route('**/api?*',async route=>{const u=new URL(route.request().url()),a=u.searchParams.get('action');let data={ok:true},status=200;
   if(a==='status')data={ok:true,authenticated:true,user:{displayName:'Boss',username:'boss'}};
   if(a==='subtasks')data={ok:true,issues:[]};
   if(a==='worklog-history')data={ok:true,items:deleted?[]:[item]};
   if(a==='worklog-correction'){const body=route.request().postDataJSON();mutations.push(body);if(fail){status=502;data={ok:false,error:'Jira tạm lỗi. Hãy thử lại.'};}else if(route.request().method()==='DELETE')deleted=true;else Object.assign(item,{description:body.description,minutes:150,end:'16:00'});}
   if(a==='worklog-correction'&&status===200)data={...data,overtimeVerified:true,worklogVerified:true};
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:4184');await page.waitForFunction(()=>!document.body.classList.contains('booting'));await page.locator(viewport.width>=900?'#historyBtn':'#mobileHistoryBtn').click();await page.waitForFunction(()=>state.historyLoaded&&!state.historyLoading);await page.waitForTimeout(250);
  const normalHeight=await page.locator('#historyResults').evaluate(e=>e.clientHeight);
  if(viewport.width<900)assert(normalHeight>viewport.height*.64,`normal calendar area ${normalHeight}/${viewport.height}`);
  // The compact toolbar has no offscreen interactive controls.
  const fit=await page.locator('#calendarControls').evaluate(e=>{const r=e.getBoundingClientRect();return [...e.querySelectorAll('button,input')].filter(x=>x.getClientRects().length).every(x=>{const b=x.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1;});});assert(fit,'controls fit');
  for(const theme of ['light','dark']){await page.evaluate(t=>applyTheme(t),theme);await page.waitForTimeout(200);await capture(page,`${viewport.width}-compact-${theme}.png`);}
  await page.locator('.week-worklog-block').click();await page.waitForFunction(()=>document.getElementById('worklogCorrectionDialog').open);
  assert.equal(await page.locator('#worklogCorrectionPanel').evaluate(e=>e.parentElement.id),'worklogCorrectionDialog');
  assert.equal(await page.evaluate(()=>['INPUT','TEXTAREA'].includes(document.activeElement.tagName)),false,'opening details must not focus an input');
  assert(await page.locator('#correctionIssueSummary').isVisible());assert.equal(await page.locator('#correctionDescription').inputValue(),item.description);
  for(const theme of ['light','dark']){await page.evaluate(t=>applyTheme(t),theme);await page.waitForTimeout(200);await capture(page,`${viewport.width}-sheet-${theme}.png`);}
  await page.locator('#correctionDescription').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'correctionDescription');
  await page.locator('#correctionDescription').fill('Bản nháp khi đang chỉnh sửa.');
  await page.setViewportSize({width:viewport.height,height:viewport.width});await page.waitForTimeout(150);assert.equal(await page.locator('#correctionDescription').inputValue(),'Bản nháp khi đang chỉnh sửa.');assert.equal(await page.locator('#worklogCorrectionDialog').evaluate(e=>e.open),true);
  await page.setViewportSize(viewport);fail=true;await page.locator('#saveCorrectionBtn').click();await page.locator('#correctionFeedback').waitFor({state:'visible'});assert.equal(await page.locator('#correctionDescription').inputValue(),'Bản nháp khi đang chỉnh sửa.');fail=false;await page.locator('#saveCorrectionBtn').click();await page.waitForFunction(()=>!document.getElementById('worklogCorrectionDialog').open&&!state.historyLoading);
  // Unsupported native API still supplies usable immersive mode and returns to the same calendar.
  await page.locator('#historyResults').evaluate(e=>{e.scrollTop=140;});const saved=await page.locator('#historyResults').evaluate(e=>({top:e.scrollTop,left:e.scrollLeft}));
  await page.locator('#calendarFullscreenBtn').click();assert.equal(await page.evaluate(()=>state.calendarFullscreen),true);assert.equal(await page.locator('#calendarFullscreenBtn').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#calendarFullscreenBtn').innerText(),'');
  await page.setViewportSize({width:844,height:390});await page.waitForTimeout(250);
  const full=await page.locator('#historyResults').boundingBox();assert(full.height>320,`fullscreen calendar ${full.height}`);
  assert.equal(await page.locator('.week-day-heading').count(),5);
  const days=await page.locator('.weekly-inner').boundingBox();assert(days.width<845,'five days fit landscape');
  await capture(page,`${viewport.width}-fullscreen-landscape.png`);
  await page.locator('.week-worklog-block').click();assert(await page.locator('#worklogCorrectionDialog').evaluate(e=>e.open));assert.equal(await page.evaluate(()=>document.activeElement.tagName),'BUTTON');await page.locator('#cancelCorrectionBtn').click();assert.equal(await page.evaluate(()=>state.calendarFullscreen),true);
  await page.locator('#calendarFullscreenBtn').click();await page.setViewportSize(viewport);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>state.calendarFullscreen),false);
  // Native request + landscape lock, system exit, and denial paths.
  await page.evaluate(()=>{window.qaNative=null;Object.defineProperty(document,'fullscreenElement',{configurable:true,get:()=>window.qaNative});document.documentElement.requestFullscreen=async()=>{window.qaNative=document.documentElement;window.nativeFullscreenCalls.push('request');document.dispatchEvent(new Event('fullscreenchange'));};document.exitFullscreen=async()=>{window.qaNative=null;window.nativeFullscreenCalls.push('exit');document.dispatchEvent(new Event('fullscreenchange'));};screen.orientation.lock=async direction=>{window.nativeFullscreenCalls.push(direction);};screen.orientation.unlock=()=>{window.nativeFullscreenCalls.push('unlock');};});
  await page.locator('#calendarFullscreenBtn').click();await page.waitForFunction(()=>window.nativeFullscreenCalls.includes('landscape'));assert.equal(await page.evaluate(()=>state.calendarNativeFullscreen),true);
  await page.evaluate(()=>document.exitFullscreen());await page.waitForFunction(()=>!state.calendarFullscreen);
  await page.evaluate(()=>{document.documentElement.requestFullscreen=async()=>{throw new Error('denied');};screen.orientation.lock=async()=>{throw new Error('unsupported');};});
  await page.locator('#calendarFullscreenBtn').click();await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>state.calendarFullscreen),true);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>state.calendarFullscreen),false);assert(await page.locator('#historyOverlay').isVisible());
  // Switching modes remains available through the compact options button.
  if(!(await page.locator('#historyListViewBtn').isVisible()))await page.locator('#calendarOptionsBtn').click();await page.locator('#historyListViewBtn').click();await page.waitForFunction(()=>!state.historyLoading);assert.equal(await page.evaluate(()=>state.historyView),'list');await page.locator('#historyCalendarViewBtn').click();await page.waitForFunction(()=>!state.historyLoading);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);console.log('Mobile sheet, no auto-input focus, compact/fullscreen/native/fallback passed',viewport);await page.close();
 }
 await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);server.close();process.exit(1)});
