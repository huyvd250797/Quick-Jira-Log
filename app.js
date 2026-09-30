'use strict';

const APP_VERSION = '1.3.2';
const STORAGE = {
  prefs: 'quick-jira-log:prefs:v1',
  recent: 'quick-jira-log:recent-issues:v1',
  lastLog: 'quick-jira-log:last-log:v1',
  audit: 'quick-jira-log:audit:v1',
  theme: 'quick-jira-log:theme:v1'
};

const $ = id => document.getElementById(id);
const state = {
  user: null,
  toastTimer: null,
  filterIssues: [],
  filterLoaded: false,
  filterLoading: false,
  bulkMode: false,
  bulkSelectedKeys: new Set(),
  bulkDrafts: new Map(),
  issueLookupTimer: null,
  issueLookupSeq: 0,
  lastAutoIssueKey: '',
  currentIssueSummary: '',
  prefs: { lastProject: '', lastTimeSpent: '' },
  recentIssues: [],
  lastLog: null,
  auditHistory: [],
  settingsScrollY: 0,
  deferredInstallPrompt: null,
  quickHandled: false,
  bootFinished: false,
  historyItems: [],
  historyLoading: false,
  submitInFlight: false,
  bulkSubmitInFlight: false,
  previewTimer: null,
  previewSeq: 0,
  bulkPreviewTimer: null,
  bulkPreviewSeq: 0,
  mobileEditorScrollY: 0,
  theme: 'light'
};


function createRequestId(prefix = 'qjl') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isWeekendDateClient(date) {
  const match = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const day = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).getUTCDay();
  return day === 0 || day === 6;
}

function overtimeWindowLabel(date) {
  return isWeekendDateClient(date) ? '08:00–12:00 · 13:30–17:30' : '17:30–23:59';
}

function updateSingleOvertimeHint() {
  const hint = $('overtimeHint');
  if (!hint) return;
  const date = $('date')?.value || todayLocal();
  hint.textContent = isWeekendDateClient(date)
    ? 'OT cuối tuần: log trong 08:00–12:00 và 13:30–17:30; Jira sẽ đánh dấu Overtime.'
    : 'OT ngày thường: log từ 17:30 trở đi; Jira sẽ đánh dấu Overtime.';
}

