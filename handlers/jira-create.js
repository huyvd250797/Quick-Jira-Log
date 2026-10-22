'use strict';
const {sendJson,readJson,assertSameOrigin,methodNotAllowed}=require('../lib/http');
const {getSession,clearSessionCookie}=require('../lib/session');
const create=require('../lib/jira-create');
const reads={'jira-create-projects':(_,auth)=>create.projects(auth),'jira-create-types':create.types,'jira-create-meta':create.metadata,'jira-create-users':create.users,'jira-create-reporters':create.reporters,'jira-create-parents':create.parents};
module.exports=async(req,res)=>{
 const write=req.query.action==='jira-create',method=write?'POST':'GET';if(req.method!==method)return methodNotAllowed(res,[method]);
 if(write&&!assertSameOrigin(req))return sendJson(res,403,{ok:false,error:'Nguồn yêu cầu không hợp lệ.'});
 const auth=getSession(req);if(!auth)return sendJson(res,401,{ok:false,error:'Vui lòng đăng nhập Jira.'});
 try{
  const result=write?await create.create(await readJson(req,128*1024),auth):await reads[req.query.action](req.query,auth);
  if(result.errorStatus){if(result.errorStatus===401)res.setHeader('Set-Cookie',clearSessionCookie());return sendJson(res,result.errorStatus,{ok:false,error:result.message,code:result.code});}
  return sendJson(res,200,{ok:true,...result});
 }catch(e){
  if(e.status===401)res.setHeader('Set-Cookie',clearSessionCookie());
  if(['IDEMPOTENCY_IN_PROGRESS','IDEMPOTENCY_STORE_UNAVAILABLE'].includes(e.code))return sendJson(res,e.status||503,{ok:false,code:'RESULT_UNKNOWN',error:'Chưa xác định kết quả tạo. Kiểm tra Jira trước khi gửi lại.'});
  const invalid=['INVALID_JSON','PAYLOAD_TOO_LARGE'].includes(e.message);return sendJson(res,invalid?400:e.status||500,{ok:false,error:invalid?'Dữ liệu gửi không hợp lệ.':e.status?e.message:'Không xử lý được yêu cầu tạo Jira.'});
 }
};
