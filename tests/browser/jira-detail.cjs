'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright'),{server}=require('./serve.cjs');
(async()=>{
 await new Promise(r=>server.listen(4227,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.QJL_CHROMIUM_PATH,args:['--no-sandbox']});
 try{for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:683},{width:844,height:390}]){
  const context=await browser.newContext({viewport,hasTouch:viewport.width<900,serviceWorkers:'block'}),page=await context.newPage(),errors=[],requests=[];let denied=false;
  page.on('pageerror',e=>errors.push(e.message));
  const issue=n=>({key:`CAL-${n}`,summary:'Công việc chi tiết <img src=x onerror=alert(1)>',project:{key:'CAL',name:'Dự án'},issueType:{id:n===1?'1':'5',name:n===1?'Story':'Sub-task',subtask:n!==1},status:{id:'3',name:'Doing',category:'indeterminate'},assignee:{username:'boss',displayName:'Boss'},priority:'High',parent:n===1?'':'CAL-1',updated:'2026-10-22T08:00:00.000+0700',url:`https://task.ascvn.com.vn/browse/CAL-${n}`});
  await page.route('**/api?*',async route=>{const u=new URL(route.request().url()),a=u.searchParams.get('action');requests.push({a,method:route.request().method()});let data={ok:true},status=200;
   if(a==='status')data={ok:true,authenticated:true,user:{username:'boss',displayName:'Boss'}};
   if(a==='subtasks')data={ok:true,issues:[{...issue(2),project:'CAL'}]};if(a==='worklog-history')data={ok:true,items:[],skipped:[]};if(a==='day-audit')data={ok:true,occupied:[],available:[]};
   if(a==='jira-search-options')data={ok:true,projects:[],types:[],statuses:[],warnings:[]};
   if(a==='jira-search')data={ok:true,issues:Array.from({length:25},(_,i)=>issue(i+1)),total:25,nextStartAt:25,hasMore:false};
   if(a==='jira-issue')data={ok:true,issue:{...issue(Number(u.searchParams.get('key').split('-')[1])),description:{text:'h2. Mô tả\n||A||B||\n|Một|Hai|\n[An toàn|https://example.com]\n<script>raw</script>\n'+('Nội dung dài\n'.repeat(100)),truncated:false}}};
   if(a==='jira-issue-subtasks'){const startAt=Number(u.searchParams.get('startAt')||0);data={ok:true,items:Array.from({length:startAt?1:25},(_,i)=>issue(startAt+i+2)),total:26,nextStartAt:startAt+(startAt?1:25),hasMore:!startAt};}
   if(a==='jira-issue-worklogs'){if(denied){status=403;data={ok:false,error:'Không có quyền đọc worklog.'};}else{const startAt=Number(u.searchParams.get('startAt')||0);data={ok:true,items:Array.from({length:startAt?1:25},(_,i)=>({id:String(startAt+i),started:'2026-10-22T08:00:00.000+0700',timeSpentSeconds:3661,author:{displayName:'Boss'},comment:{text:'*Đã làm* <img src=x>',truncated:false}})),total:26,nextStartAt:startAt+(startAt?1:25),hasMore:!startAt};}}
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:4227');await page.waitForFunction(()=>!QuickJiraBusy.active&&!document.body.classList.contains('booting'));
  await page.locator(viewport.width<900?'#mobileJiraSearchBtn':'#jiraSearchBtn').click();await page.waitForFunction(()=>document.getElementById('jiraSearchDialog').open&&!QuickJiraBusy.active);
  await page.locator('#jiraQuery').fill('Công việc');await page.locator('#jiraSearchForm button[type=submit]').click();await page.waitForFunction(()=>!QuickJiraBusy.active);
  await page.locator('.jira-issue-card').first().click();await page.waitForFunction(()=>document.getElementById('jiraIssuePeekDialog').open&&!QuickJiraBusy.active);
  assert.equal(await page.locator('#jiraIssueDescription table').count(),1);assert.equal(await page.locator('#jiraIssueDescription script,#jiraIssueDescription img,#jiraIssuePeekTitle img').count(),0);assert.equal(requests.filter(x=>x.a==='jira-issue-worklogs'||x.a==='jira-issue-subtasks').length,0,'Child data is lazy');
  await page.locator('#jiraTab-subtasks').click();await page.waitForFunction(()=>!QuickJiraBusy.active);assert.equal(await page.locator('.jira-subtask').count(),25);await page.locator('#jiraSubtasksMoreBtn').click();await page.waitForFunction(()=>!QuickJiraBusy.active);assert.equal(await page.locator('.jira-subtask').count(),26);
  await page.locator('.jira-subtask').first().click();await page.waitForFunction(()=>document.getElementById('jiraIssuePeekKey').textContent==='CAL-2'&&!QuickJiraBusy.active);assert(await page.locator('#jiraDetailBackBtn').isVisible());assert(await page.locator('#jiraDetailParentBtn').isVisible());assert(await page.locator('#jiraDetailLogBtn').isVisible());
  await page.locator('#jiraDetailBackBtn').click();await page.waitForFunction(()=>document.getElementById('jiraIssuePeekKey').textContent==='CAL-1'&&!QuickJiraBusy.active);
  denied=true;await page.locator('#jiraTab-worklogs').click();await page.waitForFunction(()=>!QuickJiraBusy.active);assert((await page.locator('#jiraDetailNotice').textContent()).includes('quyền'));assert.equal(await page.locator('.jira-worklog').count(),0);
  await page.locator('#jiraTab-description').click();assert(await page.locator('#jiraIssueDescription').isVisible());await page.locator('#jiraTab-worklogs').click();await page.waitForFunction(()=>!QuickJiraBusy.active);denied=false;await page.locator('#jiraDetailRetryBtn').click();await page.waitForFunction(()=>!QuickJiraBusy.active);assert.equal(await page.locator('.jira-worklog').count(),25);assert((await page.locator('.jira-worklog-head').first().textContent()).includes('1h 1m 1s'));
  await page.locator('#jiraWorklogsMoreBtn').click();await page.waitForFunction(()=>!QuickJiraBusy.active);assert.equal(await page.locator('.jira-worklog').count(),26);assert.equal(await page.locator('#jiraWorklogList img').count(),0);
  const geometry=await page.evaluate(()=>{const d=document.getElementById('jiraIssuePeekDialog'),r=d.getBoundingClientRect(),b=document.getElementById('jiraDetailBody');return r.left>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&b.clientHeight>0&&b.scrollWidth<=b.clientWidth+1;});assert(geometry,'Detail must fit viewport with scrollable body');
  await page.locator('#jiraIssuePeekCloseBtn').click();assert.equal(await page.locator('.jira-issue-card').count(),25,'Closing retains search list');
  await page.locator('.jira-issue-card').nth(1).click();await page.waitForFunction(()=>document.getElementById('jiraIssuePeekKey').textContent==='CAL-2'&&!QuickJiraBusy.active);await page.locator('#jiraDetailLogBtn').click();await page.waitForFunction(()=>!QuickJiraBusy.active);assert.equal(await page.locator('#key').inputValue(),'CAL-2');assert.equal(await page.locator('#jiraIssuePeekDialog').evaluate(e=>e.open),false);
  assert(requests.every(x=>x.method==='GET'),'Viewing/preparing log form performs no write');assert.deepEqual(errors,[]);await context.close();console.log('Issue detail UI passed',viewport);
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
