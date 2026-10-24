'use strict';
// Weekly-calendar gestures stage local drafts; only explicit confirmation writes Jira.
const calendarLogHome = document.getElementById('worklogCard').parentElement;
const calendarConfirmHome = document.getElementById('logConfirmOverlay').parentElement;
let calendarEditMode = false;
let calendarGesture = null;
let calendarIgnoreClickUntil = 0;
let calendarDragFrame = 0;
let calendarPickerSeq = 0;
let calendarFocusSource = null;
let calendarRenderedItems = [];
let calendarCloseAfterSave = false;
let calendarSaveControls = [];
let calendarSwapMotion = null;
// Hover is visual only. Logical slots stay in place for stable hit testing.
const calendarHoverMotions = new Map();
let calendarKeepHoverOnRender = false;
let calendarBlockLookup={inner:null,blocks:new Map()};
function calendarEditingTouch(event){
  if(calendarEditMode&&(event.type==='touchstart'?event.target.closest('[data-week-event]'):calendarGesture)&&event.cancelable)event.preventDefault();
}

function calendarBlockFor(item) {
  const inner=$('weeklyCalendar').querySelector('.weekly-inner');
  if(calendarBlockLookup.inner!==inner){
    calendarBlockLookup={inner,blocks:new Map([...$('weeklyCalendar').querySelectorAll('[data-week-event]')].map(el=>[QuickJiraDrafts.key(calendarRenderedItems[Number(el.dataset.weekEvent)]),el]))};
  }
  const node=calendarBlockLookup.blocks.get(QuickJiraDrafts.key(item));
  return node?.isConnected?node:null;
}
function cancelCalendarSwapMotion() {
  const job=calendarSwapMotion;if(!job)return;
  calendarSwapMotion=null;clearTimeout(job.timer);
  job.destination?.classList.remove('is-swap-landing');
  job.animations.forEach(animation=>{try{animation.cancel();}catch{}});job.layer.remove();
}
function cloneCalendarSwapBlock(partner) {
  const clone=partner.cloneNode(true);
  clone.removeAttribute('id');clone.removeAttribute('data-week-event');clone.removeAttribute('aria-label');clone.removeAttribute('title');
  clone.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  clone.classList.remove('is-drag-source','is-swap-landing');clone.classList.add('calendar-swap-flight');
  clone.disabled=true;clone.tabIndex=-1;clone.setAttribute('aria-hidden','true');
  // Freeze appearance before detaching from #historyOverlay: scoped project/OT
  // colors, typography and ribbon rules must also apply on the flying clone.
  const sources=[partner,...partner.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];
  const appearance=['font','color','backgroundColor','borderTopColor','borderRightColor','borderBottomColor','borderLeftColor','borderRadius','padding','gap','letterSpacing','lineHeight'];
  sources.forEach((source,index)=>{
    const computed=getComputedStyle(source),copy=copies[index];
    appearance.forEach(property=>{copy.style[property]=computed[property];});
    if(source.classList.contains('ot-ribbon'))for(const property of ['display','position','top','right','bottom','left','width','height','transform','transformOrigin','textAlign','zIndex'])copy.style[property]=computed[property];
  });
  return clone;
}
function prepareCalendarSwapMotion(drop) {
  cancelCalendarSwapMotion();
  if(!drop.swap||reduceMotionEnabled()||typeof Element.prototype.animate!=='function')return null;
  const partner=calendarBlockFor(drop.swap);
  if(!partner)return null;
  const from=partner.getBoundingClientRect();if(!from.width||!from.height)return null;
  return {item:drop.swap,from,clone:cloneCalendarSwapBlock(partner),primary:drop.changes[0]};
}
function playCalendarSwapMotion(prepared) {
  if(!prepared)return;
  const destination=calendarBlockFor(prepared.item),primary=calendarBlockFor(prepared.primary);
  if(!destination||reduceMotionEnabled())return;
  const to=destination.getBoundingClientRect(),area=$('historyResults').getBoundingClientRect();
  if(!to.width||!to.height||!area.width||!area.height)return;
  const header=$('weeklyCalendar').querySelector('.week-grid-heading')?.getBoundingClientRect();
  const top=Math.min(area.bottom,Math.max(area.top,header?.bottom||area.top));
  const bounds={left:area.left,top,right:area.right,bottom:area.bottom};
  const layer=document.createElement('div');layer.className='calendar-swap-layer';layer.setAttribute('aria-hidden','true');
  layer.style.cssText=`left:${area.left}px;top:${top}px;width:${area.width}px;height:${Math.max(0,area.bottom-top)}px`;
  const clone=prepared.clone;
  Object.assign(clone.style,{left:`${prepared.from.left-area.left}px`,top:`${prepared.from.top-top}px`,width:`${prepared.from.width}px`,height:`${prepared.from.height}px`});
  layer.append(clone);document.body.append(layer);
  const job=calendarSwapMotion={layer,destination,animations:[],scrolls:[$('historyResults'),$('weeklyCalendar').querySelector('.weekly-scroll')].filter(Boolean).map(el=>({el,left:el.scrollLeft,top:el.scrollTop}))};
  try {
    const motion=QuickJiraSwapMotion.flight(prepared.from,to,bounds);
    destination.classList.add('is-swap-landing');
    job.animations.push(clone.animate(motion.frames,{duration:motion.duration,easing:'cubic-bezier(.22,.7,.18,1)',fill:'both'}));
    if(primary)job.animations.push(primary.animate([{opacity:.55,transform:'scale(.98)'},{opacity:1,transform:'scale(1)'}],{duration:200,easing:'ease-out'}));
    const finish=()=>{if(calendarSwapMotion===job)cancelCalendarSwapMotion();};
    Promise.allSettled(job.animations.map(animation=>animation.finished)).then(finish);
    job.timer=setTimeout(finish,motion.duration+160);
  } catch {cancelCalendarSwapMotion();}
}
function cancelSwapOnScroll() {
  if(calendarSwapMotion?.scrolls.some(({el,left,top})=>!el.isConnected||el.scrollLeft!==left||el.scrollTop!==top))cancelCalendarSwapMotion();
  if(!calendarGesture?.dragging&&[...calendarHoverMotions.values()].some(job=>job.scrolls.some(({el,left,top})=>!el.isConnected||el.scrollLeft!==left||el.scrollTop!==top)))cancelCalendarHoverMotion();
}

