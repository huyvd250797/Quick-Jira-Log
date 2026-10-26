'use strict';
const {jiraFetch,JiraError}=require('./jira');
const {JIRA_BASE_URL}=require('./config');
const {params}=require('./jira-issue-detail');
const {runIdempotent,normalizeRequestId}=require('./idempotency');
const {readIdentity,authIdentity,invalidatePendingJiraReads}=require('./jira-read-scope');
const LIMIT=3*1024*1024;
const raster=/^image\/(?:png|jpeg|gif|webp|avif)$/i;
function safeContent(value,id){try{const u=new URL(value,JIRA_BASE_URL),base=new URL(JIRA_BASE_URL);return u.origin===base.origin&&!u.username&&!u.password&&u.pathname.startsWith('/secure/attachment/'+id+'/')?u.href:'';}catch{return '';}}
function safeThumbnail(value,id){try{if(!value)return '';const u=new URL(value,JIRA_BASE_URL);return u.origin===new URL(JIRA_BASE_URL).origin&&!u.username&&!u.password&&u.pathname.startsWith('/secure/thumbnail/'+id+'/')?u.href:'';}catch{return '';}}
async function rows(key,auth){
 const r=await jiraFetch('/rest/api/2/issue/'+encodeURIComponent(key)+'?fields=attachment',{timeoutMs:4000},auth);
 if(!r.response.ok)throw new JiraError('Không đọc được tệp đính kèm trên Jira.',r.response.status);
 if(r.data?.key!==key||!Array.isArray(r.data?.fields?.attachment))throw new JiraError('Dữ liệu tệp Jira không hợp lệ.',502);
 return r.data.fields.attachment;
}
function publicFile(a){const id=String(a.id||'');if(!/^\d{1,30}$/.test(id))return null;
 return {id,name:String(a.filename||'Tệp').slice(0,255),size:Number.isSafeInteger(a.size)&&a.size>=0?a.size:null,mime:String(a.mimeType||'application/octet-stream').slice(0,100),created:String(a.created||'').slice(0,50),author:String(a.author?.displayName||a.author?.name||'').slice(0,200),url:safeContent(a.content,id),preview:raster.test(a.mimeType||'')&&Number.isSafeInteger(a.size)&&a.size<=20*1024*1024};
}
async function capability(key,auth){
 const [p,m]=await Promise.all([jiraFetch('/rest/api/2/mypermissions?'+new URLSearchParams({issueKey:key,permissions:'CREATE_ATTACHMENTS'}),{timeoutMs:3000},auth),jiraFetch('/rest/api/2/attachment/meta',{timeoutMs:3000},auth)]);
 if(p.response.status===401||m.response.status===401)throw new JiraError('Phiên Jira đã hết hạn.',401);
 return {canUpload:p.response.ok&&Object.entries(p.data?.permissions||{}).some(([k,v])=>(k==='CREATE_ATTACHMENTS'||v?.key==='CREATE_ATTACHMENTS')&&v?.havePermission===true)&&m.response.ok&&m.data?.enabled===true,maxBytes:Math.min(LIMIT,Number.isSafeInteger(m.data?.uploadLimit)&&m.data.uploadLimit>0?m.data.uploadLimit:LIMIT)};
}
async function list(query,auth){const {key}=params(query);const [all,cap]=await Promise.all([rows(key,auth),capability(key,auth)]);return {items:all.map(publicFile).filter(Boolean),...cap};}
function authHeaders(auth){if(auth?.mode==='session'&&auth.cookie)return {Cookie:auth.cookie};if(auth?.mode==='basic'&&auth.username&&auth.password)return {Authorization:'Basic '+Buffer.from(auth.username+':'+auth.password).toString('base64')};throw new JiraError('Vui lòng đăng nhập Jira.',401);}
async function bounded(response,max=LIMIT){const reader=response.body.getReader();let size=0;const chunks=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new JiraError('Tệp lớn hơn giới hạn xem trong app; hãy mở trên Jira.',413);}chunks.push(Buffer.from(value));}return Buffer.concat(chunks);}finally{reader.releaseLock();}}
async function content(query,auth){const {key}=params(query),id=String(query.id||'');if(!/^\d{1,30}$/.test(id))throw new JiraError('ID tệp không hợp lệ.',400);
 const all=await rows(key,auth),a=all.find(x=>String(x.id)===id),file=a&&publicFile(a);if(!file)throw new JiraError('Không tìm thấy tệp trong công việc này.',404);
 const thumbnail=query.thumbnail==='1';
 if(query.part!==undefined){
  const part=String(query.part),chunk=2*1024*1024;if(!/^\d{1,2}$/.test(part)||!raster.test(file.mime)||!Number.isSafeInteger(file.size)||file.size<=0||file.size>20*1024*1024||!file.url)throw new JiraError('Không hỗ trợ tải ảnh gốc này trong app.',422);
  const start=Number(part)*chunk,end=Math.min(file.size-1,start+chunk-1);if(start>=file.size)throw new JiraError('Phần ảnh không hợp lệ.',400);
  const response=await fetch(file.url,{headers:{...authHeaders(auth),Range:`bytes=${start}-${end}`},redirect:'error',signal:AbortSignal.timeout(15000)});
  if(response.status!==206||response.headers.get('content-range')!==`bytes ${start}-${end}/${file.size}`){await response.body?.cancel();throw new JiraError('Jira không hỗ trợ đọc từng phần ảnh gốc. Mở Jira để xem.',422);}
  const data=await bounded(response,chunk);if(data.length!==end-start+1)throw new JiraError('Phần ảnh chưa tải đủ.',502);return {file,data,mime:file.mime};
 }

 if(!thumbnail&&file.size>LIMIT)throw new JiraError('Tệp lớn; hãy mở trên Jira để tải.',413);
 let url=thumbnail?safeThumbnail(a.thumbnail,id):file.url;if(!url)throw new JiraError('Đường dẫn ảnh Jira chưa được hỗ trợ. Hãy mở Jira để xem.',422);
 const signal=AbortSignal.timeout(15000);let response;
 for(let i=0;i<4;i++){response=await fetch(url,{headers:authHeaders(auth),redirect:'manual',signal});if(response.status>=300&&response.status<400){const location=response.headers.get('location');await response.body?.cancel();const next=new URL(location||'',url);if(!location||next.origin!==new URL(JIRA_BASE_URL).origin||next.username||next.password)throw new JiraError('Jira chuyển tệp sang địa chỉ khác; hãy mở trên Jira.',422);url=next.href;continue;}break;}
 if(!response?.ok)throw new JiraError('Jira từ chối đọc nội dung tệp.',response?.status>=400?response.status:502);
 const data=await bounded(response),type=(response.headers.get('content-type')||'').split(';')[0].trim(),mime=thumbnail?(raster.test(type)?type:'image/jpeg'):raster.test(file.mime)?file.mime:'application/octet-stream';return {file,data,mime};
}
async function upload(body,auth){
 const {key}=params(body||{}),id=normalizeRequestId(body?.requestId),name=body?.name,b64=body?.base64;
 if(!id||typeof name!=='string'||!name.trim()||name.length>255||/[\\/\x00-\x1f\x7f]/.test(name)||typeof b64!=='string'||b64.length>Math.ceil(LIMIT/3)*4||!/^[A-Za-z0-9+/]*={0,2}$/.test(b64))throw new JiraError('Tệp tải lên không hợp lệ (tối đa 3 MB).',400);
 const bytes=Buffer.from(b64,'base64');if(bytes.toString('base64')!==b64||!bytes.length||bytes.length>LIMIT)throw new JiraError('Tệp rỗng hoặc lớn hơn 3 MB.',413);
 const fingerprint=readIdentity([id,key,name,b64]);
 const result=await runIdempotent('jira-file-'+authIdentity(auth),fingerprint,async()=>{
  await rows(key,auth);const cap=await capability(key,auth);if(!cap.canUpload)throw new JiraError('Jira chưa cho phép bạn đính kèm tệp vào công việc này.',403);if(bytes.length>cap.maxBytes)throw new JiraError('Tệp vượt giới hạn Jira.',413);
  const form=new FormData();form.append('file',new Blob([bytes],{type:'application/octet-stream'}),name);
  let response;try{response=await fetch(JIRA_BASE_URL+'/rest/api/2/issue/'+encodeURIComponent(key)+'/attachments',{method:'POST',headers:{...authHeaders(auth),Accept:'application/json','X-Atlassian-Token':'no-check'},body:form,redirect:'manual',signal:AbortSignal.timeout(20000)});}catch{return {outcome:'unknown',message:'Mất phản hồi tải tệp. Tải lại danh sách hoặc kiểm tra Jira trước khi gửi lại.'};}
  if(!response.ok){await response.body?.cancel();if(response.status>=500||response.status>=300&&response.status<400)return {outcome:'unknown',message:'Chưa xác định kết quả tải tệp. Kiểm tra Jira trước khi gửi lại.'};throw new JiraError('Jira từ chối tải tệp (HTTP '+response.status+').',response.status);}
  let saved;try{saved=JSON.parse((await bounded(response,256*1024)).toString());}catch{return {outcome:'accepted_unverified',message:'Jira đã nhận tệp; tải lại danh sách để đối chiếu.'};}
  invalidatePendingJiraReads();try{const all=await rows(key,auth),a=Array.isArray(saved)&&saved.length===1&&saved[0],found=a&&all.find(x=>String(x.id)===String(a.id)&&x.filename===name&&x.size===bytes.length);if(found)return {outcome:'confirmed',message:'Đã tải lên '+name+'.',file:publicFile(found)};}catch{}
  return {outcome:'accepted_unverified',message:'Jira đã nhận tệp; tải lại danh sách để đối chiếu.'};
 });return {...result.value,replayed:result.replayed};
}
module.exports={list,content,upload,LIMIT,safeContent};
