'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright'),{server}=require('./serve.cjs');
const core=require('../../lib/project-stats');
(async()=>{
 await new Promise(r=>server.listen(4266,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.QJL_CHROMIUM_PATH,args:['--no-sandbox']});
 try{for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:683},{width:844,height:390}]){
  const c=await browser.newContext({viewport,hasTouch:viewport.width<900,serviceWorkers:'block'}),p=await c.newPage(),errors=[],calls=[];let denied=false;
  p.on('pageerror',e=>errors.push(e.message));
  const entry=(id,key,date,authorId,authorName,seconds)=>({id,key,date:date.slice(0,10),start:date,authorId,authorName,authorUsername:authorId,seconds,overtime:false,overtimeKnown:false,description:'Fixture'});
  const logs={
   'CAL-1':[entry('11','CAL-1','2020-01-01T08:00:00+0700','old','Người log cũ',1800),entry('12','CAL-1','2026-10-22T08:00:00+0700','huyvd','Nguyễn Đức Huy',28800)],
   'CAL-2':[entry('21','CAL-2','2026-10-22T08:00:00+0700','anvo','Võ Bình An',14400),entry('22','CAL-2','2019-03-01T08:30:00+0700','first-user','Đặng An — Người đầu tiên',1800)],
   'CAL-3':[entry('31','CAL-3','2010-01-01T08:00:00+0700','parent','Parent earlier',1800),entry('32','CAL-3','2026-10-22T13:30:00+0700','huyvd','Nguyễn Đức Huy',14400)]
  };
  await p.route('**/api?*',async route=>{
   const q=new URL(route.request().url()).searchParams,a=q.get('action');calls.push(Object.fromEntries(q));let data={ok:true},status=200;
   if(a==='status')data={ok:true,authenticated:true,user:{username:'boss'}};
   if(a==='subtasks')data={ok:true,issues:[]};if(a==='worklog-history')data={ok:true,items:[]};
   if(a==='jira-search-options')data={ok:true,projects:[{key:'CAL',name:'Dự án kiểm thử'}],types:[],statuses:[],warnings:[]};
   if(a==='project-stats'){
    const op=q.get('op');
    if(op==='issues')data={ok:true,total:3,nextStartAt:3,hasMore:false,issues:[1,2,3].map(n=>({key:'CAL-'+n,project:'CAL',summary:'Công việc '+n,isSubtask:n<3,issueType:n<3?'Subtask':'Story',issueTypeId:n<3?'5':'1'}))};
    if(op==='worklogs'){
     const key=q.get('key'),offset=Number(q.get('startAt'));
     if(denied&&key==='CAL-2'){status=403;data={ok:false,error:'Không có quyền đọc CAL-2'};}
     else{const raw=logs[key].slice(offset,offset+1),items=raw.filter(x=>q.get('all')==='1'||x.date>=q.get('from')&&x.date<=q.get('to'));
      data={ok:true,key,items,firstWorklog:raw.reduce(core.firstWorklog,null),ids:raw.map(x=>x.id),total:2,nextStartAt:offset+raw.length,hasMore:offset+raw.length<2};}
    }
    if(op==='overtime')data={ok:true,reader:'native',items:q.get('ids').split(',').map(id=>({id,overtime:id==='21',overtimeKnown:true}))};
   }
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  const idle=()=>p.waitForFunction(()=>!QuickJiraBusy.count&&!QuickJiraBusy.active&&!QuickJiraProjectReport.restoring);
  const loaded=async()=>{await p.waitForTimeout(120);await p.waitForFunction(()=>!QuickJiraProjectReport.running&&!QuickJiraProjectReport.restoring&&!!document.querySelector('#psKpis article'));};
  await p.goto('http://127.0.0.1:4266');await p.waitForFunction(()=>state.user&&!document.body.classList.contains('booting'));await idle();
  await p.evaluate(()=>QuickJiraProjectReport.open());await idle();
  await p.locator('#psScope').selectOption('one');await p.locator('#psProject').fill('CAL');await p.locator('#psPeriod').selectOption('custom');await p.locator('#psFrom').fill('2026-10-01');await p.locator('#psTo').fill('2026-10-31');await p.locator('#psLoad').click();await loaded();
  assert.deepEqual(await p.locator('#psKpis article strong').allTextContents(),['16h','2','2','2']);
  const first=await p.locator('#psFirstLog').innerText();assert.match(first,/01\/03\/2019/);assert.match(first,/08:30/);assert.match(first,/Đặng An/);assert.match(first,/CAL-2/);assert(!first.includes('2010'));assert(!first.includes('Tạm tính'));
  const cards=await p.locator('#psKpis article').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().y));assert(cards.every(y=>Math.abs(y-cards[0])<1),'Four KPIs stay on one row');
  if(viewport.width>900){const ys=await p.locator('.ps-list-tools').evaluate(n=>[n.querySelector('.ps-member-field').offsetTop,n.querySelector('#psFirstLog').offsetTop]);assert(Math.abs(ys[0]-ys[1])<3);}
  await p.locator('#psPersonQuery').fill('nguyen huy');assert.equal(await p.locator('#psMemberOptions [role=option]').count(),2);await p.locator('#psPersonQuery').press('ArrowDown');await p.locator('#psPersonQuery').press('ArrowDown');await p.locator('#psPersonQuery').press('Enter');assert.equal(await p.locator('.ps-person').count(),1);assert.equal(await p.locator('#psPerson').inputValue(),'huyvd');assert.equal(await p.locator('#psFirstLog').innerText(),first,'Member filter does not change project start');
  await p.locator('#psPersonClear').click();assert.equal(await p.locator('.ps-person').count(),2);
  const count=calls.length;await p.locator('#psPersonQuery').fill('ANVO');await p.locator('#psMemberOptions [data-member-index="1"]').click();assert.equal(await p.locator('#psPerson').inputValue(),'anvo');assert.equal(calls.length,count,'Member search is local, no added Jira requests');
  await p.locator('#psPersonQuery').fill('<script>');assert.match(await p.locator('#psMemberOptions').innerText(),/Không tìm thấy/);assert.equal(await p.locator('#psMemberOptions script').count(),0);await p.locator('#psPersonQuery').press('Escape');assert.equal(await p.locator('#psPersonQuery').inputValue(),'Võ Bình An');
  await p.waitForTimeout(100);await p.reload();await idle();await p.waitForSelector('#psKpis article');assert.equal(await p.locator('#psPerson').inputValue(),'anvo');assert.equal(await p.locator('.ps-person').count(),1);assert.equal(await p.locator('#psFirstLog').innerText(),first,'All-time earliest survives checkpoints');
  await p.locator('#psPersonClear').click();await p.locator('#psFrom').fill('2026-11-01');await p.locator('#psTo').fill('2026-11-30');await p.locator('#psLoad').click();await loaded();assert.equal(await p.locator('#psKpis article strong').first().innerText(),'0h');assert.equal(await p.locator('#psFirstLog').innerText(),first,'Empty reporting period still has all-time first');
  await p.locator('#psFrom').fill('2026-10-01');await p.locator('#psTo').fill('2026-10-31');denied=true;await p.locator('#psLoad').click();await loaded();assert.match(await p.locator('#psFirstLog').innerText(),/Tạm tính/);assert.match(await p.locator('#psFirstLog').innerText(),/CAL-1/);denied=false;await p.locator('#psRetry').click();await loaded();assert.equal(await p.locator('#psFirstLog').innerText(),first);
  for(const theme of ['light','dark']){await p.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   await p.waitForTimeout(350);
   const tint=await p.locator('#psKpis article').first().evaluate(n=>getComputedStyle(n).backgroundColor);
   assert.equal(tint,theme==='dark'?'rgb(27, 53, 85)':'rgb(237, 243, 253)','Original KPI tint is restored');
   if(viewport.width<900){const label=await p.locator('#psKpis article').nth(1).locator('small').evaluate(n=>{const t=n.firstChild,r=document.createRange();r.selectNodeContents(t);return {first:r.getBoundingClientRect().top,unit:n.querySelector('.ps-md-unit').getBoundingClientRect().top,unitHeight:n.querySelector('.ps-md-unit').getBoundingClientRect().height,line:parseFloat(getComputedStyle(n).lineHeight)};});assert(label.unit>label.first);assert(label.unitHeight<label.line+2,'Man-days stays on one line below Ngày');}
   for(const number of ['1.202,95','12.345.678,95','0,05','1.202,9','123']){
    await p.evaluate(number=>{window.qaOriginalManDays||=QuickJiraProjectStats.manDays;QuickJiraProjectStats.manDays=()=>number;document.getElementById('psSort').dispatchEvent(new Event('change'));},number);
    const value=await p.locator('#psKpis article').nth(1).locator('strong').evaluate(n=>{const first=n.querySelector('.ps-kpi-part'),fraction=n.querySelector('.ps-kpi-fraction'),b=n.getBoundingClientRect(),a=first.getBoundingClientRect();let digitLines=[];if(fraction){const t=fraction.firstChild;for(let i=0;i<t.length;i++){const r=document.createRange();r.setStart(t,i);r.setEnd(t,i+1);digitLines.push(r.getBoundingClientRect().top);}}return {text:n.textContent,first:first.textContent,top:a.top,fractionTop:fraction?.getBoundingClientRect().top,digitLines,fit:n.scrollWidth<=n.clientWidth+1,integerFits:a.width<=b.width+1};});
    if(number==='1.202,95'&&viewport.width<=600&&theme==='dark')await p.screenshot({path:`/tmp/1371-decimal-${viewport.width}.png`});
    assert.equal(value.text,number);assert(value.fit&&value.integerFits,'Large values keep all digits inside the card');if(number.includes(',')){assert(value.first.endsWith(','));assert(value.digitLines.every(y=>Math.abs(y-value.digitLines[0])<1),'The entire fraction remains on one line');if(viewport.width<=600&&number==='1.202,95')assert(value.fractionTop>value.top,'Narrow cards break after the decimal comma');}
   }
   await p.evaluate(()=>{QuickJiraProjectStats.manDays=window.qaOriginalManDays;delete window.qaOriginalManDays;document.getElementById('psSort').dispatchEvent(new Event('change'));});
await p.locator('#psPersonQuery').click();await p.locator('#psPersonQuery').fill('');const bounds=await p.locator('#psMemberOptions').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=viewport.width+1);assert(bounds.y>=0&&bounds.y+bounds.height<=viewport.height+1,'Member options stay in view');await p.locator('#psPersonQuery').press('Escape');assert(await p.locator('#projectStatsDialog').evaluate(n=>n.scrollWidth<=n.clientWidth+1));assert(await p.locator('#psSort').evaluate(n=>getComputedStyle(n).borderTopStyle==='solid'&&n.getBoundingClientRect().height===44));await p.waitForTimeout(350);await p.screenshot({path:`/tmp/1371-stats-${viewport.width}-${theme}.png`});}
  if(viewport.width===390){await p.evaluate(async()=>{const s=await QuickJiraReportStorage.load('boss');await QuickJiraReportStorage.commit('boss',s.meta.runID,null,{firstLogSchema:0});});await p.reload();await idle();assert.match(await p.locator('#psFirstLog').innerText(),/Cập nhật thống kê/);}
  assert.deepEqual(errors,[]);await c.close();console.log('Project insights KPI/search/first-log/page/reload/partial/empty/layout passed',viewport);
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
