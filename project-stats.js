'use strict';
window.QuickJiraProjectReport=(()=>{
 const $=id=>document.getElementById(id),d=$('projectStatsDialog'),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),fmt=QuickJiraProjectStats.duration;
 let owner='',seq=0,working=false,report=null,items=[],selected='',origin=null,job=null,projectsLoaded=false;
 const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 function period(){
  const mode=$('psPeriod').value,date=$('psAnchor').value||today(),year=$('psYear').value||today().slice(0,4);
  const range=mode==='year'?{start:year+'-01-01',end:year+'-12-31'}:mode==='week'?QuickJiraUi.weekRange(date):QuickJiraUi.monthRange(date);
  if(mode!=='custom'&&mode!=='all'){$('psFrom').value=range.start;$('psTo').value=range.end;}
  $('psAnchorWrap').hidden=!['week','month'].includes(mode);$('psYearWrap').hidden=mode!=='year';
  for(const id of ['psFrom','psTo']){$(id).closest('label').hidden=mode==='all';$(id).required=mode!=='all';$(id).readOnly=mode!=='custom';}
  $('psProject').disabled=$('psScope').value==='all';
 }
 function filter(){
  const all=$('psPeriod').value==='all',project=$('psScope').value==='all'?'':$('psProject').value.trim().toUpperCase();
  return {project,all:all?'1':'0',from:all?'':$('psFrom').value,to:all?'':$('psTo').value};
 }
 const matches=j=>j&&JSON.stringify(j.filter)===JSON.stringify(filter());
 function stopJob(){if(job){job.controller.abort();job.task?.cancel();job.receiptHandle?.cancel();job=null;}}
 function clear(){seq++;stopJob();projectsLoaded=false;working=false;$('psLoad').disabled=false;items=[];report=null;selected='';$('psContent').hidden=true;$('psWarning').hidden=true;$('psPeople').replaceChildren();$('psDetail').replaceChildren();$('psProjects').replaceChildren();$('psProject').value='';$('psScope').value='all';$('psPeriod').value='month';$('psAnchor').value=today();$('psYear').value=today().slice(0,4);$('psState').textContent='Chọn dự án để xem thống kê.';period();$('psPause').hidden=true;$('psRetry').hidden=true;}
 function login(user){owner=String(user?.username||'');clear();$('projectStatsBtn').classList.toggle('hidden',!owner);}
 function logout(){owner='';clear();if(d.open)d.close();$('projectStatsBtn').classList.add('hidden');}
 async function open(){if(!owner||QuickJiraBusy.active)return;origin=document.activeElement;closeDesktopEditor();closeAllToolOverlays({restore:true});if(!d.open)d.showModal();document.documentElement.classList.add('project-stats-open');document.body.classList.add('project-stats-open');$('psClose').focus({preventScroll:true});
  if(job)paint(job);if(projectsLoaded)return;const token=seq;try{const data=await api('/api?action=jira-search-options');if(token!==seq)return;projectsLoaded=true;$('psProjects').innerHTML=data.projects.map(p=>`<option value="${esc(p.key)}" label="${esc(p.name)}"></option>`).join('');if(data.warnings.length&&!job)$('psState').textContent='Có thể nhập trực tiếp mã dự án để thống kê.';}catch(e){if(token===seq&&!job)$('psState').textContent=e.message;}
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
 function progress(j){
  const discovery=j.phase==='issues',done=discovery?j.issues.length:j.issues.filter(t=>t.done||t.error).length,total=discovery?j.total:j.issues.length;
  const percent=total===null?'—':total===0?'100':String(Math.floor(Math.min(1,done/total)*100));
  return {done,total,percent,label:discovery?'Đang tìm công việc':'Đang đọc worklog'};
 }
 function paint(j){
  if(job!==j)return;const p=progress(j),caption=(j.filter.project||'Tất cả dự án')+' · '+(j.filter.all==='1'?'Toàn thời gian':j.filter.from.split('-').reverse().join('/')+'–'+j.filter.to.split('-').reverse().join('/'));
  const errors=j.issues.filter(t=>t.error).map(t=>t.key+': '+t.error);
  const status=j.running?(j.paused?'Đang tạm dừng…':p.label):j.paused?'Đã tạm dừng':j.error||errors.length||j.warnings.length?'Dữ liệu tạm tính — cần xử lý':'Đã tải xong dữ liệu được phép xem';
  if(matches(j)){
   $('psState').textContent=caption+' · '+status+' · '+p.done+'/'+(p.total??'?')+' — '+p.percent+'%';
   $('psContent').hidden=j.running&&!report;
   const unknown=report?.people.reduce((n,p)=>n+p.unknown,0)||0;
   const warnings=[...new Set([...j.warnings,...errors,j.error,unknown?fmt(unknown)+' chưa xác định Overtime; vẫn cộng vào tổng giờ.':''])].filter(Boolean);
   $('psWarning').hidden=!warnings.length;$('psWarning').textContent=warnings.join(' ');
  }else $('psState').textContent='Bộ lọc chưa áp dụng. Tác vụ nền vẫn dùng bộ lọc đã bấm Xem thống kê.';
  $('psPause').hidden=!j.running&&!j.paused;$('psPause').disabled=j.running&&j.paused;$('psPause').textContent=j.paused?'Tiếp tục':'Tạm dừng';
  $('psRetry').hidden=j.running||j.paused||(!j.error&&!errors.length);$('psLoad').disabled=false;
  j.task?.update({label:(j.paused?'Đã tạm dừng · ':p.label+' · ')+(j.filter.project||'Tất cả dự án'),...(p.total===null?{detail:'Đang xác định tổng số công việc'}:{done:p.done,total:p.total}),status:j.paused?'paused':''});
 }
 function makeTask(j){j.receiptHandle?.cancel();j.receiptHandle=null;j.task=QuickJiraBusy.begin('Đang thống kê · '+(j.filter.project||'Tất cả dự án'),{id:'project-report',retain:true,onOpen:open});}
 async function request(j,params){return api('/api?'+new URLSearchParams({action:'project-stats',...j.filter,...params}),{silentBusy:true,signal:j.controller.signal});}
 function valid(j){return job===j&&owner===j.owner&&!j.controller.signal.aborted;}
 function summarize(j){if(!matches(j))return;items=[...j.items.values()];report=QuickJiraProjectStats.aggregate(items);selected='';$('psContent').hidden=false;
  const person=$('psPerson').value;$('psPerson').innerHTML='<option value="">Tất cả</option>'+report.people.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('');if(report.people.some(p=>p.id===person))$('psPerson').value=person;render();
  if(!j.hasRendered){j.hasRendered=true;requestAnimationFrame(()=>{if(valid(j)&&matches(j))d.querySelector('.ps-body').scrollTo({top:0,behavior:'instant'});});}
 }
 async function readIssue(j,t){
  while(valid(j)&&!j.paused&&!t.done){
   const d=await request(j,{op:'worklogs',key:t.key,startAt:t.offset});if(!valid(j))return;
   if(d.key!==t.key||!Array.isArray(d.ids)||d.ids.some(id=>t.ids.has(id))||(d.hasMore&&d.nextStartAt<=t.offset))throw Error('Trang worklog bị lặp hoặc không tiến lên.');
   if(t.total!==null&&t.total!==d.total)j.warnings.push(t.key+': worklog thay đổi trong lúc tải; cần đối chiếu lại.');
   t.total=d.total;for(const id of d.ids)t.ids.add(id);
   for(const x of d.items)j.items.set(x.id,{...x,project:t.project,summary:t.summary,isSubtask:t.isSubtask});
   t.offset=d.nextStartAt;t.done=!d.hasMore;paint(j);
  }
 }
 async function execute(j){
  if(!valid(j)||j.running)return;j.running=true;j.paused=false;j.error='';working=true;if(!j.task)makeTask(j);paint(j);
  try{
   while(j.phase==='issues'&&valid(j)&&!j.paused){
    const d=await request(j,{op:'issues',startAt:j.offset});if(!valid(j))return;
    if(j.total!==null&&j.total!==d.total)j.warnings.push('Danh sách công việc thay đổi trong lúc tải; cần đối chiếu lại.');
    if(d.issues.some(t=>j.keys.has(t.key))||(d.hasMore&&d.nextStartAt<=j.offset))throw Error('Trang công việc bị lặp hoặc không tiến lên.');
    j.total=d.total;for(const t of d.issues){j.keys.add(t.key);j.issues.push({...t,offset:0,total:null,ids:new Set(),done:false,error:'',inflight:false});}
    j.offset=d.nextStartAt;if(!d.hasMore)j.phase='worklogs';paint(j);
   }
   if(j.phase==='worklogs'&&!j.paused){
    const worker=async()=>{while(valid(j)&&!j.paused){const t=j.issues.find(t=>!t.done&&!t.error&&!t.inflight);if(!t)return;t.inflight=true;
     try{await readIssue(j,t);}catch(e){if(valid(j))t.error=e.message;}finally{t.inflight=false;if(valid(j))paint(j);}
    }};
    await Promise.all([worker(),worker(),worker()]);
   }
  }catch(e){if(valid(j))j.error=e.message;}
  finally{if(valid(j)){j.running=false;working=false;summarize(j);paint(j);if(!j.paused){const p=progress(j),partial=!!j.error||!!j.warnings.length||j.issues.some(t=>t.error);j.task?.({label:partial?'Thống kê cần xử lý':'Thống kê hoàn tất',error:partial,done:p.done,total:p.total??0,detail:partial?'Có dữ liệu chưa đọc được':'Đã hoàn tất'});j.receiptHandle=j.task;j.task=null;}}}
 }
 async function load(){
  if(!owner||QuickJiraBusy.active)return;const f=filter();
  if(($('psScope').value==='one'&&!f.project)||(f.project&&!/^[A-Z][A-Z0-9_]{0,99}$/.test(f.project))||(f.all!=='1'&&(!QuickJiraUi.validDate(f.from)||!QuickJiraUi.validDate(f.to)||f.to<f.from))){$('psState').textContent='Nhập mã dự án và khoảng ngày hợp lệ.';return;}
  if(job?.running&&matches(job))return;
  stopJob();seq++;report=null;items=[];selected='';$('psContent').hidden=true;$('psWarning').hidden=true;d.querySelector('.ps-body').scrollTop=0;
  job={filter:Object.freeze(f),owner,controller:new AbortController(),offset:0,total:null,phase:'issues',issues:[],keys:new Set(),items:new Map(),warnings:[],paused:false,running:false,error:'',task:null};void execute(job);
 }
 function changed(){period();if(job){report=null;$('psContent').hidden=true;if(!job.running)summarize(job);paint(job);}}
 $('psPause').onclick=()=>{if(!job)return;if(job.paused&&!job.running)void execute(job);else{job.paused=true;paint(job);}};
 $('psRetry').onclick=()=>{if(!job||job.running)return;for(const t of job.issues)t.error='';void execute(job);};
 $('psForm').onsubmit=e=>{e.preventDefault();void load();};for(const id of ['psScope','psProject','psPeriod','psAnchor','psYear','psFrom','psTo'])$(id).addEventListener('change',changed);
 $('psPerson').onchange=()=>{selected='';render();};$('psSort').onchange=render;$('psPeople').onclick=e=>{const b=e.target.closest('[data-person]');if(!b)return;selected=selected===b.dataset.person?'':b.dataset.person;render();if(selected)$('psDetail').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});};
 $('psClose').onclick=()=>{if(!QuickJiraBusy.active)d.close();};d.addEventListener('cancel',e=>{if(QuickJiraBusy.active)e.preventDefault();});d.addEventListener('keydown',e=>e.stopPropagation());d.addEventListener('close',()=>{document.documentElement.classList.remove('project-stats-open');document.body.classList.remove('project-stats-open');origin?.focus({preventScroll:true});});
 $('projectStatsBtn').onclick=open;$('mobileProjectStatsBtn').onclick=open;
 if(typeof state!=='undefined'&&state.user)login(state.user);return {login,logout,open,get running(){return !!job?.running;},get paused(){return !!job?.paused;}};
})();
