'use strict';
window.QuickJiraBatch=(()=>{
 const P=QuickJiraBatchPlan,R=QuickJiraBatchReview;let job=null,preparing=false,draftKey='';
 const lockedControls=['calendarPrevBtn','calendarNextBtn','calendarTodayBtn','calendarDate','calendarMonthBtn','calendarWeekBtn','calendarViewerBtn','calendarRefreshBtn','historyListViewBtn'];
 const busy=()=>preparing||job?.running;
 function plans(){
  const rows=calendarPreviewItems().filter(x=>x.batchNew),by=new Map();
  for(const x of rows){let p=by.get(x.key);if(!p){p={key:x.key,allowOverlap:job?.approved?.[x.key]===true,project:x.project,description:x.description,summary:x.summary,date:x.date,segments:[]};by.set(x.key,p);}if(p.date!==x.date)throw Error('Một Subtask không được nằm ở hai ngày khác nhau.');p.segments.push({start:x.start,minutes:QuickJiraDrafts.seconds(x)/60});}
  return [...by.values()].map(p=>({...p,minutes:p.segments.reduce((n,s)=>n+s.minutes,0),segments:p.segments.sort((a,b)=>a.start.localeCompare(b.start))}));
 }
 function update(){if(!job)return;const rows=plans();$('historySummary').textContent=`${rows.length} Subtask nháp · Giờ đã log được khóa`;job.unused=job.dates.reduce((n,date)=>n+P.free([...(job.occupied[date]||[]),...rows.filter(p=>p.date===date).flatMap(p=>p.segments.map(s=>({start:s.start,end:P.time(P.minute(s.start)+s.minutes)})))]).reduce((n,s)=>n+s.end-s.start,0),0);const pending=rows.filter(p=>!job.status[p.key]);$('batchPreviewTitle').textContent=`${pending.length} Subtask chưa log${job.unplaced.length?' · '+job.unplaced.length+' chưa xếp':''}`;
  $('batchPreviewState').textContent=[job.unplaced.length?`${job.unplaced.length} chưa phân bổ: ${job.unplaced.map(x=>x.key+' — '+x.reason).join('; ')}`:'',`${job.reviewDates[0].slice(8,10)}/${job.reviewDates[0].slice(5,7)}–${job.reviewDates.at(-1).slice(8,10)}/${job.reviewDates.at(-1).slice(5,7)}${job.unused?' · Trống '+minutesLabel(job.unused):''}`].filter(Boolean).join(' · ');
  $('batchPreviewSave').textContent='Xác nhận log';
  $('batchPreviewSave').disabled=job.running||!pending.length;$('batchConfirmSave').disabled=job.running||!pending.length;
  $('batchPreviewBack').disabled=job.running;$('batchPreviewBack').textContent='Đóng';$('batchPreviewBack').title='Đóng lịch xem trước';
  $('batchConfirmRows').replaceChildren(...rows.map(p=>{const el=document.createElement('p');el.textContent=`${p.key} · ${logWeekday(p.date)} ${p.date} · ${p.segments.map(s=>s.start+'–'+P.time(P.minute(s.start)+s.minutes)).join(', ')} · ${minutesLabel(p.minutes)} · ${job.status[p.key]||job.errors?.[p.key]||'Chưa log'}${p.allowOverlap?' · ⚠ Xếp trùng đã xác nhận':''}${job.notes?.[p.key] ? ' · '+job.notes[p.key] : ''}`;const link=document.createElement('a');link.href='https://task.ascvn.com.vn/browse/'+encodeURIComponent(p.key);link.textContent=' Mở Jira ↗';link.target='_blank';link.rel='noopener noreferrer';el.append(link);return el;}));
  $('batchConfirmError').textContent=[job.error,job.removed?.length?'Đã bỏ khỏi lịch: '+job.removed.join(', '):'',rows.some(x=>x.allowOverlap)?'⚠ Có lịch xếp trùng đã chấp nhận; khi xác nhận sẽ ghi đúng vị trí này.':'',job.unplaced.length?`${job.unplaced.length} Subtask chưa phân bổ sẽ KHÔNG được log: ${job.unplaced.map(x=>x.key).join(', ')}`:''].filter(Boolean).join(' · ');
 }
 function syncOverlapMarks(accepted=[]){
  for(const hit of accepted)for(const key of [hit.key,hit.with])if(state.historyItems.some(x=>x.batchNew&&x.key===key)&&!job.status[key])job.approved[key]=true;
  const hits=R.collisions(plans(),job.occupied),active=new Set(hits.flatMap(x=>[x.key,x.with]));
  for(const original of state.historyItems.filter(x=>x.batchNew)){
   if(!active.has(original.key))job.approved[original.key]=false;
   original.batchOverlap=job.approved[original.key]===true;
  }
 }
 function reviewOptions(){return {occupied:job.occupied,allowed:job.dates,locked:Object.keys(job.status)};}
 function enrich(proposal){
  const roots=new Map(state.historyItems.filter(x=>x.batchNew).map(x=>[x.key,x]));
  const changes=(proposal.plans||[]).flatMap(p=>{
   const original=roots.get(p.key);if(!original)return [];
   const target={date:p.date,start:p.segments[0].start,targetSeconds:p.minutes*60};
   if(p.segments.length>1)target.segments=p.segments.map(s=>({date:p.date,start:s.start,targetSeconds:s.minutes*60}));
   return QuickJiraDrafts.parts({original,target});
  });
  const swaps=calendarPreviewItems().filter(x=>(proposal.swaps||[]).includes(x.key));
  return {...proposal,batchPlans:proposal.plans,segments:proposal.plans?.[0]?.segments.length>1?proposal.plans[0].segments:null,changes,swaps,swap:swaps[0]||null,inputSignature:JSON.stringify(plans())};
 }
 function proposeMove(item,target,hovered){if(!job)return {problem:'Chưa có lịch xem trước.',changes:[]};return enrich(R.move(plans(),item.key,target,{...reviewOptions(),hovered:hovered?.key}));}
 function proposeResize(item,end){if(!job)return {problem:'Chưa có lịch xem trước.',changes:[]};return enrich(R.resize(plans(),item.key,end,reviewOptions()));}
 function validateDrop(item,proposal){return proposal;}
 function stage(item,target,proposal){
  if(!job||busy()||job.status[item.key])return;
  let drop=proposal?.batchPlans?proposal:target?proposeMove(item,target):proposeResize(item,P.minute(proposal?.changes?.[0]?.end||''));
  if(drop.problem)return calendarFeedback(drop.problem,true);
  if(drop.inputSignature!==JSON.stringify(plans()))return calendarFeedback('Bản nháp đã đổi. Kéo lại để xem vị trí mới.',true);
  if(drop.requiresOverlap){
   returnCalendarHoverPreview();
   const labels=[...new Set(drop.collisions.map(x=>x.key+' ↔ '+x.with))].join(', ');
   if(!window.confirm('Không đủ chỗ để thay thế. Vị trí sẽ xếp trùng: '+labels+'. Các lịch khác được giữ nguyên. Vẫn xếp vào vị trí này ở bản xem trước?'))return;
  }
  if(drop.swaps.length)updateCalendarHoverPreview(null,drop);
  for(const p of drop.batchPlans){
   const original=state.historyItems.find(x=>x.batchNew&&x.key===p.key);if(!original||job.status[p.key])continue;
   const target={date:p.date,start:p.segments[0].start,targetSeconds:p.minutes*60};
   if(p.segments.length>1)target.segments=p.segments.map(s=>({date:p.date,start:s.start,targetSeconds:s.minutes*60}));
   job.approved[p.key]=p.allowOverlap===true;
   original.batchOverlap=p.allowOverlap===true;
   state.calendarDrafts.set(QuickJiraDrafts.key(original),{original,target,status:'pending'});
  }
  syncOverlapMarks(drop.requiresOverlap?drop.collisions:[]);
  calendarKeepHoverOnRender=!!drop.swap;
  try{renderCalendarDrafts();}finally{calendarKeepHoverOnRender=false;}
  if(drop.swap)finishCalendarHoverDrop();else returnCalendarHoverPreview();
  calendarFeedback(drop.requiresOverlap?'Đã xếp trùng ở bản xem trước · Chưa ghi Jira.':drop.swap?'Đã đổi chỗ nhóm lịch · Chưa ghi Jira.':'Đã chỉnh lịch xem trước · Chưa ghi Jira.');
 }
 function openDraft(item){
  if(!job||busy()||!item.batchNew||job.status[item.key])return;
  const p=plans().find(x=>x.key===item.key);if(!p)return;draftKey=item.key;
  $('batchDraftTitle').textContent=p.key;
  $('batchDraftMeta').textContent=p.date+' · '+minutesLabel(p.minutes)+' · '+p.segments.map(s=>s.start+'–'+P.time(P.minute(s.start)+s.minutes)).join(', ');
  $('batchDraftDialog').showModal();
 }
 function removeDraft(){
  if(!job||busy()||job.status[draftKey])return;
  state.historyItems=state.historyItems.filter(x=>!x.batchNew||x.key!==draftKey);
  for(const [id,d] of state.calendarDrafts)if(d.original.key===draftKey)state.calendarDrafts.delete(id);
  job.removed.push(draftKey);delete job.approved[draftKey];$('batchDraftDialog').close();
  syncOverlapMarks();resetCalendarInteraction();renderCalendarDrafts();showToast('Đã bỏ '+draftKey+' khỏi lịch xem trước.');
 }
 function prepProgress(done,total,label){
  const percent=Math.max(0,Math.min(100,Math.round(done/total*100)));
  $('bulkPreviewProgress').hidden=false;$('bulkPreviewPhase').textContent=label;
  $('bulkPreviewPercent').textContent=percent+'%';$('bulkPreviewMeter').setAttribute('aria-valuenow',percent);
  $('bulkPreviewMeter').firstElementChild.style.width=percent+'%';$('bulkLogBtn').textContent='Đang xử lý…';
 }
 async function readOccupied(dates,owner,onProgress=()=>{}){
  const occupied={};let cursor=0,done=0,reported=0;
  const report=(n,label)=>{if(state.user===owner&&n>reported){reported=n;onProgress(n,label);}};
  if(dates.length>1){
   let data;
   try{data=await api('/api?action=day-audit&dates='+dates.join(',')+'&force=1',{onProgress:event=>{const percent=Math.max(0,Math.min(100,Number(event.percent)||0));report(dates.length*percent/100,event.phase);}});}catch(e){if(e.code==='RESULT_UNKNOWN')e.message='Kết nối đối chiếu bị gián đoạn. Chưa hoàn tất kiểm tra giờ trống; vui lòng thử lại.';if(![400,404,405].includes(e.status))throw e;}
   if(state.user!==owner)throw Error('Tài khoản đã thay đổi.');
   if(data?.days){
    if(!Array.isArray(data.days)||data.days.length!==dates.length||new Set(data.days.map(x=>x.date)).size!==dates.length||data.days.some(x=>!dates.includes(x.date)||!Array.isArray(x.occupied)))throw Error('Chưa đọc được đầy đủ giờ đã log.');
    data.days.forEach(x=>{occupied[x.date]=x.occupied;report(++done);});return occupied;
   }
  }
  await Promise.all(Array.from({length:Math.min(2,dates.length)},async()=>{while(cursor<dates.length){const d=dates[cursor++],data=await api(`/api?action=day-audit&date=${d}&force=1`);if(state.user!==owner)throw Error('Tài khoản đã thay đổi.');if(!Array.isArray(data.occupied))throw Error('Chưa đọc được đầy đủ giờ đã log.');occupied[d]=data.occupied;report(++done);}}));return occupied;
 }
 async function prepare(){
  if(busy()||state.bulkSubmitInFlight)return;
  if(state.calendarDrafts.size)return showToast('Lưu hoặc bỏ các chỉnh sửa lịch hiện tại trước khi phân bổ.');
  const items=bulkDraftList().map(x=>({...x,minutes:parseTimeSpentClient(x.timeSpent)}));
  if(!items.length)return showToast('Chọn ít nhất một Subtask.');
  if(!bulkAutoMode() && items.some(x=>x.overtime))return showToast('Phân bổ lịch chỉ dùng giờ thường. Bỏ chọn OT; log OT bằng luồng hiện tại.');
  const mode=bulkPeriodMode(),date=bulkAllocationDate(),owner=state.user;let dates,allocationDates,reviewDates;
  try{
   allocationDates=P.days(date,mode);
   const monday=P.days(date,'week')[0];reviewDates=Array.from({length:7},(_,i)=>{const d=new Date(monday+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);});
   dates=mode==='day'?reviewDates:allocationDates;
  }catch(e){return showToast(e.message);}
  preparing=true;$('bulkLogBtn').disabled=true;
  const controls=[...$('bulkCard').querySelectorAll('input,select,button,textarea')].map(el=>[el,el.disabled]);controls.forEach(([el])=>el.disabled=true);
  prepProgress(0,reviewDates.length+2,'Đối chiếu giờ trống');
  const task=QuickJiraBusy.begin('Đang đối chiếu giờ trống',{blocking:false});
  try{
   if(bulkAutoMode()) items.forEach(x=>{x.overtime=false;});
   const historyPromise=api(`/api?action=worklog-history&date=${reviewDates[0]}&endDate=${reviewDates.at(-1)}&force=1`).then(data=>({data}),error=>({error}));
   const occupied=await readOccupied(reviewDates,owner,(done,label)=>{task.update({label:'Đối chiếu giờ trống',done:Math.floor(done),total:reviewDates.length});prepProgress(done,reviewDates.length+2,label||'Đối chiếu '+Math.floor(done)+'/'+reviewDates.length+' ngày');});
   prepProgress(reviewDates.length,reviewDates.length+2,'Đang tạo lịch nháp');
   const result=P.allocate(items,allocationDates,occupied,!bulkAutoMode());
   if(!result.plans.length)throw Error('Không phân bổ được Subtask nào. '+result.unplaced.map(x=>x.key+': '+x.reason).join('; '));
   const snapshot={bulkScroll:$('bulkItems').scrollTop,items:state.historyItems,date:$('historyDate').value,loaded:state.historyLoaded,view:state.historyView,mode:state.calendarMode,title:$('historyTitle').textContent,error:state.historyError,notice:state.historyNotice};
   // Occupied ranges come from the authoritative day-audit, including index-delay fallback.
   let existing=reviewDates.flatMap(d=>occupied[d].map((s,i)=>({id:`occupied-${d}-${i}`,key:'ĐÃ LOG',project:'',date:d,start:s.start,end:s.end,minutes:P.minute(s.end)-P.minute(s.start),summary:'Giờ đã log trên Jira · Chỉ xem',description:'Giờ đã log trên Jira',calendarReadOnly:true,overtime:false,overtimeKnown:true})));
   try {
    const history=await historyPromise;if(history.error)throw history.error;const data=history.data;
    if(state.user!==owner)throw Error('Tài khoản đã thay đổi.');
    if(Array.isArray(data.items)){
     const real=data.items.filter(x=>reviewDates.includes(x.date)).map(x=>({...x,calendarReadOnly:true}));
     const gaps=[];
     for(const fallback of existing){let ranges=[[P.minute(fallback.start),P.minute(fallback.end)]];
      for(const log of real.filter(x=>x.date===fallback.date)){const a=P.minute(log.start),b=a+Number(log.minutes);ranges=ranges.flatMap(([s,e])=>a>=e||b<=s?[[s,e]]:[[s,Math.min(e,a)],[Math.max(s,b),e]].filter(([a,b])=>b>a));}
      ranges.forEach(([s,e],i)=>gaps.push({...fallback,id:fallback.id+'-'+i,start:P.time(s),end:P.time(e),minutes:e-s}));
     }existing=[...real,...gaps];
    }
   }catch(e){if(e.status===401||state.user!==owner)throw e;}
   prepProgress(reviewDates.length+1,reviewDates.length+2,'Đang mở lịch xem trước');
   job={approved:{},removed:[],mode,dates,allocationDates,reviewDates,sourceDate:date,occupied,snapshot,owner,unplaced:result.unplaced,unused:result.unused,status:{},requestIds:{},running:false,error:''};
   state.calendarDrafts.clear();
   state.historyItems=[...existing,...result.plans.map((p,i)=>{const original={...p,id:`new-${i}`,start:p.segments[0].start,end:P.time(P.minute(p.segments[0].start)+p.minutes),timeSpentSeconds:p.minutes*60,batchNew:true,overtime:false,overtimeKnown:true};delete original.segments;
    const target={date:p.date,start:original.start,targetSeconds:p.minutes*60,...(p.segments.length>1?{segments:p.segments.map(s=>({date:p.date,start:s.start,targetSeconds:s.minutes*60}))}:{})};
    state.calendarDrafts.set(QuickJiraDrafts.key(original),{original,target,status:'pending'});return original;})];
   closeMobileEditor();closeDesktopEditor();$('bulkCard').classList.add('hidden');
   resetCalendarViewer();state.historyView='calendar';state.calendarMode='week';state.historyLoaded=true;state.historyError='';state.historyNotice='';$('historyDate').value=mode==='day'?date:dates[0];
   $('historyTitle').textContent='Lịch sắp log';$('historyOverlay').classList.add('batch-preview');$('batchPreviewBar').hidden=false;
   renderWorklogHistory();lockedControls.forEach(id=>{const el=$(id);if(el){el.dataset.batchDisabled=String(el.disabled);el.disabled=true;}});
   openOverlay('historyOverlay','closeHistoryBtn');update();prepProgress(reviewDates.length+2,reviewDates.length+2,'Đã tạo lịch xem trước');
  }catch(e){showToast(e.message);}finally{preparing=false;controls.forEach(([el,disabled])=>{el.disabled=disabled;});$('bulkPreviewProgress').hidden=true;task();updateBulkTotal();}
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
   // Pending blocks which overlap are created in one request/rollback scope.
   // The server can therefore reject every occupied range without exempting old Jira logs.
   for(const group of R.saveGroups(pending)){
    if(state.user!==current.owner)throw Error('Phiên đăng nhập đã thay đổi.');
    const groupKey=group.map(p=>p.key).sort().join('|'),date=group[0].date;
    const requestId=current.requestIds[groupKey]||=createRequestId('batch-plan');
    const body={date,requestId,items:group.map(p=>({key:p.key,project:p.project,timeSpent:p.minutes+'m',description:p.description||p.summary,overtime:false})),confirmOverlaps:group.some(p=>p.allowOverlap===true),exactPlan:group.map(p=>({key:p.key,date:p.date,segments:p.segments,allowOverlap:p.allowOverlap===true}))};
    group.forEach(p=>{current.status[p.key]='Đang gửi';freeze(p.key);});update();
    try{
     const result=await api('/api?action=bulk-worklog',{method:'POST',requestId,body:JSON.stringify(body)});
     for(const p of group){const warnings=(result.transitions||[]).filter(x=>x.key===p.key&&x.ok===false).map(x=>x.message||'Chưa chuyển được trạng thái Jira');if(warnings.length)(current.notes||={})[p.key]=warnings.join('; ');current.status[p.key]='Đã log';freeze(p.key);}
    }catch(e){
     const known=[400,403,404,409,422].includes(e.status)&&!e.details?.resultUnknown;
     for(const p of group){if(known){delete current.status[p.key];(current.errors||={})[p.key]='Lỗi, chưa log';}else current.status[p.key]='Cần kiểm tra Jira';freeze(p.key);}
     current.error=`${group.map(p=>p.key).join(', ')}: ${e.message}. ${known?'Nhóm chưa log, có thể chỉnh hoặc xác nhận lại.':'Cả nhóm đã khóa để tránh gửi trùng; kiểm tra Jira trước.'} Các nhóm chưa gửi được giữ lại.`;break;
    }
    invalidateHistoryCache();invalidateDayAuditCache(date);update();
   }
   if(!current.error)showToast(Object.values(current.status).some(x=>x!=='Đã log')?'Đã log phần chưa gửi; vẫn có dòng cần kiểm tra Jira.':'Đã log thành công toàn bộ lịch xem trước.');
  }catch(e){current.error=e.message;}
  finally{current.running=false;state.calendarMovePending=false;$('batchConfirmSave').disabled=false;renderWorklogHistory();update();void refreshDashboard({force:true});}
 }
 function back(){if(!job||job.running)return;if(!window.confirm('Rời lịch xem trước? Bản nháp chưa log sẽ được bỏ; các worklog đã ghi được giữ nguyên.'))return;
  const current=job,s=job.snapshot;current.running=true;
  resetCalendarInteraction();$('batchConfirmDialog').close();$('batchDraftDialog').close();void exitCalendarFullscreen();
  const overlay=$('historyOverlay');overlay.setAttribute('aria-hidden','true');
  hideAnimated(overlay,()=>{
   job=null;state.calendarDrafts.clear();state.historyItems=s.items;state.historyLoaded=s.loaded;state.historyView=s.view;state.calendarMode=s.mode;state.historyError=s.error;state.historyNotice=s.notice;$('historyDate').value=s.date;$('historyTitle').textContent=s.title;
   lockedControls.forEach(id=>{const el=$(id);if(el){el.disabled=el.dataset.batchDisabled==='true';delete el.dataset.batchDisabled;}});
   overlay.classList.remove('batch-preview');$('batchPreviewBar').hidden=true;unlockOverlayBody();
   // Return to the same editor only after the overlay has finished closing.
   // Never offer successful/uncertain writes in a new allocation.
   for(const [key,status] of Object.entries(current.status)) if(status){state.bulkSelectedKeys.delete(key);state.bulkDrafts.delete(key);}
   const sent=new Set(Object.keys(current.status));state.filterIssues=state.filterIssues.filter(x=>!sent.has(x.key));renderFilterIssues();
   state.bulkCapacitySeq++;state.bulkCapacity={date:'',regularLoggedMinutes:0,loading:false,error:''};
   renderBulkItems();showAnimated($('bulkCard'));openMobileEditor('bulkCard');openDesktopEditor('bulkCard');
   requestAnimationFrame(()=>{$('bulkItems').scrollTop=s.bulkScroll;});
   if(bulkPeriodMode()==='day') void loadBulkCapacity({force:true});
  });
 }
 $('batchPreviewSave').addEventListener('click',review);$('batchPreviewBack').addEventListener('click',back);$('batchConfirmSave').addEventListener('click',save);
 $('batchConfirmClose').addEventListener('click',()=>{if(!job?.running)$('batchConfirmDialog').close();});$('batchConfirmDialog').addEventListener('cancel',e=>{if(job?.running)e.preventDefault();});
 $('batchDraftClose').addEventListener('click',()=>$('batchDraftDialog').close());$('batchDraftRemove').addEventListener('click',removeDraft);
 return {prepare,review,back,save,update,validateDrop,proposeMove,proposeResize,stage,openDraft,removeDraft,clearOnLogout(){if(job){$('batchDraftDialog').close();$('historyTitle').textContent=job.snapshot.title;lockedControls.forEach(id=>{const el=$(id);if(el){el.disabled=el.dataset.batchDisabled==='true';delete el.dataset.batchDisabled;}});job.running=false;job=null;state.calendarDrafts.clear();$('historyOverlay').classList.remove('batch-preview');$('batchPreviewBar').hidden=true;$('batchConfirmDialog').close();}},get canSave(){return !!job&&!job.running&&plans().some(p=>!job.status[p.key]);},get active(){return !!job;},get running(){return busy();},get job(){return job;}};
})();
