'use strict';
window.QuickJiraActions=(()=>{
 const $=id=>document.getElementById(id),edit=$('jiraQuickEditDialog'),confirmDialog=$('jiraUpdateConfirmDialog');
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let ctx=null,busy=false,pending=null,owner='',receipts=new Map();
 function message(value='',uncertain=false){$('jiraActionNotice').textContent=value;$('jiraActionNotice').hidden=!value;$('jiraActionResolveBtn').hidden=!uncertain;}
 function clear(){ctx=null;pending=null;busy=false;if(edit.open)edit.close();if(confirmDialog.open)confirmDialog.close();$('jiraCommentText').value='';$('jiraCommentList').replaceChildren();$('jiraEditPeople').replaceChildren();$('jiraEditPersonQuery').value='';$('jiraQuickEditKey').textContent='';$('jiraEditState').textContent='';$('jiraEditPersonState').textContent='';$('jiraEditSelection').textContent='';$('jiraUpdateConfirmSummary').textContent='';$('jiraQuickEditForm').hidden=true;message();}
 function setIssue(issue){
  const current=String(state.user?.username||'').toLowerCase();if(owner!==current){owner=current;receipts.clear();}
  const draft=ctx?.key===issue.key?$('jiraCommentText').value:'';
  clear();$('jiraCommentText').value=draft;ctx={key:issue.key,options:null,people:[],person:undefined,comments:[],next:0,total:0,loaded:false,more:false,retry:null};
  $('jiraCommentForm').hidden=true;$('jiraCommentsState').textContent='';$('jiraCommentsMoreBtn').hidden=true;$('jiraCommentsRetryBtn').hidden=true;
  const receipt=receipts.get(ctx.key);if(receipt)message(receipt.message,receipt.uncertain);
 }
 async function run(label,work){if(!ctx||busy||QuickJiraBusy.active)return;busy=true;const current=ctx,release=QuickJiraBusy.begin(label);try{return await work(current);}finally{if(ctx===current)busy=false;release();}}
 const get=(action,extra={})=>api('/api?'+new URLSearchParams({action,key:ctx.key,...extra}));
 function receiptBlocks(){return !!receipts.get(ctx?.key)?.uncertain;}
 function syncEnabled(){const blocked=receiptBlocks();$('jiraCommentSendBtn').disabled=blocked;$('jiraEditSubmitBtn').disabled=blocked;}
 async function readOptions(current){const data=await get('jira-update-options');if(ctx!==current)return null;current.options=data;return data;}
 function renderEditor(){const o=ctx.options;
  $('jiraEditState').textContent=o.warnings.join(' ')||'Mỗi lần chỉ lưu một thông tin. Lựa chọn được lấy theo quyền hiện tại trên Jira.';
  $('jiraQuickEditForm').hidden=false;
  $('jiraEditTransition').innerHTML='<option value="">Chọn thao tác chuyển trạng thái</option>'+o.transitions.map(t=>`<option value="${esc(t.id)}">${esc(t.name)} → ${esc(t.to.name)}${t.supported?'':' · Cần bổ sung thông tin trên Jira'}</option>`).join('');
  $('jiraEditPriority').innerHTML='<option value="">Chọn độ ưu tiên</option>'+o.priorities.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  $('jiraEditPriority').value=o.current.priorityId;
  $('jiraEditKind').options[0].disabled=!o.transitions.length;$('jiraEditKind').options[1].disabled=!o.canAssign;$('jiraEditKind').options[2].disabled=!o.priorities.length;
  const chosen=[...$('jiraEditKind').options].find(x=>!x.disabled);if(chosen)$('jiraEditKind').value=chosen.value;
  $('jiraEditUnassignBtn').hidden=!o.canUnassign;ctx.person=undefined;$('jiraEditPeople').replaceChildren();$('jiraEditPersonQuery').value='';
  $('jiraEditPersonState').textContent='Hiện tại: '+(o.current.assignee?.displayName||o.current.assignee?.username||'Chưa được giao');
  if(!chosen){$('jiraQuickEditForm').hidden=true;$('jiraEditState').textContent+=' Không có thao tác cập nhật được hỗ trợ; mở Jira để xem thêm.';}
  kindChanged();syncEnabled();
 }
 async function openEditor(){if(!ctx||busy||QuickJiraBusy.active)return;$('jiraQuickEditKey').textContent=ctx.key;$('jiraQuickEditForm').hidden=true;$('jiraEditState').textContent='Đang tải lựa chọn…';if(!edit.open)edit.showModal();$('jiraQuickEditCloseBtn').focus({preventScroll:true});await reloadEditor();}
 async function reloadEditor(){await run('Đang đọc quyền cập nhật Jira…',async current=>{try{if(await readOptions(current))renderEditor();}catch(e){if(ctx===current)$('jiraEditState').textContent=e.message;}});}
 function kindChanged(){if(!ctx?.options)return;const kind=$('jiraEditKind').value;
  for(const [value,id]of [['transition','jiraEditTransitionGroup'],['assignee','jiraEditAssigneeGroup'],['priority','jiraEditPriorityGroup']])$(id).hidden=kind!==value;
  const t=ctx.options.transitions.find(x=>x.id===$('jiraEditTransition').value);
  $('jiraTransitionHint').textContent=t&&!t.supported?'Cần nhập thêm: '+t.required.map(x=>x.name).join(', ')+'. Hãy mở Jira để thực hiện transition này.':'Chỉ áp dụng thao tác đang được workflow cho phép.';
  $('jiraEditSelection').textContent=kind==='assignee'&&ctx.person!==undefined?'Sẽ giao cho: '+(ctx.person===null?'Chưa được giao':ctx.person.displayName+' ('+ctx.person.username+')'):'';
 }
 async function findPeople(){const q=$('jiraEditPersonQuery').value.trim();if(q.length<2){$('jiraEditPersonState').textContent='Nhập ít nhất 2 ký tự.';return;}
  await run('Đang tìm người có thể nhận công việc…',async current=>{try{const data=await get('jira-update-users',{q});if(ctx!==current)return;current.people=data.users;$('jiraEditPeople').replaceChildren();$('jiraEditPersonState').textContent=data.users.length?'Chọn người phụ trách. Nếu chưa thấy, nhập tên cụ thể hơn (tối đa 50 kết quả).':'Không tìm thấy người phù hợp có thể được giao công việc này.';
   for(const person of data.users){const b=document.createElement('button');b.type='button';b.className='jira-person-option';b.textContent=person.displayName+' · '+person.username;b.onclick=()=>{ctx.person=person;kindChanged();};$('jiraEditPeople').append(b);}
  }catch(e){if(ctx===current)$('jiraEditPersonState').textContent=e.message;}});
 }
 function dateLabel(value){const d=new Date(value);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(d);}
 function renderComments(){
  $('jiraCommentList').innerHTML=ctx.comments.map(c=>`<article class="jira-worklog"><div class="jira-worklog-head"><strong>${esc(c.author.displayName||c.author.username||'Người dùng Jira')}</strong><span>${esc(dateLabel(c.created))}</span></div><div class="jira-content">${QuickJiraContent.render(c.body.text)}</div>${c.body.truncated?'<p class="jira-search-note">Nội dung đã rút gọn, mở Jira để xem đầy đủ.</p>':''}</article>`).join('');
  $('jiraCommentsState').textContent=ctx.comments.length?`${ctx.comments.length} / ${ctx.total} bình luận · Mới nhất trước`:'Chưa có bình luận được Jira trả về.';
  $('jiraCommentsMoreBtn').hidden=!ctx.more;$('jiraCommentForm').hidden=!ctx.options?.canComment;syncEnabled();
 }
 async function loadComments(append=false,force=false){if(!ctx||ctx.loaded&&!append&&!force)return;
  await run('Đang tải bình luận Jira…',async current=>{const top=$('jiraDetailBody').scrollTop;$('jiraCommentsRetryBtn').hidden=true;
   try{const data=await get('jira-comments',{startAt:String(append?current.next:0)});if(ctx!==current)return;
    current.comments=[...new Map([...(append?current.comments:[]),...data.items].map(c=>[c.id,c])).values()];current.next=data.nextStartAt;current.total=data.total;current.more=data.hasMore;current.loaded=true;renderComments();$('jiraDetailBody').scrollTop=top;
    try{if(!current.options)await readOptions(current);if(ctx===current){$('jiraCommentForm').hidden=!current.options?.canComment;if(!current.options?.canComment)$('jiraCommentsState').textContent+=' · Không có quyền gửi bình luận hoặc chưa đọc được quyền.';syncEnabled();}}
    catch(e){if(ctx===current){$('jiraCommentsState').textContent+=' · '+e.message;current.retry=()=>loadComments(false,true);$('jiraCommentsRetryBtn').hidden=false;}}
   }catch(e){if(ctx===current){$('jiraCommentsState').textContent=e.message;current.retry=()=>loadComments(append,true);$('jiraCommentsRetryBtn').hidden=false;}}
  });
 }
 function review(kind,value,label){if(!ctx?.options||receiptBlocks())return;const o=ctx.options;
  pending={key:ctx.key,kind,value,expectedUpdated:o.updated,requestId:crypto.randomUUID()};
  $('jiraUpdateConfirmSummary').textContent=ctx.key+'\n\n'+label;confirmDialog.showModal();$('jiraUpdateCancelBtn').focus({preventScroll:true});
 }
 function reviewEdit(e){e.preventDefault();if(!ctx?.options)return;const kind=$('jiraEditKind').value,o=ctx.options;
  if(kind==='transition'){const t=o.transitions.find(x=>x.id===$('jiraEditTransition').value);if(!t)return $('jiraEditState').textContent='Hãy chọn thao tác chuyển trạng thái.';if(!t.supported)return $('jiraEditState').textContent='Transition cần bổ sung '+t.required.map(x=>x.name).join(', ')+'. Mở Jira để hoàn tất.';review(kind,t.id,`Chuyển trạng thái: ${t.name} → ${t.to.name}`);}
  if(kind==='priority'){const p=o.priorities.find(x=>x.id===$('jiraEditPriority').value);if(!p||p.id===o.current.priorityId)return $('jiraEditState').textContent='Hãy chọn độ ưu tiên mới.';review(kind,p.id,'Độ ưu tiên mới: '+p.name);}
  if(kind==='assignee'){if(ctx.person===undefined)return $('jiraEditState').textContent='Hãy tìm và chọn người phụ trách.';const p=ctx.person;if((p?.username||null)===(o.current.assignee?.username||null))return $('jiraEditState').textContent='Người phụ trách chưa thay đổi.';review(kind,p?.username??null,'Người phụ trách mới: '+(p?p.displayName+' ('+p.username+')':'Chưa được giao'));}
 }
 async function submit(){if(!pending||busy||QuickJiraBusy.active)return;const payload=pending,current=ctx;if(!current||payload.key!==current.key)return;pending=null;confirmDialog.close();let confirmed=false;
  await run('Đang lưu và đối chiếu trên Jira…',async captured=>{
   try{const result=await api('/api?action=jira-update',{method:'POST',body:JSON.stringify(payload)});if(ctx!==captured)return;
    const uncertain=['unknown','accepted_unverified'].includes(result.outcome);receipts.set(captured.key,{message:result.message,uncertain});message(result.message,uncertain);syncEnabled();
    if(result.outcome==='confirmed'){confirmed=true;if(payload.kind==='comment')$('jiraCommentText').value='';if(edit.open)edit.close();showToast(result.message);}
    else{if(edit.open)$('jiraEditState').textContent=result.message;showToast(result.message);}
   }catch(e){if(ctx!==captured)return;
    const uncertain=e.code==='RESULT_UNKNOWN'||e.code!=='NOT_SENT'&&(!e.status||e.status>=500),messageText=uncertain?'Chưa xác định kết quả gửi. Kiểm tra Jira trước khi gửi yêu cầu mới.':e.message;
    if(uncertain)receipts.set(captured.key,{message:messageText,uncertain:true});message(messageText,uncertain);$('jiraEditState').textContent=messageText;syncEnabled();showToast(messageText);
   }
  });
  if(confirmed&&ctx===current)await window.QuickJiraSearch?.refreshDetail(payload.key,payload.kind==='comment'?'comments':'description');
 }
 $('jiraDetailUpdateBtn').onclick=openEditor;$('jiraQuickEditCloseBtn').onclick=()=>edit.close();$('jiraEditReloadBtn').onclick=reloadEditor;
 $('jiraEditKind').onchange=kindChanged;$('jiraEditTransition').onchange=kindChanged;$('jiraEditPersonFindBtn').onclick=findPeople;$('jiraQuickEditForm').onsubmit=reviewEdit;
 $('jiraEditPersonQuery').addEventListener('input',()=>{if(ctx)ctx.person=undefined;kindChanged();});
 $('jiraEditPersonQuery').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void findPeople();}});
 $('jiraEditUnassignBtn').onclick=()=>{ctx.person=null;kindChanged();};
 $('jiraCommentForm').onsubmit=e=>{e.preventDefault();const value=$('jiraCommentText').value.trim();if(!value)return;review('comment',value,'Gửi bình luận:\n'+value);};
 $('jiraCommentsMoreBtn').onclick=()=>loadComments(true);$('jiraCommentsRetryBtn').onclick=()=>ctx?.retry?.();
 $('jiraUpdateCancelBtn').onclick=()=>confirmDialog.close();$('jiraUpdateConfirmBtn').onclick=submit;confirmDialog.addEventListener('close',()=>{pending=null;});
 $('jiraActionResolveBtn').onclick=()=>{if(!ctx)return;receipts.delete(ctx.key);message('Đã mở lại thao tác. Chỉ gửi yêu cầu mới sau khi đã kiểm tra kết quả trên Jira.');syncEnabled();};
 for(const d of [edit,confirmDialog]){d.addEventListener('keydown',e=>e.stopPropagation());d.addEventListener('cancel',e=>{if(busy||QuickJiraBusy.active)e.preventDefault();});}
 return {setIssue,clear,loadComments};
})();
