'use strict';
// Shared weekly-calendar gestures. No optimistic write: Jira read-back is required.
const calendarLogHome = document.getElementById('worklogCard').parentElement;
const calendarConfirmHome = document.getElementById('logConfirmOverlay').parentElement;
let calendarEditMode = false;
let calendarGesture = null;
let calendarIgnoreClickUntil = 0;
let calendarDragFrame = 0;
let calendarPickerSeq = 0;
let calendarFocusSource = null;

function calendarFeedback(message, error = false) {
  const box = $('calendarInteractionState');
  box.textContent = message;
  box.classList.toggle('is-error', error);
  box.classList.toggle('hidden', !message);
}
function setCalendarEditMode(enabled) {
  calendarEditMode = enabled;
  $('weeklyCalendar').classList.toggle('is-calendar-editing', enabled);
  if (!state.calendarMovePending) calendarFeedback(enabled ? 'Đang chỉnh sửa · Kéo block để đổi giờ. Chạm ngoài block để kết thúc.' : '');
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
  if (state.historyItems.some(other => !(other.id === item.id && other.key === item.key) && other.date === target.date && target.minute < QuickJiraUi.minuteOfDay(other.start) + Number(other.timeSpentSeconds ?? other.minutes * 60) / 60 && end > QuickJiraUi.minuteOfDay(other.start))) return 'Khoảng giờ này đã có worklog. Chọn vị trí trống khác.';
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
  g.ghost.querySelector('small').textContent = problem || 'Thả để lưu trên Jira';
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
async function moveCalendarWorklog(item, target) {
  if (state.calendarMovePending || (item.date === target.date && item.start === target.start)) return;
  state.calendarMovePending = true;
  calendarFeedback(`Đang lưu ${item.key} → ${target.start} trên Jira…`);
  $('weeklyCalendar').setAttribute('aria-busy', 'true');
  try {
    const data = await api('/api?action=worklog-correction', { method: 'PATCH', body: JSON.stringify({
      key: item.key, worklogId: item.id, date: target.date, start: target.start, moveOnly: true,
      expectedStarted: item.started || `${item.date}T${item.start}:00.000+0700`,
      expectedSeconds: Number(item.timeSpentSeconds ?? item.minutes * 60)
    }) });
    if (data.worklogVerified !== true || data.moved !== true) throw new Error('Jira chưa xác nhận vị trí mới. Hãy tải lại lịch trước khi kéo tiếp.');
    invalidateHistoryCache(); invalidateDayAuditCache();
    void refreshDashboard({ force: true });
    if (!$('historyOverlay').classList.contains('hidden')) await loadWorklogHistory({ quiet: true, force: true });
    calendarFeedback(`Đã chuyển ${item.key} sang ${target.start}${calendarEditMode ? ' · Chạm ngoài block để kết thúc chỉnh sửa.' : ''}`);
  } catch (error) {
    if (error.details?.resultUnknown || ['WORKLOG_STALE','RESULT_UNKNOWN'].includes(error.code) || !error.status || error.status >= 500) {
      invalidateHistoryCache(); invalidateDayAuditCache();
      if (!$('historyOverlay').classList.contains('hidden')) await loadWorklogHistory({ quiet: true, force: true });
    }
    calendarFeedback(error.message || 'Chưa chuyển được worklog. Hãy tải lại lịch.', true);
  } finally {
    state.calendarMovePending = false;
    $('weeklyCalendar').setAttribute('aria-busy', 'false');
  }
}

async function openCalendarLog(date, start) {
  if (!state.user || state.calendarMovePending || state.historyLoading || state.submitInFlight) return;
  if (!QuickJiraUi.validDate(date)) return;
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
    const item = state.historyItems[Number(block.dataset.weekEvent)];
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
      if (problem) calendarFeedback(problem, true); else void moveCalendarWorklog(g.item, target);
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
    if (calendarGesture || calendarEditMode) { event.preventDefault(); event.stopImmediatePropagation(); resetCalendarInteraction(); }
    else if ($('calendarLogDialog').open && !state.confirmOpen && !$('logProgressDialog').open) { event.preventDefault(); event.stopImmediatePropagation(); closeCalendarLog(); }
  }, true);
  $('closeCalendarLogBtn').addEventListener('click', () => closeCalendarLog());
  $('calendarLogDialog').addEventListener('cancel', event => { event.preventDefault(); closeCalendarLog(); });
  $('calendarLogDialog').addEventListener('click', event => { if (event.target === $('calendarLogDialog')) closeCalendarLog(); });
  $('calendarTaskSearch').addEventListener('input', renderCalendarPicker);
  $('calendarTaskRefreshBtn').addEventListener('click', () => { void loadCalendarPicker(true); });
  window.addEventListener('blur', cancelCalendarGesture);
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetCalendarInteraction(); });
}
document.addEventListener('DOMContentLoaded', setupCalendarInteractions);