function minutesLabel(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h}h` : '', m ? `${m}m` : ''].filter(Boolean).join('') || '0m';
}

function transitionPathLabel(transition) {
  const path = Array.isArray(transition?.path) ? transition.path.filter(Boolean) : [];
  if (path.length > 1) return path.join(' → ');
  return transition?.status || 'Done';
}

function showToast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
}

function isMobileEditorMode() {
  return window.matchMedia?.('(max-width: 899px)').matches === true;
}

function openMobileEditor(cardId) {
  const card = $(cardId);
  if (!card || !isMobileEditorMode()) return false;
  if (!document.body.classList.contains('mobile-editor-open')) {
    state.mobileEditorScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.style.top = `-${state.mobileEditorScrollY}px`;
    document.body.classList.add('mobile-editor-open');
  }
  $('mobileEditorBackdrop')?.classList.remove('hidden');
  $('mobileEditorBackdrop')?.setAttribute('aria-hidden', 'false');
  $('worklogCard')?.classList.toggle('mobile-bottom-sheet', cardId === 'worklogCard');
  $('bulkCard')?.classList.toggle('mobile-bottom-sheet', cardId === 'bulkCard');
  requestAnimationFrame(() => { card.scrollTop = 0; });
  return true;
}

function closeMobileEditor() {
  $('worklogCard')?.classList.remove('mobile-bottom-sheet');
  $('bulkCard')?.classList.remove('mobile-bottom-sheet');
  $('mobileEditorBackdrop')?.classList.add('hidden');
  $('mobileEditorBackdrop')?.setAttribute('aria-hidden', 'true');
  if (!document.body.classList.contains('mobile-editor-open')) return;
  document.body.classList.remove('mobile-editor-open');
  document.body.style.top = '';
  window.scrollTo(0, state.mobileEditorScrollY || 0);
}


function finishBoot(message = '') {
  if (state.bootFinished) return;
  state.bootFinished = true;
  if (message && $('bootMessage')) $('bootMessage').textContent = message;
  const splash = $('bootSplash');
  document.body.classList.remove('booting');
  if (!splash) return;
  splash.classList.add('leaving');
  setTimeout(() => splash.remove(), 260);
}

function setBootMessage(message) {
  if ($('bootMessage')) $('bootMessage').textContent = message;
}

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function readThemePreference() {
  try {
    const saved = localStorage.getItem(STORAGE.theme);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {}
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme, { persist = true } = {}) {
  const next = theme === 'dark' ? 'dark' : 'light';
  state.theme = next;
  document.documentElement.dataset.theme = next;
  document.documentElement.style.colorScheme = next;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', next === 'dark' ? '#07111f' : '#0f63e6');
  const themeBtn = $('themeBtn');
  if (themeBtn) {
    const toDark = next === 'light';
    themeBtn.setAttribute('aria-label', toDark ? 'Chuyển giao diện tối' : 'Chuyển giao diện sáng');
    themeBtn.setAttribute('title', toDark ? 'Dark mode' : 'Light mode');
  }
  if ($('themeState')) $('themeState').textContent = next === 'dark' ? 'Tối' : 'Sáng';
  $('lightThemeBtn')?.classList.toggle('active', next === 'light');
  $('darkThemeBtn')?.classList.toggle('active', next === 'dark');
  if (persist) { try { localStorage.setItem(STORAGE.theme, next); } catch {} }
}

function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  showToast(state.theme === 'dark' ? 'Đã bật Dark mode.' : 'Đã bật Light mode.');
}

function loadQuickData() {
  const prefs = readStorage(STORAGE.prefs, {});
  state.prefs = {
    lastProject: typeof prefs?.lastProject === 'string' ? prefs.lastProject : '',
    lastTimeSpent: typeof prefs?.lastTimeSpent === 'string' ? prefs.lastTimeSpent : ''
  };
  const recent = readStorage(STORAGE.recent, []);
  state.recentIssues = Array.isArray(recent) ? recent.slice(0, 8) : [];
  const lastLog = readStorage(STORAGE.lastLog, null);
  state.lastLog = lastLog && typeof lastLog === 'object' ? lastLog : null;
  const audit = readStorage(STORAGE.audit, []);
  state.auditHistory = Array.isArray(audit) ? audit.slice(0, 40) : [];
}

function savePrefs() {
  writeStorage(STORAGE.prefs, state.prefs);
}

function setLoggedIn(user) {
  state.user = user;
  document.body.classList.remove('single-log-open');
  $('loginCard').classList.add('hidden');
  $('filterCard').classList.remove('hidden');
  $('worklogCard').classList.add('hidden');
  $('statusCard').classList.remove('hidden');
  $('settingsBtn')?.classList.remove('hidden');
  $('plannerBtn')?.classList.remove('hidden');
  $('historyBtn')?.classList.remove('hidden');
  $('mobileTaskbar')?.classList.remove('hidden');
  document.body.classList.add('has-mobile-taskbar');
  $('userLabel').textContent = user?.displayName || user?.username || '';
  hydrateQuickInputs();
  if (!state.filterLoaded && !state.filterLoading) loadFilterIssues();
  updateConnectionState();
  handleQuickLaunch();
}

function setLoggedOut() {
  closeMobileEditor();
  state.user = null;
  document.body.classList.remove('single-log-open');
  state.filterIssues = [];
  state.filterLoaded = false;
  state.filterLoading = false;
  state.bulkMode = false;
  state.bulkSelectedKeys.clear();
  state.bulkDrafts.clear();
  $('statusCard').classList.add('hidden');
  $('settingsBtn')?.classList.add('hidden');
  $('plannerBtn')?.classList.add('hidden');
  $('historyBtn')?.classList.add('hidden');
  $('mobileTaskbar')?.classList.add('hidden');
  document.body.classList.remove('has-mobile-taskbar');
  closeAllToolOverlays({ restore: false });
  $('filterCard').classList.add('hidden');
  $('worklogCard').classList.add('hidden');
  $('bulkCard').classList.add('hidden');
  $('loginCard').classList.remove('hidden');
  $('resultCard').classList.add('hidden');
  renderFilterIssues();
  renderBulkSelection();
  updateConnectionState();
}

function updateConnectionState() {
  const el = $('connectionState');
  if (!el) return;
  const online = navigator.onLine;
  el.textContent = online ? 'Online' : 'Offline';
  el.classList.toggle('offline', !online);
}

function handleQuickLaunch() {
  if (state.quickHandled || !state.user) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('quick') !== '1') return;
  state.quickHandled = true;
  setTimeout(() => {
    $('filterCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => $('filterIssueSearch')?.focus(), 320);
  }, 180);
}

function isStandalonePwa() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function updatePwaUi() {
  const stateEl = $('pwaState');
  const installBtn = $('installPwaBtn');
  const help = $('pwaHelp');
  if (!stateEl || !installBtn || !help) return;
  if (isStandalonePwa()) {
    stateEl.textContent = 'Đã cài';
    stateEl.classList.add('installed');
    installBtn.textContent = 'ĐÃ CÀI TRÊN THIẾT BỊ';
    installBtn.disabled = true;
    help.textContent = 'Quick Jira Log đang chạy ở chế độ ứng dụng độc lập.';
    return;
  }
  stateEl.textContent = 'Web';
  stateEl.classList.remove('installed');
  installBtn.disabled = false;
  if (state.deferredInstallPrompt) {
    installBtn.textContent = 'CÀI ỨNG DỤNG';
    help.textContent = 'Có thể cài trực tiếp Quick Jira Log lên màn hình chính.';
  } else {
    installBtn.textContent = 'HƯỚNG DẪN CÀI';
    help.textContent = 'iPhone/iPad: Safari → Chia sẻ → Thêm vào Màn hình chính. Android: menu trình duyệt → Cài ứng dụng.';
  }
}

async function installPwa() {
  if (isStandalonePwa()) return;
  if (!state.deferredInstallPrompt) {
    updatePwaUi();
    showToast('iPhone: Safari → Chia sẻ → Thêm vào Màn hình chính.');
    return;
  }
  const prompt = state.deferredInstallPrompt;
  state.deferredInstallPrompt = null;
  await prompt.prompt();
  try { await prompt.userChoice; } catch {}
  updatePwaUi();
}

async function api(path, options = {}) {
  const { requestId, ...fetchOptions } = options;
  const response = await fetch(path, {
    credentials: 'same-origin',
    cache: fetchOptions.cache || 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(requestId ? { 'X-Request-ID': requestId } : {}),
      ...(fetchOptions.headers || {})
    },
    ...fetchOptions
  });
  let data = null;
  try { data = await response.json(); }
  catch { data = { ok: false, error: 'Server trả về dữ liệu không hợp lệ.' }; }
  if (response.status === 401) setLoggedOut();
  if (!response.ok || !data?.ok) {
    const error = new Error(data?.error || 'Có lỗi xảy ra.');
    error.details = data?.details;
    throw error;
  }
  return data;
}

async function checkStatus() {
  setBootMessage('Đang kiểm tra phiên Jira...');
  try {
    const response = await fetch('/api?action=status', { credentials: 'same-origin', cache: 'no-store' });
    const data = await response.json();
    if (data?.authenticated) {
      setBootMessage('Phiên Jira hợp lệ · đang mở ứng dụng...');
      setLoggedIn(data.user);
    } else {
      setBootMessage('Cần đăng nhập Jira...');
      setLoggedOut();
    }
  } catch {
    setLoggedOut();
  } finally {
    finishBoot();
  }
}

function setFilterUi(mode, message = '') {
  $('filterLoading').classList.toggle('hidden', mode !== 'loading');
  $('filterError').classList.toggle('hidden', mode !== 'error');
  $('filterEmpty').classList.toggle('hidden', mode !== 'empty');
  $('filterIssueList').classList.toggle('hidden', mode !== 'list');
  if (mode === 'error') $('filterError').textContent = message;
}

function filteredIssues() {
  const query = $('filterIssueSearch').value.trim().toLocaleLowerCase('vi');
  if (!query) return state.filterIssues;
  return state.filterIssues.filter(issue => {
    const text = `${issue.key} ${issue.summary} ${issue.project} ${issue.status} ${issue.issueType}`.toLocaleLowerCase('vi');
    return text.includes(query);
  });
}

function selectIssue({ key, project, summary = '' }, { scroll = true, focusTime = true } = {}) {
  const normalizedKey = String(key || '').trim().toUpperCase();
  if (!normalizedKey) return;
  const normalizedProject = project || normalizedKey.split('-')[0] || state.prefs.lastProject || '';
  const logDate = todayLocal();
  $('key').value = normalizedKey;
  $('project').value = normalizedProject;
  $('date').value = logDate;
  $('description').value = summary || '';
  if ($('overtime')) $('overtime').checked = false;
  updateSingleOvertimeHint();
  $('selectedIssueKey').textContent = normalizedKey;
  $('selectedIssueProject').textContent = normalizedProject || '—';
  $('selectedIssueSummary').textContent = summary || 'Issue không có Summary.';
  state.currentIssueSummary = summary || '';
  state.lastAutoIssueKey = normalizedKey;
  setIssueLookupState(summary ? `Summary: ${summary}` : 'Issue không có Summary.', 'ok');
  resetBulkState();
  $('resultCard').classList.add('hidden');
  $('worklogCard').classList.remove('hidden');
  document.body.classList.add('single-log-open');
  if (!$('timeSpent').value) $('timeSpent').value = state.prefs.lastTimeSpent || '1h';
  const openedAsSheet = openMobileEditor('worklogCard');
  if (scroll && !openedAsSheet) $('worklogCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  scheduleSinglePreview();
  if (focusTime) setTimeout(() => $('timeSpent').focus({ preventScroll: openedAsSheet }), 260);
}
function toggleBulkIssue(issue) {
  const key = String(issue?.key || '').trim().toUpperCase();
  if (!key) return;
  if (state.bulkSelectedKeys.has(key)) {
    state.bulkSelectedKeys.delete(key);
    state.bulkDrafts.delete(key);
  } else {
    if (state.bulkSelectedKeys.size >= 20) {
      showToast('Mỗi lần Bulk Logwork tối đa 20 issue.');
      return;
    }
    state.bulkSelectedKeys.add(key);
    state.bulkDrafts.set(key, {
      key,
      project: issue.project || key.split('-')[0] || '',
      summary: issue.summary || '',
      timeSpent: state.prefs.lastTimeSpent || '1h',
      description: issue.summary || '',
      overtime: false
    });
  }
  renderFilterIssues();
  renderBulkSelection();
}

function applyIssueListViewport(list, itemCount) {
  list.classList.toggle('is-scrollable', itemCount > 5);
  list.style.maxHeight = '';
  list.style.overflowY = '';
  if (itemCount <= 5) return;

  requestAnimationFrame(() => {
    const rows = [...list.querySelectorAll('.issue-row')].slice(0, 5);
    if (!rows.length) return;
    const styles = getComputedStyle(list);
    const gap = Number.parseFloat(styles.rowGap || styles.gap || '0') || 0;
    const visibleHeight = rows.reduce((sum, row) => sum + row.getBoundingClientRect().height, 0) + gap * Math.max(0, rows.length - 1) + 2;
    list.style.maxHeight = `${Math.ceil(visibleHeight)}px`;
    list.style.overflowY = 'auto';
  });
}

function renderFilterIssues() {
  const list = $('filterIssueList');
  const issues = filteredIssues();
  $('filterCount').textContent = state.filterLoaded
    ? (issues.length === state.filterIssues.length ? String(issues.length) : `${issues.length}/${state.filterIssues.length}`)
    : '0';
  if ($('logAllBtn')) $('logAllBtn').disabled = !state.filterLoaded || state.filterIssues.length === 0;

  if (!state.filterLoaded) {
    list.innerHTML = '';
    return;
  }
  if (!issues.length) {
    list.innerHTML = '';
    setFilterUi('empty');
    return;
  }

  list.innerHTML = issues.map(issue => {
    return `
      <button class="issue-row" type="button" data-key="${escapeHtml(issue.key)}" data-project="${escapeHtml(issue.project)}" data-summary="${escapeHtml(issue.summary || '')}">
        <div class="issue-main">
          <div class="issue-key-line"><strong>${escapeHtml(issue.key)}</strong>${issue.status ? `<span class="status-pill">${escapeHtml(issue.status)}</span>` : ''}</div>
          <div class="issue-summary">${escapeHtml(issue.summary || 'Không có summary')}</div>
          <div class="issue-meta">${escapeHtml([issue.project, issue.issueType, issue.priority].filter(Boolean).join(' · '))}</div>
        </div>
        <span class="issue-chevron" aria-hidden="true">›</span>
      </button>`;
  }).join('');
  setFilterUi('list');
  applyIssueListViewport(list, issues.length);

  list.querySelectorAll('.issue-row').forEach(button => {
    button.addEventListener('click', () => {
      const issue = {
        key: button.dataset.key || '',
        project: button.dataset.project || '',
        summary: button.dataset.summary || ''
      };
      selectIssue(issue);
      showToast(`Đã chọn ${issue.key} và tự điền Description theo Summary.`);
    });
  });
}

async function loadFilterIssues({ quiet = false } = {}) {
  if (!state.user || state.filterLoading) return;
  state.filterLoading = true;
  const btn = $('refreshFilterBtn');
  btn.disabled = true;
  btn.classList.add('spinning');
  if (!quiet) setFilterUi('loading');

  try {
    const data = await api('/api?action=subtasks', { method: 'GET', cache: 'no-store' });
    state.filterIssues = Array.isArray(data.issues) ? data.issues : [];
    state.filterLoaded = true;
    $('filterName').textContent = 'Tự động theo tài khoản hiện tại';
    renderFilterIssues();
    if (data.truncated) showToast(`Có ${data.total} Sub-task phù hợp, app đang hiển thị ${data.count} mục đầu.`);
  } catch (error) {
    state.filterLoaded = false;
    state.filterIssues = [];
    $('filterCount').textContent = '0';
    setFilterUi('error', error.message);
  } finally {
    state.filterLoading = false;
    btn.disabled = false;
    btn.classList.remove('spinning');
  }
}

function setIssueLookupState(message = '', mode = '') {
  const el = $('issueLookupState');
  el.textContent = message;
  el.className = `field-help${mode ? ` ${mode}` : ''}`;
}

function validIssueKey(value) {
  return /^[A-Z][A-Z0-9_]*-\d+$/.test(String(value || '').trim().toUpperCase());
}

async function loadIssueByKey(rawKey, { preserveDescription = false } = {}) {
  const key = String(rawKey || '').trim().toUpperCase();
  if (!validIssueKey(key) || !state.user) {
    setIssueLookupState('');
    return;
  }

  const seq = ++state.issueLookupSeq;
  setIssueLookupState('Đang lấy Summary từ Jira...', 'loading');
  try {
    const data = await api(`/api?action=issue-info&key=${encodeURIComponent(key)}`, { method: 'GET', cache: 'no-store' });
    if (seq !== state.issueLookupSeq) return;
    if ($('key').value.trim().toUpperCase() !== key) return;

    const issue = data.issue || {};
    $('key').value = issue.key || key;
    $('project').value = issue.project || key.split('-')[0] || state.prefs.lastProject || '';
    state.currentIssueSummary = issue.summary || '';
    if (!preserveDescription) $('description').value = issue.summary || '';
    state.lastAutoIssueKey = key;
    setIssueLookupState(issue.summary ? `Summary: ${issue.summary}` : 'Issue không có Summary.', 'ok');
    return issue;
  } catch (error) {
    if (seq !== state.issueLookupSeq) return;
    setIssueLookupState(error.message, 'error');
    throw error;
  }
}

function addRecentIssue(issue) {
  const key = String(issue?.key || '').trim().toUpperCase();
  if (!key) return;
  const entry = {
    key,
    project: String(issue?.project || key.split('-')[0] || ''),
    summary: String(issue?.summary || ''),
    usedAt: new Date().toISOString()
  };
  state.recentIssues = [entry, ...state.recentIssues.filter(x => String(x?.key || '').toUpperCase() !== key)].slice(0, 8);
  writeStorage(STORAGE.recent, state.recentIssues);
  renderRecentIssues();
}

function updateQuickPanelVisibility() {}

function renderRecentIssues() {}
function setLastLog(payload, issueSummary = '') {
  state.lastLog = {
    key: payload.key,
    project: payload.project,
    timeSpent: payload.timeSpent,
    description: payload.description,
    summary: issueSummary || state.currentIssueSummary || payload.description,
    loggedAt: new Date().toISOString()
  };
  writeStorage(STORAGE.lastLog, state.lastLog);
  updateQuickPanelVisibility();
}

function applyLastLog() {
  const key = String(state.lastLog?.key || '').toUpperCase();
  const issue = state.filterIssues.find(item => String(item.key || '').toUpperCase() === key);
  if (!issue) {
    showToast('Sub-task gần nhất không còn trong danh sách chưa logwork.');
    return;
  }
  selectIssue(issue);
}
function hydrateQuickInputs() {
  $('date').value = todayLocal();
  $('bulkDate').value = todayLocal();
  if (!$('timeSpent').value) $('timeSpent').value = state.prefs.lastTimeSpent || '1h';
  renderAuditHistory();
}
function lockOverlayBody() {
  if (document.body.classList.contains('settings-open')) return;
  state.settingsScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.style.top = `-${state.settingsScrollY}px`;
  document.body.classList.add('settings-open');
  document.documentElement.classList.add('settings-open-root');
}

function unlockOverlayBody() {
  const overlays = ['settingsOverlay', 'plannerOverlay', 'historyOverlay']
    .map(id => $(id))
    .filter(Boolean);
  if (overlays.some(overlay => !overlay.classList.contains('hidden'))) return;
  document.body.classList.remove('settings-open');
  document.documentElement.classList.remove('settings-open-root');
  document.body.style.top = '';
  window.scrollTo(0, state.settingsScrollY || 0);
}

function closeOverlay(id, { restore = true } = {}) {
  const overlay = $(id);
  if (!overlay || overlay.classList.contains('hidden')) return;
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
  if (restore) unlockOverlayBody();
}

function closeAllToolOverlays({ restore = true } = {}) {
  closeOverlay('plannerOverlay', { restore: false });
  closeOverlay('historyOverlay', { restore: false });
  if (restore) unlockOverlayBody();
}

function openOverlay(id, focusId) {
  const overlay = $(id);
  if (!overlay || !overlay.classList.contains('hidden')) return;
  closeOverlay('settingsOverlay', { restore: false });
  closeAllToolOverlays({ restore: false });
  lockOverlayBody();
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => $(focusId)?.focus({ preventScroll: true }));
}

function openSettings() {
  renderAuditHistory();
  updatePwaUi();
  openOverlay('settingsOverlay', 'closeSettingsBtn');
}

function closeSettings() {
  closeOverlay('settingsOverlay');
}

function openPlanner() {
  $('auditDate').value = $('date').value || $('bulkDate').value || todayLocal();
  $('auditKey').value = $('key').value.trim().toUpperCase();
  openOverlay('plannerOverlay', 'closePlannerBtn');
}

function closePlanner() {
  closeOverlay('plannerOverlay');
}

function openHistory() {
  if (!$('historyDate').value) $('historyDate').value = $('date').value || $('bulkDate').value || todayLocal();
  renderWorklogHistory();
  openOverlay('historyOverlay', 'closeHistoryBtn');
}

function closeHistory() {
  closeCorrection();
  closeOverlay('historyOverlay');
}

function addAuditEntry(entry) {
  state.auditHistory = [{
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    ...entry
  }, ...state.auditHistory].slice(0, 40);
  writeStorage(STORAGE.audit, state.auditHistory);
  renderAuditHistory();
}

function renderAuditHistory() {
  const wrap = $('auditHistory');
  if (!wrap) return;
  if (!state.auditHistory.length) {
    wrap.innerHTML = '<div class="template-empty">Chưa có lịch sử thao tác trên thiết bị này.</div>';
    return;
  }
  wrap.innerHTML = state.auditHistory.slice(0, 20).map(item => {
    const when = item.at ? new Date(item.at).toLocaleString('vi-VN') : '';
    const status = item.ok ? '✓' : '×';
    const segments = Array.isArray(item.segments) && item.segments.length
      ? item.segments.map(s => `${escapeHtml(s.start)}–${escapeHtml(s.end)}`).join(', ')
      : '';
    return `<div class="audit-history-item ${item.ok ? 'ok' : 'bad'}">
      <div><strong>${status} ${escapeHtml(item.key || item.type || 'Logwork')}</strong><small>${escapeHtml(when)}</small></div>
      <span>${escapeHtml(item.message || segments || '')}</span>
    </div>`;
  }).join('');
}


function formatHistoryTimeSpent(minutes) {
  const h = Math.floor(Number(minutes || 0) / 60);
  const m = Number(minutes || 0) % 60;
  return `${h ? `${h}h` : ''}${m ? `${m}m` : ''}` || '0m';
}

function renderWorklogHistory() {
  const wrap = $('worklogHistoryList');
  const stateEl = $('worklogHistoryState');
  if (!wrap || !stateEl) return;
  if (state.historyLoading) {
    stateEl.textContent = 'Đang tải worklog thật từ Jira...';
    stateEl.classList.remove('hidden');
    wrap.innerHTML = '';
    return;
  }
  if (!state.historyItems.length) {
    stateEl.textContent = 'Không có worklog của bạn trong ngày này.';
    stateEl.classList.remove('hidden');
    wrap.innerHTML = '';
    return;
  }
  stateEl.classList.add('hidden');
  wrap.innerHTML = state.historyItems.map(item => `
    <div class="worklog-history-item" data-worklog-id="${escapeHtml(item.id)}" data-key="${escapeHtml(item.key)}">
      <div class="worklog-history-main">
        <div class="worklog-history-time"><strong>${escapeHtml(item.start)}–${escapeHtml(item.end)}</strong><span>${escapeHtml(formatHistoryTimeSpent(item.minutes))}</span></div>
        <div class="worklog-history-key"><strong>${escapeHtml(item.key)}</strong><small>${escapeHtml(item.summary || '')}</small></div>
        <div class="worklog-history-desc">${escapeHtml(item.description || 'Không có Description')}</div>
      </div>
      <div class="worklog-history-actions">
        <button class="soft-btn history-edit-btn" type="button">Sửa</button>
        <button class="history-delete-btn" type="button">Xóa</button>
      </div>
    </div>
  `).join('');
  wrap.querySelectorAll('.worklog-history-item').forEach(row => {
    const id = row.dataset.worklogId || '';
    const key = row.dataset.key || '';
    const item = state.historyItems.find(x => x.id === id && x.key === key);
    row.querySelector('.history-edit-btn')?.addEventListener('click', () => openCorrection(item));
    row.querySelector('.history-delete-btn')?.addEventListener('click', () => deleteHistoryItem(item));
  });
}

async function loadWorklogHistory({ quiet = false } = {}) {
  if (!state.user || state.historyLoading) return;
  const date = $('historyDate').value || todayLocal();
  const key = $('historyKey').value.trim().toUpperCase();
  state.historyLoading = true;
  renderWorklogHistory();
  try {
    const data = await api(`/api?action=worklog-history&date=${encodeURIComponent(date)}${key ? `&key=${encodeURIComponent(key)}` : ''}`, { method: 'GET', cache: 'no-store' });
    state.historyItems = Array.isArray(data.items) ? data.items : [];
    if (!quiet) showToast(`Đã tải ${state.historyItems.length} worklog.`);
  } catch (error) {
    state.historyItems = [];
    if ($('worklogHistoryState')) $('worklogHistoryState').textContent = error.message;
    if (!quiet) showToast(error.message);
  } finally {
    state.historyLoading = false;
    renderWorklogHistory();
  }
}

function openCorrection(item) {
  if (!item) return;
  $('correctionWorklogId').value = item.id;
  $('correctionKey').value = item.key;
  $('correctionDate').value = item.date;
  $('correctionStart').value = item.start;
  $('correctionTimeSpent').value = formatHistoryTimeSpent(item.minutes);
  $('correctionDescription').value = item.description || item.summary || '';
  $('correctionTitle').textContent = `Sửa ${item.key}`;
  $('correctionMeta').textContent = `${item.start}–${item.end} · ${formatHistoryTimeSpent(item.minutes)}`;
  $('worklogCorrectionPanel').classList.remove('hidden');
  $('worklogCorrectionPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeCorrection() {
  $('worklogCorrectionPanel').classList.add('hidden');
}

async function saveCorrection() {
  const payload = {
    key: $('correctionKey').value,
    worklogId: $('correctionWorklogId').value,
    date: $('correctionDate').value,
    start: $('correctionStart').value,
    timeSpent: $('correctionTimeSpent').value.trim(),
    description: $('correctionDescription').value.trim()
  };
  if (!payload.description) return showToast('Description không được để trống.');
  const btn = $('saveCorrectionBtn');
  btn.disabled = true;
  btn.textContent = 'ĐANG LƯU...';
  try {
    await api('/api?action=worklog-correction', { method: 'PATCH', body: JSON.stringify(payload) });
    showToast('Đã cập nhật worklog trên Jira.');
    closeCorrection();
    await loadWorklogHistory({ quiet: true });
  } catch (error) {
    showToast(error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'LƯU CHỈNH SỬA';
  }
}

async function deleteHistoryItem(item) {
  if (!item) return;
  if (!confirm(`Xóa worklog ${item.key} ${item.start}–${item.end}?`)) return;
  try {
    await api('/api?action=worklog-correction', { method: 'DELETE', body: JSON.stringify({ key: item.key, worklogId: item.id }) });
    showToast('Đã xóa worklog trên Jira.');
    if ($('correctionWorklogId').value === item.id) closeCorrection();
    await loadWorklogHistory({ quiet: true });
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteCurrentCorrection() {
  const item = state.historyItems.find(x => x.id === $('correctionWorklogId').value && x.key === $('correctionKey').value);
  await deleteHistoryItem(item);
}

async function runDayAudit() {
  const date = $('auditDate').value || todayLocal();
  const key = $('auditKey').value.trim().toUpperCase();
  const btn = $('runAuditBtn');
  const out = $('auditResult');
  btn.disabled = true;
  btn.textContent = 'ĐANG QUÉT JIRA...';
  out.classList.remove('hidden');
  out.innerHTML = 'Đang quét worklog trong ngày từ nhiều nguồn Jira...';
  try {
    const data = await api(`/api?action=day-audit&date=${encodeURIComponent(date)}${key ? `&key=${encodeURIComponent(key)}` : ''}`, { method: 'GET', cache: 'no-store' });
    const sourceBits = [];
    if (data.sources?.authorDay?.ok) sourceBits.push(`JQL user: ${data.sources.authorDay.issues}`);
    if (data.sources?.anyDay?.ok) sourceBits.push(`JQL ngày: ${data.sources.anyDay.issues}`);
    if (data.sources?.recentIssues?.ok) sourceBits.push(`Recent: ${data.sources.recentIssues.issues}`);
    if (data.sources?.worklogDelta?.supported) sourceBits.push(`Delta: ${data.sources.worklogDelta.worklogs}`);
    out.innerHTML = `<div class="audit-summary"><strong>${escapeHtml(date)}</strong><span>Quét ${data.checkedIssues} issue · ${data.checkedWorklogs} worklog</span></div>
      <div class="planner-kpis"><div><small>Đã logwork</small><strong>${minutesLabel(data.occupiedMinutes || 0)}</strong></div><div><small>Còn trống</small><strong>${minutesLabel(data.freeMinutes || 0)}</strong></div></div>
      <div class="planner-group"><strong>Giờ đã log</strong>${data.occupied?.length ? data.occupied.map(s => `<div class="segment busy"><span>${escapeHtml(s.start)} → ${escapeHtml(s.end)}</span><span>${minutesLabel(s.minutes)}</span></div>`).join('') : '<div class="template-empty">Chưa thấy worklog của bạn trong ngày này.</div>'}</div>
      <div class="planner-group"><strong>Giờ còn trống</strong>${data.available?.length ? data.available.map(s => `<div class="segment free"><span>${escapeHtml(s.start)} → ${escapeHtml(s.end)}</span><span>${minutesLabel(s.minutes)}</span></div>`).join('') : '<div class="template-empty">Không còn thời gian trống trong 2 khung giờ cho phép.</div>'}</div>
      <div class="planner-source">Nguồn kiểm tra: ${escapeHtml(sourceBits.join(' · ') || 'Jira')}</div>`;
  } catch (error) {
    out.innerHTML = `<div class="error-text audit-error">${escapeHtml(error.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'KIỂM TRA & LẬP KẾ HOẠCH';
  }
}


