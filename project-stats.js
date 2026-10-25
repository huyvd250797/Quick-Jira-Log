'use strict';
window.QuickJiraProjectReport=(()=>{
 const $=id=>document.getElementById(id),d=$('projectStatsDialog'),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),fmt=QuickJiraProjectStats.duration;
 let owner='',seq=0,working=false,report=null,items=[],selected='',origin=null,job=null,projectsLoaded=false,restoring=null;
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
 function ui(){return Object.fromEntries(['psScope','psProject','psPeriod','psAnchor','psYear','psFrom','psTo','psPerson','psSort'].map(id=>[id,$(id).value]));}
 function meta(j){return {failures:j.issues.filter(t=>t.error).map(t=>[t.key,t.error]),runID:j.runID,filter:j.filter,offset:j.offset,total:j.total,phase:j.phase,paused:j.paused,status:j.finished?'complete':j.paused?'paused':'running',warnings:j.warnings,error:j.error,ui:ui(),view:d.open?'stats':'other',scroll:d.querySelector('.ps-body').scrollTop};}
 async function checkpoint(j,page=null){
  if(!valid(j)||j.storageDisabled)return;
  try{const ok=await QuickJiraReportStorage.commit(j.owner,j.runID,page,meta(j));if(!ok&&valid(j)){j.paused=true;j.storageDisabled=true;j.storageWarning='Tác vụ đã thay đổi ở cửa sổ khác. Hãy mở một thống kê mới.';}}
  catch(e){j.storageDisabled=true;j.storageWarning=storageMessage(e);}
 }
 function storageMessage(e){const name=['QuotaExceededError','InvalidStateError','AbortError','SecurityError','DataCloneError','UnknownError','NotFoundError'].includes(e?.name)?e.name:'StorageError';
  return (name==='QuotaExceededError'?'Bộ nhớ thiết bị không đủ để lưu tiến độ. ':name==='SecurityError'?'Trình duyệt đang chặn lưu dữ liệu. ':'Chưa lưu được tiến độ trên thiết bị. ')+ 'Giữ app mở để tiếp tục; khi mở lại chỉ khôi phục đến mốc đã lưu thành công. ('+name+')';
 }
 function flush(){const j=job;if(!j)return Promise.resolve();return checkpoint(j);}
 function addIssue(j,t){
  if(j.keys.has(t.key))return;
  const {worklogs,...info}=t,row={...info,offset:0,total:null,ids:new Set(),done:false,error:'',inflight:false};
  if(worklogs){row.offset=worklogs.nextStartAt;row.total=worklogs.total;row.done=!worklogs.hasMore;for(const id of worklogs.ids)row.ids.add(id);for(const x of worklogs.items)j.items.set(x.id,{...x,project:t.project,summary:t.summary,isSubtask:t.isSubtask,issueType:t.issueType,issueTypeId:t.issueTypeId});}
  j.keys.add(t.key);j.issues.push(row);
 }
 async function restore(user,token){
  try{
   const saved=await QuickJiraReportStorage.load(user);if(!saved||owner!==user||seq!==token||job)return;
   const m=saved.meta,j={...m,owner:user,controller:new AbortController(),issues:[],keys:new Set(),items:new Map(),verified:new Set(),running:false,finished:m.status==='complete',task:null,receiptHandle:null,hasRendered:true,storageDisabled:false};
   const issuePages=saved.pages.filter(p=>p.kind==='issues').sort((a,b)=>a.offset-b.offset);
   let issueCursor=0;
   for(const p of issuePages){if(p.offset!==issueCursor||p.payload.issues.some(t=>j.keys.has(t.key)))break;for(const t of p.payload.issues)addIssue(j,t);issueCursor=p.payload.nextStartAt;}
   let repair=issueCursor!==m.offset;
   if(repair){j.offset=issueCursor;j.phase='issues';j.finished=false;}
   const byKey=new Map(j.issues.map(t=>[t.key,t]));
   for(const p of saved.pages.filter(p=>p.kind==='logs').sort((a,b)=>a.offset-b.offset)){
    const t=byKey.get(p.issue);if(!t||t.done||p.offset!==t.offset)continue;for(const id of p.payload.ids)t.ids.add(id);
    for(const x of p.payload.items)j.items.set(x.id,{...x,project:t.project,summary:t.summary,isSubtask:t.isSubtask,issueType:t.issueType,issueTypeId:t.issueTypeId});
    t.total=p.payload.total;t.offset=p.payload.nextStartAt;t.done=!p.payload.hasMore;
   }
   for(const p of saved.pages.filter(p=>p.kind==='ot'))for(const x of p.payload){const item=j.items.get(x.id);if(item){Object.assign(item,x);j.verified.add(x.id);}}
   for(const [key,error] of m.failures||[]){const t=byKey.get(key);if(t)t.error=error;}
   if(!repair&&j.phase!=='issues'&&j.issues.some(t=>!t.done&&!t.error)){repair=true;j.phase='worklogs';j.finished=false;}
   j.recovering=(m.status==='running'||repair)&&!j.paused;
   j.resumeNotice='Đã khôi phục dữ liệu lưu '+new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'short'}).format(new Date(m.savedAt))+(repair?' · Kiểm tra và đọc bù checkpoint thiếu':'');
   job=j;for(const id of ['psScope','psProject','psPeriod','psAnchor','psYear','psFrom','psTo','psSort'])if(m.ui?.[id]!==undefined)$(id).value=m.ui[id];period();
   if(m.status==='running'&&!m.paused)j.paused=false;
   summarize(j);paint(j);if(m.view==='stats')await open();
   requestAnimationFrame(()=>{if(valid(j))d.querySelector('.ps-body').scrollTop=m.scroll||0;});
   if((m.status==='running'||repair)&&!j.paused)void execute(j);else if(j.paused){makeTask(j);paint(j);}
   else if(j.finished&&QuickJiraBusy.docked){makeTask(j);const p=progress(j),partial=!!j.error||!!j.warnings.length||j.issues.some(t=>t.error);j.task({label:partial?'Thống kê cần xử lý':'Thống kê hoàn tất',error:partial,done:p.done,total:p.total===null?undefined:p.total,overallPercent:QuickJiraEta.overall(j.phase,p.done,p.total)});j.receiptHandle=j.task;j.task=null;}
  }catch(e){if(owner===user&&seq===token)$('psState').textContent='Chưa khôi phục được dữ liệu đã lưu. Có thể chạy thống kê mới.';}
 }
 function login(user){owner=String(user?.username||'');clear();$('projectStatsBtn').classList.toggle('hidden',!owner);const token=seq;restoring=restore(owner,token).finally(()=>{if(seq===token)restoring=null;});}
 function logout({preserve=false}={}){const previous=owner;owner='';clear();if(previous&&!preserve)void QuickJiraReportStorage.clear(previous).catch(()=>{});if(d.open)d.close();$('projectStatsBtn').classList.add('hidden');}
 async function open(){if(!owner||QuickJiraBusy.active)return;origin=document.activeElement;closeDesktopEditor();closeAllToolOverlays({restore:true});QuickJiraStatsScroll.lock();if(!d.open)d.showModal();document.documentElement.classList.add('project-stats-open');document.body.classList.add('project-stats-open');$('psClose').focus({preventScroll:true});
  if(job)paint(job);if(projectsLoaded)return;const token=seq;try{const data=await api('/api?action=jira-search-options');if(token!==seq)return;projectsLoaded=true;$('psProjects').innerHTML=data.projects.map(p=>`<option value="${esc(p.key)}" label="${esc(p.name)}"></option>`).join('');if(data.warnings.length&&!job)$('psState').textContent='Có thể nhập trực tiếp mã dự án để thống kê.';}catch(e){if(token===seq&&!job)$('psState').textContent=e.message;}
 }
 function render(){if(!report)return;const filter=$('psPerson').value;let people=report.people.filter(p=>!filter||p.id===filter);const sort=$('psSort').value;people.sort(sort==='name'?(a,b)=>a.name.localeCompare(b.name):sort==='tasks'?(a,b)=>b.subtasks-a.subtasks||b.seconds-a.seconds:(a,b)=>b.seconds-a.seconds);
  $('psKpis').innerHTML=[['Tổng giờ',fmt(report.seconds)],['Thành viên có log',report.people.length],['Subtask duy nhất',report.subtasks]].map(([a,b])=>`<article><small>${a}</small><strong>${esc(b)}</strong></article>`).join('');
  const max=Math.max(1,...report.people.map(p=>p.seconds));
  $('psPeople').innerHTML=people.length?people.map(p=>`<button type="button" class="ps-person" data-person="${esc(p.id)}" aria-expanded="${selected===p.id}"><div class="ps-person-head"><strong>${esc(p.name)}</strong><b>${fmt(p.seconds)} <span aria-hidden="true">›</span></b></div><div class="ps-meter" aria-hidden="true"><i style="width:${p.seconds/max*100}%"></i></div><div class="ps-meta"><span>${p.subtasks} Subtask đã log · ${p.share.toLocaleString('vi-VN',{maximumFractionDigits:1})}% tổng giờ</span><span>${p.regular?fmt(p.regular)+' thường · ':''}${p.overtime?fmt(p.overtime)+' OT · ':''}${p.unknown?fmt(p.unknown)+' chưa rõ OT':''}</span></div></button>`).join(''):'<p>Không có worklog trong kỳ đã chọn.</p>';
  detail();
 }
 function detail(){const p=report?.people.find(p=>p.id===selected);$('psDetail').hidden=!p;if(!p)return;
  $('psDetail').innerHTML=`<div class="ps-detail-head"><h3>${esc(p.name)}</h3><button id="psDetailClose" class="text-btn" type="button">Thu gọn</button></div>`+p.issues.map(t=>`<details class="ps-task"><summary><span><strong>${window.QuickJiraIssueIcons?.html(t)||''}${esc(t.key)}</strong> · ${t.isSubtask?'Subtask':'Công việc khác'}<small>${esc(t.summary)}</small></span><b>${fmt(t.seconds)}</b></summary>${t.logs.sort((a,b)=>a.start.localeCompare(b.start)).map(w=>`<div class="ps-log"><div><strong>${esc(w.date.split('-').reverse().join('/'))} · ${esc(new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(w.start)))}</strong><span>${esc(w.description||'Không có mô tả')}</span></div><b>${fmt(w.seconds)}<small>${w.overtimeKnown?(w.overtime?'OT':'Thường'):'Chưa rõ OT'}</small></b></div>`).join('')}</details>`).join('');
  $('psDetailClose').onclick=()=>{selected='';render();};
 }
 function progress(j){
  const discovery=j.phase==='issues',ot=j.phase==='overtime',done=discovery?j.issues.length:ot?j.verified.size:j.issues.filter(t=>t.done||t.error).length,total=discovery?j.total:ot?j.items.size:j.issues.length;
  const percent=total===null?'—':total===0?'100':String(Math.floor(Math.min(1,done/total)*100));
  return {done,total,percent,label:discovery?'Tìm công việc':ot?'Đối chiếu Overtime':'Đọc giờ làm'};
 }
 function paint(j){
  if(job!==j)return;
  if(j.running&&!j.paused&&j.lastPaint&&performance.now()-j.lastPaint<80){if(!j.paintTimer)j.paintTimer=setTimeout(()=>{j.paintTimer=0;paint(j);},80);return;}
  clearTimeout(j.paintTimer);j.paintTimer=0;j.lastPaint=performance.now();
  const p=progress(j),caption=(j.filter.project||'Tất cả dự án')+' · '+(j.filter.all==='1'?'Toàn thời gian':j.filter.from.split('-').reverse().join('/')+'–'+j.filter.to.split('-').reverse().join('/'))+(j.resumeNotice?' · '+j.resumeNotice:'');
  j.eta||=QuickJiraEta.create();
  const eta=QuickJiraEta.update(j.eta,{phase:j.phase,done:p.done,total:p.total,now:performance.now(),running:j.running,paused:j.paused});
  const etaText=j.running&&!j.paused?QuickJiraEta.label(eta,j.phase):'';
  const errors=j.issues.filter(t=>t.error).map(t=>t.key+': '+t.error);
  const status=j.recovering?'Đang khôi phục tiến độ':j.running?(j.paused?'Đang tạm dừng…':p.label):j.paused?'Đã tạm dừng':j.error||errors.length||j.warnings.length?'Dữ liệu tạm tính — cần xử lý':'Đã tải xong dữ liệu được phép xem';
  if(matches(j)){
   $('psState').innerHTML=`<div class="ps-progress-head"><span>${j.running?'<i class="ps-spinner" aria-hidden="true"></i>':''}<strong>${esc(status)}</strong></span><b>${p.done}/${p.total??'?'} · ${p.percent}%</b></div><div class="ps-progress-track" aria-hidden="true"><i style="width:${p.percent==='—'?15:p.percent}%"></i></div><small>${esc(caption)}</small>${etaText?'<small class="ps-eta">'+esc(etaText)+'</small>':''}`;
   $('psContent').hidden=j.running&&!report;$('projectStatsDialog').classList.toggle('ps-is-loading',j.running&&!report);
   let unknown=0;if(report)for(const item of j.items.values())if(!item.overtimeKnown)unknown+=item.seconds;
   if(j.running&&j.phase==='overtime')for(const node of $('psPeople').querySelectorAll('.ps-meta>span:last-child'))if(node.textContent!=='Đang đối chiếu Overtime…')node.textContent='Đang đối chiếu Overtime…';
   const warnings=[...new Set([...j.warnings,...errors,j.error,j.storageWarning,unknown?fmt(unknown)+' chưa xác định Overtime; vẫn cộng vào tổng giờ.':''])].filter(Boolean);
   $('psWarning').hidden=!warnings.length;$('psWarning').textContent=warnings.join(' ');
  }else $('psState').textContent='Bộ lọc chưa áp dụng. Tác vụ nền vẫn dùng bộ lọc đã bấm Xem thống kê.';
  $('psPause').hidden=!j.running&&!j.paused;$('psPause').disabled=j.running&&j.paused;$('psPause').textContent=j.paused?'Tiếp tục':'Tạm dừng';
  $('psRetry').hidden=j.running||j.paused||(!j.error&&!errors.length);$('psLoad').disabled=false;
  j.task?.update({label:(j.paused?'Đã tạm dừng · ':p.label+' · ')+(j.filter.project||'Tất cả dự án'),...(p.total===null?{detail:'Đang xác định tổng số công việc'}:{done:p.done,total:p.total}),overallPercent:QuickJiraEta.overall(j.phase,p.done,p.total),eta:etaText,status:j.paused?'paused':''});
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
   const pageOffset=t.offset,d=await request(j,{op:'worklogs',key:t.key,startAt:t.offset,ot:'0'});if(!valid(j))return;
   if(d.key!==t.key||!Array.isArray(d.ids)||d.ids.some(id=>t.ids.has(id))||(d.hasMore&&d.nextStartAt<=t.offset))throw Error('Trang worklog bị lặp hoặc không tiến lên.');
   if(t.total!==null&&t.total!==d.total)j.warnings.push(t.key+': worklog thay đổi trong lúc tải; cần đối chiếu lại.');
   t.total=d.total;for(const id of d.ids)t.ids.add(id);
   for(const x of d.items)j.items.set(x.id,{...x,project:t.project,summary:t.summary,isSubtask:t.isSubtask,issueType:t.issueType,issueTypeId:t.issueTypeId});
   t.offset=d.nextStartAt;t.done=!d.hasMore;await checkpoint(j,{key:'logs|'+t.key+'|'+pageOffset,kind:'logs',issue:t.key,offset:pageOffset,payload:d});if(valid(j))paint(j);
  }
 }
 async function execute(j){
  if(!valid(j)||j.running)return;j.running=true;j.recovering=false;j.finished=false;j.paused=false;j.error='';working=true;if(!j.task)makeTask(j);paint(j);
  try{
   while(j.phase==='issues'&&valid(j)&&!j.paused){
    const pageOffset=j.offset,d=await request(j,{op:'issues',startAt:j.offset});if(!valid(j))return;
    if(j.total!==null&&j.total!==d.total)j.warnings.push('Danh sách công việc thay đổi trong lúc tải; cần đối chiếu lại.');
    if(d.issues.some(t=>j.keys.has(t.key))||(d.hasMore&&d.nextStartAt<=j.offset))throw Error('Trang công việc bị lặp hoặc không tiến lên.');
    j.total=d.total;for(const t of d.issues)addIssue(j,t);
    j.offset=d.nextStartAt;if(!d.hasMore)j.phase='worklogs';await checkpoint(j,{key:'issues|'+pageOffset,kind:'issues',offset:pageOffset,payload:d});if(valid(j))paint(j);
   }
   if(j.phase==='worklogs'&&!j.paused){
    const queue=j.issues.filter(t=>!t.done&&!t.error);let next=0;
    const worker=async()=>{while(valid(j)&&!j.paused){const t=queue[next++];if(!t)return;t.inflight=true;
     try{await readIssue(j,t);}catch(e){if(valid(j))t.error=e.message;}finally{t.inflight=false;if(valid(j))paint(j);}
    }};
    await Promise.all(Array.from({length:5},worker));
    if(valid(j)&&!j.paused){summarize(j);j.phase='overtime';await checkpoint(j);paint(j);}
   }
   if(j.phase==='overtime'&&!j.paused){
    const pending=[...j.items.keys()].filter(id=>!j.verified.has(id)),chunks=[];
    if(pending.length)chunks.push(pending.slice(0,1));
    for(let i=1;i<pending.length;i+=50)chunks.push(pending.slice(i,i+50));let cursor=0;
    const verify=async()=>{while(valid(j)&&!j.paused&&cursor<chunks.length){const ids=chunks[cursor++],d=await request(j,{op:'overtime',ids:ids.join(','),reader:j.otReader||'auto'});if(!valid(j))return;
     if(d.reader==='native'||(d.reader==='direct'&&j.otReader!=='native'))j.otReader=d.reader;
     if(!Array.isArray(d.items)||d.items.length!==ids.length||new Set(d.items.map(x=>x.id)).size!==ids.length||d.items.some(x=>!ids.includes(x.id)))throw Error('Kết quả đối chiếu OT chưa khớp worklog.');
     for(const x of d.items){Object.assign(j.items.get(x.id),x);j.verified.add(x.id);}
     await checkpoint(j,{key:'ot|'+ids[0],kind:'ot',payload:d.items});if(valid(j))paint(j);
    }};
    // First group negotiates the compatible reader once; then fill two lanes.
    const first=chunks.length?chunks.splice(1):[];
    const initial=await Promise.allSettled([verify()]);
    for(const r of initial)if(r.status==='rejected'&&valid(j))j.error=r.reason.message;
    if(valid(j)&&!j.paused&&!j.error){chunks.push(...first);const verified=await Promise.allSettled([verify(),verify()]);for(const r of verified)if(r.status==='rejected'&&valid(j))j.error=r.reason.message;}
   }
  }catch(e){if(valid(j))j.error=e.message;}
  finally{if(valid(j)){j.running=false;j.finished=!j.paused;working=false;await checkpoint(j);summarize(j);paint(j);if(!j.paused){const p=progress(j),partial=!!j.error||!!j.warnings.length||j.issues.some(t=>t.error);j.task?.({label:partial?'Thống kê cần xử lý':'Thống kê hoàn tất',error:partial,done:p.done,total:p.total===null?undefined:p.total,overallPercent:QuickJiraEta.overall(j.phase,p.done,p.total),detail:partial?'Có dữ liệu chưa đọc được':'Đã hoàn tất'});j.receiptHandle=j.task;j.task=null;}}}
 }
 async function load(){
  if(!owner||QuickJiraBusy.active)return;if(restoring)await restoring;const f=filter();
  if(($('psScope').value==='one'&&!f.project)||(f.project&&!/^[A-Z][A-Z0-9_]{0,99}$/.test(f.project))||(f.all!=='1'&&(!QuickJiraUi.validDate(f.from)||!QuickJiraUi.validDate(f.to)||f.to<f.from))){$('psState').textContent='Nhập mã dự án và khoảng ngày hợp lệ.';return;}
  if(job?.running&&matches(job))return;
  stopJob();seq++;report=null;items=[];selected='';$('psContent').hidden=true;$('psWarning').hidden=true;d.querySelector('.ps-body').scrollTop=0;
  job={filter:Object.freeze(f),owner,controller:new AbortController(),offset:0,total:null,phase:'issues',issues:[],keys:new Set(),items:new Map(),warnings:[],paused:false,running:false,error:'',task:null,runID:crypto.randomUUID(),verified:new Set(),storageDisabled:false};const current=job;try{await QuickJiraReportStorage.start(owner,meta(current));}catch(e){current.storageWarning=storageMessage(e);current.storageDisabled=true;}if(valid(current)){void execute(current);}
 }
 function changed(){period();if(job){report=null;$('psContent').hidden=true;if(!job.running)summarize(job);paint(job);}}
 $('psPause').onclick=()=>{if(!job)return;if(job.paused&&!job.running)void execute(job);else{job.paused=true;paint(job);}};
 $('psRetry').onclick=()=>{if(!job||job.running)return;for(const t of job.issues)t.error='';if(job.phase!=='issues')job.phase='worklogs';void execute(job);};
 $('psForm').onsubmit=e=>{e.preventDefault();void load();};for(const id of ['psScope','psProject','psPeriod','psAnchor','psYear','psFrom','psTo'])$(id).addEventListener('change',changed);
 $('psPerson').onchange=()=>{selected='';render();};$('psSort').onchange=render;$('psPeople').onclick=e=>{const b=e.target.closest('[data-person]');if(!b)return;selected=selected===b.dataset.person?'':b.dataset.person;render();if(selected)$('psDetail').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});};
 $('psClose').onclick=()=>{if(!QuickJiraBusy.active)d.close();};d.addEventListener('cancel',e=>{if(QuickJiraBusy.active)e.preventDefault();});d.addEventListener('keydown',e=>e.stopPropagation());d.addEventListener('close',()=>{document.documentElement.classList.remove('project-stats-open');document.body.classList.remove('project-stats-open');origin?.focus({preventScroll:true});});
 $('projectStatsBtn').onclick=open;$('mobileProjectStatsBtn').onclick=open;
 document.addEventListener('visibilitychange',()=>{if(document.hidden)void flush();else if(job?.running){job.eta=QuickJiraEta.create();paint(job);}});window.addEventListener('pagehide',()=>{void flush();});
 d.addEventListener('close',()=>{void flush();});
 setInterval(()=>{if(job?.running&&!document.hidden)paint(job);},1000);
 if(typeof state!=='undefined'&&state.user)login(state.user);return {login,logout,open,flush,get restoring(){return !!restoring;},get running(){return !!job?.running;},get paused(){return !!job?.paused;}};
})();
