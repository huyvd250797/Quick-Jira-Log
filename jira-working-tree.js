'use strict';
window.QuickJiraTree=(()=>{
 const $=id=>document.getElementById(id),body=$('jiraTreeBody'),dialog=$('jiraEpicDialog');
 let revision=0,root=null,epicPage=null,epic=null,timer=null,focus=null,savedOverflow='';
 const owner=()=>String(state.user?.username||'').toLowerCase();
 function button(label,fn,cls='secondary'){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;b.onclick=fn;return b;}
 function message(text){const p=document.createElement('p');p.className='wt-message';p.setAttribute('role','status');p.textContent=text;return p;}
 function reset(){revision++;clearTimeout(timer);if(dialog.open)dialog.close();root=epicPage=epic=null;body.replaceChildren();$('jiraEpicList').replaceChildren();$('jiraEpicKey').textContent='';$('jiraEpicTitle').textContent='';$('jiraEpicQuery').value='';$('jiraTreeForm').reset();$('jiraTreeFind').disabled=false;$('jiraTreeFind').textContent='Tìm';}
 function page(container,params){return {container,params,items:[],next:0,busy:false};}
 function current(p,token,account){return revision===token&&owner()===account&&(p===root||p===epicPage);}
 function typeIcon(item){const img=QuickJiraIssueIcons.create(item);img.classList.add('wt-type-icon');return img;}
 async function load(p,append=false){
  if(p.busy)return;p.busy=true;const token=revision,account=owner(),loading=message('');loading.classList.add('wt-loading');loading.setAttribute('aria-label','Đang tải danh sách');p.container.append(loading);p.container.setAttribute('aria-busy','true');
  if(p===root){$('jiraTreeFind').disabled=true;$('jiraTreeFind').textContent='Đang tải…';}
  try{
   const d=await api('/api?'+new URLSearchParams({action:'jira-working-tree',...p.params,startAt:String(append?p.next:0)}));if(!current(p,token,account))return;
   p.items=append?[...new Map([...p.items,...d.issues].map(i=>[i.key,i])).values()]:d.issues;p.next=d.nextStartAt;
   if(!append)p.container.replaceChildren();else p.container.querySelectorAll(':scope > .wt-more,:scope > .wt-message').forEach(n=>n.remove());
   const keys=new Set([...p.container.children].map(n=>n.dataset.key));for(const i of p.items)if(!keys.has(i.key))p.container.append(row(i,p.params.kind==='epics',p.params.project));
   if(!p.items.length)p.container.append(message(d.hasMore?'Chưa thấy kết quả trong phần đã đọc. Bấm Tìm tiếp để đọc phần còn lại.':'Không có công việc phù hợp.'));
   if(d.hasMore){const more=button(d.filtered?'Tìm tiếp trong danh sách':`Tải thêm (${p.items.length}/${d.total})`,()=>load(p,true));more.classList.add('wt-more');p.container.append(more);}
  }catch(e){if(current(p,token,account)){loading.remove();const error=message(e.message);error.append(button('Thử lại',()=>{error.remove();void load(p,append);}));p.container.append(error);}}
  finally{loading.remove();p.busy=false;p.container.removeAttribute('aria-busy');if(current(p,token,account)&&p===root){$('jiraTreeFind').disabled=false;$('jiraTreeFind').textContent='Tìm';}}
 }
 function row(item,isEpic,project){
  const article=document.createElement('article');article.className='wt-node';article.dataset.key=item.key;
  const main=button('',()=>isEpic?openEpic(item,project):window.QuickJiraSearch?.openIssue(item.key),'wt-open');main.append(typeIcon(item));
  const content=document.createElement('span');content.className='wt-content';const key=document.createElement('strong');key.textContent=item.key;const title=document.createElement('span');title.className='wt-title';title.textContent=item.summary;
  const meta=document.createElement('small');meta.textContent=item.assignee?.displayName||'Chưa được giao';content.append(key,title,meta);main.append(content);article.append(main);
  const foot=document.createElement('div');foot.className='wt-foot';const status=document.createElement('span');status.className='jira-status jira-status-'+(['new','indeterminate','done'].includes(item.status.category)?item.status.category:'new');status.textContent=item.status.name;foot.append(status);
  if(isEpic){const arrow=document.createElement('span');arrow.textContent='›';arrow.setAttribute('aria-hidden','true');foot.append(arrow);}
  else if(!item.issueType.subtask){const add=button('+',()=>window.QuickJiraCreate?.open({parent:item}),'wt-add');add.title='Tạo Subtask trong '+item.key;add.setAttribute('aria-label',add.title);foot.append(add);}
  article.append(foot);return article;
 }
 function openEpic(item,project){epic=item;focus=document.activeElement;$('jiraEpicKey').textContent=item.key;$('jiraEpicTitle').textContent=item.summary;$('jiraEpicQuery').value='';
  if(!dialog.open){savedOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';dialog.showModal();}$('jiraEpicClose').focus({preventScroll:true});epicPage=page($('jiraEpicList'),{project,kind:'children',key:item.key});$('jiraEpicList').replaceChildren();void load(epicPage);
 }
 function searchEpic(){if(!epic)return;const params={...epicPage.params,q:$('jiraEpicQuery').value.trim()};epicPage=page($('jiraEpicList'),params);$('jiraEpicList').replaceChildren();void load(epicPage);}
 function search(){if(!$('jiraTreeForm').reportValidity())return;revision++;if(dialog.open)dialog.close();root=page(body,{project:$('jiraTreeProject').value.trim().toUpperCase(),kind:$('jiraTreeKind').value,q:$('jiraTreeQuery').value.trim()});body.replaceChildren();void load(root);}
 $('jiraTreeForm').onsubmit=e=>{e.preventDefault();clearTimeout(timer);search();};
 $('jiraTreeProject').onchange=()=>{revision++;root=null;body.replaceChildren(message('Bấm Tìm để tải danh sách của dự án đã chọn.'));$('jiraTreeFind').disabled=false;$('jiraTreeFind').textContent='Tìm';};
 $('jiraEpicForm').onsubmit=e=>{e.preventDefault();clearTimeout(timer);searchEpic();};$('jiraEpicQuery').oninput=()=>{clearTimeout(timer);timer=setTimeout(searchEpic,350);};
 $('jiraEpicClose').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{clearTimeout(timer);epicPage=epic=null;document.documentElement.style.overflow=savedOverflow;focus?.isConnected&&focus.focus({preventScroll:true});});
 dialog.addEventListener('keydown',e=>e.stopPropagation());
 // Native dialog prevents background clicks; prevent wheel/touch scroll chaining as well.
 for(const type of ['wheel','touchmove'])dialog.addEventListener(type,e=>{if(!e.target.closest('#jiraEpicList')&&e.cancelable)e.preventDefault();},{passive:false});
 return {reset,created(){/* Child rows do not contain expanded subtask lists; opening details reads fresh. */},activate(){if(!root&&!body.children.length)body.append(message('Chọn dự án để duyệt Epic.'));}};
})();
