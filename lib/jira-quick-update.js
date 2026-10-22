'use strict';
const {jiraFetch,JiraError}=require('./jira');
const {params}=require('./jira-issue-detail');
const {normalize}=require('./jira-content');
const {invalidatePendingJiraReads,authIdentity,readIdentity}=require('./jira-read-scope');
const {normalizeRequestId,runIdempotent}=require('./idempotency');
const text=(v,max=200)=>typeof v==='string'?v.slice(0,max):'';
const endpoint=key=>`/rest/api/2/issue/${encodeURIComponent(key)}`;
function input(v,max=255){if(typeof v!=='string'||v.length>max||/[\x00-\x1f\x7f]/.test(v))throw new JiraError('Giá trị không hợp lệ.',400);return v.trim();}
function denied(status){return new JiraError(status===401?'Phiên Jira đã hết hạn.':status===403?'Jira từ chối thao tác với quyền hiện tại.':status===404?'Không tìm thấy hoặc không có quyền xem công việc.':`Chưa đọc được dữ liệu Jira (HTTP ${status}).`,status);}
async function read(path,auth){const r=await jiraFetch(path,{timeoutMs:3000},auth);if(!r.response.ok)throw denied(r.response.status);return r.data;}
async function snapshot(key,auth){const data=await read(endpoint(key)+'?fields=updated,status,assignee,priority',auth);if(data?.key!==key||!data.fields?.updated)throw new JiraError('Jira trả về công việc không hợp lệ.',502);return data;}
function permission(data,key){return Object.entries(data?.permissions||{}).some(([name,p])=>(name===key||p?.key===key)&&p?.havePermission===true);}
async function options(query,auth){
 const {key}=params(query);const issue=await snapshot(key,auth);
 const jobs=await Promise.allSettled([read('/rest/api/2/mypermissions?'+new URLSearchParams({issueKey:key}),auth),read(endpoint(key)+'/editmeta',auth),read(endpoint(key)+'/transitions?expand=transitions.fields',auth)]);
 for(const r of jobs)if(r.status==='rejected'&&r.reason.status===401)throw r.reason;
 const warnings=[],labels=['quyền thao tác','trường có thể sửa','trạng thái có thể chuyển'];
 const [permissions,meta,flow]=jobs.map((r,i)=>{if(r.status==='fulfilled')return r.value;warnings.push('Chưa đọc được '+labels[i]+'.');return {};});
 const canAssign=permission(permissions,'ASSIGN_ISSUES'),canEdit=permission(permissions,'EDIT_ISSUES');
 const priority=meta?.fields?.priority;
 const priorities=canEdit&&priority?.operations?.includes('set')&&Array.isArray(priority.allowedValues)?priority.allowedValues.filter(v=>/^\d+$/.test(String(v.id))).map(v=>({id:String(v.id),name:text(v.name)})):[];
 const transitions=Array.isArray(flow?.transitions)?flow.transitions.filter(t=>/^\d+$/.test(String(t.id))&&t.to?.id).map(t=>{
  const required=Object.entries(t.fields||{}).filter(([,f])=>f?.required).map(([id,f])=>({id,name:text(f.name)||id}));
  return {id:String(t.id),name:text(t.name),to:{id:String(t.to.id),name:text(t.to.name)},required,supported:required.length===0};
 }):[];
 return {key,updated:issue.fields.updated,current:{statusId:String(issue.fields.status?.id||''),assignee:issue.fields.assignee?{username:text(issue.fields.assignee.name,255),displayName:text(issue.fields.assignee.displayName)}:null,priorityId:String(issue.fields.priority?.id||'')},canComment:permission(permissions,'ADD_COMMENTS'),canAssign,canUnassign:canAssign&&meta?.fields?.assignee?.required===false,priorities,transitions,warnings};
}
async function assignable(key,query,auth){
 const data=await read('/rest/api/2/user/assignable/search?'+new URLSearchParams({issueKey:key,username:query,maxResults:'50'}),auth);
 if(!Array.isArray(data))throw new JiraError('Jira trả về danh sách nhân sự không hợp lệ.',502);
 return data.filter(x=>x.active!==false&&typeof x.name==='string'&&x.name).slice(0,50).map(x=>({username:text(x.name,255),displayName:text(x.displayName)}));
}
async function users(query,auth){const {key}=params(query),q=input(query.q);if(q.length<2)throw new JiraError('Nhập ít nhất 2 ký tự để tìm người phụ trách.',400);await snapshot(key,auth);const p=await read('/rest/api/2/mypermissions?'+new URLSearchParams({issueKey:key}),auth);if(!permission(p,'ASSIGN_ISSUES'))throw denied(403);return {users:await assignable(key,q,auth)};}
function commentRow(c){if(!/^\d+$/.test(String(c?.id)))throw new JiraError('Jira trả về bình luận không hợp lệ.',502);return {id:String(c.id),author:{username:text(c.author?.name,255),displayName:text(c.author?.displayName)},created:text(c.created,60),body:normalize(c.body)};}
async function comments(query,auth){
 const {key,startAt}=params(query);await snapshot(key,auth);
 const data=await read(endpoint(key)+'/comment?'+new URLSearchParams({startAt:String(startAt),maxResults:'25',orderBy:'-created'}),auth);
 if(!Array.isArray(data?.comments)||!Number.isSafeInteger(data.total)||data.total<0||Number(data.startAt??startAt)!==startAt||data.comments.length>25)throw new JiraError('Trang bình luận Jira không hợp lệ.',502);
 const nextStartAt=startAt+data.comments.length;if(nextStartAt>data.total&&data.comments.length)throw new JiraError('Số lượng bình luận Jira không khớp.',502);
 return {items:data.comments.map(commentRow),total:data.total,nextStartAt,hasMore:!!data.comments.length&&nextStartAt<data.total&&nextStartAt<=100000};
}
function jiraErrors(data){return [...(Array.isArray(data?.errorMessages)?data.errorMessages:[]),...Object.entries(data?.errors||{}).map(([k,v])=>`${k}: ${v}`)].filter(x=>typeof x==='string').map(x=>x.replace(/<[^>]*>/g,'').slice(0,250)).slice(0,5).join(' · ');}
async function execute(body,auth){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new JiraError('Dữ liệu cập nhật không hợp lệ.',400);
 const {key}=params(body),kind=input(body.kind,20),requestId=normalizeRequestId(body.requestId),expectedUpdated=input(body.expectedUpdated,80);
 if(!requestId||!expectedUpdated||!['comment','transition','assignee','priority'].includes(kind))throw new JiraError('Yêu cầu cập nhật không hợp lệ.',400);
 let value;
 if(kind==='comment'){if(typeof body.value!=='string'||!body.value.trim()||body.value.length>10000||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(body.value))throw new JiraError('Bình luận cần từ 1 đến 10.000 ký tự.',400);value=body.value.trim();}
 else if(kind==='assignee'&&body.value===null)value=null;
 else value=input(body.value,255);
 const operation='jira-quick-'+authIdentity(auth),id=readIdentity([requestId,key,kind,value,expectedUpdated]);
 const result=await runIdempotent(operation,id,async()=>{
  try{
  // Refresh metadata before every mutation. Never trust client IDs or permissions.
  const o=await options({key},auth);
  if(o.updated!==expectedUpdated)throw new JiraError('Công việc đã thay đổi trên Jira. Tải lại thông tin và chọn lại trước khi lưu.',409);
  let path=endpoint(key),method='PUT',payload,target;
  if(kind==='comment'){if(!o.canComment)throw denied(403);path+='/comment';method='POST';payload={body:value};}
  if(kind==='priority'){target=o.priorities.find(x=>x.id===value);if(!target)throw new JiraError('Độ ưu tiên không còn được phép sửa. Tải lại lựa chọn từ Jira.',409);payload={fields:{priority:{id:value}}};}
  if(kind==='assignee'){
   if(!o.canAssign||(value===null&&!o.canUnassign))throw denied(403);
   if(value!==null){const people=await assignable(key,value,auth);target=people.find(x=>x.username.toLowerCase()===value.toLowerCase());if(!target)throw new JiraError('Nhân sự không còn trong danh sách được giao công việc này.',409);value=target.username;}
   path+='/assignee';payload={name:value};
  }
  if(kind==='transition'){target=o.transitions.find(x=>x.id===value);if(!target)throw new JiraError('Trạng thái đã thay đổi hoặc transition không còn hợp lệ.',409);if(!target.supported)throw new JiraError('Transition yêu cầu bổ sung: '+target.required.map(x=>x.name).join(', ')+'. Vui lòng mở Jira để hoàn tất.',409);path+='/transitions';method='POST';payload={transition:{id:value}};}
  let r;
  try{r=await jiraFetch(path,{method,body:payload,timeoutMs:8000},auth);}
  catch{return {outcome:'unknown',message:'Mất phản hồi khi gửi Jira; chưa xác định đã lưu hay chưa. Kiểm tra trên Jira trước khi gửi yêu cầu mới.'};}
  if(!r.response.ok){
   if(r.response.status===401)return {outcome:'rejected',errorStatus:401,code:'JIRA_SESSION_EXPIRED',message:'Phiên Jira đã hết hạn. Vui lòng đăng nhập lại.'};
   if(r.response.status>=500||[301,302,303,307,308].includes(r.response.status))return {outcome:'unknown',message:`Jira trả HTTP ${r.response.status}; chưa xác định kết quả. Kiểm tra trên Jira trước khi gửi lại.`};
   return {outcome:'rejected',message:`Jira từ chối cập nhật (HTTP ${r.response.status}). ${jiraErrors(r.data)||'Kiểm tra quyền hoặc trường bắt buộc trên Jira.'}`.trim()};
  }
  // Do not replay mutations on failed verification, including a lost POST response.
  invalidatePendingJiraReads();
  try{
   if(kind==='comment'){
    const id=String(r.data?.id||'');if(!/^\d+$/.test(id))throw Error('missing comment id');
    const saved=await read(endpoint(key)+'/comment/'+id,auth);
    if(typeof saved.body!=='string'||saved.body.trim()!==value)throw Error('comment mismatch');
    return {outcome:'confirmed',message:'Đã gửi bình luận và xác nhận trên Jira.',commentId:id};
   }
   const saved=await snapshot(key,auth),f=saved.fields;
   const matches=kind==='priority'?String(f.priority?.id)===value:kind==='assignee'?(value===null?!f.assignee:String(f.assignee?.name||'').toLowerCase()===value.toLowerCase()):String(f.status?.id)===target.to.id;
   if(!matches)throw Error('value mismatch');
   return {outcome:'confirmed',message:'Đã lưu thay đổi và xác nhận trên Jira.'};
  }catch{return {outcome:'accepted_unverified',message:'Jira đã nhận yêu cầu nhưng chưa đối chiếu được dữ liệu sau lưu. Tải lại hoặc mở Jira để kiểm tra; không tự gửi lại.'};}
  }catch(e){return {outcome:'rejected',errorStatus:e.status||500,code:'NOT_SENT',message:e.status?e.message:'Không gửi được yêu cầu; hãy tải lại lựa chọn.'};}
 });
 return {...result.value,replayed:result.replayed};
}
module.exports={options,users,comments,execute};
