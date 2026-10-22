'use strict';
window.QuickJiraSubtaskEdit=(()=>{
 const $=id=>document.getElementById(id),dialog=$('jiraSubtaskEditDialog'),confirm=$('jiraSubtaskConfirmDialog');
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let ctx=null,busy=false,pending=null,owner='',generation=0,descriptionTouched=false;const receipts=new Map();
 function notice(text){$('jiraSubtaskEditState').textContent=text;}
 function clearFields(){const textarea=$('jse-description');if(textarea)QuickJiraEditor.unmount(textarea);$('jiraSubtaskEditFields').replaceChildren();descriptionTouched=false;}
 function clear(){generation++;ctx=null;pending=null;busy=false;clearFields();$('jiraSubtaskReviewBtn').disabled=true;$('jiraSubtaskReloadConfirm').hidden=true;notice('');if(confirm.open)confirm.close();if(dialog.open)dialog.close();$('jiraEditSubtaskBtn').hidden=true;}
 function setIssue(issue){clear();const current=String(state.user?.username||'').toLowerCase();if(current!==owner){receipts.clear();owner=current;}if(issue.issueType?.subtask){ctx={key:issue.key,options:null};$('jiraEditSubtaskBtn').hidden=false;}}
 async function run(label,work){if(!ctx||busy||QuickJiraBusy.active)return;busy=true;const current=ctx,token=generation,release=QuickJiraBusy.begin(label);try{await work(current,()=>ctx===current&&generation===token);}finally{if(ctx===current)busy=false;release();}}
 function locked(){return receipts.get(ctx?.key)?.uncertain===true;}
 function syncButtons(){const blocked=locked();$('jiraSubtaskReviewBtn').disabled=blocked||!ctx?.options?.fields.some(f=>f.editable);$('jiraSubtaskCheckedBtn').hidden=!blocked;$('jiraSubtaskReceipt').textContent=receipts.get(ctx?.key)?.message||'';$('jiraSubtaskReceipt').hidden=!receipts.has(ctx?.key);}
 function render(){clearFields();const o=ctx.options;$('jiraSubtaskParent').textContent='Công việc cha · '+o.parent;notice(o.warnings.join(' '));
  for(const f of o.fields){const wrap=document.createElement('div');wrap.className='jira-subtask-field';const id='jse-'+f.name;let control;
   if(f.kind==='select'){control=document.createElement('select');control.innerHTML='<option value="">'+(f.required?'Chọn Sub-task Type':'Chưa phân loại')+'</option>'+f.options.map(v=>`<option value="${esc(v.id)}">${esc(v.label)}</option>`).join('');if(f.value&&!f.options.some(v=>v.id===f.value)){const option=document.createElement('option');option.value=f.value;option.textContent=(f.currentLabel||f.value)+' · Hiện tại';control.append(option);}}
   else control=document.createElement(f.kind==='textarea'?'textarea':'input');
   control.id=id;control.value=f.value;control.disabled=!f.editable;control.dataset.field=f.name;if(f.kind==='textarea'){control.rows=7;control.maxLength=20000;}if(f.name==='summary')control.maxLength=255;if(f.name==='estimate'){control.placeholder='Ví dụ 2h 30m';control.maxLength=80;control.autocomplete='off';}
   const label=document.createElement('label');label.htmlFor=id;label.textContent=f.label+(f.required?' *':'');wrap.append(label,control);
   if(f.reason||f.name==='estimate'){const hint=document.createElement('p');hint.className='jira-search-note';hint.textContent=f.reason||'Ước tính ban đầu · nhập giờ/phút; 0m để đặt bằng 0.';wrap.append(hint);}
   $('jiraSubtaskEditFields').append(wrap);if(f.name==='description'&&f.editable)QuickJiraEditor.mount(control);
  }
  syncButtons();$('jiraSubtaskEditForm').hidden=false;
 }
 async function load(){await run('Đang đọc thông tin và quyền sửa Subtask…',async(current,valid)=>{try{const data=await api('/api?'+new URLSearchParams({action:'jira-subtask-edit-options',key:current.key}));if(!valid())return;current.options=data;render();}catch(e){if(valid())notice(e.message);}});}
 async function open(){if(!ctx||busy||QuickJiraBusy.active)return;$('jiraSubtaskEditKey').textContent=ctx.key;$('jiraSubtaskNativeLink').href='https://task.ascvn.com.vn/browse/'+encodeURIComponent(ctx.key);if(!dialog.open)dialog.showModal();$('jiraSubtaskEditCloseBtn').focus({preventScroll:true});if(!ctx.options){$('jiraSubtaskEditForm').hidden=true;await load();}else syncButtons();}
 function values(){if(!ctx?.options)throw Error('Hãy tải lại thông tin Subtask.');if(descriptionTouched)QuickJiraEditor.flush($('jse-description'));const changes={};
  for(const f of ctx.options.fields){if(!f.editable)continue;let v=$( 'jse-'+f.name).value;if(f.name==='description'&&!descriptionTouched)v=f.value;if(f.name==='summary')v=v.trim();if(v===f.value)continue;
   if((f.required||f.name==='summary')&&!v.trim())throw Error('Cần nhập '+f.label+'.');
   if(f.name==='estimate'){if(!/^\s*(?:\d+\s*[hm]\s*)+$/i.test(v))throw Error('Estimate dùng giờ/phút, ví dụ 2h 30m hoặc 0m.');let n=0;for(const m of v.matchAll(/(\d+)\s*([hm])/gi))n+=Number(m[1])*(m[2].toLowerCase()==='h'?60:1);if(!Number.isSafeInteger(n)||n>10*365*24*60)throw Error('Estimate vượt giới hạn.');v=n+'m';if(v===f.value)continue;}
   if(f.name==='subtaskType'&&v&&!f.options.some(x=>x.id===v))throw Error('Chọn Sub-task Type hợp lệ.');changes[f.name]=v;
  }if(!Object.keys(changes).length)throw Error('Chưa có thay đổi để lưu.');return changes;
 }
 function display(f,value){if(f.name==='subtaskType')return !value?'Chưa phân loại':f.options.find(o=>o.id===value)?.label||(value===f.value?f.currentLabel:'')||value;return value||'Trống';}
 function review(e){e.preventDefault();if(busy||QuickJiraBusy.active||locked())return;try{const v=values(),o=ctx.options;pending={key:ctx.key,values:v,expectedUpdated:o.updated,revision:o.revision,requestId:crypto.randomUUID()};$('jiraSubtaskChanges').innerHTML=Object.entries(v).map(([name,value])=>{const f=o.fields.find(x=>x.name===name);return `<section class="jira-subtask-change"><h3>${esc(f.label)}</h3><div class="jira-subtask-before"><span>Hiện tại</span><div>${esc(display(f,f.value))}</div></div><div class="jira-subtask-after"><span>Sau khi lưu</span><div class="${name==='description'?'jira-content':''}">${name==='description'?QuickJiraContent.render(value)||'<p>Trống</p>':esc(display(f,value))}</div></div></section>`;}).join('');confirm.showModal();$('jiraSubtaskCancelBtn').focus({preventScroll:true});}catch(e){notice(e.message);}}
 async function save(){if(!pending||busy||QuickJiraBusy.active||locked())return;const payload=pending,current=ctx;pending=null;confirm.close();let confirmed=false;
  await run('Đang lưu và đối chiếu Subtask trên Jira…',async(c,valid)=>{try{const data=await api('/api?action=jira-subtask-edit',{method:'POST',body:JSON.stringify(payload)});if(!valid())return;const uncertain=['unknown','accepted_unverified'].includes(data.outcome);if(data.outcome==='confirmed')receipts.delete(c.key);else receipts.set(c.key,{uncertain,message:data.message});notice(data.message);syncButtons();if(data.outcome==='confirmed'){confirmed=true;dialog.close();showToast(data.message);}}
   catch(e){if(!valid())return;const uncertain=e.code==='RESULT_UNKNOWN'||e.code!=='NOT_SENT'&&(!e.status||e.status>=500);const message=uncertain?'Chưa xác định kết quả lưu. Kiểm tra trên Jira trước khi gửi lại.':e.message;receipts.set(c.key,{uncertain,message});notice(message);syncButtons();}
  });
  if(confirmed&&ctx===current)await window.QuickJiraSearch?.refreshDetail(payload.key);
 }
 $('jiraEditSubtaskBtn').onclick=open;$('jiraSubtaskEditCloseBtn').onclick=()=>{if(!busy&&!QuickJiraBusy.active)dialog.close();};
 $('jiraSubtaskReloadBtn').onclick=()=>{if(!ctx||busy||QuickJiraBusy.active)return;if(ctx.options){$('jiraSubtaskReloadConfirm').hidden=false;return;}void load();};
 $('jiraSubtaskReloadYes').onclick=()=>{$('jiraSubtaskReloadConfirm').hidden=true;void load();};$('jiraSubtaskReloadNo').onclick=()=>{$('jiraSubtaskReloadConfirm').hidden=true;};
 $('jiraSubtaskEditForm').onsubmit=review;$('jiraSubtaskCancelBtn').onclick=()=>confirm.close();$('jiraSubtaskSaveBtn').onclick=save;confirm.addEventListener('close',()=>pending=null);
 $('jiraSubtaskCheckedBtn').onclick=()=>{if(!ctx||busy||QuickJiraBusy.active)return;receipts.delete(ctx.key);syncButtons();notice('Đã mở lại thao tác. Tải lại dữ liệu trước khi tiếp tục.');ctx.options=null;$('jiraSubtaskEditForm').hidden=true;void load();};
 const touched=e=>{if(e.target.closest('#jse-description,.jira-editor'))descriptionTouched=true;};$('jiraSubtaskEditFields').addEventListener('input',touched);$('jiraSubtaskEditFields').addEventListener('change',touched);$('jiraSubtaskEditFields').addEventListener('paste',touched);$('jiraSubtaskEditFields').addEventListener('drop',touched);$('jiraSubtaskEditFields').addEventListener('click',e=>{if(e.target.closest('[data-command],[data-table-insert],[data-table-edit]'))descriptionTouched=true;});
 for(const d of [dialog,confirm]){d.addEventListener('keydown',e=>e.stopPropagation());d.addEventListener('cancel',e=>{if(busy||QuickJiraBusy.active)e.preventDefault();});}
 return {clear,setIssue};
})();
