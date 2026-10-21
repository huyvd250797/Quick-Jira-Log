'use strict';
window.QuickJiraSearch=(()=>{
  const $=id=>document.getElementById(id),dialog=$('jiraSearchDialog'),peek=$('jiraIssuePeekDialog');
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const keyPattern=/^[A-Z][A-Z0-9_]*-\d+$/;
  let owner='',generation=0,busy=false,loadedOptions=false,items=[],recent=[],next=0,more=false,savedQuery=null,person=null,source=null,lastRetry=null;
  const storeKey=()=>`quick-jira-log:jira-recent:v1:${encodeURIComponent(owner)}`;
  function writeRecent(){try{localStorage.setItem(storeKey(),JSON.stringify(recent));return true;}catch{return false;}}
  function renderRecent(){
    $('jiraRecentSection').hidden=!recent.length;
    $('jiraRecentList').innerHTML=recent.map(key=>`<button type="button" class="jira-recent-chip" data-jira-open="${esc(key)}">${esc(key)}</button>`).join('');
  }
  function clearView(){
    items=[];savedQuery=null;next=0;more=false;lastRetry=null;loadedOptions=false;person=null;
    $('jiraSearchForm').reset();$('jiraPersonPicker').hidden=true;$('jiraPersonResults').replaceChildren();$('jiraPersonState').textContent='';
    $('jiraProjectOptions').replaceChildren();setOptions('jiraStatus',[],'Tất cả trạng thái');setOptions('jiraType',[],'Tất cả loại công việc');
    $('jiraSearchResults').replaceChildren();$('jiraSearchMoreBtn').hidden=true;$('jiraSearchRetryBtn').hidden=true;
    $('jiraSearchCount').textContent='Tìm công việc trên Jira';$('jiraSearchScope').textContent='';$('jiraOptionsState').textContent='';$('jiraOptionsRetryBtn').hidden=true;
    $('jiraSearchState').textContent='Nhập từ khóa hoặc chọn bộ lọc rồi bấm Tìm kiếm.';$('jiraSearchState').classList.remove('is-error');countFilters();
  }
  function login(user){
    generation++;owner=String(user?.username||'').toLowerCase();busy=false;clearView();recent=[];
    if(owner)try{const raw=JSON.parse(localStorage.getItem(storeKey())||'[]');if(Array.isArray(raw))recent=[...new Set(raw.filter(x=>typeof x==='string'&&keyPattern.test(x)))].slice(0,10);}catch{}
    $('jiraSearchBtn').classList.toggle('hidden',!owner);renderRecent();
  }
  function logout(){generation++;owner='';busy=false;if(peek.open)peek.close();if(dialog.open)dialog.close();clearView();recent=[];renderRecent();$('jiraSearchBtn').classList.add('hidden');$('jiraIssuePeekInfo').replaceChildren();$('jiraIssuePeekTitle').textContent='';$('jiraIssuePeekKey').textContent='';$('jiraIssueOpenLink').removeAttribute('href');}
  async function run(label,work){
    if(busy||!owner)return;busy=true;const token=generation,release=QuickJiraBusy.begin(label);
    try{return await work(token);}finally{if(token===generation)busy=false;release();}
  }
  function countFilters(){const n=['jiraProject','jiraStatus','jiraType','jiraAssignee'].filter(id=>$(id).value.trim()).length;$('jiraFilterCount').textContent=n?String(n):'';}
  function changed(){if(savedQuery){$('jiraSearchState').textContent='Điều kiện đã thay đổi. Bấm Tìm kiếm để cập nhật kết quả.';$('jiraSearchState').classList.remove('is-error');$('jiraSearchMoreBtn').hidden=true;$('jiraSearchRetryBtn').hidden=true;lastRetry=null;}}
  function setOptions(id,values,label){const select=$(id),old=select.value;select.innerHTML=`<option value="">${label}</option>`+values.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');if(values.some(x=>x.id===old))select.value=old;}
  async function loadOptions(){return run('Đang tải bộ lọc Jira…',async token=>{
    try{const data=await api('/api?action=jira-search-options');if(token!==generation)return;
      $('jiraProjectOptions').innerHTML=data.projects.map(x=>`<option value="${esc(x.key)}" label="${esc(x.name)}"></option>`).join('');
      setOptions('jiraStatus',data.statuses,'Tất cả trạng thái');setOptions('jiraType',data.types,'Tất cả loại công việc');
      loadedOptions=true;$('jiraOptionsState').textContent=data.warnings.join(' ');$('jiraOptionsRetryBtn').hidden=!data.warnings.length;countFilters();
    }catch(e){if(token!==generation)return;$('jiraOptionsState').textContent=e.message;$('jiraOptionsRetryBtn').hidden=false;}
  });}
  async function open(){
    if(!owner||busy||QuickJiraBusy.active)return;
    source=document.activeElement;closeDesktopEditor();closeAllToolOverlays({restore:true});
    if(!dialog.open)dialog.showModal();$('jiraSearchFilters').open=matchMedia('(min-width:900px)').matches;
    $('jiraSearchCloseBtn').focus({preventScroll:true});renderRecent();if(!loadedOptions)await loadOptions();
  }
  function dateLabel(value){const d=new Date(value);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(d);}
  function renderItems(){
    $('jiraSearchResults').innerHTML=items.map(item=>`<button class="jira-issue-card" type="button" data-jira-open="${esc(item.key)}"><div class="jira-card-top"><strong class="jira-issue-key">${esc(item.key)}</strong><span class="jira-status jira-status-${esc(item.status.category)}">${esc(item.status.name||'Chưa rõ trạng thái')}</span></div><span class="jira-card-title">${esc(item.summary)}</span><span class="jira-card-meta"><span>${esc(item.issueType.name)} · ${esc(item.project.key)}</span><span>${esc(item.assignee?.displayName||item.assignee?.username||'Chưa được giao')}</span></span><span class="jira-card-foot"><span>${item.parent?'↳ '+esc(item.parent):esc(item.priority)}</span><span>Cập nhật ${esc(dateLabel(item.updated)||'—')}</span></span></button>`).join('');
    $('jiraSearchMoreBtn').hidden=!more;
  }
  function query(){
    if($('jiraAssignee').value==='@person'&&!person)throw Error('Hãy tìm và chọn một nhân sự trước khi lọc.');
    return {q:$('jiraQuery').value.trim(),project:$('jiraProject').value.trim().toUpperCase(),status:$('jiraStatus').value,type:$('jiraType').value,assignee:$('jiraAssignee').value==='@person'?person.username:$('jiraAssignee').value};
  }
  async function search(append=false){
    let params;try{params=append?savedQuery:query();}catch(e){$('jiraSearchState').textContent=e.message;$('jiraSearchState').classList.add('is-error');return;}if(!params)return;
    return run('Đang tìm công việc trên Jira…',async token=>{
      const startAt=append?next:0;$('jiraSearchRetryBtn').hidden=true;$('jiraSearchState').classList.remove('is-error');$('jiraSearchState').textContent='Đang tìm kiếm…';lastRetry=()=>search(append);
      if(!append){items=[];more=false;renderItems();$('jiraSearchCount').textContent='Kết quả tìm kiếm';$('jiraSearchScope').textContent='';}
      try{
        const data=await api('/api?'+new URLSearchParams({action:'jira-search',...params,startAt:String(startAt)}));if(token!==generation)return;
        const firstNew=data.issues.find(x=>!items.some(old=>old.key===x.key));
        items=append?[...new Map([...items,...data.issues].map(x=>[x.key,x])).values()]:data.issues;savedQuery={...params};next=data.nextStartAt;more=data.hasMore;
        const top=$('jiraSearchDialog').scrollTop;renderItems();$('jiraSearchDialog').scrollTop=top;
        $('jiraSearchCount').textContent=`${items.length} / ${data.total} công việc`;
        const labels=[params.project,params.q?`“${params.q}”`:''];$('jiraSearchScope').textContent=labels.filter(Boolean).join(' · ')||'Theo bộ lọc đã chọn';
        $('jiraSearchState').textContent=items.length?(data.hasMore?'Còn kết quả khác. Bấm Tải thêm để xem.':'Đã hiển thị hết kết quả.'):'Không tìm thấy công việc phù hợp với từ khóa và bộ lọc.';
        if(append&&firstNew)$('jiraSearchResults').querySelector(`[data-jira-open="${CSS.escape(firstNew.key)}"]`)?.focus({preventScroll:true});
      }catch(e){if(token!==generation)return;$('jiraSearchState').textContent=e.message;$('jiraSearchState').classList.add('is-error');$('jiraSearchRetryBtn').hidden=false;}
    });
  }
  async function findPeople(){const q=$('jiraPersonQuery').value.trim();if(q.length<2){$('jiraPersonState').textContent='Nhập ít nhất 2 ký tự.';return;}person=null;
    return run('Đang tìm nhân sự trên Jira…',async token=>{try{const data=await api('/api?'+new URLSearchParams({action:'calendar-users',query:q}));if(token!==generation)return;
      $('jiraPersonResults').replaceChildren();$('jiraPersonState').textContent=data.users.length?'Chọn đúng người phụ trách:':'Không tìm thấy nhân sự phù hợp.';
      for(const user of data.users){const btn=document.createElement('button');btn.type='button';btn.className='jira-person-option';btn.textContent=`${user.displayName} · ${user.username}`;btn.onclick=()=>{person=user;$('jiraPersonState').textContent=`Đã chọn ${user.displayName} (${user.username})`;$('jiraPersonResults').replaceChildren();countFilters();changed();};$('jiraPersonResults').append(btn);}
    }catch(e){if(token===generation){$('jiraPersonResults').replaceChildren();$('jiraPersonState').textContent=e.message;}}});
  }
  async function openIssue(key){if(!keyPattern.test(key))return;
    return run('Đang đọc thông tin công việc…',async token=>{try{$('jiraSearchState').classList.remove('is-error');const data=await api('/api?'+new URLSearchParams({action:'jira-search',q:key}));if(token!==generation)return;
      const item=data.issues.find(x=>x.key===key);if(!item)throw Error('Không tìm thấy hoặc không còn quyền xem công việc này trên Jira.');
      $('jiraIssuePeekKey').textContent=item.key;$('jiraIssuePeekTitle').textContent=item.summary;
      const fields=[['Dự án',item.project.name||item.project.key],['Loại công việc',item.issueType.name],['Trạng thái',item.status.name],['Người phụ trách',item.assignee?.displayName||item.assignee?.username||'Chưa được giao'],['Ưu tiên',item.priority||'—'],['Công việc cha',item.parent||'—'],['Cập nhật',dateLabel(item.updated)||'—']];
      $('jiraIssuePeekInfo').innerHTML=fields.map(([name,value])=>`<div><dt>${esc(name)}</dt><dd>${esc(value)}</dd></div>`).join('');
      const url=new URL(item.url);if(url.origin!=='https://task.ascvn.com.vn'||!url.pathname.startsWith('/browse/'))throw Error('Liên kết Jira không hợp lệ.');$('jiraIssueOpenLink').href=url.href;
      recent=[key,...recent.filter(x=>x!==key)].slice(0,10);const persisted=writeRecent();renderRecent();if(!persisted)$('jiraSearchState').textContent='Mục vừa xem được giữ trong phiên này; trình duyệt chưa cho phép lưu trên thiết bị.';
      if(!peek.open)peek.showModal();$('jiraIssuePeekCloseBtn').focus({preventScroll:true});
    }catch(e){if(token===generation){$('jiraSearchState').textContent=e.message;$('jiraSearchState').classList.add('is-error');}}});
  }
  $('jiraSearchBtn').addEventListener('click',open);$('mobileJiraSearchBtn').addEventListener('click',open);
  $('jiraSearchCloseBtn').onclick=()=>dialog.close();$('jiraIssuePeekCloseBtn').onclick=()=>peek.close();
  dialog.addEventListener('close',()=>{source?.focus({preventScroll:true});});
  for(const d of [dialog,peek]){d.addEventListener('keydown',e=>e.stopPropagation());d.addEventListener('cancel',e=>{if(busy||QuickJiraBusy.active)e.preventDefault();});}
  $('jiraSearchForm').onsubmit=e=>{e.preventDefault();void search();};$('jiraSearchMoreBtn').onclick=()=>search(true);$('jiraSearchRetryBtn').onclick=()=>lastRetry?.();
  $('jiraSearchForm').addEventListener('input',e=>{if(e.target.id!=='jiraPersonQuery')changed();});
  $('jiraSearchForm').addEventListener('change',e=>{if(e.target.id!=='jiraPersonQuery')changed();});
  $('jiraOptionsRetryBtn').onclick=loadOptions;$('jiraPersonFindBtn').onclick=findPeople;
  $('jiraPersonQuery').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void findPeople();}});
  $('jiraProject').addEventListener('change',countFilters);
  for(const id of ['jiraStatus','jiraType','jiraAssignee'])$(id).addEventListener('change',()=>{if(id==='jiraAssignee')$('jiraPersonPicker').hidden=$('jiraAssignee').value!=='@person';countFilters();});
  $('jiraResetBtn').onclick=()=>{$('jiraProject').value='';$('jiraStatus').value='';$('jiraType').value='';$('jiraAssignee').value='';person=null;$('jiraPersonPicker').hidden=true;countFilters();changed();};
  $('jiraRecentClearBtn').onclick=()=>{recent=[];if(!writeRecent())$('jiraSearchState').textContent='Đã xóa khỏi phiên xem này; trình duyệt chưa cho phép cập nhật dữ liệu lưu trên thiết bị.';renderRecent();};
  for(const id of ['jiraSearchResults','jiraRecentList'])$(id).addEventListener('click',e=>{const button=e.target.closest('[data-jira-open]');if(button)void openIssue(button.dataset.jiraOpen);});
  if(typeof state!=='undefined'&&state.user)login(state.user);
  return {login,logout,open};
})();
