'use strict';
const {sendJson,methodNotAllowed}=require('../lib/http');
const {getSession,clearSessionCookie}=require('../lib/session');
const detail=require('../lib/jira-issue-detail');
module.exports=async(req,res)=>{
  if(req.method!=='GET')return methodNotAllowed(res,['GET']);
  const auth=getSession(req);if(!auth)return sendJson(res,401,{ok:false,error:'Vui lòng đăng nhập Jira.'});
  try{const fn=req.query.action==='jira-issue-subtasks'?detail.subtasks:req.query.action==='jira-issue-worklogs'?detail.worklogs:detail.detail;return sendJson(res,200,{ok:true,...await fn(req.query,auth)});}
  catch(e){if(e.status===401)res.setHeader('Set-Cookie',clearSessionCookie());return sendJson(res,e.status||500,{ok:false,error:e.status?e.message:'Không tải được chi tiết công việc.'});}
};
