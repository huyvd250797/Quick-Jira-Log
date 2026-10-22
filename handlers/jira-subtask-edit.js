'use strict';
const {sendJson,readJson,assertSameOrigin,methodNotAllowed}=require('../lib/http');
const {getSession,clearSessionCookie}=require('../lib/session');
const edit=require('../lib/jira-subtask-edit');
module.exports=async(req,res)=>{
 const scope=req.query.action.startsWith('jira-description-')?'description':req.query.action.startsWith('jira-parent-')?'parent':'subtask',write=['jira-subtask-edit','jira-parent-edit','jira-description-edit'].includes(req.query.action),allowed=write?['POST']:['GET'];if(!allowed.includes(req.method))return methodNotAllowed(res,allowed);
 if(write&&!assertSameOrigin(req))return sendJson(res,403,{ok:false,error:'Nguồn yêu cầu không hợp lệ.'});
 const auth=getSession(req);if(!auth)return sendJson(res,401,{ok:false,error:'Vui lòng đăng nhập Jira.'});
 try{const result=write?await edit.execute(await readJson(req,96*1024),auth,scope):await edit.options(req.query,auth,scope);if(result.errorStatus){if(result.errorStatus===401)res.setHeader('Set-Cookie',clearSessionCookie());return sendJson(res,result.errorStatus,{ok:false,error:result.message,code:result.code});}return sendJson(res,200,{ok:true,...result});}
 catch(e){if(e.status===401)res.setHeader('Set-Cookie',clearSessionCookie());const uncertain=['IDEMPOTENCY_IN_PROGRESS','IDEMPOTENCY_STORE_UNAVAILABLE'].includes(e.code),invalid=['INVALID_JSON','PAYLOAD_TOO_LARGE'].includes(e.message);return sendJson(res,invalid?400:e.status||500,{ok:false,code:uncertain?'RESULT_UNKNOWN':'NOT_SENT',error:uncertain?'Chưa lấy được kết quả lưu. Kiểm tra Jira trước khi gửi lại.':invalid?'Dữ liệu gửi không hợp lệ.':e.status?e.message:'Chưa xử lý được yêu cầu sửa công việc.'});}
};
