'use strict';
// Read the existing UI busy states. This indicator never starts a request,
// steals focus, blocks navigation, or changes a logwork transaction.
document.addEventListener('DOMContentLoaded', () => {
  const hud = document.createElement('div');
  hud.id = 'dataLoadingFeedback';
  hud.hidden = true;
  hud.setAttribute('role', 'status');
  hud.setAttribute('aria-live', 'polite');
  hud.setAttribute('aria-atomic', 'true');
  hud.innerHTML = '<div class="data-loading-card"><span class="data-loading-spinner" aria-hidden="true"></span><strong></strong><span>Vui lòng chờ trong giây lát</span></div>';
  document.body.append(hud);
  const title = hud.querySelector('strong');
  const byId = id => document.getElementById(id);
  const shown = el => !!el?.getClientRects().length && !el.closest('.hidden, [hidden]');
  let frame = 0, timer = 0, pending = '';
  function current() {
    if (document.body.classList.contains('booting')) return null;
    if (byId('logProgressDialog')?.open) return null;
    const dialogs = [...document.querySelectorAll('dialog[open]')];
    const dialog = dialogs.at(-1);
    if (dialog) {
      if (dialog.id === 'calendarLogDialog' && shown(byId('calendarTaskRefreshBtn')) && byId('calendarTaskRefreshBtn').disabled)
        return { title: 'Đang tải Sub-task…', host: dialog };
      return null; // Native editing/progress dialogs own their status feedback.
    }
    if (shown(byId('historyOverlay'))) {
      return byId('historyResults')?.getAttribute('aria-busy') === 'true'
        ? { title: 'Đang tải lịch worklog…', host: document.fullscreenElement || document.body } : null;
    }
    if (shown(byId('plannerOverlay'))) {
      return byId('plannerOverlay').querySelector('.summary-body')?.getAttribute('aria-busy') === 'true'
        ? { title: 'Đang tổng hợp giờ làm…', host: document.fullscreenElement || document.body } : null;
    }
    if (shown(byId('settingsOverlay'))) return null;
    const bulk = shown(byId('bulkCard')), single = shown(byId('worklogCard'));
    if (bulk || single) {
      const card = byId(bulk ? 'bulkCapacityCard' : 'singleCapacityCard');
      if (card?.classList.contains('is-loading') && typeof state !== 'undefined' && (bulk ? state.bulkCapacity.loading : state.singleCapacity.loading)) return { title: 'Đang kiểm tra giờ đã log…', host: document.body };
      return null;
    }
    if (shown(byId('filterLoading'))) return { title: 'Đang tải danh sách Sub-task…', host: document.body };
    return null;
  }
  function sync() {
    frame = 0;
    const next = current();
    if (!next) {
      clearTimeout(timer); timer = 0; pending = '';
      if (!hud.hidden) hud.hidden = true;
      return;
    }
    if (hud.parentElement !== next.host) next.host.append(hud);
    if (title.textContent !== next.title) title.textContent = next.title;
    if (!hud.hidden || pending === next.title) return;
    clearTimeout(timer); pending = next.title;
    // Fast cached responses do not flash a loader or impose a minimum wait.
    timer = setTimeout(() => {
      timer = 0; pending = '';
      if (current()?.title === next.title) hud.hidden = false;
    }, 140);
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(sync); }
  new MutationObserver(records => {
    if (records.some(r => r.target !== hud && !hud.contains(r.target))) schedule();
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden', 'aria-busy', 'open', 'disabled'] });
  document.addEventListener('fullscreenchange', schedule);
  schedule();
});
