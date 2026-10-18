'use strict';
// Isolated GET-only calendar reader; credentials always belong to the caller.
const {sendJson,methodNotAllowed}=require('../lib/http');
const {getSession,clearSessionCookie}=require('../lib/session');
const {JiraError,getIssueWorklogs,getIssuesByKeys,searchIssuesWithWorklogDate}=require('../lib/jira');
const {resolveCalendarUser,authorIsUser,publicUser,discoverCalendarUserIssues}=require('../lib/calendar-users');
const {parseJiraStartedAtWorkTimezone,minuteToHHMM}=require('../lib/scheduler');
const {validDate}=require('../lib/ui-tools');
const {mapWithConcurrency}=require('../lib/async');
const {readLabel}=require('../lib/worklog-label');
const {enrichHistory}=require('../lib/worklogpro');
async function safeKeys(read) {
  try {const keys=await read();return {ok:true,keys,truncated:!!keys.truncated};}
  catch(error){if(error.status===401)throw error;return {ok:false,keys:[],status:error.status||502};}
}
module.exports=async(req,res)=>{
  if(req.method!=='GET')return methodNotAllowed(res,['GET']);
  const session=getSession(req);if(!session)return sendJson(res,401,{ok:false,error:'Vui lòng đăng nhập Jira.'});
  const date=String(req.query?.date||''),endDate=String(req.query?.endDate||date);
  if(!validDate(date)||!validDate(endDate)||endDate<date||(Date.parse(endDate)-Date.parse(date))/86400000>30)return sendJson(res,400,{ok:false,error:'Khoảng ngày lịch không hợp lệ (tối đa 31 ngày).'});
  try {
    const target=await resolveCalendarUser(String(req.query?.userKey||''),session),sourceDetails={};
    let discovery=await safeKeys(()=>discoverCalendarUserIssues(date,endDate,target,session));
    sourceDetails.authorDay={ok:discovery.ok};
    if(!discovery.ok){discovery=await safeKeys(()=>searchIssuesWithWorklogDate(date,session,endDate));sourceDetails.fallback=true;}
    if(!discovery.ok)throw new JiraError('Không có quyền hoặc chưa đọc được lịch người dùng đã chọn trên Jira.',discovery.status===403?403:502);
    const keys=[...new Set(discovery.keys)].slice(0,500),truncated=discovery.keys.length>500||!!discovery.truncated,skipped=[];
    const metadataPromise=getIssuesByKeys(keys,session).then(issues=>({issues})).catch(error=>{if(error.status===401)return {issues:[],fatal:error};return {issues:[],partial:true};});
    const results=await mapWithConcurrency(keys,12,async key=>{
      try{return {key,worklogs:await getIssueWorklogs(key,session)};}
      catch(error){if(error.status===401)throw error;skipped.push({key,status:error.status||0});return {key,worklogs:[]};}
    });
    const metadata=await metadataPromise;if(metadata.fatal)throw metadata.fatal;
    const issueMap=new Map(metadata.issues.map(issue=>[issue.key,issue]));
    if(metadata.partial||keys.some(key=>!issueMap.has(key)))sourceDetails.metadataError=true;
    const items=[],seen=new Set();
    for(const {key,worklogs} of results)for(const worklog of worklogs) {
      if(!authorIsUser(worklog,target))continue;
      const parsed=parseJiraStartedAtWorkTimezone(worklog.started),seconds=Number(worklog.timeSpentSeconds);
      if(!parsed||parsed.date<date||parsed.date>endDate||!Number.isFinite(seconds)||seconds<=0)continue;
      const id=String(worklog.id||''),identity=key+'|'+id;if(!id||seen.has(identity))continue;seen.add(identity);
      const fields=issueMap.get(key)?.fields||{},label=readLabel(worklog.comment),minutes=Math.ceil(seconds/60);
      items.push({id,key,project:String(fields.project?.key||key.split('-')[0]||''),summary:String(fields.summary||''),status:String(fields.status?.name||''),date:parsed.date,start:minuteToHHMM(parsed.minute),end:minuteToHHMM(parsed.minute+minutes),minutes,timeSpentSeconds:seconds,started:String(worklog.started||''),description:label.description,legacyOvertime:label.overtime,overtime:false,overtimeKnown:false,overtimeSource:'',calendarReadOnly:true});
    }
    const overtime=await enrichHistory(items,session);if(overtime.unavailable)sourceDetails.overtimeUnavailable=overtime.unavailable;
    items.sort((a,b)=>b.date.localeCompare(a.date)||b.start.localeCompare(a.start)||a.key.localeCompare(b.key));
    return sendJson(res,200,{ok:true,readOnly:true,viewedUser:publicUser(target),date,endDate,items,skipped,truncated,issueCount:keys.length,sourceDetails});
  }catch(error){if(error.status===401)res.setHeader('Set-Cookie',clearSessionCookie());return sendJson(res,error.status||502,{ok:false,error:error.message||'Không tải được lịch người dùng đã chọn.'});}
};
