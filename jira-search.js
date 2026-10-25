'use strict';
window.QuickJiraSearch=(()=>{
  const $=id=>document.getElementById(id),dialog=$('jiraSearchDialog'),peek=$('jiraIssuePeekDialog');
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const keyPattern=/^[A-Z][A-Z0-9_]*-\d+$/;
  let owner='',generation=0,busy=false,loadedOptions=false,items=[],recent=[],next=0,more=false,savedQuery=null,person=null,source=null,lastRetry=null;
  let detailContext=null,detailStack=[],detailOrigin=null,detailRetry=null;
  let mode='search',filtersLoaded=false;
  function compactFilter(value){$('jiraFilterTools').hidden=value;$('jiraFilterExpandBtn').setAttribute('aria-expanded',String(!value));}
  $('jiraFilterExpandBtn').onclick=()=>compactFilter(!$('jiraFilterTools').hidden);
  const resultPane=$('jiraSearchResultsPane');
  const storeKey=()=>`quick-jira-log:jira-recent:v1:${encodeURIComponent(owner)}`;
  function writeRecent(){try{localStorage.setItem(storeKey(),JSON.stringify(recent));return true;}catch{return false;}}
  function renderRecent(){
    $('jiraRecentSection').hidden=!recent.length;
    $('jiraRecentList').innerHTML=recent.map(key=>`<button type="button" class="jira-recent-chip" data-jira-open="${esc(key)}">${esc(key)}</button>`).join('');
  }
  function clearView(){
    window.QuickJiraCreate?.reset();
    clearDetail();
    items=[];savedQuery=null;next=0;more=false;lastRetry=null;loadedOptions=false;person=null;dialog.classList.remove('has-jira-results');
    mode='search';window.QuickJiraTree?.reset();filtersLoaded=false;compactFilter(false);$('jiraSavedForm').reset();$('jiraSavedSelect').innerHTML='<option value="">Chọn filter</option>';$('jiraSavedState').textContent='';$('jiraSavedRetryBtn').hidden=true;renderMode();
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
  function renderMode(){dialog.classList.toggle('jira-tree-mode',mode==='tree');$('jiraTreePane').hidden=mode!=='tree';resultPane.hidden=mode==='tree';$('jiraTreeModeBtn').setAttribute('aria-pressed',String(mode==='tree'));dialog.classList.toggle('jira-filter-mode',mode==='filter');for(const value of ['search','filter'])$(value==='search'?'jiraSearchModeBtn':'jiraFilterModeBtn').setAttribute('aria-pressed',String(mode===value));$('jiraSearchForm').hidden=mode!=='search';$('jiraSavedForm').hidden=mode!=='filter';}
  async function changeMode(value){if(busy||QuickJiraBusy.active||value===mode)return;mode=value;renderMode();dialog.classList.remove('has-jira-results');items=[];savedQuery=null;next=0;more=false;lastRetry=null;renderItems();$('jiraSearchRetryBtn').hidden=true;$('jiraSearchCount').textContent=value==='filter'?'Công việc từ filter':'Kết quả tìm kiếm';$('jiraSearchScope').textContent='';$('jiraSearchState').textContent=value==='filter'?'Chọn filter Jira để xem công việc.':'Nhập từ khóa hoặc dùng bộ lọc rồi tìm kiếm.';resultPane.scrollTop=0;if(value==='tree')window.QuickJiraTree?.activate();if(value==='filter'&&!filtersLoaded)await loadSavedFilters();}
  async function loadSavedFilters(){return run('Đang tải filter đã lưu trên Jira…',async token=>{
    $('jiraSavedRetryBtn').hidden=true;try{const data=await api('/api?'+new URLSearchParams({action:'jira-saved-filters',q:$('jiraSavedName').value.trim()}));if(token!==generation)return;
     const old=$('jiraSavedSelect').value;$('jiraSavedSelect').innerHTML='<option value="">Chọn filter</option>'+data.filters.map(f=>`<option value="${esc(f.id)}">${f.favourite?'★ ':''}${esc(f.name)}${f.owner?' · '+esc(f.owner):''}</option>`).join('');if(data.filters.some(f=>f.id===old))$('jiraSavedSelect').value=old;
     filtersLoaded=true;$('jiraSavedState').textContent=data.filters.length?'':'Chưa có filter phù hợp.';$('jiraSavedRetryBtn').hidden=!data.warnings.length;
    }catch(e){if(token===generation){$('jiraSavedState').textContent=e.message;$('jiraSavedRetryBtn').hidden=false;}}
  });}
  async function loadOptions(){return run('Đang tải bộ lọc Jira…',async token=>{
    try{const data=await api('/api?action=jira-search-options');if(token!==generation)return;
      $('jiraProjectOptions').innerHTML=data.projects.map(x=>`<option value="${esc(x.key)}" label="${esc(x.name)}"></option>`).join('');
      setOptions('jiraStatus',data.statuses,'Tất cả trạng thái');setOptions('jiraType',data.types,'Tất cả loại công việc');
      loadedOptions=true;$('jiraOptionsState').textContent=data.warnings.join(' ');$('jiraOptionsRetryBtn').hidden=!data.warnings.length;countFilters();
    }catch(e){if(token!==generation)return;$('jiraOptionsState').textContent=e.message;$('jiraOptionsRetryBtn').hidden=false;}
  });}
  async function open(){
    if(!owner||QuickJiraBusy.active)return;
    source=document.activeElement;closeDesktopEditor();closeAllToolOverlays({restore:true});
    if(!dialog.open)dialog.showModal();$('jiraSearchFilters').open=matchMedia('(min-width:900px)').matches;
    $('jiraSearchCloseBtn').focus({preventScroll:true});renderRecent();if(!loadedOptions&&!busy)await loadOptions();
  }
  function dateLabel(value){const d=new Date(value);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(d);}
  function renderItems(){
    $('jiraSearchResults').innerHTML=items.map(item=>`<button class="jira-issue-card" type="button" data-jira-open="${esc(item.key)}"><div class="jira-card-top"><strong class="jira-issue-key">${esc(item.key)}</strong><span class="jira-status jira-status-${esc(item.status.category)}">${esc(item.status.name||'Chưa rõ trạng thái')}</span></div><span class="jira-card-title">${esc(item.summary)}</span><span class="jira-card-meta"><span>${esc(item.issueType.name)} · ${esc(item.project.key)}</span><span>${esc(item.assignee?.displayName||item.assignee?.username||'Chưa được giao')}</span></span><span class="jira-card-foot"><span>${item.parent?'↳ '+esc(item.parent):esc(item.priority)}</span><span>Cập nhật ${esc(dateLabel(item.updated)||'—')}</span></span></button>`).join('');
    $('jiraSearchMoreBtn').hidden=!more;
  }
  function query(){
    if(mode==='filter'){const filterId=$('jiraSavedId').value.trim()||$('jiraSavedSelect').value;if(!/^\d{1,20}$/.test(filterId))throw Error('Chọn filter Jira hoặc nhập ID hợp lệ.');return {mode:'filter',filterId};}
    if($('jiraAssignee').value==='@person'&&!person)throw Error('Hãy tìm và chọn một nhân sự trước khi lọc.');
    return {q:$('jiraQuery').value.trim(),project:$('jiraProject').value.trim().toUpperCase(),status:$('jiraStatus').value,type:$('jiraType').value,assignee:$('jiraAssignee').value==='@person'?person.username:$('jiraAssignee').value};
  }
  async function search(append=false){
    let params;try{params=append?savedQuery:query();}catch(e){$('jiraSearchState').textContent=e.message;$('jiraSearchState').classList.add('is-error');return;}if(!params)return;
    return run('Đang tìm công việc trên Jira…',async token=>{
      const startAt=append?next:0;$('jiraSearchRetryBtn').hidden=true;$('jiraSearchState').classList.remove('is-error');$('jiraSearchState').textContent='Đang tìm kiếm…';lastRetry=()=>search(append);
      if(!append){items=[];more=false;renderItems();$('jiraSearchCount').textContent='Kết quả tìm kiếm';$('jiraSearchScope').textContent='';}
      try{
        const data=await api('/api?'+new URLSearchParams({action:params.mode==='filter'?'jira-filter-issues':'jira-search',...params,startAt:String(startAt)}));if(token!==generation)return;
        const firstNew=data.issues.find(x=>!items.some(old=>old.key===x.key));
        items=append?[...new Map([...items,...data.issues].map(x=>[x.key,x])).values()]:data.issues;savedQuery={...params};next=data.nextStartAt;more=data.hasMore;
        if(data.revision)savedQuery.revision=data.revision;if(params.mode==='filter')compactFilter(true);dialog.classList.add('has-jira-results');
        const top=resultPane.scrollTop;renderItems();resultPane.scrollTop=top;
        $('jiraSearchCount').textContent=`${items.length} / ${data.total} công việc`;
        const labels=[params.project,params.q?`“${params.q}”`:''];$('jiraSearchScope').textContent=data.filter?`Filter: ${data.filter.name}`:labels.filter(Boolean).join(' · ')||'Theo bộ lọc đã chọn';
        $('jiraSearchState').textContent=items.length?(data.hasMore?'Còn kết quả khác. Bấm Tải thêm để xem.':'Đã hiển thị hết kết quả.'):'Không tìm thấy công việc phù hợp với từ khóa và bộ lọc.';
        if(append&&firstNew)$('jiraSearchResults').querySelector(`[data-jira-open="${CSS.escape(firstNew.key)}"]`)?.focus({preventScroll:true});
      }catch(e){if(token!==generation)return;$('jiraSearchState').textContent=e.message;$('jiraSearchState').classList.add('is-error');if(e.status===409&&params.mode==='filter'){more=false;renderItems();lastRetry=()=>search(false);}$('jiraSearchRetryBtn').hidden=false;}
    });
  }
  async function findPeople(){const q=$('jiraPersonQuery').value.trim();if(q.length<2){$('jiraPersonState').textContent='Nhập ít nhất 2 ký tự.';return;}person=null;
    return run('Đang tìm nhân sự trên Jira…',async token=>{try{const data=await api('/api?'+new URLSearchParams({action:'calendar-users',query:q}));if(token!==generation)return;
      $('jiraPersonResults').replaceChildren();$('jiraPersonState').textContent=data.users.length?'Chọn đúng người phụ trách:':'Không tìm thấy nhân sự phù hợp.';
      for(const user of data.users){const btn=document.createElement('button');btn.type='button';btn.className='jira-person-option';btn.textContent=`${user.displayName} · ${user.username}`;btn.onclick=()=>{person=user;$('jiraPersonState').textContent=`Đã chọn ${user.displayName} (${user.username})`;$('jiraPersonResults').replaceChildren();countFilters();changed();};$('jiraPersonResults').append(btn);}
    }catch(e){if(token===generation){$('jiraPersonResults').replaceChildren();$('jiraPersonState').textContent=e.message;}}});
  }
  function clearDetail(){detailContext=null;detailStack=[];detailOrigin=null;detailRetry=null;
    window.QuickJiraReading?.reset();
    $('jiraDetailCreateSubBtn').hidden=true;
    window.QuickJiraActions?.clear();window.QuickJiraAttachments?.clear();window.QuickJiraSubtaskEdit?.clear();
    $('jiraIssuePeekKey').textContent='';$('jiraIssuePeekTitle').textContent='';$('jiraIssuePeekTitle').removeAttribute('title');$('jiraIssueOpenLink').removeAttribute('href');
    for(const id of ['jiraIssuePeekInfo','jiraIssueDescription','jiraSubtaskList','jiraWorklogList'])$(id).replaceChildren();
    $('jiraDetailNotice').hidden=true;$('jiraDetailRetryBtn').hidden=true;$('jiraDetailLogBtn').hidden=true;$('jiraDetailBackBtn').hidden=true;$('jiraDetailParentBtn').hidden=true;
  }
  function detailMessage(message='',retry=null){$('jiraDetailNotice').textContent=message;$('jiraDetailNotice').hidden=!message;$('jiraDetailNotice').classList.toggle('is-error',!!message);detailRetry=retry;$('jiraDetailRetryBtn').hidden=!retry;}
  function snapshotList(){
    const candidates=[...$('jiraSearchResults').querySelectorAll('[data-jira-open]')],frame=resultPane.getBoundingClientRect();
    const anchor=candidates.find(node=>node.getBoundingClientRect().bottom>frame.top+90);
    return {focus:document.activeElement,key:anchor?.dataset.jiraOpen||'',top:anchor?.getBoundingClientRect().top??0,scroll:resultPane.scrollTop};
  }
  function restoreList(){const saved=detailOrigin;detailOrigin=null;if(!saved||!dialog.open)return;
    const anchor=saved.key?$('jiraSearchResults').querySelector(`[data-jira-open="${CSS.escape(saved.key)}"]`):null;
    if(anchor)resultPane.scrollTop+=anchor.getBoundingClientRect().top-saved.top;else resultPane.scrollTop=saved.scroll;
    if(saved.focus?.isConnected)saved.focus.focus({preventScroll:true});
  }
  function emptyPart(){return {items:[],next:0,total:null,loaded:false,more:false,limited:false,error:''};}
  function renderDetail(){
    const item=detailContext.issue;
    $('jiraDetailCreateSubBtn').hidden=item.issueType.subtask;
    window.QuickJiraActions?.setIssue(item);window.QuickJiraAttachments?.setIssue(item);window.QuickJiraSubtaskEdit?.setIssue(item);
    $('jiraIssuePeekKey').textContent=item.key;$('jiraIssuePeekTitle').textContent=item.summary;$('jiraIssuePeekTitle').title=item.summary;
    const fields=[['Dự án',item.project.name||item.project.key],['Loại',item.issueType.name],['Trạng thái',item.status.name],['Người phụ trách',item.assignee?.displayName||item.assignee?.username||'Chưa được giao'],['Ưu tiên',item.priority||'—'],['Cập nhật',dateLabel(item.updated)||'—']];
    const tone=({'green':'green','yellow':'amber','blue':'blue','blue-gray':'slate','medium-gray':'slate','brown':'amber'})[item.status.colorName]||({done:'green',indeterminate:'blue',new:'slate'})[item.status.category]||'slate';
    $('jiraIssuePeekInfo').innerHTML=fields.map(([name,value])=>`<div><dt>${esc(name)}</dt><dd>${name==='Trạng thái'?`<span class="jira-status jira-tone-${tone}">${esc(value)}</span>`:esc(value)}</dd></div>`).join('');
    const media={key:item.key,attachments:item.attachments||[]};
    $('jiraIssueDescription').innerHTML=(item.descriptionHtml?QuickJiraContent.rendered(item.descriptionHtml,media):'')||(item.description.text?QuickJiraContent.render(item.description.text,media):'<p class="jira-search-note">Chưa có mô tả.</p>');
    $('jiraDescriptionNotice').hidden=!item.description.truncated;
    $('jiraDetailParentBtn').hidden=!item.parent;$('jiraDetailParentBtn').textContent=item.parent?`↳ ${item.parent}`:'';
    $('jiraDetailBackBtn').hidden=!detailStack.length;
    $('jiraDetailLogBtn').hidden=!state.filterIssues.some(x=>x.key===item.key);
    $('jiraDetailLogBtn').disabled=false;
    $('jiraSubtaskList').replaceChildren();$('jiraWorklogList').replaceChildren();
    $('jiraSubtasksState').textContent='';$('jiraWorklogsState').textContent='';$('jiraSubtasksMoreBtn').hidden=true;$('jiraWorklogsMoreBtn').hidden=true;
    selectDetailTab('description',false);$('jiraDetailBody').scrollTop=0;detailMessage();
  }
  async function openIssue(key,{back=false,replace=false}={}){if(!keyPattern.test(key)||busy||!owner)return;
    const opening=!peek.open,origin=opening?snapshotList():null;
    return run('Đang đọc chi tiết công việc…',async token=>{try{
      const data=await api('/api?'+new URLSearchParams({action:'jira-issue',key}));if(token!==generation)return;
      const item=data.issue;if(!item||item.key!==key)throw Error('Không đọc được đúng công việc đã chọn.');
      const url=new URL(item.url);if(url.origin!=='https://task.ascvn.com.vn'||url.pathname!==`/browse/${encodeURIComponent(key)}`)throw Error('Liên kết Jira không hợp lệ.');
      if(opening){detailStack=[];detailOrigin=origin;}else if(back)detailStack.pop();else if(!replace&&detailContext?.issue.key!==key){detailStack.push(detailContext.issue.key);detailStack=detailStack.slice(-20);}
      detailContext={issue:item,tab:'description',parts:{subtasks:emptyPart(),worklogs:emptyPart()}};
      $('jiraIssueOpenLink').href=url.href;renderDetail();
      recent=[key,...recent.filter(x=>x!==key)].slice(0,10);const persisted=writeRecent();renderRecent();if(!persisted)$('jiraSearchState').textContent='Mục vừa xem được giữ trong phiên này; trình duyệt chưa cho phép lưu trên thiết bị.';
      if(!peek.open)peek.showModal();$('jiraIssuePeekCloseBtn').focus({preventScroll:true});
    }catch(e){if(token!==generation)return;if(peek.open)detailMessage(e.message,()=>openIssue(key,{back,replace}));else{$('jiraSearchState').textContent=e.message;$('jiraSearchState').classList.add('is-error');lastRetry=()=>openIssue(key);$('jiraSearchRetryBtn').hidden=false;}}});
  }
  function secondsLabel(seconds){if(seconds===null)return 'Chưa rõ thời lượng';const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;return [h?`${h}h`:'',m?`${m}m`:'',s?`${s}s`:''].filter(Boolean).join(' ')||'0s';}
  function renderPart(name){
    const part=detailContext.parts[name],isSub=name==='subtasks',stateBox=$(isSub?'jiraSubtasksState':'jiraWorklogsState');
    if(isSub){$('jiraSubtaskList').innerHTML=part.items.map(item=>`<button type="button" class="jira-subtask" data-jira-child="${esc(item.key)}"><span class="jira-card-top"><span class="jira-issue-key">${esc(item.key)}</span><span class="jira-status jira-status-${esc(item.status.category)}">${esc(item.status.name)}</span></span><strong>${esc(item.summary)}</strong><span class="jira-card-meta">${esc(item.assignee?.displayName||item.assignee?.username||'Chưa được giao')}</span></button>`).join('');}
    else{$('jiraWorklogList').innerHTML=part.items.map(w=>`<article class="jira-worklog"><div class="jira-worklog-head"><span>${esc(dateLabel(w.started)||'Chưa rõ ngày giờ')}</span><strong>${esc(secondsLabel(w.timeSpentSeconds))}</strong></div><p class="jira-worklog-author">${esc(w.author.displayName||w.author.username||'Chưa rõ người log')}</p><div class="jira-content">${w.comment.text?QuickJiraContent.render(w.comment.text):'<p class="jira-search-note">Không có mô tả.</p>'}</div>${w.comment.truncated?'<p class="jira-search-note">Nội dung dài đã được rút gọn. Mở Jira để xem đầy đủ.</p>':''}</article>`).join('');}
    const sum=part.items.reduce((n,w)=>n+(w.timeSpentSeconds||0),0);
    stateBox.textContent=part.error||(!part.items.length?'Chưa có '+(isSub?'subtask':'worklog')+' được trả về.':`${part.items.length} / ${part.total} ${isSub?'subtask':'worklog'}${isSub?'':` · Giờ đã tải: ${secondsLabel(sum)}${part.items.some(w=>w.timeSpentSeconds===null)?' (còn thời lượng chưa rõ)':''}`}`);
    stateBox.classList.toggle('is-error',!!part.error);
    if(part.limited&&!part.error)stateBox.textContent+=' · Đạt giới hạn tải. Mở Jira để xem tiếp.';
    $(isSub?'jiraSubtasksMoreBtn':'jiraWorklogsMoreBtn').hidden=!part.more||!!part.error;
  }
  async function loadPart(name,append=false){const ctx=detailContext;if(!ctx||!['subtasks','worklogs'].includes(name))return;
    return run(name==='subtasks'?'Đang tải subtask…':'Đang tải worklog…',async token=>{
      const part=ctx.parts[name];detailMessage();
      try{const data=await api('/api?'+new URLSearchParams({action:`jira-issue-${name}`,key:ctx.issue.key,startAt:String(append?part.next:0)}));if(token!==generation||ctx!==detailContext)return;
        part.items=[...new Map([...(append?part.items:[]),...data.items].map(x=>[name==='subtasks'?x.key:x.id,x])).values()];part.next=data.nextStartAt;part.total=data.total;part.more=data.hasMore;part.limited=data.limited;part.loaded=true;part.error='';
        const top=$('jiraDetailBody').scrollTop;renderPart(name);$('jiraDetailBody').scrollTop=top;
      }catch(e){if(token!==generation||ctx!==detailContext)return;part.error=e.message;renderPart(name);detailMessage(e.message,()=>loadPart(name,append));}
    });
  }
  function selectDetailTab(name,load=true){if(!detailContext)return;detailContext.tab=name;detailMessage();
    window.QuickJiraReading?.reset();
    for(const tab of ['description','subtasks','worklogs','files','comments']){const active=tab===name;$('jiraTab-'+tab).setAttribute('aria-selected',String(active));$('jiraTab-'+tab).tabIndex=active?0:-1;$('jiraPanel-'+tab).hidden=!active;}
    $('jiraDetailBody').scrollTop=0;
    if(name==='files'){if(load)void window.QuickJiraAttachments?.load();return;}
    if(name==='comments'){if(load)void window.QuickJiraActions?.loadComments();return;}
    if(name!=='description'){const part=detailContext.parts[name];if(load&&!part.loaded)void loadPart(name);else{renderPart(name);if(part.error)detailMessage(part.error,()=>loadPart(name));}}
  }
  async function prepareDetailLog(){const ctx=detailContext,token=generation;if(!ctx)return;
    const candidate=await run('Đang kiểm tra subtask để logwork…',async()=>{try{const data=await api('/api?action=subtasks');if(token!==generation||ctx!==detailContext)return;
      const found=data.issues.find(x=>x.key===ctx.issue.key);if(!found){$('jiraDetailLogBtn').disabled=true;detailMessage('Subtask không còn trong danh sách đủ điều kiện logwork.');return;}return found;
    }catch(e){if(token===generation)detailMessage(e.message,prepareDetailLog);}});
    if(candidate&&token===generation&&ctx===detailContext){peek.close();dialog.close();selectIssue(candidate,{focusTime:false});}
  }
  $('jiraSearchBtn').addEventListener('click',open);$('mobileJiraSearchBtn').addEventListener('click',open);
  $('jiraSearchCloseBtn').onclick=()=>dialog.close();$('jiraIssuePeekCloseBtn').onclick=()=>peek.close();
  peek.addEventListener('close',()=>{restoreList();clearDetail();});
  $('jiraDetailRefreshBtn').onclick=()=>detailContext&&openIssue(detailContext.issue.key,{replace:true});
  $('jiraDetailParentBtn').onclick=()=>detailContext?.issue.parent&&openIssue(detailContext.issue.parent);
  $('jiraDetailBackBtn').onclick=()=>detailStack.length&&openIssue(detailStack.at(-1),{back:true});
  $('jiraDetailRetryBtn').onclick=()=>detailRetry?.();$('jiraDetailLogBtn').onclick=prepareDetailLog;
  $('jiraDetailCreateSubBtn').onclick=()=>detailContext&&window.QuickJiraCreate?.open({parent:detailContext.issue});
  $('jiraSubtasksMoreBtn').onclick=()=>loadPart('subtasks',true);$('jiraWorklogsMoreBtn').onclick=()=>loadPart('worklogs',true);
  $('jiraSubtaskList').onclick=e=>{const button=e.target.closest('[data-jira-child]');if(button)void openIssue(button.dataset.jiraChild);};
  $('jiraDetailTabs').addEventListener('click',e=>{const button=e.target.closest('[data-jira-tab]');if(button)selectDetailTab(button.dataset.jiraTab);});
  $('jiraDetailTabs').addEventListener('keydown',e=>{const buttons=[...$('jiraDetailTabs').querySelectorAll('[role=tab]')],i=buttons.indexOf(document.activeElement),n=buttons.length;if(i<0)return;const index=e.key==='ArrowRight'?(i+1)%n:e.key==='ArrowLeft'?(i+n-1)%n:e.key==='Home'?0:e.key==='End'?n-1:-1;if(index<0)return;e.preventDefault();buttons[index].focus();selectDetailTab(buttons[index].dataset.jiraTab);});
  dialog.addEventListener('close',()=>{source?.focus({preventScroll:true});});
  for(const d of [dialog,peek]){d.addEventListener('keydown',e=>e.stopPropagation());d.addEventListener('cancel',e=>{if(QuickJiraBusy.active)e.preventDefault();});}
  $('jiraSearchForm').onsubmit=e=>{e.preventDefault();void search();};$('jiraSearchMoreBtn').onclick=()=>search(true);$('jiraSearchRetryBtn').onclick=()=>lastRetry?.();
  $('jiraTreeModeBtn').onclick=()=>changeMode('tree');
  $('jiraSearchModeBtn').onclick=()=>changeMode('search');$('jiraFilterModeBtn').onclick=()=>changeMode('filter');$('jiraSavedFindBtn').onclick=loadSavedFilters;$('jiraSavedRetryBtn').onclick=loadSavedFilters;
  $('jiraSavedForm').onsubmit=e=>{e.preventDefault();void search();};$('jiraSavedName').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();void loadSavedFilters();}};
  $('jiraSavedSelect').onchange=()=>{if(busy||QuickJiraBusy.active)return;$('jiraSavedId').value='';if($('jiraSavedSelect').value)return search();items=[];savedQuery=null;next=0;more=false;lastRetry=null;$('jiraSearchRetryBtn').hidden=true;$('jiraSearchScope').textContent='';renderItems();$('jiraSearchCount').textContent='Chọn filter';$('jiraSearchState').textContent='';};$('jiraSavedId').oninput=()=>{$('jiraSavedSelect').value='';changed();};
  $('jiraFilterReloadBtn').onclick=()=>search();
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
  return {login,logout,open,openIssue,openCreated:key=>openIssue(key),async refreshDetail(key,tab='description'){if(detailContext?.issue.key!==key)return;await openIssue(key,{replace:true});if(detailContext?.issue.key===key){const top=resultPane.scrollTop;items=items.map(x=>x.key===key?{...x,...detailContext.issue}:x);renderItems();resultPane.scrollTop=top;selectDetailTab(tab);}}};
})();