function parseTimeSpentClient(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/,/g, '.');
  if (!raw) return 0;
  if (/^\d+(\.\d+)?h$/.test(raw)) return Math.round(Number(raw.slice(0, -1)) * 60);
  if (/^\d+m$/.test(raw)) return Number(raw.slice(0, -1));
  const compact = raw.replace(/\s+/g, '');
  const match = compact.match(/^(?:(\d+)h)?(?:(\d+)m)?$/);
  if (match && (match[1] || match[2])) return Number(match[1] || 0) * 60 + Number(match[2] || 0);
  if (/^\d+$/.test(raw)) return Number(raw) * 60;
  return 0;
}

function previewSegmentsHtml(item) {
  const segments = Array.isArray(item?.segments) ? item.segments : [];
  if (!segments.length) return 'Chưa xác định được giờ.';
  return segments.map(segment => `${escapeHtml(segment.start)} → ${escapeHtml(segment.end)}`).join(' · ');
}

function setSinglePreview(message = '', { error = false, loading = false } = {}) {
  const el = $('worklogPreview');
  if (!el) return;
  if (!message) {
    el.classList.add('hidden');
    el.classList.remove('preview-error');
    el.innerHTML = '';
    return;
  }
  el.classList.remove('hidden');
  el.classList.toggle('preview-error', error);
  el.innerHTML = loading ? escapeHtml(message) : message;
}

