'use strict';
const {sendJson,methodNotAllowed}=require('../lib/http');
const {getSession,clearSessionCookie}=require('../lib/session');
const search=require('../lib/jira-search');
module.exports=async(req,res)=>{
  if(req.method!=='GET')return methodNotAllowed(res,['GET']);
  const auth=getSession(req);if(!auth)return sendJson(res,401,{ok:false,error:'Vui lòng đăng nhập Jira.'});
  try {
    const result=await (req.query.action==='jira-search-options'?search.options(req.query,auth):search.search(req.query,auth));
    return sendJson(res,200,{ok:true,...result});
  }catch(error){if(error.status===401)res.setHeader('Set-Cookie',clearSessionCookie());return sendJson(res,error.status||500,{ok:false,error:error.status?error.message:'Không tải được dữ liệu tra cứu Jira.'});}
};
