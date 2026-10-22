'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),crypto=require('node:crypto');
const api=require('../api'),{createSessionCookie}=require('../lib/session'),{LIMIT,safeContent}=require('../lib/jira-attachments'),{describe,encode,estimateSeconds}=require('../lib/jira-create-fields');
const original=global.fetch,old=process.env.APP_SESSION_SECRET;let server;
(async()=>{
 process.env.APP_SESSION_SECRET='attachments-test-secret-at-least-32-characters';const cookie=createSessionCookie({mode:'basic',username:'boss',password:'fixture',me:{name:'boss'}}).split(';')[0];
 let mode='',posts=0,requests=[],saved=false;
 const file={id:'123',filename:'Ảnh.png',size:4,mimeType:'image/png',content:'https://task.ascvn.com.vn/secure/attachment/123/photo.png',thumbnail:'https://task.ascvn.com.vn/secure/thumbnail/123/_thumb.png',author:{displayName:'Boss',emailAddress:'private'},created:'2026-10-22'};
 global.fetch=async(url,opts={})=>{const u=new URL(url);requests.push(u.href);assert.equal(opts.headers.Authorization,'Basic '+Buffer.from('boss:fixture').toString('base64'));assert.equal(opts.redirect,'manual');
  if(mode==='expired')return Response.json({},{status:401});
  if(u.pathname==='/rest/api/2/issue/CAL-1')return mode==='denied'?Response.json({},{status:403}):Response.json({key:'CAL-1',fields:{attachment:[{...file,...(mode==='large'?{size:LIMIT+1}:{})},...(saved?[{...file,id:'124',filename:'test.txt',mimeType:'text/plain',content:'https://task.ascvn.com.vn/secure/attachment/124/test.txt'}]:[])]}});
  if(u.pathname==='/rest/api/2/mypermissions')return Response.json({permissions:{CREATE_ATTACHMENTS:{havePermission:mode!=='no-permission'}}});
  if(u.pathname==='/rest/api/2/attachment/meta')return Response.json({enabled:mode!=='disabled',uploadLimit:mode==='small-limit'?2:10000000});
  if(u.pathname==='/rest/api/2/issue/CAL-1/attachments'){
   posts++;assert.equal(opts.method,'POST');assert.equal(opts.headers['X-Atlassian-Token'],'no-check');assert(opts.body instanceof FormData);const f=opts.body.get('file');assert.equal(f.name,'test.txt');assert.equal(await f.text(),'test');
   if(mode==='lost')throw Error('lost');if(mode==='refused')return Response.json({},{status:403});saved=true;return Response.json([{...file,id:'124',filename:'test.txt'}]);
  }
  if(u.pathname==='/secure/thumbnail/123/_thumb.png')return new Response(Buffer.from('thumb'),{headers:{'content-type':'image/png'}});
  if(u.pathname==='/secure/attachment/123/photo.png'){
   if(mode==='external')return new Response(null,{status:302,headers:{location:'https://evil.example/steal'}});
   if(mode==='overflow')return new Response(Buffer.alloc(LIMIT+1));
   return new Response(Buffer.from('test'),{headers:{'content-type':'image/png'}});
  }
  throw Error('Unexpected '+u.pathname);
 };
 server=http.createServer((req,res)=>api(req,res).catch(e=>{res.statusCode=500;res.end(JSON.stringify({error:e.message}));}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const req=async(action,q={},body=null,extra={})=>{const r=await original('http://127.0.0.1:'+server.address().port+'/api?'+new URLSearchParams({action,...q}),{method:body?'POST':'GET',headers:{cookie,'content-type':'application/json',...extra},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,headers:r.headers,data:(r.headers.get('content-type')||'').includes('application/json')?await r.json():await r.text()};};
 let r=await req('jira-attachments',{key:'CAL-1'});assert.equal(r.status,200);assert(r.data.canUpload);assert.equal(r.data.maxBytes,LIMIT);assert(r.data.items[0].preview);assert(!JSON.stringify(r.data).includes('private'));assert(r.headers.get('cache-control').includes('no-store'));
 mode='no-permission';r=await req('jira-attachments',{key:'CAL-1'});assert(!r.data.canUpload);mode='disabled';r=await req('jira-attachments',{key:'CAL-1'});assert(!r.data.canUpload);mode='';
 r=await req('jira-attachment-content',{key:'CAL-1',id:'123'});assert.equal(r.data,'test');assert.equal(r.headers.get('content-type'),'image/png');assert(r.headers.get('content-security-policy').includes('sandbox'));assert.equal(r.headers.get('x-content-type-options'),'nosniff');
 r=await req('jira-attachment-content',{key:'CAL-1',id:'123',download:'1'});assert(r.headers.get('content-disposition').startsWith('attachment'));
 r=await req('jira-attachment-content',{key:'CAL-1',id:'999'});assert.equal(r.status,404);
 for(const [m,status] of [['large',413],['external',422],['overflow',413],['denied',403]]){mode=m;r=await req('jira-attachment-content',{key:'CAL-1',id:'123'});assert.equal(r.status,status,m);}assert(!requests.some(x=>x.startsWith('https://evil')));
 mode='large';r=await req('jira-attachment-content',{key:'CAL-1',id:'123',thumbnail:'1'});assert.equal(r.status,200);assert.equal(r.data,'thumb');assert.equal(r.headers.get('content-type'),'image/png');
 const body=()=>({key:'CAL-1',name:'test.txt',base64:Buffer.from('test').toString('base64'),requestId:crypto.randomUUID()});
 mode='';const b=body();r=await req('jira-attachment-upload',{},b);assert.equal(r.data.outcome,'confirmed');assert.equal(posts,1);r=await req('jira-attachment-upload',{},b);assert(r.data.replayed);assert.equal(posts,1);
 for(const m of ['no-permission','disabled','small-limit']){mode=m;const before=posts;r=await req('jira-attachment-upload',{},body());assert([403,413].includes(r.status));assert.equal(posts,before);}
 mode='';r=await req('jira-attachment-upload',{},body(),{origin:'https://evil.example'});assert.equal(r.status,403);
 for(const change of [b=>b.name='../evil',b=>b.base64='invalid@',b=>b.base64='',b=>b.key='bad',b=>b.requestId='x']){const b=body();change(b);r=await req('jira-attachment-upload',{},b);assert([400,413].includes(r.status));}
 mode='lost';const lost=body();const before=posts;r=await req('jira-attachment-upload',{},lost);assert.equal(r.data.outcome,'unknown');r=await req('jira-attachment-upload',{},lost);assert.equal(r.data.outcome,'unknown');assert.equal(posts,before+1,'No write retry on lost response');
 mode='expired';r=await req('jira-attachments',{key:'CAL-1'});assert.equal(r.status,401);assert(r.headers.get('set-cookie').includes('Max-Age=0'));
 assert.equal(safeContent('https://evil.example/secure/attachment/123/x','123'),'');assert.equal(safeContent('https://task.ascvn.com.vn/secure/attachment/124/x','123'),'');
 const content=require('../lib/jira-content');const options={key:'CAL-1',attachments:[{id:'123',name:'image.png',inline:true}]};let rendered=content.render('!image.png|width=600!',options);assert(rendered.includes('data-jira-inline-image="123"'));assert(rendered.includes('action=jira-attachment-content'));assert(!rendered.includes('width=600'));assert(!content.render('!https://evil.example/tracker!',options).includes('<img'));assert(!content.render('{code}\n!image.png!\n{code}',options).includes('<img'));
 const f=describe('timetracking',{name:'Estimate',schema:{type:'timetracking'}});assert.equal(f.kind,'estimate');assert.deepEqual(encode(f,'2h 30m'),{originalEstimate:'2h 30m'});assert.equal(estimateSeconds('1w 1d 2h 30m'),181800);assert.throws(()=>encode(f,'-2h'));assert.throws(()=>encode(f,'0m'));
 console.log('Attachments: scoped metadata/content, permissions, binary limits, redirects, CSRF, upload/readback/replay/lost response, privacy and estimate codec passed.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{global.fetch=original;if(server)await new Promise(r=>server.close(r));if(old===undefined)delete process.env.APP_SESSION_SECRET;else process.env.APP_SESSION_SECRET=old;});
