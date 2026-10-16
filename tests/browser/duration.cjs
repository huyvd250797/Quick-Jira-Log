const fs=require('node:fs');
async function capture(page,name){if(!process.env.QJL_QA_OUTPUT)return;fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:require('node:path').join(process.env.QJL_QA_OUTPUT,require('node:path').basename(name))});}
const {chromium,devices}=require('playwright');
const assert=require('node:assert/strict'),path=require('path');
const {server}=require('./serve.cjs');
(async()=>{
 await new Promise(r=>server.listen(4176,'127.0.0.1',r));
 const browser=await chromium.launch({...(process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
 for(const viewport of [{width:315,height:683},{width:390,height:844},{width:430,height:932},{width:844,height:390},{width:1366,height:768}]){
  const mobile=viewport.width<900;
  const context=await browser.newContext({...mobile?devices['iPhone 13']:{},viewport,timezoneId:'Asia/Ho_Chi_Minh',serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api?*',async route=>{
   const action=new URL(route.request().url()).searchParams.get('action');
   const data=action==='status'?{ok:true,authenticated:true,user:{displayName:'Boss',username:'boss'}}:action==='subtasks'?{ok:true,issues:[{key:'EPU01-2835',project:'EPU01',summary:'Xây dựng biên bản bàn giao bộ phận MS (3)',status:'In Progress'}]}:action==='day-audit'?{ok:true,regularOccupiedMinutes:0,occupiedMinutes:0,freeMinutes:480,occupied:[],available:[]}:{ok:true,items:[]};
   await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:4176');await page.locator('#logAllBtn').click();await page.locator('.bulk-time').waitFor({state:'visible'});await page.waitForTimeout(250);
  const input=page.locator('.bulk-time').first(),up=page.locator('#bulkCard .duration-stepper [data-step="1"]').first(),down=page.locator('#bulkCard .duration-stepper [data-step="-1"]').first();
  const geometry=[];
  for(const value of ['3h 30m','12h 30m','16h']){
   await input.fill(value);await input.dispatchEvent('input');
   const g=await input.evaluate(e=>{const s=getComputedStyle(e),c=document.createElement('canvas').getContext('2d');c.font=`${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;const r=e.getBoundingClientRect(),group=e.closest('.duration-stepper').getBoundingClientRect();return {value:e.value,width:r.width,group:group.width,text:c.measureText(e.value).width,usable:e.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight),font:s.fontSize};});
   {assert(g.text<=g.usable,`Text must fit ${JSON.stringify(g)}`);assert(g.group>=190,`Group enlarged ${JSON.stringify(g)}`);}
   geometry.push(g);
  }
  assert(await up.isDisabled());
  await page.locator('#bulkCard .bulk-preset-btn[data-time="3h"]').click();await up.click();assert.equal(await input.inputValue(),'3h 30m');
  await up.click();assert.equal(await input.inputValue(),'4h');await down.click();assert.equal(await input.inputValue(),'3h 30m');
  assert.equal(await page.evaluate(()=>state.bulkDrafts.get('EPU01-2835').timeSpent),'3h 30m');
  if(mobile){
   const layout=await page.evaluate(()=>{const g=document.querySelector('#bulkCard .duration-stepper').getBoundingClientRect(),p=document.querySelector('#bulkCard .bulk-preset-row').getBoundingClientRect();return {groupBottom:g.bottom,presetTop:p.top,scroll:document.documentElement.scrollWidth>innerWidth};});
   assert(layout.presetTop>=layout.groupBottom);assert(!layout.scroll);
   for(const b of await page.locator('#bulkCard .bulk-preset-btn').all())assert(await b.isVisible());
  }
  await input.fill('abc');await input.blur();assert.equal(await input.getAttribute('aria-invalid'),'true');assert(await page.locator('#'+await input.getAttribute('id')+'-error').isVisible());
  await input.fill('3h 30m');assert.equal(await input.getAttribute('aria-invalid'),'false');
  await input.blur();
  for(const theme of ['light','dark']){
   await page.evaluate(t=>applyTheme(t),theme);await page.waitForTimeout(200);
   await page.locator('.bulk-item').first().scrollIntoViewIfNeeded();
   await capture(page,`${viewport.width}-v111-duration-${theme}.png`);
  }
  assert.deepEqual(errors,[]);console.log(viewport,JSON.stringify(geometry));await context.close();
 }
 await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);server.close();process.exit(1)});