function calendarMotionScrolls() {
  return [$('historyResults'),$('weeklyCalendar').querySelector('.weekly-scroll')].filter(Boolean).map(el=>({el,left:el.scrollLeft,top:el.scrollTop}));
}
function removeCalendarHoverJob(job) {
  if(calendarHoverMotions.get(job.id)!==job)return;
  calendarHoverMotions.delete(job.id);clearTimeout(job.timer);
  job.node?.classList.remove('is-swap-landing');
  job.animation?.cancel();job.layer.remove();
}
function cancelCalendarHoverMotion() {
  for(const job of [...calendarHoverMotions.values()])removeCalendarHoverJob(job);
}
function calendarHoverSlot(item,node) {
  const oldColumn=node?.closest('.week-day-column'),column=$('weeklyCalendar').querySelector(`[data-calendar-date="${item.date}"]`);
  if(!column||!oldColumn)return null;
  const old=oldColumn.getBoundingClientRect(),rect=node.getBoundingClientRect(),target=column.getBoundingClientRect();
  const scale=target.height/Number(column.parentElement.dataset.minuteRange);
  return {left:target.left+(rect.left-old.left)*target.width/old.width,top:target.top+(QuickJiraDrafts.minute(item.start)-Number(column.dataset.fromMinute))*scale,width:rect.width*target.width/old.width,height:QuickJiraDrafts.seconds(item)/60*scale};
}
function createCalendarHoverJob(item) {
  const node=calendarBlockFor(item);if(!node)return null;
  const clone=cloneCalendarSwapBlock(node);
  // Invisible original remains hit-testable at its logical slot; a clone never
  // steals the pointer or changes which partner the planner sees underneath.
  node.classList.add('is-swap-landing');
  const from=node.getBoundingClientRect(),area=$('historyResults').getBoundingClientRect();
  const header=$('weeklyCalendar').querySelector('.week-grid-heading')?.getBoundingClientRect();
  const top=Math.min(area.bottom,Math.max(area.top,header?.bottom||area.top));
  const bounds={left:area.left,top,right:area.right,bottom:area.bottom};
  const layer=document.createElement('div');layer.className='calendar-swap-layer is-hover-preview';layer.setAttribute('aria-hidden','true');
  Object.assign(layer.style,{left:`${area.left}px`,top:`${top}px`,width:`${area.width}px`,height:`${Math.max(0,area.bottom-top)}px`});
  Object.assign(clone.style,{left:`${from.left-area.left}px`,top:`${from.top-top}px`,width:`${from.width}px`,height:`${from.height}px`,transform:'none'});
  layer.append(clone);document.body.append(layer);
  const job={id:QuickJiraDrafts.key(item),item,node,clone,layer,bounds,goal:null,mode:null,scrolls:calendarMotionScrolls()};
  calendarHoverMotions.set(job.id,job);return job;
}
function retargetCalendarHoverJob(job,to,mode) {
  if(!to||!to.width||!to.height){removeCalendarHoverJob(job);return;}
  if(job.mode===mode&&job.goal&&['left','top','width','height'].every(k=>Math.abs(to[k]-job.goal[k])<.75))return;
  // Capture the currently displayed frame BEFORE canceling. A quick B→C→B
  // reversal starts here, never from either stale endpoint.
  const from=job.clone.getBoundingClientRect(),layer=job.layer.getBoundingClientRect();
  job.sequence=(job.sequence||0)+1;const sequence=job.sequence;
  clearTimeout(job.timer);job.animation?.cancel();job.animation=null;
  job.mode=mode;job.goal={left:to.left,top:to.top,width:to.width,height:to.height};
  Object.assign(job.clone.style,{left:`${from.left-layer.left}px`,top:`${from.top-layer.top}px`,width:`${from.width}px`,height:`${from.height}px`,transform:'none'});
  const finish=()=>{
    if(calendarHoverMotions.get(job.id)!==job||sequence!==job.sequence)return;
    if(mode!=='away')removeCalendarHoverJob(job);
  };
  if(reduceMotionEnabled()||typeof job.clone.animate!=='function') {
    Object.assign(job.clone.style,{left:`${to.left-layer.left}px`,top:`${to.top-layer.top}px`,width:`${to.width}px`,height:`${to.height}px`});finish();return;
  }
  try {
    const motion=QuickJiraSwapMotion.flight(from,to,job.bounds);
    job.animation=job.clone.animate(motion.frames,{duration:motion.duration,easing:'cubic-bezier(.22,.7,.18,1)',fill:'both'});
    job.animation.finished.then(finish,()=>{});
    job.timer=setTimeout(finish,motion.duration+180);
  } catch {removeCalendarHoverJob(job);}
}
function updateCalendarHoverPreview(g,proposal) {
  const partners=proposal.problem?[]:(proposal.swaps|| (proposal.swap?[proposal.swap]:[]));
  const ids=new Set(partners.map(QuickJiraDrafts.key));
  for(const job of [...calendarHoverMotions.values()])if(!ids.has(job.id)){labelCalendarHoverJob(job,job.item);retargetCalendarHoverJob(job,calendarHoverSlot(job.item,job.node),'return');}
  for(const partner of partners){
    const id=QuickJiraDrafts.key(partner),destination=proposal.changes.find(x=>QuickJiraDrafts.key(x)===id);
    const job=calendarHoverMotions.get(id)||createCalendarHoverJob(partner);
    if(job&&destination){labelCalendarHoverJob(job,destination);retargetCalendarHoverJob(job,calendarHoverSlot(destination,job.node),'away');}
  }
}
function labelCalendarHoverJob(job,item) {
  const label=[...job.clone.children].find(el=>el.tagName==='SPAN'&&!el.classList.contains('ot-ribbon'));
  const text=`${item.start}–${item.end} · ${formatHistoryTimeSpent(QuickJiraDrafts.seconds(item)/60)}`;
  if(label&&label.textContent!==text)label.textContent=text;
}
function returnCalendarHoverPreview() {
  for(const job of [...calendarHoverMotions.values()]){labelCalendarHoverJob(job,job.item);retargetCalendarHoverJob(job,calendarHoverSlot(job.item,job.node),'return');}
}
function finishCalendarHoverDrop() {
  // The synchronous render replaced logical nodes. Adopt the new destinations
  // while retaining every clone's current frame (including returning partners).
  for(const job of [...calendarHoverMotions.values()]) {
    job.node?.classList.remove('is-swap-landing');
    job.node=calendarBlockFor(job.item);
    if(!job.node){removeCalendarHoverJob(job);continue;}
    job.node.classList.add('is-swap-landing');job.scrolls=calendarMotionScrolls();
    labelCalendarHoverJob(job,calendarRenderedItems.find(item=>QuickJiraDrafts.key(item)===job.id)||job.item);
    retargetCalendarHoverJob(job,job.node.getBoundingClientRect(),'commit');
  }
}

let calendarSaveReport=null;
const calendarSaveLabels={pending:'Chưa lưu',checking:'Đang kiểm tra',saving:'Đang lưu',saved:'Đã xác nhận trên Jira',failed:'Chưa lưu được',conflict:'Cần xử lý xung đột',unknown:'Chưa rõ kết quả · Cần đối chiếu',rolledback:'Đã phục hồi · Chưa lưu',waiting:'Chưa thực hiện'};
function prepareCalendarSaveReport(){
  if(!calendarSaveReport||calendarSaveReport.user!==state.user||calendarSaveReport.complete)
    calendarSaveReport={user:state.user,entries:new Map(),rows:new Map(),complete:false};
  for(const [id,draft] of state.calendarDrafts){
    const target=QuickJiraDrafts.preview(draft.original,draft.target),entry=calendarSaveReport.entries.get(id),signature=JSON.stringify(draft.target);
    if(!entry||entry.signature!==signature)calendarSaveReport.entries.set(id,{original:{...draft.original},target,segments:draft.target.segments,signature,status:draft.status==='unknown'?'unknown':draft.status==='conflict'?'conflict':'pending',message:''});
  }
  for(const [id,entry] of calendarSaveReport.entries)if(!state.calendarDrafts.has(id)&&entry.status!=='saved')calendarSaveReport.entries.delete(id);
  return calendarSaveReport;
}
function renderCalendarSaveReport(){
  const report=prepareCalendarSaveReport(),date=value=>value.split('-').reverse().join('/');
  $('calendarSaveList').innerHTML=[...report.entries].map(([id,entry])=>`<li data-save-key="${escapeHtml(id)}"><strong>${escapeHtml(entry.original.key)}</strong><span>${escapeHtml(date(entry.original.date))} · ${escapeHtml(entry.original.start)}–${escapeHtml(entry.original.end)} · ${escapeHtml(formatHistoryTimeSpent(QuickJiraDrafts.seconds(entry.original)/60))}</span><b aria-hidden="true">↓</b><span class="calendar-save-target">${escapeHtml(entry.segments ? entry.segments.map(t=>{const part=QuickJiraDrafts.preview(entry.original,t);return `${date(part.date)} · ${part.start}–${part.end} (${formatHistoryTimeSpent(QuickJiraDrafts.seconds(part)/60)})`;}).join('\n') : `${date(entry.target.date)} · ${entry.target.start}–${entry.target.end} · ${formatHistoryTimeSpent(QuickJiraDrafts.seconds(entry.target)/60)}`)}${entry.segments?` · ${entry.segments.length} phần`:''}</span><span class="calendar-save-status"></span><small class="calendar-save-detail" hidden></small></li>`).join('');
  report.rows=new Map([...$('calendarSaveList').children].map(row=>[row.dataset.saveKey,row]));
  syncCalendarSaveReport();
}
function syncCalendarSaveReport(){
  const report=calendarSaveReport;if(!report||report.user!==state.user)return;
  for(const [id,entry] of report.entries){
    const row=report.rows.get(id);if(!row)continue;
    const status=row.querySelector('.calendar-save-status'),detail=row.querySelector('.calendar-save-detail');
    if(status.dataset.saveState!==entry.status){status.dataset.saveState=entry.status;status.textContent=calendarSaveLabels[entry.status]||calendarSaveLabels.pending;}
    if(detail.textContent!==entry.message)detail.textContent=entry.message||'';
    detail.hidden=!entry.message;
  }
  const counts=QuickJiraExperience.totals(report.entries.values()),result=$('calendarSaveResult');
  const label=`${counts.saved}/${counts.total} đã xác nhận${counts.failed?' · '+counts.failed+' cần xử lý':''}${counts.unknown?' · '+counts.unknown+' cần đối chiếu':''}${counts.waiting?' · '+counts.waiting+' chưa lưu':''}`;
  result.hidden=false;if(result.textContent!==label)result.textContent=label;
}
function setCalendarSaveStatus(drafts,status,message=''){
  if(!calendarSaveReport||calendarSaveReport.user!==state.user)return;
  for(const draft of (Array.isArray(drafts)?drafts:[drafts])){
    const entry=calendarSaveReport.entries.get(QuickJiraDrafts.key(draft.original));
    if(entry){entry.status=status;entry.message=message;}
  }
  syncCalendarSaveReport();
}

