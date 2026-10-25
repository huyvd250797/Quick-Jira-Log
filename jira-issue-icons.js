'use strict';
// One icon renderer/cache for every issue list. Unknown types stay neutral.
window.QuickJiraIssueIcons=(()=>{
 let owner='',generation=0;const cache=new Map(),known=new Map(),queue=[];let running=0;
 function type(item={}){const t=item.issueType||item.issuetype||{};return {id:String((typeof t==='object'?t.id:item.issueTypeId)||''),name:String((typeof t==='string'?t:t.name)||''),subtask:typeof t==='object'&&t.subtask===true||item.isSubtask===true};}
 function fallback(t){
  const name=t.name.toLowerCase(),kind=t.subtask||/sub[ -]?task/.test(name)?'subtask':/epic/.test(name)?'epic':/bug/.test(name)?'bug':/story/.test(name)?'story':/^task$/.test(name)?'task':'unknown';
  const paths={epic:'M13 2 5 13h6l-1 9 9-13h-6z',story:'M6 4h12v17l-6-4-6 4z',bug:'M8 8h8v9a4 4 0 0 1-8 0z M9 4h6v4 M4 10h4m8 0h4M4 15h4m8 0h4',task:'m6 12 4 4 8-9',subtask:'M5 5h10v10H5z M10 15v4h9V10h-4',unknown:'M9 8a3 3 0 1 1 4 3c-1 0-1 1-1 3m0 3v1'};
  const colors={epic:'#8f68cf',story:'#63a546',bug:'#df5145',task:'#388bdb',subtask:'#388bdb',unknown:'#758399'};
  return 'data:image/svg+xml;base64,'+btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="${colors[kind]}"/><path d="${paths[kind]}" fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"/></svg>`);
 }
 function pump(){while(running<4&&queue.length){const job=queue.shift();if(job.token!==generation){job.resolve('');continue;}running++;Promise.resolve().then(()=>api('/api?'+new URLSearchParams({action:'jira-type-icon',type:job.id}))).then(d=>job.resolve(/^data:image\/(?:svg\+xml|png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(d.icon||'')?d.icon:''),()=>job.resolve('')).finally(()=>{running--;pump();});}}
 function resolve(id){if(!cache.has(id)){cache.set(id,new Promise(resolve=>queue.push({id,resolve,token:generation})));pump();}return cache.get(id);}
 function create(item){let t=type(item);if(item?.key){if(t.name||t.subtask||t.id)known.set(item.key,t);else t=known.get(item.key)||t;}const img=document.createElement('img');img.className='qjl-issue-type-icon';img.width=18;img.height=18;img.alt=t.name|| (t.subtask?'Subtask':'Chưa rõ loại công việc');img.title=img.alt;img.src=fallback(t);if(/^\d{1,20}$/.test(t.id))img.dataset.qjlType=t.id;return img;}
 function hydrate(node){const rows=[];if(node.nodeType!==1)return;if(node.matches('img[data-qjl-type]'))rows.push(node);rows.push(...node.querySelectorAll('img[data-qjl-type]'));
  for(const img of rows){const id=img.dataset.qjlType;if(!/^\d{1,20}$/.test(id||''))continue;if(img.dataset.qjlIconReady===String(generation))continue;img.dataset.qjlIconReady=String(generation);const token=generation,initial=img.src;img.onerror=()=>{img.onerror=null;img.src=initial;};resolve(id).then(src=>{if(src&&token===generation&&img.isConnected)img.src=src;});}
 }
 const observer=new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)hydrate(n);});observer.observe(document.documentElement,{childList:true,subtree:true});
 function login(user){const next=String(user?.username||'').toLowerCase();if(next!==owner){owner=next;generation++;cache.clear();known.clear();while(queue.length)queue.shift().resolve('');} }
 return {create,html:item=>create(item).outerHTML,login,reset:()=>login(null)};
})();
