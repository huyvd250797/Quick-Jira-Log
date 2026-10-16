'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),http=require('http'),fs=require('fs'),path=require('path');
const api=require('../../api/index'),{createSessionCookie}=require('../../lib/session');
const root=path.resolve(__dirname,'../..'),base='/rest/com.deniz.jira.worklog/1.0',oldFetch=global.fetch,oldSecret=process.env.APP_SESSION_SECRET;
let server,browser,mode='',writes=0,ordinaryWrites=0,record,core;
process.env.APP_SESSION_SECRET='browser-native-ot-at-least-32-character-secret';
const user={name:'qa-native',key:'JIRAUSER123',displayName:'QA Native'};
const reset=()=>{mode='';writes=0;ordinaryWrites=0;core={id:'7',author:user,started:'2026-10-16T08:00:00.000+0700',timeSpentSeconds:3600,comment:'Work completed\n\n[Quick Jira Log: Overtime]'};record={id:7,workStart:Date.parse(core.started),timeSpent:3600,authorUserKey:user.key,comment:core.comment,workLogAttributes:[{attrTypeId:23,attrValue:'no'},{attrTypeId:9,attrValue:'CUSTOM'}]};};
global.fetch=async(url,options={})=>{
 const u=new URL(String(url)),body=options.body?JSON.parse(options.body):{};
 if(u.pathname===`${base}/attr`)return mode==='denied'?Response.json({}, {status:403}):Response.json([{id:23,name:'Over Time?',type:'BOOL',enabled:true}]);
 if(u.pathname===`${base}/worklog/7`){
  if(options.method==='PUT'){
   writes++;const attrs=mode==='ignored'?record.workLogAttributes:body.workLogAttributes;
   record={...record,...body,workStart:Date.parse(body.workStart),workLogAttributes:attrs};Object.assign(core,{started:body.workStart,timeSpentSeconds:body.timeSpent,comment:body.comment});
  }return Response.json(record);
 }
 if(u.pathname.endsWith('/search'))return Response.json({issues:[{key:'NATIVE-1',fields:{project:{key:'NATIVE'},summary:'Native WorklogPRO Overtime',status:{name:'Done'}}}],total:1});
 if(u.pathname.endsWith('/worklog/updated'))return Response.json({}, {status:404});
 if(u.pathname.endsWith('/NATIVE-1/worklog/7')){if(options.method==='PUT'){ordinaryWrites++;Object.assign(core,{started:body.started,timeSpentSeconds:body.timeSpentSeconds,comment:body.comment});Object.assign(record,{workStart:Date.parse(body.started),timeSpent:body.timeSpentSeconds,comment:body.comment});}return Response.json(core);}
 if(u.pathname.endsWith('/NATIVE-1/worklog'))return Response.json({worklogs:[core],total:1});
 throw Error('Unexpected fixture request '+u.pathname);
};
(async()=>{
 server=http.createServer((req,res)=>{
  if(req.url.startsWith('/api')){
   req.headers['x-forwarded-proto']='http';
   if(mode==='unverified-response'&&req.method==='PATCH'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,overtime:true}));return;}
   api(req,res).catch(()=>{res.statusCode=500;res.end('{}');});return;
  }
  const u=new URL(req.url,'http://localhost'),file=path.join(root,u.pathname==='/'?'index.html':u.pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':({'.html':'text/html','.js':'application/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png'})[path.extname(file)]||'application/octet-stream'});res.end(err?'Not found':data);});
 });await new Promise(r=>server.listen(4200,'127.0.0.1',r));
 browser=await chromium.launch({...(process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  reset();const context=await browser.newContext({viewport,serviceWorkers:'block',timezoneId:'Asia/Ho_Chi_Minh'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const [name,value]=createSessionCookie({mode:'basic',username:user.name,password:'fictitious-only',me:user}).split(';')[0].split('=');await context.addCookies([{name,value,url:'http://127.0.0.1:4200',httpOnly:true}]);
  await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...a.length?a:['2026-10-16T02:00:00Z']);}static now(){return D.parse('2026-10-16T02:00:00Z');}};});
  await page.route('**/api?*',async r=>{const a=new URL(r.request().url()).searchParams.get('action');if(['worklog-history','worklog-correction'].includes(a))return r.continue();return r.fulfill({contentType:'application/json',body:JSON.stringify(a==='status'?{ok:true,authenticated:true,user}:{ok:true,issues:[],items:[]})});});
  await page.goto('http://127.0.0.1:4200');await page.locator(viewport.width>=900?'#historyBtn':'#mobileHistoryBtn').click();await page.waitForFunction(()=>state.historyLoaded&&!state.historyLoading);
  const block=page.locator('.week-worklog-block');await block.click();assert.equal(await page.evaluate(()=>document.activeElement.id),'cancelCorrectionBtn');assert.equal(await page.locator('#correctionOvertime').isChecked(),false);assert.equal(await page.locator('.week-worklog-block.is-ot').count(),0);assert((await page.locator('#correctionOvertimeScope').innerText()).includes('Bản cũ'));assert.equal(await page.locator('#correctionDescription').inputValue(),'Work completed');
  await page.locator('.correction-overtime').click();await page.locator('#saveCorrectionBtn').click();await page.waitForFunction(()=>!state.historyLoading&&!document.getElementById('worklogCorrectionDialog').open);assert.equal(writes,1);assert.equal(record.workLogAttributes.find(a=>a.attrTypeId===23).attrValue,'yes');assert.equal(record.workLogAttributes.find(a=>a.attrTypeId===9).attrValue,'CUSTOM');assert(!core.comment.includes('Quick Jira Log:'));assert.equal(await page.locator('.week-worklog-block.is-ot').count(),1);
  await block.click();assert(await page.locator('#correctionOvertime').isChecked());await page.locator('.correction-overtime').click();await page.locator('#saveCorrectionBtn').click();await page.waitForFunction(()=>!state.historyLoading&&!document.getElementById('worklogCorrectionDialog').open);assert.equal(record.workLogAttributes.find(a=>a.attrTypeId===23).attrValue,'no');assert.equal(await page.locator('.week-worklog-block.is-ot').count(),0);
  mode='ignored';await block.click();await page.locator('.correction-overtime').click();const before=writes;await page.locator('#saveCorrectionBtn').click();await page.locator('#correctionFeedback').waitFor({state:'visible'});await page.waitForFunction(()=>!state.historyLoading);assert.equal(writes,before+1);assert(await page.locator('#correctionOvertime').isChecked());assert.equal(await page.locator('#worklogCorrectionDialog').evaluate(e=>e.open),true);assert((await page.locator('#correctionFeedback').innerText()).includes('Chưa xác nhận'));assert.equal(await page.locator('.week-worklog-block.is-ot').count(),0);
  if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`${viewport.width}-v1119-native-ot-unverified.png`)});}
  await page.locator('#cancelCorrectionBtn').click();mode='denied';await page.evaluate(()=>loadWorklogHistory({force:true,quiet:true}));await page.waitForFunction(()=>!state.historyLoading);assert(await page.evaluate(()=>state.historyNotice.includes('Overtime')));
  await block.click();assert.equal(await page.locator('#correctionOvertime').evaluate(e=>e.indeterminate),true);assert((await page.locator('#correctionOvertimeHint').innerText()).includes('Chưa đọc'));
  const count=writes,ordinaryBefore=ordinaryWrites;await page.locator('#correctionDate').fill('2026-10-15');await page.locator('#correctionStart').fill('09:30');await page.locator('#correctionTimeSpent').fill('30m');await page.locator('#correctionDescription').fill('Ordinary date, time, duration and description edit');await page.locator('#saveCorrectionBtn').click();await page.waitForFunction(()=>!state.historyLoading&&!document.getElementById('worklogCorrectionDialog').open);assert.equal(writes,count);assert.equal(ordinaryWrites,ordinaryBefore+1);assert.equal(core.started,'2026-10-15T09:30:00.000+0700');assert.equal(core.timeSpentSeconds,1800);assert.equal(record.workLogAttributes.find(a=>a.attrTypeId===23).attrValue,'no');
  await block.click();await page.locator('.correction-overtime').click();await page.locator('#saveCorrectionBtn').click();await page.locator('#correctionFeedback').waitFor({state:'visible'});assert.equal(writes,count,'denied metadata blocks only explicit OT mutation');assert.equal(ordinaryWrites,ordinaryBefore+1,'no partial ordinary save after OT request fails');await page.locator('#correctionErrorDetails summary').click();assert((await page.locator('#correctionErrorText').innerText()).includes('HTTP: 403'));assert((await page.locator('#correctionErrorText').innerText()).includes('Đọc danh sách thuộc tính'));if(process.env.QJL_QA_OUTPUT)await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`${viewport.width}-v1119-edit-error-detail.png`)});
  const retainedDraft=await page.locator('#correctionDescription').inputValue();await page.locator('#keepCorrectionOvertimeBtn').click();assert.equal(await page.locator('#correctionDescription').inputValue(),retainedDraft);assert.equal(await page.locator('#correctionOvertime').evaluate(e=>e.indeterminate),true);
  // Unknown checkbox untouched: a fresh native value must survive a content edit.
  mode='';record.workLogAttributes.find(a=>a.attrTypeId===23).attrValue='yes';await page.locator('#correctionDescription').fill('Content edit while checkbox unknown');await page.locator('#saveCorrectionBtn').click();await page.waitForFunction(()=>!state.historyLoading&&!document.getElementById('worklogCorrectionDialog').open);assert.equal(record.workLogAttributes.find(a=>a.attrTypeId===23).attrValue,'yes');
  mode='unverified-response';await block.click();await page.locator('#saveCorrectionBtn').click();await page.locator('#correctionFeedback').waitFor({state:'visible'});assert((await page.locator('#correctionFeedback').innerText()).includes('chưa xác nhận'));
  assert.deepEqual(errors,[]);console.log('V1.11.9 browser → real handler → WorklogPRO fixture: native on/off, independent date/time/duration/comment edits under plugin 403, diagnostics, readback failure and unknown OT preservation passed',viewport);await context.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));global.fetch=oldFetch;if(oldSecret==null)delete process.env.APP_SESSION_SECRET;else process.env.APP_SESSION_SECRET=oldSecret;});
