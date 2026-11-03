'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright'),{server}=require('./serve.cjs');
(async()=>{await new Promise(r=>server.listen(4268,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.QJL_CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox']});
try{for(const viewport of [{width:1920,height:1080},{width:1906,height:907},{width:1366,height:768},{width:1024,height:768},{width:390,height:844}]){
 const ctx=await browser.newContext({viewport,serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('qjl:bulk-help:v1:boss','1'));
 await page.route('**/api?*',async route=>{const a=new URL(route.request().url()).searchParams.get('action');let d={ok:true};if(a==='status')d={ok:true,authenticated:true,user:{username:'boss',displayName:'Boss'}};if(a==='subtasks')d={ok:true,issues:Array.from({length:100},(_,i)=>({key:'EPU01-'+(i+1),project:'EPU01',summary:i%2?'Nội dung dài '.repeat(30):'Ngắn',issueType:'Sub-task',isSubtask:true}))};if(a==='day-audit')d={ok:true,occupied:[],regularOccupiedMinutes:0};if(a==='worklog-history')d={ok:true,items:[]};await route.fulfill({contentType:'application/json',body:JSON.stringify(d)});});
 await page.goto('http://127.0.0.1:4268');await page.waitForFunction(()=>state.filterLoaded&&!QuickJiraBusy.active&&!QuickJiraBusy.count);await page.locator('#logAllBtn').click();await page.waitForTimeout(350);
 const list=page.locator('#bulkItems'),card=page.locator('#bulkCard');
 if(viewport.width>=900){
  for(const auto of [false,true]){
   await page.locator('#bulkAutoAllocate').setChecked(auto);await page.waitForTimeout(100);
   const selectors=['.bulk-title','.bulk-plan-options','.bulk-header-date','.bulk-footer','.bulk-item-title'];
   if(!auto)selectors.push('.bulk-time','.bulk-ot-toggle','.bulk-preset-btn','.bulk-description-details summary');
   for(const selector of selectors){
    await list.evaluate(el=>el.scrollTop=0);await page.waitForTimeout(40);
    const target=card.locator(selector).first();await target.hover();const times=await page.locator('.bulk-time').evaluateAll(xs=>xs.map(x=>x.value));
    await page.mouse.wheel(0,100);await page.waitForFunction(()=>document.getElementById('bulkItems').scrollTop>0);
    const down=await list.evaluate(el=>el.scrollTop);await page.mouse.wheel(0,-50);await page.waitForFunction(y=>document.getElementById('bulkItems').scrollTop<y,down);
    assert.deepEqual(await page.locator('.bulk-time').evaluateAll(xs=>xs.map(x=>x.value)),times,'Wheel must not edit TimeSpent');
   }
   // Line/page delta modes are used by some desktop mice and accessibility tools.
   for(const mode of [1,2]){await list.evaluate(el=>el.scrollTop=0);await card.locator('.bulk-title').dispatchEvent('wheel',{deltaY:mode===1?3:1,deltaMode:mode,bubbles:true,cancelable:true});assert(await list.evaluate(el=>el.scrollTop>0));}
   await list.evaluate(el=>el.scrollTop=0);const gap=await list.boundingBox();await page.mouse.move(gap.x+2,gap.y+20);await page.mouse.wheel(0,100);await page.waitForFunction(()=>document.getElementById('bulkItems').scrollTop>0);
   await list.evaluate(el=>el.scrollTop=el.scrollHeight);const outer=await page.evaluate(()=>({y:scrollY,card:document.getElementById('bulkCard').scrollTop}));await card.locator('.bulk-footer').hover();await page.mouse.wheel(0,500);await page.waitForTimeout(80);assert.deepEqual(await page.evaluate(()=>({y:scrollY,card:document.getElementById('bulkCard').scrollTop})),outer,'No background scroll at boundary');
   await list.evaluate(el=>el.scrollTop=0);await card.locator('.bulk-title').dispatchEvent('wheel',{deltaY:100,ctrlKey:true,bubbles:true,cancelable:true});assert.equal(await list.evaluate(el=>el.scrollTop),0,'Ctrl-wheel does not scroll list');
   const geometry=await list.evaluate(el=>{const b=el.getBoundingClientRect(),rs=[...el.children].map(c=>c.getBoundingClientRect());return {full:rs.filter(r=>r.top>=b.top-1&&r.bottom<=b.bottom+1).length,heights:rs.map(r=>r.height),right:b.right};});assert(geometry.full>0);assert(Math.max(...geometry.heights)-Math.min(...geometry.heights)<1);assert(geometry.right<=viewport.width);
  }
  await page.locator('#bulkAutoAllocate').uncheck();await list.evaluate(el=>el.scrollTop=0);
  await card.locator('.bulk-description-details summary').first().click();const textarea=card.locator('textarea').first();await textarea.fill('Mô tả dài\n'.repeat(50));
  await textarea.evaluate(el=>{el.closest('.bulk-item-fields').scrollTop=el.closest('.bulk-item-fields').scrollHeight;el.scrollTop=0;});await textarea.hover();await page.mouse.wheel(0,50);await page.waitForFunction(()=>document.querySelector('#bulkItems textarea').scrollTop>0);assert.equal(await list.evaluate(el=>el.scrollTop),0,'Description scrolls internally');
  await textarea.evaluate(el=>{el.scrollTop=el.scrollHeight;el.closest('.bulk-item-fields').scrollTop=el.closest('.bulk-item-fields').scrollHeight;});await page.mouse.wheel(0,100);await page.waitForFunction(()=>document.getElementById('bulkItems').scrollTop>0);
  await list.evaluate(el=>el.scrollTop=0);await card.locator('.bulk-description-details summary').first().click();
  for(const theme of ['light','dark']){await page.evaluate(t=>applyTheme(t),theme);await page.waitForTimeout(300);const style=await card.locator('.bulk-item').first().evaluate(el=>{const s=getComputedStyle(el);return {shadow:s.boxShadow,border:s.borderColor,bg:s.backgroundColor,list:getComputedStyle(el.parentElement).backgroundColor};});assert.notEqual(style.shadow,'none');assert.notEqual(style.bg,style.list);await page.screenshot({path:`/tmp/qjl1373-bulk-${viewport.width}-${theme}.png`});}
  // Expanded OT remains reachable without dragging an inner scrollbar.
  await list.evaluate(el=>el.scrollTop=0);const ot=card.locator('.bulk-ot-toggle').first();await ot.click();
  const fields=card.locator('.bulk-item-fields').first();await fields.evaluate(el=>el.scrollTop=0);await card.locator('.bulk-time').first().hover();await page.mouse.wheel(0,100);await page.waitForFunction(()=>{const f=document.querySelector('#bulkItems .bulk-item-fields');return f.scrollHeight<=f.clientHeight+1?document.getElementById('bulkItems').scrollTop>0:f.scrollTop>0;});
  await fields.evaluate(el=>el.scrollTop=el.scrollHeight);await list.evaluate(el=>el.scrollTop=0);await page.mouse.wheel(0,100);await page.waitForFunction(()=>document.getElementById('bulkItems').scrollTop>0);await list.evaluate(el=>el.scrollTop=0);await ot.click();
  // Help dialog remains the only active wheel surface while it is open.
  await list.evaluate(el=>el.scrollTop=0);await page.evaluate(()=>{const d=document.createElement('dialog');d.id='wheelTestDialog';d.innerHTML='<p>Hướng dẫn</p>';document.body.append(d);d.showModal();});await page.locator('#wheelTestDialog').dispatchEvent('wheel',{deltaY:100,bubbles:true,cancelable:true});assert.equal(await list.evaluate(el=>el.scrollTop),0);await page.evaluate(()=>document.getElementById('wheelTestDialog').remove());
 }else{
  const before=await card.evaluate(el=>({rect:el.getBoundingClientRect().toJSON(),bg:getComputedStyle(el.querySelector('.bulk-item')).backgroundColor}));await page.evaluate(()=>document.querySelector('link[href="/desktop-workspace.css"]').disabled=true);const after=await card.evaluate(el=>({rect:el.getBoundingClientRect().toJSON(),bg:getComputedStyle(el.querySelector('.bulk-item')).backgroundColor}));assert.deepEqual(before,after,'Mobile geometry/colors unchanged');
 }
 assert.deepEqual(errors,[]);await ctx.close();console.log('Bulk wheel routing, boundaries, cards passed',viewport);
}}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
