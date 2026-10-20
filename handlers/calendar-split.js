'use strict';
// A split retains the original worklog ID for part one. Additional Jira worklogs
// are created once, verified, and compensated on failure; this is not a DB transaction.
const crypto=require('node:crypto');
const {sendJson,readJson,assertSameOrigin,methodNotAllowed}=require('../lib/http');
const {getSession,clearSessionCookie}=require('../lib/session');
const J=require('../lib/jira'),W=require('../lib/worklogpro'),D=require('../lib/calendar-drafts');
const {authorMatches}=require('../lib/scheduler'),{validDate}=require('../lib/ui-tools');
const {textOf}=require('../lib/worklog-label');
const {loadOccupiedRanges}=require('../lib/worklog-guard');
const {invalidateWorklogCaches}=require('../lib/app-cache');
const {runIdempotent,normalizeRequestId}=require('../lib/idempotency');
const {invokeMove,snapshot}=require('./calendar-moves');
const fail=(message,code='CALENDAR_SPLIT_REJECTED',status=409,details={})=>Object.assign(new Error(message),{code,status,details});
const matches=(raw,target,me,description)=>authorMatches(raw,me)&&D.same(snapshot(raw,target.key),target)&&textOf(raw.comment)===description;
const sameAttributes=(native,expected)=>expected.every(a=>W.attributesOf(native).some(b=>a.attrTypeId===b.attrTypeId&&String(a.attrValue??'')===String(b.attrValue??'')));
function nativeMatches(native,raw,attribute,overtime,attributes){
 const when=typeof native.workStart==='number'?native.workStart:Date.parse(native.workStart);
 return String(native.authorUserKey)===String(raw.author?.key)&&when===Date.parse(raw.started)&&Number(native.timeSpent)===Number(raw.timeSpentSeconds)&&native.comment===textOf(raw.comment)&&W.overtimeOf(native,attribute)===overtime&&sameAttributes(native,attributes);
}
module.exports=async(req,res)=>{
 if(req.method!=='POST')return methodNotAllowed(res,['POST']);
 if(!assertSameOrigin(req))return sendJson(res,403,{ok:false,error:'INVALID_ORIGIN'});
 const auth=getSession(req);if(!auth)return sendJson(res,401,{ok:false,error:'Vui lòng đăng nhập Jira.'});
 try {
  const b=await readJson(req),requestId=normalizeRequestId(b.requestId),segments=b.segments;
  if(!requestId||!/^[A-Z][A-Z0-9_]*-\d+$/.test(b.key||'')||!/^\d+$/.test(b.worklogId||'')||!Number.isFinite(Date.parse(b.expectedStarted))||Date.parse(b.expectedStarted)%60000||!Number.isSafeInteger(b.expectedSeconds)||b.expectedSeconds<=0||!Number.isSafeInteger(b.targetSeconds)||b.targetSeconds<=0||b.targetSeconds>57600||!Array.isArray(segments)||segments.length<2||segments.length>32)
   return sendJson(res,400,{ok:false,error:'Dữ liệu tách lịch không hợp lệ; hỗ trợ 2–32 phần và giờ bắt đầu chính xác theo phút.'});
  if(segments.length>2&&b.allowMany!==true)return sendJson(res,400,{ok:false,error:'Cần xác nhận trước khi tách thành nhiều hơn 2 block.'});
  if(segments.some(s=>!validDate(s?.date)||s.date!==segments[0].date||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s.start||'')||!Number.isSafeInteger(s.targetSeconds)||s.targetSeconds<=0)||segments.reduce((n,s)=>n+s.targetSeconds,0)!==b.targetSeconds)
   return sendJson(res,400,{ok:false,error:'Các phần phải trong cùng ngày và giữ đúng tổng thời lượng.'});
  const expected=snapshot({id:b.worklogId,started:b.expectedStarted,timeSpentSeconds:b.expectedSeconds},b.key);
  const targets=segments.map(s=>D.preview(expected,s));
  if(targets.some((t,i)=>![[480,720],[810,1050]].some(([a,z])=>D.minute(t.start)>=a&&D.minute(t.start)+D.seconds(t)/60<=z)||targets.slice(i+1).some(x=>D.overlaps(t,x))||(i&&D.minute(t.start)<D.minute(targets[i-1].start))))
   return sendJson(res,400,{ok:false,error:'Các phần phải theo thứ tự, không trùng nhau, trong 08:00–12:00 và 13:30–17:30.'});
  const identity=auth.me?.key||auth.me?.name||auth.username;
  const op='calendar-split-'+crypto.createHash('sha256').update(identity+'|'+JSON.stringify([b.key,b.worklogId,b.expectedStarted,b.expectedSeconds,b.targetSeconds,segments])).digest('hex');
  const run=async()=>{
   const me=auth.me||await J.getMyself(auth),logs=await J.getIssueWorklogs(b.key,auth),raw=logs.find(x=>String(x.id)===String(b.worklogId));
   if(!raw||!authorMatches(raw,me))return {status:403,data:{ok:false,error:'Chỉ được tách worklog của chính mình.'}};
   const original=snapshot(raw,b.key),description=textOf(raw.comment),attribute=await W.getOvertimeAttribute(auth),native=await W.getWorklog(raw.id,auth),attributes=W.attributesOf(native),overtime=W.overtimeOf(native,attribute);
   if(!nativeMatches(native,raw,attribute,overtime,attributes)||native.canEdit===false)throw fail('Không xác nhận được dữ liệu/quyền sửa Jira và WorklogPRO. Chưa tách lịch.');
   if(raw.visibility||raw.roleLevel||raw.groupLevel||attributes.some(a=>a.attrValue!==null&&typeof a.attrValue==='object'))throw fail('Worklog có giới hạn hiển thị hoặc thuộc tính phức hợp. Hãy tách trực tiếp trên Jira để giữ nguyên cấu hình.');
   // A final state can be confirmed after a lost response without POSTing again.
   if(!D.same(original,expected)) {
    if(!D.same(original,targets[0]))throw fail('Worklog đã thay đổi trên Jira. Bỏ nháp và tải lại lịch.','WORKLOG_STALE');
    const confirmed=[raw],used=new Set([String(raw.id)]);
    for(const target of targets.slice(1)){
     const candidates=logs.filter(x=>!used.has(String(x.id))&&matches(x,target,me,description));
     if(candidates.length!==1)throw fail('Kết quả tách trước chưa rõ hoặc chỉ lưu được một phần. Kiểm tra Jira trước khi thử lại.','CALENDAR_SPLIT_RESULT_UNKNOWN',409,{resultUnknown:true});
     used.add(String(candidates[0].id));confirmed.push(candidates[0]);
    }
    for(const r of confirmed){const n=await W.getWorklog(r.id,auth);if(!nativeMatches(n,r,attribute,overtime,attributes))throw fail('Chưa xác nhận được Overtime/thuộc tính của tất cả phần tách.','CALENDAR_SPLIT_RESULT_UNKNOWN',409,{resultUnknown:true});}
    return {status:200,data:{ok:true,split:true,worklogVerified:true,items:confirmed.map(r=>({...snapshot(r,b.key),overtime,overtimeKnown:true}))}};
   }
   if(b.verifyOnly===true)throw fail('Chưa xác nhận được lịch đã tách. Kiểm tra Jira trước khi bỏ nháp hoặc thử lại.','CALENDAR_SPLIT_RESULT_UNKNOWN',409,{resultUnknown:true});
   const guard=await loadOccupiedRanges(segments[0].date,[b.key],me,auth,{excludeWorklogIds:[String(raw.id)]});
   const occupied=guard.occupied.map(r=>({date:segments[0].date,start:`${String(Math.floor(r.start/60)).padStart(2,'0')}:${String(Math.floor(r.start%60)).padStart(2,'0')}`,timeSpentSeconds:(r.end-Math.floor(r.start))*60}));
   if(targets.some(t=>occupied.some(x=>D.overlaps(t,x))))throw fail('Chỗ trống đã có worklog mới trên Jira. Chỉnh lại bản nháp rồi lưu.','WORKLOG_STALE');
   const knownIds=new Set(logs.map(x=>String(x.id))),created=[],attemptedAt=Date.now();let uncertainCreate=false,firstAttempted=false;
   const checkBudget=()=>{if(Date.now()-attemptedAt>22000)throw fail('Jira xử lý chậm; đã dừng để phục hồi, chưa giữ thay đổi một phần.');};
   try {
    firstAttempted=true;await invokeMove(req,original,targets[0]);
    // Read native fields even when Jira core accepted the shrink.
    const first=await J.getWorklog(b.key,raw.id,auth);
    if(!nativeMatches(await W.getWorklog(raw.id,auth),first,attribute,overtime,attributes))throw fail('Phần đầu chưa giữ đúng Overtime hoặc thuộc tính.');
    for(const target of targets.slice(1)) {
     checkBudget();let made;
     try{made=await J.createWorklog(b.key,{started:target.started,seconds:D.seconds(target),description},auth);}
     catch(error){
      if(error.status>=400&&error.status<500)throw error;
      // POST may have committed. Only identify a unique fresh exact record; never retry POST.
      uncertainCreate=true;
      const after=await J.getIssueWorklogs(b.key,auth),candidates=after.filter(x=>!knownIds.has(String(x.id))&&matches(x,target,me,description));
      if(candidates.length!==1)throw fail('Chưa xác định được worklog mới sau khi kết nối bị gián đoạn.','CALENDAR_SPLIT_RESULT_UNKNOWN',502,{resultUnknown:true});
      made=candidates[0];uncertainCreate=false;
     }
     if(!/^\d+$/.test(String(made?.id||''))||knownIds.has(String(made.id))){uncertainCreate=true;throw fail('Jira chưa trả về ID mới để đối chiếu.','CALENDAR_SPLIT_RESULT_UNKNOWN',502,{resultUnknown:true});}
     const record={...target,id:String(made.id)};knownIds.add(record.id);created.push(record);
     const current=await J.getWorklog(b.key,record.id,auth);
     if(!matches(current,record,me,description))throw fail('Phần tách mới không khớp dữ liệu đã yêu cầu.');
     const newNative=await W.getWorklog(record.id,auth);
     if(String(newNative.authorUserKey)!==String(raw.author?.key))throw fail('Tác giả phần tách không khớp.');
     if(!nativeMatches(newNative,current,attribute,overtime,attributes)){
      checkBudget();await W.updateNativeWorklog({key:b.key,worklogId:record.id,current:newNative,attribute,overtime,started:record.started,seconds:D.seconds(record),description,copiedAttributes:attributes},auth);
     }
    }
    const resultItems=[];
    for(const [i,record] of [targets[0],...created].entries()) {
     const actual=await J.getWorklog(b.key,i?record.id:raw.id,auth),n=await W.getWorklog(actual.id,auth);
     if(!matches(actual,record,me,description)||!nativeMatches(n,actual,attribute,overtime,attributes))throw fail('Chưa xác nhận đủ giờ, mô tả và Overtime của các phần tách.');
     resultItems.push({...snapshot(actual,b.key),overtime,overtimeKnown:true});
    }
    return {status:200,data:{ok:true,split:true,worklogVerified:true,items:resultItems}};
   } catch(error) {
    const recoveryErrors=[];
    for(const record of created.slice().reverse())try {
     const actual=await J.getWorklog(b.key,record.id,auth);
     if(!matches(actual,record,me,description))throw new Error('Phần tách đã được sửa ngoài app; không tự xóa.');
     if(!await J.deleteWorklog(b.key,record.id,auth))throw new Error('Jira từ chối xóa phần tách khi phục hồi.');
     try{await J.getWorklog(b.key,record.id,auth);throw new Error('Phần tách vẫn tồn tại sau khi xóa.');}catch(e){if(e.status!==404)throw e;}
    }catch(e){recoveryErrors.push({worklogId:record.id,error:e.message});}
    if(firstAttempted&&!uncertainCreate&&!recoveryErrors.length)try{
     const actual=await J.getWorklog(b.key,raw.id,auth),position=snapshot(actual,b.key);
     if(!matches(actual,original,me,description)){
      if(!matches(actual,targets[0],me,description))throw new Error('Worklog gốc đã thay đổi bên ngoài; không tự ghi đè.');
      await invokeMove(req,position,original);
     }
    }catch(e){recoveryErrors.push({worklogId:String(raw.id),error:e.message});}
    const actual=[];let restored=false;
    try{
     const after=await J.getIssueWorklogs(b.key,auth),r=after.find(x=>String(x.id)===String(raw.id));
     for(const x of after.filter(x=>String(x.id)===String(raw.id)||created.some(c=>c.id===String(x.id))))actual.push(snapshot(x,b.key));
     restored=!uncertainCreate&&r&&matches(r,original,me,description)&&!created.some(c=>after.some(x=>String(x.id)===c.id));
     if(restored)restored=nativeMatches(await W.getWorklog(raw.id,auth),r,attribute,overtime,attributes);
    }catch{}
    return {status:restored?409:502,data:{ok:false,code:restored?'CALENDAR_SPLIT_ROLLED_BACK':'CALENDAR_SPLIT_RESULT_UNKNOWN',error:restored?`Chưa tách được lịch; đã phục hồi worklog gốc. ${error.message}`:'Chưa xác nhận được đầy đủ kết quả tách. Không gửi lại yêu cầu tạo mới; cần đối chiếu lịch Jira.',details:{rolledBack:!!restored,resultUnknown:!restored,actual,recoveryErrors}}};
   } finally {for(const date of new Set([original.date,segments[0].date]))await invalidateWorklogCaches(auth,date,[b.key]);}
  };
  const result=b.verifyOnly===true?{value:await run(),replayed:false}:await runIdempotent(op,requestId,run);
  return sendJson(res,result.value.status,{...result.value.data,replayed:result.replayed});
 }catch(error){if(error.status===401)res.setHeader('Set-Cookie',clearSessionCookie());return sendJson(res,error.status||500,{ok:false,error:error.message,code:error.code,details:error.details});}
};
