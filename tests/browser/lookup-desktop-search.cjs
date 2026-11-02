'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright'),{server}=require('./serve.cjs');
(async()=>{
 await new Promise(r=>server.listen(4267,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.QJL_CHROMIUM_PATH,args:['--no-sandbox']});
 try{for(const viewport of [{width:1920,height:1080},{width:1366,height:768},{width:1024,height:768},{width:390,height:844},{width:320,height:683},{width:844,height:390}]){
  const c=await browser.newContext({viewport,serviceWorkers:'block'}),p=await c.newPage(),errors=[],calls=[];let fail=false,hold=false,releases=[];
  const issue=(n,type='Story')=>({key:'CAL-'+n,summary:'Quản lý hồ sơ — Công việc có nội dung dài để kiểm tra danh sách trên máy tính '+n,project:{key:'CAL',name:'Project'},issueType:{id:type==='Epic'?'10':'1',name:type,subtask:false},isEpic:type==='Epic',status:{id:'3',name:'In Progress',category:'indeterminate'},assignee:{username:'boss',displayName:'Thành viên kiểm thử'},priority:'Medium',updated:'2026-10-22T08:00:00+0700',parent:'',url:'https://task.ascvn.com.vn/browse/CAL-'+n,description:{text:'Mô tả'}});
  p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/api?*',async route=>{
   const q=new URL(route.request().url()).searchParams,a=q.get('action');calls.push({a,...Object.fromEntries(q)});let d={ok:true},status=200;
   if(a==='status')d={ok:true,authenticated:true,user:{username:'boss'}};
   if(a==='subtasks')d={ok:true,issues:[]};if(a==='worklog-history')d={ok:true,items:[]};
   if(a==='jira-search-options')d={ok:true,projects:[{key:'CAL',name:'Project'}],types:[],statuses:[{id:'3',name:'In Progress'}],warnings:[]};
   if(a==='jira-working-tree'){
    const start=Number(q.get('startAt')),query=q.get('q')||'',epic=q.get('kind')==='epics';
    if(hold&&query==='old'&&start===125)await new Promise(r=>releases.push(r));
    if(fail&&start===125){status=503;d={ok:false,error:'Fixture lỗi trang sau'};}
    else if(query){const n=start===0?1:start===125?32:151;d={ok:true,issues:[issue(query==='new'?999:n,epic?'Epic':'Story')],total:300,nextStartAt:start===0?125:start===125?250:300,hasMore:query!=='new'&&start<250,filtered:true};}
    else d={ok:true,issues:Array.from({length:start?5:25},(_,i)=>issue(start+i+1,epic?'Epic':'Story')),total:30,nextStartAt:start+(start?5:25),hasMore:!start};
   }
   if(a==='jira-search')d={ok:true,issues:Array.from({length:25},(_,i)=>issue(i+1)),total:25,nextStartAt:25,hasMore:false};
   if(a==='jira-saved-filters')d={ok:true,filters:[{id:'12',name:'Project filter',favourite:true}],warnings:[]};
   if(a==='jira-filter-issues')d={ok:true,issues:Array.from({length:25},(_,i)=>issue(i+1)),total:25,nextStartAt:25,hasMore:false,revision:'one',filter:{name:'Project filter'}};
   if(a==='jira-issue')d={ok:true,issue:issue(Number(q.get('key').split('-')[1]))};
   try{await route.fulfill({status,contentType:'application/json',body:JSON.stringify(d)});}catch(e){if(!route.request().failure())throw e;}
  });
  const idle=()=>p.waitForFunction(()=>!QuickJiraBusy.count&&!QuickJiraBusy.active);
  const done=target=>p.waitForFunction(id=>document.getElementById(id).getAttribute('aria-busy')!=='true'&&document.getElementById(id).textContent.includes('Đã tìm xong'),target);
  await p.goto('http://127.0.0.1:4267');await p.waitForFunction(()=>state.user&&!document.body.classList.contains('booting'));await idle();await p.locator(viewport.width<900?'#mobileJiraSearchBtn':'#jiraSearchBtn').click();await idle();
  assert.equal(await p.locator('#jiraSearchFilters').evaluate(n=>n.open),false);
  if(viewport.width>=900){const frame=await p.locator('#jiraSearchDialog').boundingBox();assert(frame.width>=viewport.width-36);assert(frame.height>=viewport.height-36);}
  await p.locator('#jiraQuery').fill('Công việc');await p.locator('#jiraSearchForm button[type=submit]').click();await idle();assert.equal(await p.locator('.jira-issue-card').count(),25);
  const checkPane=async selector=>{const size=await p.locator(selector).boundingBox(),box=await p.locator('#jiraSearchDialog').boundingBox();if(viewport.width>=900)assert(size.height>box.height*.65,JSON.stringify({selector,size,box}));};
  await checkPane('#jiraSearchResultsPane');
  if(viewport.width>=900){await p.locator('#jiraSearchFilters summary').click();assert(await p.locator('#jiraStatus').isVisible());await p.locator('#jiraSearchFilters summary').click();}
  await p.locator('#jiraFilterModeBtn').click();await idle();await p.locator('#jiraSavedSelect').selectOption('12');await idle();assert.equal(await p.locator('.jira-issue-card').count(),25);assert(await p.locator('#jiraFilterTools').isHidden());await checkPane('#jiraSearchResultsPane');
  await p.locator('#jiraTreeModeBtn').click();await p.locator('#jiraTreeProject').fill('CAL');await p.locator('#jiraTreeFind').click();await idle();await checkPane('#jiraTreeBody');
  if(viewport.width<900){const metrics=()=>p.evaluate(()=>Object.fromEntries(['jiraSearchDialog','jiraTreeForm','jiraTreeBody'].map(id=>{const n=document.getElementById(id),b=n.getBoundingClientRect();return [id,[b.x,b.y,b.width,b.height]];})));const before=await metrics();await p.locator('link[href="/desktop-lookup.css"]').evaluate(n=>n.disabled=true);const after=await metrics();for(const id of Object.keys(before))for(let i=0;i<4;i++)assert(Math.abs(before[id][i]-after[id][i])<1,'Desktop rules leave mobile unchanged');await p.locator('link[href="/desktop-lookup.css"]').evaluate(n=>n.disabled=false);}
  const initial=calls.length;await p.locator('#jiraTreeQuery').fill('QUAN ho');await done('jiraTreeBody');assert.equal(await p.locator('#jiraTreeBody .wt-node').count(),3);assert.deepEqual(calls.slice(initial).filter(x=>x.a==='jira-working-tree').map(x=>x.startAt),['0','125','250']);assert.equal(await p.locator('#jiraTreeBody .wt-more').count(),0,'Search completes without pressing Find again');
  await p.locator('#jiraTreeBody .wt-open').first().click();await idle();await p.locator('#jiraEpicQuery').fill('quan HO');await done('jiraEpicList');assert.equal(await p.locator('#jiraEpicList .wt-node').count(),3);assert.equal(await p.locator('#jiraEpicList .wt-more').count(),0);
  for(const theme of ['light','dark']){await p.evaluate(t=>document.documentElement.dataset.theme=t,theme);await p.waitForTimeout(200);const fit=await p.locator('#jiraEpicDialog').evaluate(n=>{const b=n.getBoundingClientRect(),list=document.getElementById('jiraEpicList').getBoundingClientRect();return {fit:n.scrollWidth<=n.clientWidth+1&&b.right<=innerWidth+1&&b.bottom<=innerHeight+1,ratio:list.height/b.height};});assert(fit.fit);if(viewport.width>=900)assert(fit.ratio>.65,JSON.stringify(fit));await p.screenshot({path:`/tmp/1372-epic-${viewport.width}-${theme}.png`});}
  await p.locator('#jiraEpicClose').click();await p.waitForTimeout(120);
  fail=true;await p.locator('#jiraTreeQuery').fill('retry');await p.waitForFunction(()=>document.getElementById('jiraTreeBody').textContent.includes('Chưa đọc hết'));assert.equal(await p.locator('#jiraTreeBody .wt-node').count(),1);fail=false;const failed=calls.length;await p.locator('#jiraTreeBody .wt-scan-progress button').click();await done('jiraTreeBody');assert.equal(calls.slice(failed).find(x=>x.a==='jira-working-tree').startAt,'125');assert.equal(await p.locator('#jiraTreeBody .wt-node').count(),3);
  hold=true;await p.locator('#jiraTreeQuery').fill('old');await p.waitForFunction(()=>document.getElementById('jiraTreeBody').textContent.includes('Đã đọc 125/300'));await p.locator('#jiraTreeQuery').fill('new');await done('jiraTreeBody');for(const r of releases.splice(0))r();hold=false;await p.waitForTimeout(120);assert.deepEqual(await p.locator('#jiraTreeBody .wt-node').evaluateAll(ns=>ns.map(n=>n.dataset.key)),['CAL-999'],'A cancelled old search never appends to a new query');
  await p.locator('#jiraTreeQuery').fill('');await p.waitForFunction(()=>document.querySelectorAll('#jiraTreeBody .wt-node').length===25&&document.getElementById('jiraTreeBody').getAttribute('aria-busy')!=='true');
  await p.screenshot({path:`/tmp/1372-tree-${viewport.width}.png`});assert(await p.locator('#jiraSearchDialog').evaluate(n=>n.scrollWidth<=n.clientWidth+1));
  assert.deepEqual(errors,[]);await c.close();console.log('Automatic search all pages/retry/stale query; desktop list area and mobile CSS isolation passed',viewport);
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