function scheduleSinglePreview() {
  clearTimeout(state.previewTimer);
  const key = $('key')?.value.trim().toUpperCase();
  const date = $('date')?.value || '';
  const timeSpent = $('timeSpent')?.value.trim() || '';
  const overtime = $('overtime')?.checked === true;
  if (!state.user || !key || !date || parseTimeSpentClient(timeSpent) <= 0) {
    setSinglePreview('');
    return;
  }
  setSinglePreview('Đang tính giờ dự kiến theo worklog hiện có trên Jira...', { loading: true });
  const seq = ++state.previewSeq;
  state.previewTimer = setTimeout(async () => {
    try {
      const data = await api('/api?action=worklog-preview', {
        method: 'POST',
        body: JSON.stringify({ date, items: [{ key, timeSpent, overtime }] })
      });
      if (seq !== state.previewSeq) return;
      const item = data.items?.[0];
      setSinglePreview(`<strong>Dự kiến:</strong> ${previewSegmentsHtml(item)}${item?.overtime ? ' · OT' : ''}`);
    } catch (error) {
      if (seq !== state.previewSeq) return;
      setSinglePreview(`<strong>Chưa thể xếp giờ:</strong> ${escapeHtml(error.message)}`, { error: true });
    }
  }, 520);
}

function setBulkItemPreview(key, html, { error = false } = {}) {
  const row = [...($('bulkItems')?.querySelectorAll('.bulk-item') || [])].find(item => item.dataset.key === key);
  const el = row?.querySelector('.bulk-item-preview');
  if (!el) return;
  el.classList.toggle('preview-error', error);
  el.innerHTML = html;
}

