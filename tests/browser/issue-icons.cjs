'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright'),{server}=require('./serve.cjs');
(async()=>{await new Promise(r=>server.listen(4258,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.QJL_CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox']});
try{for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:683},{width:844,height:390}]){
 const ctx=await browser.newContext({viewport,serviceWorkers:'block'}),p=await ctx.newPage();let requests=[],active=0,peak=0;const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/api?*',async route=>{const u=new URL(route.request().url()),a=u.searchParams.get('action');let d={ok:true};
 if(a==='status')d={ok:true,authenticated:true,user:{username:'boss',displayName:'Boss'}};
 if(a==='subtasks')d={ok:true,issues:[]};if(a==='worklog-history')d={ok:true,items:[],skipped:[]};if(a==='day-audit')d={ok:true,occupied:[],available:[]};
 if(a==='jira-type-icon'){requests.push(u.searchParams.get('type'));active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,40));active--;d={ok:true,icon:''};}
 await route.fulfill({contentType:'application/json',body:JSON.stringify(d)});
 });await p.goto('http://127.0.0.1:4258');await p.waitForFunction(()=>!QuickJiraBusy.active&&QuickJiraBusy.count===0&&!document.body.classList.contains('booting'));
 await p.evaluate(()=>{
 state.filterIssues=['Story','Bug','Task','Sub-task'].map((name,i)=>({key:'EPU01-'+(i+1),summary:'Kiểm tra '+name,project:'EPU01',issueType:name,issueTypeId:String(i+1),isSubtask:i===3}));state.filterLoaded=true;renderFilterIssues();
 const host=document.createElement('div');host.id='icon-test';for(let i=0;i<100;i++)host.append(QuickJiraIssueIcons.create({issueType:{id:String(i%8+1),name:'Story'}}));host.append(QuickJiraIssueIcons.create({key:'OLD-1'}));document.body.append(host);
 });await p.waitForFunction(()=>document.querySelectorAll('#filterIssueList img.qjl-issue-type-icon').length===4&&QuickJiraBusy.count===0);await p.waitForTimeout(350);
 assert.equal(requests.length,8,'One read per distinct type across all lists');assert(peak<=4,'Bounded icon read concurrency');assert.equal(await p.locator('#icon-test img').last().getAttribute('alt'),'Chưa rõ loại công việc');
 const icons=await p.locator('#filterIssueList img').evaluateAll(xs=>xs.map(x=>({width:x.getBoundingClientRect().width,alt:x.alt,src:x.src})));assert.deepEqual(icons.map(x=>x.alt),['Story','Bug','Task','Sub-task']);assert.equal(new Set(icons.map(x=>x.src)).size,4);
 await p.evaluate(()=>{const x=QuickJiraIssueIcons.create({key:'SAFE-1',issueType:{name:'<img src=x onerror=alert(1)>'}});document.getElementById('icon-test').append(x);});assert.equal(await p.locator('#icon-test img[src="x"]').count(),0);
 await p.evaluate(()=>{QuickJiraIssueIcons.login({username:'another'});document.getElementById('icon-test').append(QuickJiraIssueIcons.create({issueType:{id:'1',name:'Story'}}));});await p.waitForTimeout(200);assert.equal(requests.length,9,'Cache isolated by account');assert.deepEqual(errors,[]);
 await ctx.close();console.log('Shared list icons, fallback, cache, concurrency, account isolation and safe labels passed',viewport);
}}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
