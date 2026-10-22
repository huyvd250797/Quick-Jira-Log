'use strict';
const {sendJson,readJson,assertSameOrigin,methodNotAllowed}=require('../lib/http');
const {getSession,clearSessionCookie}=require('../lib/session');
const files=require('../lib/jira-attachments');
module.exports=async(req,res)=>{
 const write=req.query.action==='jira-attachment-upload';if(req.method!==(write?'POST':'GET'))return methodNotAllowed(res,[write?'POST':'GET']);
 if(write&&!assertSameOrigin(req))return sendJson(res,403,{ok:false,error:'Nguồn yêu cầu không hợp lệ.'});
 const auth=getSession(req);if(!auth)return sendJson(res,401,{ok:false,error:'Vui lòng đăng nhập Jira.'});
 try{
  if(req.query.action==='jira-attachment-content'){
   const {file,data,mime}=await files.content(req.query,auth);res.statusCode=200;res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type',mime);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'none'; sandbox");res.setHeader('Content-Disposition',(req.query.download==='1'||mime==='application/octet-stream'?'attachment':'inline')+"; filename*=UTF-8''"+encodeURIComponent(file.name));return res.end(data);
  }
  const result=write?await files.upload(await readJson(req,4.25*1024*1024),auth):await files.list(req.query,auth);return sendJson(res,200,{ok:true,...result});
 }catch(e){if(e.status===401)res.setHeader('Set-Cookie',clearSessionCookie());return sendJson(res,e.status||500,{ok:false,error:e.status?e.message:'Không xử lý được tệp. Kiểm tra Jira trước khi gửi lại.'});}
};