function scheduleBulkPreview() {
  clearTimeout(state.bulkPreviewTimer);
  const stateEl = $('bulkPreviewState');
  if (!$('bulkCard') || $('bulkCard').classList.contains('hidden')) return;
  const date = $('bulkDate')?.value || '';
  const items = bulkDraftList().map(item => ({
    key: item.key,
    timeSpent: String(item.timeSpent || '').trim(),
    overtime: item.overtime === true
  }));
  if (!date || !items.length) {
    if (stateEl) stateEl.textContent = 'Chưa có Sub-task để lập dự kiến.';
    return;
  }
  if (items.some(item => parseTimeSpentClient(item.timeSpent) <= 0)) {
    if (stateEl) {
      stateEl.textContent = 'Nhập TimeSpent hợp lệ để xem giờ dự kiến.';
      stateEl.classList.add('preview-error');
    }
    return;
  }
  if (stateEl) {
    stateEl.textContent = 'Đang tính giờ dự kiến theo worklog hiện có trên Jira...';
    stateEl.classList.remove('preview-error');
  }
  for (const item of items) setBulkItemPreview(item.key, 'Dự kiến: đang tính...');
  const seq = ++state.bulkPreviewSeq;
  state.bulkPreviewTimer = setTimeout(async () => {
    try {
      const data = await api('/api?action=worklog-preview', { method: 'POST', body: JSON.stringify({ date, items }) });
      if (seq !== state.bulkPreviewSeq) return;
      if (stateEl) {
        stateEl.textContent = 'Dự kiến đã được xếp theo các khoảng giờ còn trống trên Jira.';
        stateEl.classList.remove('preview-error');
      }
      for (const item of data.items || []) {
        setBulkItemPreview(item.key, `<strong>Dự kiến:</strong> ${previewSegmentsHtml(item)}${item.overtime ? ' · OT' : ''}`);
      }
    } catch (error) {
      if (seq !== state.bulkPreviewSeq) return;
      if (stateEl) {
        stateEl.textContent = error.message;
        stateEl.classList.add('preview-error');
      }
      for (const item of items) setBulkItemPreview(item.key, `<strong>Chưa thể xếp giờ:</strong> ${escapeHtml(error.message)}`, { error: true });
    }
  }, 620);
}

