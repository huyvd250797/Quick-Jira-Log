'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright'),{server}=require('./serve.cjs');
(async()=>{
 await new Promise(r=>server.listen(4228,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({headless:true,executablePath:process.env.QJL_CHROMIUM_PATH,args:['--no-sandbox']});
 for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:683},{width:844,height:390}]){
  const context=await browser.newContext({viewport,hasTouch:viewport.width<900,serviceWorkers:'block'}),page=await context.newPage(),errors=[],writes=[];let mode='confirmed';
  page.on('pageerror',e=>errors.push(e.message));
  const issue={key:'CAL-1',summary:'Công việc thử nghiệm',project:{key:'CAL',name:'Dự án'},issueType:{name:'Story',id:'1'},status:{name:'Doing',id:'3',category:'indeterminate'},assignee:{username:'boss',displayName:'Boss'},priority:'High',parent:'',updated:'2026-10-22T08:00:00.000+0700',url:'https://task.ascvn.com.vn/browse/CAL-1',description:{text:'h2. Nội dung',truncated:false}};
  const options={ok:true,key:'CAL-1',updated:issue.updated,current:{statusId:'3',priorityId:'2',assignee:issue.assignee},canComment:true,canAssign:true,canUnassign:true,priorities:[{id:'1',name:'Highest'},{id:'2',name:'High'}],transitions:[{id:'10',name:'Start',to:{id:'4',name:'Doing'},required:[],supported:true},{id:'20',name:'Resolve',to:{id:'5',name:'Done'},required:[{id:'resolution',name:'Resolution'}],supported:false}],warnings:[]};
  await page.route('**/api?*',async route=>{const req=route.request(),u=new URL(req.url()),a=u.searchParams.get('action');let data={ok:true};
   if(a==='status')data={ok:true,authenticated:true,user:{username:'boss',displayName:'Boss'}};
   if(a==='subtasks')data={ok:true,issues:[]};if(a==='worklog-history')data={ok:true,items:[],skipped:[]};if(a==='day-audit')data={ok:true,occupied:[],available:[]};
   if(a==='jira-search-options')data={ok:true,projects:[],types:[],statuses:[],warnings:[]};
   if(a==='jira-search')data={ok:true,issues:[issue],total:1,nextStartAt:1,hasMore:false};if(a==='jira-issue')data={ok:true,issue};
   if(a==='jira-update-options')data=options;
   if(a==='jira-update-users')data={ok:true,users:[{username:'alice',displayName:'Alice <img src=x>'}]};
   if(a==='jira-comments'){const offset=Number(u.searchParams.get('startAt')||0);data={ok:true,items:Array.from({length:offset?1:25},(_,i)=>({id:String(offset+i),author:{displayName:'Boss'},created:issue.updated,body:{text:'Bình luận <script>raw</script>',truncated:false}})),total:26,nextStartAt:offset+(offset?1:25),hasMore:!offset};}
   if(a==='jira-update'){writes.push(JSON.parse(req.postData()));data={ok:true,outcome:mode,message:mode==='confirmed'?'Đã lưu và xác nhận trên Jira.':'Chưa xác định kết quả. Kiểm tra Jira.'};}
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  const idle=()=>page.waitForFunction(()=>!QuickJiraBusy.active);
  await page.goto('http://127.0.0.1:4228');await page.waitForFunction(()=>!QuickJiraBusy.active&&!document.body.classList.contains('booting'));
  await page.locator(viewport.width<900?'#mobileJiraSearchBtn':'#jiraSearchBtn').click();await idle();await page.locator('#jiraQuery').fill('CAL-1');await page.locator('#jiraSearchForm button[type=submit]').click();await idle();await page.locator('.jira-issue-card').click();await idle();
  await page.locator('#jiraDetailUpdateBtn').click();await idle();assert(await page.locator('#jiraQuickEditDialog').evaluate(e=>e.open));assert(!await page.locator('#jiraEditPersonQuery').evaluate(e=>e===document.activeElement));
  await page.locator('#jiraEditTransition').selectOption('20');await page.locator('#jiraEditSubmitBtn').click();assert.equal(writes.length,0);assert((await page.locator('#jiraEditState').textContent()).includes('Resolution'));
  await page.locator('#jiraEditKind').selectOption('priority');await page.locator('#jiraEditPriority').selectOption('1');await page.locator('#jiraEditSubmitBtn').click();assert.equal(writes.length,0);assert((await page.locator('#jiraUpdateConfirmSummary').textContent()).includes('Highest'));
  await page.locator('#jiraUpdateCancelBtn').click();assert.equal(writes.length,0);await page.locator('#jiraEditSubmitBtn').click();await page.locator('#jiraUpdateConfirmBtn').click();await idle();assert.equal(writes.length,1);assert.equal(writes[0].kind,'priority');assert.equal(writes[0].value,'1');
  await page.locator('#jiraDetailUpdateBtn').click();await idle();await page.locator('#jiraEditKind').selectOption('assignee');await page.locator('#jiraEditPersonQuery').fill('ali');await page.locator('#jiraEditPersonFindBtn').click();await idle();assert.equal(await page.locator('#jiraEditPeople img').count(),0);await page.locator('#jiraEditPeople button').first().click();await page.locator('#jiraEditSubmitBtn').click();await page.locator('#jiraUpdateConfirmBtn').click();await idle();assert.equal(writes[1].value,'alice');
  await page.locator('#jiraTab-comments').click();await idle();assert.equal(await page.locator('#jiraCommentList article').count(),25);assert.equal(await page.locator('#jiraCommentList script').count(),0);await page.locator('#jiraCommentsMoreBtn').click();await idle();assert.equal(await page.locator('#jiraCommentList article').count(),26);
  await page.locator('#jiraCommentText').fill('Bình luận mới <script>text</script>');await page.locator('#jiraCommentSendBtn').click();assert.equal(writes.length,2);await page.locator('#jiraUpdateConfirmBtn').click();await idle();assert.equal(writes[2].kind,'comment');assert.equal(await page.locator('#jiraCommentText').inputValue(),'');
  mode='unknown';await page.locator('#jiraCommentText').fill('Mất phản hồi');await page.locator('#jiraCommentSendBtn').click();await page.locator('#jiraUpdateConfirmBtn').click();await idle();assert.equal(writes.length,4);assert(await page.locator('#jiraCommentSendBtn').isDisabled());assert(await page.locator('#jiraActionResolveBtn').isVisible());assert.equal(await page.locator('#jiraCommentText').inputValue(),'Mất phản hồi');
  const fit=await page.evaluate(()=>{const d=document.getElementById('jiraIssuePeekDialog'),r=d.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;});assert(fit);assert.deepEqual(errors,[]);await context.close();console.log('Quick update UI passed',viewport);
 }
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
