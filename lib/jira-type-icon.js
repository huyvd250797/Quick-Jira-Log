'use strict';
const {jiraFetch,JiraError}=require('./jira');
const {JIRA_BASE_URL}=require('./config');
async function icon(query,auth){
 const kind=query.kind||'issuetype';if(!['issuetype','priority'].includes(kind))throw new JiraError('Loại icon không hợp lệ.',400);
 const id=String(query.type||'');if(!/^\d{1,20}$/.test(id))throw new JiraError('Loại công việc không hợp lệ.',400);
 const r=await jiraFetch('/rest/api/2/'+kind+'/'+id,{timeoutMs:8000},auth);
 if(!r.response.ok)throw new JiraError('Không đọc được icon Jira.',r.response.status);
 const u=new URL(r.data?.iconUrl||'',JIRA_BASE_URL);
 if(u.origin!==new URL(JIRA_BASE_URL).origin||u.username||u.password||!/^\/(?:images\/icons\/|secure\/viewavatar|rest\/api\/2\/universal_avatar\/view\/)/.test(u.pathname))return {icon:''};
 const headers=auth.mode==='basic'?{Authorization:'Basic '+Buffer.from(auth.username+':'+auth.password).toString('base64')}:{Cookie:auth.cookie};
 const response=await fetch(u.href,{headers,redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new JiraError('Không đọc được icon Jira.',response.status);
 const mime=(response.headers.get('content-type')||'').split(';')[0].trim();
 if(!/^image\/(?:svg\+xml|png|jpeg|gif|webp)$/.test(mime))return {icon:''};
 const reader=response.body.getReader();let size=0,chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536)throw new JiraError('Icon quá lớn.',413);chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}
 const bytes=Buffer.concat(chunks);
 // SVG is used solely as an image, and reject active/external content as defence in depth.
 if(mime==='image/svg+xml'&&(!/<svg[\s>]/i.test(bytes.toString())||/<(?:script|foreignObject|iframe|style|image|use|a|animate|set)\b|\bon\w+\s*=|(?:href|url\s*\()/i.test(bytes.toString())))return {icon:''};
 return {icon:`data:${mime};base64,`+bytes.toString('base64')};
}
module.exports={icon};
