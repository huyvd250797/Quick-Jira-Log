'use strict';
const {jiraFetch,JiraError}=require('./jira');
const {JIRA_BASE_URL}=require('./config');
const {publicIssue,searchParams}=require('./jira-search');
const {describe,encode,missing,estimateSeconds}=require('./jira-create-fields');
const {readIdentity,authIdentity,invalidatePendingJiraReads}=require('./jira-read-scope');
const {normalizeRequestId,runIdempotent}=require('./idempotency');
const keyPattern=/^[A-Z][A-Z0-9_]*-\d+$/,text=(v,n=200)=>typeof v==='string'?v.slice(0,n):'';
function project(value){if(typeof value!=='string'||!/^[A-Z][A-Z0-9_]*$/.test(value)||value.length>100)throw new JiraError('Mã dự án không hợp lệ.',400);return value;}
function typeId(value){if(typeof value!=='string'||!/^\d{1,30}$/.test(value))throw new JiraError('Loại công việc không hợp lệ.',400);return value;}
function context(ms=40000){return {deadline:Date.now()+ms};}
async function request(path,auth,ctx,extra={}){
 const left=ctx.deadline-Date.now();if(left<1200)throw new JiraError('Hết thời gian đọc cấu hình Jira; chưa gửi yêu cầu tạo. Hãy thử tải lại.',504);
 const r=await jiraFetch(path,{timeoutMs:Math.min(3000,Math.floor((left-500)/3)),...extra},auth);
 if(!r.response.ok)throw new JiraError(r.response.status===401?'Phiên Jira đã hết hạn.':r.response.status===403?'Jira không cho phép thao tác với quyền hiện tại.':r.response.status===404?'Không tìm thấy dữ liệu hoặc chưa có quyền xem trên Jira.':`Không đọc được cấu hình Jira (HTTP ${r.response.status}).`,r.response.status);
 return r.data;
}
function permission(data,name){return Object.entries(data?.permissions||{}).some(([k,v])=>(k===name||v?.key===name)&&v?.havePermission===true);}
async function permissions(p,auth,ctx){const data=await request('/rest/api/2/mypermissions?'+new URLSearchParams({projectKey:p}),auth,ctx);if(!permission(data,'CREATE_ISSUES'))throw new JiraError('Bạn chưa có quyền Create Issues trong dự án này.',403);return data;}
async function projects(auth){const rows=await request('/rest/api/2/project',auth,context());if(!Array.isArray(rows))throw new JiraError('Danh sách dự án không hợp lệ.',502);return {projects:rows.filter(x=>/^[A-Z][A-Z0-9_]*$/.test(x?.key||'')).slice(0,1000).map(x=>({key:x.key,name:text(x.name)})),truncated:rows.length>1000};}
async function pages(path,auth,ctx){
 const rows=[];let startAt=0;
 for(let page=0;page<10;page++){
  const data=await request(path+'?'+new URLSearchParams({startAt:String(startAt),maxResults:'50'}),auth,ctx);
  const last=typeof data?.last==='boolean'?data.last:typeof data?.isLast==='boolean'?data.isLast:null;
  if(!Array.isArray(data?.values)||Number(data.start??data.startAt??startAt)!==startAt||last===null)throw new JiraError('Trang metadata Jira không hợp lệ.',502);
  if(data.values.length>50)throw new JiraError('Trang metadata Jira vượt giới hạn.',502);
  rows.push(...data.values);if(last)return rows;
  if(!data.values.length)throw new JiraError('Metadata Jira bị thiếu trang.',502);startAt+=data.values.length;
 }
 throw new JiraError('Metadata có quá nhiều trường/loại công việc; hãy tạo trực tiếp trên Jira.',422);
}
async function legacy(p,type,auth,ctx){
 const query={projectKeys:p,...(type?{issuetypeIds:type,expand:'projects.issuetypes.fields'}:{})};
 const data=await request('/rest/api/2/issue/createmeta?'+new URLSearchParams(query),auth,ctx);
 const found=data?.projects?.find(x=>x.key===p);if(!found||!Array.isArray(found.issuetypes))throw new JiraError('Dự án không có loại công việc được phép tạo.',403);return found.issuetypes;
}
async function typeRows(p,auth,ctx){
 let rows;try{rows=await pages(`/rest/api/2/issue/createmeta/${encodeURIComponent(p)}/issuetypes`,auth,ctx);}catch(e){if(![404,405,501].includes(e.status))throw e;rows=await legacy(p,'',auth,ctx);}
 if(rows.some(t=>typeof t.subtask!=='boolean')){
  const directory=await request('/rest/api/2/issuetype',auth,ctx);if(!Array.isArray(directory))throw new JiraError('Không xác định được loại Subtask từ Jira.',502);
  const byId=new Map(directory.map(t=>[String(t.id),t]));rows=rows.map(t=>typeof t.subtask==='boolean'?t:{...t,subtask:byId.get(String(t.id))?.subtask});
  if(rows.some(t=>typeof t.subtask!=='boolean'))throw new JiraError('Jira thiếu thông tin loại công việc con. Chưa gửi yêu cầu tạo.',502);
 }
 return rows;
}
const publicType=t=>({id:String(t.id),name:text(t.name),subtask:t.subtask===true});
async function types(query,auth){const p=project(query.project),ctx=context();await permissions(p,auth,ctx);const rows=await typeRows(p,auth,ctx);return {types:rows.filter(x=>/^\d+$/.test(String(x.id))).map(publicType)};}
async function metadata(query,auth,ctx=context(),resolved=null){
 const p=project(query.project),id=typeId(query.type),perms=resolved?.permissions||await permissions(p,auth,ctx);
 const available=resolved?.types||await typeRows(p,auth,ctx),t=available.find(x=>String(x.id)===id);if(!t)throw new JiraError('Loại công việc không còn được phép tạo trong dự án này.',409);
 let rows;
 try{rows=await pages(`/rest/api/2/issue/createmeta/${encodeURIComponent(p)}/issuetypes/${id}`,auth,ctx);}
 catch(e){if(![404,405,501].includes(e.status))throw e;const old=await legacy(p,id,auth,ctx),found=old.find(x=>String(x.id)===id);if(!found?.fields)throw new JiraError('Không đọc được trường tạo công việc.',502);rows=Object.entries(found.fields).map(([fieldId,f])=>({...f,fieldId}));}
 if(rows.some(f=>typeof (f.fieldId||f.key)!=='string'||!/^(?:[a-z][a-zA-Z0-9]*|customfield_\d+)$/.test(f.fieldId||f.key)))throw new JiraError('Metadata có định danh trường không hợp lệ.',502);
 const fields=rows.map(f=>describe(f.fieldId||f.key,f)).filter(Boolean);
 if(new Set(fields.map(f=>f.id)).size!==fields.length||!fields.some(f=>f.id==='summary'&&f.kind==='text'))throw new JiraError('Metadata thiếu tiêu đề hoặc trùng trường; không thể tạo an toàn.',502);
 let epic=null;
 if(query.epic){
  const key=String(query.epic);const relation=await require('./jira-working-tree').metadata(auth);
  if(t.subtask||String(t.id)===relation.epicType)throw new JiraError('Chọn Story, Task hoặc Bug trong Epic.',400);
  const item=await parent(key,p,auth,ctx);if(item.issueType.id!==relation.epicType)throw new JiraError('Công việc đã chọn không phải Epic.',400);
  const field=fields.find(f=>f.id===relation.link&&f.kind==='text');if(!field)throw new JiraError('Epic Link chưa được phép nhập trên màn hình tạo Jira. Nhờ quản trị thêm trường này vào Create Screen.',422);
  epic={key,field:relation.link};
 }
 fields.sort((a,b)=>(a.id==='summary'?-1:b.id==='summary'?1:a.id==='description'?-1:b.id==='description'?1:a.label.localeCompare(b.label)));
 const canAssign=permission(perms,'ASSIGN_ISSUES');
 const blocked=fields.filter(f=>f.required&&!f.hasDefault&&f.id!==epic?.field&&(f.kind==='unsupported'||f.kind==='assignee'&&!canAssign||['select','multi'].includes(f.kind)&&!f.options.length)).map(f=>({id:f.id,label:f.label}));
 const reporterUsername=text(auth.me?.name||auth.username,255);
 if(fields.some(f=>f.kind==='reporter'&&f.required&&!f.hasDefault)&&!reporterUsername)throw new JiraError('Không xác định được người báo cáo hiện tại. Hãy đăng nhập lại.',401);
 const canModifyReporter=permission(perms,'MODIFY_REPORTER');
 const revision=readIdentity([p,publicType(t),fields,canAssign,reporterUsername,canModifyReporter]);
 return {project:p,type:publicType(t),...(epic?{epic}:{}),fields,canAssign,canModifyReporter,blocked,revision,reporterUsername};
}
async function reporters(query,auth){
 const p=project(query.project),q=text(query.q,256).trim(),ctx=context();if(q.length<2||q.length>255||/[\x00-\x1f\x7f]/.test(q))throw new JiraError('Nhập ít nhất 2 ký tự.',400);
 const perms=await permissions(p,auth,ctx);if(!permission(perms,'MODIFY_REPORTER'))throw new JiraError('Bạn chưa có quyền đổi Reporter.',403);
 const data=await request('/rest/api/2/user/search?'+new URLSearchParams({username:q,maxResults:'50'}),auth,ctx);if(!Array.isArray(data))throw new JiraError('Danh sách Reporter không hợp lệ.',502);
 return {users:data.filter(x=>x.active!==false&&typeof x.name==='string'&&x.name).slice(0,50).map(x=>({username:text(x.name,255),displayName:text(x.displayName)}))};
}
async function users(query,auth,ctx=context()){
 const p=project(query.project),q=text(query.q,256).trim();if(q.length<2||q.length>255||/[\x00-\x1f\x7f]/.test(q))throw new JiraError('Nhập từ 2 đến 255 ký tự để tìm nhân sự.',400);
 const perms=await permissions(p,auth,ctx);if(!permission(perms,'ASSIGN_ISSUES'))throw new JiraError('Bạn chưa có quyền giao công việc trong dự án này.',403);
 const rows=await request('/rest/api/2/user/assignable/search?'+new URLSearchParams({project:p,username:q,maxResults:'50'}),auth,ctx);
 if(!Array.isArray(rows))throw new JiraError('Danh sách nhân sự Jira không hợp lệ.',502);
 return {users:rows.filter(x=>x.active!==false&&typeof x.name==='string'&&x.name).slice(0,50).map(x=>({username:text(x.name,255),displayName:text(x.displayName)}))};
}
async function parent(key,p,auth,ctx){
 if(typeof key!=='string'||!keyPattern.test(key)||key.length>100)throw new JiraError('Mã công việc cha không hợp lệ.',400);
 const data=await request('/rest/api/2/issue/'+encodeURIComponent(key)+'?fields=summary,project,issuetype,status,assignee,priority,updated,parent',auth,ctx),item=publicIssue(data);
 if(!item||item.key!==key||item.project.key!==p||item.issueType.subtask)throw new JiraError('Công việc cha phải cùng dự án và không phải Subtask.',400);return item;
}
async function parents(query,auth){
 const p=project(query.project),ctx=context();await permissions(p,auth,ctx);
 if(query.key)return {items:[await parent(query.key,p,auth,ctx)]};
 const q=text(query.q,161).trim();if(q.length<2||q.length>160)throw new JiraError('Nhập từ 2 đến 160 ký tự để tìm công việc cha.',400);
 const s=searchParams({q,project:p}),pos=s.jql.lastIndexOf('ORDER BY'),body={jql:s.jql.slice(0,pos)+'AND issuetype NOT IN subTaskIssueTypes() '+s.jql.slice(pos),maxResults:25,startAt:0,fields:['summary','project','issuetype','status']};
 let data;try{data=await request('/rest/api/2/search',auth,ctx,{method:'POST',body});}catch(e){if(![403,404,405].includes(e.status))throw e;data=await request('/rest/api/2/search?'+new URLSearchParams({...body,fields:body.fields.join(',')}),auth,ctx);}
 if(!Array.isArray(data?.issues))throw new JiraError('Kết quả tìm công việc cha không hợp lệ.',502);
 return {items:data.issues.slice(0,25).map(publicIssue).filter(x=>x&&x.project.key===p&&!x.issueType.subtask)};
}
async function subtaskContext(query,auth){
 const key=typeof query.key==='string'?query.key.trim().toUpperCase():'';if(!keyPattern.test(key)||key.length>100)throw new JiraError('Mã công việc cha không hợp lệ.',400);
 const ctx=context(),data=await request('/rest/api/2/issue/'+encodeURIComponent(key)+'?fields=summary,project,issuetype,status,assignee,priority,updated,parent',auth,ctx),item=publicIssue(data);
 if(!item||item.key!==key||item.issueType.subtask)throw new JiraError('Chỉ tạo Subtask từ công việc cha, không tạo con của Subtask.',400);
 const p=project(item.project.key),perms=await permissions(p,auth,ctx),rows=await typeRows(p,auth,ctx);
 const available=rows.filter(t=>t.subtask===true&&/^\d+$/.test(String(t.id))).map(publicType);
 if(!available.length)throw new JiraError('Dự án này không có loại Subtask được phép tạo với tài khoản hiện tại.',403);
 const selected=query.type?typeId(query.type):available[0].id;if(!available.some(t=>t.id===selected))throw new JiraError('Loại được chọn không phải Subtask của dự án này.',400);
 const meta=await metadata({project:p,type:selected},auth,ctx,{permissions:perms,types:rows});if(!meta.type.subtask)throw new JiraError('Loại Subtask vừa thay đổi trên Jira. Hãy tải lại form.',409);
 return {parent:item,types:available,meta};
}
function jiraMessage(data){return [...(Array.isArray(data?.errorMessages)?data.errorMessages:[]),...Object.entries(data?.errors||{}).map(([k,v])=>`${k}: ${v}`)].filter(x=>typeof x==='string').map(x=>x.replace(/<[^>]*>/g,'').slice(0,250)).slice(0,8).join(' · ');}
function matches(kind,actual,expected){
 if(kind==='estimate')return Number.isSafeInteger(actual?.originalEstimateSeconds)&&actual.originalEstimateSeconds===estimateSeconds(expected.originalEstimate);
 if(['assignee','reporter'].includes(kind))return String(actual?.name||'').toLowerCase()===expected.name.toLowerCase();
 if(kind==='select')return String(actual?.id)===expected.id;
 if(['multi','labels'].includes(kind))return Array.isArray(actual)&&JSON.stringify(actual.map(x=>kind==='multi'?String(x?.id):x).sort())===JSON.stringify(expected.map(x=>kind==='multi'?x.id:x).sort());
 if(kind==='datetime')return Date.parse(actual)===Date.parse(expected);
 return actual===expected;
}
async function create(body,auth){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new JiraError('Dữ liệu tạo công việc không hợp lệ.',400);
 const p=project(body.project),id=typeId(body.type),requestId=normalizeRequestId(body.requestId);
 if(!requestId||typeof body.revision!=='string'||!/^[a-f0-9]{64}$/.test(body.revision)||!body.fields||typeof body.fields!=='object'||Array.isArray(body.fields)||Object.keys(body.fields).length>500)throw new JiraError('Yêu cầu thiếu metadata hoặc dữ liệu hợp lệ.',400);
 const fingerprint=readIdentity([body.revision,p,id,body.parent||'',body.epic||'',Object.entries(body.fields).sort(([a],[b])=>a.localeCompare(b))]);
 const result=await runIdempotent('jira-create-'+authIdentity(auth),readIdentity([requestId,fingerprint]),async()=>{
  let payload,expectedSummary,checks;
  try{
   const ctx=context(28000),meta=await metadata({project:p,type:id,epic:body.epic},auth,ctx);
   if(meta.revision!==body.revision)throw new JiraError('Cấu hình tạo công việc đã thay đổi. Tải lại form, kiểm tra lại rồi xác nhận.',409);
   if(meta.blocked.length)throw new JiraError('Cần xử lý trường bắt buộc trên Jira: '+meta.blocked.map(f=>f.label).join(', ')+'.',422);
   const byId=new Map(meta.fields.map(f=>[f.id,f])),fields={project:{key:p},issuetype:{id}};
   for(const [fieldId,value]of Object.entries(body.fields)){
    const field=byId.get(fieldId);if(!field||field.kind==='unsupported')throw new JiraError('Trường không được phép gửi: '+fieldId+'.',400);
    if(meta.epic?.field===fieldId)throw new JiraError('Epic Link được cố định theo Epic đã chọn.',400);
    if(missing(value))continue;fields[fieldId]=encode(field,value);
   }
   if(meta.epic)fields[meta.epic.field]=meta.epic.key;
   for(const field of meta.fields)if(field.id!==meta.epic?.field&&field.required&&!field.hasDefault&&missing(body.fields[field.id]))throw new JiraError('Cần nhập '+field.label+'.',400);
   if(typeof fields.summary!=='string'||!fields.summary.trim())throw new JiraError('Cần nhập tiêu đề công việc.',400);
   if(meta.type.subtask){const item=await parent(body.parent,p,auth,ctx);fields.parent={key:item.key};}
   else if(body.parent)throw new JiraError('Chỉ Subtask được chọn công việc cha trong form này.',400);
   if(fields.reporter&&fields.reporter.name!==meta.reporterUsername){
    if(!meta.canModifyReporter)throw new JiraError('Bạn chưa có quyền đổi Reporter.',403);
    const candidates=await reporters({project:p,q:fields.reporter.name},auth),found=candidates.users.find(x=>x.username.toLowerCase()===fields.reporter.name.toLowerCase());if(!found)throw new JiraError('Reporter không còn hợp lệ.',409);fields.reporter={name:found.username};
   }
   if(fields.assignee){if(!meta.canAssign)throw new JiraError('Bạn chưa có quyền giao công việc.',403);const candidates=await request('/rest/api/2/user/assignable/search?'+new URLSearchParams({project:p,username:fields.assignee.name,maxResults:'50'}),auth,ctx),found=Array.isArray(candidates)&&candidates.find(x=>x.active!==false&&typeof x.name==='string'&&x.name.toLowerCase()===fields.assignee.name.toLowerCase());if(!found)throw new JiraError('Nhân sự không còn được phép nhận việc trong dự án.',409);fields.assignee={name:found.name};}
   payload={fields};expectedSummary=fields.summary;checks=meta.fields.filter(f=>Object.hasOwn(fields,f.id)).map(f=>({id:f.id,kind:f.kind}));
  }catch(e){return {outcome:'rejected',errorStatus:e.status||500,code:'NOT_SENT',message:e.status?e.message:'Chưa gửi được yêu cầu tạo công việc.'};}
  let r;
  try{r=await jiraFetch('/rest/api/2/issue',{method:'POST',body:payload,timeoutMs:8000},auth);}
  catch{return {outcome:'unknown',message:'Mất phản hồi khi tạo công việc. Kiểm tra Jira trước khi tạo lại để tránh trùng.'};}
  if(!r.response.ok){
   if(r.response.status===401)return {outcome:'rejected',errorStatus:401,code:'SESSION_EXPIRED',message:'Phiên Jira đã hết hạn.'};
   if(r.response.status>=500||r.response.status>=300&&r.response.status<400)return {outcome:'unknown',message:`Jira trả HTTP ${r.response.status}; chưa rõ kết quả tạo. Kiểm tra Jira trước khi gửi lại.`};
   return {outcome:'rejected',message:`Jira từ chối tạo (HTTP ${r.response.status}). ${jiraMessage(r.data)||'Kiểm tra quyền và các trường bắt buộc.'}`};
  }
  const key=r.data?.key;if(!keyPattern.test(key||''))return {outcome:'accepted_unverified',message:'Jira đã nhận yêu cầu nhưng không trả mã công việc hợp lệ. Kiểm tra Jira, không tự tạo lại.'};
  const receipt={key,url:JIRA_BASE_URL+'/browse/'+encodeURIComponent(key)};
  invalidatePendingJiraReads();
  try{
   const requested=[...new Set(['summary','project','issuetype','parent',...checks.map(f=>f.id)])].join(',');
   const data=await request('/rest/api/2/issue/'+encodeURIComponent(key)+'?fields='+requested,auth,context(8000));
   if(data.key!==key||data.fields?.project?.key!==p||String(data.fields?.issuetype?.id)!==id||data.fields?.summary!==expectedSummary||(payload.fields.parent&&data.fields?.parent?.key!==payload.fields.parent.key))throw Error('Mismatch');
   if(checks.some(f=>!matches(f.kind,data.fields?.[f.id],payload.fields[f.id])))throw Error('Saved fields mismatch');
   return {...receipt,outcome:'confirmed',message:'Đã tạo '+key+' và xác nhận trên Jira.'};
  }catch{return {...receipt,outcome:'accepted_unverified',message:'Jira đã tạo '+key+' nhưng chưa đọc lại được thông tin. Mở công việc để kiểm tra; không tự tạo lại.'};}
 });
 return {...result.value,replayed:result.replayed};
}
module.exports={projects,types,metadata,users,parents,create,reporters,subtaskContext};
