(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.QuickJiraProjectStats=factory();})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';
 function aggregate(items){
  const seen=new Set(),people=new Map(),tasks=new Set();let seconds=0;
  for(const x of items){if(seen.has(x.id))continue;seen.add(x.id);seconds+=x.seconds;if(x.isSubtask)tasks.add(x.key);
   let p=people.get(x.authorId);if(!p){p={id:x.authorId,name:x.authorName,username:x.authorUsername||x.authorId,seconds:0,regular:0,overtime:0,unknown:0,tasks:new Set(),issues:new Map()};people.set(x.authorId,p);}
   p.seconds+=x.seconds;p[x.overtimeKnown?(x.overtime?'overtime':'regular'):'unknown']+=x.seconds;if(x.isSubtask)p.tasks.add(x.key);
   let t=p.issues.get(x.key);if(!t){t={key:x.key,summary:x.summary,isSubtask:x.isSubtask,issueType:x.issueType,issueTypeId:x.issueTypeId,seconds:0,logs:[]};p.issues.set(x.key,t);}t.seconds+=x.seconds;t.logs.push(x);
  }
  return {seconds,subtasks:tasks.size,people:[...people.values()].map(p=>({...p,subtasks:p.tasks.size,share:seconds?p.seconds/seconds*100:0,issues:[...p.issues.values()].sort((a,b)=>b.seconds-a.seconds)})).sort((a,b)=>b.seconds-a.seconds||a.name.localeCompare(b.name))};
 }
 function duration(seconds){const n=Math.round(seconds/60),h=Math.floor(n/60),m=n%60;return [h?`${h}h`:'',m?`${m}m`:''].filter(Boolean).join(' ')||'0h';}
 function manDays(seconds){return (Math.max(0,Number(seconds)||0)/28800).toLocaleString('vi-VN',{maximumFractionDigits:2});}
 function firstWorklog(a,b){
  if(!b||!Number.isFinite(Date.parse(b.start)))return a||null;
  if(!a||!Number.isFinite(Date.parse(a.start)))return b;
  const delta=Date.parse(a.start)-Date.parse(b.start);
  return delta<0?a:delta>0?b:([a.key,a.id].join('|').localeCompare([b.key,b.id].join('|'))<=0?a:b);
 }
 const searchText=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase();
 function memberMatches(person,query){const tokens=searchText(query).trim().split(/\s+/).filter(Boolean),text=searchText([person.name,person.username,person.id].join(' '));return tokens.every(token=>text.includes(token));}
 return {aggregate,duration,manDays,firstWorklog,memberMatches};
});
