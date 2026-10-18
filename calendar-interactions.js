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

function calendarBlockFor(item) {
  const id=QuickJiraDrafts.key(item);
  return [...$('weeklyCalendar').querySelectorAll('[data-week-event]')].find(el=>QuickJiraDrafts.key(calendarRenderedItems[Number(el.dataset.weekEvent)])===id);
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
  const partner=!proposal.problem&&proposal.swap,id=partner?QuickJiraDrafts.key(partner):null;
  for(const job of [...calendarHoverMotions.values()])if(job.id!==id){labelCalendarHoverJob(job,job.item);retargetCalendarHoverJob(job,calendarHoverSlot(job.item,job.node),'return');}
  if(!partner)return;
  const job=calendarHoverMotions.get(id)||createCalendarHoverJob(partner);
  if(job){labelCalendarHoverJob(job,proposal.changes[1]);retargetCalendarHoverJob(job,calendarHoverSlot(proposal.changes[1],job.node),'away');}
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

function calendarPreviewItems() { return QuickJiraDrafts.project(state.historyItems, state.calendarDrafts); }
function calendarIsDraft(item) { return state.calendarDrafts.has(QuickJiraDrafts.key(item)); }
function syncCalendarSaveButton() {
  const count = state.calendarDrafts.size, button = $('calendarSaveBtn');
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
  results.scrollTo(scroll.left,scroll.top);
  $('weeklyCalendar').querySelector('.weekly-scroll')?.scrollTo(weekScroll.left,weekScroll.top);
}
function calendarDraftMessage() {
  return state.calendarDrafts.size ? `${state.calendarDrafts.size} lịch chưa lưu · Bấm icon lưu phía trên để xác nhận.` : '';
}
function clearCalendarDrafts() {
  state.calendarDrafts.clear();
  $('calendarSaveDialog').close();
  calendarCloseAfterSave=false;
  syncCalendarSaveButton();
}
function openCalendarSave({ closeAfter = false } = {}) {
  if (!state.calendarDrafts.size || state.calendarMovePending) return;
  resetCalendarInteraction();
  calendarCloseAfterSave = closeAfter;
  $('calendarSaveTitle').textContent = closeAfter ? 'Lịch có thay đổi chưa lưu' : 'Xác nhận lưu lịch';
  const date = value => value.split('-').reverse().join('/');
  $('calendarSaveList').innerHTML = [...state.calendarDrafts.values()].map(d => {
    const target=QuickJiraDrafts.preview(d.original,d.target);
    return `<li><strong>${escapeHtml(d.original.key)}</strong><span>${date(d.original.date)} · ${d.original.start}–${d.original.end}</span><b aria-hidden="true">↓</b><span>${date(target.date)} · ${target.start}–${target.end}</span></li>`;
  }).join('');
  $('calendarSaveError').textContent=''; $('calendarSaveError').classList.add('hidden');
  $('calendarSaveHint').textContent=`${state.calendarDrafts.size} worklog sẽ được cập nhật trên Jira. Giữ nguyên thời lượng, mô tả và Overtime.`;
  $('calendarConfirmSaveBtn').textContent='Lưu lịch';
  if (!$('calendarSaveDialog').open) $('calendarSaveDialog').showModal();
  $('calendarCancelSaveBtn').focus({preventScroll:true});
}
function closeCalendarSave() {
  if (state.calendarMovePending) return;
  $('calendarSaveDialog').close(); calendarCloseAfterSave=false;
  $('calendarSaveBtn').focus({preventScroll:true});
}
function stageCalendarMove(item,target,proposal=null,livePreview=false) {
  if(calendarReadOnly()||item?.calendarReadOnly)return;
  if (state.calendarMovePending) return;
  const drop=proposal||QuickJiraDrafts.drop(item,target,calendarPreviewItems());
  if(drop.problem)return calendarFeedback(drop.problem,true);
  if(drop.changes.some(x=>state.calendarDrafts.get(QuickJiraDrafts.key(x))?.status==='unknown')) {
    if(livePreview)returnCalendarHoverPreview();
    return calendarFeedback('Chưa rõ kết quả lần lưu trước. Bấm Lưu lịch để đối chiếu Jira trước khi kéo tiếp.',true);
  }
  const swapMotion=livePreview?null:prepareCalendarSwapMotion(drop);
  // Commit both previews together; each draft retains its own original snapshot.
  for(const moved of drop.changes) {
    const id=QuickJiraDrafts.key(moved),previous=state.calendarDrafts.get(id);
    const original=previous?.original||{...(calendarPreviewItems().find(x=>QuickJiraDrafts.key(x)===id)||moved)};
    if(original.date===moved.date&&original.start===moved.start)state.calendarDrafts.delete(id);
    else state.calendarDrafts.set(id,{original,target:{date:moved.date,start:moved.start},status:previous?.status||'pending'});
  }
  calendarKeepHoverOnRender=livePreview;
  try {renderCalendarDrafts();} finally {calendarKeepHoverOnRender=false;}
  if(livePreview)finishCalendarHoverDrop();
  playCalendarSwapMotion(swapMotion);
  calendarFeedback(`${drop.swap?'Đã đổi chỗ ở bản nháp · ':''}${calendarDraftMessage()||'Đã đưa lịch về vị trí gốc.'}`);
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
async function checkCalendarDrafts() {
  const drafts=[...state.calendarDrafts.values()],dates=[...new Set(drafts.flatMap(d=>[d.original.date,d.target.date]))],items=[];
  for (const date of dates) {
    const data=await fetchHistoryRange({start:date,end:date},'',true);
    if (data.skipped?.length || data.truncated || !Array.isArray(data.items)) throw new Error('Chưa đọc đủ lịch trên Jira. Chưa gửi thay đổi; vui lòng thử lại.');
    items.push(...data.items);
  }
  const fresh=[...new Map(items.map(item=>[QuickJiraDrafts.key(item),item])).values()];
  for (const draft of drafts) {
    const id=QuickJiraDrafts.key(draft.original),current=fresh.find(item=>QuickJiraDrafts.key(item)===id);
    if (draft.status==='unknown' && current && QuickJiraDrafts.same(current,QuickJiraDrafts.preview(draft.original,draft.target))) {
      state.calendarDrafts.delete(id); continue;
    }
    if (!current || !QuickJiraDrafts.same(current,draft.original)) {
      draft.status='conflict';
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
  let active=null,verified=0,error=null;
  state.calendarMovePending=true; calendarSaveLock(true);
  $('calendarSaveError').classList.add('hidden');
  $('calendarSaveHint').textContent='Đang kiểm tra dữ liệu mới nhất trên Jira…';
  try {
    const ordered=await checkCalendarDrafts();
    if (state.user!==user) return;
    verified=total-state.calendarDrafts.size;
    for (const draft of ordered) {
      if (state.user!==user) return;
      if(draft.cycle) {
        const group=draft.cycle;active=group;
        $('calendarSaveHint').textContent=`Đang đổi chỗ ${group.length} worklog trên Jira…`;
        const requestId=createRequestId('calendar-swap');
        const data=await api('/api?action=calendar-moves',{method:'POST',requestId,body:JSON.stringify({requestId,moves:group.map(d=>({key:d.original.key,worklogId:d.original.id,date:d.target.date,start:d.target.start,expectedStarted:QuickJiraDrafts.started(d.original),expectedSeconds:QuickJiraDrafts.seconds(d.original)}))})});
        if(data.worklogVerified!==true||data.moved!==true||!Array.isArray(data.items)||group.some(d=>!data.items.some(x=>QuickJiraDrafts.key(x)===QuickJiraDrafts.key(d.original)&&QuickJiraDrafts.same(x,QuickJiraDrafts.preview(d.original,d.target))))) {
          const e=new Error('Chưa xác nhận đủ kết quả đổi chỗ. Bấm Lưu lịch để đối chiếu Jira.');e.code='RESULT_UNKNOWN';throw e;
        }
        for(const d of group) {
          const id=QuickJiraDrafts.key(d.original);
          state.historyItems=state.historyItems.map(item=>QuickJiraDrafts.key(item)===id?QuickJiraDrafts.preview(item,d.target):item);
          state.calendarDrafts.delete(id);verified++;
        }
        active=null;syncCalendarSaveButton();continue;
      }
      active=draft;
      $('calendarSaveHint').textContent=`Đang lưu ${verified+1}/${total} · ${draft.original.key}…`;
      const data=await api('/api?action=worklog-correction',{method:'PATCH',body:JSON.stringify({
        key:draft.original.key,worklogId:draft.original.id,date:draft.target.date,start:draft.target.start,moveOnly:true,
        expectedStarted:QuickJiraDrafts.started(draft.original),expectedSeconds:QuickJiraDrafts.seconds(draft.original)
      })});
      if (data.worklogVerified!==true || data.moved!==true) {const e=new Error('Jira chưa xác nhận vị trí mới. Bấm Lưu lịch để đối chiếu trước khi thử lại.');e.code='RESULT_UNKNOWN';throw e;}
      const id=QuickJiraDrafts.key(draft.original);
      state.historyItems=state.historyItems.map(item=>QuickJiraDrafts.key(item)===id?QuickJiraDrafts.preview(item,draft.target):item);
      state.calendarDrafts.delete(id); verified++; active=null;
      syncCalendarSaveButton();
    }
  } catch (e) {
    error=e;
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
        $('calendarSaveDialog').close(); calendarCloseAfterSave=false;
        calendarFeedback(''); showToast(`Lưu lịch thành công · ${total} worklog.`);
        if (closeAfter) closeHistory();
      } else {
        calendarFeedback(calendarDraftMessage(),!!error);
        $('calendarSaveHint').textContent=`Còn ${state.calendarDrafts.size} lịch chưa lưu. Kiểm tra lỗi rồi xác nhận lại hoặc bỏ thay đổi.`;
        $('calendarConfirmSaveBtn').textContent='Kiểm tra và lưu lại';
      }
    } else { state.calendarMovePending=false; calendarSaveLock(false); }
  }
}


function calendarFeedback(message, error = false) {
  const box = $('calendarInteractionState');
  box.textContent = message;
  box.classList.toggle('is-error', error);
  box.classList.toggle('hidden', !message);
}
function setCalendarEditMode(enabled) {
  calendarEditMode = enabled;
  $('weeklyCalendar').classList.toggle('is-calendar-editing', enabled);
  if (!state.calendarMovePending) calendarFeedback(enabled ? 'Đang chỉnh sửa · Kéo để lưu tạm, chạm ngoài để kết thúc.' : calendarDraftMessage());
}
function cancelCalendarGesture({returnHover=true}={}) {
  const gesture = calendarGesture;
  calendarGesture = null;
  cancelAnimationFrame(calendarDragFrame);
  if (gesture) {
    if(gesture.dragging)calendarIgnoreClickUntil=performance.now()+600;
    clearTimeout(gesture.timer);
    gesture.ghost?.remove();
    gesture.highlights?.forEach(el=>el.remove());
    gesture.block?.classList.remove('is-drag-source');
    try { gesture.block?.releasePointerCapture(gesture.id); } catch {}
  }
  document.body.classList.remove('calendar-dragging');
  if(returnHover)returnCalendarHoverPreview();
}
function resetCalendarInteraction() { cancelCalendarSwapMotion(); cancelCalendarGesture({returnHover:false}); cancelCalendarHoverMotion(); setCalendarEditMode(false); }
function calendarBlockClick(event, item) {
  if (calendarEditMode || state.calendarMovePending || performance.now() < calendarIgnoreClickUntil) { event.preventDefault(); return; }
  if (calendarIsDraft(item)) { openCalendarSave(); return; }
  openCorrection(item);
}
function calendarMinuteLabel(value) { return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(Math.round(value % 60)).padStart(2, '0')}`; }
function calendarPointTarget(x, y, grabMinutes = 0) {
  const column = document.elementFromPoint(x, y)?.closest('.week-day-column');
  if (!column || !column.closest('#weeklyCalendar')) return null;
  const rect = column.getBoundingClientRect(), body = column.parentElement;
  const scale = rect.height / Number(body.dataset.minuteRange);
  const minute = Math.round((Number(column.dataset.fromMinute) + (y - rect.top) / scale - grabMinutes) / 30) * 30;
  if (minute < 0 || minute >= 1440) return null;
  return { date: column.dataset.calendarDate, minute, start: calendarMinuteLabel(minute) };
}
function calendarDropProposal(item,target,x,y) {
  const block=document.elementFromPoint(x,y)?.closest('#weeklyCalendar [data-week-event]');
  const hovered=block?calendarRenderedItems[Number(block.dataset.weekEvent)]:null;
  return QuickJiraDrafts.drop(item,target,calendarPreviewItems(),hovered);
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
    highlight.style.cssText=`display:block;left:${rect.left-grid.left+2}px;top:${rect.top-grid.top+top}px;width:${rect.width-4}px;height:${QuickJiraDrafts.seconds(item)/60*scale}px`;
    highlight.classList.toggle('is-invalid',!!proposal.problem);highlight.classList.toggle('is-swap',!!proposal.swap);
    highlight.querySelector('span').textContent=`${proposal.swap?'⇄ ':''}${item.start}–${item.end}`;
  });
}

function updateCalendarDrag() {
  const g = calendarGesture;
  if (!g?.dragging) return;
  const bounds = $('historyResults').getBoundingClientRect();
  const dx = g.x < bounds.left + 28 ? -10 : g.x > bounds.right - 28 ? 10 : 0;
  const dy = g.y < bounds.top + 42 ? -10 : g.y > bounds.bottom - 28 ? 10 : 0;
  if (g.x >= bounds.left && g.x <= bounds.right && g.y >= bounds.top && g.y <= bounds.bottom) $('historyResults').scrollBy(dx, dy);
  g.target = calendarPointTarget(g.x, g.y, g.grabMinutes);
  const proposal=g.proposal=calendarDropProposal(g.item,g.target,g.x,g.y),problem=proposal.problem;
  highlightCalendarDrop(g,proposal);
  updateCalendarHoverPreview(g,proposal);
  const moved=proposal.changes?.[0];
  const end=moved?.end||'';
  g.ghost.style.left = `${Math.max(4, Math.min(innerWidth - g.ghost.offsetWidth - 4, g.x - g.grabX))}px`;
  const area=g.highlights?.[0]?.getBoundingClientRect(),ghostHeight=g.ghost.offsetHeight;
  let ghostTop=area?area.bottom+12:g.y+24;
  if(ghostTop+ghostHeight>innerHeight-12)ghostTop=(area?.top||g.y)-ghostHeight-12;
  g.ghost.style.top=`${Math.max(8,Math.min(innerHeight-ghostHeight-8,ghostTop))}px`;
  g.ghost.classList.toggle('is-invalid', !!problem);
  g.ghost.querySelector('span').textContent = moved ? `${moved.date.split('-').reverse().join('/')} · ${moved.start}–${end}` : 'Chọn vị trí trong lịch';
  g.ghost.querySelector('small').textContent = problem || (proposal.swap?`Thả để đổi chỗ với ${proposal.swap.key} · Lưu tạm`:'Thả để lưu tạm · Chưa cập nhật Jira');
  calendarDragFrame = requestAnimationFrame(updateCalendarDrag);
}
function startCalendarDrag(g) {
  if (g !== calendarGesture || state.calendarMovePending) return;
  g.dragging = true;
  clearTimeout(g.timer);
  g.block.classList.add('is-drag-source');
  const ghost = document.createElement('div'); ghost.className = 'calendar-drag-ghost';
  ghost.innerHTML = `<strong>${escapeHtml(g.item.key)}</strong><span></span><small></small>`;
  ghost.style.width = `${Math.max(170, Math.min(280, g.rect.width))}px`;
  document.body.append(ghost); g.ghost = ghost;
  document.body.classList.add('calendar-dragging');
  try { g.block.setPointerCapture(g.id); } catch {}
  updateCalendarDrag();
}

async function openCalendarLog(date, start) {
  if(calendarReadOnly())return;
  if (!state.user || state.calendarMovePending || state.historyLoading || state.submitInFlight) return;
  if (!QuickJiraUi.validDate(date)) return;
  if (state.calendarDrafts.size) { openCalendarSave(); return; }
  resetCalendarInteraction();
  calendarFocusSource = document.activeElement;
  state.calendarLogContext = { date, start };
  $('calendarLogFeedback').classList.add('hidden');
  $('calendarLogSelection').textContent = `${date.split('-').reverse().join('/')} · Bắt đầu ${start}`;
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
  const clearMotion=()=>{cancelCalendarSwapMotion();cancelCalendarHoverMotion();};
  window.addEventListener('resize',clearMotion);
  window.visualViewport?.addEventListener('resize',clearMotion);
  document.addEventListener('fullscreenchange',clearMotion);
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',clearMotion);
  window.addEventListener('blur',clearMotion);
  grid.addEventListener('pointerdown', event => {
    const block = event.target.closest('[data-week-event]');
    if (!block || calendarReadOnly() || state.calendarMovePending || state.historyLoading || event.button > 0) return;
    const item = calendarRenderedItems[Number(block.dataset.weekEvent)];
    if (!item) return;
    cancelCalendarGesture();
    const rect = block.getBoundingClientRect(), column = block.closest('.week-day-column');
    const scale = column.getBoundingClientRect().height / Number(column.parentElement.dataset.minuteRange);
    const mobile = event.pointerType === 'touch';
    const g = calendarGesture = { id: event.pointerId, mobile, block, item, rect, initialX: event.clientX, initialY: event.clientY, x: event.clientX, y: event.clientY, grabX: event.clientX - rect.left, grabMinutes: (event.clientY - rect.top) / scale, ready: !mobile || calendarEditMode };
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
    if (g.ready && distance > 6 && !g.dragging) startCalendarDrag(g);
    if (g.dragging) event.preventDefault();
  }, { passive: false });
  document.addEventListener('pointerup', event => {
    const g = calendarGesture;
    if (!g || g.id !== event.pointerId) return;
    if (g.dragging) {
      const target=calendarPointTarget(event.clientX,event.clientY,g.grabMinutes),proposal=calendarDropProposal(g.item,target,event.clientX,event.clientY),problem=proposal.problem;
      updateCalendarHoverPreview(g,proposal);
      calendarIgnoreClickUntil = performance.now() + 600;
      cancelCalendarGesture({returnHover:!!problem});
      if (problem) calendarFeedback(problem, true); else stageCalendarMove(g.item,target,proposal,true);
      event.preventDefault();
    } else { if (g.mobile && g.ready) calendarIgnoreClickUntil = performance.now() + 500; cancelCalendarGesture(); }
  });
  document.addEventListener('pointercancel', () => cancelCalendarGesture());
  grid.addEventListener('touchstart', event => { if (calendarEditMode && event.target.closest('[data-week-event]')) event.preventDefault(); }, { passive: false });
  grid.addEventListener('touchmove', event => { if (calendarEditMode && calendarGesture) event.preventDefault(); }, { passive: false });
  grid.addEventListener('contextmenu', event => { if (event.target.closest('[data-week-event]')) event.preventDefault(); });
  document.addEventListener('pointerdown', event => {
    if (calendarEditMode && !event.target.closest('#weeklyCalendar [data-week-event]')) {
      resetCalendarInteraction(); calendarIgnoreClickUntil = performance.now() + 500;
    }
  }, true);
  grid.addEventListener('click', event => {
    if (event.target.closest('[data-week-event]') || state.calendarMovePending || performance.now() < calendarIgnoreClickUntil) return;
    const target = calendarPointTarget(event.clientX, event.clientY);
    if (target) void openCalendarLog(target.date, target.start);
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if ($('calendarSaveDialog').open) {event.preventDefault();event.stopImmediatePropagation();closeCalendarSave();return;}
    if (calendarGesture || calendarEditMode) { event.preventDefault(); event.stopImmediatePropagation(); cancelCalendarGesture();setCalendarEditMode(false);return; }
    if (calendarSwapMotion||calendarHoverMotions.size) {event.preventDefault();event.stopImmediatePropagation();clearMotion();return;}
    else if ($('calendarLogDialog').open && !state.confirmOpen && !$('logProgressDialog').open) { event.preventDefault(); event.stopImmediatePropagation(); closeCalendarLog(); }
  }, true);
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
