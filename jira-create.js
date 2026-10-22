'use strict';
window.QuickJiraCreate=(()=>{
 const $=id=>document.getElementById(id),dialog=$('jiraCreateDialog'),confirmation=$('jiraCreateConfirmDialog');
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let ctx=null,busy=false,pending=null,source=null;
 const user=()=>String(state.user?.username||'').toLowerCase();
 const info=message=>$('jiraCreateState').textContent=message;
 function errorInfo(message){info(message);$('jiraCreateState').scrollIntoView?.({block:'nearest'});}
 function reset(){ctx=null;busy=false;pending=null;if(confirmation.open)confirmation.close();if(dialog.open)dialog.close();
  for(const id of ['jiraCreateFields','jiraCreateParents','jiraCreateProjects','jiraCreatePreview'])$(id).replaceChildren();
  for(const id of ['jiraCreateParentQuery','jiraCreateProject'])$(id).value='';
  $('jiraCreateType').innerHTML='<option value="">Chọn dự án trước</option>';$('jiraCreateForm').hidden=true;$('jiraCreateParentGroup').hidden=true;$('jiraCreateReceipt').hidden=true;$('jiraCreateContent').hidden=false;
  $('jiraCreateReceiptText').textContent='';$('jiraCreateReceiptLink').removeAttribute('href');$('jiraCreateParentState').textContent='';$('jiraCreateUnsupported').textContent='';info('');
 }
 async function run(label,work){if(!ctx||busy||QuickJiraBusy.active)return;busy=true;const current=ctx,release=QuickJiraBusy.begin(label);try{return await work(current);}finally{if(ctx===current)busy=false;release();}}
 function get(action,query={}){return api('/api?'+new URLSearchParams({action,...query}));}
 async function loadProjects(){return run('Đang tải dự án Jira…',async current=>{
  $('jiraCreateProjectsRetryBtn').hidden=true;
  try{const data=await get('jira-create-projects');if(ctx!==current)return;$('jiraCreateProjects').innerHTML=data.projects.map(p=>`<option value="${esc(p.key)}" label="${esc(p.name)}"></option>`).join('');info((data.truncated?'Danh sách đã rút gọn; có thể nhập mã dự án. ':'')+'Chọn dự án rồi tải loại công việc; quyền tạo được kiểm tra theo dự án.');}
  catch(e){if(ctx===current){info(e.message+' Có thể nhập mã dự án trực tiếp.');$('jiraCreateProjectsRetryBtn').hidden=false;}}
 });}
 function clearSchema(){ctx.meta=null;ctx.parent=null;ctx.person=null;$('jiraCreateFields').replaceChildren();$('jiraCreateParents').replaceChildren();$('jiraCreateForm').hidden=true;$('jiraCreateParentGroup').hidden=true;$('jiraCreateParentState').textContent='';$('jiraCreateMetaRetryBtn').hidden=true;}
 async function loadTypes(){if(!ctx||busy||QuickJiraBusy.active||ctx.receipt)return;
  const p=$('jiraCreateProject').value.trim().toUpperCase();$('jiraCreateProject').value=p;
  if(!/^[A-Z][A-Z0-9_]*$/.test(p)){info('Chọn hoặc nhập mã dự án hợp lệ.');return;}
  clearSchema();ctx.project=p;ctx.types=[];$('jiraCreateType').innerHTML='<option value="">Đang tải loại công việc…</option>';
  await run('Đang đọc loại công việc được phép tạo…',async current=>{try{
   const data=await get('jira-create-types',{project:p});if(ctx!==current)return;current.types=data.types;
   $('jiraCreateType').innerHTML='<option value="">Chọn loại công việc</option>'+data.types.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}${t.subtask?' · Subtask':''}</option>`).join('');
   info(data.types.length?'Chọn loại công việc để tải form.':'Dự án không có loại công việc được phép tạo.');
  }catch(e){if(ctx===current){$('jiraCreateType').innerHTML='<option value="">Chưa tải được loại công việc</option>';info(e.message);}}});
 }
 function inputHtml(field){const id='jcf-'+field.id,required=field.required&&!field.hasDefault?' required':'',base=`id="${esc(id)}" data-create-field="${esc(field.id)}"${required}`;
  if(field.kind==='reporter')return `<input ${base} type="text" value="${esc(ctx.meta.reporterUsername)}" readonly><p class="jira-search-note">Người báo cáo là tài khoản đang đăng nhập.</p>`;
  if(field.kind==='assignee')return `<div class="jira-action-find"><input id="jiraCreateUserQuery" type="search" maxlength="255" autocomplete="off" placeholder="Họ tên hoặc username"><button id="jiraCreateUserFindBtn" class="secondary" type="button">Tìm</button></div><p id="jiraCreateUserState" class="jira-search-note">Chưa chọn: dùng cấu hình mặc định Jira nếu có.</p><div id="jiraCreateUsers"></div><button id="jiraCreateUserClearBtn" class="text-btn" type="button">Bỏ lựa chọn</button>`;
  if(['select','multi','boolean'].includes(field.kind))return `<select ${base}${field.kind==='multi'?' multiple size="4"':''}><option value="">${field.hasDefault?'Dùng mặc định Jira':'Chọn giá trị'}</option>${field.kind==='boolean'?'<option value="true">Có</option><option value="false">Không</option>':field.options.map(o=>`<option value="${esc(o.id)}">${esc(o.label)}</option>`).join('')}</select>`;
  if(field.kind==='textarea')return `<textarea ${base} rows="4" maxlength="20000"></textarea>`;
  const type={number:'number',date:'date',datetime:'datetime-local',url:'url'}[field.kind]||'text';
  return `<input ${base} type="${type}"${type==='number'?' step="any"':''} maxlength="${field.id==='summary'?255:1000}"${field.kind==='labels'?' placeholder="Các nhãn cách nhau bằng dấu phẩy"':''}>`;
 }
 function renderFields(){const meta=ctx.meta,visible=meta.fields.filter(f=>f.kind!=='unsupported');
  $('jiraCreateFields').innerHTML=visible.map(f=>`<div class="jira-create-field"><label for="${f.kind==='assignee'?'jiraCreateUserQuery':'jcf-'+esc(f.id)}">${esc(f.label)}${f.required?' *':''}</label>${inputHtml(f)}${f.hasDefault?'<p class="jira-search-note">Để trống để Jira áp dụng giá trị mặc định.</p>':''}${f.kind==='multi'?'<p class="jira-search-note">Có thể chọn nhiều giá trị.</p>':''}</div>`).join('');
  const unsupported=meta.fields.filter(f=>f.kind==='unsupported');$('jiraCreateUnsupported').textContent=unsupported.length?'Trường chưa hỗ trợ nhập trong app: '+unsupported.map(f=>f.label+(f.hasDefault?' (dùng mặc định Jira)':'')).join(', ')+'.':'';
  $('jiraCreateForm').hidden=false;$('jiraCreateParentGroup').hidden=!meta.type.subtask;
  $('jiraCreateReviewBtn').disabled=!!meta.blocked.length;
  info(meta.blocked.length?'Cần xử lý trường bắt buộc trên Jira: '+meta.blocked.map(f=>f.label).join(', ')+'.':'Nhập thông tin bên dưới. Dấu * là trường bắt buộc; phần để trống có mặc định sẽ do Jira xử lý.');
  if($('jiraCreateUserFindBtn')){
   $('jiraCreateUserFindBtn').disabled=!meta.canAssign;$('jiraCreateUserQuery').disabled=!meta.canAssign;
   $('jiraCreateUserFindBtn').onclick=findUsers;$('jiraCreateUserQuery').addEventListener('input',()=>{ctx.person=null;$('jiraCreateUserState').textContent='Hãy bấm Tìm và chọn người từ kết quả.';});
   $('jiraCreateUserQuery').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void findUsers();}});
   $('jiraCreateUserClearBtn').onclick=()=>{ctx.person=null;$('jiraCreateUserQuery').value='';$('jiraCreateUserState').textContent='Chưa chọn: dùng mặc định Jira nếu có.';};
  }
 }
 async function loadMeta(){if(!ctx||busy||QuickJiraBusy.active||ctx.receipt)return;const id=$('jiraCreateType').value;
  clearSchema();if(!id)return;const currentProject=$('jiraCreateProject').value.trim().toUpperCase();if(currentProject!==ctx.project){info('Mã dự án đã đổi. Hãy tải lại loại công việc.');return;}
  await run('Đang tải trường bắt buộc từ Jira…',async current=>{try{const data=await get('jira-create-meta',{project:current.project,type:id});if(ctx!==current)return;current.meta=data;renderFields();}
   catch(e){if(ctx===current){info(e.message);$('jiraCreateMetaRetryBtn').hidden=false;}}});
  if(ctx?.meta?.type.subtask&&ctx.presetParent?.project.key===ctx.project){const current=ctx;await run('Đang kiểm tra công việc cha…',async captured=>{try{const data=await get('jira-create-parents',{project:captured.project,key:captured.presetParent.key});if(ctx===captured)chooseParent(data.items[0]);}catch(e){if(ctx===captured)$('jiraCreateParentState').textContent=e.message;}});if(ctx===current)ctx.presetParent=null;}
 }
 function chooseParent(item){if(!item)return;ctx.parent=item;$('jiraCreateParentState').textContent='Đã chọn '+item.key+' · '+item.summary;$('jiraCreateParents').replaceChildren();$('jiraCreateParentQuery').value=item.key;}
 async function findParents(){if(!ctx?.meta)return;const q=$('jiraCreateParentQuery').value.trim();if(q.length<2){$('jiraCreateParentState').textContent='Nhập ít nhất 2 ký tự.';return;}
  await run('Đang tìm công việc cha…',async current=>{try{const data=await get('jira-create-parents',{project:current.project,q});if(ctx!==current)return;$('jiraCreateParents').replaceChildren();$('jiraCreateParentState').textContent=data.items.length?'Chọn công việc cha (tối đa 25 kết quả; nhập cụ thể hơn nếu cần).':'Không tìm thấy công việc cha phù hợp cùng dự án.';
   for(const item of data.items){const button=document.createElement('button');button.type='button';button.className='jira-subtask';button.textContent=item.key+' · '+item.summary;button.onclick=()=>chooseParent(item);$('jiraCreateParents').append(button);}
  }catch(e){if(ctx===current)$('jiraCreateParentState').textContent=e.message;}});
 }
 async function findUsers(){const q=$('jiraCreateUserQuery').value.trim();if(q.length<2){$('jiraCreateUserState').textContent='Nhập ít nhất 2 ký tự.';return;}
  await run('Đang tìm người có thể nhận công việc…',async current=>{try{const data=await get('jira-create-users',{project:current.project,q});if(ctx!==current)return;$('jiraCreateUsers').replaceChildren();$('jiraCreateUserState').textContent=data.users.length?'Chọn nhân sự (tối đa 50 kết quả).':'Không tìm thấy nhân sự phù hợp.';
   for(const person of data.users){const button=document.createElement('button');button.type='button';button.className='jira-person-option';button.textContent=person.displayName+' · '+person.username;button.onclick=()=>{ctx.person=person;$('jiraCreateUserState').textContent='Đã chọn '+person.displayName+' ('+person.username+')';$('jiraCreateUsers').replaceChildren();};$('jiraCreateUsers').append(button);}
  }catch(e){if(ctx===current)$('jiraCreateUserState').textContent=e.message;}});
 }
 function values(){const fields={},labels=[];for(const f of ctx.meta.fields){if(f.kind==='unsupported')continue;let v;
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
  try{if(ctx.project!==$('jiraCreateProject').value.trim().toUpperCase()||ctx.meta.type.id!==$('jiraCreateType').value)throw Error('Dự án hoặc loại đã đổi. Hãy tải lại form.');if(ctx.meta.type.subtask&&!ctx.parent)throw Error('Hãy tìm và chọn công việc cha.');
   const {fields,labels}=values();if(!fields.summary?.trim())throw Error('Cần nhập tiêu đề công việc.');
   pending={project:ctx.project,type:ctx.meta.type.id,parent:ctx.meta.type.subtask?ctx.parent.key:'',revision:ctx.meta.revision,fields,requestId:crypto.randomUUID()};
   const lines=[['Dự án',ctx.project],['Loại',ctx.meta.type.name],...(pending.parent?[['Công việc cha',pending.parent]]:[]),...labels];
   $('jiraCreatePreview').innerHTML='<dl>'+lines.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')+'</dl><p class="jira-search-note">Các trường để trống không được gửi; Jira áp dụng mặc định nếu có.</p>';
   confirmation.showModal();$('jiraCreateCancelBtn').focus({preventScroll:true});
  }catch(e){errorInfo(e.message);}
 }
 function receipt(result){ctx.receipt=result;$('jiraCreateContent').hidden=true;$('jiraCreateReceipt').hidden=false;$('jiraCreateReceiptText').textContent=result.message;
  const valid=/^[A-Z][A-Z0-9_]*-\d+$/.test(result.key||'');$('jiraCreateOpenBtn').hidden=!valid;$('jiraCreateReceiptLink').hidden=!valid;if(valid)$('jiraCreateReceiptLink').href='https://task.ascvn.com.vn/browse/'+encodeURIComponent(result.key);
  $('jiraCreateCheckedBtn').hidden=result.outcome==='confirmed';$('jiraCreateAnotherBtn').hidden=result.outcome!=='confirmed';info('');
 }
 async function submit(){if(!pending||!ctx||ctx.receipt||busy||QuickJiraBusy.active)return;const body=pending,current=ctx;pending=null;confirmation.close();let openKey='';
  await run('Đang tạo công việc và đối chiếu Jira…',async captured=>{try{
   const data=await api('/api?action=jira-create',{method:'POST',body:JSON.stringify(body)});if(ctx!==captured)return;
   if(['confirmed','unknown','accepted_unverified'].includes(data.outcome)){receipt(data);showToast(data.message);if(data.outcome==='confirmed')openKey=data.key;}
   else errorInfo(data.message||'Jira từ chối tạo. Kiểm tra lại form.');
  }catch(e){if(ctx!==captured)return;const uncertain=e.code==='RESULT_UNKNOWN'||e.code!=='NOT_SENT'&&(!e.status||e.status>=500);if(uncertain)receipt({outcome:'unknown',message:'Chưa xác định kết quả gửi. Kiểm tra Jira trước khi tạo yêu cầu mới.'});else errorInfo(e.message+(e.status===409?' Bấm tải lại form để cập nhật cấu hình.':''));}});
  if(ctx===current&&openKey){dialog.close();await window.QuickJiraSearch?.openCreated(openKey);}
 }
 async function open({parent=null}={}){if(!user()||busy||QuickJiraBusy.active)return;
  if(parent&&ctx&&!ctx.receipt&&ctx.meta&&!window.confirm('Thay bản nháp đang nhập bằng form Subtask cho '+parent.key+'?'))return;
  if(ctx?.owner!==user())reset();
  if(ctx?.receipt&&parent){if(!dialog.open)dialog.showModal();$('jiraCreateCloseBtn').focus({preventScroll:true});return;}
  if(parent)reset();source=document.activeElement;
  const fresh=!ctx;if(fresh)ctx={owner:user(),project:'',types:[],meta:null,parent:null,person:null,presetParent:parent,receipt:null};
  if(!dialog.open)dialog.showModal();$('jiraCreateCloseBtn').focus({preventScroll:true});
  if(fresh){await loadProjects();if(parent&&ctx){$('jiraCreateProject').value=parent.project.key;await loadTypes();if(!ctx)return;const subtasks=ctx.types.filter(t=>t.subtask);if(subtasks.length===1){$('jiraCreateType').value=subtasks[0].id;await loadMeta();}else info('Chọn loại Subtask phù hợp để tạo công việc con cho '+parent.key+'.');}}
 }
 function newDraft(){if(busy||QuickJiraBusy.active)return;const exists=ctx?.meta&&!ctx.receipt;if(exists&&!window.confirm('Xóa thông tin trong bản nháp này?'))return;reset();void open();}
 $('jiraCreateBtn').onclick=()=>open();$('jiraCreateCloseBtn').onclick=()=>dialog.close();$('jiraCreateProjectBtn').onclick=loadTypes;$('jiraCreateProjectsRetryBtn').onclick=loadProjects;$('jiraCreateMetaRetryBtn').onclick=loadMeta;$('jiraCreateType').onchange=loadMeta;
 $('jiraCreateProject').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void loadTypes();}});
 $('jiraCreateProject').addEventListener('input',()=>{if(!ctx)return;clearSchema();ctx.types=[];$('jiraCreateType').innerHTML='<option value="">Tải lại loại cho dự án mới</option>';});
 $('jiraCreateParentFindBtn').onclick=findParents;$('jiraCreateParentQuery').addEventListener('input',()=>{if(ctx)ctx.parent=null;$('jiraCreateParentState').textContent='Hãy tìm và chọn lại công việc cha.';});$('jiraCreateParentQuery').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void findParents();}});
 $('jiraCreateForm').onsubmit=review;$('jiraCreateResetBtn').onclick=newDraft;$('jiraCreateCancelBtn').onclick=()=>confirmation.close();$('jiraCreateConfirmBtn').onclick=submit;confirmation.addEventListener('close',()=>{pending=null;});
 $('jiraCreateCheckedBtn').onclick=()=>{if(!ctx?.receipt)return;$('jiraCreateCheckedBtn').hidden=true;$('jiraCreateAnotherBtn').hidden=false;$('jiraCreateReceiptText').textContent+=' Đã xác nhận kiểm tra Jira; chỉ tạo lại nếu chưa có công việc.';};
 $('jiraCreateAnotherBtn').onclick=newDraft;$('jiraCreateOpenBtn').onclick=()=>{const key=ctx?.receipt?.key;if(key){dialog.close();void window.QuickJiraSearch?.openCreated(key);}};
 dialog.addEventListener('close',()=>{if(source?.isConnected)source.focus({preventScroll:true});});
 for(const d of [dialog,confirmation]){d.addEventListener('keydown',e=>e.stopPropagation());d.addEventListener('cancel',e=>{if(busy||QuickJiraBusy.active)e.preventDefault();});}
 return {open,reset};
})();
