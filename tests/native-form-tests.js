'use strict';
const assert=require('node:assert/strict'),{parseForm,nativeFormUpdate,pageToken}=require('../lib/worklogpro-form'),{render,action,openAction,bootstrap}=require('./fixtures/native-form');
const record={id:191081,workStart:Date.parse('2026-10-16T16:00:00+07:00'),timeSpent:1800,comment:'Tiếng Việt & <test> "quote"',workLogAttributes:[{attrTypeId:1,attrValue:'yes'},{attrTypeId:9,attrValue:'CUSTOM'}]};
const options={key:'EPU01-2840',worklogId:191081,attribute:{id:1}};
const html=render(options.key,record),parsed=parseForm(html,options);
assert.equal(parsed.fields.get('comment'),record.comment);assert.equal(parsed.fields.get('other'),'PRESERVE');assert.equal(parsed.fields.get('adjustEstimate'),'auto');
assert.throws(()=>parseForm(html,{...options,worklogId:99}));assert.throws(()=>parseForm(html,{...options,key:'OTHER-1'}));assert.throws(()=>parseForm(html,{...options,attribute:{id:2}}));
assert.throws(()=>parseForm(html.replace(action,'https://example.invalid/collect'),options));assert.throws(()=>parseForm(html.replace('?atl_token=fresh-xsrf-token',''),options));
assert.throws(()=>parseForm(html.replace('name="wa_1"','disabled name="wa_1"'),options));assert.throws(()=>parseForm(html.replace('id="log-work-lean"','id="login-form"'),options));
assert.equal(pageToken(bootstrap),'issue-page-token');assert.equal(pageToken('<meta content="ajs-token" name="ajs-atl-token">'),'ajs-token');assert.equal(pageToken('<meta content="full-token" name="atlassian-token">'),'full-token');
assert.equal(pageToken(`<a href="${openAction}?atl_token=full-link-token&amp;worklogId=191081">Edit</a>`),'full-link-token');
assert.equal(pageToken(`<a href="https://example.invalid${openAction}?atl_token=untrusted">Edit</a>`),'');
assert.equal(pageToken('<!--'+bootstrap+'--><script>'+bootstrap+'</script>'),'');
const old=global.fetch;let dispatched=0;
const args={...options,overtime:false,started:'2026-10-19T18:30:00.000+0700',seconds:7200,description:'New & tiếng Việt'};
const auth={mode:'session',cookie:'JSESSIONID=own-session'};
(async()=>{
 let calls=[];
 global.fetch=async(url,o)=>{
  const u=new URL(url);calls.push({path:u.pathname,method:o.method});
  if(u.pathname.startsWith('/browse/'))return new Response(bootstrap,{headers:{'set-cookie':'issueRoute=one; Path=/'}});
  if(u.pathname===action&&o.method==='GET')return new Response('XSRF check failed',{status:403}); // Reproduce V1.12.0.
  if(o.method==='GET'){
   assert.equal(u.pathname,openAction);assert.equal(u.searchParams.get('atl_token'),'issue-page-token');assert.equal(u.searchParams.get('worklogId'),'191081');assert(o.headers.Cookie.includes('issueRoute=one'));assert.equal(o.headers['X-Requested-With'],'XMLHttpRequest');
   return new Response(html,{headers:{'set-cookie':'xsrf=dynamic-cookie; Path=/'}});
  }
  assert.equal(u.pathname,action);assert.equal(u.searchParams.get('atl_token'),'fresh-xsrf-token','save uses the token returned by the actual edit form');
  const f=new URLSearchParams(o.body);assert.equal(f.has('wa_1'),false);assert.equal(f.get('wa_9'),'CUSTOM');assert.equal(f.get('comment'),'New & tiếng Việt');assert.equal(f.get('startDate'),'2026-10-19 18:30');assert.equal(f.get('startDateJS'),'19/Oct/26 6:30 PM');assert.equal(f.get('timeLogged'),'120m');assert.equal(f.get('other'),'PRESERVE');assert.equal(f.get('adjustEstimate'),'leave');assert(o.headers.Cookie.includes('JSESSIONID=own-session'));assert(o.headers.Cookie.includes('xsrf=dynamic-cookie'));assert.equal(o.headers.Authorization,undefined);assert.equal(o.headers.Origin,'https://task.ascvn.com.vn');assert.equal(o.headers.Referer,'https://task.ascvn.com.vn/browse/EPU01-2840');
  return new Response('Saved');
 };
 await nativeFormUpdate(args,auth,()=>dispatched++);assert.equal(calls.length,3);assert.equal(dispatched,1);assert.deepEqual(calls.map(c=>[c.method,c.path]),[['GET','/browse/EPU01-2840'],['GET',openAction],['POST',action]]);
 // Copies a new split worklog's native attribute, using only controls in its real form.
 await nativeFormUpdate({...args,copiedAttributes:[{attrTypeId:1,attrValue:'no'},{attrTypeId:9,attrValue:'CUSTOM'}]},auth);
 await assert.rejects(nativeFormUpdate({...args,copiedAttributes:[{attrTypeId:88,attrValue:'unknown'}]},auth),/thuộc tính gốc/);
 calls=[];await assert.rejects(nativeFormUpdate({...args,started:'2026-10-16T16:00:23.000+0700'},auth));assert.equal(calls.length,0);
 // Missing token, login wall, anonymous identity, cross-origin redirect, GET rejection: no write.
 for(const mode of ['missing-token','login','anonymous','redirect','xsrf-denied']){
  let writes=0,reads=0;dispatched=0;
  global.fetch=async(url,o)=>{
   assert.equal(o.method,'GET');reads++;if(o.method==='POST')writes++;
   if(mode==='login')return new Response('<form id="login-form"><input name="os_username"></form>');
   if(mode==='anonymous')return new Response('Forbidden',{status:403,headers:{'x-ausername':'anonymous'}});
   if(mode==='redirect')return new Response('',{status:302,headers:{location:'https://example.invalid/login-other'}});
   if(mode==='missing-token')return new Response('<html>No token</html>');
   if(new URL(url).pathname.startsWith('/browse/'))return new Response(bootstrap);
   return new Response('XSRF check failed',{status:403});
  };
  await assert.rejects(nativeFormUpdate(args,auth,()=>dispatched++),e=>{
   assert.equal(e.details.provider,'worklogpro');assert(!JSON.stringify(e).includes('own-session'));assert(!JSON.stringify(e).includes('issue-page-token'));
   if(mode==='xsrf-denied'){assert.equal(e.status,403);assert.equal(e.details.endpoint,openAction);assert.equal(e.details.xsrfRejected,true);assert.equal(e.details.stage,'readWorklogForm');}
   if(mode==='missing-token')assert.equal(e.code,'WORKLOGPRO_FORM_TOKEN_UNAVAILABLE');
   return true;
  });assert.equal(writes,0);assert.equal(dispatched,0);assert(reads<=2);
 }
 // Safe read redirects carry newly set cookies; writes are never redirected/retried.
 let n=0;global.fetch=async(url,o)=>{n++;if(n===1)return new Response('',{status:302,headers:{location:'/browse/EPU01-2840?redirected=1','set-cookie':'route=two; Path=/'}});if(n===2){assert(o.headers.Cookie.includes('route=two'));return new Response(bootstrap);}if(n===3)return new Response(html);throw Error('Lost after POST');};
 await assert.rejects(nativeFormUpdate(args,auth));assert.equal(n,4);
 console.log('V1.12.1 native form regression: issue-page token/cookies → GET !update → single POST, rejects old GET/save route, login/anonymous/XSRF/missing token/redirect diagnostics, no token leaks, preservation and no write retries passed');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>global.fetch=old);
