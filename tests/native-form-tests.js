'use strict';
const assert=require('node:assert/strict'),{parseForm,nativeFormUpdate}=require('../lib/worklogpro-form'),{render,action}=require('./fixtures/native-form');
const record={id:191081,workStart:Date.parse('2026-10-16T16:00:00+07:00'),timeSpent:1800,comment:'Tiếng Việt & <test> "quote"',workLogAttributes:[{attrTypeId:1,attrValue:'yes'},{attrTypeId:9,attrValue:'CUSTOM'}]};
const options={key:'EPU01-2840',worklogId:191081,attribute:{id:1}};
const html=render(options.key,record),parsed=parseForm(html,options);
assert.equal(parsed.fields.get('comment'),record.comment);assert.equal(parsed.fields.get('other'),'PRESERVE');assert.equal(parsed.fields.get('adjustEstimate'),'auto');
assert.throws(()=>parseForm(html,{...options,worklogId:99}));assert.throws(()=>parseForm(html,{...options,key:'OTHER-1'}));assert.throws(()=>parseForm(html,{...options,attribute:{id:2}}));
assert.throws(()=>parseForm(html.replace(action,'https://example.invalid/collect'),options));assert.throws(()=>parseForm(html.replace('?atl_token=fresh-xsrf-token',''),options));
assert.throws(()=>parseForm(html.replace('name="wa_1"','disabled name="wa_1"'),options));
assert.throws(()=>parseForm(html.replace('id="log-work-lean"','id="login-form"'),options));
const old=global.fetch;let dispatched=0;
(async()=>{
 let calls=0;global.fetch=async(url,o)=>{calls++;if(o.method==='GET')return new Response(html,{headers:{'set-cookie':'xsrf=dynamic-cookie; Path=/'}});const f=new URLSearchParams(o.body);assert.equal(f.has('wa_1'),false,'unchecked native checkbox is omitted');assert.equal(f.get('wa_9'),'CUSTOM');assert.equal(f.get('comment'),'New & tiếng Việt');assert.equal(f.get('startDate'),'2026-10-19 18:30');assert.equal(f.get('startDateJS'),'19/Oct/26 6:30 PM');assert.equal(f.get('timeLogged'),'120m');assert.equal(f.get('other'),'PRESERVE');assert.equal(f.get('adjustEstimate'),'leave');assert(o.headers.Cookie.includes('JSESSIONID=own-session'));assert(o.headers.Cookie.includes('xsrf=dynamic-cookie'));assert.equal(o.headers.Authorization,undefined);return new Response('Saved');};
 await nativeFormUpdate({...options,overtime:false,started:'2026-10-19T18:30:00.000+0700',seconds:7200,description:'New & tiếng Việt'},{mode:'session',cookie:'JSESSIONID=own-session'},()=>dispatched++);assert.equal(calls,2);assert.equal(dispatched,1);
 calls=0;await assert.rejects(nativeFormUpdate({...options,overtime:true,started:'2026-10-16T16:00:23.000+0700',seconds:1800,description:'Text'},{mode:'session',cookie:'JSESSIONID=own-session'}));assert.equal(calls,0,'reject unsupported seconds before any form fetch/write');
 console.log('V1.12.0 native form: dynamic CSRF/cookie, allowed same-origin action, exact identity, complete fields, Unicode, preserve unrelated controls, unchecked OT, date/time format and second precision guard passed');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>global.fetch=old);
