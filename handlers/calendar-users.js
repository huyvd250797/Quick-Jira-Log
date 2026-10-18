'use strict';
const {sendJson,methodNotAllowed}=require('../lib/http');
const {getSession,clearSessionCookie}=require('../lib/session');
const {searchCalendarUsers}=require('../lib/calendar-users');
module.exports=async(req,res)=>{
  if(req.method!=='GET')return methodNotAllowed(res,['GET']);
  const session=getSession(req);if(!session)return sendJson(res,401,{ok:false,error:'Vui lòng đăng nhập Jira.'});
  const query=String(req.query?.query||'').trim();
  if(query.length<2||query.length>100||/[\x00-\x1f\x7f]/.test(query))return sendJson(res,400,{ok:false,error:'Nhập từ 2 đến 100 ký tự để tìm người dùng.'});
  try {return sendJson(res,200,{ok:true,users:await searchCalendarUsers(query,session)});}
  catch(error){if(error.status===401)res.setHeader('Set-Cookie',clearSessionCookie());return sendJson(res,error.status||502,{ok:false,error:error.message||'Không tìm được người dùng Jira.'});}
};