function calendarPreviewItems() { return QuickJiraDrafts.project(state.historyItems, state.calendarDrafts); }
function calendarIsDraft(item) { if(item.batchNew)return !item.batchStatus;return state.calendarDrafts.has(item.calendarSplitRoot||QuickJiraDrafts.key(item)); }
function syncCalendarSaveButton() {
  const count = state.calendarDrafts.size, button = $('calendarSaveBtn');
  if(window.QuickJiraBatch?.active){button.classList.remove('hidden');button.disabled=!QuickJiraBatch.canSave;button.setAttribute('aria-label','Xác nhận và log lịch xem trước');return;}
  button.classList.toggle('hidden', !count);
  button.disabled = state.calendarMovePending;
  button.title = button.getAttribute('aria-label') || 'Lưu lịch';
  button.setAttribute('aria-label', `Lưu lịch (${count} thay đổi chưa lưu)`);
  button.title = button.getAttribute('aria-label');
  $('historyOverlay').classList.toggle('has-calendar-drafts', count > 0);
}
function renderCalendarDrafts() {
  const results=$('historyResults'), scroll={left:results.scrollLeft,top:results.scrollTop};
  const weekly=$('weeklyCalendar').querySelector('.weekly-scroll'), weekScroll={left:weekly?.scrollLeft||0,top:weekly?.scrollTop||0};
  renderWorklogHistory(); syncCalendarSaveButton();
  window.QuickJiraBatch?.update();
  results.scrollTo(scroll.left,scroll.top);
  $('weeklyCalendar').querySelector('.weekly-scroll')?.scrollTo(weekScroll.left,weekScroll.top);
}
function calendarDraftMessage() {
  return state.calendarDrafts.size ? `${state.calendarDrafts.size} lịch chưa lưu · Bấm icon lưu phía trên để xác nhận.` : '';
}
function clearCalendarDrafts() {
  state.calendarDrafts.clear();calendarSaveReport=null;
  $('calendarSaveDialog').close();
  calendarCloseAfterSave=false;
  syncCalendarSaveButton();
}
function openCalendarSave({ closeAfter = false } = {}) {
  if(window.QuickJiraBatch?.active)return QuickJiraBatch.review();
  if (!state.calendarDrafts.size || state.calendarMovePending) return;
  resetCalendarInteraction();
  calendarCloseAfterSave = closeAfter;
  $('calendarSaveTitle').textContent = closeAfter ? 'Lịch có thay đổi chưa lưu' : 'Xác nhận lưu lịch';
  renderCalendarSaveReport();
  $('calendarSaveError').textContent=''; $('calendarSaveError').classList.add('hidden');
  $('calendarSaveHint').textContent=`${state.calendarDrafts.size} worklog sẽ được cập nhật hoặc tách trên Jira. Giữ nguyên mô tả và Overtime. Kiểm tra ngày, giờ và thời lượng trước khi lưu.`;
  const review=[...calendarSaveReport.entries.values()].some(entry=>entry.status!=='pending');
  if(review)$('calendarSaveHint').textContent=`Còn ${state.calendarDrafts.size} thay đổi cần xác nhận. Kiểm tra Jira trước khi lưu phần còn lại. Mô tả và Overtime được giữ nguyên.`;
  $('calendarConfirmSaveBtn').textContent=review?`Kiểm tra và lưu (${state.calendarDrafts.size})`:'Lưu lịch';
  $('calendarDiscardBtn').textContent=review?'Bỏ phần chưa lưu':'Bỏ thay đổi';
  $('calendarDiscardBtn').setAttribute('aria-label',review?'Bỏ thay đổi chưa lưu; giữ các worklog đã xác nhận trên Jira':'Bỏ thay đổi chưa lưu');
  if (!$('calendarSaveDialog').open) $('calendarSaveDialog').showModal();
  $('calendarCancelSaveBtn').focus({preventScroll:true});
}
function closeCalendarSave() {
  if (state.calendarMovePending) return;
  $('calendarSaveDialog').close(); calendarCloseAfterSave=false;
  $('calendarSaveBtn').focus({preventScroll:true});
}
function stageCalendarMove(item,target,proposal=null,livePreview=false) {
  if(window.QuickJiraBatch?.active)return QuickJiraBatch.stage(item,target,proposal);
  if(calendarReadOnly()||item?.calendarReadOnly)return;
  if (state.calendarMovePending) return;
  if([...state.calendarDrafts.values()].some(d=>d.target.segments&&d.status==='unknown'))return calendarFeedback('Cần đối chiếu kết quả tách trước khi chỉnh tiếp. Bấm Lưu lịch để kiểm tra Jira.',true);
  const context=QuickJiraDrafts.regroup(item,state.calendarDrafts);
  if(context.problem){if(livePreview)returnCalendarHoverPreview();return calendarFeedback(context.problem,true);}
  item=context.item;
  let drop=proposal||QuickJiraDrafts.drop(item,target,calendarPreviewItems());
  if(window.QuickJiraBatch?.active)drop=QuickJiraBatch.validateDrop(item,drop);
  if(drop.problem)return calendarFeedback(drop.problem,true);
  if(drop.requiresConfirmation&&!drop.confirmed){
    returnCalendarHoverPreview();openCalendarSplitConfirm(item,target,drop);return;
  }
  if(drop.changes.some(x=>state.calendarDrafts.get(QuickJiraDrafts.key(x))?.status==='unknown')) {
    if(livePreview)returnCalendarHoverPreview();
    return calendarFeedback('Chưa rõ kết quả lần lưu trước. Bấm Lưu lịch để đối chiếu Jira trước khi kéo tiếp.',true);
  }
  if(drop.segments){
    const id=QuickJiraDrafts.key(item),previous=state.calendarDrafts.get(id),original=previous?.original||{...item};
    state.calendarDrafts.set(id,{original,target:{date:drop.segments[0].date,start:drop.segments[0].start,targetSeconds:QuickJiraDrafts.seconds(item),segments:drop.segments},allowMany:drop.segments.length>2,status:'pending',requestId:createRequestId('calendar-split')});
    returnCalendarHoverPreview();renderCalendarDrafts();
    calendarFeedback(`Đã chia thành ${drop.segments.length} phần · ${calendarDraftMessage()}`);return;
  }
  if(!livePreview&&drop.swaps?.length>1){updateCalendarHoverPreview(null,drop);livePreview=true;}
  const swapMotion=livePreview?null:prepareCalendarSwapMotion(drop);
  // Commit both previews together; each draft retains its own original snapshot.
  for(const moved of drop.changes) {
    const id=QuickJiraDrafts.key(moved),previous=state.calendarDrafts.get(id);
    const original=previous?.original||{...(calendarPreviewItems().find(x=>QuickJiraDrafts.key(x)===id)||moved)};
    if(QuickJiraDrafts.same(original,moved))state.calendarDrafts.delete(id);
    else state.calendarDrafts.set(id,{original,target:{date:moved.date,start:moved.start,targetSeconds:QuickJiraDrafts.seconds(moved)},status:previous?.status||'pending'});
  }
  calendarKeepHoverOnRender=livePreview;
  try {renderCalendarDrafts();} finally {calendarKeepHoverOnRender=false;}
  if(livePreview)finishCalendarHoverDrop();
  playCalendarSwapMotion(swapMotion);
  calendarFeedback(`${drop.swap?'Đã đổi chỗ ở bản nháp · ':''}${calendarDraftMessage()||'Đã đưa lịch về vị trí gốc.'}`);
}

