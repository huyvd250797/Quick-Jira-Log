'use strict';
const {sendJson,readJson,assertSameOrigin,methodNotAllowed}=require('../lib/http');
const {getSession,clearSessionCookie}=require('../lib/session');
const actions=require('../lib/jira-quick-update');
module.exports=async(req,res)=>{
 const write=req.query.action==='jira-update',allowed=write?['POST']:['GET'];
 if(!allowed.includes(req.method))return methodNotAllowed(res,allowed);
 if(write&&!assertSameOrigin(req))return sendJson(res,403,{ok:false,error:'Nguồn yêu cầu không hợp lệ.'});
 const auth=getSession(req);if(!auth)return sendJson(res,401,{ok:false,error:'Vui lòng đăng nhập Jira.'});
 try{
  const result=write?await actions.execute(await readJson(req,64*1024),auth):await (req.query.action==='jira-comments'?actions.comments:req.query.action==='jira-update-users'?actions.users:actions.options)(req.query,auth);
  if(result.errorStatus){if(result.errorStatus===401)res.setHeader('Set-Cookie',clearSessionCookie());return sendJson(res,result.errorStatus,{ok:false,error:result.message,code:result.code});}
  return sendJson(res,200,{ok:true,...result});
 }catch(e){
  if(['IDEMPOTENCY_IN_PROGRESS','IDEMPOTENCY_STORE_UNAVAILABLE'].includes(e.code))return sendJson(res,e.status||503,{ok:false,code:'RESULT_UNKNOWN',error:'Chưa lấy được kết quả yêu cầu cập nhật. Kiểm tra Jira trước khi gửi lại.'});
  if(e.status===401)res.setHeader('Set-Cookie',clearSessionCookie());
  const invalid=['INVALID_JSON','PAYLOAD_TOO_LARGE'].includes(e.message);
  return sendJson(res,invalid?400:(e.status||500),{ok:false,error:invalid?'Dữ liệu gửi không hợp lệ.':e.status?e.message:'Chưa xử lý được thao tác Jira.'});
 }
};
