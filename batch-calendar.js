'use strict';
window.QuickJiraBatch=(()=>{
 const P=QuickJiraBatchPlan;let job=null,preparing=false;
 const lockedControls=['calendarPrevBtn','calendarNextBtn','calendarTodayBtn','calendarDate','calendarMonthBtn','calendarWeekBtn','calendarViewerBtn','calendarRefreshBtn','historyListViewBtn'];
 const busy=()=>preparing||job?.running;
 function plans(){
  const rows=calendarPreviewItems().filter(x=>x.batchNew),by=new Map();
  for(const x of rows){let p=by.get(x.key);if(!p){p={key:x.key,project:x.project,description:x.description,summary:x.summary,date:x.date,segments:[]};by.set(x.key,p);}if(p.date!==x.date)throw Error('Một Subtask không được nằm ở hai ngày khác nhau.');p.segments.push({start:x.start,minutes:QuickJiraDrafts.seconds(x)/60});}
  return [...by.values()].map(p=>({...p,minutes:p.segments.reduce((n,s)=>n+s.minutes,0),segments:p.segments.sort((a,b)=>a.start.localeCompare(b.start))}));
 }
 function update(){if(!job)return;const rows=plans();$('historySummary').textContent=`${rows.length} Subtask nháp · Giờ đã log được khóa`;job.unused=Math.max(0,job.dates.reduce((n,d)=>n+P.free(job.occupied[d]).reduce((n,s)=>n+s.end-s.start,0),0)-rows.reduce((n,p)=>n+p.minutes,0));const pending=rows.filter(p=>!job.status[p.key]);$('batchPreviewTitle').textContent=`Xem trước · ${job.mode==='week'?'T2–T6':'Theo ngày'} · ${pending.length} Subtask chưa log`;
  $('batchPreviewState').textContent=[job.unplaced.length?`${job.unplaced.length} chưa phân bổ: ${job.unplaced.map(x=>x.key+' — '+x.reason).join('; ')}`:'',job.unused?`${minutesLabel(job.unused)} chưa dùng trong phạm vi`:'' ,'Mỗi Subtask chỉ trong một ngày · Kéo block để chỉnh, chỉ ghi sau xác nhận.'].filter(Boolean).join(' · ');
  $('batchPreviewSave').disabled=job.running||!pending.length;$('batchConfirmSave').disabled=job.running||!pending.length;
  $('batchPreviewBack').disabled=job.running;$('batchPreviewBack').textContent='Đóng';$('batchPreviewBack').title='Đóng lịch xem trước';
  $('batchConfirmRows').replaceChildren(...rows.map(p=>{const el=document.createElement('p');el.textContent=`${p.key} · ${logWeekday(p.date)} ${p.date} · ${p.segments.map(s=>s.start+'–'+P.time(P.minute(s.start)+s.minutes)).join(', ')} · ${minutesLabel(p.minutes)} · ${job.status[p.key]||job.errors?.[p.key]||'Chưa log'}${job.notes?.[p.key] ? ' · '+job.notes[p.key] : ''}`;const link=document.createElement('a');link.href='https://task.ascvn.com.vn/browse/'+encodeURIComponent(p.key);link.textContent=' Mở Jira ↗';link.target='_blank';link.rel='noopener noreferrer';el.append(link);return el;}));
  $('batchConfirmError').textContent=[job.error,job.unplaced.length?`${job.unplaced.length} Subtask chưa phân bổ sẽ KHÔNG được log: ${job.unplaced.map(x=>x.key).join(', ')}`:''].filter(Boolean).join(' · ');
 }
 function validateDrop(item,drop){if(!job||drop.problem)return drop;
  try{
   const changed=drop.changes||[];
   if(changed.some(x=>!x.batchNew||job.status[x.key]))throw Error('Worklog đã có/đã gửi được khóa trong màn hình xem trước.');
   const changes=new Map(changed.map(x=>[QuickJiraDrafts.key(x),x])),own=new Set((item.calendarDragParts||[item]).map(QuickJiraDrafts.key));own.add(QuickJiraDrafts.key(item));
   let rows=calendarPreviewItems().filter(x=>!own.has(QuickJiraDrafts.key(x))&&!changes.has(QuickJiraDrafts.key(x)));
   rows.push(...changed);const grouped=new Map();
   for(const x of rows.filter(x=>x.batchNew)){let p=grouped.get(x.key);if(!p){p={key:x.key,date:x.date,segments:[]};grouped.set(x.key,p);}if(p.date!==x.date)throw Error('Phải chuyển toàn bộ các phần của Subtask sang cùng ngày.');p.segments.push({start:x.start,minutes:QuickJiraDrafts.seconds(x)/60});}
   P.validate([...grouped.values()],job.occupied,job.dates);
  }catch(e){return {...drop,problem:e.message};}return drop;
 }
 async function readOccupied(dates,owner,onProgress=()=>{}){
  const occupied={};let cursor=0,done=0;
  await Promise.all(Array.from({length:Math.min(2,dates.length)},async()=>{while(cursor<dates.length){const d=dates[cursor++],data=await api(`/api?action=day-audit&date=${d}&force=1`);if(state.user!==owner)throw Error('Tài khoản đã thay đổi.');if(!Array.isArray(data.occupied))throw Error('Chưa đọc được đầy đủ giờ đã log.');occupied[d]=data.occupied;onProgress(++done);}}));return occupied;
 }
 async function prepare(){
  if(busy()||state.bulkSubmitInFlight)return;
  if(state.calendarDrafts.size)return showToast('Lưu hoặc bỏ các chỉnh sửa lịch hiện tại trước khi phân bổ.');
  const items=bulkDraftList().map(x=>({...x,minutes:parseTimeSpentClient(x.timeSpent)}));
  if(!items.length)return showToast('Chọn ít nhất một Subtask.');
  if(items.some(x=>x.overtime))return showToast('Phân bổ lịch chỉ dùng giờ thường. Bỏ chọn OT; log OT bằng luồng hiện tại.');
  const mode=$('bulkPeriod').value,date=$('bulkDate').value,owner=state.user;let dates;try{dates=P.days(date,mode);}catch(e){return showToast(e.message);}
  preparing=true;$('bulkRedistributeBtn').disabled=true;$('bulkLogBtn').disabled=true;
  const task=QuickJiraBusy.begin('Đang đối chiếu giờ trống',{blocking:false});
  try{
   const occupied=await readOccupied(dates,owner,done=>task.update({label:'Đối chiếu giờ trống',done,total:dates.length}));
   const result=P.allocate(items,dates,occupied,$('bulkKeepDurations').checked);
   if(!result.plans.length)throw Error('Không phân bổ được Subtask nào. '+result.unplaced.map(x=>x.key+': '+x.reason).join('; '));
   const snapshot={items:state.historyItems,date:$('historyDate').value,loaded:state.historyLoaded,view:state.historyView,mode:state.calendarMode,title:$('historyTitle').textContent,error:state.historyError,notice:state.historyNotice};
   // Occupied ranges come from the authoritative day-audit, including index-delay fallback.
   let existing=dates.flatMap(d=>occupied[d].map((s,i)=>({id:`occupied-${d}-${i}`,key:'ĐÃ LOG',project:'',date:d,start:s.start,end:s.end,minutes:P.minute(s.end)-P.minute(s.start),summary:'Giờ đã log trên Jira · Chỉ xem',description:'Giờ đã log trên Jira',calendarReadOnly:true,overtime:false,overtimeKnown:true})));
   try {
    const data=await api(`/api?action=worklog-history&date=${dates[0]}&endDate=${dates.at(-1)}&force=1`);
    if(state.user!==owner)throw Error('Tài khoản đã thay đổi.');
    if(Array.isArray(data.items)){
     const real=data.items.filter(x=>dates.includes(x.date)).map(x=>({...x,calendarReadOnly:true}));
     const gaps=[];
     for(const fallback of existing){let ranges=[[P.minute(fallback.start),P.minute(fallback.end)]];
      for(const log of real.filter(x=>x.date===fallback.date)){const a=P.minute(log.start),b=a+Number(log.minutes);ranges=ranges.flatMap(([s,e])=>a>=e||b<=s?[[s,e]]:[[s,Math.min(e,a)],[Math.max(s,b),e]].filter(([a,b])=>b>a));}
      ranges.forEach(([s,e],i)=>gaps.push({...fallback,id:fallback.id+'-'+i,start:P.time(s),end:P.time(e),minutes:e-s}));
     }existing=[...real,...gaps];
    }
   }catch(e){if(e.status===401||state.user!==owner)throw e;}
   job={mode,dates,occupied,snapshot,owner,unplaced:result.unplaced,unused:result.unused,status:{},requestIds:{},running:false,error:''};
   state.calendarDrafts.clear();
   state.historyItems=[...existing,...result.plans.map((p,i)=>{const original={...p,id:`new-${i}`,start:p.segments[0].start,end:P.time(P.minute(p.segments[0].start)+p.minutes),timeSpentSeconds:p.minutes*60,batchNew:true,overtime:false,overtimeKnown:true};delete original.segments;
    const target={date:p.date,start:original.start,targetSeconds:p.minutes*60,...(p.segments.length>1?{segments:p.segments.map(s=>({date:p.date,start:s.start,targetSeconds:s.minutes*60}))}:{})};
    state.calendarDrafts.set(QuickJiraDrafts.key(original),{original,target,status:'pending'});return original;})];
   closeMobileEditor();closeDesktopEditor();$('bulkCard').classList.add('hidden');
   resetCalendarViewer();state.historyView='calendar';state.calendarMode='week';state.historyLoaded=true;state.historyError='';state.historyNotice='';$('historyDate').value=dates[0];
   $('historyTitle').textContent='Lịch sắp log';$('historyOverlay').classList.add('batch-preview');$('batchPreviewBar').hidden=false;
   renderWorklogHistory();lockedControls.forEach(id=>{const el=$(id);if(el){el.dataset.batchDisabled=String(el.disabled);el.disabled=true;}});
   openOverlay('historyOverlay','closeHistoryBtn');update();
  }catch(e){showToast(e.message);}finally{preparing=false;task();updateBulkTotal();}
 }
 function review(){if(!job||job.running)return;try{P.validate(plans(),job.occupied,job.dates);job.error='';}catch(e){job.error=e.message;}update();$('batchConfirmDialog').showModal();}
 function freeze(key){for(const x of state.historyItems)if(x.key===key){x.calendarReadOnly=!!job.status[key];x.batchStatus=job.status[key];}for(const d of state.calendarDrafts.values())if(d.original.key===key){d.original.calendarReadOnly=!!job.status[key];d.original.batchStatus=job.status[key];}}
 async function save(){
  if(!job||job.running||job.owner!==state.user)return;
  const current=job,all=plans(),pending=all.filter(p=>!job.status[p.key]);if(!pending.length)return;
  current.running=true;current.error='';state.calendarMovePending=true;update();$('batchConfirmSave').disabled=true;
  try{
   // Preflight the complete chosen scope before the first mutation, then the server checks every exact write again.
   const occupied=await readOccupied([...new Set(pending.map(p=>p.date))],current.owner);
   P.validate(pending,occupied,job.dates);
   for(const p of pending){
    if(state.user!==current.owner)throw Error('Phiên đăng nhập đã thay đổi.');
    const requestId=current.requestIds[p.key]||=createRequestId('batch-plan');
    const body={date:p.date,requestId,items:[{key:p.key,project:p.project,timeSpent:p.minutes+'m',description:p.description||p.summary,overtime:false}],exactPlan:[{key:p.key,date:p.date,segments:p.segments}]};
    current.status[p.key]='Đang gửi';freeze(p.key);update();
    try{const result=await api('/api?action=bulk-worklog',{method:'POST',requestId,body:JSON.stringify(body)});const warnings=(result.transitions||[]).filter(x=>x.ok===false).map(x=>x.message||'Chưa chuyển được trạng thái Jira');if(warnings.length)(current.notes||={})[p.key]=warnings.join('; ');current.status[p.key]='Đã log';freeze(p.key);}
    catch(e){
     // A lost response/rollback failure must never be resent automatically, even after the idempotency TTL.
     if([400,403,404,409,422].includes(e.status)&&!e.details?.resultUnknown){delete current.status[p.key];(current.errors||={})[p.key]='Lỗi, chưa log';}else current.status[p.key]='Cần kiểm tra Jira';freeze(p.key);current.error=`${p.key}: ${e.message}. ${current.status[p.key] ? 'Dòng này đã khóa để tránh gửi trùng.' : 'Có thể chỉnh hoặc xác nhận thử lại dòng này.'} Các dòng chưa gửi được giữ lại.`;break;
    }
    invalidateHistoryCache();invalidateDayAuditCache(p.date);update();
   }
   if(!current.error)showToast(Object.values(current.status).some(x=>x!=='Đã log')?'Đã log phần chưa gửi; vẫn có dòng cần kiểm tra Jira.':'Đã log thành công toàn bộ lịch xem trước.');
  }catch(e){current.error=e.message;}
  finally{current.running=false;state.calendarMovePending=false;$('batchConfirmSave').disabled=false;renderWorklogHistory();update();void refreshDashboard({force:true});}
 }
 function back(){if(!job||job.running)return;if(!window.confirm('Rời lịch xem trước? Bản nháp chưa log sẽ được bỏ; các worklog đã ghi được giữ nguyên.'))return;
  resetCalendarInteraction();$('batchConfirmDialog').close();const s=job.snapshot;job=null;state.calendarDrafts.clear();state.historyItems=s.items;state.historyLoaded=s.loaded;state.historyView=s.view;state.calendarMode=s.mode;state.historyError=s.error;state.historyNotice=s.notice;$('historyDate').value=s.date;$('historyTitle').textContent=s.title;
  lockedControls.forEach(id=>{const el=$(id);if(el){el.disabled=el.dataset.batchDisabled==='true';delete el.dataset.batchDisabled;}});
  $('historyOverlay').classList.remove('batch-preview');$('batchPreviewBar').hidden=true;closeOverlay('historyOverlay');void exitCalendarFullscreen();
  // Never reuse the old source list after a partial/successful creation.
  resetBulkState({animate:false});void loadFilterIssues({quiet:true});
 }
 $('batchPreviewSave').addEventListener('click',review);$('batchPreviewBack').addEventListener('click',back);$('batchConfirmSave').addEventListener('click',save);
 $('batchConfirmClose').addEventListener('click',()=>{if(!job?.running)$('batchConfirmDialog').close();});$('batchConfirmDialog').addEventListener('cancel',e=>{if(job?.running)e.preventDefault();});
 return {prepare,review,back,save,update,validateDrop,clearOnLogout(){if(job){$('historyTitle').textContent=job.snapshot.title;lockedControls.forEach(id=>{const el=$(id);if(el){el.disabled=el.dataset.batchDisabled==='true';delete el.dataset.batchDisabled;}});job.running=false;job=null;state.calendarDrafts.clear();$('historyOverlay').classList.remove('batch-preview');$('batchPreviewBar').hidden=true;$('batchConfirmDialog').close();}},get canSave(){return !!job&&!job.running&&plans().some(p=>!job.status[p.key]);},get active(){return !!job;},get running(){return busy();},get job(){return job;}};
})();
