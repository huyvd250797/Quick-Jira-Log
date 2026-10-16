const http=require('http'),fs=require('fs'),path=require('path');
const ui=require('../../lib/ui-tools');
const root=path.resolve(__dirname,'../..');
const state={mode:'success',posts:[],onMutation:null};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname==='/api'){
  let raw='';for await(const c of req)raw+=c;const body=raw?JSON.parse(raw):{};state.posts.push({action:url.searchParams.get('action'),body});
  res.writeHead(200,{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store'});
  for(const [percent,phase] of [[5,'Đang đọc task'],[25,'Đang kiểm tra giờ trống'],[50,'Đã kiểm tra; đang ghi worklog'],[80,'Đã ghi worklog; đang cập nhật trạng thái'],[98,'Đang hoàn tất']]){
   res.write(JSON.stringify({type:'progress',percent,phase})+'\n');await delay(140);
  }
  if(state.mode==='interrupted'){res.end();return;}
  if(state.mode==='error'){res.end(JSON.stringify({type:'result',status:409,data:{ok:false,error:'Giờ đã trùng; vui lòng kiểm tra lại.'}})+'\n');return;}
  const bulk=url.searchParams.get('action')==='bulk-worklog';
  const items=(bulk?body.items:[body]).map(x=>({key:x.key,summary:'Công việc thử nghiệm',project:x.project,minutes:ui.durationMinutes(x.timeSpent),description:x.description,segments:[{start:'13:30',end:'15:00',minutes:ui.durationMinutes(x.timeSpent)}]}));
  state.onMutation?.(items,body.date);
  const data=bulk?{ok:true,date:body.date,totalMinutes:items.reduce((s,x)=>s+x.minutes,0),items,transitions:[]}:{ok:true,date:body.date,issue:{key:body.key,summary:'Công việc thử nghiệm'},totalMinutes:items[0].minutes,segments:items[0].segments,transition:{ok:true,status:'Done'}};
  res.write(JSON.stringify({type:'progress',percent:100,phase:'Hoàn tất'})+'\n');res.end(JSON.stringify({type:'result',status:200,data})+'\n');return;
 }
 const file=path.join(root,url.pathname==='/'?'index.html':url.pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(error?'Not found':data);});
});
module.exports={server,state};
