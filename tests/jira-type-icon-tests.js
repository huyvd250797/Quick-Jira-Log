'use strict';
const assert=require('node:assert/strict'),{icon}=require('../lib/jira-type-icon');
const original=global.fetch;let mode='',reads=0;
(async()=>{
 global.fetch=async(url,opts)=>{
  const u=new URL(url);reads++;
  if(u.pathname.includes('/issuetype/'))return Response.json({iconUrl:mode==='external'?'https://outside.example/secret':'https://task.ascvn.com.vn/images/icons/issuetypes/story.svg'});
  assert.equal(u.origin,'https://task.ascvn.com.vn');assert.equal(opts.redirect,'error');assert(opts.headers.Authorization.startsWith('Basic '));
  const svg=mode==='unsafe'?'<svg><script>alert(1)</script></svg>':'<svg xmlns="http://www.w3.org/2000/svg"><path d="M1 1"/></svg>';
  return new Response(mode==='large'?'x'.repeat(70000):svg,{headers:{'content-type':'image/svg+xml'}});
 };
 const auth={mode:'basic',username:'boss',password:'fixture'};
 assert((await icon({type:'1'},auth)).icon.startsWith('data:image/svg+xml;base64,'));
 mode='external';const before=reads;assert.equal((await icon({type:'1'},auth)).icon,'');assert.equal(reads,before+1,'No request or credentials to external host');
 mode='unsafe';assert.equal((await icon({type:'1'},auth)).icon,'');mode='large';await assert.rejects(()=>icon({type:'1'},auth),e=>e.status===413);
 await assert.rejects(()=>icon({type:'../x'},auth),e=>e.status===400);
 console.log('Jira icons: fixed-origin allowlist, credential forwarding, SVG defence, bounded content and input checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>global.fetch=original);
