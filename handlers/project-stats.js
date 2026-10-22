 'use strict';
const {sendJson,methodNotAllowed}=require('../lib/http');
const {getSession,clearSessionCookie}=require('../lib/session');
const {jiraFetch,JiraError}=require('../lib/jira');
const {validDate}=require('../lib/ui-tools');
const {parseJiraStartedAtWorkTimezone}=require('../lib/scheduler');
const {mapWithConcurrency}=require('../lib/async');
const {enrichHistory}=require('../lib/worklogpro');
const {readLabel}=require('../lib/worklog-label');
async function read(path,auth,options={}){const r=await jiraFetch(path,{timeoutMs:2000,...options},auth);if(!r.response.ok)throw new JiraError(`Không đọc được dữ liệu Jira (HTTP ${r.response.status}).`,r.response.status);return r.data;}
async function logs(key,auth,deadline){const all=[],seen=new Set();let offset=0;
 for(let page=0;page<100;page++){
  if(Date.now()>deadline)throw new JiraError('Chưa đọc kịp worklog. Hãy tải lại.',502);
  const d=await read(`/rest/api/2/issue/${encodeURIComponent(key)}/worklog?startAt=${offset}&maxResults=1000`,auth);
  if(d.total>10000)throw new JiraError('Công việc có hơn 10.000 worklog; chưa thể đọc đủ.',502);
  if(!Array.isArray(d.worklogs)||!Number.isInteger(d.total)||d.total<0||Number(d.startAt)!==offset||(!d.worklogs.length&&offset<d.total))throw new JiraError('Worklog thiếu hoặc sai trang.',502);
  for(const w of d.worklogs){if(!w.id||seen.has(String(w.id)))throw new JiraError('Worklog thiếu ID hoặc lặp trang.',502);seen.add(String(w.id));all.push(w);}
  offset+=d.worklogs.length;if(offset>=d.total)return all;
 }throw new JiraError('Vượt giới hạn đọc worklog; dữ liệu chưa đầy đủ.',502);
}
module.exports=async(req,res)=>{
 if(req.method!=='GET')return methodNotAllowed(res,['GET']);const auth=getSession(req);if(!auth)return sendJson(res,401,{ok:false,error:'Vui lòng đăng nhập Jira.'});
 const q=req.query||{},project=String(q.project||'').toUpperCase(),from=String(q.from||''),to=String(q.to||''),offset=Number(q.startAt||0);
 if(!/^[A-Z][A-Z0-9_]{0,99}$/.test(project)||!validDate(from)||!validDate(to)||to<from||(Date.parse(to)-Date.parse(from))/86400000>92||!Number.isInteger(offset)||offset<0||offset>5000)return sendJson(res,400,{ok:false,error:'Chọn dự án và khoảng ngày hợp lệ (tối đa 93 ngày).'});
 const deadline=Date.now()+22000;
 try{
  // Scan all visible issues. Do not use worklogDate/Author indexes as a completeness filter.
  const params={jql:`project = "${project}" ORDER BY id ASC`,startAt:offset,maxResults:10,fields:['summary','project','issuetype']};
  let result=await jiraFetch('/rest/api/2/search',{method:'POST',body:params,timeoutMs:5000},auth);
  if([403,404,405].includes(result.response.status))result=await jiraFetch('/rest/api/2/search?'+new URLSearchParams({...params,fields:params.fields.join(',')}),{timeoutMs:5000},auth);
  if(!result.response.ok)throw new JiraError(`Không quét được dự án (HTTP ${result.response.status}).`,result.response.status);
  const d=result.data;if(!Array.isArray(d?.issues)||!Number.isInteger(d.total)||d.total<0||Number(d.startAt)!==offset||d.issues.length>10||(!d.issues.length&&offset<d.total))throw new JiraError('Jira trả thiếu hoặc sai trang công việc.',502);
  const keys=new Set();for(const i of d.issues){if(!/^[A-Z][A-Z0-9_]*-\d+$/.test(i.key||'')||i.fields?.project?.key!==project||typeof i.fields?.issuetype?.subtask!=='boolean'||keys.has(i.key))throw new JiraError('Thông tin công việc không hợp lệ.',502);keys.add(i.key);}
  const warnings=[],items=[];
  await mapWithConcurrency(d.issues,5,async i=>{try{
   for(const w of await logs(i.key,auth,deadline)){
    const date=parseJiraStartedAtWorkTimezone(w.started);if(!date)throw new JiraError('Ngày worklog không hợp lệ.',502);if(date.date<from||date.date>to)continue;
    const seconds=Number(w.timeSpentSeconds),a=w.author||{},id=String(a.key||a.accountId||a.name||'');
    if(!id||!Number.isFinite(seconds)||seconds<=0)throw new JiraError('Worklog thiếu tác giả hoặc thời lượng.',502);
    items.push({id:String(w.id),key:i.key,summary:String(i.fields.summary||''),isSubtask:i.fields.issuetype.subtask,authorId:id,authorName:String(a.displayName||a.name||id),date:date.date,start:String(w.started),seconds,description:readLabel(w.comment).description,overtime:false,overtimeKnown:false});
   }
  }catch(e){if(e.status===401)throw e;warnings.push(`${i.key}: ${e.message}`);}});
  // Bound plugin work per batch; remaining values stay explicitly unknown.
  await enrichHistory(items.slice(0,120),auth);
  const next=offset+d.issues.length,limited=next>=5000&&next<d.total;
  if(limited)warnings.push('Đã đạt giới hạn 5.000 công việc; thống kê chưa đầy đủ.');
  sendJson(res,200,{ok:true,project,from,to,items,warnings,total:d.total,scanned:next,keys:[...keys],nextStartAt:next,hasMore:next<d.total&&!limited,limited,scope:'visible-issues'});
 }catch(e){if(e.status===401)res.setHeader('Set-Cookie',clearSessionCookie());sendJson(res,e.status||500,{ok:false,error:e.status?e.message:'Không tải được thống kê dự án.'});}
};
