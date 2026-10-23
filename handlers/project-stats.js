'use strict';
const {sendJson,methodNotAllowed}=require('../lib/http');
const {getSession,clearSessionCookie}=require('../lib/session');
const {jiraFetch,JiraError}=require('../lib/jira');
const {validDate}=require('../lib/ui-tools');
const {parseJiraStartedAtWorkTimezone}=require('../lib/scheduler');
const {enrichHistory}=require('../lib/worklogpro');
const {readLabel}=require('../lib/worklog-label');
const keyPattern=/^[A-Z][A-Z0-9_]*-\d+$/;
function filters(q){
 const project=String(q.project||'').trim().toUpperCase(),from=String(q.from||''),to=String(q.to||''),all=q.all==='1',startAt=Number(q.startAt||0),op=String(q.op||'issues');
 if((project&&!/^[A-Z][A-Z0-9_]{0,99}$/.test(project))||(!all&&(!validDate(from)||!validDate(to)||to<from))||!Number.isSafeInteger(startAt)||startAt<0||!['issues','worklogs'].includes(op))throw new JiraError('Bộ lọc hoặc trang thống kê không hợp lệ.',400);
 return {project,from:all?'':from,to:all?'':to,all,startAt,op};
}
async function issuePage(f,auth){
 // Scan visible issues, not the potentially truncated worklogDate/Author index.
 const params={jql:(f.project?`project = "${f.project}" `:'')+'ORDER BY id ASC',startAt:f.startAt,maxResults:50,fields:['summary','project','issuetype']};
 let r=await jiraFetch('/rest/api/2/search',{method:'POST',body:params,timeoutMs:6000},auth);
 if([403,404,405].includes(r.response.status))r=await jiraFetch('/rest/api/2/search?'+new URLSearchParams({...params,fields:params.fields.join(',')}),{timeoutMs:6000},auth);
 if(!r.response.ok)throw new JiraError(`Không đọc được danh sách công việc (HTTP ${r.response.status}).`,r.response.status);
 const d=r.data;
 if(!Array.isArray(d?.issues)||!Number.isSafeInteger(d.total)||d.total<0||Number(d.startAt)!==f.startAt||d.issues.length>50||(!d.issues.length&&f.startAt<d.total))throw new JiraError('Jira trả thiếu hoặc sai trang công việc.',502);
 const seen=new Set(),issues=d.issues.map(i=>{
  const project=String(i.fields?.project?.key||'');
  if(!keyPattern.test(i.key||'')||!project||(f.project&&project!==f.project)||typeof i.fields?.issuetype?.subtask!=='boolean'||seen.has(i.key))throw new JiraError('Thông tin công việc không hợp lệ.',502);
  seen.add(i.key);return {key:i.key,project,summary:String(i.fields.summary||''),isSubtask:i.fields.issuetype.subtask};
 });
 return {issues,total:d.total,nextStartAt:f.startAt+issues.length,hasMore:f.startAt+issues.length<d.total};
}
async function worklogPage(f,q,auth){
 const key=String(q.key||'').toUpperCase();
 if(!keyPattern.test(key)||(f.project&&!key.startsWith(f.project+'-')))throw new JiraError('Mã công việc không thuộc phạm vi đã chọn.',400);
 const r=await jiraFetch(`/rest/api/2/issue/${encodeURIComponent(key)}/worklog?startAt=${f.startAt}&maxResults=100`,{timeoutMs:5000},auth);
 if(!r.response.ok)throw new JiraError(`Không đọc được worklog ${key} (HTTP ${r.response.status}).`,r.response.status);
 const d=r.data;
 if(!Array.isArray(d?.worklogs)||!Number.isSafeInteger(d.total)||d.total<0||Number(d.startAt)!==f.startAt||d.worklogs.length>100||(!d.worklogs.length&&f.startAt<d.total))throw new JiraError('Jira trả thiếu hoặc sai trang worklog.',502);
 const seen=new Set(),items=[];
 for(const w of d.worklogs){
  const id=String(w.id||''),date=parseJiraStartedAtWorkTimezone(w.started),a=w.author||{},authorId=String(a.key||a.accountId||a.name||''),seconds=Number(w.timeSpentSeconds);
  if(!id||seen.has(id)||!date||!authorId||!Number.isFinite(seconds)||seconds<=0)throw new JiraError('Worklog thiếu hoặc lặp thông tin; chưa cộng trang này.',502);
  seen.add(id);if(!f.all&&(date.date<f.from||date.date>f.to))continue;
  items.push({id,key,authorId,authorName:String(a.displayName||a.name||authorId),date:date.date,start:String(w.started),seconds,description:readLabel(w.comment).description,overtime:false,overtimeKnown:false});
 }
 await enrichHistory(items,auth);
 const next=f.startAt+d.worklogs.length;
 return {key,items,ids:[...seen],total:d.total,nextStartAt:next,hasMore:next<d.total};
}
module.exports=async(req,res)=>{
 if(req.method!=='GET')return methodNotAllowed(res,['GET']);const auth=getSession(req);if(!auth)return sendJson(res,401,{ok:false,error:'Vui lòng đăng nhập Jira.'});
 try{const f=filters(req.query||{}),data=f.op==='issues'?await issuePage(f,auth):await worklogPage(f,req.query,auth);return sendJson(res,200,{ok:true,...data,scope:'visible-issues'});}
 catch(e){if(e.status===401)res.setHeader('Set-Cookie',clearSessionCookie());return sendJson(res,e.status||500,{ok:false,error:e.status?e.message:'Không tải được thống kê dự án.'});}
};
module.exports.filters=filters;
