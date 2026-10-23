(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.QuickJiraEta=factory();})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 function create(){return {phase:'',points:[],lastAdvance:0,lastDone:0};}
 function update(s,{phase,done,total,now,running=true,paused=false}){
  if(!running||paused){s.phase='';s.points=[];return null;}
  if(s.phase!==phase||done<s.lastDone){s.phase=phase;s.points=[{at:now,done}];s.lastAdvance=now;s.lastDone=done;}
  if(!Number.isFinite(total)||total<=done)return null;
  if(done>s.lastDone){s.lastAdvance=now;s.lastDone=done;s.points.push({at:now,done});}
  while(s.points.length>3&&now-s.points[1].at>30000)s.points.shift();
  if(now-s.lastAdvance>15000)return {waiting:true};
  if(s.points.length<3||now-s.points[0].at<2000)return null;
  const elapsed=(now-s.points[0].at)/1000,delta=done-s.points[0].done;
  return delta>0?{seconds:Math.ceil((total-done)*elapsed/delta)}:null;
 }
 function label(eta,phase){
  if(eta?.waiting)return 'Đang chờ Jira phản hồi…';
  if(!eta)return 'Đang ước tính thời gian…';
  const n=Math.max(1,eta.seconds),text=n<60?n+' giây':n<3600?Math.ceil(n/60)+' phút':Math.ceil(n/3600)+' giờ';
  return (phase==='overtime'?'Còn khoảng ':'Bước này còn khoảng ')+text;
 }
 // Workflow progress, not a claim about the fraction of elapsed time.
 function overall(phase,done,total){if(!Number.isFinite(total))return null;const f=total===0?1:Math.max(0,Math.min(1,done/total));return Math.floor((phase==='issues'?f*.2:phase==='worklogs'?.2+f*.4:.6+f*.4)*100);}
 return {create,update,label,overall};
});