let calendarPendingSplit=null;
function openCalendarSplitConfirm(item,target,proposal){
  calendarPendingSplit={item:{...item},target,proposal,user:state.user};
  $('calendarSplitHint').textContent=`${item.key} cần tách thành ${proposal.segments.length} block để giữ đủ ${formatHistoryTimeSpent(QuickJiraDrafts.seconds(item)/60)}. Các phần nằm trong cùng ngày; chưa cập nhật Jira.`;
  $('calendarSplitList').replaceChildren(...proposal.changes.map(part=>{const row=document.createElement('li');row.textContent=`${part.start}–${part.end} · ${formatHistoryTimeSpent(QuickJiraDrafts.seconds(part)/60)}`;return row;}));
  $('calendarSplitDialog').showModal();$('calendarSplitCancelBtn').focus({preventScroll:true});
}
function closeCalendarSplitConfirm(){calendarPendingSplit=null;$('calendarSplitDialog').close();}
function calendarSplitBody(draft,verifyOnly=false){return {requestId:draft.requestId,key:draft.original.key,worklogId:draft.original.id,expectedStarted:QuickJiraDrafts.started(draft.original),expectedSeconds:QuickJiraDrafts.seconds(draft.original),targetSeconds:draft.target.targetSeconds,segments:draft.target.segments,allowMany:draft.allowMany===true,verifyOnly};}
function acceptCalendarSplit(draft,data){
  const parts=QuickJiraDrafts.parts(draft),ids=new Set();
  if(data.worklogVerified!==true||data.split!==true||!Array.isArray(data.items)||data.items.length!==parts.length||data.items.some((x,i)=>{const id=String(x.id),invalid=!/^\d+$/.test(id)||x.key!==draft.original.key||ids.has(id)||!QuickJiraDrafts.same(x,parts[i]);ids.add(id);return invalid;})||String(data.items[0].id)!==String(draft.original.id)){
    const e=new Error('Chưa xác nhận được đầy đủ các phần tách trên Jira.');e.code='RESULT_UNKNOWN';throw e;
  }
  state.historyItems=state.historyItems.filter(x=>QuickJiraDrafts.key(x)!==QuickJiraDrafts.key(draft.original));
  for(const item of data.items)state.historyItems.push({...draft.original,...item,minutes:QuickJiraDrafts.seconds(item)/60,end:QuickJiraDrafts.preview(item,{date:item.date,start:item.start}).end});
  state.calendarDrafts.delete(QuickJiraDrafts.key(draft.original));setCalendarSaveStatus(draft,'saved',`Đã xác nhận ${data.items.length} phần, giữ đúng tổng thời lượng và Overtime.`);
}
function calendarSaveLock(locked) {
  $('historyOverlay').classList.toggle('is-calendar-saving',locked);
  $('calendarSaveDialog').setAttribute('aria-busy',String(locked));
  if (locked) {
    calendarSaveControls=[...$('historyOverlay').querySelectorAll('button,input')].map(el=>[el,el.disabled]);
    calendarSaveControls.forEach(([el])=>{el.disabled=true;});
  } else { calendarSaveControls.forEach(([el,disabled])=>{if(el.isConnected)el.disabled=disabled;}); calendarSaveControls=[]; }
  ['calendarConfirmSaveBtn','calendarCancelSaveBtn','calendarDiscardBtn'].forEach(id=>{$(id).disabled=locked;});
  syncCalendarSaveButton();
}
async function checkCalendarDrafts(user=state.user) {
  const drafts=[...state.calendarDrafts.values()],dates=[...new Set(drafts.flatMap(d=>[d.original.date,d.target.date]))],items=[];
  for (const date of dates) {
    const data=await fetchHistoryRange({start:date,end:date},'',true);
    if(state.user!==user)throw new Error('Phiên làm việc đã thay đổi.');
    if (data.skipped?.length || data.truncated || !Array.isArray(data.items)) throw new Error('Chưa đọc đủ lịch trên Jira. Chưa gửi thay đổi; vui lòng thử lại.');
    items.push(...data.items);
  }
  const fresh=[...new Map(items.map(item=>[QuickJiraDrafts.key(item),item])).values()];
  for (const draft of drafts) {
    const id=QuickJiraDrafts.key(draft.original),current=fresh.find(item=>QuickJiraDrafts.key(item)===id);
    if(draft.status==='unknown'&&draft.target.segments){
      const data=await api('/api?action=calendar-split',{method:'POST',body:JSON.stringify(calendarSplitBody(draft,true))});
      if(state.user!==user)throw new Error('Phiên làm việc đã thay đổi.');
      acceptCalendarSplit(draft,data);continue;
    }
    if (draft.status==='unknown' && current && QuickJiraDrafts.same(current,QuickJiraDrafts.preview(draft.original,draft.target))) {
      state.calendarDrafts.delete(id);setCalendarSaveStatus(draft,'saved','Đã đọc lại và xác nhận đúng vị trí, thời lượng trên Jira.');continue;
    }
    if (!current || !QuickJiraDrafts.same(current,draft.original)) {
      draft.status='conflict';setCalendarSaveStatus(draft,'conflict','Dữ liệu Jira đã thay đổi hoặc không đọc được. Bỏ nháp và tải lại trước khi sửa.');
      throw new Error(`${draft.original.key} đã thay đổi hoặc không đọc được trên Jira. Bỏ thay đổi và tải lại lịch trước khi sửa tiếp.`);
    }
    draft.status='pending';
  }
  return QuickJiraDrafts.plan(state.calendarDrafts,fresh);
}
async function saveCalendarDrafts() {
  if(calendarReadOnly())return;
  if (state.calendarMovePending || !state.calendarDrafts.size) return;
  const user=state.user,total=state.calendarDrafts.size,closeAfter=calendarCloseAfterSave;
  renderCalendarSaveReport();
  setCalendarSaveStatus([...state.calendarDrafts.values()],'checking');
  let active=null,verified=0,error=null;
  state.calendarMovePending=true; calendarSaveLock(true);
  $('calendarSaveError').classList.add('hidden');
  $('calendarSaveHint').textContent='Đang kiểm tra dữ liệu mới nhất trên Jira…';
  try {
    const ordered=await checkCalendarDrafts(user);
    if (state.user!==user) return;
    verified=total-state.calendarDrafts.size;
    for (const draft of ordered) {
      if (state.user!==user) return;
      if(draft.cycle) {
        const group=draft.cycle;active=group;setCalendarSaveStatus(group,'saving');
        $('calendarSaveHint').textContent=`Đang đổi chỗ ${group.length} worklog trên Jira…`;
        const requestId=createRequestId('calendar-swap');
        const data=await api('/api?action=calendar-moves',{method:'POST',requestId,body:JSON.stringify({requestId,moves:group.map(d=>({key:d.original.key,worklogId:d.original.id,date:d.target.date,start:d.target.start,expectedStarted:QuickJiraDrafts.started(d.original),expectedSeconds:QuickJiraDrafts.seconds(d.original),...(d.target.targetSeconds!==undefined?{targetSeconds:d.target.targetSeconds}:{})}))})});
        if(data.worklogVerified!==true||data.moved!==true||!Array.isArray(data.items)||group.some(d=>!data.items.some(x=>QuickJiraDrafts.key(x)===QuickJiraDrafts.key(d.original)&&QuickJiraDrafts.same(x,QuickJiraDrafts.preview(d.original,d.target))))) {
          const e=new Error('Chưa xác nhận đủ kết quả đổi chỗ. Bấm Lưu lịch để đối chiếu Jira.');e.code='RESULT_UNKNOWN';throw e;
        }
        for(const d of group) {
          const id=QuickJiraDrafts.key(d.original);
          state.historyItems=state.historyItems.map(item=>QuickJiraDrafts.key(item)===id?QuickJiraDrafts.preview(item,d.target):item);
          state.calendarDrafts.delete(id);verified++;setCalendarSaveStatus(d,'saved');
        }
        active=null;syncCalendarSaveButton();continue;
      }
      active=draft;setCalendarSaveStatus(draft,'saving');
      $('calendarSaveHint').textContent=`Đang lưu ${verified+1}/${total} · ${draft.original.key}…`;
      if(draft.target.segments){
        draft.requestId ||= createRequestId('calendar-split');
        const data=await api('/api?action=calendar-split',{method:'POST',requestId:draft.requestId,body:JSON.stringify(calendarSplitBody(draft))});
        if(state.user!==user)return;
        acceptCalendarSplit(draft,data);verified++;active=null;syncCalendarSaveButton();continue;
      }
      const target=QuickJiraDrafts.preview(draft.original,draft.target);
      const resized=QuickJiraDrafts.seconds(target)!==QuickJiraDrafts.seconds(draft.original);
      const data=await api('/api?action=worklog-correction',{method:'PATCH',body:JSON.stringify({
        key:draft.original.key,worklogId:draft.original.id,date:draft.target.date,start:draft.target.start,
        ...(resized?{calendarEdit:true,targetSeconds:QuickJiraDrafts.seconds(target)}:{moveOnly:true}),
        expectedStarted:QuickJiraDrafts.started(draft.original),expectedSeconds:QuickJiraDrafts.seconds(draft.original)
      })});
      if (data.worklogVerified!==true || data.moved!==true || (resized && (data.resized!==true || data.timeSpentSeconds!==QuickJiraDrafts.seconds(target))) || (data.timeSpentSeconds!==undefined && data.timeSpentSeconds!==QuickJiraDrafts.seconds(target))) {const e=new Error('Jira chưa xác nhận vị trí mới. Bấm Lưu lịch để đối chiếu trước khi thử lại.');e.code='RESULT_UNKNOWN';throw e;}
      const id=QuickJiraDrafts.key(draft.original);
      state.historyItems=state.historyItems.map(item=>QuickJiraDrafts.key(item)===id?QuickJiraDrafts.preview(item,draft.target):item);
      state.calendarDrafts.delete(id);verified++;setCalendarSaveStatus(draft,'saved');active=null;
      syncCalendarSaveButton();
    }
  } catch (e) {
    error=e;
    if(state.user!==user)return;
    if(e.details?.rolledBack&&active&&!Array.isArray(active))active.requestId=createRequestId('calendar-split');
    verified=total-state.calendarDrafts.size;
    if(active)setCalendarSaveStatus(active,QuickJiraExperience.failureState(e),e.message||'Chưa xác nhận được thay đổi.');
    if(calendarSaveReport)for(const [id,entry] of calendarSaveReport.entries){
      if(['pending','checking','saving'].includes(entry.status)){
        if(state.calendarDrafts.get(id)?.status==='unknown'){entry.status='unknown';entry.message='Chưa đối chiếu được với Jira; kết quả lần ghi trước vẫn chưa rõ.';}
        else{entry.status='waiting';entry.message='Chưa gửi; lượt lưu dừng để xử lý lỗi phía trên.';}
      }
    }
    syncCalendarSaveReport();
    if (active && !e.details?.rolledBack && (e.details?.resultUnknown || /UNKNOWN/.test(e.code||'') || !e.status || e.status>=500)) for(const draft of (Array.isArray(active)?active:[active]))draft.status='unknown';
    const actual=e.details?.resultUnknown&&e.details?.actual?.length?` Vị trí Jira hiện tại: ${e.details.actual.map(x=>`${x.key} ${x.date} ${x.start}`).join('; ')}.`:'';
    $('calendarSaveError').textContent=`${verified ? `Đã xác nhận ${verified}/${total} lịch. ` : ''}${e.message || 'Chưa lưu được lịch.'}${actual} Các thay đổi chưa xác nhận vẫn được giữ tạm.`;
    $('calendarSaveError').classList.remove('hidden');
  } finally {
    if (state.user===user) {
      invalidateHistoryCache(); invalidateDayAuditCache();
      if (!$('historyOverlay').classList.contains('hidden')) await loadWorklogHistory({quiet:true,force:true,calendarSaveReload:true});
      state.calendarMovePending=false; calendarSaveLock(false);
      void refreshDashboard({force:true});
      syncCalendarSaveButton();
      if (!error && !state.calendarDrafts.size) {
        if(calendarSaveReport)calendarSaveReport.complete=true;
        $('calendarSaveDialog').close(); calendarCloseAfterSave=false;
        calendarFeedback(''); showToast(`Lưu lịch thành công · ${total} worklog.`);
        if (closeAfter) closeHistory();
      } else {
        calendarFeedback(calendarDraftMessage(),!!error);
        $('calendarSaveHint').textContent=`Còn ${state.calendarDrafts.size} lịch chưa xác nhận. Kiểm tra lỗi rồi xác nhận lại hoặc bỏ thay đổi.`;
        $('calendarConfirmSaveBtn').textContent=`Kiểm tra và lưu (${state.calendarDrafts.size})`;
        $('calendarDiscardBtn').textContent='Bỏ phần chưa lưu';
      }
    } else { state.calendarMovePending=false; calendarSaveLock(false); }
  }
}


