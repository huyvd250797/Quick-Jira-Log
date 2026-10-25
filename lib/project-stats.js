(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.QuickJiraProjectStats=factory();})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';
 function aggregate(items){
  const seen=new Set(),people=new Map(),tasks=new Set();let seconds=0;
  for(const x of items){if(seen.has(x.id))continue;seen.add(x.id);seconds+=x.seconds;if(x.isSubtask)tasks.add(x.key);
   let p=people.get(x.authorId);if(!p){p={id:x.authorId,name:x.authorName,seconds:0,regular:0,overtime:0,unknown:0,tasks:new Set(),issues:new Map()};people.set(x.authorId,p);}
   p.seconds+=x.seconds;p[x.overtimeKnown?(x.overtime?'overtime':'regular'):'unknown']+=x.seconds;if(x.isSubtask)p.tasks.add(x.key);
   let t=p.issues.get(x.key);if(!t){t={key:x.key,summary:x.summary,isSubtask:x.isSubtask,issueType:x.issueType,issueTypeId:x.issueTypeId,seconds:0,logs:[]};p.issues.set(x.key,t);}t.seconds+=x.seconds;t.logs.push(x);
  }
  return {seconds,subtasks:tasks.size,people:[...people.values()].map(p=>({...p,subtasks:p.tasks.size,share:seconds?p.seconds/seconds*100:0,issues:[...p.issues.values()].sort((a,b)=>b.seconds-a.seconds)})).sort((a,b)=>b.seconds-a.seconds||a.name.localeCompare(b.name))};
 }
 function duration(seconds){const n=Math.round(seconds/60),h=Math.floor(n/60),m=n%60;return [h?`${h}h`:'',m?`${m}m`:''].filter(Boolean).join(' ')||'0h';}
 return {aggregate,duration};
});
