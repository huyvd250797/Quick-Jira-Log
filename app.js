'use strict';

const APP_VERSION = '1.7.3';
const STORAGE = {
  prefs: 'quick-jira-log:prefs:v1',
  recent: 'quick-jira-log:recent-issues:v1',
  lastLog: 'quick-jira-log:last-log:v1',
  audit: 'quick-jira-log:audit:v1',
  theme: 'quick-jira-log:theme:v1',
  sessionDate: 'quick-jira-log:session-log-date:v1'
};

const $ = id => document.getElementById(id);
const state = {
  user: null,
  toastTimer: null,
  warningToastTimer: null,
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
  bulkCapacitySeq: 0,
  bulkCapacity: { date: '', regularLoggedMinutes: 0, loading: false, error: '' },
  bulkCapacityPromise: null,
  bulkAllocation: { autoApplied: false, userEdited: false, remainingMinutes: 0, message: '' },
  singleCapacitySeq: 0,
  singleCapacity: { date: '', regularLoggedMinutes: 0, loading: false, error: '' },
  mobileEditorScrollY: 0,
  mobileSheetDrag: null,
  theme: 'light',
  logAndNextRequested: false,
  loginInFlight: false,
  invalidLoginCount: 0,
  loginCooldownUntil: 0,
  loginCooldownTimer: null,
  captchaRequired: false,
  historyCache: new Map(),
  confirmResolver: null,
  confirmOpen: false
};


const UI_MOTION_MS = 170;
const uiAnimationTimers = new WeakMap();

function reduceMotionEnabled() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function clearUiAnimation(el) {
  if (!el) return;
  const timer = uiAnimationTimers.get(el);
  if (timer) clearTimeout(timer);
  uiAnimationTimers.delete(el);
  el.classList.remove('qjl-opening', 'qjl-closing');
}

function showAnimated(el) {
  if (!el) return;
  clearUiAnimation(el);
  el.classList.remove('hidden');
  if (reduceMotionEnabled()) return;
  el.classList.add('qjl-opening');
  const timer = setTimeout(() => {
    el.classList.remove('qjl-opening');
    uiAnimationTimers.delete(el);
  }, UI_MOTION_MS + 30);
  uiAnimationTimers.set(el, timer);
}

function hideAnimated(el, onHidden) {
  if (!el) { onHidden?.(); return; }
  if (el.classList.contains('hidden')) { onHidden?.(); return; }
  clearUiAnimation(el);
  if (reduceMotionEnabled()) {
    el.classList.add('hidden');
    onHidden?.();
    return;
  }
  el.classList.add('qjl-closing');
  const timer = setTimeout(() => {
    el.classList.add('hidden');
    el.classList.remove('qjl-closing');
    uiAnimationTimers.delete(el);
    onHidden?.();
  }, UI_MOTION_MS);
  uiAnimationTimers.set(el, timer);
}

function animateResultCard() {
  const result = $('resultCard');
  if (result && !result.classList.contains('hidden')) showAnimated(result);
}

function closeLogConfirmation(answer = false) {
  const overlay = $('logConfirmOverlay');
  const resolver = state.confirmResolver;
  state.confirmResolver = null;
  state.confirmOpen = false;
  if (overlay) {
    overlay.setAttribute('aria-hidden', 'true');
    hideAnimated(overlay);
  }
  resolver?.(answer === true);
}

function confirmLogAction({ title, message, rows = [], confirmLabel = 'XÁC NHẬN LOG' } = {}) {
  if (state.confirmOpen) return Promise.resolve(false);
  const overlay = $('logConfirmOverlay');
  if (!overlay) return Promise.resolve(window.confirm(message || 'Xác nhận Logwork?'));
  state.confirmOpen = true;
  $('logConfirmTitle').textContent = title || 'Xác nhận Logwork';
  $('logConfirmMessage').textContent = message || 'Worklog sẽ được ghi lên Jira. Hãy kiểm tra lại thông tin trước khi xác nhận.';
  $('logConfirmSummary').innerHTML = rows.map(([label, value]) => `
    <div class="confirm-summary-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
  `).join('');
  $('confirmLogBtn').textContent = confirmLabel;
  overlay.setAttribute('aria-hidden', 'false');
  showAnimated(overlay);
  setTimeout(() => $('confirmLogBtn')?.focus({ preventScroll: true }), reduceMotionEnabled() ? 0 : 100);
  return new Promise(resolve => { state.confirmResolver = resolve; });
}

function invalidateHistoryCache() {
  state.historyCache.clear();
}


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


function validLocalDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function getSessionLogDate() {
  try {
    const value = sessionStorage.getItem(STORAGE.sessionDate);
    return validLocalDate(value) ? value : todayLocal();
  } catch {
    return todayLocal();
  }
}