function renderBulkSelection() {}

function resetBulkState() {
  const wasOpen = !$('bulkCard').classList.contains('hidden');
  state.bulkMode = false;
  state.bulkSelectedKeys.clear();
  state.bulkDrafts.clear();
  clearTimeout(state.bulkPreviewTimer);
  $('bulkCard').classList.add('hidden');
  if (wasOpen) closeMobileEditor();
}

function openBulkAll() {
  const issues = state.filterIssues;
  if (!issues.length) {
    showToast('Không có Sub-task chưa logwork để Log tất cả.');
    return;
  }
  state.bulkSelectedKeys.clear();
  state.bulkDrafts.clear();
  for (const issue of issues) {
    const key = String(issue.key || '').trim().toUpperCase();
    if (!key) continue;
    state.bulkSelectedKeys.add(key);
    state.bulkDrafts.set(key, {
      key,
      project: issue.project || key.split('-')[0] || '',
      summary: issue.summary || '',
      timeSpent: state.prefs.lastTimeSpent || '1h',
      description: issue.summary || '',
      overtime: false
    });
  }
  const date = $('date').value || todayLocal();
  $('bulkDate').value = date;
  $('worklogCard').classList.add('hidden');
  document.body.classList.remove('single-log-open');
  $('resultCard').classList.add('hidden');
  renderBulkItems();
  $('bulkCard').classList.remove('hidden');
  const openedAsSheet = openMobileEditor('bulkCard');
  if (!openedAsSheet) $('bulkCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  scheduleBulkPreview();
}
function bulkDraftList() {
  return [...state.bulkSelectedKeys].map(key => state.bulkDrafts.get(key)).filter(Boolean);
}

function updateBulkTotal() {
  const items = bulkDraftList();
  const total = items.reduce((sum, item) => sum + parseTimeSpentClient(item.timeSpent), 0);
  $('bulkTotal').textContent = minutesLabel(total);
  if ($('bulkSelectionCount')) $('bulkSelectionCount').textContent = `${items.length}/${state.filterIssues.length} Sub-task`;
  $('bulkLogBtn').disabled = !items.length || total <= 0;
}

function renderBulkItems() {
  const wrap = $('bulkItems');
  const items = bulkDraftList();
  if (!items.length) {
    wrap.innerHTML = '<div class="filter-state">Chưa có issue nào trong Bulk Logwork.</div>';
    updateBulkTotal();
    return;
  }
  wrap.innerHTML = items.map((item, index) => `
    <div class="bulk-item" data-key="${escapeHtml(item.key)}">
      <div class="bulk-item-head">
        <div class="bulk-item-title">
          <strong>${index + 1}. ${escapeHtml(item.key)}</strong>
          <span>${escapeHtml(item.summary || 'Không có summary')}</span>
          <small>${escapeHtml(item.project)}</small>
        </div>
        <button class="bulk-remove-btn" type="button" aria-label="Bỏ ${escapeHtml(item.key)} khỏi danh sách log" title="Bỏ Sub-task này">×</button>
      </div>
      <div class="bulk-item-fields">
        <label>TimeSpent<input class="bulk-time" value="${escapeHtml(item.timeSpent || '1h')}" placeholder="1h" inputmode="text" required /></label>
        <label class="bulk-overtime-toggle">
          <input class="bulk-overtime" type="checkbox" ${item.overtime ? 'checked' : ''} />
          <span class="overtime-control" aria-hidden="true"></span>
          <span class="overtime-copy"><strong>Overtime (OT)</strong><small>${escapeHtml(overtimeWindowLabel($('bulkDate')?.value || todayLocal()))}</small></span>
        </label>
        <label class="bulk-description-field">Description<textarea class="bulk-description" rows="2" required>${escapeHtml(item.description || item.summary || '')}</textarea></label>
        <div class="bulk-item-preview" data-preview-key="${escapeHtml(item.key)}">Dự kiến: đang tính...</div>
      </div>
    </div>
  `).join('');

  wrap.querySelectorAll('.bulk-item').forEach(row => {
    const key = row.dataset.key || '';
    const draft = state.bulkDrafts.get(key);
    row.querySelector('.bulk-time').addEventListener('input', event => {
      if (draft) draft.timeSpent = event.target.value;
      updateBulkTotal();
      scheduleBulkPreview();
    });
    row.querySelector('.bulk-description').addEventListener('input', event => {
      if (draft) draft.description = event.target.value;
    });
    row.querySelector('.bulk-overtime')?.addEventListener('change', event => {
      if (draft) draft.overtime = event.target.checked;
      updateBulkTotal();
      scheduleBulkPreview();
    });
    row.querySelector('.bulk-remove-btn')?.addEventListener('click', () => {
      state.bulkSelectedKeys.delete(key);
      state.bulkDrafts.delete(key);
      renderBulkItems();
      scheduleBulkPreview();
      showToast(`Đã bỏ ${key} khỏi lần Log tất cả này.`);
    });
  });
  updateBulkTotal();
  scheduleBulkPreview();
}

function openBulkEditor() { openBulkAll(); }

function renderBulkSuccess(data) {
  const result = $('resultCard');
  result.className = 'result ok';
  result.innerHTML = `
    <h3>✓ Bulk Logwork thành công</h3>
    <div class="meta">${escapeHtml(data.date)} · ${data.items.length} issue · Tổng ${minutesLabel(data.totalMinutes)}</div>
    ${data.items.map(item => `
      <div class="bulk-result-item">
        <div class="bulk-result-head"><strong>${escapeHtml(item.key)}${item.overtime ? ' · OT' : ''}</strong><span>${minutesLabel(item.minutes)}</span></div>
        ${item.segments.map(segment => `<div class="segment"><span>${escapeHtml(segment.start)} → ${escapeHtml(segment.end)}</span><span>${minutesLabel(segment.minutes)}</span></div>`).join('')}
        ${(() => { const t = (data.transitions || []).find(x => x.key === item.key); return t ? `<div class="transition-note ${t.ok ? 'ok' : 'warn'}">${t.ok ? `✓ ${escapeHtml(transitionPathLabel(t))}` : `⚠ ${escapeHtml(t.message || 'Chưa chuyển được trạng thái')}`}</div>` : ''; })()}
      </div>
    `).join('')}
  `;
  result.classList.remove('hidden');
}

async function submitBulkWorklog(event) {
  event.preventDefault();
  if (state.bulkSubmitInFlight) return;
  const items = bulkDraftList().map(item => ({
    key: item.key,
    project: item.project,
    timeSpent: String(item.timeSpent || '').trim(),
    description: String(item.description || item.summary || '').trim(),
    overtime: item.overtime === true
  }));
  if (!items.length) return showToast('Chưa có issue để Bulk Logwork.');
  if (items.some(item => !item.timeSpent || !item.description)) return showToast('Vui lòng nhập đủ TimeSpent và Description cho từng issue.');

  state.bulkSubmitInFlight = true;
  const requestId = createRequestId('bulk');
  const btn = $('bulkLogBtn');
  btn.disabled = true;
  btn.textContent = 'ĐANG LOG TẤT CẢ...';
  $('resultCard').classList.add('hidden');
  try {
    const date = $('bulkDate').value;
    const data = await api('/api?action=bulk-worklog', {
      method: 'POST',
      body: JSON.stringify({ date, items, requestId }),
      requestId
    });
    for (const item of data.items || []) {
      addRecentIssue({ key: item.key, project: item.project, summary: item.summary });
    }
    if (items.length) {
      const last = items[items.length - 1];
      state.prefs.lastProject = last.project;
      state.prefs.lastTimeSpent = last.timeSpent;
      savePrefs();
      setLastLog({ ...last, date }, (data.items || []).find(x => x.key === last.key)?.summary || last.description);
    }
    renderBulkSuccess(data);
    addAuditEntry({ ok: true, type: 'Bulk', key: `${data.items.length} issue`, message: `${data.date} · ${minutesLabel(data.totalMinutes)}`, segments: (data.items || []).flatMap(x => x.segments || []) });
    showToast(`Đã log ${data.items.length} issue lên Jira.`);
    resetBulkState();
    renderFilterIssues();
    setTimeout(() => loadFilterIssues({ quiet: true }), 1200);
  } catch (error) {
    const result = $('resultCard');
    result.className = 'result error';
    result.innerHTML = `<h3>Bulk Logwork chưa thành công</h3><div class="meta">${escapeHtml(error.message)}</div>`;
    result.classList.remove('hidden');
    addAuditEntry({ ok: false, type: 'Bulk', message: error.message });
    showToast(error.message);
  } finally {
    state.bulkSubmitInFlight = false;
    btn.disabled = false;
    btn.textContent = 'LOG TẤT CẢ';
  }
}

$('loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const btn = $('loginBtn');
  btn.disabled = true;
  btn.textContent = 'ĐANG ĐĂNG NHẬP...';
  try {
    const data = await api('/api?action=login', {
      method: 'POST',
      body: JSON.stringify({ username: $('username').value.trim(), password: $('password').value })
    });
    $('password').value = '';
    setLoggedIn(data.user);
    showToast('Đăng nhập Jira thành công. Đang tải Sub-task chưa logwork...');
  } catch (error) {
    showToast(error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'ĐĂNG NHẬP';
  }
});

$('logoutBtn').addEventListener('click', async () => {
  if (!confirm('Đăng xuất khỏi Jira?')) return;
  $('logoutBtn').disabled = true;
  try { await api('/api?action=logout', { method: 'POST', body: '{}' }); } catch {}
  finally { $('logoutBtn').disabled = false; }
  setLoggedOut();
});

$('refreshFilterBtn').addEventListener('click', () => loadFilterIssues());
$('filterIssueSearch').addEventListener('input', renderFilterIssues);
$('logAllBtn').addEventListener('click', openBulkAll);
$('cancelBulkBtn').addEventListener('click', resetBulkState);
$('bulkForm').addEventListener('submit', submitBulkWorklog);
$('closeWorklogBtn').addEventListener('click', () => {
  $('worklogCard').classList.add('hidden');
  document.body.classList.remove('single-log-open');
  $('resultCard').classList.add('hidden');
  closeMobileEditor();
});
$('mobileEditorBackdrop')?.addEventListener('click', () => {
  if (!$('bulkCard').classList.contains('hidden')) return resetBulkState();
  if (!$('worklogCard').classList.contains('hidden')) {
    $('worklogCard').classList.add('hidden');
    document.body.classList.remove('single-log-open');
    closeMobileEditor();
  }
});

$('date').addEventListener('change', () => {
  if (!$('date').value) $('date').value = todayLocal();
  updateSingleOvertimeHint();
  scheduleSinglePreview();
});
$('bulkDate').addEventListener('change', () => {
  if (!$('bulkDate').value) $('bulkDate').value = todayLocal();
  renderBulkItems();
  scheduleBulkPreview();
});

$('timeSpent').addEventListener('input', scheduleSinglePreview);
$('overtime')?.addEventListener('change', () => {
  updateSingleOvertimeHint();
  scheduleSinglePreview();
});

$('timeSpent').addEventListener('change', () => {
  const value = $('timeSpent').value.trim();
  if (value) {
    state.prefs.lastTimeSpent = value;
    savePrefs();
  }
});

document.querySelectorAll('.preset-btn').forEach(button => {
  button.addEventListener('click', () => {
    const value = button.dataset.time || '';
    $('timeSpent').value = value;
    state.prefs.lastTimeSpent = value;
    savePrefs();
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.toggle('active', b === button));
    scheduleSinglePreview();
    $('description').focus();
  });
});

