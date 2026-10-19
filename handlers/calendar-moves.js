'use strict';
const crypto=require('crypto'),{Readable}=require('stream');
const {sendJson,readJson,assertSameOrigin,methodNotAllowed}=require('../lib/http');
const {getSession,clearSessionCookie}=require('../lib/session');
const {getMyself,getIssueWorklogs,getWorklog}=require('../lib/jira');
const {authorMatches,parseJiraStartedAtWorkTimezone}=require('../lib/scheduler');
const {validDate}=require('../lib/ui-tools');
const {loadOccupiedRanges}=require('../lib/worklog-guard');
const {invalidateWorklogCaches}=require('../lib/app-cache');
const {runIdempotent,normalizeRequestId}=require('../lib/idempotency');
const D=require('../lib/calendar-drafts'),{schedule}=require('../lib/calendar-moves');
const correction=require('./worklog-correction');
function snapshot(raw,key) {
 const parsed=parseJiraStartedAtWorkTimezone(raw?.started||'');
 if(!parsed)throw new Error('Không đọc được thời điểm worklog trên Jira.');
 return {id:String(raw.id),key,date:parsed.date,start:`${String(Math.floor(parsed.minute/60)).padStart(2,'0')}:${String(Math.floor(parsed.minute%60)).padStart(2,'0')}`,started:raw.started,timeSpentSeconds:Number(raw.timeSpentSeconds)};
}
async function invokeMove(req,from,to) {
 // Reuse the authorized correction endpoint's full guard/native OT fallback/readback.
 const resized=D.seconds(from)!==D.seconds(to);
 const body={key:from.key,worklogId:from.id,...(resized?{calendarEdit:true,targetSeconds:D.seconds(to)}:{moveOnly:true}),date:to.date,start:to.start,expectedStarted:from.started,expectedSeconds:D.seconds(from)};
 const child=Readable.from([Buffer.from(JSON.stringify(body))]);child.method='PATCH';child.headers={...req.headers};
 let response;
 const res={statusCode:200,setHeader(){},end(raw){response={status:this.statusCode,data:JSON.parse(raw)};}};
 await correction(child,res);
 if(!response?.data?.ok||response.data.worklogVerified!==true) {
  const error=new Error(response?.data?.error||'Chưa xác nhận được cập nhật Jira.');
  error.status=response?.status||502;error.details=response?.data?.details;error.code=response?.data?.code;throw error;
 }
}
module.exports=async function handler(req,res) {
 if(req.method!=='POST')return methodNotAllowed(res,['POST']);
 if(!assertSameOrigin(req))return sendJson(res,403,{ok:false,error:'INVALID_ORIGIN'});
 const session=getSession(req);if(!session)return sendJson(res,401,{ok:false,error:'Vui lòng đăng nhập Jira.'});
 try {
  const body=await readJson(req),moves=body.moves,requestId=normalizeRequestId(body.requestId);
  if(!requestId||!Array.isArray(moves)||moves.length<2||moves.length>12) return sendJson(res,400,{ok:false,error:'Yêu cầu đổi chỗ cần 2–12 worklog và mã yêu cầu hợp lệ.'});
  const ids=new Set();
  for(const move of moves) {
   if(!/^[A-Z][A-Z0-9_]*-\d+$/.test(move?.key||'')||!/^\d+$/.test(move?.worklogId||'')||ids.has(String(move.worklogId))||!validDate(move.date)||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(move.start||'')||!Number.isSafeInteger(move.expectedSeconds)||move.expectedSeconds<=0||!Number.isFinite(Date.parse(move.expectedStarted))||(move.targetSeconds!==undefined&&(!Number.isSafeInteger(move.targetSeconds)||move.targetSeconds<=0||move.targetSeconds>57600)))
    return sendJson(res,400,{ok:false,error:'Dữ liệu đổi lịch không hợp lệ hoặc trùng worklog.'});
   ids.add(String(move.worklogId));
  }
  const identity=session.me?.key||session.me?.name||session.username||'';
  const operation='calendar-moves-'+crypto.createHash('sha256').update(identity+'|'+JSON.stringify(moves)).digest('hex');
  const outcome=await runIdempotent(operation,requestId,async()=>{
   const me=session.me||await getMyself(session),keys=[...new Set(moves.map(x=>x.key))],rawByKey=new Map();
   for(const key of keys)rawByKey.set(key,await getIssueWorklogs(key,session));
   const originals=[],targets=[];
   for(const move of moves) {
    const raw=rawByKey.get(move.key).find(x=>String(x.id)===String(move.worklogId));
    if(!raw||!authorMatches(raw,me))return {status:403,data:{ok:false,error:'Không tìm thấy hoặc không có quyền sửa một worklog trong nhóm đổi chỗ.'}};
    const current=snapshot(raw,move.key),expected=snapshot({...raw,started:move.expectedStarted,timeSpentSeconds:move.expectedSeconds},move.key);
    const target=D.preview(expected,move);
    originals.push(current);targets.push(target);
   }
   // A repeated request after the response was lost only confirms the final state.
   if(originals.every((x,i)=>D.same(x,targets[i])))return {status:200,data:{ok:true,moved:true,worklogVerified:true,items:originals}};
   if(originals.some((x,i)=>Date.parse(x.started)!==Date.parse(moves[i].expectedStarted)||D.seconds(x)!==moves[i].expectedSeconds))
    return {status:409,data:{ok:false,code:'WORKLOG_STALE',error:'Worklog đã thay đổi trên Jira. Hãy tải lại lịch trước khi swap.'}};
   const dates=[...new Set([...originals,...targets].map(x=>x.date))],stationary=[];
   for(const date of dates) {
    const guard=await loadOccupiedRanges(date,keys,me,session,{excludeWorklogIds:[...ids]});
    for(const range of guard.occupied)stationary.push({date,start:`${String(Math.floor(range.start/60)).padStart(2,'0')}:${String(Math.floor(range.start%60)).padStart(2,'0')}`,timeSpentSeconds:(range.end-Math.floor(range.start))*60});
   }
   if(targets.some((x,i)=>!D.inWindow(x)||targets.slice(i+1).some(y=>D.overlaps(x,y))||stationary.some(y=>D.overlaps(x,y))))
    return {status:409,data:{ok:false,error:'Không thể swap: vị trí mới trùng worklog khác hoặc đi qua giờ nghỉ.'}};
   let steps;
   try{steps=schedule(originals,targets,stationary);}catch(error){return {status:409,data:{ok:false,error:error.message}};}
   const attempted=[],startedAt=Date.now();
   try {
    for(const step of steps) {
     // Leave time in the 60s function budget for guarded recovery; no new step late.
     if(Date.now()-startedAt>22000)throw new Error('Đổi lịch mất nhiều thời gian. App sẽ đưa các lịch đã chuyển về vị trí ban đầu.');
     attempted.push(step);await invokeMove(req,step.from,step.to);
    }
    const checked=[];
    for(let i=0;i<targets.length;i++) {
     const raw=await getWorklog(targets[i].key,targets[i].id,session),actual=snapshot(raw,targets[i].key);
     if(!authorMatches(raw,me)||!D.same(actual,targets[i]))throw new Error('Jira chưa xác nhận đủ các vị trí đã đổi.');
     checked.push(actual);
    }
    return {status:200,data:{ok:true,moved:true,worklogVerified:true,items:checked}};
   } catch(error) {
    const recoveryErrors=[];
    // An uncertain step is read first; never replay a write blindly. Only undo
    // a location still matching this operation; preserve external user edits.
    for(const step of attempted.slice().reverse()) {
     try {
      const raw=await getWorklog(step.from.key,step.from.id,session),actual=snapshot(raw,step.from.key);
      if(!authorMatches(raw,me))throw new Error('Không xác nhận được tác giả khi phục hồi.');
      if(D.same(actual,step.from))continue;
      if(!D.same(actual,step.to))throw new Error('Worklog đã thay đổi trong khi phục hồi.');
      await invokeMove(req,actual,step.from);
     } catch(e){recoveryErrors.push({key:step.from.key,worklogId:step.from.id,error:e.message});}
    }
    const actual=[],unread=[];
    for(const original of originals)try{actual.push(snapshot(await getWorklog(original.key,original.id,session),original.key));}catch{unread.push(original.id);}
    const restored=!unread.length&&actual.every((x,i)=>D.same(x,originals[i]));
    return {status:restored?(error.status||409):502,data:{ok:false,code:restored?'CALENDAR_SWAP_ROLLED_BACK':'CALENDAR_SWAP_RESULT_UNKNOWN',error:restored?`Chưa đổi được lịch; đã đưa các block về vị trí ban đầu. ${error.message}`:'Chưa xác nhận được toàn bộ kết quả đổi lịch. Hãy kiểm tra vị trí thật trên Jira trước khi lưu lại.',details:{resultUnknown:!restored,rolledBack:restored,actual,recoveryErrors}}};
   } finally {for(const date of dates)await invalidateWorklogCaches(session,date,keys);}
  });
  if(outcome.value.status===401)res.setHeader('Set-Cookie',clearSessionCookie());
  return sendJson(res,outcome.value.status,{...outcome.value.data,replayed:outcome.replayed});
 } catch(error){if(error.status===401)res.setHeader('Set-Cookie',clearSessionCookie());return sendJson(res,error.status||500,{ok:false,error:error.message||'Không xử lý được đổi lịch.',code:error.code,details:error.details});}
};