function calendarFeedback(message, error = false) {
  if(error&&message&&window.QuickJiraBatch?.active)showToast(message);
  const box = $('calendarInteractionState');
  box.textContent = message;
  box.classList.toggle('is-error', error);
  box.classList.toggle('hidden', !message);
}
function setCalendarEditMode(enabled) {
  calendarEditMode = enabled;
  const grid=$('weeklyCalendar');
  for(const type of ['touchstart','touchmove']){
    if(enabled)grid.addEventListener(type,calendarEditingTouch,{passive:false});
    else grid.removeEventListener(type,calendarEditingTouch);
  }
  $('weeklyCalendar').classList.toggle('is-calendar-editing', enabled);
  if (!state.calendarMovePending) calendarFeedback(enabled ? 'Đang chỉnh sửa · Kéo block để đổi giờ, kéo cạnh dưới để đổi thời lượng.' : calendarDraftMessage());
}
function cancelCalendarGesture({returnHover=true}={}) {
  const gesture = calendarGesture;
  calendarGesture = null;
  cancelAnimationFrame(calendarDragFrame);calendarDragFrame=0;
  if (gesture) {
    if(gesture.dragging)calendarIgnoreClickUntil=performance.now()+600;
    clearTimeout(gesture.timer);
    gesture.ghost?.remove();
    if(gesture.resize && gesture.column?.isConnected) {delete gesture.column.parentElement.dataset.calendarResizing;scheduleWeekFit();}
    if(gesture.gridBefore && gesture.column?.isConnected) {
      const body=gesture.column.parentElement;
      body.dataset.minuteRange=gesture.gridBefore.range;body.style.height=gesture.gridBefore.height;
      body.querySelectorAll('.calendar-resize-extra-tick').forEach(el=>el.remove());
    }
    gesture.highlights?.forEach(el=>el.remove());
    gesture.block?.classList.remove('is-drag-source');
    gesture.groupNodes?.forEach(node=>node.classList.remove('is-regroup-source'));
    try { gesture.block?.releasePointerCapture(gesture.id); } catch {}
  }
  document.body.classList.remove('calendar-dragging','calendar-resizing');
  if(returnHover)returnCalendarHoverPreview();
}
function resetCalendarInteraction() { cancelCalendarSwapMotion(); cancelCalendarGesture({returnHover:false}); cancelCalendarHoverMotion(); setCalendarEditMode(false); }
function calendarBlockClick(event, item) {
  if(window.QuickJiraBatch?.active) {if(!item.batchNew||item.batchStatus)return calendarFeedback('Giờ đã log trên Jira · Chỉ xem trong bản phân bổ.');if(event.target.closest('[data-calendar-resize]')||calendarGesture?.dragging||performance.now()<calendarIgnoreClickUntil)return;QuickJiraBatch.openDraft(item);return;}
  if (event.target.closest('[data-calendar-resize]') || calendarEditMode || state.calendarMovePending || state.historyLoading || performance.now() < calendarIgnoreClickUntil) { event.preventDefault(); return; }
  if (calendarIsDraft(item)) { openCalendarSave(); return; }
  openCorrection(item);
}
function calendarMinuteLabel(value) { return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(Math.round(value % 60)).padStart(2, '0')}`; }
function calendarPointTarget(x, y, grabMinutes = 0, snap = 'nearest') {
  const column = document.elementFromPoint(x, y)?.closest('.week-day-column');
  if (!column || !column.closest('#weeklyCalendar')) return null;
  const rect = column.getBoundingClientRect(), body = column.parentElement;
  const scale = rect.height / Number(body.dataset.minuteRange);
  const round = snap === 'floor' ? Math.floor : Math.round;
  const minute = round((Number(column.dataset.fromMinute) + (y - rect.top) / scale - grabMinutes) / 30) * 30;
  if (minute < 0 || minute >= 1440) return null;
  return { date: column.dataset.calendarDate, minute, start: calendarMinuteLabel(minute) };
}
function calendarDropProposal(item,target,x,y,items=null) {
  const block=document.elementFromPoint(x,y)?.closest('#weeklyCalendar [data-week-event]');
  const hovered=block?calendarRenderedItems[Number(block.dataset.weekEvent)]:null;
  if(window.QuickJiraBatch?.active)return QuickJiraBatch.proposeMove(item,target,hovered);
  const proposal=QuickJiraDrafts.drop(item,target,items||calendarPreviewItems(),hovered);
  return window.QuickJiraBatch?.active ? QuickJiraBatch.validateDrop(item,proposal) : proposal;
}
function calendarDropProblem(item,target) {return QuickJiraDrafts.drop(item,target,calendarPreviewItems()).problem;}
function highlightCalendarDrop(g,proposal) {
  g.highlights ||= [];
  const changes=proposal.changes||[];
  while(g.highlights.length>changes.length)g.highlights.pop().remove();
  changes.forEach((item,index)=>{
    let highlight=g.highlights[index];
    if(!highlight){highlight=document.createElement('div');highlight.className='calendar-drop-highlight';highlight.setAttribute('aria-hidden','true');highlight.innerHTML='<span></span>';$('weeklyCalendar').append(highlight);g.highlights.push(highlight);}
    const column=$('weeklyCalendar').querySelector(`[data-calendar-date="${item.date}"]`);
    if(!column){highlight.style.display='none';return;}
    const range=Number(column.parentElement.dataset.minuteRange),rect=column.getBoundingClientRect(),grid=$('weeklyCalendar').getBoundingClientRect();
    const scale=rect.height/range,top=(QuickJiraDrafts.minute(item.start)-Number(column.dataset.fromMinute))*scale;
    const placement=`display:block;left:${rect.left-grid.left+2}px;top:${rect.top-grid.top+top}px;width:${rect.width-4}px;height:${QuickJiraDrafts.seconds(item)/60*scale}px`;
    if(highlight._placement!==placement){highlight.style.cssText=placement;highlight._placement=placement;}
    highlight.classList.toggle('is-invalid',!!proposal.problem);highlight.classList.toggle('is-overlap',!!proposal.requiresOverlap);highlight.classList.toggle('is-swap',!!proposal.swap);
    const label=`${proposal.swap?'⇄ ':''}${item.start}–${item.end}${g.resize?' · '+formatHistoryTimeSpent(QuickJiraDrafts.seconds(item)/60):''}`;
    if(highlight.firstElementChild.textContent!==label)highlight.firstElementChild.textContent=label;
  });
}

function calendarResizeProposal(g,x,y) {
  const area=$('historyResults').getBoundingClientRect();
  if(!g.column?.isConnected || x<area.left || x>area.right || y<area.top || y>area.bottom)
    return {problem:'Giữ tay nắm trong khung lịch để chỉnh thời lượng.',changes:[]};
  const rect=g.column.getBoundingClientRect(),scale=rect.height/Number(g.column.parentElement.dataset.minuteRange);
  const end=Math.round((Number(g.column.dataset.fromMinute)+(y-rect.top)/scale-g.endGrabMinutes)/30)*30;
  if(window.QuickJiraBatch?.active)return QuickJiraBatch.proposeResize(g.item,end);
  const proposal=QuickJiraDrafts.resize(g.item,end,g.items||calendarPreviewItems());
  return window.QuickJiraBatch?.active?QuickJiraBatch.validateDrop(g.item,proposal):proposal;
}
function stageCalendarResize(item,proposal) {
  if(proposal.problem)return calendarFeedback(proposal.problem,true);
  stageCalendarMove(item,null,proposal);
}
function scheduleCalendarDrag(){
  if(!calendarDragFrame)calendarDragFrame=requestAnimationFrame(updateCalendarDrag);
}
// Find a free vertical band, including every split/swap preview. Never clamp a
// card back on top of the destination when the preferred side has no room.
function calendarInfoPlacement(bounds, obstacles, width, height, anchor, preferAbove) {
  const gap=8, w=Math.min(width,Math.max(0,bounds.right-bounds.left));
  const clamp=x=>Math.max(bounds.left,Math.min(bounds.right-w,x));
  const xs=[clamp(anchor.x),bounds.left,bounds.right-w,...obstacles.flatMap(r=>[clamp(r.left-w-gap),clamp(r.right+gap)])];
  const candidates=[];
  for(const x of new Set(xs)) {
    const blocks=obstacles.filter(r=>r.right+gap>x&&r.left-gap<x+w).sort((a,b)=>a.top-b.top);
    let top=bounds.top;
    const bands=[];
    for(const r of blocks){if(r.top-gap>top)bands.push([top,Math.min(bounds.bottom,r.top-gap)]);top=Math.max(top,r.bottom+gap);}
    if(top<bounds.bottom)bands.push([top,bounds.bottom]);
    for(const [a,b] of bands){
      const h=Math.min(height,b-a);if(h<32)continue;
      const above=b<=anchor.top,below=a>=anchor.bottom;
      const y=above?b-h:below?a:Math.max(a,Math.min(b-h,anchor.top-h-gap));
      const preferred=preferAbove?above:below;
      candidates.push({x,y,width:w,height:h,side:above?'above':below?'below':'side',score:(height-h)*10000+(preferred?0:2000)+Math.abs(x-anchor.x)+Math.min(Math.abs(y+h-anchor.top),Math.abs(y-anchor.bottom))});
    }
  }
  return candidates.sort((a,b)=>a.score-b.score)[0]||null;
}
function positionCalendarDragInfo(g,bounds) {
  const heading=$('weeklyCalendar').querySelector('.week-grid-heading')?.getBoundingClientRect();
  const notice=$('calendarInteractionState');
  const footer=notice&&!notice.classList.contains('hidden')?notice.getBoundingClientRect():null;
  const viewport=window.visualViewport;
  const frame={left:Math.max(bounds.left,viewport?.offsetLeft||0)+8,right:Math.min(bounds.right,(viewport?.offsetLeft||0)+(viewport?.width||innerWidth))-8,
    top:Math.max(bounds.top,heading?.bottom||bounds.top,viewport?.offsetTop||0)+8,
    bottom:Math.min(bounds.bottom,(viewport?.offsetTop||0)+(viewport?.height||innerHeight),footer&&footer.top>bounds.top&&footer.top<bounds.bottom?footer.top:bounds.bottom)-8};
  const obstacles=(g.highlights||[]).filter(el=>el.style.display!=='none').map(el=>el.getBoundingClientRect()).filter(r=>r.bottom>frame.top&&r.top<frame.bottom&&r.right>frame.left&&r.left<frame.right);
  const first=obstacles[0];
  const delta=first?first.top-g.rect.top:g.y-g.initialY;
  if(Math.abs(delta)>24)g.infoAbove=delta>0;
  const width=Math.max(0,Math.min(g.ghostWidth,frame.right-frame.left));
  if(g.infoWidth!==width){g.infoWidth=width;g.ghost.style.width=`${width}px`;g.ghostHeight=0;}
  if(!g.ghostHeight){g.ghost.style.maxHeight='none';g.ghostHeight=g.ghost.offsetHeight;}
  const placement=calendarInfoPlacement(frame,obstacles,width,g.ghostHeight,{x:g.x-g.grabX,top:first?.top??g.y,bottom:first?.bottom??g.y},!!g.infoAbove);
  g.ghost.style.visibility=placement?'visible':'hidden';
  if(placement){g.ghost.style.maxHeight=`${placement.height}px`;g.ghost.dataset.placement=placement.side;g.ghost.style.transform=`translate3d(${placement.x}px,${placement.y}px,0)`;}
}
function updateCalendarDrag(now=performance.now()) {
  calendarDragFrame=0;
  const g=calendarGesture;if(!g?.dragging)return;
  const results=$('historyResults'),bounds=results.getBoundingClientRect();
  const dt=Math.min(32,Math.max(1,now-(g.lastTick??now-16.67)));g.lastTick=now;
  const dx=g.resize?0:g.x<bounds.left+28?-1:g.x>bounds.right-28?1:0;
  const dy=g.y<bounds.top+42?-1:g.y>bounds.bottom-28?1:0;
  const direction=`${dx}|${dy}`;
  if(g.edgeDirection!==direction){g.edgeDirection=direction;g.edgeSince=now;}
  const waitingForEdge=!!(dx||dy)&&now-g.edgeSince<110;
  const left=results.scrollLeft,top=results.scrollTop;
  if(!waitingForEdge&&(dx||dy)&&g.x>=bounds.left&&g.x<=bounds.right&&g.y>=bounds.top&&g.y<=bounds.bottom)results.scrollBy(dx*dt*.6,dy*dt*.6);
  const scrolling=left!==results.scrollLeft||top!==results.scrollTop;
  const input=`${g.x}|${g.y}|${results.scrollLeft}|${results.scrollTop}`;
  if(g.lastInput===input){if(waitingForEdge)scheduleCalendarDrag();return;}
  g.lastInput=input;
  g.target=calendarPointTarget(g.x,g.y,g.grabMinutes);
  const proposal=g.proposal=g.resize?calendarResizeProposal(g,g.x,g.y):calendarDropProposal(g.item,g.target,g.x,g.y,g.items);
  highlightCalendarDrop(g,proposal);
  if(!g.resize)updateCalendarHoverPreview(g,proposal);
  const moved=proposal.changes?.[0],problem=proposal.problem;
  const label=moved?`${moved.date.split('-').reverse().join('/')} · ${moved.start}–${moved.end}${g.resize?' · '+formatHistoryTimeSpent(QuickJiraDrafts.seconds(moved)/60):''}`:'Chọn vị trí trong lịch';
  const detail=problem||(proposal.requiresOverlap?'Thả để xác nhận xếp trùng · Giữ nguyên lịch khác':proposal.swap?`Thả để đổi chỗ với ${(proposal.swaps||[proposal.swap]).length} block · Lưu tạm`:proposal.segments?`Thả để tách ${proposal.segments.length} phần${proposal.requiresConfirmation?' · Cần xác nhận':''} · Lưu tạm`:'Thả để lưu tạm · Chưa cập nhật Jira');
  const groupLabel=g.item.calendarDragParts?`Gom ${g.item.calendarDragParts.length} phần · ${formatHistoryTimeSpent(QuickJiraDrafts.seconds(g.item)/60)} · `:'';
  const content=label+'|'+groupLabel+detail;
  if(g.ghostContent!==content){
    g.ghostContent=content;g.ghost.querySelector('span').textContent=label;g.ghost.querySelector('small').textContent=groupLabel+detail;
    g.ghost.classList.toggle('is-invalid',!!problem);g.ghostHeight=0;
  }
  positionCalendarDragInfo(g,bounds);
  // A stationary drag inside the grid has no JS animation loop. Native curved
  // swap animations continue independently; only edge auto-scroll needs frames.
  if(scrolling||waitingForEdge)scheduleCalendarDrag();
}
function startCalendarDrag(g) {
  if (g !== calendarGesture || state.calendarMovePending) return;
  g.dragging = true;g.items=calendarPreviewItems();
  clearTimeout(g.timer);
  g.block.classList.add('is-drag-source');
  if(g.item.calendarDragParts){g.groupNodes=g.item.calendarDragParts.map(calendarBlockFor).filter(Boolean);g.groupNodes.forEach(node=>node.classList.add('is-regroup-source'));}
  if(g.resize) {
    document.body.classList.add('calendar-resizing');
    g.column.parentElement.dataset.calendarResizing='true';
    // Extend late-day space only while resizing; cancellation restores the grid.
    const from=Number(g.column.dataset.fromMinute),body=g.column.parentElement,range=Number(body.dataset.minuteRange);
    if(QuickJiraDrafts.minute(g.item.start)>=1050 && from+range<1440) {
      g.gridBefore={range:body.dataset.minuteRange,height:body.style.height};
      const scale=g.column.getBoundingClientRect().height/range;
      body.dataset.minuteRange=String(1440-from);body.style.height=`${(1440-from)*scale}px`;
      const ruler=body.querySelector('.week-time-ruler');
      for(let minute=from+range+60;minute<=1440;minute+=60) {
        const tick=document.createElement('span');tick.className='calendar-resize-extra-tick';tick.style.top=`${(minute-from)*scale}px`;tick.textContent=calendarMinuteLabel(minute);ruler.append(tick);
      }
    }
  }
  const ghost = document.createElement('div'); ghost.className = 'calendar-drag-ghost';
  ghost.innerHTML = `<strong>${escapeHtml(g.item.key)}${g.item.calendarDragParts?' · '+escapeHtml(formatHistoryTimeSpent(QuickJiraDrafts.seconds(g.item)/60)):''}</strong><span></span><small></small>`;
  if(g.item.calendarDragParts)ghost.classList.add('is-regroup-ghost');
  g.ghostWidth=Math.max(170,Math.min(280,g.rect.width));
  ghost.style.width=`${g.ghostWidth}px`;
  document.body.append(ghost); g.ghost = ghost;
  document.body.classList.add('calendar-dragging');
  try { g.block.setPointerCapture(g.id); } catch {}
  updateCalendarDrag();
}

async function openCalendarLog(date, start) {
  if(window.QuickJiraBatch?.active)return showToast('Chỉnh các block nháp hoặc quay lại danh sách để phân bổ thêm.');
  if(calendarReadOnly())return;
  if (!state.user || state.calendarMovePending || state.historyLoading || state.submitInFlight) return;
  if (!QuickJiraUi.validDate(date)) return;
  const minute = QuickJiraUi.minuteOfDay(start);
  if (!((minute >= 480 && minute < 720) || (minute >= 810 && minute < 1050))) {
    const slot = $('weeklyCalendar').querySelector(`[data-calendar-date="${date}"] [data-calendar-slot="${start}"]`);
    if (slot) {
      clearTimeout(slot._invalidTimer);slot.classList.add('is-invalid');
      slot._invalidTimer=setTimeout(()=>slot.classList.remove('is-invalid'),1200);
    }
    showToast('Không thể log tại giờ này. Chọn 08:00–12:00 hoặc 13:30–17:30.');
    return;
  }
  if (state.calendarDrafts.size) { openCalendarSave(); return; }
  resetCalendarInteraction();
  calendarFocusSource = document.activeElement;
  state.calendarLogContext = { date, start };
  $('weeklyCalendar').querySelectorAll('[data-calendar-slot]').forEach(slot => {
    slot.classList.toggle('is-selected', slot.dataset.calendarSlot === start && slot.closest('.week-day-column').dataset.calendarDate === date);
  });
  $('calendarLogFeedback').classList.add('hidden');
  $('calendarLogSelection').textContent = `${logWeekday(date)} · ${date.split('-').reverse().join('/')} · Bắt đầu ${start}`;
  $('calendarTaskPicker').classList.remove('hidden');
  $('calendarTaskSearch').value = '';
  const dialog = $('calendarLogDialog');
  if (!dialog.open) dialog.showModal();
  $('closeCalendarLogBtn').focus({ preventScroll: true });
  await loadCalendarPicker();
}
async function loadCalendarPicker(force = false) {
  if (state.filterLoading) { $('calendarTaskState').textContent = 'Đang tải Sub-task chưa logwork…'; return; }
  const seq = ++calendarPickerSeq;
  $('calendarTaskState').textContent = 'Đang tải Sub-task chưa logwork…';
  $('calendarTaskList').replaceChildren();
  $('calendarTaskRefreshBtn').disabled = true;
  try {
    // Reuse the same Sub-task source and current account as the normal log flow.
    if (!state.filterLoaded || force) await loadFilterIssues({ quiet: true });
    if (seq !== calendarPickerSeq || !state.calendarLogContext) return;
    if (!state.filterLoaded) throw new Error($('filterError').textContent || 'Không tải được Sub-task. Bấm ↻ để thử lại.');
    renderCalendarPicker();
  } catch (error) { if (seq === calendarPickerSeq) $('calendarTaskState').textContent = error.message; }
  finally { if (seq === calendarPickerSeq) $('calendarTaskRefreshBtn').disabled = false; }
}
function renderCalendarPicker() {
  if (!state.calendarLogContext) return;
  const query = $('calendarTaskSearch').value.trim().toLocaleLowerCase('vi');
  const issues = state.filterIssues.filter(item => `${item.key} ${item.summary} ${item.project}`.toLocaleLowerCase('vi').includes(query));
  $('calendarTaskState').textContent = issues.length ? `${issues.length} Sub-task · Chọn để mở form logwork` : 'Không có Sub-task phù hợp.';
  $('calendarTaskList').innerHTML = issues.map((issue, index) => `<button type="button" class="calendar-task-row" data-calendar-task="${index}"><strong>${escapeHtml(issue.key)}</strong><span>${escapeHtml(issue.summary || '')}</span><small>${escapeHtml(issue.project || '')}</small></button>`).join('');
  $('calendarTaskList').querySelectorAll('[data-calendar-task]').forEach(button => button.addEventListener('click', () => {
    const issue = issues[Number(button.dataset.calendarTask)];
    $('calendarTaskPicker').classList.add('hidden');
    $('calendarLogDialog').append($('worklogCard'));
    $('calendarLogDialog').append($('logConfirmOverlay'));
    selectIssue(issue, { scroll: false, focusTime: false });
    $('closeWorklogBtn').focus({ preventScroll: true });
  }));
}
function showCalendarLogError(message) {
  $('calendarLogFeedback').textContent = message;
  $('calendarLogFeedback').classList.remove('hidden');
  $('calendarLogFeedback').scrollIntoView({ block: 'nearest' });
}
function closeCalendarLog({ force = false } = {}) {
  if (!force && (state.submitInFlight || state.confirmOpen)) return;
  const hadContext = !!state.calendarLogContext;
  ++calendarPickerSeq;
  const dialog = $('calendarLogDialog');
  if (dialog?.open) dialog.close();
  if (!hadContext) return;
  closeLogConfirmation(false);
  state.calendarLogContext = null;
  $('weeklyCalendar').querySelectorAll('.calendar-time-slot.is-selected').forEach(slot => slot.classList.remove('is-selected'));
  $('worklogCard').classList.add('hidden');
  calendarLogHome.append($('worklogCard'));
  calendarConfirmHome.append($('logConfirmOverlay'));
  $('calendarStartField').classList.add('hidden');
  $('calendarLogFeedback').classList.add('hidden');
  $('logNextBtn').classList.remove('hidden');
  document.body.classList.remove('single-log-open');
  closeMobileEditor(); closeDesktopEditor();
  updateSingleOvertimeHint();
  if (calendarFocusSource?.isConnected) calendarFocusSource.focus({ preventScroll: true });
}

function setupCalendarInteractions() {
  const grid = $('weeklyCalendar');
  document.addEventListener('pointerdown',()=>{if(calendarSwapMotion||(!calendarGesture&&calendarHoverMotions.size)){cancelCalendarSwapMotion();cancelCalendarHoverMotion();calendarIgnoreClickUntil=Math.max(calendarIgnoreClickUntil,performance.now()+220);}},true);
  $('historyResults').addEventListener('scroll',cancelSwapOnScroll,{passive:true,capture:true});
  const clearMotion=()=>{cancelCalendarSwapMotion();cancelCalendarHoverMotion();if(calendarGesture?.resize)cancelCalendarGesture();};
  window.addEventListener('resize',clearMotion);
  window.visualViewport?.addEventListener('resize',clearMotion);
  document.addEventListener('fullscreenchange',clearMotion);
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',clearMotion);
  window.addEventListener('blur',clearMotion);
  grid.addEventListener('pointerdown', event => {
    const block = event.target.closest('[data-week-event]');
    if (!block || calendarReadOnly() || state.calendarMovePending || state.historyLoading || event.button > 0) return;
    const displayed = calendarRenderedItems[Number(block.dataset.weekEvent)];
    if (!displayed || displayed.calendarReadOnly || displayed.batchStatus) return;
    if([...state.calendarDrafts.values()].some(d=>d.target.segments&&d.status==='unknown')){calendarFeedback('Cần đối chiếu kết quả tách trước khi chỉnh tiếp. Bấm Lưu lịch để kiểm tra Jira.',true);return;}
    const context=QuickJiraDrafts.regroup(displayed,state.calendarDrafts);
    if(context.problem){calendarFeedback(context.problem,true);return;}
    const item=context.item;
    cancelCalendarGesture();
    const rect = block.getBoundingClientRect(), column = block.closest('.week-day-column');
    const scale = column.getBoundingClientRect().height / Number(column.parentElement.dataset.minuteRange);
    const mobile = event.pointerType === 'touch';
    const g = calendarGesture = { id: event.pointerId, mobile, block, item, rect, initialX: event.clientX, initialY: event.clientY, x: event.clientX, y: event.clientY, grabX: event.clientX - rect.left, grabMinutes: (event.clientY - rect.top) / scale, ready: !mobile || calendarEditMode, column, resize: (!item.calendarDragParts || window.QuickJiraBatch?.active) && !!event.target.closest('[data-calendar-resize]') && (!mobile || calendarEditMode), endGrabMinutes: (event.clientY-rect.bottom)/scale };
    if (mobile && !calendarEditMode) g.timer = setTimeout(() => {
      if (calendarGesture !== g) return;
      setCalendarEditMode(true); g.ready = true;
      calendarIgnoreClickUntil = performance.now() + 500;
      try { navigator.vibrate?.(20); } catch {}
    }, 550);
    if (g.ready && mobile) event.preventDefault();
  });
  document.addEventListener('pointermove', event => {
    const g = calendarGesture;
    if (!g || g.id !== event.pointerId) return;
    g.x = event.clientX; g.y = event.clientY;
    const distance = Math.hypot(g.x - g.initialX, g.y - g.initialY);
    if (!g.ready && distance > 10) { cancelCalendarGesture(); return; }
    if (g.ready && distance > (g.resize?4:6) && !g.dragging) startCalendarDrag(g);
    if (g.dragging) {event.preventDefault();scheduleCalendarDrag();}
  }, { passive: false });
  document.addEventListener('pointerup', event => {
    const g = calendarGesture;
    if (!g || g.id !== event.pointerId) return;
    if (g.dragging) {
      const target=calendarPointTarget(event.clientX,event.clientY,g.grabMinutes),proposal=g.resize?calendarResizeProposal(g,event.clientX,event.clientY):calendarDropProposal(g.item,target,event.clientX,event.clientY),problem=proposal.problem;
      if(!g.resize)updateCalendarHoverPreview(g,proposal);
      calendarIgnoreClickUntil = performance.now() + 600;
      cancelCalendarGesture({returnHover:!!problem});
      if (problem) calendarFeedback(problem, true); else if(g.resize)stageCalendarResize(g.item,proposal); else stageCalendarMove(g.item,target,proposal,true);
      event.preventDefault();
    } else { if (g.mobile && g.ready) calendarIgnoreClickUntil = performance.now() + 500; cancelCalendarGesture(); }
  });
  document.addEventListener('pointercancel', () => cancelCalendarGesture());
  grid.addEventListener('contextmenu', event => { if (event.target.closest('[data-week-event]')) event.preventDefault(); });
  document.addEventListener('pointerdown', event => {
    if (calendarEditMode && !event.target.closest('#weeklyCalendar [data-week-event]')) {
      resetCalendarInteraction(); calendarIgnoreClickUntil = performance.now() + 500;
    }
  }, true);
  grid.addEventListener('click', event => {
    const block=event.target.closest('[data-week-event]');
    if(block){calendarBlockClick(event,calendarRenderedItems[Number(block.dataset.weekEvent)]);return;}
    if(state.calendarMovePending||state.historyLoading||performance.now()<calendarIgnoreClickUntil)return;
    if (calendarReadOnly()) return;
    const slot = event.target.closest('[data-calendar-slot]');
    const target = slot ? {date:slot.closest('.week-day-column').dataset.calendarDate,start:slot.dataset.calendarSlot} : calendarPointTarget(event.clientX, event.clientY, 0, 'floor');
    if (target) void openCalendarLog(target.date, target.start);
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if ($('calendarSplitDialog').open) {event.preventDefault();event.stopImmediatePropagation();closeCalendarSplitConfirm();return;}
    if ($('calendarSaveDialog').open) {event.preventDefault();event.stopImmediatePropagation();closeCalendarSave();return;}
    if (calendarGesture || calendarEditMode) { event.preventDefault(); event.stopImmediatePropagation(); cancelCalendarGesture();setCalendarEditMode(false);return; }
    if (calendarSwapMotion||calendarHoverMotions.size) {event.preventDefault();event.stopImmediatePropagation();clearMotion();return;}
    else if ($('calendarLogDialog').open && !state.confirmOpen && !$('logProgressDialog').open) { event.preventDefault(); event.stopImmediatePropagation(); closeCalendarLog(); }
  }, true);
  $('calendarSplitCancelBtn').addEventListener('click',closeCalendarSplitConfirm);
  $('calendarSplitDialog').addEventListener('cancel',event=>{event.preventDefault();closeCalendarSplitConfirm();});
  $('calendarSplitDialog').addEventListener('click',event=>{if(event.target===$('calendarSplitDialog'))closeCalendarSplitConfirm();});
  $('calendarSplitConfirmBtn').addEventListener('click',()=>{
    const pending=calendarPendingSplit;closeCalendarSplitConfirm();
    if(!pending||pending.user!==state.user)return;
    const resolved=QuickJiraDrafts.regroup(pending.item,state.calendarDrafts);
    const current=pending.item.calendarRegroupRoot?resolved.item:calendarPreviewItems().find(x=>QuickJiraDrafts.key(x)===QuickJiraDrafts.key(pending.item));
    if(resolved.problem||!current||!QuickJiraDrafts.same(current,pending.item))return calendarFeedback('Bản nháp đã thay đổi. Kéo lại để tính vị trí mới.',true);
    const fresh=QuickJiraDrafts.drop(current,pending.target,calendarPreviewItems());
    if(fresh.problem||JSON.stringify(fresh.segments)!==JSON.stringify(pending.proposal.segments))return calendarFeedback('Chỗ trống đã thay đổi. Kéo lại để xem vị trí mới trước khi tách.',true);
    stageCalendarMove(current,pending.target,{...fresh,confirmed:true});
  });
  $('calendarSaveBtn').addEventListener('click', () => openCalendarSave());
  $('calendarConfirmSaveBtn').addEventListener('click', () => {void saveCalendarDrafts();});
  $('calendarCancelSaveBtn').addEventListener('click', closeCalendarSave);
  $('calendarSaveDialog').addEventListener('cancel',event=>{event.preventDefault();closeCalendarSave();});
  $('calendarSaveDialog').addEventListener('click',event=>{if(event.target===$('calendarSaveDialog'))closeCalendarSave();});
  $('calendarDiscardBtn').addEventListener('click',()=>{
    if(state.calendarMovePending)return;
    const closeAfter=calendarCloseAfterSave;
    clearCalendarDrafts();renderCalendarDrafts();calendarFeedback('');
    // Read back the server positions, including any earlier partially saved item.
    void loadWorklogHistory({quiet:true,force:true});
    showToast('Đã bỏ các thay đổi chưa lưu.');
    if(closeAfter)closeHistory();
  });
  window.addEventListener('beforeunload',event=>{if(state.calendarDrafts.size||state.calendarMovePending){event.preventDefault();event.returnValue='';}});
  $('closeCalendarLogBtn').addEventListener('click', () => closeCalendarLog());
  $('calendarLogDialog').addEventListener('cancel', event => { event.preventDefault(); closeCalendarLog(); });
  $('calendarLogDialog').addEventListener('click', event => { if (event.target === $('calendarLogDialog')) closeCalendarLog(); });
  $('calendarTaskSearch').addEventListener('input', renderCalendarPicker);
  $('calendarTaskRefreshBtn').addEventListener('click', () => { void loadCalendarPicker(true); });
  window.addEventListener('blur', cancelCalendarGesture);
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetCalendarInteraction(); });
}
document.addEventListener('DOMContentLoaded', setupCalendarInteractions);