$('themeBtn')?.addEventListener('click', toggleTheme);
$('plannerBtn')?.addEventListener('click', openPlanner);
$('historyBtn')?.addEventListener('click', openHistory);
$('mobilePlannerBtn')?.addEventListener('click', openPlanner);
$('mobileHistoryBtn')?.addEventListener('click', openHistory);
$('lightThemeBtn')?.addEventListener('click', () => applyTheme('light'));
$('darkThemeBtn')?.addEventListener('click', () => applyTheme('dark'));
$('settingsBtn').addEventListener('click', openSettings);
$('closeSettingsBtn').addEventListener('click', closeSettings);
document.querySelectorAll('[data-close-settings]').forEach(el => el.addEventListener('click', closeSettings));
$('closePlannerBtn')?.addEventListener('click', closePlanner);
$('closeHistoryBtn')?.addEventListener('click', closeHistory);
document.querySelectorAll('[data-close-planner]').forEach(el => el.addEventListener('click', closePlanner));
document.querySelectorAll('[data-close-history]').forEach(el => el.addEventListener('click', closeHistory));
$('installPwaBtn')?.addEventListener('click', installPwa);
['settingsOverlay', 'plannerOverlay', 'historyOverlay'].forEach(id => {
  $(id)?.addEventListener('touchmove', event => {
    if (!event.target.closest('.settings-sheet')) event.preventDefault();
  }, { passive: false });
});
$('runAuditBtn').addEventListener('click', runDayAudit);
$('refreshWorklogHistoryBtn').addEventListener('click', () => loadWorklogHistory());
$('cancelCorrectionBtn').addEventListener('click', closeCorrection);
$('saveCorrectionBtn').addEventListener('click', saveCorrection);
$('deleteCorrectionBtn').addEventListener('click', deleteCurrentCorrection);
$('clearAuditHistoryBtn').addEventListener('click', () => {
  if (!state.auditHistory.length) return;
  if (!confirm('Xóa toàn bộ lịch sử thao tác trên thiết bị này?')) return;
  state.auditHistory = [];
  writeStorage(STORAGE.audit, state.auditHistory);
  renderAuditHistory();
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (!$('plannerOverlay')?.classList.contains('hidden')) return closePlanner();
  if (!$('historyOverlay')?.classList.contains('hidden')) return closeHistory();
  if (!$('settingsOverlay')?.classList.contains('hidden')) closeSettings();
});

