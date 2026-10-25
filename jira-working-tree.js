'use strict';
window.QuickJiraTree=(()=>{
 const $=id=>document.getElementById(id),body=$('jiraTreeBody');
 let revision=0,root=null,activeProject='';const nodes=new Map();
 const owner=()=>String(state.user?.username||'').toLowerCase();
 function button(label,fn,cls='secondary'){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;b.onclick=fn;return b;}
 function reset(){revision++;root=null;nodes.clear();activeProject='';body.replaceChildren();$('jiraTreeProject').value='';$('jiraTreeQuery').value='';$('jiraTreeKind').value='epics';$('jiraTreeFind').disabled=false;$('jiraTreeFind').textContent='Tìm';}
 function stateBox(text){const p=document.createElement('p');p.className='wt-message';p.setAttribute('role','status');p.textContent=text;return p;}
 function createPage(container,params){return {container,params,items:[],next:0,more:false,busy:false};}
 async function load(page,append=false){
  if(page.busy)return;page.busy=true;const token=revision,account=owner();
  page.container.setAttribute('aria-busy','true');const loading=stateBox('');loading.classList.add('wt-loading');loading.setAttribute('aria-label','Đang tải nhánh');page.container.append(loading);
  if(page===root){$('jiraTreeFind').disabled=true;$('jiraTreeFind').textContent='Đang tải…';}
  try{
   const data=await api('/api?'+new URLSearchParams({action:'jira-working-tree',...page.params,startAt:String(append?page.next:0)}));
   if(token!==revision||account!==owner())return;
   page.items=append?[...new Map([...page.items,...data.issues].map(x=>[x.key,x])).values()]:data.issues;page.next=data.nextStartAt;page.more=data.hasMore;
   // Append only new rows so expanded child branches and scroll position survive paging.
   for(const el of page.container.querySelectorAll(':scope > .wt-message,:scope > .wt-more'))el.remove();
   if(!append)page.container.replaceChildren();
   const already=new Set([...page.container.children].map(x=>x.dataset.key));
   for(const item of page.items)if(!already.has(item.key))page.container.append(row(item,page.params.kind));
   if(!page.items.length)page.container.append(stateBox('Không có công việc phù hợp hoặc tài khoản chưa thấy công việc trong nhánh này.'));
   if(page.more){const b=button(`Tải thêm (${page.items.length}/${data.total})`,()=>load(page,true));b.classList.add('wt-more');page.container.append(b);}
  }catch(e){if(token!==revision||account!==owner())return;loading.remove();const error=stateBox(e.message);error.append(button('Thử lại',()=>{error.remove();void load(page,append);}));page.container.append(error);}
  finally{loading.remove();page.busy=false;page.container.removeAttribute('aria-busy');if(token===revision&&page===root){$('jiraTreeFind').disabled=false;$('jiraTreeFind').textContent='Tìm';}}
 }
 function row(item,kind){
  const wrap=document.createElement('article');wrap.className='wt-node';wrap.dataset.key=item.key;
  const line=document.createElement('div');line.className='wt-row';
  const expandable=!item.issueType.subtask;let child=null;
  const toggle=button('›',()=>{
   if(!child){child=document.createElement('div');child.className='wt-children';wrap.append(child);const page=createPage(child,{project:activeProject,kind:kind==='epics'?'children':'subtasks',key:item.key});nodes.set(item.key,page);void load(page);}
   else child.hidden=!child.hidden;
   toggle.textContent=child.hidden?'›':'⌄';toggle.setAttribute('aria-expanded',String(!child.hidden));
  },'wt-toggle');toggle.setAttribute('aria-label','Mở nhánh '+item.key);toggle.setAttribute('aria-expanded','false');if(!expandable){toggle.disabled=true;toggle.textContent='·';}line.append(toggle);
  const open=button('',()=>window.QuickJiraSearch?.openIssue(item.key),'wt-open');const key=document.createElement('strong');key.textContent=item.key;const title=document.createElement('span');title.textContent=item.summary;
  const meta=document.createElement('small');meta.textContent=[item.issueType.name,item.assignee?.displayName||'Chưa được giao'].join(' · ');open.append(key,title,meta);line.append(open);
  const status=document.createElement('span');status.className='jira-status jira-status-'+(['new','indeterminate','done'].includes(item.status.category)?item.status.category:'new');status.textContent=item.status.name;line.append(status);
  if(expandable&&kind!=='epics'){const add=button('+',()=>window.QuickJiraCreate?.open({parent:item}),'wt-add');add.title='Tạo Subtask trong '+item.key;add.setAttribute('aria-label',add.title);line.append(add);}
  wrap.append(line);
  if(kind==='search'){const path=document.createElement('div');path.className='wt-path';path.textContent=activeProject+' → ';if(item.epic){path.append(button(item.epic,()=>reveal(item),'text-btn'));}else path.append('Chưa gắn Epic');wrap.append(path);}
  return wrap;
 }
 async function reveal(item){
  $('jiraTreeProject').value=item.epic.slice(0,item.epic.lastIndexOf('-'));$('jiraTreeKind').value='epics';$('jiraTreeQuery').value=item.epic;await search();
  const node=body.querySelector(`[data-key="${CSS.escape(item.epic)}"]`);if(!node)return;
  node.querySelector('.wt-toggle').click();const page=nodes.get(item.epic);if(!page)return;
  // The child list is paginated; locate an exact Story without fetching the entire Epic.
  page.params.q=item.key;while(page.busy)await new Promise(r=>setTimeout(r,30));if(!node.isConnected)return;await load(page);
  const target=node.querySelector(`[data-key="${CSS.escape(item.key)}"]`);target?.classList.add('wt-highlight');target?.scrollIntoView({block:'nearest',behavior:'smooth'});if(target){const all=button('Xem tất cả trong Epic',()=>{delete page.params.q;page.container.replaceChildren();void load(page);});all.classList.add('wt-more');page.container.append(all);}
 }
 async function search(){
  if(!$('jiraTreeForm').reportValidity())return;
  revision++;activeProject=$('jiraTreeProject').value.trim().toUpperCase();nodes.clear();body.replaceChildren();
  root=createPage(body,{project:activeProject,kind:$('jiraTreeKind').value,q:$('jiraTreeQuery').value.trim()});await load(root);
 }
 function created(parent){const page=nodes.get(parent);if(page){page.items=[];void load(page);}}
 $('jiraTreeForm').onsubmit=e=>{e.preventDefault();void search();};
 $('jiraTreeProject').onchange=()=>{revision++;root=null;nodes.clear();body.replaceChildren(stateBox('Bấm Tìm để tải Epic của dự án đã chọn.'));$('jiraTreeFind').disabled=false;$('jiraTreeFind').textContent='Tìm';};
 return {reset,created,activate(){if(!root&&!body.children.length)body.append(stateBox('Chọn dự án để duyệt Epic.'));}};
})();
