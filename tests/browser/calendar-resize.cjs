'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{server}=require('./serve.cjs');
(async()=>{
 await new Promise(r=>server.listen(4217,'127.0.0.1',r));
 const browser=await chromium.launch({...(process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
 for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:320,height:683},{width:844,height:390}].filter(v=>!process.env.QJL_RESIZE_WIDTH||v.width===Number(process.env.QJL_RESIZE_WIDTH))){
  const mobile=viewport.width<900,context=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile,serviceWorkers:'block',timezoneId:'Asia/Ho_Chi_Minh',reducedMotion:viewport.width===320?'reduce':'no-preference'}),page=await context.newPage(),errors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:['2026-10-12T02:00:00Z']));}static now(){return D.parse('2026-10-12T02:00:00Z');}};
   Object.defineProperty(Element.prototype,'requestFullscreen',{configurable:true,value:undefined});
  });
  const make=(id,start,minutes,extra={})=>({id,key:'CAL-'+id,project:'CAL',summary:'Hỗ trợ kiểm tra dữ liệu và xử lý yêu cầu',description:'Keep Jira comment',date:'2026-10-12',start,end:`${String(Math.floor((parseInt(start)*60+Number(start.slice(3))+minutes)/60)).padStart(2,'0')}:${String((Number(start.slice(3))+minutes)%60).padStart(2,'0')}`,minutes,timeSpentSeconds:minutes*60,started:`2026-10-12T${start}:00.000+0700`,overtimeKnown:true,overtime:false,...extra});
  const logs=[make('1','08:00',60),make('2','10:00',60),make('3','11:00',60),make('4','17:30',30,{overtime:true})];let mode='';
  await page.route('**/api?*',async route=>{
   const u=new URL(route.request().url()),a=u.searchParams.get('action');let data={ok:true},status=200;
   if(a==='status')data={ok:true,authenticated:true,user:{username:'boss',displayName:'Boss'}};
   if(a==='subtasks')data={ok:true,issues:[]};
   if(a==='worklog-history')data={ok:true,items:logs};
   if(a==='calendar-history')data={ok:true,readOnly:true,viewedUser:{key:'OTHER',username:'other',displayName:'Other User'},items:logs.map(x=>({...x,calendarReadOnly:true}))};
   if(a==='worklog-correction'){
    const body=route.request().postDataJSON();writes.push(body);const raw=logs.find(x=>x.id===body.worklogId);
    assert.equal(body.expectedSeconds,raw.timeSpentSeconds);assert.equal(body.expectedStarted,raw.started);
    if(mode==='denied'){status=403;data={ok:false,error:'Jira từ chối sửa worklog.'};}
    else {
     const secs=body.calendarEdit?body.targetSeconds:raw.timeSpentSeconds;
     Object.assign(raw,{...make(raw.id,body.start,secs/60,{overtime:raw.overtime}),date:body.date});
     if(mode==='lost'){await route.abort('failed');return;}
     data={ok:true,moved:true,resized:body.calendarEdit===true,worklogVerified:true,timeSpentSeconds:secs};
    }
   }
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:4217');await page.locator(mobile?'#mobileHistoryBtn':'#historyBtn').click();await page.waitForFunction(()=>state.historyLoaded&&!state.historyLoading&&!document.querySelector('#historyOverlay.qjl-opening'));
  const block=id=>page.locator(`[data-week-event]`).filter({has:page.locator('strong',{hasText:'CAL-'+id})});
  const reveal=async id=>page.evaluate(id=>{
   const el=[...document.querySelectorAll('[data-week-event]')].find(e=>calendarRenderedItems[Number(e.dataset.weekEvent)].id===id),r=document.getElementById('historyResults'),header=document.querySelector('.week-grid-heading');
   r.scrollLeft=0;const col=el.closest('.week-day-column');r.scrollTop=Math.max(0,parseFloat(el.style.top)||((QuickJiraDrafts.minute(calendarRenderedItems[Number(el.dataset.weekEvent)].start)-480)*parseFloat(document.querySelector('.weekly-inner').style.getPropertyValue('--week-minute-px')))-80);
   if(el.getBoundingClientRect().top<header.getBoundingClientRect().bottom)r.scrollTop=Math.max(0,r.scrollTop-70);
  },id);
  const hold=async id=>{
   if(!mobile||await page.evaluate(()=>calendarEditMode))return;
   await reveal(id);const r=await block(id).boundingBox(),session=await context.newCDPSession(page);
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+20,y:r.y+10}]});await page.waitForTimeout(620);
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
   assert.equal(await page.evaluate(()=>calendarEditMode),true);
  };
  const resize=async(id,end,{cancel=false,snapshot=false}={})=>{
   await hold(id);await reveal(id);await page.waitForTimeout(80);const h=block(id).locator('[data-calendar-resize]');await h.waitFor({state:'visible'});
   const points=await h.evaluate((el,end)=>{
    const r=el.getBoundingClientRect(),b=el.parentElement.getBoundingClientRect(),col=el.closest('.week-day-column'),c=col.getBoundingClientRect(),scale=c.height/Number(col.parentElement.dataset.minuteRange),y=r.y+r.height/2;
    const target=y+(end-(Number(col.dataset.fromMinute)+(b.bottom-c.top)/scale))*scale,area=document.getElementById('historyResults').getBoundingClientRect();
    return{x:r.x+r.width/2,y,to:Math.min(area.bottom-2,Math.max(area.top+40,target)),scroll:target>area.bottom-2};
   },end);
   let session;
   if(mobile){session=await context.newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:points.x,y:points.y}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:points.x,y:points.to}]});}
   else{await page.mouse.move(points.x,points.y);await page.mouse.down();await page.mouse.move(points.x,points.to,{steps:6});}
   if(points.scroll)await page.waitForFunction(end=>calendarGesture?.proposal?.changes?.[0]?.end===`${String(Math.floor(end/60)).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`,end);
   else await page.waitForTimeout(60);
   // Release at the observed snap promptly: extra protocol assertions here let
   // auto-scroll continue for several frames and overshoot the intended time.
   if(!points.scroll){assert.equal(await page.evaluate(()=>calendarGesture?.resize),true,'edge gesture stays a resize');assert.equal(await page.locator('.calendar-swap-layer').count(),0,'resize never starts a swap');}
   if(snapshot){
    assert((await page.locator('.calendar-drag-ghost').innerText()).includes('1h 30m'));
    assert((await page.locator('.calendar-drop-highlight').innerText()).includes('09:30'));
    if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`resize-preview-${viewport.width}.png`)});}
   }
   if(cancel==='viewport'){await page.setViewportSize({width:viewport.width-1,height:viewport.height});await page.waitForTimeout(80);await page.setViewportSize(viewport);await page.waitForTimeout(80);}
   else if(cancel){if(mobile)await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});else await page.keyboard.press('Escape');}
   if(mobile){if(!cancel)await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}else await page.mouse.up();
   await page.waitForTimeout(50);
  };
  const duration=()=>page.evaluate(()=>QuickJiraDrafts.seconds(calendarPreviewItems().find(x=>x.id==='1')));
  const save=async()=>{await page.locator('#calendarSaveBtn').click();await page.locator('#calendarConfirmSaveBtn').click();await page.waitForFunction(()=>!state.calendarMovePending&&!state.historyLoading);};
  // Opening details still avoids the keyboard; touch handles require edit mode.
  if(mobile)assert.equal(await block('1').locator('[data-calendar-resize]').isVisible(),false);
  await block('1').click({position:{x:20,y:10}});await page.waitForFunction(()=>document.getElementById('worklogCorrectionDialog').open);
  assert(!['INPUT','TEXTAREA'].includes(await page.evaluate(()=>document.activeElement.tagName)));await page.locator('#cancelCorrectionBtn').click();await page.waitForTimeout(260);
  await resize('1',570,{snapshot:true});assert.equal(await duration(),5400);assert.equal(logs[0].timeSpentSeconds,3600);assert.equal(writes.length,0);assert(await page.locator('#calendarSaveBtn').isVisible());
  await resize('1',540);assert.equal(await duration(),3600);assert.equal(await page.evaluate(()=>state.calendarDrafts.size),0,'back to original duration removes draft');
  await resize('1',570);await resize('1',630);assert.equal(await duration(),5400,'overlap keeps prior draft');assert((await page.locator('#calendarInteractionState').textContent()).includes('trùng'));
  await resize('1',480);assert.equal(await duration(),5400,'zero duration rejected');
  await resize('1',600,{cancel:true});assert.equal(await duration(),5400,'cancel preserves prior draft');
  await resize('1',600,{cancel:'viewport'});assert.equal(await duration(),5400,'viewport change cancels only the active resize');
  await resize('3',750);assert.equal(await page.evaluate(()=>state.calendarDrafts.size),1,'lunch crossing adds no draft');
  await page.locator('#calendarSaveBtn').click();assert((await page.locator('#calendarSaveList').innerText()).includes('1h 30m'));await page.locator('#calendarCancelSaveBtn').click();assert.equal(writes.length,0);
  await save();assert.equal(writes[0].calendarEdit,true);assert.equal(writes[0].targetSeconds,5400);assert.equal(logs[0].timeSpentSeconds,5400);assert.equal(await page.evaluate(()=>state.calendarDrafts.size),0);assert.equal(await page.locator('#calendarSaveBtn').isVisible(),false);assert((await page.locator('#toast').textContent()).includes('Lưu lịch thành công'));
  // Forbidden save stays as a draft; retry saves only after explicit confirmation.
  await resize('1',600);mode='denied';await save();assert.equal(await duration(),7200);assert.equal(logs[0].timeSpentSeconds,5400);assert(await page.locator('#calendarSaveError').isVisible());mode='';await page.locator('#calendarConfirmSaveBtn').click();await page.waitForFunction(()=>!state.calendarMovePending&&!state.historyLoading);assert.equal(logs[0].timeSpentSeconds,7200);
  // Lost response after commit is reconciled by reads, without a duplicate PATCH.
  await resize('1',510);mode='lost';await save();assert.equal(logs[0].timeSpentSeconds,1800);const count=writes.length;mode='';await page.locator('#calendarConfirmSaveBtn').click();await page.waitForFunction(()=>!state.calendarMovePending&&!document.getElementById('calendarSaveDialog').open);assert.equal(writes.length,count);assert.equal(await page.evaluate(()=>state.calendarDrafts.size),0);
  // Resize then move combines both targets, keeping the original stale-check snapshot.
  await resize('1',540);await page.evaluate(()=>stageCalendarMove(calendarPreviewItems().find(x=>x.id==='1'),{date:'2026-10-12',start:'13:30'}));
  await save();assert.equal(logs[0].start,'13:30');assert.equal(logs[0].timeSpentSeconds,3600);assert.equal(writes.at(-1).calendarEdit,true);assert.equal(writes.at(-1).expectedSeconds,1800);
  // Fullscreen keeps handles usable at the resized minute scale.
  await page.locator('#calendarFullscreenBtn').click();await page.waitForTimeout(180);await page.evaluate(()=>applyTheme('dark'));await resize('1',900);assert.equal(await duration(),5400);await save();assert.equal(logs[0].timeSpentSeconds,5400);
  // The late-day grid expands while dragging, allowing OT to grow past 18:00.
  await resize('4',1140);assert.equal(await page.evaluate(()=>QuickJiraDrafts.seconds(calendarPreviewItems().find(x=>x.id==='4'))),5400);
  assert.equal(logs[3].timeSpentSeconds,1800);assert.equal(await page.locator('.calendar-resize-extra-tick').count(),0);
  await resize('4',1080);assert.equal(await page.evaluate(()=>state.calendarDrafts.size),0,JSON.stringify(await page.evaluate(()=>({draft:[...state.calendarDrafts.values()],g:calendarGesture,range:document.querySelector('.week-grid-body').dataset.minuteRange,scale:document.querySelector('.weekly-inner').style.getPropertyValue('--week-minute-px')}))));
  await resize('4',1140);await save();assert.equal(logs[3].timeSpentSeconds,5400);assert.equal(logs[3].overtime,true);
  // An external Jira edit blocks the draft before PATCH and preserves that external value.
  await resize('1',930);const beforeStale=writes.length;Object.assign(logs[0],make('1','13:30',60));
  await save();assert.equal(writes.length,beforeStale);assert((await page.locator('#calendarSaveError').textContent()).includes('đã thay đổi'));
  await page.locator('#calendarDiscardBtn').click();await page.waitForFunction(()=>!state.historyLoading);assert.equal(logs[0].timeSpentSeconds,3600);
  await page.evaluate(u=>selectCalendarUser(u),{key:'OTHER',username:'other',displayName:'Other User'});await page.waitForFunction(()=>calendarReadOnly()&&!state.historyLoading);assert.equal(await page.locator('[data-calendar-resize]').count(),0);
  await page.locator('#calendarFullscreenBtn').click();await page.waitForFunction(()=>!calendarReadOnly()&&!state.historyLoading);
  assert.deepEqual(errors,[]);console.log('Resize gestures + live highlight, draft/revert/cancel/confirm, errors/reconcile, move composition, fullscreen and readonly passed',viewport);await context.close();
 }
 await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);server.close();process.exit(1);});
