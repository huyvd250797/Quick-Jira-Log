'use strict';

(() => {
  const desktop = $('desktopNavigation');
  const mobile = $('mobileTaskbar');
  const search = $('jiraSearchDialog');
  const stats = $('projectStatsDialog');
  const history = $('historyOverlay');
  const isHistoryOpen = () => history.getAttribute('aria-hidden') === 'false';
  let switching = false;

  function currentPage() {
    if (stats.open) return 'stats';
    if (search.open) return 'search';
    if (isHistoryOpen()) return 'history';
    return 'home';
  }

  function update() {
    const current = currentPage();
    desktop.classList.toggle('hidden', !state.user);
    for (const button of document.querySelectorAll('[data-qjl-nav]')) {
      if (button.dataset.qjlNav === current) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
  }

  const wide = window.matchMedia('(min-width: 900px)');
  const panels = [search, stats, history.querySelector('.history-tool-sheet')].map(surface => {
    const nav = desktop.cloneNode(true);
    nav.removeAttribute('id');
    nav.className = 'qjl-nav qjl-panel-nav';
    for (const button of nav.children) button.removeAttribute('id');
    return { surface, nav };
  });
  function positionNavigation() {
    for (const { surface, nav } of panels) {
      if (wide.matches) surface.prepend(nav);
      else surface.append(nav);
    }
  }
  wide.addEventListener('change', positionNavigation);
  positionNavigation();

  const observer = new MutationObserver(update);
  for (const surface of [search, stats, history, mobile]) {
    observer.observe(surface, { attributes: true, attributeFilter: ['open', 'aria-hidden', 'class'] });
  }
  update();

  function closeDialog(dialog) {
    return new Promise(resolve => {
      dialog.addEventListener('close', resolve, { once: true });
      dialog.close();
    });
  }

  async function go(page) {
    if (!state.user || switching || page === currentPage() || QuickJiraBusy.active) return;
    const owner = state.user;
    switching = true;
    try {
      if (isHistoryOpen()) {
        if (window.QuickJiraBatch?.active || state.calendarDrafts.size || state.calendarMovePending) {
          closeHistory();
          return;
        }
        closeHistory({ immediate: true });
      }
      if (search.open) await closeDialog(search);
      if (stats.open) await closeDialog(stats);
      if (owner !== state.user) return;
      if (page === 'search') void window.QuickJiraSearch.open();
      else if (page === 'history') openHistory();
      else if (page === 'stats') void window.QuickJiraProjectReport.open();
      else $(isMobileEditorMode() ? 'mobileHomeBtn' : 'desktopHomeBtn').focus({ preventScroll: true });
    } finally {
      switching = false;
      update();
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-qjl-nav]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    void go(button.dataset.qjlNav);
  }, true);
})();

(() => {
  const viewport = window.visualViewport;
  const root = document.documentElement;
  const editor = $('worklogCard');
  const fields = editor.querySelector('.qjl-worklog-fields');
  const filterSheet = $('jiraMobileFiltersDialog');
  const confirmation = $('logConfirmOverlay').querySelector('.confirm-dialog');

  function syncViewport() {
    const height = viewport?.height || window.innerHeight;
    root.style.setProperty('--qjl-visible-height', `${height}px`);
    root.style.setProperty('--qjl-visible-top', `${viewport?.offsetTop || 0}px`);
    root.classList.toggle('qjl-keyboard-open', window.innerHeight - height > 130);
    const focused = document.activeElement;
    const pane = fields.contains(focused) ? fields : filterSheet.querySelector('.qjl-sheet-body');
    if (!pane.contains(focused) || !focused.matches('input, select, textarea')) return;
    requestAnimationFrame(() => {
      if (focused !== document.activeElement) return;
      const target = focused.getBoundingClientRect();
      const bounds = pane.getBoundingClientRect();
      if (target.bottom + 8 > bounds.bottom) pane.scrollTop += target.bottom + 8 - bounds.bottom;
      else if (target.top - 8 < bounds.top) pane.scrollTop += target.top - 8 - bounds.top;
    });
  }

  function keepFocus(event) {
    if (event.key !== 'Tab' || $('logProgressDialog').open) return;
    const items = [...event.currentTarget.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea, select, a[href]')]
      .filter(control => control.getClientRects().length > 0 && control.tabIndex >= 0);
    if (!items.length) return;
    const first = items[0];
    const last = items.at(-1);
    if (event.shiftKey ? event.target === first : event.target === last) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  }

  editor.addEventListener('keydown', keepFocus);
  confirmation.addEventListener('keydown', keepFocus);
  $('historyOverlay').querySelector('.history-tool-sheet').addEventListener('keydown', keepFocus);
  editor.addEventListener('focusin', syncViewport);
  filterSheet.addEventListener('focusin', syncViewport);
  viewport?.addEventListener('resize', syncViewport);
  viewport?.addEventListener('scroll', syncViewport);
  window.addEventListener('resize', syncViewport);
  syncViewport();
})();
