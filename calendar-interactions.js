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
function stageCalendarMove(item,target) {
  if (state.calendarMovePending) return;
  const id=QuickJiraDrafts.key(item), previous=state.calendarDrafts.get(id);
  const original=previous?.original || {...item};
  if (previous?.status === 'unknown') return calendarFeedback('Chưa rõ kết quả lần lưu trước. Bấm Lưu lịch để đối chiếu Jira trước khi kéo tiếp.',true);
  if (original.date === target.date && original.start === target.start) state.calendarDrafts.delete(id);
  else state.calendarDrafts.set(id,{original,target:{date:target.date,start:target.start},status:previous?.status||'pending'});
  renderCalendarDrafts();
  calendarFeedback(calendarDraftMessage() || 'Đã đưa lịch về vị trí gốc.');
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
    if (active && (e.details?.resultUnknown || /UNKNOWN/.test(e.code||'') || !e.status || e.status>=500)) active.status='unknown';
    $('calendarSaveError').textContent=`${verified ? `Đã xác nhận ${verified}/${total} lịch. ` : ''}${e.message || 'Chưa lưu được lịch.'} Các thay đổi chưa xác nhận vẫn được giữ tạm.`;
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
function cancelCalendarGesture() {
  const gesture = calendarGesture;
  calendarGesture = null;
  cancelAnimationFrame(calendarDragFrame);
  if (gesture) {
    clearTimeout(gesture.timer);
    gesture.ghost?.remove();
    gesture.block?.classList.remove('is-drag-source');
    try { gesture.block?.releasePointerCapture(gesture.id); } catch {}
  }
  document.body.classList.remove('calendar-dragging');
}
function resetCalendarInteraction() { cancelCalendarGesture(); setCalendarEditMode(false); }
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
function calendarDropProblem(item, target) {
  if (!target) return 'Thả block vào cột ngày và khung giờ trong lịch.';
  const duration = Number(item.timeSpentSeconds ?? item.minutes * 60) / 60, end = target.minute + duration;
  const windows = isWeekendDateClient(target.date) ? [[480, 720], [810, 1050]] : [[480, 720], [810, 1050], [1050, 1439]];
  if (!windows.some(([a,b]) => target.minute >= a && end <= b)) return 'Khoảng giờ này nằm ngoài khung cho phép hoặc đi qua giờ nghỉ.';
  if (calendarPreviewItems().some(other => !(other.id === item.id && other.key === item.key) && other.date === target.date && target.minute < QuickJiraUi.minuteOfDay(other.start) + Number(other.timeSpentSeconds ?? other.minutes * 60) / 60 && end > QuickJiraUi.minuteOfDay(other.start))) return 'Khoảng giờ này đã có worklog. Chọn vị trí trống khác.';
  return '';
}
function updateCalendarDrag() {
  const g = calendarGesture;
  if (!g?.dragging) return;
  const bounds = $('historyResults').getBoundingClientRect();
  const dx = g.x < bounds.left + 28 ? -10 : g.x > bounds.right - 28 ? 10 : 0;
  const dy = g.y < bounds.top + 42 ? -10 : g.y > bounds.bottom - 28 ? 10 : 0;
  if (g.x >= bounds.left && g.x <= bounds.right && g.y >= bounds.top && g.y <= bounds.bottom) $('historyResults').scrollBy(dx, dy);
  g.target = calendarPointTarget(g.x, g.y, g.grabMinutes);
  const problem = calendarDropProblem(g.item, g.target);
  const end = g.target ? calendarMinuteLabel(g.target.minute + Number(g.item.minutes)) : '';
  g.ghost.style.left = `${Math.max(4, Math.min(innerWidth - g.ghost.offsetWidth - 4, g.x - g.grabX))}px`;
  g.ghost.style.top = `${g.y - 20}px`;
  g.ghost.classList.toggle('is-invalid', !!problem);
  g.ghost.querySelector('span').textContent = g.target ? `${g.target.date.split('-').reverse().join('/')} · ${g.target.start}–${end}` : 'Chọn vị trí trong lịch';
  g.ghost.querySelector('small').textContent = problem || 'Thả để lưu tạm · Chưa cập nhật Jira';
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
  grid.addEventListener('pointerdown', event => {
    const block = event.target.closest('[data-week-event]');
    if (!block || state.calendarMovePending || state.historyLoading || event.button > 0) return;
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
      const target = calendarPointTarget(event.clientX, event.clientY, g.grabMinutes), problem = calendarDropProblem(g.item, target);
      calendarIgnoreClickUntil = performance.now() + 600;
      cancelCalendarGesture();
      if (problem) calendarFeedback(problem, true); else stageCalendarMove(g.item, target);
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
    if (calendarGesture || calendarEditMode) { event.preventDefault(); event.stopImmediatePropagation(); resetCalendarInteraction(); }
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
