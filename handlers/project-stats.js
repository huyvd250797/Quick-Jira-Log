'use strict';
const {sendJson,methodNotAllowed}=require('../lib/http');
const {getSession,clearSessionCookie}=require('../lib/session');
const {jiraFetch,JiraError}=require('../lib/jira');
const {validDate}=require('../lib/ui-tools');
const {parseJiraStartedAtWorkTimezone}=require('../lib/scheduler');
const {enrichHistory}=require('../lib/worklogpro');
const {readStatsOvertime}=require('../lib/stats-overtime');
const {readLabel}=require('../lib/worklog-label');
const {firstWorklog}=require('../lib/project-stats');
const keyPattern=/^[A-Z][A-Z0-9_]*-\d+$/;
function filters(q){
 const project=String(q.project||'').trim().toUpperCase(),from=String(q.from||''),to=String(q.to||''),all=q.all==='1',startAt=Number(q.startAt||0),op=String(q.op||'issues');
 if((project&&!/^[A-Z][A-Z0-9_]{0,99}$/.test(project))||(!all&&(!validDate(from)||!validDate(to)||to<from))||!Number.isSafeInteger(startAt)||startAt<0||!['issues','worklogs','overtime'].includes(op))throw new JiraError('Bộ lọc hoặc trang thống kê không hợp lệ.',400);
 return {project,from:all?'':from,to:all?'':to,all,startAt,op};
}
async function issuePage(f,auth){
 // Scan visible issues, not the potentially truncated worklogDate/Author index.
 const params={jql:(f.project?`project = "${f.project}" `:'')+'ORDER BY id ASC',startAt:f.startAt,maxResults:100,fields:['summary','project','issuetype','worklog','timespent']};
 let r=await jiraFetch('/rest/api/2/search',{method:'POST',body:params,timeoutMs:6000},auth);
 if(r.response.status===400){params.fields=params.fields.filter(x=>x!=='worklog');r=await jiraFetch('/rest/api/2/search',{method:'POST',body:params,timeoutMs:6000},auth);}
 if([403,404,405].includes(r.response.status))r=await jiraFetch('/rest/api/2/search?'+new URLSearchParams({...params,fields:params.fields.join(',')}),{timeoutMs:6000},auth);
 if(!r.response.ok)throw new JiraError(`Không đọc được danh sách công việc (HTTP ${r.response.status}).`,r.response.status);
 const d=r.data;
 if(!Array.isArray(d?.issues)||!Number.isSafeInteger(d.total)||d.total<0||Number(d.startAt)!==f.startAt||d.issues.length>100||(!d.issues.length&&f.startAt<d.total))throw new JiraError('Jira trả thiếu hoặc sai trang công việc.',502);
 let budget=1500000;
 const seen=new Set(),issues=d.issues.map(i=>{
  const project=String(i.fields?.project?.key||'');
  if(!keyPattern.test(i.key||'')||!project||(f.project&&project!==f.project)||typeof i.fields?.issuetype?.subtask!=='boolean'||seen.has(i.key))throw new JiraError('Thông tin công việc không hợp lệ.',502);
  // Only complete, validated embedded pages replace an issue worklog GET.
  // Missing/hidden/partial/malformed fields always use the existing paged reader.
  let worklogs=null;const embedded=i.fields?.worklog;
  if(Array.isArray(embedded?.worklogs)&&embedded.startAt===0&&Number.isSafeInteger(embedded.total)&&embedded.total>=0&&embedded.worklogs.length===embedded.total&&!(embedded.total===0&&Number(i.fields.timespent)>0)){
   try{const page=normalizeWorklogs(embedded,{...f,startAt:0},i.key),bytes=Buffer.byteLength(JSON.stringify(page));if(bytes<=budget){worklogs=page;budget-=bytes;}}catch{}
  }
  seen.add(i.key);return {key:i.key,project,summary:String(i.fields.summary||''),isSubtask:i.fields.issuetype.subtask,issueType:String(i.fields.issuetype.name||''),issueTypeId:String(i.fields.issuetype.id||''),...(worklogs?{worklogs}:{} )};
 });
 return {issues,total:d.total,nextStartAt:f.startAt+issues.length,hasMore:f.startAt+issues.length<d.total};
}
async function worklogPage(f,q,auth){
 const key=String(q.key||'').toUpperCase();
 if(!keyPattern.test(key)||(f.project&&!key.startsWith(f.project+'-')))throw new JiraError('Mã công việc không thuộc phạm vi đã chọn.',400);
 const r=await jiraFetch(`/rest/api/2/issue/${encodeURIComponent(key)}/worklog?startAt=${f.startAt}&maxResults=500`,{timeoutMs:5000},auth);
 if(!r.response.ok)throw new JiraError(`Không đọc được worklog ${key} (HTTP ${r.response.status}).`,r.response.status);
 const page=normalizeWorklogs(r.data,f,key);
 if(q.ot!=='0')await enrichHistory(page.items,auth);
 return page;
}
function normalizeWorklogs(d,f,key){
 if(!Array.isArray(d?.worklogs)||!Number.isSafeInteger(d.total)||d.total<0||Number(d.startAt)!==f.startAt||d.worklogs.length>500||d.worklogs.length+f.startAt>d.total||(!d.worklogs.length&&f.startAt<d.total))throw new JiraError('Jira trả thiếu hoặc sai trang worklog.',502);
 const seen=new Set(),items=[];let first=null;
 for(const w of d.worklogs){
  const id=String(w.id||''),date=parseJiraStartedAtWorkTimezone(w.started),a=w.author||{},authorId=String(a.key||a.accountId||a.name||''),seconds=Number(w.timeSpentSeconds);
  if(!id||seen.has(id)||!date||!authorId||!Number.isFinite(seconds)||seconds<=0)throw new JiraError('Worklog thiếu hoặc lặp thông tin; chưa cộng trang này.',502);
  const entry={id,key,authorId,authorName:String(a.displayName||a.name||authorId),authorUsername:String(a.name||a.accountId||authorId),date:date.date,start:String(w.started)};
  // Keep the all-time first entry before the reporting period filters hours.
  first=firstWorklog(first,entry);
  seen.add(id);if(!f.all&&(date.date<f.from||date.date>f.to))continue;
  items.push({...entry,seconds,description:readLabel(w.comment).description,overtime:false,overtimeKnown:false});
 }
 const next=f.startAt+d.worklogs.length;
 return {key,items,firstWorklog:first,ids:[...seen],total:d.total,nextStartAt:next,hasMore:next<d.total};
}
module.exports=async(req,res)=>{
 if(req.method!=='GET')return methodNotAllowed(res,['GET']);const auth=getSession(req);if(!auth)return sendJson(res,401,{ok:false,error:'Vui lòng đăng nhập Jira.'});
 try{const f=filters(req.query||{});let data;
  if(f.op==='overtime'){
   const ids=String(req.query.ids||'').split(',');if(!ids.length||ids.length>50||new Set(ids).size!==ids.length||ids.some(id=>!/^\d{1,20}$/.test(id)||!Number.isSafeInteger(Number(id))||Number(id)<=0)||!['auto','direct','native'].includes(req.query.reader||'auto'))throw new JiraError('Danh sách worklog cần đối chiếu không hợp lệ.',400);
   data=await readStatsOvertime(ids,auth,req.query.reader||'auto');
  }else data=f.op==='issues'?await issuePage(f,auth):await worklogPage(f,req.query,auth);
  return sendJson(res,200,{ok:true,...data,scope:'visible-issues'});}
 catch(e){if(e.status===401)res.setHeader('Set-Cookie',clearSessionCookie());return sendJson(res,e.status||500,{ok:false,error:e.status?e.message:'Không tải được thống kê dự án.'});}
};
module.exports.filters=filters;
