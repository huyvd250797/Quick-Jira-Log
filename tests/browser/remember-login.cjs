const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {server}=require('./serve.cjs');
(async()=>{
 await new Promise(r=>server.listen(4198,'127.0.0.1',r));
 const browser=await chromium.launch({...(process.env.QJL_CHROMIUM_PATH?{executablePath:process.env.QJL_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  const context=await browser.newContext({viewport,serviceWorkers:'block'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  let authenticated=false,fail=false,loginPosts=0,release=null,hold=false;
  await page.route('**/api?*',async route=>{
   const action=new URL(route.request().url()).searchParams.get('action');let status=200,data={ok:true,issues:[],items:[]};
   if(action==='status')data={ok:true,authenticated,user:{displayName:'QA',username:'qa-user'}};
   if(action==='login'){
    loginPosts++;if(hold)await new Promise(r=>release=r);
    if(fail){status=500;data={ok:false,error:'Lỗi đăng nhập thử nghiệm'};}
    else{authenticated=true;data={ok:true,user:{displayName:'QA',username:'qa-user'}};}
   }
   if(action==='logout')authenticated=false;
   if(action==='qa-expired'){authenticated=false;status=401;data={ok:false,error:'Phiên đã hết hạn'};}
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  const boot=async()=>{await page.waitForFunction(()=>!document.body.classList.contains('booting'));await page.waitForFunction(()=>!state.loginInFlight);await page.locator('#bootSplash').waitFor({state:'hidden'});};
  const fill=async(u='qa-user',p='Fictitious-Pass-Only!')=>{await page.locator('#username').fill(u);await page.locator('#password').fill(p);};
  const login=async()=>{await page.locator('#loginBtn').click();await page.waitForFunction(()=>state.user&&!state.loginInFlight);};
  const prefilled=async()=>{await page.waitForFunction(()=>document.getElementById('password').value==='Fictitious-Pass-Only!');assert.equal(await page.locator('#username').inputValue(),'qa-user');assert(await page.locator('#rememberLogin').isChecked());assert.equal(await page.locator('#password').getAttribute('type'),'password');};
  await page.goto('http://127.0.0.1:4198');await boot();
  assert.equal(await page.evaluate(()=>QuickJiraCredentials.supported()),true);
  assert.equal(await page.locator('#rememberLogin').isChecked(),false);assert.equal(loginPosts,0);
  await fill();await page.locator('#rememberLogin').check();fail=true;
  await page.locator('#loginBtn').click();await page.waitForFunction(()=>!state.loginInFlight);
  assert.equal(await page.evaluate(()=>QuickJiraCredentials.load()),null,'failed login never persists credentials');
  fail=false;hold=true;await page.locator('#loginBtn').click();await page.waitForFunction(()=>state.loginInFlight);
  while(!release)await new Promise(r=>setTimeout(r,10));
  assert.equal(await page.evaluate(()=>QuickJiraCredentials.load()),null,'waiting for server success does not save');
  release();hold=false;await page.waitForFunction(()=>state.user&&!state.loginInFlight);
  assert.equal(await page.evaluate(async()=>{const c=await QuickJiraCredentials.load();return c?.username==='qa-user'&&c?.password==='Fictitious-Pass-Only!';}),true);
  const encrypted=await page.evaluate(async()=>{
   const record=await new Promise((resolve,reject)=>{const req=indexedDB.open('quick-jira-log-device-login-v1',1);req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,tx=db.transaction('credentials'),q=tx.objectStore('credentials').get('remembered-login');q.onsuccess=()=>resolve(q.result);tx.oncomplete=()=>db.close();};});
   let exported=false;try{await crypto.subtle.exportKey('raw',record.key);exported=true;}catch{}
   const text=new TextDecoder().decode(record.ciphertext);
   return {extractable:record.key.extractable,exported,iv:record.iv.length,plain:text.includes('Fictitious-Pass-Only!')||JSON.stringify(localStorage).includes('Fictitious-Pass-Only!')||JSON.stringify(sessionStorage).includes('Fictitious-Pass-Only!')};
  });
  assert.deepEqual(encrypted,{extractable:false,exported:false,iv:12,plain:false});
  await page.locator('#logoutBtn').click();await prefilled();
  const before=loginPosts;await page.reload();await boot();await prefilled();assert.equal(loginPosts,before,'prefill does not automatically submit login');
  if(process.env.QJL_QA_OUTPUT){fs.mkdirSync(process.env.QJL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QJL_QA_OUTPUT,`${viewport.width}-v1117-remember-login.png`)});}
  await login();
  await page.evaluate(()=>api('/api?action=qa-expired').catch(()=>{}));await prefilled();
  // A failed replacement must preserve the last successful login.
  await fill('wrong-user','Wrong-Fictitious!');fail=true;await page.locator('#loginBtn').click();await page.waitForFunction(()=>!state.loginInFlight);
  assert.equal(await page.evaluate(async()=>(await QuickJiraCredentials.load()).username),'qa-user');fail=false;
  await page.reload();await boot();await prefilled();
  await page.locator('#rememberLogin').uncheck();await page.waitForFunction(()=>document.getElementById('rememberLoginHint').textContent.includes('Đã xóa'));
  assert.equal(await page.evaluate(()=>QuickJiraCredentials.load()),null);
  await page.reload();await boot();assert.equal(await page.locator('#username').inputValue(),'');assert.equal(await page.locator('#password').inputValue(),'');assert.equal(await page.locator('#rememberLogin').isChecked(),false);
  // Ordinary login still works without retaining a new password.
  await fill();await login();assert.equal(await page.evaluate(()=>QuickJiraCredentials.load()),null);
  await page.locator('#logoutBtn').click();await page.waitForFunction(()=>!state.user);
  // A slow storage read may not overwrite a draft the user has already typed.
  await page.evaluate(()=>{const original=QuickJiraCredentials;window.QuickJiraCredentials={...original,load:()=>new Promise(r=>window.releaseLoginRead=()=>r({username:'old-user',password:'old-password'}))};loginInputRevision=0;setLoggedOut();});
  await fill('new-draft','New-Fictitious!');await page.evaluate(()=>window.releaseLoginRead());
  assert.equal(await page.locator('#username').inputValue(),'new-draft');assert.equal(await page.locator('#password').inputValue(),'New-Fictitious!');
  const bounds=await page.locator('#loginForm').evaluate(e=>{const r=e.getBoundingClientRect();return [...e.querySelectorAll('input,button')].filter(x=>x.getClientRects().length).every(x=>{const b=x.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1;});});assert(bounds,'login controls fit the screen');
  await page.reload();await boot();
  const vaultRecovery=await page.evaluate(async()=>{
   const saving=QuickJiraCredentials.save('qa-user','Fictitious-Pass-Only!'),forgetting=QuickJiraCredentials.clear();await Promise.all([saving,forgetting]);
   const forgotten=await QuickJiraCredentials.load()===null;
   await QuickJiraCredentials.save('qa-user','Fictitious-Pass-Only!');
   await new Promise((resolve,reject)=>{const req=indexedDB.open('quick-jira-log-device-login-v1',1);req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,tx=db.transaction('credentials','readwrite'),store=tx.objectStore('credentials'),q=store.get('remembered-login');q.onsuccess=()=>{const record=q.result;new Uint8Array(record.ciphertext)[0]^=1;store.put(record,'remembered-login');};tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>{db.close();reject(tx.error);};};});
   let rejected=false;try{await QuickJiraCredentials.load();}catch{rejected=true;}
   return {forgotten,rejected,removed:await QuickJiraCredentials.load()===null};
  });assert.deepEqual(vaultRecovery,{forgotten:true,rejected:true,removed:true});
  assert.deepEqual(errors,[]);console.log('V1.11.7 remember login: success-only encrypted storage, logout/expiry/reload prefill, no auto-submit, forget/draft races and corrupt record recovery passed',viewport);
  await context.close();
 }
 // Storage support failure must not prevent manual authentication.
 const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();
 await page.addInitScript(()=>Object.defineProperty(window,'indexedDB',{value:undefined}));
 await page.route('**/api?*',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(new URL(r.request().url()).searchParams.get('action')==='status'?{ok:true,authenticated:false}:{ok:true,user:{username:'qa'},items:[],issues:[]})}));
 await page.goto('http://127.0.0.1:4198');await page.waitForFunction(()=>!document.body.classList.contains('booting'));assert(await page.locator('#rememberLogin').isDisabled());
 await page.locator('#username').fill('qa');await page.locator('#password').fill('Fictitious!');await page.locator('#loginBtn').click();await page.waitForFunction(()=>state.user&&!state.loginInFlight);
 await context.close();await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);server.close();process.exit(1);});
