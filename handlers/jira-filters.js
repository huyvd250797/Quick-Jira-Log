'use strict';
const {sendJson,methodNotAllowed}=require('../lib/http');
const {getSession,clearSessionCookie}=require('../lib/session');
const filters=require('../lib/jira-saved-filters');
module.exports=async(req,res)=>{
 if(req.method!=='GET')return methodNotAllowed(res,['GET']);const auth=getSession(req);if(!auth)return sendJson(res,401,{ok:false,error:'Vui lòng đăng nhập Jira.'});
 try{return sendJson(res,200,{ok:true,...await(req.query.action==='jira-saved-filters'?filters.list:filters.search)(req.query,auth)});}
 catch(e){if(e.status===401)res.setHeader('Set-Cookie',clearSessionCookie());return sendJson(res,e.status||500,{ok:false,error:e.status?e.message:'Chưa tải được filter Jira.'});}
};
