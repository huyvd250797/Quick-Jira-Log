'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const { server } = require('./serve.cjs');
const viewports = [
  {width:315,height:683}, {width:390,height:844}, {width:430,height:932},
  {width:568,height:320}, {width:667,height:375}, {width:844,height:390},
  {width:1024,height:768}, {width:1440,height:1000}
];
async function geometry(page) {
  return page.evaluate(() => {
    const result = document.getElementById('historyResults').getBoundingClientRect();
    const all = [...document.querySelectorAll('#calendarControls button,#calendarControls input,#calendarFullscreenBtn,#calendarOptionsBtn,#calendarSaveBtn')];
    const controls = all.filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').map(e => ({id:e.id,rect:e.getBoundingClientRect().toJSON(),hit:(()=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})()}));
    return {result:result.toJSON(),controls,w:innerWidth,h:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,
      scale:parseFloat(document.querySelector('.weekly-inner').style.getPropertyValue('--week-minute-px'))};
  });
}
function bounded(g) {
  assert(!g.overflow, 'document stays within the viewport');
  for (const {id,rect:r,hit} of g.controls) {
    assert(hit, `${id} receives pointer input`);
    assert(r.x>=-1 && r.right<=g.w+1 && r.y>=-1 && r.bottom<=g.result.y+1, `${id} fits toolbar: ${JSON.stringify(r)}`);
  }
  for (let i=0;i<g.controls.length;i++) for (let j=i+1;j<g.controls.length;j++) {
    const a=g.controls[i],b=g.controls[j],ar=a.rect,br=b.rect;
    assert(!(Math.min(ar.right,br.right)-Math.max(ar.left,br.left)>1 && Math.min(ar.bottom,br.bottom)-Math.max(ar.top,br.top)>1), `${a.id} overlaps ${b.id}`);
  }
  assert(g.result.bottom<=g.h+1 && g.result.x>=0 && g.result.right<=g.w+1, 'calendar fits viewport');
  assert(g.scale>=1, 'retain readable minute scale');
}
(async () => {
  await new Promise(r => server.listen(4216,'127.0.0.1',r));
  const browser=await chromium.launch({...(process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
  for (const viewport of viewports) {
    const context=await browser.newContext({viewport,hasTouch:viewport.width<1100,serviceWorkers:'block',timezoneId:'Asia/Ho_Chi_Minh'});
    const page=await context.newPage(),errors=[],writes=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(() => {
      const D=Date;window.Date=class extends D { constructor(...a){super(...(a.length?a:['2026-10-12T02:00:00Z']));}static now(){return D.parse('2026-10-12T02:00:00Z');} };
      Object.defineProperty(Element.prototype,'requestFullscreen',{configurable:true,value:undefined});
      window.orientationCalls=[];
      Object.defineProperty(screen.orientation,'lock',{configurable:true,value:async x=>orientationCalls.push(x)});
      Object.defineProperty(screen.orientation,'unlock',{configurable:true,value:()=>orientationCalls.push('unlock')});
    });
    const mine={id:'1',key:'EPU01-2840',project:'EPU01',summary:'Hướng dẫn và hỗ trợ xử lý dữ liệu trên hệ thống',description:'Keep worklog data',date:'2026-10-12',start:'08:00',end:'09:00',minutes:60,timeSpentSeconds:3600,started:'2026-10-12T08:00:00.000+0700',overtime:false,overtimeKnown:true};
    const other={key:'USER-1',username:'person1',displayName:'Nguyễn Văn An — Nhân sự dự án'};
    await page.route('**/api?*',async route => {
      const a=new URL(route.request().url()).searchParams.get('action');
      if(!['GET','HEAD'].includes(route.request().method())) writes.push(a);
      const data=a==='status'?{ok:true,authenticated:true,user:{username:'boss',displayName:'Boss'}}:
        a==='worklog-history'?{ok:true,items:[mine]}:
        a==='calendar-users'?{ok:true,users:[other]}:
        a==='calendar-history'?{ok:true,readOnly:true,viewedUser:other,items:[{...mine,id:'other',calendarReadOnly:true}]}:{ok:true,issues:[]};
      await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
    });
    await page.goto('http://127.0.0.1:4216');
    await page.locator(viewport.width<900?'#mobileHistoryBtn':'#historyBtn').click();
    await page.waitForFunction(()=>state.historyLoaded&&!state.historyLoading&&!document.getElementById('historyOverlay').classList.contains('qjl-opening'));
    const normal=(await page.locator('#historyResults').boundingBox()).height;
    await page.locator('#calendarFullscreenBtn').click();
    await page.waitForTimeout(150);
    assert.deepEqual(await page.evaluate(()=>orientationCalls),[], 'enter never locks orientation');
    for (const theme of ['light','dark']) {
      await page.evaluate(t=>applyTheme(t),theme);
      const g=await geometry(page);bounded(g);
      const landscape=viewport.width>viewport.height;
      assert(g.result.height>=viewport.height-(landscape?52:90), `usable calendar ${g.result.height}/${viewport.height}`);
      assert(g.result.height>normal, 'fullscreen gains calendar height');
      if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`fullscreen-${viewport.width}-${theme}.png`)});}
    }
    // Safe-area gutters, including landscape notch and home indicator.
    if(viewport.width===844){
      await page.locator('#historyOverlay').evaluate(e=>{e.style.setProperty('--calendar-safe-left','47px');e.style.setProperty('--calendar-safe-right','47px');e.style.setProperty('--calendar-safe-bottom','21px');});
      bounded(await geometry(page));
      await page.locator('#historyOverlay').evaluate(e=>{for(const k of ['left','right','bottom'])e.style.removeProperty('--calendar-safe-'+k);});
    }
    await page.locator('#calendarOptionsBtn').click();assert(await page.locator('.calendar-fullscreen-help').isVisible());
    const options=await page.locator('#historyControls').boundingBox();assert(options.x>=0&&options.y>=0&&options.x+options.width<=viewport.width+1&&options.y+options.height<=viewport.height+1);
    await page.locator('#calendarOptionsBtn').click();
    await page.locator('#calendarMonthBtn').click();await page.waitForFunction(()=>state.calendarMode==='month'&&!state.historyLoading);
    await page.locator('#calendarWeekBtn').click();await page.waitForFunction(()=>state.calendarMode==='week'&&!state.historyLoading);
    // Draft adds one save action; rotation is purely a layout change.
    await page.evaluate(()=>stageCalendarMove(calendarPreviewItems()[0],{date:'2026-10-12',start:'09:00'}));
    await page.waitForTimeout(50);assert(await page.locator('#calendarSaveBtn').isVisible());bounded(await geometry(page));
    await page.locator('#calendarSaveBtn').click();assert(await page.locator('#calendarSaveDialog').evaluate(e=>e.open));
    await page.locator('#calendarCancelSaveBtn').click();assert.equal(await page.evaluate(()=>state.calendarDrafts.size),1);
    await page.setViewportSize({width:844,height:390});await page.waitForTimeout(100);bounded(await geometry(page));
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);bounded(await geometry(page));
    assert.equal(await page.evaluate(()=>state.calendarDrafts.size),1);
    assert.equal(await page.locator('#calendarDate').inputValue(),'2026-10-12');
    assert.equal(await page.evaluate(()=>calendarPreviewItems()[0].start),'09:00');
    await page.setViewportSize(viewport);await page.evaluate(()=>clearCalendarDrafts());
    // Selected personnel identity/read-only indicator stays visible and bounded.
    await page.evaluate(u=>selectCalendarUser(u),other);await page.waitForFunction(()=>!state.historyLoading&&calendarReadOnly());
    bounded(await geometry(page));
    if(viewport.width===844){
      await page.locator('#historyOverlay').evaluate(e=>{e.style.setProperty('--calendar-safe-left','47px');e.style.setProperty('--calendar-safe-right','47px');});
      bounded(await geometry(page));
      await page.locator('#historyOverlay').evaluate(e=>{for(const k of ['left','right'])e.style.removeProperty('--calendar-safe-'+k);});
    }
    assert(await page.locator('#calendarViewerLabel').isVisible());assert(await page.locator('#calendarViewerMode').isVisible());
    assert((await page.locator('#calendarViewerBtn').getAttribute('aria-label')).includes('Chỉ xem'));
    await page.locator('#calendarFullscreenBtn').click();await page.waitForFunction(()=>!state.calendarFullscreen&&!state.historyLoading);
    assert.deepEqual(await page.evaluate(()=>orientationCalls),[], 'exit never unlocks or changes orientation');
    assert.equal(await page.locator('#calendarViewerBtn').isVisible(),false);assert.equal(await page.evaluate(()=>calendarReadOnly()),false);
    assert.deepEqual(writes,[],'layout and rotation never write Jira');assert.deepEqual(errors,[]);
    console.log('Fullscreen preserves orientation, maximizes grid, bounds controls/options/drafts/readonly and survives rotation',viewport);
    await context.close();
  }
  await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);server.close();process.exit(1);});
