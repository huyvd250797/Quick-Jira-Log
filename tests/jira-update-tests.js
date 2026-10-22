'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),crypto=require('node:crypto');
const api=require('../api'),{createSessionCookie}=require('../lib/session');
const originalFetch=global.fetch,oldSecret=process.env.APP_SESSION_SECRET;let server;
(async()=>{
 process.env.APP_SESSION_SECRET='jira-update-tests-secret-over-32-characters';
 const cookie=createSessionCookie({mode:'basic',username:'boss',password:'fixture'}).split(';')[0];
 let mode='',calls=[],mutations=0,stamp=1,statusId='3',priorityId='2',assignee='boss',nextComment=10;const comments=[];
 const updated=()=>`2026-10-22T10:00:${String(stamp).padStart(2,'0')}.000+0700`;
 global.fetch=async(url,options={})=>{
  const u=new URL(url),path=u.pathname,method=options.method||'GET',body=options.body?JSON.parse(options.body):null;
  calls.push({path,method,body,query:u.searchParams});assert.equal(options.headers.Authorization,'Basic '+Buffer.from('boss:fixture').toString('base64'));
  if(mode==='expired')return Response.json({}, {status:401});
  if(method!=='GET'){
   mutations++;if(mode==='write-reject')return Response.json({errors:{resolution:'Required <script>bad</script>'},internal:'private-diagnostic'},{status:400});
   if(path.endsWith('/comment')){comments.unshift({id:String(nextComment++),author:{name:'boss',displayName:'Boss',emailAddress:'private-email'},created:'2026-10-22T08:00:00.000+0700',body:body.body});}
   if(path.endsWith('/transitions'))statusId='4';
   if(path.endsWith('/assignee'))assignee=body.name;
   if(body.fields?.priority)priorityId=body.fields.priority.id;
   stamp++;
   if(mode==='lost-write')throw Error('connection lost AFTER write');
   if(mode==='write-503')return Response.json({}, {status:503});
   return path.endsWith('/comment')?Response.json({id:comments[0].id},{status:201}):new Response(null,{status:204});
  }
  if(path==='/rest/api/2/mypermissions')return Response.json({permissions:{ADD_COMMENTS:{key:'ADD_COMMENTS',havePermission:mode!=='comment-denied'},EDIT_ISSUES:{havePermission:mode!=='edit-denied'},ASSIGN_ISSUES:{havePermission:mode!=='assign-denied'}}});
  if(path==='/rest/api/2/user/assignable/search'){assert.equal(u.searchParams.get('issueKey'),'CAL-1');return Response.json([{name:'alice',displayName:'Alice <img>',emailAddress:'private-email',active:true},{name:'inactive',active:false}]);}
  if(path.endsWith('/editmeta')){
   if(mode==='meta-denied')return Response.json({}, {status:403});
   return Response.json({fields:{priority:{operations:['set'],allowedValues:[{id:'1',name:'Highest'},{id:'2',name:'High'}]},assignee:{required:mode==='require-assignee'}}});
  }
  if(path.endsWith('/transitions'))return Response.json({transitions:[{id:'10',name:'Start',to:{id:'4',name:'Doing'},fields:{}},{id:'20',name:'Resolve',to:{id:'5',name:'Done'},fields:{resolution:{required:true,name:'Resolution',hasDefaultValue:true}}}]});
  if(path.endsWith('/comment')){
   if(mode==='comments-denied')return Response.json({}, {status:403});
   const startAt=Number(u.searchParams.get('startAt')||0),rows=Array.from({length:26},(_,i)=>({id:String(i+100),body:'Bình luận <script>x</script>',created:'2026-10-22T08:00:00.000+0700',author:{name:'boss',displayName:'Boss',emailAddress:'private-email'},visibility:{type:'group',value:'private-group'}}));
   return Response.json({startAt,total:rows.length,comments:rows.slice(startAt,startAt+25)});
  }
  if(/\/comment\/\d+$/.test(path))return Response.json(comments.find(c=>c.id===path.split('/').at(-1))||{}, {status:mode==='verify-denied'?403:200});
  if(path==='/rest/api/2/issue/CAL-1'){
   if(mode==='hidden'||mode==='verify-denied'&&mutations>0)return Response.json({}, {status:403});
   return Response.json({key:'CAL-1',fields:{updated:updated(),status:{id:statusId},priority:{id:mode==='mismatch'?'999':priorityId},assignee:assignee?{name:assignee,displayName:assignee}:null}});
  }
  throw Error('Unexpected Jira endpoint '+path);
 };
 server=http.createServer((req,res)=>api(req,res).catch(e=>{res.statusCode=500;res.end(JSON.stringify({error:e.message}));}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const request=async(action,q={},body,extra={})=>{const r=await originalFetch(`http://127.0.0.1:${server.address().port}/api?`+new URLSearchParams({action,key:'CAL-1',...q}),{method:body===undefined?'GET':'POST',headers:{cookie,...extra},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});return {status:r.status,data:await r.json(),headers:r.headers};};
 const payload=(kind,value,extra={})=>({key:'CAL-1',kind,value,expectedUpdated:updated(),requestId:crypto.randomUUID(),...extra});
 let r=await request('jira-update-options');assert.equal(r.status,200);assert.equal(r.data.canAssign,true);assert.equal(r.data.canUnassign,true);assert.equal(r.data.priorities.length,2);assert.equal(r.data.transitions[1].supported,false);assert.deepEqual(r.data.transitions[1].required,[{id:'resolution',name:'Resolution'}]);assert(r.headers.get('cache-control').includes('no-store'));
 r=await request('jira-update-users',{q:'ali'});assert.equal(r.data.users.length,1);assert(!JSON.stringify(r.data).includes('private-'));
 r=await request('jira-comments');assert.equal(r.data.items.length,25);assert.equal(r.data.nextStartAt,25);assert(r.data.hasMore);assert(!JSON.stringify(r.data).includes('private-'));r=await request('jira-comments',{startAt:'25'});assert.equal(r.data.items.length,1);assert(!r.data.hasMore);
 let before=mutations;r=await request('jira-update',{},payload('priority','999'));assert.equal(r.status,409);assert.equal(mutations,before);
 r=await request('jira-update',{},payload('transition','20'));assert.equal(r.status,409);assert(r.data.error.includes('Resolution'));assert.equal(mutations,before);
 r=await request('jira-update',{},payload('transition','999'));assert.equal(r.status,409);assert.equal(mutations,before);
 r=await request('jira-update',{},payload('priority','1',{expectedUpdated:'stale'}));assert.equal(r.status,409);assert.equal(mutations,before);
 mode='assign-denied';r=await request('jira-update',{},payload('assignee','alice'));assert.equal(r.status,403);assert.equal(mutations,before);
 mode='comment-denied';r=await request('jira-update',{},payload('comment','Hello'));assert.equal(r.status,403);assert.equal(mutations,before);
 mode='edit-denied';r=await request('jira-update',{},payload('priority','1'));assert.equal(r.status,409);assert.equal(mutations,before);
 mode='require-assignee';r=await request('jira-update',{},payload('assignee',null));assert.equal(r.status,403);assert.equal(mutations,before);
 mode='';r=await request('jira-update',{},payload('assignee','not-assignable'));assert.equal(r.status,409);assert.equal(mutations,before);
 for(const [kind,value] of [['priority','1'],['assignee','alice'],['assignee',null],['transition','10'],['comment','Nội dung\n<strong>văn bản</strong>']]){
  const p=payload(kind,value),count=mutations;r=await request('jira-update',{},p);assert.equal(r.status,200);assert.equal(r.data.outcome,'confirmed');assert.equal(mutations,count+1);r=await request('jira-update',{},p);assert(r.data.replayed);assert.equal(mutations,count+1,'A replay never writes twice');
 }
 mode='lost-write';const p=payload('comment','Bình luận sau mất mạng');before=mutations;r=await request('jira-update',{},p);assert.equal(r.data.outcome,'unknown');assert.equal(mutations,before+1);r=await request('jira-update',{},p);assert.equal(r.data.outcome,'unknown');assert.equal(mutations,before+1,'Lost response does not retry mutation');
 mode='write-503';r=await request('jira-update',{},payload('priority','2'));assert.equal(r.data.outcome,'unknown');
 mode='verify-denied';r=await request('jira-update',{},payload('priority','1'));assert.equal(r.status,403,'Preflight denied: no mutation');mode='';
 mode='mismatch';r=await request('jira-update',{},payload('priority','2'));assert.equal(r.data.outcome,'accepted_unverified');
 mode='write-reject';r=await request('jira-update',{},payload('priority','1'));assert.equal(r.data.outcome,'rejected');assert(r.data.message.includes('resolution'));assert(!r.data.message.includes('<script>'));assert(!JSON.stringify(r.data).includes('private-'));
 mode='meta-denied';r=await request('jira-update-options');assert.equal(r.status,200);assert.equal(r.data.priorities.length,0);assert.equal(r.data.canUnassign,false);assert(r.data.warnings.length);assert(r.data.transitions.length);
 mode='comments-denied';r=await request('jira-comments');assert.equal(r.status,403);
 mode='';before=mutations;r=await request('jira-update',{},payload('comment',''));assert.equal(r.status,400);r=await request('jira-update',{},payload('comment','x'.repeat(10001)));assert.equal(r.status,400);r=await request('jira-update',{},payload('priority','1',{key:'../x'}));assert.equal(r.status,400);r=await request('jira-update',{},'{bad json');assert.equal(r.status,400);r=await request('jira-update',{},payload('priority','1'),{origin:'https://evil.example'});assert.equal(r.status,403);assert.equal(mutations,before);
 r=await request('jira-update');assert.equal(r.status,405);r=await request('jira-update-options',{},{});assert.equal(r.status,405);
 mode='expired';r=await request('jira-update-options');assert.equal(r.status,401);assert(r.headers.get('set-cookie'));
 console.log('Jira quick update: permissions, required fields, assignable users, paging/privacy, CSRF, stale guards, verified writes, replay/lost response, independent metadata/errors passed');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{global.fetch=originalFetch;if(oldSecret===undefined)delete process.env.APP_SESSION_SECRET;else process.env.APP_SESSION_SECRET=oldSecret;if(server)await new Promise(r=>server.close(r));});
