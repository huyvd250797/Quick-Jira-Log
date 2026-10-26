'use strict';
window.QuickJiraCreate=(()=>{
 const $=id=>document.getElementById(id),dialog=$('jiraCreateDialog'),confirmation=$('jiraCreateConfirmDialog');
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let ctx=null,busy=false,pending=null,source=null;
 const user=()=>String(state.user?.username||'').toLowerCase();
 const info=message=>$('jiraCreateState').textContent=message;
 let projectIndex=-1,projectMatches=[];
 const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function closeProjects(){projectMatches=[];projectIndex=-1;$('jiraCreateProjectSuggestions').replaceChildren();$('jiraCreateProjectSuggestions').hidden=true;$('jiraCreateProjectQuery').setAttribute('aria-expanded','false');$('jiraCreateProjectQuery').removeAttribute('aria-activedescendant');}
 function suggestProjects(){if(!ctx||ctx.presetParent||ctx.presetEpic)return;const input=$('jiraCreateProjectQuery'),q=fold(input.value.trim());ctx.projectQueryDirty=!!q&&q!==fold(ctx.project);closeProjects();if(!q){$('jiraCreateProjectHint').textContent='';return;}
  projectMatches=(ctx.projects||[]).filter(p=>fold(p.key).includes(q)||fold(p.name).includes(q)).sort((a,b)=>(fold(b.key).startsWith(q)?1:0)-(fold(a.key).startsWith(q)?1:0)||a.key.localeCompare(b.key)).slice(0,12);
  $('jiraCreateProjectHint').textContent=projectMatches.length?'':'Không có dự án phù hợp trong danh sách. Kiểm tra mã hoặc tải lại dự án.';
  if(!projectMatches.length)return;const list=$('jiraCreateProjectSuggestions');list.innerHTML=projectMatches.map((p,i)=>`<button id="jira-project-option-${i}" type="button" role="option" aria-selected="false" tabindex="-1" data-project-index="${i}"><strong>${esc(p.key)}</strong><span>${esc(p.name)}</span></button>`).join('');list.hidden=false;input.setAttribute('aria-expanded','true');
 }
 async function selectProject(item){if(!ctx||busy||QuickJiraBusy.active||ctx.presetParent||ctx.presetEpic||!item)return;closeProjects();ctx.projectQueryDirty=false;$('jiraCreateProjectQuery').value=item.key;$('jiraCreateProjectQuery').blur();$('jiraCreateProject').value=item.key;$('jiraCreateProjectSelect').value=item.key;$('jiraCreateProjectHint').textContent='';await loadTypes();}
 function errorInfo(message){info(message);$('jiraCreateState').scrollIntoView?.({block:'nearest'});}
 function reset(){ctx=null;busy=false;pending=null;if(confirmation.open)confirmation.close();if(dialog.open)dialog.close();
  window.QuickJiraEditor?.clear();
  closeProjects();$('jiraCreateProjectQuery').value='';$('jiraCreateProjectHint').textContent='';
  for(const id of ['jiraCreateFields','jiraCreateParents','jiraCreateProjects','jiraCreatePreview'])$(id).replaceChildren();
  for(const id of ['jiraCreateParentQuery','jiraCreateProject'])$(id).value='';
  $('jiraCreateProjectSelect').innerHTML='<option value="">Chọn dự án</option>';$('jiraCreateManualProject').open=false;$('jiraCreateReviewBtn').disabled=true;$('jiraCreateParentQuery').readOnly=false;$('jiraCreateParentFindBtn').hidden=false;$('jiraCreateProjectSelect').disabled=false;$('jiraCreateManualProject').hidden=false;$('jiraCreateEmpty').hidden=false;$('jiraCreateFooter').hidden=false;
  $('jiraCreateType').innerHTML='<option value="">Chọn dự án trước</option>';$('jiraCreateForm').hidden=true;$('jiraCreateParentGroup').hidden=true;$('jiraCreateReceipt').hidden=true;$('jiraCreateContent').hidden=false;
  $('jiraCreateReceiptText').textContent='';$('jiraCreateReceiptLink').removeAttribute('href');$('jiraCreateParentState').textContent='';$('jiraCreateUnsupported').textContent='';info('');
 }
 async function run(label,work){if(!ctx||busy||QuickJiraBusy.active)return;busy=true;const current=ctx,release=QuickJiraBusy.begin(label);try{return await work(current);}finally{if(ctx===current)busy=false;release();}}
 function get(action,query={}){return api('/api?'+new URLSearchParams({action,...query}));}
 async function loadProjects(){return run('Đang tải dự án Jira…',async current=>{
  $('jiraCreateProjectsRetryBtn').hidden=true;
  try{const data=await get('jira-create-projects');if(ctx!==current)return;current.projects=data.projects;$('jiraCreateProjects').innerHTML=data.projects.map(p=>`<option value="${esc(p.key)}" label="${esc(p.name)}"></option>`).join('');$('jiraCreateProjectSelect').innerHTML='<option value="">Chọn dự án</option>'+data.projects.map(p=>`<option value="${esc(p.key)}">${esc(p.key)} · ${esc(p.name)}</option>`).join('');$('jiraCreateProjectSelect').value=current.project;info(data.truncated?'Có thể nhập mã dự án nếu chưa thấy trong danh sách.':'');}
  catch(e){if(ctx===current){info(e.message+' Có thể nhập mã dự án trực tiếp.');$('jiraCreateManualProject').open=true;$('jiraCreateProjectsRetryBtn').hidden=false;}}
 });}
 function clearSchema(){window.QuickJiraEditor?.clear();ctx.meta=null;ctx.parent=null;ctx.person=null;$('jiraCreateFields').replaceChildren();$('jiraCreateParents').replaceChildren();$('jiraCreateForm').hidden=true;$('jiraCreateParentGroup').hidden=true;$('jiraCreateParentState').textContent='';$('jiraCreateMetaRetryBtn').hidden=true;$('jiraCreateReviewBtn').disabled=true;$('jiraCreateParentQuery').readOnly=false;$('jiraCreateParentFindBtn').hidden=false;$('jiraCreateProjectSelect').disabled=!!(ctx.presetParent||ctx.presetEpic);$('jiraCreateManualProject').hidden=!!(ctx.presetParent||ctx.presetEpic);$('jiraCreateEmpty').hidden=false;}
 async function loadTypes(){if(!ctx||busy||QuickJiraBusy.active||ctx.receipt)return;
  const p=$('jiraCreateProject').value.trim().toUpperCase();$('jiraCreateProject').value=p;
  if(!/^[A-Z][A-Z0-9_]*$/.test(p)){info('Chọn hoặc nhập mã dự án hợp lệ.');return;}
  closeProjects();clearSchema();ctx.project=p;ctx.projectQueryDirty=false;$('jiraCreateProjectQuery').value=p;ctx.types=[];$('jiraCreateType').innerHTML='<option value="">Đang tải loại công việc…</option>';
  await run('Đang đọc loại công việc được phép tạo…',async current=>{try{
   const data=await get('jira-create-types',{project:p});if(ctx!==current)return;current.types=current.presetParent?data.types.filter(t=>t.subtask):current.presetEpic?data.types.filter(t=>!t.subtask&&!/^epic$/i.test(t.name)):data.types;
   $('jiraCreateType').innerHTML='<option value="">Chọn loại công việc</option>'+current.types.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}${t.subtask&&!/sub.?task/i.test(t.name)?' · Công việc con':''}</option>`).join('');
   if(![...$('jiraCreateProjectSelect').options].some(o=>o.value===p))$('jiraCreateProjectSelect').innerHTML+=`<option value="${esc(p)}">${esc(p)}</option>`;
   $('jiraCreateProjectSelect').value=p;info(data.types.length?'':'Dự án không có loại công việc được phép tạo.');
  }catch(e){if(ctx===current){$('jiraCreateType').innerHTML='<option value="">Chưa tải được loại công việc</option>';info(e.message);}}});
 }
 function inputHtml(field){const id='jcf-'+field.id,required=field.required&&!field.hasDefault?' required':'',base=`id="${esc(id)}" data-create-field="${esc(field.id)}"${required}`;
  if(field.kind==='reporter')return `<div class="jira-action-find"><input ${base} type="text" value="${esc(ctx.meta.reporterUsername)}" readonly>${ctx.meta.canModifyReporter?'<button id="jiraCreateReporterToggle" type="button" class="secondary">Đổi</button>':''}</div>${ctx.meta.canModifyReporter?'<div id="jiraCreateReporterPicker" hidden><div class="jira-action-find"><input id="jiraCreateReporterQuery" type="search" maxlength="255" placeholder="Tên hoặc username"><button id="jiraCreateReporterFind" type="button" class="primary">Tìm</button></div><p id="jiraCreateReporterState" class="jira-search-note" role="status"></p><div id="jiraCreateReporters"></div></div>':''}`;
  if(field.kind==='estimate')return `<input ${base} type="text" maxlength="100" placeholder="Ví dụ 2h 30m"><small class="jira-search-note">1d = 8h · 1w = 40h</small>`;
  if(field.kind==='assignee')return `<div class="jira-action-find"><input id="jiraCreateUserQuery" type="search" maxlength="255" autocomplete="off" placeholder="Họ tên hoặc username"><button id="jiraCreateUserFindBtn" class="primary" type="button">Tìm</button></div><p id="jiraCreateUserState" class="jira-search-note">Chưa chọn: dùng cấu hình mặc định Jira nếu có.</p><div id="jiraCreateUsers"></div><button id="jiraCreateAssignMeBtn" class="text-btn jira-assign-me" type="button" title="Assign to me" aria-label="Giao cho tôi"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="3"/><path d="M3 20v-2a6 6 0 0 1 10-4M15 18l3 3 4-6"/></svg><span class="jira-assign-me-label">Assign to me</span></button><button id="jiraCreateUserClearBtn" class="text-btn" type="button">Bỏ lựa chọn</button>`;
  if(['select','multi','boolean'].includes(field.kind))return `<select ${base}${field.kind==='multi'?' multiple size="4"':''}><option value="">${field.hasDefault?'Dùng mặc định Jira':'Chọn giá trị'}</option>${field.kind==='boolean'?'<option value="true">Có</option><option value="false">Không</option>':field.options.map(o=>`<option value="${esc(o.id)}">${esc(o.label)}</option>`).join('')}</select>`;
  if(field.kind==='textarea')return `<textarea ${base} rows="4" maxlength="20000"></textarea>`;
  const type={number:'number',date:'date',datetime:'datetime-local',url:'url'}[field.kind]||'text';
  return `<input ${base} type="${type}"${type==='number'?' step="any"':''} maxlength="${field.id==='summary'?255:1000}"${field.kind==='labels'?' placeholder="Các nhãn cách nhau bằng dấu phẩy"':''}>`;
 }
 function renderFields(){const meta=ctx.meta,rank=f=>f.id==='summary'?0:/sub.?task.?type/i.test(f.label)?1:f.kind==='reporter'?2:f.kind==='assignee'?3:f.kind==='estimate'?4:f.id==='description'?5:6,visible=meta.fields.filter(f=>f.kind!=='unsupported'&&f.id!==meta.epic?.field).sort((a,b)=>rank(a)-rank(b));
  $('jiraCreateFields').innerHTML=visible.map(f=>`<div class="jira-create-field"><label for="${f.kind==='assignee'?'jiraCreateUserQuery':'jcf-'+esc(f.id)}">${esc(f.label)}${f.required?' *':''}</label>${inputHtml(f)}${f.hasDefault?'<p class="jira-search-note">Để trống để Jira áp dụng giá trị mặc định.</p>':''}${f.kind==='multi'?'<p class="jira-search-note">Có thể chọn nhiều giá trị.</p>':''}</div>`).join('');
  const unsupported=meta.fields.filter(f=>f.kind==='unsupported');$('jiraCreateUnsupported').textContent=unsupported.length?'Trường chưa hỗ trợ nhập trong app: '+unsupported.map(f=>f.label+(f.hasDefault?' (dùng mặc định Jira)':'')).join(', ')+'.':'';
  $('jiraCreateForm').hidden=false;$('jiraCreateParentGroup').hidden=!meta.type.subtask;
  if(meta.fields.some(f=>f.id==='description'&&f.kind==='textarea'))window.QuickJiraEditor?.mount($('jcf-description'));
  $('jiraCreateEmpty').hidden=true;
  $('jiraCreateReviewBtn').disabled=!!meta.blocked.length;
  if($('jiraCreateReporterToggle')){
   $('jiraCreateReporterToggle').onclick=()=>{$('jiraCreateReporterPicker').hidden=!$('jiraCreateReporterPicker').hidden;};
   $('jiraCreateReporterFind').onclick=()=>run('Đang tìm Reporter…',async current=>{const q=$('jiraCreateReporterQuery').value.trim();if(q.length<2){$('jiraCreateReporterState').textContent='Nhập ít nhất 2 ký tự.';return;}try{const data=await get('jira-create-reporters',{project:current.project,q});if(ctx!==current)return;$('jiraCreateReporters').replaceChildren();$('jiraCreateReporterState').textContent=data.users.length?'Chọn Reporter':'Không tìm thấy nhân sự.';for(const person of data.users){const button=document.createElement('button');button.type='button';button.className='jira-person-option';button.textContent=person.displayName+' · '+person.username;button.onclick=()=>{$('jcf-'+meta.fields.find(f=>f.kind==='reporter').id).value=person.username;$('jiraCreateReporterPicker').hidden=true;};$('jiraCreateReporters').append(button);}}catch(e){if(ctx===current)$('jiraCreateReporterState').textContent=e.message;}});
  }
  info(meta.blocked.length?'Cần xử lý trường bắt buộc trên Jira: '+meta.blocked.map(f=>f.label).join(', ')+'.':'');
  if($('jiraCreateUserFindBtn')){
   $('jiraCreateUserFindBtn').disabled=!meta.canAssign;$('jiraCreateUserQuery').disabled=!meta.canAssign;
   $('jiraCreateAssignMeBtn').disabled=!meta.canAssign;$('jiraCreateAssignMeBtn').onclick=()=>{if(!ctx||!meta.canAssign)return;ctx.person={username:meta.reporterUsername,displayName:state.user?.displayName||meta.reporterUsername};$('jiraCreateUserQuery').value=meta.reporterUsername;$('jiraCreateUserState').textContent='Đã chọn '+ctx.person.displayName;$('jiraCreateUsers').replaceChildren();};
   $('jiraCreateUserFindBtn').onclick=findUsers;$('jiraCreateUserQuery').addEventListener('input',()=>{ctx.person=null;$('jiraCreateUserState').textContent='Hãy bấm Tìm và chọn người từ kết quả.';});
   $('jiraCreateUserQuery').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void findUsers();}});
   $('jiraCreateUserClearBtn').onclick=()=>{ctx.person=null;$('jiraCreateUserQuery').value='';$('jiraCreateUserState').textContent='Chưa chọn: dùng mặc định Jira nếu có.';};
  }
 }
 async function loadMeta(){if(!ctx||busy||QuickJiraBusy.active||ctx.receipt)return;const id=$('jiraCreateType').value;
  if(ctx.presetParent)return loadSubtaskContext(id);
  clearSchema();if(!id)return;const currentProject=$('jiraCreateProject').value.trim().toUpperCase();if(currentProject!==ctx.project){info('Mã dự án đã đổi. Hãy tải lại loại công việc.');return;}
  await run('Đang tải trường bắt buộc từ Jira…',async current=>{try{const data=await get('jira-create-meta',{project:current.project,type:id,...(current.presetEpic?{epic:current.presetEpic.key}:{})});if(ctx!==current)return;if(current.presetEpic&&data.epic?.key!==current.presetEpic.key)throw Error('Jira trả form không đúng Epic đã chọn. Hãy tải lại.');current.meta=data;renderFields();}
   catch(e){if(ctx===current){info(e.message);$('jiraCreateMetaRetryBtn').hidden=false;}}});
  if(ctx?.meta?.type.subtask&&ctx.presetParent?.project.key===ctx.project){const current=ctx;await run('Đang kiểm tra công việc cha…',async captured=>{try{const data=await get('jira-create-parents',{project:captured.project,key:captured.presetParent.key});if(ctx===captured)chooseParent(data.items[0]);}catch(e){if(ctx===captured)$('jiraCreateParentState').textContent=e.message;}});}
 }
 async function loadSubtaskContext(type=''){
  if(!ctx?.presetParent||busy||QuickJiraBusy.active||ctx.receipt)return;
  clearSchema();await run('Đang chuẩn bị Subtask cho '+ctx.presetParent.key+'…',async current=>{
   try{
    const data=await get('jira-create-subtask-context',{key:current.presetParent.key,...(type?{type}:{})});if(ctx!==current)return;
    if(!data.parent||data.parent.key!==current.presetParent.key||data.parent.issueType?.subtask||!data.meta?.type?.subtask||data.meta.project!==data.parent.project.key)throw Error('Jira trả form không đúng công việc cha. Hãy tải lại.');
    current.presetParent=data.parent;current.project=data.parent.project.key;current.types=data.types;current.meta=data.meta;
    $('jiraCreateProject').value=current.project;$('jiraCreateProjectSelect').innerHTML=`<option value="${esc(current.project)}">${esc(current.project)} · ${esc(data.parent.project.name||'')}</option>`;$('jiraCreateProjectSelect').value=current.project;
    $('jiraCreateType').innerHTML=data.types.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');$('jiraCreateType').value=data.meta.type.id;
    renderFields();chooseParent(data.parent);$('jiraCreateMetaRetryBtn').hidden=true;
   }catch(e){if(ctx===current){errorInfo(e.message);$('jiraCreateMetaRetryBtn').hidden=false;}}
  });
 }
 function chooseParent(item){if(!item)return;if(ctx.presetParent&&item.key!==ctx.presetParent.key)return;ctx.parent=item;$('jiraCreateParentState').textContent='Đã chọn '+item.key+' · '+item.summary;$('jiraCreateParents').replaceChildren();$('jiraCreateParentQuery').value=item.key;$('jiraCreateParentQuery').readOnly=!!(ctx.presetParent||ctx.presetEpic);$('jiraCreateParentFindBtn').hidden=!!(ctx.presetParent||ctx.presetEpic);}
 async function findParents(){if(!ctx?.meta)return;const q=$('jiraCreateParentQuery').value.trim();if(q.length<2){$('jiraCreateParentState').textContent='Nhập ít nhất 2 ký tự.';return;}
  await run('Đang tìm công việc cha…',async current=>{try{const data=await get('jira-create-parents',{project:current.project,q});if(ctx!==current)return;$('jiraCreateParents').replaceChildren();$('jiraCreateParentState').textContent=data.items.length?'Chọn công việc cha (tối đa 25 kết quả; nhập cụ thể hơn nếu cần).':'Không tìm thấy công việc cha phù hợp cùng dự án.';
   for(const item of data.items){const button=document.createElement('button');button.type='button';button.className='jira-subtask';button.textContent=item.key+' · '+item.summary;if(window.QuickJiraIssueIcons)button.prepend(window.QuickJiraIssueIcons.create(item));button.onclick=()=>chooseParent(item);$('jiraCreateParents').append(button);}
  }catch(e){if(ctx===current)$('jiraCreateParentState').textContent=e.message;}});
 }
 async function findUsers(){const q=$('jiraCreateUserQuery').value.trim();if(q.length<2){$('jiraCreateUserState').textContent='Nhập ít nhất 2 ký tự.';return;}
  await run('Đang tìm người có thể nhận công việc…',async current=>{try{const data=await get('jira-create-users',{project:current.project,q});if(ctx!==current)return;$('jiraCreateUsers').replaceChildren();$('jiraCreateUserState').textContent=data.users.length?'Chọn nhân sự (tối đa 50 kết quả).':'Không tìm thấy nhân sự phù hợp.';
   for(const person of data.users){const button=document.createElement('button');button.type='button';button.className='jira-person-option';button.textContent=person.displayName+' · '+person.username;button.onclick=()=>{ctx.person=person;$('jiraCreateUserState').textContent='Đã chọn '+person.displayName+' ('+person.username+')';$('jiraCreateUsers').replaceChildren();};$('jiraCreateUsers').append(button);}
  }catch(e){if(ctx===current)$('jiraCreateUserState').textContent=e.message;}});
 }
 function values(){const fields={},labels=[];for(const f of ctx.meta.fields){if(f.kind==='unsupported'||f.id===ctx.meta.epic?.field)continue;let v;
   if(f.kind==='assignee')v=ctx.person?.username;
   else{const node=$('jcf-'+f.id);v=node.value;if(f.kind==='multi')v=[...node.selectedOptions].map(o=>o.value).filter(Boolean);else if(f.kind==='labels')v=[...new Set(v.split(',').map(x=>x.trim()).filter(Boolean))];else if(f.kind==='number'&&v!=='')v=Number(v);else if(f.kind==='boolean'&&v!=='')v=v==='true';else if(f.kind==='datetime'&&v){const date=new Date(v);if(Number.isNaN(date.getTime()))throw Error('Ngày giờ không hợp lệ: '+f.label);v=date.toISOString();}}
   const empty=v===undefined||v===''||Array.isArray(v)&&!v.length;
   if(empty){if(f.required&&!f.hasDefault)throw Error('Cần nhập '+f.label+'.');continue;}
   fields[f.id]=v;
   let display=f.kind==='assignee'?ctx.person.displayName+' ('+v+')':['select','multi'].includes(f.kind)?(Array.isArray(v)?v:[v]).map(id=>f.options.find(o=>o.id===id)?.label||id).join(', '):typeof v==='boolean'?v?'Có':'Không':Array.isArray(v)?v.join(', '):String(v);
   labels.push([f.label,display]);
  }return {fields,labels};
 }
 function review(e){e.preventDefault();if(!ctx?.meta||ctx.receipt||busy||QuickJiraBusy.active||ctx.meta.blocked.length)return;
  if(ctx.projectQueryDirty){errorInfo('Chọn dự án trong gợi ý, hoặc xóa nội dung tìm dự án để dùng dự án đang chọn.');return;}
  try{if(ctx.project!==$('jiraCreateProject').value.trim().toUpperCase()||ctx.meta.type.id!==$('jiraCreateType').value)throw Error('Dự án hoặc loại đã đổi. Hãy tải lại form.');if(ctx.meta.type.subtask&&!ctx.parent)throw Error('Hãy tìm và chọn công việc cha.');
   window.QuickJiraEditor?.flush();const {fields,labels}=values();if(!fields.summary?.trim())throw Error('Cần nhập tiêu đề công việc.');
   ctx.imageBatch=window.QuickJiraEditor?.batch($('jcf-description'))||[];ctx.fullDescription=fields.description||'';
   pending={project:ctx.project,type:ctx.meta.type.id,...(ctx.presetEpic?{epic:ctx.presetEpic.key}:{}),parent:ctx.meta.type.subtask?ctx.parent.key:'',revision:ctx.meta.revision,fields,requestId:crypto.randomUUID()};
   if(ctx.imageBatch.length)pending.fields={...fields,description:QuickJiraEditorImages.withoutPending(ctx.fullDescription,ctx.imageBatch)};
   const lines=[['Dự án',ctx.project],['Loại',ctx.meta.type.name],...(ctx.presetEpic?[['Epic',ctx.presetEpic.key]]:[]),...(pending.parent?[['Công việc cha',pending.parent]]:[]),...labels];
   $('jiraCreatePreview').innerHTML='<dl>'+lines.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')+'</dl>'+(fields.description&&window.QuickJiraContent?'<section class="jira-create-description-preview"><h3>Xem trước mô tả</h3><div class="jira-content">'+QuickJiraEditor.render($('jcf-description'),fields.description)+'</div></section>':'');
   confirmation.showModal();$('jiraCreateCancelBtn').focus({preventScroll:true});
  }catch(e){errorInfo(e.message);}
 }
 function receipt(result){if(result.outcome==='confirmed')window.QuickJiraTree?.created(ctx?.presetEpic?.key||ctx?.parent?.key||ctx?.presetParent?.key);ctx.receipt=result;$('jiraCreateContent').hidden=true;$('jiraCreateReceipt').hidden=false;$('jiraCreateReceiptText').textContent=result.message;$('jiraCreateFooter').hidden=true;
  const valid=/^[A-Z][A-Z0-9_]*-\d+$/.test(result.key||'');$('jiraCreateOpenBtn').hidden=!valid;$('jiraCreateReceiptLink').hidden=!valid;if(valid)$('jiraCreateReceiptLink').href='https://task.ascvn.com.vn/browse/'+encodeURIComponent(result.key);
  $('jiraCreateCheckedBtn').hidden=result.outcome==='confirmed';$('jiraCreateAnotherBtn').hidden=result.outcome!=='confirmed';const incomplete=ctx.imageJob&&!ctx.imageJob.done;$('jiraCreateImagesRetryBtn').hidden=!incomplete;$('jiraCreateImagesCheckBtn').hidden=!(incomplete&&(ctx.imageJob.finalizeUnknown||ctx.imageJob.batch.some(i=>i.status==='unknown')));info('');
 }
 async function submit(){if(!pending||!ctx||ctx.receipt||busy||QuickJiraBusy.active)return;const body=pending,current=ctx;pending=null;confirmation.close();let openKey='';
  await run('Đang tạo công việc và đối chiếu Jira…',async captured=>{try{
   const data=await api('/api?action=jira-create',{method:'POST',body:JSON.stringify(body)});if(ctx!==captured)return;
   if(['confirmed','unknown','accepted_unverified'].includes(data.outcome)){if(data.outcome==='confirmed'&&captured.imageBatch?.length){captured.imageJob={key:data.key,batch:captured.imageBatch,description:captured.fullDescription,initialDescription:body.fields.description.trim(),requestId:crypto.randomUUID()};try{await QuickJiraEditorImages.finishCreated(captured.imageJob);if(ctx!==captured)return;data.message='Đã tạo '+data.key+', đính kèm ảnh và hoàn thiện mô tả.';}catch(e){if(ctx===captured)receipt({...data,message:'Đã tạo '+data.key+'. '+e.message});return;}}receipt(data);showToast(data.message);if(data.outcome==='confirmed')openKey=data.key;}
   else errorInfo(data.message||'Jira từ chối tạo. Kiểm tra lại form.');
  }catch(e){if(ctx!==captured)return;const uncertain=e.code==='RESULT_UNKNOWN'||e.code!=='NOT_SENT'&&(!e.status||e.status>=500);if(uncertain)receipt({outcome:'unknown',message:'Chưa xác định kết quả gửi. Kiểm tra Jira trước khi tạo yêu cầu mới.'});else errorInfo(e.message+(e.status===409?' Bấm tải lại form để cập nhật cấu hình.':''));}});
  if(ctx===current&&openKey){dialog.close();await window.QuickJiraSearch?.openCreated(openKey);}
 }
 async function open({parent=null,epic=null}={}){if(!user()||busy||QuickJiraBusy.active)return;
  if((parent||epic)&&ctx?.imageJob&&!ctx.imageJob.done&&!window.confirm('Công việc '+ctx.imageJob.key+' đã tạo nhưng còn ảnh chưa hoàn tất. Bỏ phần ảnh đang chờ để tạo Subtask khác?'))return;
  if(parent&&ctx&&!ctx.receipt&&ctx.meta&&!window.confirm('Thay bản nháp đang nhập bằng form Subtask cho '+parent.key+'?'))return;
  if(ctx?.owner!==user())reset();
  if(ctx?.receipt&&(parent||epic)){if(ctx.receipt.outcome!=='confirmed'&&!window.confirm('Lần tạo trước chưa xác định đầy đủ kết quả. Boss đã kiểm tra Jira và muốn mở form Subtask mới?'))return;reset();}
  if(epic&&ctx&&!ctx.receipt&&ctx.meta&&!window.confirm('Thay bản nháp đang nhập bằng công việc trong '+epic.key+'?'))return;
  if(parent||epic)reset();source=document.activeElement;
  const fresh=!ctx;if(fresh)ctx={owner:user(),project:'',types:[],meta:null,parent:null,person:null,presetParent:parent,presetEpic:epic,receipt:null};
  dialog.classList?.toggle('jira-preset-parent',!!(ctx.presetParent||ctx.presetEpic));$('jiraCreateProjectSelect').disabled=!!(ctx.presetParent||ctx.presetEpic);$('jiraCreateManualProject').hidden=!!(ctx.presetParent||ctx.presetEpic);$('jiraCreateTitle').textContent=ctx.presetParent?'Tạo Subtask · '+ctx.presetParent.key:ctx.presetEpic?'Tạo công việc · '+ctx.presetEpic.key:'Tạo công việc Jira';
  if(!dialog.open)dialog.showModal();$('jiraCreateCloseBtn').focus({preventScroll:true});
  if(fresh){if(parent)await loadSubtaskContext();else if(epic){ctx.project=epic.project.key;$('jiraCreateProject').value=ctx.project;await loadTypes();$('jiraCreateProjectSelect').disabled=true;$('jiraCreateManualProject').hidden=true;}else await loadProjects();}
 }
 function newDraft(){if(busy||QuickJiraBusy.active)return;const presetEpic=ctx?.presetEpic;const exists=ctx?.meta&&!ctx.receipt||ctx?.imageJob&&!ctx.imageJob.done;if(exists&&!window.confirm('Xóa thông tin trong bản nháp này?'))return;reset();void open(presetEpic?{epic:presetEpic}:{});}
 $('jiraCreateCloseBtn').onclick=()=>dialog.close();$('jiraCreateProjectBtn').onclick=loadTypes;$('jiraCreateProjectsRetryBtn').onclick=loadProjects;$('jiraCreateMetaRetryBtn').onclick=()=>ctx?.presetParent?loadSubtaskContext($('jiraCreateType').value):loadMeta();$('jiraCreateType').onchange=loadMeta;
 $('jiraCreateProjectSelect').onchange=()=>{if(ctx?.presetParent||ctx?.presetEpic)return;$('jiraCreateProject').value=$('jiraCreateProjectSelect').value;return loadTypes();};
 $('jiraCreateProjectQuery').addEventListener('input',suggestProjects);
 $('jiraCreateProjectQuery').addEventListener('focus',suggestProjects);
 $('jiraCreateProjectQuery').addEventListener('blur',closeProjects);
 $('jiraCreateProjectQuery').addEventListener('keydown',e=>{if(!ctx||ctx.presetParent||ctx.presetEpic)return;if(['ArrowDown','ArrowUp'].includes(e.key)&&projectMatches.length){e.preventDefault();projectIndex=(projectIndex+(e.key==='ArrowDown'?1:-1)+projectMatches.length)%projectMatches.length;for(const [i,b] of [...$('jiraCreateProjectSuggestions').children].entries())b.setAttribute('aria-selected',String(i===projectIndex));const active=$('jira-project-option-'+projectIndex);$('jiraCreateProjectQuery').setAttribute('aria-activedescendant',active.id);active.scrollIntoView?.({block:'nearest'});}if(e.key==='Enter'){e.preventDefault();if(projectMatches.length)void selectProject(projectMatches[Math.max(0,projectIndex)]);}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeProjects();$('jiraCreateProjectQuery').value=ctx.project;ctx.projectQueryDirty=false;}});
 $('jiraCreateProjectSuggestions').addEventListener('pointerdown',e=>e.preventDefault());$('jiraCreateProjectSuggestions').onclick=e=>{const b=e.target.closest('[data-project-index]');if(b)void selectProject(projectMatches[Number(b.dataset.projectIndex)]);};
 $('jiraCreateProject').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void loadTypes();}});
 $('jiraCreateProject').addEventListener('input',()=>{if(!ctx)return;clearSchema();ctx.types=[];$('jiraCreateType').innerHTML='<option value="">Tải lại loại cho dự án mới</option>';});
 $('jiraCreateParentFindBtn').onclick=findParents;$('jiraCreateParentQuery').addEventListener('input',()=>{if(ctx)ctx.parent=null;$('jiraCreateParentState').textContent='Hãy tìm và chọn lại công việc cha.';});$('jiraCreateParentQuery').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void findParents();}});
 $('jiraCreateForm').onsubmit=review;$('jiraCreateResetBtn').onclick=newDraft;$('jiraCreateCancelBtn').onclick=()=>confirmation.close();$('jiraCreateConfirmBtn').onclick=submit;confirmation.addEventListener('close',()=>{pending=null;});
 $('jiraCreateCheckedBtn').onclick=()=>{if(!ctx?.receipt)return;$('jiraCreateCheckedBtn').hidden=true;$('jiraCreateAnotherBtn').hidden=false;$('jiraCreateReceiptText').textContent+=' Đã xác nhận kiểm tra Jira; chỉ tạo lại nếu chưa có công việc.';};
 $('jiraCreateAnotherBtn').onclick=newDraft;$('jiraCreateOpenBtn').onclick=()=>{const key=ctx?.receipt?.key;if(key){dialog.close();void window.QuickJiraSearch?.openCreated(key);}};
 dialog.addEventListener('close',()=>{if(source?.isConnected)source.focus({preventScroll:true});});
 for(const d of [dialog,confirmation]){d.addEventListener('keydown',e=>e.stopPropagation());d.addEventListener('cancel',e=>{if(QuickJiraBusy.active)e.preventDefault();});}
 async function resumeImages(checked=false){if(!ctx?.imageJob||busy||QuickJiraBusy.active)return;if(checked&&!window.confirm('Boss đã kiểm tra công việc và tệp trên Jira? Chỉ thử lại ảnh còn thiếu và mô tả chưa lưu.'))return;let key='';await run('Đang hoàn thiện ảnh và mô tả…',async c=>{try{if(checked){await QuickJiraEditorImages.reconcile(c.imageJob.batch,c.imageJob.key,{retryMissing:true});c.imageJob.finalizeUnknown=false;c.imageJob.requestId=crypto.randomUUID();}await QuickJiraEditorImages.finishCreated(c.imageJob);if(ctx!==c)return;receipt({outcome:'confirmed',key:c.imageJob.key,message:'Đã hoàn thiện ảnh và mô tả '+c.imageJob.key+'.'});key=c.imageJob.key;showToast('Đã hoàn thiện ảnh và mô tả.');}catch(e){if(ctx===c)receipt({outcome:'confirmed',key:c.imageJob.key,message:'Công việc đã tạo. '+e.message});}});if(key){dialog.close();await window.QuickJiraSearch?.openCreated(key);}}
 $('jiraCreateImagesRetryBtn').onclick=()=>resumeImages();$('jiraCreateImagesCheckBtn').onclick=()=>resumeImages(true);
 return {open,reset};
})();