$('worklogForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (state.submitInFlight) return;
  state.submitInFlight = true;
  const requestId = createRequestId('worklog');
  const btn = $('logBtn');
  btn.disabled = true;
  btn.textContent = 'ĐANG LOG WORK...';
  $('resultCard').classList.add('hidden');
  try {
    const payload = {
      key: $('key').value.trim(),
      project: $('project').value.trim(),
      timeSpent: $('timeSpent').value.trim(),
      date: $('date').value,
      description: $('description').value.trim(),
      overtime: $('overtime')?.checked === true
    };
    const data = await api('/api?action=worklog', { method: 'POST', body: JSON.stringify({ ...payload, requestId }), requestId });

    state.prefs.lastProject = payload.project;
    state.prefs.lastTimeSpent = payload.timeSpent;
    savePrefs();
    addRecentIssue({ key: data.issue.key, project: payload.project, summary: data.issue.summary || state.currentIssueSummary });
    setLastLog(payload, data.issue.summary || state.currentIssueSummary);

    const result = $('resultCard');
    result.className = 'result ok';
    result.innerHTML = `
      <h3>✓ Logwork thành công</h3>
      <div class="meta"><strong>${escapeHtml(data.issue.key)}</strong>${data.issue.summary ? ` · ${escapeHtml(data.issue.summary)}` : ''}${data.overtime ? ' · <b>OT</b>' : ''}<br>${escapeHtml(data.date)} · Tổng ${minutesLabel(data.totalMinutes)}${data.workWindow ? ` · ${escapeHtml(data.workWindow)}` : ''}</div>
      ${data.segments.map(s => `<div class="segment"><span>${escapeHtml(s.start)} → ${escapeHtml(s.end)}</span><span>${minutesLabel(s.minutes)}</span></div>`).join('')}
      <div class="transition-note ${data.transition?.ok ? 'ok' : 'warn'}">${data.transition?.ok ? `✓ Trạng thái: ${escapeHtml(transitionPathLabel(data.transition))}` : `⚠ ${escapeHtml(data.transition?.message || 'Worklog đã tạo nhưng chưa chuyển được trạng thái.')}`}</div>
    `;
    result.classList.remove('hidden');
    addAuditEntry({ ok: true, key: data.issue.key, message: `${data.date} · ${minutesLabel(data.totalMinutes)}`, segments: data.segments });
    showToast(data.transition?.ok ? `Đã log work · ${transitionPathLabel(data.transition)}` : 'Đã log work lên Jira.');
    $('worklogCard').classList.add('hidden');
    document.body.classList.remove('single-log-open');
    closeMobileEditor();
    $('key').value = '';
    $('project').value = '';
    $('description').value = '';
    if ($('overtime')) $('overtime').checked = false;
    updateSingleOvertimeHint();
    state.currentIssueSummary = '';
    setTimeout(() => loadFilterIssues({ quiet: true }), 700);
  } catch (error) {
    const result = $('resultCard');
    result.className = 'result error';
    result.innerHTML = `<h3>Logwork chưa thành công</h3><div class="meta">${escapeHtml(error.message)}</div>`;
    result.classList.remove('hidden');
    addAuditEntry({ ok: false, key: $('key').value.trim().toUpperCase(), message: error.message });
    showToast(error.message);
  } finally {
    state.submitInFlight = false;
    btn.disabled = false;
    btn.textContent = 'LOG WORK';
  }
});

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
}

applyTheme(readThemePreference(), { persist: false });
loadQuickData();
$('date').value = todayLocal();
window.addEventListener('resize', () => {
  if (!isMobileEditorMode() && document.body.classList.contains('mobile-editor-open')) closeMobileEditor();
});

$('bulkDate').value = todayLocal();
updateSingleOvertimeHint();
$('historyDate').value = todayLocal();
hydrateQuickInputs();
renderBulkSelection();
['gesturestart', 'gesturechange', 'gestureend'].forEach(name => {
  document.addEventListener(name, event => event.preventDefault(), { passive: false });
});
window.addEventListener('online', updateConnectionState);
window.addEventListener('offline', updateConnectionState);
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  state.deferredInstallPrompt = event;
  updatePwaUi();
});
window.addEventListener('appinstalled', () => {
  state.deferredInstallPrompt = null;
  updatePwaUi();
  showToast('Đã cài Quick Jira Log lên thiết bị.');
});
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
updateConnectionState();
updatePwaUi();
checkStatus();
