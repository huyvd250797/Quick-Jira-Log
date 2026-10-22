'use strict';
const {jiraFetch,JiraError}=require('./jira');
const {params}=require('./jira-issue-detail');
const {resolveSubtaskTypeField}=require('./subtask-type');
const {describe}=require('./jira-create-fields');
const {authIdentity,readIdentity,invalidatePendingJiraReads}=require('./jira-read-scope');
const {runIdempotent,normalizeRequestId}=require('./idempotency');
const endpoint=key=>'/rest/api/2/issue/'+encodeURIComponent(key);
async function read(path,auth){const r=await jiraFetch(path,{timeoutMs:5000},auth);if(!r.response.ok)throw new JiraError(r.response.status===401?'Phiên Jira đã hết hạn.':`Jira không cho phép đọc thông tin sửa Subtask (HTTP ${r.response.status}).`,r.response.status);return r.data;}
async function snapshot(key,id,auth){const issue=await read(endpoint(key)+'?'+new URLSearchParams({fields:['summary','description','issuetype','parent','updated','timetracking',...(id?[id]:[])].join(',')}),auth);if(issue?.key!==key||!issue.fields?.updated||issue.fields.issuetype?.subtask!==true||!issue.fields.parent?.key)throw new JiraError('Chỉ sửa thông tin của Subtask có công việc cha hợp lệ.',422);return issue;}
function estimateSeconds(value){if(typeof value!=='string'||value.length>80||!/^\s*(?:\d+\s*[hm]\s*)+$/i.test(value))throw new JiraError('Estimate dùng giờ/phút, ví dụ 2h 30m hoặc 0m.',400);let n=0;for(const m of value.matchAll(/(\d+)\s*([hm])/gi))n+=Number(m[1])*(m[2].toLowerCase()==='h'?3600:60);if(!Number.isSafeInteger(n)||n>10*365*24*3600)throw new JiraError('Estimate vượt giới hạn.',400);return n;}
const secondsValue=n=>Number.isSafeInteger(n)&&n>=0&&n%60===0?String(n/60)+'m':'';
async function options(query,auth){
 const {key}=params(query);
 const [resolved,meta,permissions]=await Promise.all([resolveSubtaskTypeField(auth,{force:true}),read(endpoint(key)+'/editmeta',auth),read('/rest/api/2/mypermissions?'+new URLSearchParams({issueKey:key,permissions:'EDIT_ISSUES'}),auth)]);
 const issue=await snapshot(key,resolved.ok?resolved.id:'',auth),f=issue.fields,fields=meta?.fields||{};
 const canEdit=Object.entries(permissions?.permissions||{}).some(([k,v])=>(k==='EDIT_ISSUES'||v?.key==='EDIT_ISSUES')&&v?.havePermission===true);
 const warnings=[];if(!canEdit)warnings.push('Tài khoản chưa có quyền Edit Issues cho Subtask này.');if(!resolved.ok)warnings.push(resolved.message);
 function field(name,id,label,kind,value){const raw=fields[id],d=raw?describe(id,raw):null;let reason=!raw?'Trường không có trên màn hình sửa Jira.':!raw.operations?.includes('set')?'Jira không cho phép sửa trường này.':!d||d.kind!==kind?'Kiểu trường chưa được hỗ trợ.':'';if(!canEdit)reason='Không có quyền Edit Issues.';return {name,id,label,kind,required:raw?.required===true,editable:!reason,reason,value,options:d?.options||[]};}
 const rows=[field('summary','summary','Summary','text',typeof f.summary==='string'?f.summary:''),field('subtaskType',resolved.ok?resolved.id:'','Sub-task Type','select',resolved.ok?String(f[resolved.id]?.id||''):''),field('estimate','timetracking','Estimate','estimate',secondsValue(f.timetracking?.originalEstimateSeconds)),field('description','description','Description','textarea',typeof f.description==='string'?f.description:'')];
 const type=rows[1];if(!resolved.ok){type.editable=false;type.reason=resolved.message;}else if(!type.options.length){type.editable=false;type.reason='Jira chưa trả về các lựa chọn Sub-task Type có thể sửa.';}
 if(resolved.ok&&f[resolved.id]&&typeof f[resolved.id]==='object')type.currentLabel=String(f[resolved.id].value||'').slice(0,200);
 if(f.description!=null&&typeof f.description!=='string'||rows[3].value.length>20000){rows[3].editable=false;rows[3].reason='Mô tả có định dạng hoặc độ dài chưa hỗ trợ sửa; hãy mở Jira.';rows[3].value='';}
 const t=f.timetracking||{};if((t.originalEstimateSeconds!=null&&!secondsValue(t.originalEstimateSeconds))||(t.remainingEstimateSeconds!=null&&!secondsValue(t.remainingEstimateSeconds))){rows[2].editable=false;rows[2].reason='Estimate có độ chính xác chưa hỗ trợ; hãy sửa trên Jira.';}
 const revision=readIdentity([key,f.parent.key,f.issuetype.id,rows.map(({value,currentLabel,...d})=>d),canEdit]);
 return {key,parent:f.parent.key,issueTypeId:String(f.issuetype.id),updated:f.updated,revision,fields:rows,warnings,remainingSeconds:Number.isSafeInteger(t.remainingEstimateSeconds)?t.remainingEstimateSeconds:null};
}
function valueFor(field,value){
 if(typeof value!=='string')throw new JiraError('Giá trị không hợp lệ: '+field.label,400);
 if(field.name==='estimate'){if(!value.trim())throw new JiraError('Nhập Estimate; dùng 0m để đặt bằng 0.',400);return {ui:secondsValue(estimateSeconds(value)),jira:{originalEstimate:secondsValue(estimateSeconds(value))}};}
 if(field.name==='subtaskType'){if(!value&&!field.required)return {ui:'',jira:null};if(!field.options.some(o=>o.id===value))throw new JiraError('Sub-task Type không còn hợp lệ; tải lại lựa chọn.',409);return {ui:value,jira:{id:value}};}
 if(value.length>(field.name==='summary'?255:20000)||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)||field.name==='summary'&&/[\r\n\t]/.test(value))throw new JiraError('Nội dung không hợp lệ: '+field.label,400);
 const ui=field.name==='summary'?value.trim():value;if((field.required||field.name==='summary')&&!ui.trim())throw new JiraError('Cần nhập '+field.label+'.',400);return {ui,jira:ui||null};
}
function changedValues(o,values){
 if(!values||typeof values!=='object'||Array.isArray(values)||!Object.keys(values).length)throw new JiraError('Chưa có thay đổi để lưu.',400);
 const changes=[];for(const [name,value] of Object.entries(values)){const field=o.fields.find(f=>f.name===name);if(!field||!field.editable)throw new JiraError('Không được sửa trường: '+(field?.label||name),403);const encoded=valueFor(field,value);if(encoded.ui!==field.value)changes.push({field,...encoded});}if(!changes.length)throw new JiraError('Chưa có thay đổi để lưu.',400);return changes;
}
async function execute(body,auth){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new JiraError('Yêu cầu không hợp lệ.',400);
 const {key}=params(body),id=normalizeRequestId(body.requestId);if(!id||typeof body.expectedUpdated!=='string'||typeof body.revision!=='string'||body.expectedUpdated.length>100||body.revision.length>200)throw new JiraError('Thiếu thông tin xác nhận; hãy tải lại Subtask.',400);
 const identity=readIdentity([id,key,body.expectedUpdated,body.revision,body.values]);
 const result=await runIdempotent('jira-subtask-edit-'+authIdentity(auth),identity,async()=>{
  let o,changes;try{o=await options({key},auth);if(o.updated!==body.expectedUpdated||o.revision!==body.revision)throw new JiraError('Subtask hoặc cấu hình Jira đã thay đổi. Tải lại và xem lại trước khi lưu.',409);changes=changedValues(o,body.values);}catch(e){return {outcome:'rejected',errorStatus:e.status||500,code:'NOT_SENT',message:e.status?e.message:'Chưa đọc được cấu hình; chưa gửi cập nhật.'};}
  const fields=Object.fromEntries(changes.map(c=>[c.field.id,c.jira]));
  if(fields.timetracking&&o.remainingSeconds!==null)fields.timetracking.remainingEstimate=secondsValue(o.remainingSeconds);
  let r;try{r=await jiraFetch(endpoint(key),{method:'PUT',body:{fields},timeoutMs:8000},auth);}catch{invalidatePendingJiraReads();return {outcome:'unknown',message:'Mất phản hồi khi lưu. Kiểm tra Subtask trên Jira trước khi gửi lại.'};}
  if(!r.response.ok){if(r.response.status>=500||[301,302,303,307,308].includes(r.response.status)){invalidatePendingJiraReads();return {outcome:'unknown',message:'Chưa xác định kết quả lưu trên Jira. Kiểm tra trước khi gửi lại.'};}const errors=[...(Array.isArray(r.data?.errorMessages)?r.data.errorMessages:[]),...Object.entries(r.data?.errors||{}).map(([k,v])=>k+': '+v)].map(v=>String(v).replace(/<[^>]*>/g,'').slice(0,250)).slice(0,5).join(' · ');return {outcome:'rejected',...(r.response.status===401?{errorStatus:401,code:'JIRA_SESSION_EXPIRED'}:{}),message:`Jira từ chối cập nhật (HTTP ${r.response.status}). ${errors}`.trim()};}
  invalidatePendingJiraReads();
  try{const saved=await snapshot(key,o.fields.find(f=>f.name==='subtaskType').id,auth),f=saved.fields;if(f.parent.key!==o.parent||String(f.issuetype.id)!==o.issueTypeId)throw Error('context changed');for(const c of changes){const actual=c.field.name==='estimate'?secondsValue(f.timetracking?.originalEstimateSeconds):c.field.name==='subtaskType'?String(f[c.field.id]?.id||''):f[c.field.id]??'';if(actual!==c.ui)throw Error('readback mismatch');}if(fields.timetracking&&o.remainingSeconds!==null&&f.timetracking?.remainingEstimateSeconds!==o.remainingSeconds)throw Error('remaining changed');return {outcome:'confirmed',message:'Đã lưu thông tin Subtask và xác nhận trên Jira.'};}catch{return {outcome:'accepted_unverified',message:'Jira đã nhận cập nhật nhưng chưa đối chiếu được đầy đủ. Kiểm tra trên Jira; không tự gửi lại.'};}
 });return {...result.value,replayed:result.replayed};
}
module.exports={options,execute,estimateSeconds};
