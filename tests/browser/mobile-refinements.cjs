const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {server}=require('./serve.cjs');
const capture=async(page,name)=>{if(!process.env.QJL_QA_OUTPUT)return;fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,name)});};
async function drag(page,locator,dy){const b=await locator.boundingBox(),x=b.x+Math.min(70,b.width/3),y=b.y+Math.min(10,b.height/2);await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+dy,{steps:12});await page.mouse.up();await page.waitForTimeout(230);}
async function controlsFit(page,selector){return page.locator(selector).evaluate(root=>[...root.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]),textarea,select')].filter(e=>e.getClientRects().length).every(e=>{const r=e.getBoundingClientRect(),parent=(e.closest('label')||root).getBoundingClientRect(),sheet=root.getBoundingClientRect();return r.left>=parent.left-1&&r.right<=parent.right+1&&r.left>=sheet.left-1&&r.right<=sheet.right+1;}));}
(async()=>{
 await new Promise(r=>server.listen(4194,'127.0.0.1',r));
 const browser=await chromium.launch({...(process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const viewport of [{width:315,height:683},{width:390,height:844},{width:430,height:932},{width:844,height:390},{width:1440,height:900}]){
  const page=await browser.newPage({viewport,serviceWorkers:'block',timezoneId:'Asia/Ho_Chi_Minh'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...a.length?a:['2026-10-16T02:00:00Z']);}static now(){return D.parse('2026-10-16T02:00:00Z');}};});
  const issues=Array.from({length:12},(_,i)=>({key:`EPU01-${100+i}`,project:'EPU01',summary:'Hỗ trợ triển khai và kiểm tra yêu cầu '+i,status:'In Progress'}));
  await page.route('**/api?*',async route=>{const a=new URL(route.request().url()).searchParams.get('action');let d={ok:true};if(a==='status')d={ok:true,authenticated:true,user:{username:'boss',displayName:'Boss'}};if(a==='subtasks')d={ok:true,issues};if(a==='day-audit')d={ok:true,regularOccupiedMinutes:0,occupiedMinutes:0,freeMinutes:480,occupied:[],available:[]};if(a==='worklog-history')d={ok:true,items:[{id:'1',key:'EPU01-100',date:'2026-10-16',start:'08:00',end:'09:00',minutes:60,summary:'Hỗ trợ theo yêu cầu',description:'Mô tả công việc',overtime:false}]};await route.fulfill({contentType:'application/json',body:JSON.stringify(d)});});
  await page.goto('http://127.0.0.1:4194');await page.waitForFunction(()=>!document.body.classList.contains('booting'));await page.locator('.issue-row').first().click();await page.waitForTimeout(250);
  assert.equal(await page.locator('#overtime').isVisible(),false,'no OT option during creation');assert(await controlsFit(page,'#worklogCard'));
  if(viewport.width<900){const b=await page.locator('#worklogCard').boundingBox();assert(b.y<=1&&b.height>=viewport.height-2,JSON.stringify(b));await capture(page,`${viewport.width}-v1115-single-full-height.png`);await drag(page,page.locator('#worklogCard .bottom-sheet-drag-handle'),25);assert(await page.locator('#worklogCard').isVisible());await drag(page,page.locator('#worklogCard .worklog-sticky-header h2'),175);await page.locator('#worklogCard').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>document.body.classList.contains('mobile-editor-open')),false);}
  else await page.locator('#closeWorklogBtn').click();
  await page.locator('#logAllBtn').click();await page.waitForTimeout(250);assert.equal(await page.locator('.bulk-overtime').count(),0);assert(await controlsFit(page,'#bulkCard'));
  if(viewport.width<900){const b=await page.locator('#bulkCard').boundingBox();assert(b.y<=1&&b.height>=viewport.height-2);await page.locator('#bulkCard').evaluate(e=>e.scrollTop=250);await page.waitForTimeout(50);assert(await page.locator('#bulkCard .bulk-sticky-header').isVisible());await capture(page,`${viewport.width}-v1115-bulk-full-height.png`);await drag(page,page.locator(viewport.height<=560?'#bulkCard .bottom-sheet-drag-handle':'#bulkCard .bulk-sticky-header h2'),175);await page.locator('#bulkCard').waitFor({state:'hidden'});}
  else await page.locator('#cancelBulkBtn').click();
  await page.locator(viewport.width>=900?'#historyBtn':'#mobileHistoryBtn').click();await page.waitForFunction(()=>state.historyLoaded&&!state.historyLoading);await page.locator('.week-worklog-block').click();await page.waitForTimeout(250);assert(await controlsFit(page,'#worklogCorrectionDialog'),'native date/time fit their fields');
  await page.locator('#correctionStart').fill('23:59');assert(await controlsFit(page,'#worklogCorrectionDialog'));await capture(page,`${viewport.width}-v1115-correction-bounded.png`);
  if(viewport.width<900){await drag(page,page.locator('.correction-head strong'),30);assert(await page.locator('#worklogCorrectionDialog').evaluate(e=>e.open));await drag(page,page.locator('.correction-head strong'),140);await page.waitForFunction(()=>!document.getElementById('worklogCorrectionDialog').open);await page.locator('.week-worklog-block').click();assert.equal(await page.locator('#worklogCorrectionDialog').evaluate(e=>e.style.transform),'');await page.locator('#cancelCorrectionBtn').click();}
  else await page.locator('#cancelCorrectionBtn').click();
  await page.waitForFunction(()=>!document.getElementById('worklogCorrectionDialog').open);await page.locator('#closeHistoryBtn').click();
  // Modal is centered in either editor; active requests cannot be dismissed.
  for(const mode of ['single','bulk']){
   await page.evaluate(mode=>startLogProgress(mode,mode==='bulk'?12:1),mode);await page.waitForTimeout(220);assert(await page.locator('#logProgressDialog').evaluate(e=>e.open));
   const b=await page.locator('#logProgressDialog').boundingBox();assert(Math.abs(b.x+b.width/2-viewport.width/2)<2);assert(Math.abs(b.y+b.height/2-viewport.height/2)<2);assert(await page.locator('#logProgressDialog').evaluate(e=>getComputedStyle(e,'::backdrop').backgroundColor.includes('0.76')));
   await page.keyboard.press('Escape');assert(await page.locator('#logProgressDialog').evaluate(e=>e.open));assert.equal(await page.locator('#closeLogProgressBtn').isVisible(),false);
   await page.evaluate(()=>updateLogProgress({percent:44,phase:'Đang ghi worklog'}));assert.equal(await page.locator('#logProgressPercent').innerText(),'44%');await capture(page,`${viewport.width}-v1115-progress-${mode}.png`);
   await page.evaluate(()=>finishLogProgress(false,new Error('Lỗi giả lập')));assert(await page.locator('#closeLogProgressBtn').isVisible());await page.locator('#closeLogProgressBtn').click();await page.waitForFunction(()=>!document.getElementById('logProgressDialog').open);assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('log-progress-open')),false);
  }
  assert.deepEqual(errors,[]);console.log('V1.11.5 full-height single/Bulk, header/handle swipe, bounded pickers and centered modal progress passed',viewport);await page.close();
 }
 await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);server.close();process.exit(1)});
