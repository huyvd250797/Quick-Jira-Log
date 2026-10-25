'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright'),{server}=require('./serve.cjs');
(async()=>{
 await new Promise(r=>server.listen(4255,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.QJL_CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox']});
 try{for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:683},{width:844,height:390}]){
 const ctx=await browser.newContext({viewport,serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];let denied=false,contextParent='';page.on('pageerror',e=>errors.push(e.message));
 const issue=(key,type='Story')=>({key,summary:'Kiểm tra <script>literal</script> '+ 'Nội dung dài '.repeat(8),project:{key:'EPU01',name:'Điện lực'},issueType:{id:type==='Epic'?'10':type==='Story'?'1':'5',name:type,subtask:type==='Sub-task'},status:{name:'Done',category:'done'},assignee:{displayName:'Boss'},url:'https://task.ascvn.com.vn/browse/'+key,description:{text:'Mô tả',truncated:false},epic:type==='Story'?'EPU01-1':''});
 await page.route('**/api?*',async route=>{const u=new URL(route.request().url()),a=u.searchParams.get('action');let data={ok:true},status=200;
 if(a==='status')data={ok:true,authenticated:true,user:{username:'boss',displayName:'Boss'}};
 if(a==='subtasks')data={ok:true,issues:[]};if(a==='worklog-history')data={ok:true,items:[],skipped:[]};if(a==='day-audit')data={ok:true,occupied:[],available:[]};
 if(a==='jira-search-options')data={ok:true,projects:[{key:'EPU01',name:'Điện lực'}],statuses:[],types:[],warnings:[]};
 if(a==='jira-working-tree'){await new Promise(r=>setTimeout(r,100));const kind=u.searchParams.get('kind'),offset=Number(u.searchParams.get('startAt'));if(denied){status=403;data={ok:false,error:'Không có quyền xem nhánh.'};}else data={ok:true,source:'jira',issues:kind==='epics'?[issue(offset?'EPU01-3':'EPU01-1','Epic')]:kind==='subtasks'?[issue('EPU01-9','Sub-task')]:[issue('EPU01-2')],total:kind==='epics'?2:1,nextStartAt:offset+1,hasMore:kind==='epics'&&!offset};}
 if(a==='jira-issue')data={ok:true,issue:issue(u.searchParams.get('key'))};
 if(a==='jira-create-subtask-context'){contextParent=u.searchParams.get('parent')||u.searchParams.get('key');status=403;data={ok:false,error:'Fixture: tạo theo quyền Jira.'};}
 await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('http://127.0.0.1:4255');await page.waitForFunction(()=>!QuickJiraBusy.active&&QuickJiraBusy.count===0&&!document.body.classList.contains('booting'));
 await page.locator(viewport.width<900?'#mobileJiraSearchBtn':'#jiraSearchBtn').click();await page.waitForFunction(()=>!QuickJiraBusy.active&&QuickJiraBusy.count===0);
 await page.locator('#jiraTreeModeBtn').click();await page.locator('#jiraTreeProject').fill('EPU01');await page.locator('#jiraTreeFind').click();await page.waitForSelector('.wt-node');assert.equal(await page.locator('.wt-node').count(),1);assert.equal(await page.locator('.wt-node script').count(),0);
 await page.locator('.wt-toggle').first().click();await page.waitForSelector('.wt-children .wt-node');await page.locator('#jiraTreeBody > .wt-more').click();await page.waitForFunction(()=>document.querySelectorAll('#jiraTreeBody > .wt-node').length===2);assert.equal(await page.locator('.wt-children .wt-node').count(),1,'Expanded branches survive pagination');
 await page.locator('.wt-children .wt-open').click();await page.waitForFunction(()=>document.getElementById('jiraIssuePeekDialog').open);assert.equal(await page.locator('#jiraIssuePeekKey').textContent(),'EPU01-2');await page.locator('#jiraIssuePeekCloseBtn').click();await page.waitForTimeout(400);
 assert.equal(await page.locator('.wt-children .wt-node').count(),1);
 await page.locator('.wt-add').first().click();await page.waitForFunction(()=>document.getElementById('jiraCreateDialog').open&&!QuickJiraBusy.active&&QuickJiraBusy.count===0);assert.equal(contextParent,'EPU01-2');await page.locator('#jiraCreateCloseBtn').click();await page.waitForTimeout(400);
 await page.locator('#jiraTreeKind').selectOption('search');await page.locator('#jiraTreeQuery').fill('Story');await page.locator('#jiraTreeFind').click();await page.waitForSelector('.wt-path');assert((await page.locator('.wt-path').textContent()).includes('EPU01-1'));
 await page.locator('.wt-path button').click();await page.waitForSelector('.wt-highlight');assert.equal(await page.locator('.wt-highlight').getAttribute('data-key'),'EPU01-2');
 const geometry=await page.locator('#jiraSearchDialog').evaluate(d=>({overflow:d.scrollWidth>d.clientWidth+1,body:document.body.scrollWidth>innerWidth}));assert(!geometry.overflow&&!geometry.body,JSON.stringify(geometry));
 await page.screenshot({path:`/tmp/working-tree-${viewport.width}.png`});
 denied=true;await page.locator('#jiraTreeFind').click();await page.waitForFunction(()=>document.getElementById('jiraTreeBody').textContent.includes('Không có quyền'));denied=false;await page.locator('#jiraTreeBody button').click();await page.waitForSelector('.wt-node');
 await page.evaluate(()=>{QuickJiraSearch.logout();QuickJiraSearch.login({username:'other'});});assert.equal(await page.locator('.wt-node').count(),0);
 assert.deepEqual(errors,[]);await ctx.close();console.log('Working Tree browser passed',viewport);
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
