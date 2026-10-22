'use strict';
window.QuickJiraProjectReport=(()=>{
 const $=id=>document.getElementById(id),d=$('projectStatsDialog'),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),fmt=QuickJiraProjectStats.duration;
 let owner='',seq=0,working=false,report=null,items=[],selected='',origin=null;
 const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 function period(){const date=today(),range=$('psPeriod').value==='week'?QuickJiraUi.weekRange(date):QuickJiraUi.monthRange(date);if($('psPeriod').value!=='custom'){$('psFrom').value=range.start;$('psTo').value=range.end;}}
 function clear(){seq++;working=false;$('psLoad').disabled=false;items=[];report=null;selected='';$('psContent').hidden=true;$('psWarning').hidden=true;$('psPeople').replaceChildren();$('psDetail').replaceChildren();$('psProjects').replaceChildren();$('psProject').value='';$('psState').textContent='Chọn dự án để xem thống kê.';period();}
 function login(user){owner=String(user?.username||'');clear();$('projectStatsBtn').classList.toggle('hidden',!owner);}
 function logout(){owner='';clear();if(d.open)d.close();$('projectStatsBtn').classList.add('hidden');}
 async function open(){if(!owner||QuickJiraBusy.active)return;origin=document.activeElement;closeDesktopEditor();closeAllToolOverlays({restore:true});d.showModal();document.documentElement.classList.add('project-stats-open');document.body.classList.add('project-stats-open');$('psClose').focus({preventScroll:true});
  const token=seq;try{const data=await api('/api?action=jira-search-options');if(token!==seq)return;$('psProjects').innerHTML=data.projects.map(p=>`<option value="${esc(p.key)}" label="${esc(p.name)}"></option>`).join('');if(data.warnings.length)$('psState').textContent='Có thể nhập trực tiếp mã dự án để thống kê.';}catch(e){if(token===seq)$('psState').textContent=e.message;}
 }
 function render(){if(!report)return;const filter=$('psPerson').value;let people=report.people.filter(p=>!filter||p.id===filter);const sort=$('psSort').value;people.sort(sort==='name'?(a,b)=>a.name.localeCompare(b.name):sort==='tasks'?(a,b)=>b.subtasks-a.subtasks||b.seconds-a.seconds:(a,b)=>b.seconds-a.seconds);
  $('psKpis').innerHTML=[['Tổng giờ',fmt(report.seconds)],['Thành viên có log',report.people.length],['Subtask duy nhất',report.subtasks]].map(([a,b])=>`<article><small>${a}</small><strong>${esc(b)}</strong></article>`).join('');
  const max=Math.max(1,...report.people.map(p=>p.seconds));
  $('psPeople').innerHTML=people.length?people.map(p=>`<button type="button" class="ps-person" data-person="${esc(p.id)}" aria-expanded="${selected===p.id}"><div class="ps-person-head"><strong>${esc(p.name)}</strong><b>${fmt(p.seconds)} <span aria-hidden="true">›</span></b></div><div class="ps-meter" aria-hidden="true"><i style="width:${p.seconds/max*100}%"></i></div><div class="ps-meta"><span>${p.subtasks} Subtask đã log · ${p.share.toLocaleString('vi-VN',{maximumFractionDigits:1})}% tổng giờ</span><span>${p.regular?fmt(p.regular)+' thường · ':''}${p.overtime?fmt(p.overtime)+' OT · ':''}${p.unknown?fmt(p.unknown)+' chưa rõ OT':''}</span></div></button>`).join(''):'<p>Không có worklog trong kỳ đã chọn.</p>';
  detail();
 }
 function detail(){const p=report?.people.find(p=>p.id===selected);$('psDetail').hidden=!p;if(!p)return;
  $('psDetail').innerHTML=`<div class="ps-detail-head"><h3>${esc(p.name)}</h3><button id="psDetailClose" class="text-btn" type="button">Thu gọn</button></div>`+p.issues.map(t=>`<details class="ps-task"><summary><span><strong>${esc(t.key)}</strong> · ${t.isSubtask?'Subtask':'Công việc khác'}<small>${esc(t.summary)}</small></span><b>${fmt(t.seconds)}</b></summary>${t.logs.sort((a,b)=>a.start.localeCompare(b.start)).map(w=>`<div class="ps-log"><div><strong>${esc(w.date.split('-').reverse().join('/'))} · ${esc(new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(w.start)))}</strong><span>${esc(w.description||'Không có mô tả')}</span></div><b>${fmt(w.seconds)}<small>${w.overtimeKnown?(w.overtime?'OT':'Thường'):'Chưa rõ OT'}</small></b></div>`).join('')}</details>`).join('');
  $('psDetailClose').onclick=()=>{selected='';render();};
 }
 async function load(){if(working||!owner||QuickJiraBusy.active)return;const project=$('psProject').value.trim().toUpperCase(),from=$('psFrom').value,to=$('psTo').value;
  if(!/^[A-Z][A-Z0-9_]{0,99}$/.test(project)||!QuickJiraUi.validDate(from)||!QuickJiraUi.validDate(to)||to<from||(Date.parse(to)-Date.parse(from))/86400000>92){$('psState').textContent='Nhập mã dự án và khoảng ngày hợp lệ, tối đa 93 ngày.';return;}
  working=true;const token=++seq,release=QuickJiraBusy.begin('Đang thống kê dự án · Vui lòng chờ…');items=[];report=null;selected='';$('psContent').hidden=true;$('psWarning').hidden=true;$('psLoad').disabled=true;let complete=false,scanned=0,total=0,offset=0,baseline=null;const warnings=[],seenKeys=new Set();
  try{
   do{const data=await api('/api?'+new URLSearchParams({action:'project-stats',project,from,to,startAt:offset}));if(token!==seq)return;
    total=data.total;scanned=data.scanned;if(baseline!==null&&baseline!==total)warnings.push('Danh sách công việc thay đổi trong lúc tải. Hãy tải lại để đối chiếu.');baseline=total;
    for(const key of data.keys){if(seenKeys.has(key))warnings.push('Công việc bị lặp giữa các trang. Hãy tải lại để đối chiếu.');seenKeys.add(key);}
    items.push(...data.items);warnings.push(...data.warnings);$('psState').textContent=`Đang đọc ${scanned}/${total} công việc…`;const progress=$('dataLoadingDescription');if(progress)progress.textContent=`Đã đọc ${scanned}/${total} công việc · Vui lòng chờ`;
    if(data.hasMore&&data.nextStartAt<=offset)throw Error('Jira không trả về trang tiếp theo.');offset=data.nextStartAt;if(!data.hasMore){complete=!data.limited;break;}
   }while(true);
  }catch(e){if(token!==seq)return;warnings.push(e.message);}
  finally{if($('dataLoadingDescription'))$('dataLoadingDescription').textContent='Vui lòng chờ xử lý xong để tiếp tục';release();if(token===seq){working=false;$('psLoad').disabled=false;report=QuickJiraProjectStats.aggregate(items);$('psContent').hidden=false;$('psPerson').innerHTML='<option value="">Tất cả</option>'+report.people.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
   $('psState').textContent=`${project} · ${from.split('-').reverse().join('/')}–${to.split('-').reverse().join('/')} · ${scanned}/${total} công việc · ${complete&&!warnings.length?'Đã tải xong dữ liệu được phép xem':'Tạm tính — dữ liệu chưa đầy đủ'} · Cập nhật ${new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit'}).format(new Date())}`;
   const unknown=report.people.reduce((n,p)=>n+p.unknown,0);$('psWarning').hidden=!warnings.length&&!unknown;$('psWarning').textContent=[...new Set(warnings),unknown?`${fmt(unknown)} chưa xác định Overtime; tổng giờ vẫn được cộng, không tự xem là giờ thường.`:''].filter(Boolean).join(' ');render();}}
 }
 $('psForm').onsubmit=e=>{e.preventDefault();void load();};$('psPeriod').onchange=period;for(const id of ['psFrom','psTo'])$(id).onchange=()=>{$('psPeriod').value='custom';};
 for(const id of ['psProject','psFrom','psTo','psPeriod'])$(id).addEventListener('change',()=>{if(report){$('psContent').hidden=true;$('psWarning').hidden=true;$('psState').textContent='Bộ lọc đã thay đổi. Bấm Xem thống kê để cập nhật.';}});
 $('psPerson').onchange=()=>{selected='';render();};$('psSort').onchange=render;$('psPeople').onclick=e=>{const b=e.target.closest('[data-person]');if(!b)return;selected=selected===b.dataset.person?'':b.dataset.person;render();if(selected)$('psDetail').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});};
 $('psClose').onclick=()=>{if(!working&&!QuickJiraBusy.active)d.close();};d.addEventListener('cancel',e=>{if(working||QuickJiraBusy.active)e.preventDefault();});d.addEventListener('keydown',e=>e.stopPropagation());d.addEventListener('close',()=>{document.documentElement.classList.remove('project-stats-open');document.body.classList.remove('project-stats-open');origin?.focus({preventScroll:true});});
 $('projectStatsBtn').onclick=open;$('mobileProjectStatsBtn').onclick=open;
 if(typeof state!=='undefined'&&state.user)login(state.user);return {login,logout,open};
})();