function setSessionLogDate(value) {
  const date = validLocalDate(value) ? value : todayLocal();
  try { sessionStorage.setItem(STORAGE.sessionDate, date); } catch {}
  return date;
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

const lateLogWarningPicker = globalThis.QJLLateLogWarning?.createWarningPicker?.();

function showWarningToast(message) {
  const el = $('warningToast');
  if (!el || !message) return;
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(state.warningToastTimer);
  state.warningToastTimer = setTimeout(() => el.classList.add('hidden'), 6200);
}

function showLateLogWarning(date) {
  const api = globalThis.QJLLateLogWarning;
  if (!api?.shouldWarn?.(date, todayLocal())) return;
  const message = lateLogWarningPicker?.() || api.MESSAGES?.[0];
  if (message) showWarningToast(message);
}

function setLoginError(message = '') {
  const el = $('loginError');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('hidden', !message);
}

function setCaptchaPanel(show, message = '', jiraUrl = '') {
  state.captchaRequired = show === true;
  const panel = $('captchaPanel');
  if (!panel) return;
  panel.classList.toggle('hidden', !state.captchaRequired);
  if (message && $('captchaMessage')) $('captchaMessage').textContent = message;
  if (jiraUrl && $('jiraVerifyBtn')) $('jiraVerifyBtn').href = jiraUrl;
  updateLoginButtonState();
}

function clearLoginCooldown() {
  state.loginCooldownUntil = 0;
  clearTimeout(state.loginCooldownTimer);
  state.loginCooldownTimer = null;
  updateLoginButtonState();
}

function startLoginCooldown(seconds, message = '') {
  const durationMs = Math.max(0, Number(seconds) || 0) * 1000;
  state.loginCooldownUntil = Date.now() + durationMs;
  clearTimeout(state.loginCooldownTimer);
  if (message) setLoginError(message);
  const tick = () => {
    if (Date.now() >= state.loginCooldownUntil) {
      state.loginCooldownUntil = 0;
      state.loginCooldownTimer = null;
      updateLoginButtonState();
      return;
    }
    updateLoginButtonState();
    state.loginCooldownTimer = setTimeout(tick, 500);
  };
  tick();
}

function updateLoginButtonState() {
  const btn = $('loginBtn');
  const retryBtn = $('captchaRetryBtn');
  const remaining = Math.max(0, Math.ceil((state.loginCooldownUntil - Date.now()) / 1000));
  if (btn) {
    btn.disabled = state.loginInFlight || remaining > 0 || state.captchaRequired;
    btn.textContent = state.loginInFlight ? 'ĐANG ĐĂNG NHẬP...' : remaining > 0 ? `THỬ LẠI SAU ${remaining}s` : 'ĐĂNG NHẬP';
  }
  if (retryBtn) {
    retryBtn.disabled = state.loginInFlight || remaining > 0;
    retryBtn.textContent = state.loginInFlight ? 'ĐANG KIỂM TRA...' : remaining > 0 ? `THỬ LẠI SAU ${remaining}s` : 'TÔI ĐÃ XÁC MINH – THỬ LẠI';
  }
}

async function performLogin({ captchaRetry = false } = {}) {
  if (state.loginInFlight) return;
  const remaining = Math.max(0, Math.ceil((state.loginCooldownUntil - Date.now()) / 1000));
  if (remaining > 0) {
    showToast(`Hãy chờ ${remaining}s trước khi thử đăng nhập lại.`);
    return;
  }

  const username = $('username')?.value.trim() || '';
  const password = $('password')?.value || '';
  if (!username || !password) {
    setLoginError('Vui lòng nhập ID và mật khẩu Jira.');
    return;
  }

  state.loginInFlight = true;
  setLoginError('');
  updateLoginButtonState();
  try {
    const data = await api('/api?action=login', {
      method: 'POST',
      body: JSON.stringify({ username, password, captchaRetry })
    });
    $('password').value = '';
    state.invalidLoginCount = 0;
    clearLoginCooldown();
    setCaptchaPanel(false);
    setLoggedIn(data.user);
    showToast('Đăng nhập Jira thành công. Đang tải Sub-task chưa logwork...');
  } catch (error) {
    const code = String(error.code || '');
    setLoginError(error.message);

    if (code === 'JIRA_CAPTCHA_REQUIRED') {
      setCaptchaPanel(true, error.message, error.jiraUrl || error.details?.jiraUrl || 'https://task.ascvn.com.vn/');
      showToast('Jira đang yêu cầu xác minh bảo mật. Hãy mở Jira để xác minh.');
      return;
    }

    if (code === 'JIRA_INVALID_CREDENTIALS') {
      state.invalidLoginCount += 1;
      const cooldownSeconds = state.invalidLoginCount >= 2 ? 30 : 3;
      const warning = state.invalidLoginCount >= 2
        ? `${error.message} Bạn đã nhập sai ${state.invalidLoginCount} lần; tạm dừng 30s để tránh Jira kích hoạt CAPTCHA.`
        : `${error.message} Hãy kiểm tra lại trước khi thử tiếp để tránh Jira kích hoạt CAPTCHA.`;
      startLoginCooldown(cooldownSeconds, warning);
      showToast(warning);
      return;
    }

    if (code === 'LOGIN_COOLDOWN' || code === 'LOGIN_RATE_LIMITED') {
      startLoginCooldown(Number(error.retryAfterSeconds || error.details?.retryAfterSeconds || 30), error.message);
      showToast(error.message);
      return;
    }

    showToast(error.message);
  } finally {
    state.loginInFlight = false;
    updateLoginButtonState();
  }
}

function isMobileEditorMode() {
  return window.matchMedia?.('(max-width: 899px)').matches === true;
}

function isDesktopEditorMode() {
  return window.matchMedia?.('(min-width: 900px)').matches === true;
}

function openDesktopEditor(cardId) {
  const card = $(cardId);
  if (!card || !isDesktopEditorMode()) return false;
  document.body.classList.add('desktop-editor-open');
  document.body.dataset.desktopEditor = cardId;
  requestAnimationFrame(() => { card.scrollTop = 0; });
  return true;
}

function closeDesktopEditor() {
  document.body.classList.remove('desktop-editor-open');
  delete document.body.dataset.desktopEditor;
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
  for (const card of [$('worklogCard'), $('bulkCard')]) {
    if (!card) continue;
    card.classList.remove('is-dragging', 'is-snapping');
    card.style.transform = '';
    card.style.transition = '';
  }
  const backdrop = $('mobileEditorBackdrop');
  if (backdrop) {
    backdrop.style.opacity = '';
    backdrop.classList.add('hidden');
    backdrop.setAttribute('aria-hidden', 'true');
  }
  state.mobileSheetDrag = null;
  if (!document.body.classList.contains('mobile-editor-open')) return;
  document.body.classList.remove('mobile-editor-open');
  document.body.style.top = '';
  window.scrollTo(0, state.mobileEditorScrollY || 0);
}

function closeSingleEditorAnimated({ hideResult = true } = {}) {
  state.singleCapacitySeq += 1;
  const card = $('worklogCard');
  const finish = () => {
    document.body.classList.remove('single-log-open');
    if (hideResult) $('resultCard')?.classList.add('hidden');
    closeMobileEditor();
    closeDesktopEditor();
  };
  if (!card || card.classList.contains('hidden')) return finish();
  hideAnimated(card, finish);
}

function dismissMobileEditorCard(cardId) {
  if (cardId === 'bulkCard') {
    resetBulkState();
    return;
  }
  if (cardId === 'worklogCard') {
    $('worklogCard')?.classList.add('hidden');
    document.body.classList.remove('single-log-open');
    $('resultCard')?.classList.add('hidden');
    closeMobileEditor();
  }
}

function settleMobileSheet(card, shouldClose, cardId) {
  if (!card) return;
  card.classList.remove('is-dragging');
  card.classList.add('is-snapping');
  card.style.transition = 'transform 190ms cubic-bezier(.2,.8,.2,1)';
  if (shouldClose) {
    card.style.transform = 'translateY(105%)';
    const backdrop = $('mobileEditorBackdrop');
    if (backdrop) backdrop.style.opacity = '0';
    setTimeout(() => dismissMobileEditorCard(cardId), 190);
  } else {
    card.style.transform = 'translateY(0)';
    const backdrop = $('mobileEditorBackdrop');
    if (backdrop) backdrop.style.opacity = '';
    setTimeout(() => {
      card.classList.remove('is-snapping');
      card.style.transform = '';
      card.style.transition = '';
    }, 190);
  }
}

function setupBottomSheetDrag(cardId) {
  const card = $(cardId);
  const handle = card?.querySelector('.bottom-sheet-drag-handle');
  if (!card || !handle) return;

  handle.addEventListener('pointerdown', event => {
    if (!isMobileEditorMode() || !card.classList.contains('mobile-bottom-sheet')) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    const startedAt = performance.now();
    state.mobileSheetDrag = {
      cardId,
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastAt: startedAt,
      velocity: 0,
      delta: 0
    };
    card.classList.add('is-dragging');
    card.classList.remove('is-snapping');
    card.style.transition = 'none';
    try { handle.setPointerCapture(event.pointerId); } catch {}
  });

  handle.addEventListener('pointermove', event => {
    const drag = state.mobileSheetDrag;
    if (!drag || drag.cardId !== cardId || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const now = performance.now();
    const delta = Math.max(0, event.clientY - drag.startY);
    const elapsed = Math.max(1, now - drag.lastAt);
    drag.velocity = (event.clientY - drag.lastY) / elapsed;
    drag.lastY = event.clientY;
    drag.lastAt = now;
    drag.delta = delta;
    card.style.transform = `translateY(${delta}px)`;
    const backdrop = $('mobileEditorBackdrop');
    if (backdrop) backdrop.style.opacity = String(Math.max(.08, 1 - delta / 420));
  });

  const finish = event => {
    const drag = state.mobileSheetDrag;
    if (!drag || drag.cardId !== cardId || drag.pointerId !== event.pointerId) return;
    const shouldClose = drag.delta >= 110 || (drag.delta >= 45 && drag.velocity >= 0.65);
    state.mobileSheetDrag = null;
    try { handle.releasePointerCapture(event.pointerId); } catch {}
    settleMobileSheet(card, shouldClose, cardId);
  };

  handle.addEventListener('pointerup', finish);
  handle.addEventListener('pointercancel', event => {
    const drag = state.mobileSheetDrag;
    if (!drag || drag.cardId !== cardId || drag.pointerId !== event.pointerId) return;
    state.mobileSheetDrag = null;
    settleMobileSheet(card, false, cardId);
  });

  handle.addEventListener('click', event => {
    if (!isMobileEditorMode() || !card.classList.contains('mobile-bottom-sheet')) return;
    // Chỉ là vùng kéo; tránh click vô tình đóng sheet.
    event.preventDefault();
  });
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
  closeDesktopEditor();
  setCaptchaPanel(false);
  setLoginError('');
  state.invalidLoginCount = 0;
  clearLoginCooldown();
  state.user = user;
  invalidateHistoryCache();
  document.body.classList.remove('single-log-open');
  $('loginCard').classList.add('hidden');
  showAnimated($('filterCard'));
  $('worklogCard').classList.add('hidden');
  showAnimated($('statusCard'));
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
  setCaptchaPanel(false);
  setLoginError('');
  closeDesktopEditor();
  state.user = null;
  invalidateHistoryCache();
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
  showAnimated($('loginCard'));
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
    error.code = data?.code || '';
    error.jiraUrl = data?.jiraUrl || '';
    error.retryAfterSeconds = Number(data?.retryAfterSeconds || response.headers.get('retry-after') || 0) || 0;
    error.status = response.status;
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

function markSelectedIssue(key = '') {
  const selectedKey = String(key || '').trim().toUpperCase();
  document.querySelectorAll('#filterIssueList .issue-row').forEach(row => {
    const active = String(row.dataset.key || '').trim().toUpperCase() === selectedKey;
    row.classList.toggle('is-selected', active);
    row.setAttribute('aria-current', active ? 'true' : 'false');
  });
}

function selectIssue({ key, project, summary = '' }, { scroll = true, focusTime = true } = {}) {
  const normalizedKey = String(key || '').trim().toUpperCase();
  if (!normalizedKey) return;
  const normalizedProject = project || normalizedKey.split('-')[0] || state.prefs.lastProject || '';
  const logDate = getSessionLogDate();
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
  markSelectedIssue(normalizedKey);
  setIssueLookupState(summary ? `Summary: ${summary}` : 'Issue không có Summary.', 'ok');
  resetBulkState();
  $('resultCard').classList.add('hidden');
  showAnimated($('worklogCard'));
  document.body.classList.add('single-log-open');
  if (!$('timeSpent').value) $('timeSpent').value = state.prefs.lastTimeSpent || '1h';
  syncSinglePresetState();
  updateSingleCapacity();
  void loadSingleCapacity();
  const openedAsSheet = openMobileEditor('worklogCard');
  const openedAsDesktopModal = openDesktopEditor('worklogCard');
  if (scroll && !openedAsSheet && !openedAsDesktopModal) $('worklogCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (focusTime) setTimeout(() => $('timeSpent').focus({ preventScroll: openedAsSheet || openedAsDesktopModal }), 260);
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
      timeSpent: '1h',
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
      <button class="issue-row${String($('key')?.value || '').toUpperCase() === String(issue.key || '').toUpperCase() ? ' is-selected' : ''}" type="button" data-key="${escapeHtml(issue.key)}" data-project="${escapeHtml(issue.project)}" data-summary="${escapeHtml(issue.summary || '')}">
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
  const sessionDate = getSessionLogDate();
  $('date').value = sessionDate;
  $('bulkDate').value = sessionDate;
  if (!$('timeSpent').value) $('timeSpent').value = state.prefs.lastTimeSpent || '1h';
  syncSinglePresetState();
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
  overlay.setAttribute('aria-hidden', 'true');
  hideAnimated(overlay, () => {
    if (restore) unlockOverlayBody();
  });
}

function closeAllToolOverlays({ restore = true } = {}) {
  closeOverlay('plannerOverlay', { restore: false });
  closeOverlay('historyOverlay', { restore: false });
  if (restore) setTimeout(unlockOverlayBody, reduceMotionEnabled() ? 0 : UI_MOTION_MS + 10);
}

function openOverlay(id, focusId) {
  const overlay = $(id);
  if (!overlay || !overlay.classList.contains('hidden')) return;
  closeOverlay('settingsOverlay', { restore: false });
  closeAllToolOverlays({ restore: false });
  lockOverlayBody();
  overlay.setAttribute('aria-hidden', 'false');
  showAnimated(overlay);
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

async function loadWorklogHistory({ quiet = false, force = false } = {}) {
  if (!state.user || state.historyLoading) return;
  const date = $('historyDate').value || todayLocal();
  const key = $('historyKey').value.trim().toUpperCase();
  const cacheKey = `${date}|${key}`;
  const cached = state.historyCache.get(cacheKey);
  const cacheFresh = cached && (Date.now() - cached.at) < 20000;
  if (!force && cacheFresh) {
    state.historyItems = cached.items;
    renderWorklogHistory();
    if (!quiet) showToast(`Đã tải ${state.historyItems.length} worklog từ bộ nhớ nhanh.`);
    return;
  }

  state.historyLoading = true;
  const searchBtn = $('refreshWorklogHistoryBtn');
  if (searchBtn) {
    searchBtn.disabled = true;
    searchBtn.classList.add('is-loading');
    searchBtn.textContent = key ? 'ĐANG TÌM KEY...' : 'ĐANG TÌM WORKLOG...';
  }
  renderWorklogHistory();
  try {
    const data = await api(`/api?action=worklog-history&date=${encodeURIComponent(date)}${key ? `&key=${encodeURIComponent(key)}` : ''}`, { method: 'GET', cache: 'no-store' });
    state.historyItems = Array.isArray(data.items) ? data.items : [];
    state.historyCache.set(cacheKey, { at: Date.now(), items: state.historyItems });
    if (!quiet) {
      const timing = Number(data.elapsedMs || 0) > 0 ? ` · ${Math.max(1, Math.round(Number(data.elapsedMs) / 100) / 10)}s` : '';
      showToast(`Đã tải ${state.historyItems.length} worklog${timing}.`);
    }
  } catch (error) {
    state.historyItems = [];
    if ($('worklogHistoryState')) $('worklogHistoryState').textContent = error.message;
    if (!quiet) showToast(error.message);
  } finally {
    state.historyLoading = false;
    if (searchBtn) {
      searchBtn.disabled = false;
      searchBtn.classList.remove('is-loading');
      searchBtn.textContent = 'TÌM WORKLOG ĐÃ LOG';
    }
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
  showAnimated($('worklogCorrectionPanel'));
  $('worklogCorrectionPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeCorrection() {
  hideAnimated($('worklogCorrectionPanel'));
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
    invalidateHistoryCache();
    closeCorrection();
    await loadWorklogHistory({ quiet: true, force: true });
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
    invalidateHistoryCache();
    if ($('correctionWorklogId').value === item.id) closeCorrection();
    await loadWorklogHistory({ quiet: true, force: true });
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

function updateSingleCapacity() {
  const date = $('date')?.value || '';
  const regularDraft = $('overtime')?.checked === true ? 0 : parseTimeSpentClient($('timeSpent')?.value || '');
  const overtimeDraft = $('overtime')?.checked === true ? parseTimeSpentClient($('timeSpent')?.value || '') : 0;
  const capacityReady = state.singleCapacity.date === date && !state.singleCapacity.loading && !state.singleCapacity.error;
  const alreadyRegular = capacityReady ? Number(state.singleCapacity.regularLoggedMinutes || 0) : 0;
  const projected = alreadyRegular + regularDraft;

  if ($('singleRegularDraft')) $('singleRegularDraft').textContent = minutesLabel(regularDraft);
  if ($('singleAlreadyLogged')) $('singleAlreadyLogged').textContent = capacityReady ? minutesLabel(alreadyRegular) : (state.singleCapacity.loading ? '...' : '—');
  if ($('singleCapacityProjected')) $('singleCapacityProjected').textContent = capacityReady ? `${minutesLabel(projected)} / 8h` : 'Đang kiểm tra...';

  const bar = $('singleCapacityBar');
  if (bar) bar.style.width = `${capacityReady ? Math.min(100, Math.max(0, projected / 480 * 100)) : 0}%`;
  const capacityCard = $('singleCapacityCard');
  const status = $('singleCapacityStatus');
  if (capacityCard) capacityCard.classList.toggle('is-loading', state.singleCapacity.loading || !capacityReady);
  if (capacityCard) capacityCard.classList.toggle('is-complete', capacityReady && projected === 480);
  if (capacityCard) capacityCard.classList.toggle('is-over', capacityReady && projected > 480);
  if (status) {
    if (state.singleCapacity.loading) status.textContent = 'Đang đọc số giờ đã log trên Jira...';
    else if (state.singleCapacity.error) status.textContent = 'Chưa đọc được giờ đã log; hệ thống vẫn kiểm tra lại khi bấm Log.';
    else if (!capacityReady) status.textContent = 'Chưa có dữ liệu giờ đã log.';
    else if (projected < 480) status.textContent = `Còn thiếu ${minutesLabel(480 - projected)} để đủ 8h.`;
    else if (projected === 480) status.textContent = 'Đã đủ 8h giờ làm việc.';
    else status.textContent = `Vượt ${minutesLabel(projected - 480)} so với 8h. Hãy giảm giờ thường hoặc bật OT.`;
  }
  const overtimeEl = $('singleOvertimeDraft');
  if (overtimeEl) {
    overtimeEl.textContent = overtimeDraft > 0 ? `OT đang nhập: ${minutesLabel(overtimeDraft)} (không tính vào mốc 8h).` : '';
    overtimeEl.classList.toggle('hidden', overtimeDraft <= 0);
  }

  const capacityOver = capacityReady && projected > 480;
  if ($('logBtn')) $('logBtn').disabled = state.submitInFlight || capacityOver;
  if ($('logNextBtn')) $('logNextBtn').disabled = state.submitInFlight || capacityOver;
}

async function loadSingleCapacity() {
  const date = $('date')?.value || getSessionLogDate();
  if (!validLocalDate(date) || $('worklogCard')?.classList.contains('hidden')) return;
  const seq = ++state.singleCapacitySeq;
  state.singleCapacity = { date, regularLoggedMinutes: 0, loading: true, error: '' };
  updateSingleCapacity();
  try {
    const data = await api(`/api?action=day-audit&date=${encodeURIComponent(date)}`, { method: 'GET', cache: 'no-store' });
    if (seq !== state.singleCapacitySeq || $('date')?.value !== date) return;
    state.singleCapacity = {
      date,
      regularLoggedMinutes: Number(data.regularOccupiedMinutes ?? data.occupiedMinutes ?? 0),
      loading: false,
      error: ''
    };
  } catch (error) {
    if (seq !== state.singleCapacitySeq || $('date')?.value !== date) return;
    state.singleCapacity = { date, regularLoggedMinutes: 0, loading: false, error: error?.message || 'Không đọc được giờ đã log.' };
  }
  updateSingleCapacity();
}

function singleCapacityExceeded() {
  const date = $('date')?.value || '';
  const ready = state.singleCapacity.date === date && !state.singleCapacity.loading && !state.singleCapacity.error;
  if (!ready || $('overtime')?.checked === true) return false;
  return Number(state.singleCapacity.regularLoggedMinutes || 0) + parseTimeSpentClient($('timeSpent')?.value || '') > 480;
}

function renderBulkSelection() {}

function resetBulkState({ animate = false } = {}) {
  const card = $('bulkCard');
  const wasOpen = card && !card.classList.contains('hidden');
  state.bulkMode = false;
  state.bulkSelectedKeys.clear();
  state.bulkDrafts.clear();
  state.bulkCapacitySeq += 1;
  state.bulkCapacity = { date: '', regularLoggedMinutes: 0, loading: false, error: '' };
  state.bulkCapacityPromise = null;
  state.bulkAllocation = { autoApplied: false, userEdited: false, remainingMinutes: 0, message: '' };
  const finish = () => {
    if (card) card.classList.add('hidden');
    if (wasOpen) {
      closeMobileEditor();
      closeDesktopEditor();
    }
  };
  if (wasOpen && animate) hideAnimated(card, finish);
  else finish();
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
      timeSpent: '1h',
      description: issue.summary || '',
      overtime: false,
      autoAllocated: false
    });
  }
  state.bulkAllocation = {
    autoApplied: false,
    userEdited: false,
    remainingMinutes: 0,
    message: ''
  };
  const date = setSessionLogDate($('date').value || getSessionLogDate());
  $('bulkDate').value = date;
  $('worklogCard').classList.add('hidden');
  document.body.classList.remove('single-log-open');
  $('resultCard').classList.add('hidden');
  renderBulkItems();
  showAnimated($('bulkCard'));
  const openedAsSheet = openMobileEditor('bulkCard');
  const openedAsDesktopModal = openDesktopEditor('bulkCard');
  if (!openedAsSheet && !openedAsDesktopModal) $('bulkCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  // Hiển thị Bulk ngay với mặc định 1h/Sub-task; day-audit chạy nền và không chặn thao tác.
  setTimeout(() => { void loadBulkCapacity(); }, 0);
}
function bulkDraftList() {
  return [...state.bulkSelectedKeys].map(key => state.bulkDrafts.get(key)).filter(Boolean);
}

function markBulkUserEdited() {
  state.bulkAllocation.userEdited = true;
  state.bulkAllocation.message = '';
}

function bulkCapacityReady() {
  const date = $('bulkDate')?.value || '';
  return state.bulkCapacity.date === date && !state.bulkCapacity.loading && !state.bulkCapacity.error;
}

function applyBulkSmartAllocation({ force = false } = {}) {
  if (!bulkCapacityReady()) return false;
  if (!force && (state.bulkAllocation.autoApplied || state.bulkAllocation.userEdited)) return false;
  const items = bulkDraftList();
  const targets = items.filter(item => item.overtime !== true);
  if (!targets.length) return false;

  const alreadyRegular = Number(state.bulkCapacity.regularLoggedMinutes || 0);
  const remaining = Math.max(0, 480 - alreadyRegular);
  if (remaining <= 0) {
    state.bulkAllocation = {
      autoApplied: false,
      userEdited: false,
      remainingMinutes: 0,
      message: ''
    };
    updateBulkTotal();
    return true;
  }

  const allocator = globalThis.QJLAllocation;
  if (!allocator?.allocateRegularMinutes || !allocator?.formatTimeSpent) return false;
  const allocations = allocator.allocateRegularMinutes(remaining, targets.length);

  targets.forEach((item, index) => {
    item.timeSpent = allocator.formatTimeSpent(allocations[index] || 0);
    item.autoAllocated = true;
  });

  state.bulkAllocation = {
    autoApplied: true,
    userEdited: false,
    remainingMinutes: remaining,
    message: 'Đã tự phân bổ'
  };
  renderBulkItems();
  return true;
}

function updateBulkTotal() {
  const items = bulkDraftList();
  const total = items.reduce((sum, item) => sum + parseTimeSpentClient(item.timeSpent), 0);
  const regularDraft = items.filter(item => item.overtime !== true).reduce((sum, item) => sum + parseTimeSpentClient(item.timeSpent), 0);
  const overtimeDraft = Math.max(0, total - regularDraft);
  const date = $('bulkDate')?.value || '';
  const capacityReady = state.bulkCapacity.date === date && !state.bulkCapacity.loading && !state.bulkCapacity.error;
  const alreadyRegular = capacityReady ? Number(state.bulkCapacity.regularLoggedMinutes || 0) : 0;
  const projected = alreadyRegular + regularDraft;

  $('bulkTotal').textContent = minutesLabel(total);
  if ($('bulkSelectionCount')) $('bulkSelectionCount').textContent = `${items.length}/${state.filterIssues.length} Sub-task`;
  if ($('bulkRegularDraft')) $('bulkRegularDraft').textContent = minutesLabel(regularDraft);
  if ($('bulkAlreadyLogged')) $('bulkAlreadyLogged').textContent = capacityReady ? minutesLabel(alreadyRegular) : (state.bulkCapacity.loading ? '...' : '—');
  if ($('bulkCapacityProjected')) $('bulkCapacityProjected').textContent = capacityReady ? `${minutesLabel(projected)} / 8h` : 'Đang kiểm tra...';

  const bar = $('bulkCapacityBar');
  if (bar) bar.style.width = `${capacityReady ? Math.min(100, Math.max(0, projected / 480 * 100)) : 0}%`;
  const capacityCard = $('bulkCapacityCard');
  const status = $('bulkCapacityStatus');
  if (capacityCard) capacityCard.classList.toggle('is-loading', state.bulkCapacity.loading || !capacityReady);
  if (capacityCard) capacityCard.classList.toggle('is-complete', capacityReady && projected === 480);
  if (capacityCard) capacityCard.classList.toggle('is-over', capacityReady && projected > 480);
  if (status) {
    if (state.bulkCapacity.loading) status.textContent = 'Đang đọc số giờ đã log trên Jira...';
    else if (state.bulkCapacity.error) status.textContent = 'Chưa đọc được giờ đã log; hệ thống vẫn kiểm tra lại khi bấm Log.';
    else if (!capacityReady) status.textContent = 'Chưa có dữ liệu giờ đã log.';
    else if (projected < 480) status.textContent = `Còn thiếu ${minutesLabel(480 - projected)} để đủ 8h.`;
    else if (projected === 480) status.textContent = 'Đã đủ 8h giờ làm việc.';
    else status.textContent = `Vượt ${minutesLabel(projected - 480)} so với 8h. Hãy giảm giờ thường hoặc bật OT.`;
  }
  const overtimeEl = $('bulkOvertimeDraft');
  if (overtimeEl) {
    overtimeEl.textContent = overtimeDraft > 0 ? `OT đang nhập: ${minutesLabel(overtimeDraft)} (không tính vào mốc 8h).` : '';
    overtimeEl.classList.toggle('hidden', overtimeDraft <= 0);
  }

  const redistributeBtn = $('bulkRedistributeBtn');
  if (redistributeBtn) {
    redistributeBtn.disabled = state.bulkSubmitInFlight || !items.length || (capacityReady && alreadyRegular >= 480);
    if (!redistributeBtn.dataset.loading) {
      redistributeBtn.textContent = state.bulkAllocation.autoApplied ? 'PHÂN BỔ LẠI' : 'TỰ ĐỘNG PHÂN BỔ';
    }
  }

  $('bulkLogBtn').disabled = state.bulkSubmitInFlight || !items.length || total <= 0 || items.some(item => parseTimeSpentClient(item.timeSpent) <= 0) || (capacityReady && projected > 480);
}

async function loadBulkCapacity({ force = false } = {}) {
  const date = $('bulkDate')?.value || getSessionLogDate();
  if (!validLocalDate(date)) return false;
  if (!force && bulkCapacityReady()) return true;
  if (!force && state.bulkCapacity.loading && state.bulkCapacity.date === date && state.bulkCapacityPromise) {
    return state.bulkCapacityPromise;
  }

  const seq = ++state.bulkCapacitySeq;
  state.bulkCapacity = { date, regularLoggedMinutes: 0, loading: true, error: '' };
  updateBulkTotal();

  let promise;
  promise = (async () => {
    try {
      const data = await api(`/api?action=day-audit&date=${encodeURIComponent(date)}`, { method: 'GET', cache: 'no-store' });
      if (seq !== state.bulkCapacitySeq || $('bulkDate')?.value !== date) return false;
      state.bulkCapacity = {
        date,
        regularLoggedMinutes: Number(data.regularOccupiedMinutes ?? data.occupiedMinutes ?? 0),
        loading: false,
        error: ''
      };
      // V1.7.2: chỉ cập nhật tiến độ; tuyệt đối không tự thay TimeSpent khi mở Bulk.
      updateBulkTotal();
      return true;
    } catch (error) {
      if (seq !== state.bulkCapacitySeq || $('bulkDate')?.value !== date) return false;
      state.bulkCapacity = { date, regularLoggedMinutes: 0, loading: false, error: error?.message || 'Không đọc được giờ đã log.' };
      updateBulkTotal();
      return false;
    } finally {
      if (state.bulkCapacityPromise === promise) state.bulkCapacityPromise = null;
    }
  })();

  state.bulkCapacityPromise = promise;
  return promise;
}

async function requestBulkSmartAllocation() {
  if (state.bulkSubmitInFlight) return;
  const btn = $('bulkRedistributeBtn');
  const originalText = btn?.textContent || 'TỰ ĐỘNG PHÂN BỔ';
  if (btn) {
    btn.dataset.loading = '1';
    btn.disabled = true;
    btn.textContent = 'ĐANG TÍNH...';
  }

  try {
    if (!bulkCapacityReady()) {
      const ok = await loadBulkCapacity({ force: Boolean(state.bulkCapacity.error) });
      if (!ok || !bulkCapacityReady()) {
        showToast('Chưa đọc được số giờ đã log trên Jira. Vui lòng thử lại.');
        return;
      }
    }
    state.bulkAllocation.userEdited = false;
    state.bulkAllocation.autoApplied = false;
    if (!applyBulkSmartAllocation({ force: true })) {
      showToast('Chưa thể tự động phân bổ TimeSpent cho danh sách hiện tại.');
    } else {
      showToast('Đã tự động phân bổ TimeSpent.');
    }
  } finally {
    if (btn) {
      delete btn.dataset.loading;
      btn.textContent = originalText;
    }
    updateBulkTotal();
  }
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
    <div class="bulk-item${item.autoAllocated ? ' is-auto-allocated' : ''}" data-key="${escapeHtml(item.key)}">
      <div class="bulk-item-head">
        <div class="bulk-item-title">
          <strong>${index + 1}. ${escapeHtml(item.key)}${item.autoAllocated ? '<span class="auto-time-badge">AUTO</span>' : ''}</strong>
          <span>${escapeHtml(item.summary || 'Không có summary')}</span>
          <small>${escapeHtml(item.project)}</small>
        </div>
        <button class="bulk-remove-btn" type="button" aria-label="Bỏ ${escapeHtml(item.key)} khỏi danh sách log" title="Bỏ Sub-task này">×</button>
      </div>
      <div class="bulk-item-fields">
        <label class="bulk-time-field">
          <span>TimeSpent</span>
          <input class="bulk-time" value="${escapeHtml(item.timeSpent || '')}" placeholder="VD: 1h" inputmode="text" required />
          <span class="bulk-preset-row" aria-label="Preset TimeSpent">
            ${['30m', '1h', '2h', '3h', '4h'].map(value => `<button class="bulk-preset-btn${String(item.timeSpent || '') === value ? ' active' : ''}" type="button" data-time="${value}">${value}</button>`).join('')}
          </span>
        </label>
        <label class="bulk-overtime-toggle">
          <input class="bulk-overtime" type="checkbox" ${item.overtime ? 'checked' : ''} />
          <span class="overtime-control" aria-hidden="true"></span>
          <span class="overtime-copy"><strong>Overtime (OT)</strong><small>${escapeHtml(overtimeWindowLabel($('bulkDate')?.value || todayLocal()))}</small></span>
        </label>
        <details class="bulk-description-details">
          <summary>Sửa Description <span>${escapeHtml((item.description || item.summary || '').slice(0, 72))}${(item.description || item.summary || '').length > 72 ? '…' : ''}</span></summary>
          <label class="bulk-description-field">Description<textarea class="bulk-description" rows="2">${escapeHtml(item.description || item.summary || '')}</textarea></label>
        </details>
      </div>
    </div>
  `).join('');

  wrap.querySelectorAll('.bulk-item').forEach(row => {
    const key = row.dataset.key || '';
    const draft = state.bulkDrafts.get(key);
    const bulkTimeInput = row.querySelector('.bulk-time');
    const syncBulkPresetState = () => {
      const current = String(bulkTimeInput?.value || '').trim();
      row.querySelectorAll('.bulk-preset-btn').forEach(button => {
        button.classList.toggle('active', button.dataset.time === current);
      });
    };
    bulkTimeInput?.addEventListener('input', event => {
      if (draft) { draft.timeSpent = event.target.value; draft.autoAllocated = false; }
      markBulkUserEdited();
      syncBulkPresetState();
      updateBulkTotal();
    });
    row.querySelectorAll('.bulk-preset-btn').forEach(button => {
      button.addEventListener('click', () => {
        const value = button.dataset.time || '';
        if (!value || !bulkTimeInput) return;
        bulkTimeInput.value = value;
        if (draft) { draft.timeSpent = value; draft.autoAllocated = false; }
        markBulkUserEdited();
        syncBulkPresetState();
        updateBulkTotal();
      });
    });
    row.querySelector('.bulk-description')?.addEventListener('input', event => {
      if (draft) draft.description = event.target.value;
    });
    row.querySelector('.bulk-overtime')?.addEventListener('change', event => {
      if (draft) { draft.overtime = event.target.checked; draft.autoAllocated = false; }
      markBulkUserEdited();
      updateBulkTotal();
    });
    row.querySelector('.bulk-remove-btn')?.addEventListener('click', () => {
      state.bulkSelectedKeys.delete(key);
      state.bulkDrafts.delete(key);
      markBulkUserEdited();
      renderBulkItems();
      showToast(`Đã bỏ ${key} khỏi lần Log tất cả này.`);
    });
  });
  updateBulkTotal();
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
  showAnimated(result);
  requestAnimationFrame(() => result.scrollIntoView({ behavior: 'smooth', block: 'center' }));
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

  const date = $('bulkDate').value;
  const totalMinutes = items.reduce((sum, item) => sum + parseTimeSpentClient(item.timeSpent), 0);
  const overtimeMinutes = items.filter(item => item.overtime).reduce((sum, item) => sum + parseTimeSpentClient(item.timeSpent), 0);
  const confirmed = await confirmLogAction({
    title: 'Xác nhận Log tất cả?',
    message: 'Bạn sắp ghi nhiều worklog lên Jira. Hãy kiểm tra nhanh ngày, số Sub-task và tổng thời gian để tránh bấm nhầm.',
    rows: [
      ['Ngày logwork', date],
      ['Sub-task', `${items.length} mục`],
      ['Tổng thời gian', minutesLabel(totalMinutes)],
      ...(overtimeMinutes > 0 ? [['Trong đó OT', minutesLabel(overtimeMinutes)]] : [])
    ],
    confirmLabel: 'XÁC NHẬN LOG TẤT CẢ'
  });
  if (!confirmed || state.bulkSubmitInFlight) return;

  state.bulkSubmitInFlight = true;
  const requestId = createRequestId('bulk');
  const btn = $('bulkLogBtn');
  btn.disabled = true;
  btn.textContent = 'ĐANG LOG TẤT CẢ...';
  $('resultCard').classList.add('hidden');
  try {
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
      const lastDraft = state.bulkDrafts.get(last.key);
      state.prefs.lastProject = last.project;
      if (lastDraft?.autoAllocated !== true) state.prefs.lastTimeSpent = last.timeSpent;
      savePrefs();
      setLastLog({ ...last, date }, (data.items || []).find(x => x.key === last.key)?.summary || last.description);
    }
    renderBulkSuccess(data);
    addAuditEntry({ ok: true, type: 'Bulk', key: `${data.items.length} issue`, message: `${data.date} · ${minutesLabel(data.totalMinutes)}`, segments: (data.items || []).flatMap(x => x.segments || []) });
    const firstRange = data.items?.[0]?.segments?.map(segment => `${segment.start}–${segment.end}`).join(' · ') || '';
    showToast(data.items.length === 1 ? `Đã log ${data.items[0].key}${firstRange ? ` · ${firstRange}` : ''}` : `Đã log ${data.items.length} Sub-task lên Jira.`);
    showLateLogWarning(date);
    invalidateHistoryCache();
    const loggedKeys = new Set((data.items || []).map(item => String(item.key || '').toUpperCase()));
    state.filterIssues = state.filterIssues.filter(item => !loggedKeys.has(String(item.key || '').toUpperCase()));
    state.filterLoaded = true;
    resetBulkState();
    renderFilterIssues();
    setTimeout(() => loadFilterIssues({ quiet: true }), 850);
  } catch (error) {
    const result = $('resultCard');
    result.className = 'result error';
    result.innerHTML = `<h3>Bulk Logwork chưa thành công</h3><div class="meta">${escapeHtml(error.message)}</div>`;
    showAnimated(result);
    addAuditEntry({ ok: false, type: 'Bulk', message: error.message });
    showToast(error.message);
  } finally {
    state.bulkSubmitInFlight = false;
    btn.textContent = 'LOG TẤT CẢ';
    updateBulkTotal();
  }
}

$('loginForm').addEventListener('submit', event => {
  event.preventDefault();
  performLogin({ captchaRetry: false });
});

$('cancelLogConfirmBtn')?.addEventListener('click', () => closeLogConfirmation(false));
$('confirmLogBtn')?.addEventListener('click', () => closeLogConfirmation(true));
document.querySelectorAll('[data-close-log-confirm]').forEach(el => el.addEventListener('click', () => closeLogConfirmation(false)));

$('captchaRetryBtn')?.addEventListener('click', () => performLogin({ captchaRetry: true }));
$('jiraVerifyBtn')?.addEventListener('click', () => {
  showToast('Hoàn tất xác minh trên Jira rồi quay lại và bấm “Tôi đã xác minh – Thử lại”.');
});
for (const id of ['username', 'password']) {
  $(id)?.addEventListener('input', () => {
    if (state.captchaRequired) setCaptchaPanel(false);
    setLoginError('');
  });
}

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
$('cancelBulkBtn').addEventListener('click', () => resetBulkState({ animate: true }));
$('bulkForm').addEventListener('submit', submitBulkWorklog);
$('bulkRedistributeBtn')?.addEventListener('click', () => {
  void requestBulkSmartAllocation();
});
$('closeWorklogBtn').addEventListener('click', () => closeSingleEditorAnimated());
$('mobileEditorBackdrop')?.addEventListener('click', () => {
  if (!$('bulkCard').classList.contains('hidden')) return resetBulkState({ animate: true });
  if (!$('worklogCard').classList.contains('hidden')) closeSingleEditorAnimated({ hideResult: false });
});

$('date').addEventListener('change', () => {
  if (!$('date').value) $('date').value = getSessionLogDate();
  setSessionLogDate($('date').value);
  updateSingleOvertimeHint();
  updateSingleCapacity();
  void loadSingleCapacity();
});
$('bulkDate').addEventListener('change', () => {
  if (!$('bulkDate').value) $('bulkDate').value = getSessionLogDate();
  setSessionLogDate($('bulkDate').value);
  state.bulkAllocation = {
    autoApplied: false,
    userEdited: false,
    remainingMinutes: 0,
    message: 'Mặc định 1h cho mỗi Sub-task. Bấm “TỰ ĐỘNG PHÂN BỔ” nếu muốn app chia phần giờ còn thiếu đến 8h.'
  };
  bulkDraftList().forEach(item => { if (item.overtime !== true) { item.timeSpent = '1h'; item.autoAllocated = false; } });
  renderBulkItems();
  setTimeout(() => { void loadBulkCapacity(); }, 0);
});

$('overtime')?.addEventListener('change', () => {
  updateSingleOvertimeHint();
  updateSingleCapacity();
});

function syncSinglePresetState() {
  const current = String($('timeSpent')?.value || '').trim();
  document.querySelectorAll('.preset-btn').forEach(button => {
    button.classList.toggle('active', button.dataset.time === current);
  });
}

$('timeSpent').addEventListener('input', () => {
  syncSinglePresetState();
  updateSingleCapacity();
});
$('timeSpent').addEventListener('change', () => {
  const value = $('timeSpent').value.trim();
  if (value) {
    state.prefs.lastTimeSpent = value;
    savePrefs();
  }
  syncSinglePresetState();
  updateSingleCapacity();
});

document.querySelectorAll('.preset-btn').forEach(button => {
  button.addEventListener('click', () => {
    const value = button.dataset.time || '';
    $('timeSpent').value = value;
    state.prefs.lastTimeSpent = value;
    savePrefs();
    syncSinglePresetState();
    updateSingleCapacity();
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
$('historyKey')?.addEventListener('keydown', event => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  void loadWorklogHistory();
});
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
  if (!$('logConfirmOverlay')?.classList.contains('hidden')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeLogConfirmation(false);
    return;
  }
  if (!$('plannerOverlay')?.classList.contains('hidden')) return closePlanner();
  if (!$('historyOverlay')?.classList.contains('hidden')) return closeHistory();
  if (!$('settingsOverlay')?.classList.contains('hidden')) closeSettings();
});

$('logBtn')?.addEventListener('click', () => { state.logAndNextRequested = false; });
$('logNextBtn')?.addEventListener('click', () => { state.logAndNextRequested = true; });


document.addEventListener('keydown', event => {
  const active = document.activeElement;
  const typing = active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName);
  if (event.key === 'Escape' && document.body.classList.contains('desktop-editor-open')) {
    event.preventDefault();
    if (!$('bulkCard')?.classList.contains('hidden')) resetBulkState({ animate: true });
    else if (!$('worklogCard')?.classList.contains('hidden')) closeSingleEditorAnimated({ hideResult: false });
    return;
  }
  if (event.key === '/' && !typing && state.user) {
    event.preventDefault();
    $('filterIssueSearch')?.focus();
    return;
  }
  if (event.key === 'Enter' && active === $('filterIssueSearch') && !event.ctrlKey && !event.metaKey) {
    const first = filteredIssues()[0];
    if (first) { event.preventDefault(); selectIssue(first); }
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && state.user) {
    if (!$('worklogCard')?.classList.contains('hidden')) {
      event.preventDefault();
      state.logAndNextRequested = false;
      $('worklogForm')?.requestSubmit($('logBtn'));
    } else if (!$('bulkCard')?.classList.contains('hidden')) {
      event.preventDefault();
      $('bulkForm')?.requestSubmit($('bulkLogBtn'));
    }
  }
});

$('worklogForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (state.submitInFlight) return;
  if (singleCapacityExceeded()) {
    updateSingleCapacity();
    return showToast('Tổng giờ thường dự kiến vượt 8h. Hãy giảm TimeSpent hoặc bật OT.');
  }
  const logAndNext = state.logAndNextRequested === true;
  state.logAndNextRequested = false;
  const payload = {
    key: $('key').value.trim(),
    project: $('project').value.trim(),
    timeSpent: $('timeSpent').value.trim(),
    date: $('date').value,
    description: $('description').value.trim(),
    overtime: $('overtime')?.checked === true
  };
  const confirmed = await confirmLogAction({
    title: logAndNext ? 'Xác nhận Log & Next?' : 'Xác nhận Logwork?',
    message: 'Worklog sẽ được ghi lên Jira và có thể cập nhật trạng thái issue. Hãy kiểm tra nhanh trước khi xác nhận.',
    rows: [
      ['Sub-task', payload.key || '—'],
      ['Ngày logwork', payload.date || '—'],
      ['TimeSpent', payload.timeSpent || '—'],
      ['Loại', payload.overtime ? 'Overtime (OT)' : 'Giờ thường']
    ],
    confirmLabel: logAndNext ? 'XÁC NHẬN LOG & NEXT' : 'XÁC NHẬN LOG'
  });
  if (!confirmed || state.submitInFlight) return;

  state.submitInFlight = true;
  const currentKeyBeforeLog = payload.key.toUpperCase();
  const currentIndexBeforeLog = state.filterIssues.findIndex(item => String(item.key || '').toUpperCase() === currentKeyBeforeLog);
  const requestId = createRequestId('worklog');
  const btn = $('logBtn');
  const nextBtn = $('logNextBtn');
  btn.disabled = true;
  if (nextBtn) nextBtn.disabled = true;
  btn.textContent = 'ĐANG LOG WORK...';
  if (nextBtn && logAndNext) nextBtn.textContent = 'ĐANG LOG...';
  $('resultCard').classList.add('hidden');
  try {
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
    showAnimated(result);
    result.dataset.lastSuccess = data.issue.key;
    addAuditEntry({ ok: true, key: data.issue.key, message: `${data.date} · ${minutesLabel(data.totalMinutes)}`, segments: data.segments });
    const loggedRange = (data.segments || []).map(segment => `${segment.start}–${segment.end}`).join(' · ');
    showToast(`Đã log ${data.issue.key}${loggedRange ? ` · ${loggedRange}` : ''}`);
    showLateLogWarning(payload.date);
    invalidateHistoryCache();
    state.singleCapacitySeq += 1;
    $('worklogCard').classList.add('hidden');
    document.body.classList.remove('single-log-open');
    closeMobileEditor();
    closeDesktopEditor();
    $('key').value = '';
    $('project').value = '';
    $('description').value = '';
    if ($('overtime')) $('overtime').checked = false;
    updateSingleOvertimeHint();
    state.currentIssueSummary = '';
    markSelectedIssue('');

    state.filterIssues = state.filterIssues.filter(item => String(item.key || '').toUpperCase() !== currentKeyBeforeLog);
    state.filterLoaded = true;
    renderFilterIssues();

    if (logAndNext) {
      const nextIndex = currentIndexBeforeLog >= 0 ? Math.min(currentIndexBeforeLog, Math.max(0, state.filterIssues.length - 1)) : 0;
      const nextIssue = state.filterIssues[nextIndex] || state.filterIssues[0];
      if (nextIssue) {
        selectIssue(nextIssue, { scroll: false, focusTime: true });
        showToast(`Đã log ${data.issue.key}. Tiếp theo: ${nextIssue.key}`);
      } else {
        showToast(`Đã log ${data.issue.key}. Không còn Sub-task chưa logwork.`);
        requestAnimationFrame(() => result.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      }
      setTimeout(() => loadFilterIssues({ quiet: true }), 650);
    } else {
      requestAnimationFrame(() => result.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      setTimeout(() => loadFilterIssues({ quiet: true }), 650);
    }
  } catch (error) {
    const result = $('resultCard');
    result.className = 'result error';
    result.innerHTML = `<h3>Logwork chưa thành công</h3><div class="meta">${escapeHtml(error.message)}</div>`;
    showAnimated(result);
    addAuditEntry({ ok: false, key: $('key').value.trim().toUpperCase(), message: error.message });
    showToast(error.message);
  } finally {
    state.submitInFlight = false;
    btn.disabled = false;
    btn.textContent = 'LOG WORK';
    if (nextBtn) { nextBtn.disabled = false; nextBtn.textContent = 'LOG & NEXT'; }
    updateSingleCapacity();
  }
});

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
}

applyTheme(readThemePreference(), { persist: false });
setupBottomSheetDrag('worklogCard');
setupBottomSheetDrag('bulkCard');
loadQuickData();
$('date').value = getSessionLogDate();
window.addEventListener('resize', () => {
  if (!isMobileEditorMode() && document.body.classList.contains('mobile-editor-open')) closeMobileEditor();
});

$('bulkDate').value = getSessionLogDate();
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
