'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),crypto=require('node:crypto');
const api=require('../api'),{createSessionCookie}=require('../lib/session'),{describe,encode}=require('../lib/jira-create-fields');
const {metadata}=require('../lib/jira-create');
assert.equal(describe('customfield_12345',{name:'Sub-task Type',operations:['set'],schema:{type:'option'},allowedValues:[{id:'10001',value:'Testing'}]}).kind,'select');
assert.equal(describe('customfield_42',{operations:['set'],schema:{type:'option'},allowedValues:[{id:'1',children:[{id:'2'}]}]}).kind,'unsupported');
assert.throws(()=>encode({label:'Ngày',kind:'date'},'2026-02-30'));assert.throws(()=>encode({label:'Số',kind:'number'},Infinity));
assert.throws(()=>encode({label:'URL',kind:'url'},'javascript:alert(1)'));assert.throws(()=>encode({label:'Nhãn',kind:'labels'},['two words']));
const oldFetch=global.fetch,oldSecret=process.env.APP_SESSION_SECRET;let server;
(async()=>{
 process.env.APP_SESSION_SECRET='jira-create-tests-secret-over-32-characters';
 const auth={mode:'basic',username:'boss',password:'fixture',me:{name:'boss'}},cookie=createSessionCookie(auth).split(';')[0];
 let mode='',mutations=0,calls=[],created=new Map(),number=100;
 const types=[{id:'1',name:'Story',subtask:false},{id:'2',name:'Task',subtask:false},{id:'3',name:'Bug',subtask:false},{id:'5',name:'Sub-task',subtask:true}];
 const f=(fieldId,name,type,required=false,rest={})=>({fieldId,name,required,hasDefaultValue:false,operations:['set'],schema:{type},...rest});
 function fields(){const rows=[f('summary','Tiêu đề','string',true),f('description','Mô tả','string'),f('timetracking','Estimate','timetracking'),f('reporter','Người báo cáo','user',true),f('assignee','Người nhận','user',false,{hasDefaultValue:true}),f('priority','Ưu tiên','priority',false,{allowedValues:[{id:'1',name:'High'},{id:'2',name:'Low'}]}),f('customfield_12345','Sub-task Type','option',true,{allowedValues:[{id:mode==='changed'?'999':'10001',value:'Testing <img>'},{id:'10002',value:'Developing'},{id:'10003',value:'Disabled',disabled:true}]}),f('labels','Nhãn','array',false,{schema:{type:'array',items:'string'}}),f('customfield_9','Số','number'),f('duedate','Ngày hết hạn','date'),f('customfield_10','Lịch','datetime'),f('components','Thành phần','array',false,{schema:{type:'array',items:'component'},allowedValues:[{id:'7',name:'API'},{id:'8',name:'UI'}]})];
  if(mode==='complex'||mode==='complex-default')rows.push(f('customfield_99','Trường plugin','object',true,{hasDefaultValue:mode==='complex-default'}));
  if(mode==='paged')for(let i=100;i<151;i++)rows.push(f('customfield_'+i,'Text '+i,'string'));
  if(mode==='bad-meta')rows.push(f('../bad','Invalid','string',true));
  if(mode==='no-operations')for(const field of rows)delete field.operations;
  return rows;
 }
 global.fetch=async(url,options={})=>{
  const u=new URL(url),path=u.pathname,method=options.method||'GET',body=options.body?JSON.parse(options.body):null;calls.push({path,method,body,query:u.searchParams});assert.equal(options.headers.Authorization,'Basic '+Buffer.from('boss:fixture').toString('base64'));
  if(mode==='expired')return Response.json({}, {status:401});
  if(path==='/rest/api/2/issue'&&method==='POST'){
   mutations++;if(mode==='reject')return Response.json({errors:{customfield_12345:'Required <b>value</b>'},diagnostic:'private-debug'},{status:400});
   const key='CAL-'+number++;created.set(key,structuredClone(body.fields));
   if(mode==='lost')throw Error('lost AFTER Jira created');if(mode==='write503')return Response.json({}, {status:503});
   return Response.json(mode==='missing-key'?{}:{key,id:String(number)},{status:201});
  }
  if(path==='/rest/api/2/field')return Response.json([{id:'customfield_888',schema:{custom:'com.pyxis.greenhopper.jira:gh-epic-link'}}]);
  if(path==='/rest/api/2/issuetype')return Response.json([...types,{id:'99',name:'Epic',subtask:false}]);
  if(path==='/rest/api/2/project')return Response.json([{key:'CAL',name:'Dự án <script>'},{key:'OTHER',name:'Dự án khác'}]);
  if(path==='/rest/api/2/mypermissions')return Response.json({permissions:{CREATE_ISSUES:{havePermission:mode!=='denied'},ASSIGN_ISSUES:{havePermission:mode!=='no-assign'},MODIFY_REPORTER:{havePermission:mode==='modify-reporter'}}});
  if(path.startsWith('/rest/api/2/issue/createmeta/CAL/issuetypes')){
   if(mode==='legacy')return Response.json({}, {status:404});
   const typeRows=mode==='paged'?[...types,...Array.from({length:51},(_,i)=>({id:String(1000+i),name:'Type '+i,subtask:false}))]:types;
   let rows=path.endsWith('/issuetypes')?typeRows:fields();if(mode.startsWith('epic')&&!path.endsWith('/issuetypes')&&mode!=='epic-no-field')rows.push({fieldId:'customfield_888',name:'Epic Link',required:true,operations:mode==='epic-readonly'?['get']:['set'],schema:{type:'any',custom:'com.pyxis.greenhopper.jira:gh-epic-link'}});if(mode==='missing-subtask'&&path.endsWith('/issuetypes'))rows=rows.map(({subtask,...rest})=>rest);const start=Number(u.searchParams.get('startAt')||0),values=rows.slice(start,start+50);
   return Response.json({start,...(mode==='missing-subtask'?{isLast:start+values.length>=rows.length}:{last:start+values.length>=rows.length}),size:values.length,total:rows.length,values});
  }
  if(path==='/rest/api/2/issue/createmeta'){assert.equal(u.searchParams.get('projectKeys'),'CAL');return Response.json({projects:[{key:'CAL',issuetypes:types.map(t=>({...t,fields:Object.fromEntries(fields().map(r=>[r.fieldId,r]))}))}]});}
  if(path==='/rest/api/2/user/search')return Response.json([{name:'alice',displayName:'Alice',active:true}]);
  if(path==='/rest/api/2/user/assignable/search'){assert.equal(u.searchParams.get('project'),'CAL');return Response.json([{name:'alice',displayName:'Alice',active:true,emailAddress:'private-email'},{name:'inactive',active:false}]);}
  if(path==='/rest/api/2/search'){
   assert(body.jql.includes('issuetype NOT IN subTaskIssueTypes()'));assert(body.jql.includes('project = "CAL"'));
   return Response.json({issues:[{key:'CAL-1',fields:{summary:'Cha',project:{key:'CAL'},issuetype:{id:'1',name:'Story',subtask:false}}}]});
  }
  if(path.startsWith('/rest/api/2/issue/')){
   const key=path.split('/').at(-1);
   if(created.has(key)){if(mode==='verify-denied')return Response.json({}, {status:403});const data=structuredClone(created.get(key));if(data.timetracking)data.timetracking.originalEstimateSeconds=require('../lib/jira-create-fields').estimateSeconds(data.timetracking.originalEstimate);if(mode==='ignored-field')data.customfield_12345={id:'999'};return Response.json({key,fields:data});}
   return Response.json({key,fields:{summary:'Công việc cha',project:{key:key.startsWith('OTHER')?'OTHER':'CAL'},issuetype:{id:key==='CAL-99'?'99':key==='CAL-5'?'5':'1',subtask:key==='CAL-5'}}});
  }
  throw Error('Unexpected '+path);
 };
 server=http.createServer((req,res)=>api(req,res).catch(e=>{res.statusCode=500;res.end(JSON.stringify({error:e.message}));}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const request=async(action,q={},body,extra={})=>{const r=await oldFetch(`http://127.0.0.1:${server.address().port}/api?`+new URLSearchParams({action,...q}),{method:body===undefined?'GET':'POST',headers:{cookie,...extra},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});return {status:r.status,data:await r.json(),headers:r.headers};};
 const meta=async()=>{const r=await request('jira-create-meta',{project:'CAL',type:'5'});assert.equal(r.status,200);return r.data;};
 const body=m=>({project:'CAL',type:'5',parent:'CAL-1',revision:m.revision,requestId:crypto.randomUUID(),fields:{summary:'Công việc mới <script>text</script>',description:'Mô tả\nNội dung',reporter:'boss',customfield_12345:'10001',assignee:'alice',priority:'1',labels:['qjl','test'],components:['7','8'],customfield_9:2.5,duedate:'2026-10-22',customfield_10:'2026-10-22T08:00:00+07:00'}});
 let r=await request('jira-create-projects');assert.equal(r.data.projects.length,2);assert(r.headers.get('cache-control').includes('no-store'));
 r=await request('jira-create-types',{project:'CAL'});assert.equal(r.data.types.length,4);assert.equal(r.data.types[3].subtask,true);
 let m=await meta();assert.equal(m.fields.find(x=>x.id==='customfield_12345').kind,'select');assert.equal(m.fields.find(x=>x.id==='customfield_12345').options.length,2);assert.equal(m.blocked.length,0);assert.equal(m.reporterUsername,'boss');assert(!JSON.stringify(m).includes('private-'));
 r=await request('jira-create-users',{project:'CAL',q:'ali'});assert.equal(r.data.users.length,1);assert(!JSON.stringify(r.data).includes('private-'));
 r=await request('jira-create-parents',{project:'CAL',q:'Cha'});assert.equal(r.data.items[0].key,'CAL-1');r=await request('jira-create-parents',{project:'CAL',key:'CAL-5'});assert.equal(r.status,400);r=await request('jira-create-parents',{project:'CAL',key:'OTHER-1'});assert.equal(r.status,400);
 let p=body(m),before=mutations;r=await request('jira-create',{},p);assert.equal(r.data.outcome,'confirmed');assert.equal(mutations,before+1);const saved=created.get(r.data.key);assert.deepEqual(saved.customfield_12345,{id:'10001'});assert.deepEqual(saved.parent,{key:'CAL-1'});assert.deepEqual(saved.components,[{id:'7'},{id:'8'}]);assert.equal(saved.customfield_10,'2026-10-22T01:00:00.000+0000');assert(!Object.hasOwn(saved,'requestId'));
 r=await request('jira-create',{},p);assert(r.data.replayed);assert.equal(mutations,before+1);
 for(const type of ['1','2','3']){const normalMeta=await request('jira-create-meta',{project:'CAL',type}),normal=body(normalMeta.data);normal.type=type;normal.parent='';r=await request('jira-create',{},normal);assert.equal(r.data.outcome,'confirmed','Story/Task/Bug use project type metadata');assert.equal(created.get(r.data.key).issuetype.id,type);assert(!Object.hasOwn(created.get(r.data.key),'parent'));}
 const normalMeta=await request('jira-create-meta',{project:'CAL',type:'1'}),invalidParent=body(normalMeta.data);invalidParent.type='1';before=mutations;r=await request('jira-create',{},invalidParent);assert.equal(r.status,400);assert.equal(mutations,before);
 p=body(m);before=mutations;const concurrent=await Promise.all([request('jira-create',{},p),request('jira-create',{},p)]);assert(concurrent.every(x=>x.data.outcome==='confirmed'));assert.equal(mutations,before+1,'Concurrent same request creates once');
 for(const invalid of [p=>p.fields.customfield_12345='invalid',p=>p.fields.customfield_12345='10003',p=>delete p.fields.summary,p=>delete p.fields.customfield_12345,p=>p.fields.reporter='someone-else',p=>p.fields.unknown='bad',p=>p.fields.project={key:'OTHER'},p=>p.parent='CAL-5',p=>p.parent='OTHER-1',p=>p.fields.assignee='not-allowed']){
  const bad=body(m);invalid(bad);before=mutations;r=await request('jira-create',{},bad);assert(r.status>=400,JSON.stringify(r.data));assert.equal(mutations,before);
 }
 mode='changed';before=mutations;r=await request('jira-create',{},body(m));assert.equal(r.status,409);assert.equal(mutations,before);
 mode='denied';r=await request('jira-create-types',{project:'CAL'});assert.equal(r.status,403);r=await request('jira-create',{},body(m));assert.equal(r.status,403);
 mode='complex';m=await meta();assert(m.blocked.some(x=>x.id==='customfield_99'));r=await request('jira-create',{},body(m));assert.equal(r.status,422);
 mode='complex-default';m=await meta();assert.equal(m.blocked.length,0);r=await request('jira-create',{},body(m));assert.equal(r.data.outcome,'confirmed');assert(!Object.hasOwn(created.get(r.data.key),'customfield_99'));
 mode='no-operations';m=await meta();assert.equal(m.blocked.length,0);r=await request('jira-create',{},body(m));assert.equal(r.data.outcome,'confirmed');
 mode='paged';m=await meta();assert(m.fields.length>50);assert(calls.some(c=>c.query.get('startAt')==='50'));
 mode='legacy';m=await meta();r=await request('jira-create',{},body(m));assert.equal(r.data.outcome,'confirmed');assert(calls.some(c=>c.path==='/rest/api/2/issue/createmeta'));
 mode='bad-meta';r=await request('jira-create-meta',{project:'CAL',type:'5'});assert.equal(r.status,502);
 mode='';m=await meta();
 for(const next of ['lost','write503','verify-denied','missing-key','ignored-field']){
  mode=next;p=body(m);before=mutations;r=await request('jira-create',{},p);assert.equal(r.data.outcome,['lost','write503'].includes(next)?'unknown':'accepted_unverified');assert.equal(mutations,before+1);r=await request('jira-create',{},p);assert.equal(mutations,before+1);assert(r.data.replayed);
 }
 mode='reject';r=await request('jira-create',{},body(m));assert.equal(r.data.outcome,'rejected');assert(r.data.message.includes('customfield_12345'));assert(!r.data.message.includes('<b>'));assert(!JSON.stringify(r.data).includes('private-debug'));
 mode='';r=await request('jira-create',{},body(m),{origin:'https://evil.example'});assert.equal(r.status,403);r=await request('jira-create',{},'null');assert.equal(r.status,400);r=await request('jira-create',{},'{bad');assert.equal(r.status,400);r=await request('jira-create');assert.equal(r.status,405);
 r=await request('jira-create-meta',{project:'../x',type:'5'});assert.equal(r.status,400);r=await request('jira-create-types',{project:'CAL'},{ });assert.equal(r.status,405);r=await request('jira-create-projects',{},undefined,{cookie:''});assert.equal(r.status,401);
 mode='expired';r=await request('jira-create-projects');assert.equal(r.status,401);assert(r.headers.get('set-cookie'));
 mode='missing-subtask';r=await request('jira-create-subtask-context',{key:'CAL-1'});assert.equal(r.status,200);assert.equal(r.data.parent.key,'CAL-1');assert.equal(r.data.meta.type.subtask,true);assert.deepEqual(r.data.types.map(t=>t.id),['5']);assert(r.data.meta.fields.some(f=>f.id==='summary'));
 r=await request('jira-create-subtask-context',{key:'CAL-1',type:'1'});assert.equal(r.status,400);r=await request('jira-create-subtask-context',{key:'CAL-5'});assert.equal(r.status,400);
 mode='denied';r=await request('jira-create-subtask-context',{key:'CAL-1'});assert.equal(r.status,403);
 mode='modify-reporter';m=await meta();assert(m.canModifyReporter);p=body(m);p.fields.reporter='alice';p.fields.timetracking='2h 30m';r=await request('jira-create',{},p);assert.equal(r.data.outcome,'confirmed');assert.deepEqual(created.get(r.data.key).reporter,{name:'alice'});assert.deepEqual(created.get(r.data.key).timetracking,{originalEstimate:'2h 30m'});
 mode='epic';let ep=await request('jira-create-meta',{project:'CAL',type:'1',epic:'CAL-99'});assert.equal(ep.status,200);assert.deepEqual(ep.data.epic,{key:'CAL-99',field:'customfield_888'});
 const epBody={...body(ep.data),type:'1',parent:'',epic:'CAL-99'};r=await request('jira-create',{},epBody);assert.equal(r.data.outcome,'confirmed');assert.equal(created.get(r.data.key).customfield_888,'CAL-99');assert(!created.get(r.data.key).parent);
 before=mutations;r=await request('jira-create',{},epBody);assert(r.data.replayed);assert.equal(mutations,before);
 r=await request('jira-create-meta',{project:'CAL',type:'5',epic:'CAL-99'});assert.equal(r.status,400);
 r=await request('jira-create-meta',{project:'CAL',type:'1',epic:'CAL-1'});assert.equal(r.status,400);
 r=await request('jira-create-meta',{project:'CAL',type:'1',epic:'OTHER-99'});assert.equal(r.status,400);
 for(const next of ['epic-no-field','epic-readonly']){mode=next;r=await request('jira-create-meta',{project:'CAL',type:'1',epic:'CAL-99'});assert.equal(r.status,422);}
 mode='epic';r=await request('jira-create',{}, {...epBody,requestId:crypto.randomUUID(),fields:{...epBody.fields,customfield_888:'CAL-1'}});assert.equal(r.status,400);assert.equal(mutations,before);
 console.log('Epic creation: real Epic Link payload/readback/replay, type/project/parent validation, missing/read-only screen field and tampering rejected.');
 console.log('Jira create: dynamic IDs/fields, modern paging/legacy, parent/project/type, assignee/reporter, defaults/unsupported, validation/permissions/CSRF, verified writes, concurrent/replay/lost response passed');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{global.fetch=oldFetch;if(oldSecret===undefined)delete process.env.APP_SESSION_SECRET;else process.env.APP_SESSION_SECRET=oldSecret;if(server)await new Promise(r=>server.close(r));});
