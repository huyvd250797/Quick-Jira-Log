'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),api=require('../../api'),{createSessionCookie}=require('../../lib/session');
const root=path.resolve(__dirname,'../..'),original=global.fetch;let browser,server,holdLogs=false,holdKey='',logCalls=[],held=[],mode='',historyHeld=[],holdHistory=false,subtaskHeld=[],holdSubtasks=false,holdWrite=false,writeHeld=[];
const release=()=>{holdLogs=false;for(const r of held.splice(0))r();};
(async()=>{
 process.env.APP_SESSION_SECRET='background-browser-test-secret-at-least-32';
 const cookie=createSessionCookie({mode:'basic',username:'boss',password:'fixture',me:{name:'boss',displayName:'Boss'}}).split(';')[0],eq=cookie.indexOf('=');
 global.fetch=async(url,opts={})=>{const u=new URL(url),p=u.pathname,m=opts.method||'GET';assert.equal(u.origin,'https://task.ascvn.com.vn');
  if(p==='/rest/api/2/project')return Response.json([{key:'CAL',name:'Dự án kiểm thử'},{key:'OTHER',name:'Dự án khác'}]);
  if(p==='/rest/api/2/status'||p==='/rest/api/2/issuetype')return Response.json([]);
  if(p==='/rest/api/2/search'){const b=m==='POST'?JSON.parse(opts.body):Object.fromEntries(u.searchParams);const project=b.jql.includes('project = "CAL"')?'CAL':b.jql.includes('project = "OTHER"')?'OTHER':'';
   const issues=[['CAL-1',true],['CAL-2',true],['OTHER-1',false]].filter(([key])=>!project||key.startsWith(project+'-')).map(([key,subtask])=>({key,fields:{summary:'Nội dung <script>an toàn</script>',project:{key:key.split('-')[0]},issuetype:{subtask}}}));return Response.json({startAt:0,total:issues.length,issues});}
  if(p.endsWith('/worklog')){
   logCalls.push(p);if(holdLogs&&(!holdKey||p.includes(holdKey)))await new Promise(r=>held.push(r));if(mode==='partial'&&p.includes('CAL-2'))return Response.json({}, {status:403});
   const id=p.includes('CAL-1')?'100':p.includes('CAL-2')?'200':'300',start=Number(u.searchParams.get('startAt'));
   const rows=start===0?[{id,author:{key:'a',displayName:'Thành viên A'},started:'2026-10-22T08:00:00.000+0700',timeSpentSeconds:3600,comment:'Log theo ngày'},...(id==='100'?[{id:'101',author:{key:'b',displayName:'Thành viên B'},started:'2012-01-01T08:00:00.000+0700',timeSpentSeconds:1800,comment:'Log cũ'}]:[])]:[];
   return Response.json({startAt:start,total:rows.length,worklogs:rows});
  }
  if(p.endsWith('/attr'))return Response.json({}, {status:403});
  throw Error('Unexpected '+m+' '+p);
 };
 const csp=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'))).headers[0].headers.find(h=>h.key==='Content-Security-Policy').value;
 server=http.createServer(async(req,res)=>{req.headers['x-forwarded-proto']='http';const u=new URL(req.url,'http://localhost'),a=u.searchParams.get('action');
  if(u.pathname==='/api'){
   if(['status','project-stats','jira-search-options'].includes(a))return api(req,res).catch(e=>{res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({ok:false,error:e.message}));});
   if(a==='worklog-history'&&holdHistory)await new Promise(r=>historyHeld.push(r));if(a==='subtasks'&&holdSubtasks)await new Promise(r=>subtaskHeld.push(r));if(a==='qa-write'&&holdWrite)await new Promise(r=>writeHeld.push(r));
   const data=a==='subtasks'?{ok:true,issues:[{key:'CAL-1',project:'CAL',summary:'Test',status:'Open'}]}:a==='worklog-history'?{ok:true,items:[],skipped:[]}:a==='day-audit'?{ok:true,occupied:[],available:[],regularOccupiedMinutes:0}:{ok:true};
   res.writeHead(200,{'content-type':'application/json'});return res.end(JSON.stringify(data));
  }
  const file=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'content-security-policy':csp,'content-type':({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream'});res.end(err?'missing':data);});
 });
 await new Promise(r=>server.listen(4239,'127.0.0.1',r));browser=await chromium.launch({headless:true,executablePath:process.env.QJL_CHROMIUM_PATH,args:['--no-sandbox']});
 for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:683},{width:844,height:390}]){
  const ctx=await browser.newContext({viewport,serviceWorkers:'block'});await ctx.addCookies([{name:cookie.slice(0,eq),value:cookie.slice(eq+1),domain:'127.0.0.1',path:'/'}]);const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  holdSubtasks=true;holdHistory=true;mode='';await page.goto('http://127.0.0.1:4239');await page.waitForFunction(()=>!document.body.classList.contains('booting'));await page.waitForFunction(()=>QuickJiraBusy.count>0);assert.equal(await page.evaluate(()=>QuickJiraBusy.active),false);assert(await page.locator('#backgroundTasks').isHidden());assert(await page.locator('#filterLoading').isVisible());assert(await page.locator('#filterLoading').evaluate(e=>e.classList.contains('qjl-inline-loading')));
  if(process.env.QJL_QA_DIR&&viewport.width===390){fs.mkdirSync(process.env.QJL_QA_DIR,{recursive:true});await page.screenshot({path:process.env.QJL_QA_DIR+'/startup-skeleton.png'});}
  await page.locator(viewport.width<900?'#mobileHistoryBtn':'#historyBtn').click();assert(await page.locator('#historyOverlay').isVisible());await page.locator('#closeHistoryBtn').click();
  holdSubtasks=false;for(const r of subtaskHeld.splice(0))r();holdHistory=false;for(const r of historyHeld.splice(0))r();await page.waitForFunction(()=>QuickJiraBusy.count===0);
  await page.locator(viewport.width<900?'#mobileProjectStatsBtn':'#projectStatsBtn').click();await page.waitForFunction(()=>QuickJiraBusy.count===0);assert.equal(await page.locator('#psScope').inputValue(),'all');
  await page.locator('#psAnchor').fill('2024-02-15');await page.locator('#psAnchor').dispatchEvent('change');assert.equal(await page.locator('#psFrom').inputValue(),'2024-02-01');assert.equal(await page.locator('#psTo').inputValue(),'2024-02-29');await page.locator('#psPeriod').selectOption('week');await page.locator('#psAnchor').fill('2026-10-22');await page.locator('#psAnchor').dispatchEvent('change');assert.equal(await page.locator('#psFrom').inputValue(),'2026-10-19');assert.equal(await page.locator('#psTo').inputValue(),'2026-10-25');
  await page.locator('#psPeriod').selectOption('custom');await page.locator('#psFrom').fill('2026-10-22');await page.locator('#psTo').fill('2026-10-22');holdLogs=true;await page.locator('#psLoad').click();await page.waitForFunction(()=>QuickJiraProjectReport.running);await page.waitForFunction(()=>document.getElementById('backgroundTasks').textContent.includes('0/3'));
  assert.equal(await page.evaluate(()=>QuickJiraBusy.active),false);await page.locator('#psClose').click();assert(await page.locator('#projectStatsDialog').isHidden());await page.locator(viewport.width<900?'#mobileHistoryBtn':'#historyBtn').click();assert(await page.locator('#backgroundTasks').isVisible());assert((await page.locator('#backgroundTasks').textContent()).includes('0/3 · 0%'));
  if(viewport.width===1440){await page.evaluate(()=>document.getElementById('historyOverlay').requestFullscreen());assert(await page.locator('#backgroundTasks').isVisible());await page.evaluate(()=>document.exitFullscreen());}
  await page.locator('#backgroundTasks [data-task-open]').click();assert(await page.locator('#projectStatsDialog').isVisible());await page.locator('#psPause').click();release();await page.waitForFunction(()=>!QuickJiraProjectReport.running);assert(await page.evaluate(()=>QuickJiraProjectReport.paused));await page.locator('#psPause').click();await page.waitForFunction(()=>!QuickJiraProjectReport.running&&!QuickJiraProjectReport.paused);assert((await page.locator('#psState').textContent()).includes('100%'));assert((await page.locator('#psKpis').textContent()).includes('3h'));assert.equal(await page.locator('.ps-person').count(),1);
  await page.locator('#psPeriod').selectOption('all');await page.locator('#psLoad').click();await page.waitForTimeout(120);await page.waitForFunction(()=>!QuickJiraProjectReport.running&&!QuickJiraProjectReport.restoring);assert((await page.locator('#psKpis').textContent()).includes('3h 30m'));assert.equal(await page.locator('.ps-person').count(),2);await page.locator('.ps-person').first().click();assert(await page.locator('#psDetail').isVisible());assert.equal(await page.locator('#psDetail script').count(),0);
  await page.locator('#psScope').selectOption('one');await page.locator('#psProject').fill('CAL');await page.locator('#psProject').dispatchEvent('change');await page.locator('#psPeriod').selectOption('year');await page.locator('#psYear').fill('2012');await page.locator('#psYear').dispatchEvent('change');assert.equal(await page.locator('#psFrom').inputValue(),'2012-01-01');await page.locator('#psLoad').click();await page.waitForTimeout(120);await page.waitForFunction(()=>!QuickJiraProjectReport.running&&!QuickJiraProjectReport.restoring);assert((await page.locator('#psKpis').textContent()).includes('30m'));
  await page.locator('#psPeriod').selectOption('custom');await page.locator('#psFrom').fill('2000-01-01');await page.locator('#psTo').fill('2026-12-31');mode='partial';await page.locator('#psLoad').click();await page.waitForTimeout(120);await page.waitForFunction(()=>!QuickJiraProjectReport.running&&!QuickJiraProjectReport.restoring);assert((await page.locator('#psState').textContent()).includes('tạm tính'));assert(await page.locator('#psRetry').isVisible());mode='';await page.locator('#psRetry').click();await page.waitForFunction(()=>!QuickJiraProjectReport.running);assert((await page.locator('#psKpis').textContent()).includes('2h 30m'));
  for(const theme of ['light','dark']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.waitForTimeout(250);assert(await page.locator('#projectStatsDialog').evaluate(d=>{const r=d.getBoundingClientRect();return r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&d.scrollWidth<=d.clientWidth+1;}));if(process.env.QJL_QA_DIR){fs.mkdirSync(process.env.QJL_QA_DIR,{recursive:true});await page.screenshot({path:process.env.QJL_QA_DIR+'/background-'+viewport.width+'-'+theme+'.png'});}}
  if(viewport.width===390){
   await page.locator('#psScope').selectOption('all');await page.locator('#psPeriod').selectOption('all');
   holdKey='CAL-2';holdLogs=true;logCalls=[];await page.locator('#psLoad').click();
   await page.waitForFunction(async()=>{const s=await QuickJiraReportStorage.load('boss');return s?.pages.filter(p=>p.kind==='logs').length===2;});
   assert.equal(await page.locator('#backgroundTasks button').count(),1);
   await page.locator('#psClose').click();
   const box=await page.locator('#backgroundTasks').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(40,130,{steps:12});await page.mouse.up();
   assert(await page.locator('#projectStatsDialog').isHidden(),'Dragging must not open statistics');
   assert(await page.evaluate(()=>!!localStorage.getItem('qjl-task-position-v1')));
   await page.locator('#backgroundTasks [data-task-open]').click();
   await page.evaluate(()=>Promise.all([QuickJiraProjectReport.flush(),QuickJiraResume.flush()]));
   assert(await page.evaluate(async()=>{const s=await QuickJiraReportStorage.load('boss');const wrong=await QuickJiraReportStorage.commit('boss','wrong-run',null,{phase:'corrupted'});return wrong===false&&(await QuickJiraReportStorage.load('boss')).meta.phase===s.meta.phase&&await QuickJiraReportStorage.load('other-person')===null;}));
   const already=logCalls.filter(p=>p.includes('CAL-1')).length;
   await page.reload();await page.waitForFunction(()=>QuickJiraProjectReport.running);
   await page.waitForFunction(()=>document.getElementById('projectStatsDialog').open);
   assert.equal(await page.locator('#psPeriod').inputValue(),'all');
   release();holdKey='';await page.waitForFunction(()=>!QuickJiraProjectReport.running);
   assert.equal(logCalls.filter(p=>p.includes('CAL-1')).length,already,'Committed worklog page must not be fetched again');
   assert((await page.locator('#psKpis').textContent()).includes('3h 30m'));
   const bubble=await page.locator('#backgroundTasks').boundingBox();assert(bubble.x>=0&&bubble.y>=0&&bubble.x+bubble.width<=viewport.width+1&&bubble.y+bubble.height<=viewport.height+1);
   // Paused task survives another reload without auto-starting.
   holdLogs=true;await page.locator('#psLoad').click();await page.waitForFunction(()=>QuickJiraProjectReport.running);
   await page.locator('#psPause').click();release();await page.waitForFunction(()=>!QuickJiraProjectReport.running&&QuickJiraProjectReport.paused);
   await page.evaluate(()=>QuickJiraProjectReport.flush());await page.reload();
   await page.waitForFunction(()=>!QuickJiraProjectReport.restoring&&QuickJiraProjectReport.paused);
   assert.equal(await page.evaluate(()=>QuickJiraProjectReport.running),false);
   await page.locator('#psPause').click();await page.waitForFunction(()=>!QuickJiraProjectReport.running&&!QuickJiraProjectReport.paused);
   assert((await page.locator('#psKpis').textContent()).includes('3h 30m'));
   // If storage becomes full, computation remains correct and warns instead of silently promising recovery.
   await page.evaluate(()=>{window.qaCommit=QuickJiraReportStorage.commit;QuickJiraReportStorage.commit=async()=>{throw Error('quota fixture');};});
   await page.locator('#psLoad').click();await page.waitForTimeout(120);await page.waitForFunction(()=>!QuickJiraProjectReport.running);
   assert((await page.locator('#psWarning').textContent()).includes('Chưa lưu được tiến độ'));
   assert((await page.locator('#psKpis').textContent()).includes('3h 30m'));
   await page.evaluate(()=>QuickJiraReportStorage.commit=window.qaCommit);
   console.log('Reload mid-report resumes committed cursors, preserves route/filter, exact totals and draggable bubble');
   await page.locator('#psScope').selectOption('one');await page.locator('#psProject').fill('CAL');await page.locator('#psProject').dispatchEvent('change');
  }
  // Old job response cannot repaint a new filter or another account.
  holdLogs=true;await page.locator('#psLoad').click();await page.waitForFunction(()=>QuickJiraProjectReport.running);await page.locator('#psProject').fill('OTHER');await page.locator('#psProject').dispatchEvent('change');await page.locator('#psLoad').click();await page.waitForFunction(()=>QuickJiraProjectReport.running&&document.getElementById('backgroundTasks').textContent.includes('OTHER'));release();await page.waitForFunction(()=>!QuickJiraProjectReport.running);assert((await page.locator('#psState').textContent()).includes('OTHER'));assert((await page.locator('#psKpis').textContent()).includes('1h'));
  holdLogs=true;await page.locator('#psLoad').click();await page.waitForFunction(()=>QuickJiraProjectReport.running);await page.evaluate(()=>{QuickJiraProjectReport.logout();QuickJiraProjectReport.login({username:'another'});});release();await page.waitForTimeout(200);assert(await page.locator('#psContent').isHidden());assert.equal(await page.locator('#psPeople').textContent(),'');assert.equal(await page.locator('#backgroundTasks [data-task-open]').count(),0);await page.waitForFunction(async()=>await QuickJiraReportStorage.load('boss')===null);
  holdWrite=true;await page.evaluate(()=>{window.qaWrite=api('/api?action=qa-write',{method:'POST'});});await page.waitForFunction(()=>QuickJiraBusy.active);assert(await page.locator('#dataLoadingFeedback').isVisible());assert(await page.evaluate(()=>{let clicked=false;const b=document.getElementById('historyBtn');b.addEventListener('click',()=>clicked=true,{once:true});b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return !clicked;}));holdWrite=false;for(const r of writeHeld.splice(0))r();await page.evaluate(()=>window.qaWrite);await page.waitForFunction(()=>!QuickJiraBusy.active);
  assert.deepEqual(errors,[]);await ctx.close();console.log('Background navigation/progress/pause/resume/all-projects/all-time/year/custom/partial retry/stale account/CSP/layout and write protection passed',viewport);
 }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{release();holdWrite=false;for(const r of writeHeld.splice(0))r();holdSubtasks=false;for(const r of subtaskHeld.splice(0))r();holdHistory=false;for(const r of historyHeld.splice(0))r();if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));global.fetch=original;});
