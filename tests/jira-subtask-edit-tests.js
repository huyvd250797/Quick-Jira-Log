'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),crypto=require('node:crypto');
const api=require('../api'),{createSessionCookie}=require('../lib/session');
const originalFetch=global.fetch,secret=process.env.APP_SESSION_SECRET,configured=process.env.JIRA_SUBTASK_TYPE_FIELD_ID;let server;
(async()=>{
 process.env.APP_SESSION_SECRET='subtask-edit-test-session-secret-over-32-characters';delete process.env.JIRA_SUBTASK_TYPE_FIELD_ID;
 const cookie=createSessionCookie({mode:'basic',username:'boss',password:'fixture'}).split(';')[0];let mode='',writes=[],stamp=1;
 let fields={summary:'Subtask cũ',description:'{panel}Nội dung nâng cao{panel}',issuetype:{id:'5',subtask:true},parent:{key:'CAL-1'},updated:'stamp-1',timetracking:{originalEstimateSeconds:3600,remainingEstimateSeconds:1800},customfield_123:{id:'11',value:'Developing'}};
 global.fetch=async(url,opts={})=>{const p=new URL(url).pathname,m=opts.method||'GET';assert.equal(opts.headers.Authorization,'Basic '+Buffer.from('boss:fixture').toString('base64'));
  if(mode==='expired')return Response.json({}, {status:401});
  if(p==='/rest/api/2/field')return Response.json(mode==='ambiguous'?[{id:'customfield_123',name:'Sub-task Type'},{id:'customfield_124',name:'Sub-task Type'}]:[{id:'customfield_123',name:'Sub-task Type'}]);
  if(p==='/rest/api/2/mypermissions')return Response.json({permissions:{EDIT_ISSUES:{havePermission:mode!=='denied'}}});
  if(p.endsWith('/editmeta')){if(mode==='meta-denied')return Response.json({}, {status:403});const f={summary:{name:'Summary',required:true,schema:{type:'string'},operations:['set']},description:{name:'Description',schema:{type:'string'},operations:['set']},timetracking:{name:'Time Tracking',schema:{type:'timetracking'},operations:['set']},customfield_123:{name:'Sub-task Type',schema:{type:'option',custom:'com.atlassian.jira.plugin.system.customfieldtypes:select'},operations:['set'],allowedValues:[{id:'11',value:'Developing'},{id:'12',value:'Testing'}]}};if(mode==='readonly')delete f.description;if(mode==='schema-changed')f.customfield_123.allowedValues=[{id:'11',value:'Developing'}];return Response.json({fields:f});}
  if(p==='/rest/api/2/issue/CAL-2'&&m==='GET'){const f=structuredClone(fields);if(mode==='not-subtask')f.issuetype.subtask=false;if(mode==='verify-mismatch'&&writes.length)f.summary='Different';return Response.json({key:'CAL-2',fields:f});}
  if(p==='/rest/api/2/issue/CAL-2'&&m==='PUT'){
   const payload=JSON.parse(opts.body);writes.push(payload);if(mode==='reject')return Response.json({errors:{summary:'Required <script>bad</script>'}},{status:400});
   for(const [k,v] of Object.entries(payload.fields)){if(k==='timetracking'){const secs=require('../lib/jira-subtask-edit').estimateSeconds;fields.timetracking.originalEstimateSeconds=secs(v.originalEstimate);if(v.remainingEstimate!==undefined)fields.timetracking.remainingEstimateSeconds=secs(v.remainingEstimate);}else fields[k]=v;}
   fields.updated='stamp-'+(++stamp);if(mode==='lost')throw Error('lost AFTER write');return new Response(null,{status:204});
  }throw Error('Unexpected '+m+' '+p);
 };
 server=http.createServer((req,res)=>api(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const request=async(action,body,headers={})=>{const r=await originalFetch(base+'/api?'+new URLSearchParams({action,key:'CAL-2'}),{method:body===undefined?'GET':'POST',headers:{cookie,...headers},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});return {status:r.status,data:await r.json(),headers:r.headers};};
 const options=async()=>{const r=await request('jira-subtask-edit-options');assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');return r.data;};
 const payload=(o,values)=>({key:'CAL-2',revision:o.revision,expectedUpdated:o.updated,requestId:crypto.randomUUID(),values});
 let o=await options();assert.equal(o.fields[1].id,'customfield_123');assert.equal(o.fields[1].kind,'select');assert(o.fields.every(f=>f.editable));assert.equal(o.fields[2].value,'60m');
 let body=payload(o,{summary:'Tiêu đề mới',subtaskType:'12',estimate:'2h 30m',description:'h2. Mô tả\n\n*Đậm* {color:#0f8a64}Xanh{color}'}),r=await request('jira-subtask-edit',body);assert.equal(r.data.outcome,'confirmed');assert.deepEqual(Object.keys(writes[0].fields).sort(),['summary','description','customfield_123','timetracking'].sort());assert.deepEqual(writes[0].fields.customfield_123,{id:'12'});assert.deepEqual(writes[0].fields.timetracking,{originalEstimate:'150m',remainingEstimate:'30m'});assert(!writes[0].fields.issuetype&&!writes[0].fields.parent);
 r=await request('jira-subtask-edit',body);assert(r.data.replayed);assert.equal(writes.length,1);
 for(const values of [{summary:''},{estimate:'1d'},{estimate:'1.5h'},{estimate:'999999999999h'},{summary:'x'.repeat(256)},{subtaskType:'666'},{description:'x'.repeat(20001)},{parent:'CAL-99'},{issuetype:'1'},{summary:'\nX'}]){o=await options();const n=writes.length;r=await request('jira-subtask-edit',payload(o,values));assert(r.status>=400,JSON.stringify(values));assert.equal(writes.length,n);}
 o=await options();r=await request('jira-subtask-edit',payload(o,{}));assert.equal(r.status,400);
 const n=writes.length;r=await request('jira-subtask-edit',payload(o,{summary:'Valid'}),{origin:'https://foreign.test'});assert.equal(r.status,403);assert.equal(writes.length,n);
 o=await options();const stale=payload(o,{summary:'Valid'});fields.updated='external-change';r=await request('jira-subtask-edit',stale);assert.equal(r.status,409);assert.equal(writes.length,n);
 o=await options();mode='schema-changed';r=await request('jira-subtask-edit',payload(o,{subtaskType:'11'}));assert.equal(r.status,409);assert.equal(writes.length,n);mode='';
 o=await options();mode='denied';r=await request('jira-subtask-edit',payload(o,{summary:'Valid'}));assert.equal(r.status,409);assert.equal(writes.length,n);o=await options();assert(o.fields.every(f=>!f.editable));mode='';
 mode='readonly';o=await options();assert(!o.fields[3].editable);r=await request('jira-subtask-edit',payload(o,{description:'Must fail'}));assert.equal(r.status,403);assert.equal(writes.length,n);mode='';
 mode='ambiguous';o=await options();assert(!o.fields[1].editable);mode='';mode='not-subtask';r=await request('jira-subtask-edit-options');assert.equal(r.status,422);mode='';
 o=await options();mode='reject';r=await request('jira-subtask-edit',payload(o,{summary:'Rejected'}));assert.equal(r.data.outcome,'rejected');assert(!r.data.message.includes('<script>'));mode='';
 o=await options();mode='lost';body=payload(o,{summary:'Lost response'});r=await request('jira-subtask-edit',body);assert.equal(r.data.outcome,'unknown');const afterLost=writes.length;r=await request('jira-subtask-edit',body);assert(r.data.replayed);assert.equal(writes.length,afterLost);mode='';
 o=await options();mode='verify-mismatch';r=await request('jira-subtask-edit',payload(o,{summary:'Mismatch'}));assert.equal(r.data.outcome,'accepted_unverified');mode='';
 o=await options();r=await request('jira-subtask-edit',payload(o,{description:'',subtaskType:'',estimate:'0m'}));assert.equal(r.data.outcome,'confirmed');assert.equal(fields.description,null);assert.equal(fields.customfield_123,null);assert.equal(fields.timetracking.originalEstimateSeconds,0);
 mode='expired';r=await request('jira-subtask-edit-options');assert.equal(r.status,401);assert(r.headers.get('set-cookie'));mode='';
 r=await request('jira-subtask-edit','{broken');assert.equal(r.status,400);console.log('Subtask edit API: permissions/editmeta, custom type IDs, 4 fields, original/remaining estimates, validation, CSRF, stale/schema conflicts, replay/lost response and readback passed.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{global.fetch=originalFetch;if(server)await new Promise(r=>server.close(r));if(secret===undefined)delete process.env.APP_SESSION_SECRET;else process.env.APP_SESSION_SECRET=secret;if(configured===undefined)delete process.env.JIRA_SUBTASK_TYPE_FIELD_ID;else process.env.JIRA_SUBTASK_TYPE_FIELD_ID=configured;});
