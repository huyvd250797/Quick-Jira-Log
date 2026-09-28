'use strict';

const APP_VERSION = '0.6.0';
const STORAGE = {
  prefs: 'quick-jira-log:prefs:v1',
  recent: 'quick-jira-log:recent-issues:v1',
  templates: 'quick-jira-log:templates:v1',
  lastLog: 'quick-jira-log:last-log:v1',
  audit: 'quick-jira-log:audit:v1'
};

const $ = id => document.getElementById(id);
const state = {
  user: null,
  toastTimer: null,
  filters: [],
  filtersLoading: false,
  selectedFilterId: '',
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
  prefs: { lastProject: '', lastTimeSpent: '', selectedFilterId: '' },
  recentIssues: [],
  templates: [],
  lastLog: null,
  auditHistory: []
};

function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function minutesLabel(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h}h` : '', m ? `${m}m` : ''].filter(Boolean).join('') || '0m';
}

function showToast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
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

function loadQuickData() {
  const prefs = readStorage(STORAGE.prefs, {});
  state.prefs = {
    lastProject: typeof prefs?.lastProject === 'string' ? prefs.lastProject : '',
    lastTimeSpent: typeof prefs?.lastTimeSpent === 'string' ? prefs.lastTimeSpent : '',
    selectedFilterId: typeof prefs?.selectedFilterId === 'string' ? prefs.selectedFilterId : ''
  };
  const recent = readStorage(STORAGE.recent, []);
  state.recentIssues = Array.isArray(recent) ? recent.slice(0, 8) : [];
  const templates = readStorage(STORAGE.templates, []);
  state.templates = Array.isArray(templates) ? templates.filter(t => t?.id && t?.name && typeof t?.content === 'string').slice(0, 30) : [];
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
  $('loginCard').classList.add('hidden');
  $('filterCard').classList.remove('hidden');
  $('worklogCard').classList.remove('hidden');
  $('statusCard').classList.remove('hidden');
  $('userLabel').textContent = user?.displayName || user?.username || '';
  hydrateQuickInputs();
  if (!state.filters.length && !state.filtersLoading) loadFilters();
}

function setLoggedOut() {
  state.user = null;
  state.filters = [];
  state.filtersLoading = false;
  state.selectedFilterId = '';
  state.filterIssues = [];
  state.filterLoaded = false;
  state.filterLoading = false;
  state.bulkMode = false;
  state.bulkSelectedKeys.clear();
  state.bulkDrafts.clear();
  $('statusCard').classList.add('hidden');
  $('filterCard').classList.add('hidden');
  $('worklogCard').classList.add('hidden');
  $('bulkCard').classList.add('hidden');
  $('loginCard').classList.remove('hidden');
  $('resultCard').classList.add('hidden');
  renderFilterIssues();
  renderBulkSelection();
}


async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
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
  try {
    const response = await fetch('/api/status', { credentials: 'same-origin', cache: 'no-store' });
    const data = await response.json();
    if (data?.authenticated) setLoggedIn(data.user);
    else setLoggedOut();
  } catch {
    setLoggedOut();
  }
}

function setFilterUi(mode, message = '') {
  $('filterLoading').classList.toggle('hidden', mode !== 'loading');
  $('filterError').classList.toggle('hidden', mode !== 'error');
  $('filterEmpty').classList.toggle('hidden', mode !== 'empty');
  $('filterIssueList').classList.toggle('hidden', mode !== 'list');
  if (mode === 'error') $('filterError').textContent = message;
}

function renderFilterOptions() {
  const select = $('filterSelect');
  const selected = state.selectedFilterId || state.prefs.selectedFilterId || '';
  select.innerHTML = state.filters.length
    ? state.filters.map(filter => `<option value="${escapeHtml(filter.id)}">${escapeHtml(filter.name)}${filter.favourite ? ' ★' : ''}</option>`).join('')
    : '<option value="">Không có filter</option>';
  if (state.filters.some(filter => filter.id === selected)) select.value = selected;
  else if (state.filters[0]) select.value = state.filters[0].id;
  state.selectedFilterId = select.value || '';
  const active = state.filters.find(filter => filter.id === state.selectedFilterId);
  $('filterName').textContent = active?.name || 'Chọn Jira Filter';
}

async function loadFilters({ quiet = false } = {}) {
  if (!state.user || state.filtersLoading) return;
  state.filtersLoading = true;
  const refreshListBtn = $('refreshFilterListBtn');
  const select = $('filterSelect');
  refreshListBtn.disabled = true;
  select.disabled = true;
  if (!quiet) setFilterUi('loading');

  try {
    const data = await api('/api/filters', { method: 'GET', cache: 'no-store' });
    state.filters = Array.isArray(data.filters) ? data.filters : [];
    const remembered = state.prefs.selectedFilterId;
    const preferred = state.filters.find(filter => filter.id === remembered)
      || state.filters.find(filter => filter.favourite)
      || state.filters[0];
    state.selectedFilterId = preferred?.id || '';
    state.prefs.selectedFilterId = state.selectedFilterId;
    savePrefs();
    renderFilterOptions();
    if (state.selectedFilterId) await loadFilterIssues({ quiet });
    else setFilterUi('empty');
  } catch (error) {
    state.filters = [];
    state.selectedFilterId = '';
    renderFilterOptions();
    setFilterUi('error', error.message);
  } finally {
    state.filtersLoading = false;
    refreshListBtn.disabled = false;
    select.disabled = false;
  }
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
  $('key').value = normalizedKey;
  $('project').value = project || normalizedKey.split('-')[0] || state.prefs.lastProject || '';
  $('description').value = summary || '';
  state.currentIssueSummary = summary || '';
  state.lastAutoIssueKey = normalizedKey;
  setIssueLookupState(summary ? `Summary: ${summary}` : 'Issue không có Summary.', 'ok');
  if (scroll) $('worklogCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (focusTime) setTimeout(() => $('timeSpent').focus(), 300);
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
      description: issue.summary || ''
    });
  }
  renderFilterIssues();
  renderBulkSelection();
}

function renderFilterIssues() {
  const list = $('filterIssueList');
  const issues = filteredIssues();
  $('filterCount').textContent = state.filterLoaded
    ? (issues.length === state.filterIssues.length ? String(issues.length) : `${issues.length}/${state.filterIssues.length}`)
    : '0';

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
    const selected = state.bulkSelectedKeys.has(issue.key);
    return `
      <button class="issue-row${selected ? ' bulk-selected' : ''}" type="button" data-key="${escapeHtml(issue.key)}" data-project="${escapeHtml(issue.project)}" data-summary="${escapeHtml(issue.summary || '')}">
        ${state.bulkMode ? `<span class="issue-check" aria-hidden="true">${selected ? '✓' : ''}</span>` : ''}
        <div class="issue-main">
          <div class="issue-key-line"><strong>${escapeHtml(issue.key)}</strong>${issue.status ? `<span class="status-pill">${escapeHtml(issue.status)}</span>` : ''}</div>
          <div class="issue-summary">${escapeHtml(issue.summary || 'Không có summary')}</div>
          <div class="issue-meta">${escapeHtml([issue.project, issue.issueType, issue.priority].filter(Boolean).join(' · '))}</div>
        </div>
        <span class="issue-pick">${state.bulkMode ? (selected ? 'Đã chọn' : 'Chọn') : 'Dùng'}</span>
      </button>`;
  }).join('');
  setFilterUi('list');

  list.querySelectorAll('.issue-row').forEach(button => {
    button.addEventListener('click', () => {
      const issue = {
        key: button.dataset.key || '',
        project: button.dataset.project || '',
        summary: button.dataset.summary || ''
      };
      if (state.bulkMode) {
        toggleBulkIssue(issue);
        return;
      }
      selectIssue(issue);
      showToast(`Đã chọn ${issue.key} và tự điền Description theo Summary.`);
    });
  });
}

async function loadFilterIssues({ quiet = false } = {}) {
  if (!state.user || state.filterLoading || !state.selectedFilterId) return;
  state.filterLoading = true;
  const btn = $('refreshFilterBtn');
  btn.disabled = true;
  btn.classList.add('spinning');
  if (!quiet) setFilterUi('loading');

  try {
    const data = await api(`/api/filter-issues?filterId=${encodeURIComponent(state.selectedFilterId)}`, { method: 'GET', cache: 'no-store' });
    state.filterIssues = Array.isArray(data.issues) ? data.issues : [];
    state.filterLoaded = true;
    $('filterName').textContent = data.filter?.name || 'Jira Filter';
    renderFilterIssues();
    if (data.truncated) showToast(`Filter có ${data.total} issue, app đang hiển thị 500 issue đầu.`);
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
    const data = await api(`/api/issue-info?key=${encodeURIComponent(key)}`, { method: 'GET', cache: 'no-store' });
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

function renderRecentIssues() {
  const wrap = $('recentWrap');
  const list = $('recentIssues');
  if (!state.recentIssues.length) {
    wrap.classList.add('hidden');
    list.innerHTML = '';
    return;
  }
  wrap.classList.remove('hidden');
  list.innerHTML = state.recentIssues.map(issue => `
    <button type="button" class="recent-chip" data-key="${escapeHtml(issue.key)}" title="${escapeHtml(issue.summary || issue.key)}">
      <strong>${escapeHtml(issue.key)}</strong>${issue.summary ? `<span>${escapeHtml(issue.summary)}</span>` : ''}
    </button>
  `).join('');
  list.querySelectorAll('.recent-chip').forEach(button => {
    button.addEventListener('click', async () => {
      const key = button.dataset.key || '';
      const cached = state.recentIssues.find(x => x.key === key) || { key };
      selectIssue(cached, { focusTime: false });
      try { await loadIssueByKey(key); } catch {}
      $('timeSpent').focus();
      showToast(`Đã chọn KEY gần đây ${key}.`);
    });
  });
}

function renderTemplates() {
  const select = $('templateSelect');
  const selected = select.value;
  select.innerHTML = '<option value="">Mẫu Description...</option>' + state.templates.map(t => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`).join('');
  if (state.templates.some(t => t.id === selected)) select.value = selected;

  const list = $('templateList');
  if (!state.templates.length) {
    list.innerHTML = '<div class="template-empty">Chưa có mẫu nào. Bạn có thể lưu Description hiện tại thành mẫu.</div>';
    return;
  }
  list.innerHTML = state.templates.map(t => `
    <div class="template-item" data-id="${escapeHtml(t.id)}">
      <div><strong>${escapeHtml(t.name)}</strong><small>${escapeHtml(t.content)}</small></div>
      <div class="template-item-actions">
        <button type="button" class="template-use">Dùng</button>
        <button type="button" class="template-delete" aria-label="Xóa mẫu">×</button>
      </div>
    </div>
  `).join('');
  list.querySelectorAll('.template-item').forEach(row => {
    const id = row.dataset.id;
    row.querySelector('.template-use').addEventListener('click', () => applyTemplateById(id));
    row.querySelector('.template-delete').addEventListener('click', () => deleteTemplate(id));
  });
}

function templateContext() {
  return {
    summary: state.currentIssueSummary || $('description').value.trim(),
    key: $('key').value.trim().toUpperCase(),
    project: $('project').value.trim().toUpperCase(),
    date: $('date').value || todayLocal()
  };
}

function expandTemplate(content) {
  const ctx = templateContext();
  return String(content || '').replace(/\{(summary|key|project|date)\}/gi, (_, name) => ctx[String(name).toLowerCase()] || '');
}

function applyTemplateById(id) {
  const template = state.templates.find(t => t.id === id);
  if (!template) {
    showToast('Hãy chọn một mẫu Description.');
    return;
  }
  $('templateSelect').value = id;
  $('description').value = expandTemplate(template.content);
  showToast(`Đã áp dụng mẫu “${template.name}”.`);
  closeSettings();
  $('description').focus();
}

function saveTemplate(name, content) {
  const cleanName = String(name || '').trim();
  const cleanContent = String(content || '').trim();
  if (!cleanContent) {
    showToast('Nội dung mẫu không được để trống.');
    return false;
  }
  const finalName = cleanName || `Mẫu ${state.templates.length + 1}`;
  const existing = state.templates.find(t => t.name.toLocaleLowerCase('vi') === finalName.toLocaleLowerCase('vi'));
  if (existing) {
    existing.content = cleanContent;
    existing.updatedAt = new Date().toISOString();
  } else {
    state.templates.unshift({
      id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: finalName,
      content: cleanContent,
      createdAt: new Date().toISOString()
    });
  }
  state.templates = state.templates.slice(0, 30);
  writeStorage(STORAGE.templates, state.templates);
  renderTemplates();
  return true;
}

function deleteTemplate(id) {
  const template = state.templates.find(t => t.id === id);
  if (!template) return;
  if (!confirm(`Xóa mẫu “${template.name}”?`)) return;
  state.templates = state.templates.filter(t => t.id !== id);
  writeStorage(STORAGE.templates, state.templates);
  renderTemplates();
  showToast('Đã xóa mẫu.');
}

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
  $('repeatLastBtn').classList.remove('hidden');
}

function applyLastLog() {
  if (!state.lastLog?.key) {
    showToast('Chưa có logwork gần nhất để lặp lại.');
    return;
  }
  $('key').value = state.lastLog.key;
  $('project').value = state.lastLog.project || String(state.lastLog.key).split('-')[0] || '';
  $('timeSpent').value = state.lastLog.timeSpent || state.prefs.lastTimeSpent || '';
  $('date').value = todayLocal();
  $('description').value = state.lastLog.description || state.lastLog.summary || '';
  state.currentIssueSummary = state.lastLog.summary || '';
  state.lastAutoIssueKey = state.lastLog.key;
  setIssueLookupState(state.lastLog.summary ? `Summary: ${state.lastLog.summary}` : 'Đã nạp logwork gần nhất.', 'ok');
  $('worklogCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => $('timeSpent').focus(), 250);
  showToast(`Đã nạp lại ${state.lastLog.key} cho ngày hôm nay.`);
}

function hydrateQuickInputs() {
  if (!$('date').value) $('date').value = todayLocal();
  if (!$('bulkDate').value) $('bulkDate').value = $('date').value || todayLocal();
  if (!$('timeSpent').value && state.prefs.lastTimeSpent) $('timeSpent').value = state.prefs.lastTimeSpent;
  if (!$('project').value && state.prefs.lastProject) $('project').value = state.prefs.lastProject;
  $('repeatLastBtn').classList.toggle('hidden', !state.lastLog?.key);
  renderRecentIssues();
  renderTemplates();
  renderAuditHistory();
}

function openSettings() {
  const overlay = $('settingsOverlay');
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('settings-open');
  $('auditDate').value = $('date').value || todayLocal();
  $('auditKey').value = $('key').value.trim().toUpperCase();
  renderTemplates();
  renderAuditHistory();
}

function closeSettings() {
  const overlay = $('settingsOverlay');
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('settings-open');
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
    const data = await api(`/api/day-audit?date=${encodeURIComponent(date)}${key ? `&key=${encodeURIComponent(key)}` : ''}`, { method: 'GET', cache: 'no-store' });
    const sourceBits = [];
    if (data.sources?.authorDay?.ok) sourceBits.push(`JQL user: ${data.sources.authorDay.issues}`);
    if (data.sources?.anyDay?.ok) sourceBits.push(`JQL ngày: ${data.sources.anyDay.issues}`);
    if (data.sources?.recentIssues?.ok) sourceBits.push(`Recent: ${data.sources.recentIssues.issues}`);
    if (data.sources?.worklogDelta?.supported) sourceBits.push(`Delta: ${data.sources.worklogDelta.worklogs}`);
    out.innerHTML = `<div class="audit-summary"><strong>${escapeHtml(date)}</strong><span>Quét ${data.checkedIssues} issue · ${data.checkedWorklogs} worklog</span></div>
      <div class="planner-kpis"><div><small>Đã bận</small><strong>${minutesLabel(data.occupiedMinutes || 0)}</strong></div><div><small>Còn trống</small><strong>${minutesLabel(data.freeMinutes || 0)}</strong></div></div>
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

function renderBulkSelection() {
  const bar = $('bulkSelectionBar');
  const count = state.bulkSelectedKeys.size;
  $('bulkSelectedCount').textContent = `${count} issue`;
  bar.classList.toggle('hidden', !state.bulkMode);
  $('openBulkBtn').disabled = count === 0;
  $('bulkModeBtn').textContent = state.bulkMode ? 'Thoát chọn' : 'Chọn nhiều';
  $('bulkModeBtn').classList.toggle('active', state.bulkMode);
}

function setBulkMode(enabled) {
  state.bulkMode = Boolean(enabled);
  if (!state.bulkMode) {
    state.bulkSelectedKeys.clear();
    state.bulkDrafts.clear();
    $('bulkCard').classList.add('hidden');
  }
  renderBulkSelection();
  renderFilterIssues();
}

function bulkDraftList() {
  return [...state.bulkSelectedKeys].map(key => state.bulkDrafts.get(key)).filter(Boolean);
}

function updateBulkTotal() {
  const total = bulkDraftList().reduce((sum, item) => sum + parseTimeSpentClient(item.timeSpent), 0);
  $('bulkTotal').textContent = minutesLabel(total);
  $('bulkLogBtn').disabled = !bulkDraftList().length || total <= 0;
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
        <button class="bulk-remove" type="button" aria-label="Bỏ ${escapeHtml(item.key)}">×</button>
      </div>
      <div class="bulk-item-fields">
        <label>TimeSpent<input class="bulk-time" value="${escapeHtml(item.timeSpent || '1h')}" placeholder="1h" inputmode="text" required /></label>
        <label>Description<textarea class="bulk-description" rows="2" required>${escapeHtml(item.description || item.summary || '')}</textarea></label>
      </div>
    </div>
  `).join('');

  wrap.querySelectorAll('.bulk-item').forEach(row => {
    const key = row.dataset.key || '';
    const draft = state.bulkDrafts.get(key);
    row.querySelector('.bulk-time').addEventListener('input', event => {
      if (draft) draft.timeSpent = event.target.value;
      updateBulkTotal();
    });
    row.querySelector('.bulk-description').addEventListener('input', event => {
      if (draft) draft.description = event.target.value;
    });
    row.querySelector('.bulk-remove').addEventListener('click', () => {
      state.bulkSelectedKeys.delete(key);
      state.bulkDrafts.delete(key);
      renderBulkItems();
      renderBulkSelection();
      renderFilterIssues();
      if (!state.bulkSelectedKeys.size) $('bulkCard').classList.add('hidden');
    });
  });
  updateBulkTotal();
}

function openBulkEditor() {
  if (!state.bulkSelectedKeys.size) {
    showToast('Hãy chọn ít nhất một issue.');
    return;
  }
  if (!$('bulkDate').value) $('bulkDate').value = $('date').value || todayLocal();
  renderBulkItems();
  $('bulkCard').classList.remove('hidden');
  $('bulkCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderBulkSuccess(data) {
  const result = $('resultCard');
  result.className = 'result ok';
  result.innerHTML = `
    <h3>✓ Bulk Logwork thành công</h3>
    <div class="meta">${escapeHtml(data.date)} · ${data.items.length} issue · Tổng ${minutesLabel(data.totalMinutes)}</div>
    ${data.items.map(item => `
      <div class="bulk-result-item">
        <div class="bulk-result-head"><strong>${escapeHtml(item.key)}</strong><span>${minutesLabel(item.minutes)}</span></div>
        ${item.segments.map(segment => `<div class="segment"><span>${escapeHtml(segment.start)} → ${escapeHtml(segment.end)}</span><span>${minutesLabel(segment.minutes)}</span></div>`).join('')}
      </div>
    `).join('')}
  `;
  result.classList.remove('hidden');
}

async function submitBulkWorklog(event) {
  event.preventDefault();
  const items = bulkDraftList().map(item => ({
    key: item.key,
    project: item.project,
    timeSpent: String(item.timeSpent || '').trim(),
    description: String(item.description || item.summary || '').trim()
  }));
  if (!items.length) return showToast('Chưa có issue để Bulk Logwork.');
  if (items.some(item => !item.timeSpent || !item.description)) return showToast('Vui lòng nhập đủ TimeSpent và Description cho từng issue.');

  const btn = $('bulkLogBtn');
  btn.disabled = true;
  btn.textContent = 'ĐANG LOG BULK...';
  $('resultCard').classList.add('hidden');
  try {
    const date = $('bulkDate').value;
    const data = await api('/api/bulk-worklog', {
      method: 'POST',
      body: JSON.stringify({ date, items })
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
    state.bulkSelectedKeys.clear();
    state.bulkDrafts.clear();
    state.bulkMode = false;
    $('bulkCard').classList.add('hidden');
    renderBulkSelection();
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
    btn.disabled = false;
    btn.textContent = 'LOG BULK';
  }
}

$('loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const btn = $('loginBtn');
  btn.disabled = true;
  btn.textContent = 'ĐANG ĐĂNG NHẬP...';
  try {
    const data = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username: $('username').value.trim(), password: $('password').value })
    });
    $('password').value = '';
    setLoggedIn(data.user);
    showToast('Đăng nhập Jira thành công. Đang tải danh sách filter...');
  } catch (error) {
    showToast(error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'ĐĂNG NHẬP';
  }
});

$('logoutBtn').addEventListener('click', async () => {
  try { await api('/api/logout', { method: 'POST', body: '{}' }); } catch {}
  setLoggedOut();
});

$('refreshFilterBtn').addEventListener('click', () => loadFilterIssues());
$('refreshFilterListBtn').addEventListener('click', () => loadFilters());
$('filterSelect').addEventListener('change', () => {
  state.selectedFilterId = $('filterSelect').value || '';
  state.prefs.selectedFilterId = state.selectedFilterId;
  savePrefs();
  const active = state.filters.find(filter => filter.id === state.selectedFilterId);
  $('filterName').textContent = active?.name || 'Jira Filter';
  state.filterIssues = [];
  state.filterLoaded = false;
  state.bulkSelectedKeys.clear();
  state.bulkDrafts.clear();
  state.bulkMode = false;
  $('bulkCard').classList.add('hidden');
  renderBulkSelection();
  renderFilterIssues();
  loadFilterIssues();
});
$('filterIssueSearch').addEventListener('input', renderFilterIssues);
$('bulkModeBtn').addEventListener('click', () => setBulkMode(!state.bulkMode));
$('selectVisibleBtn').addEventListener('click', () => {
  const visible = filteredIssues();
  for (const issue of visible) {
    if (state.bulkSelectedKeys.size >= 20) break;
    if (!state.bulkSelectedKeys.has(issue.key)) {
      state.bulkSelectedKeys.add(issue.key);
      state.bulkDrafts.set(issue.key, {
        key: issue.key,
        project: issue.project || issue.key.split('-')[0] || '',
        summary: issue.summary || '',
        timeSpent: state.prefs.lastTimeSpent || '1h',
        description: issue.summary || ''
      });
    }
  }
  renderFilterIssues();
  renderBulkSelection();
  showToast(`Đã chọn ${state.bulkSelectedKeys.size} issue.`);
});
$('openBulkBtn').addEventListener('click', openBulkEditor);
$('cancelBulkBtn').addEventListener('click', () => setBulkMode(false));
$('bulkForm').addEventListener('submit', submitBulkWorklog);

$('key').addEventListener('input', () => {
  clearTimeout(state.issueLookupTimer);
  const key = $('key').value.trim().toUpperCase();
  if (!validIssueKey(key)) {
    ++state.issueLookupSeq;
    state.currentIssueSummary = '';
    setIssueLookupState('');
    return;
  }
  state.issueLookupTimer = setTimeout(() => loadIssueByKey(key).catch(() => {}), 450);
});

$('key').addEventListener('blur', () => {
  const key = $('key').value.trim().toUpperCase();
  if (validIssueKey(key) && key !== state.lastAutoIssueKey) loadIssueByKey(key).catch(() => {});
});

$('project').addEventListener('change', () => {
  const project = $('project').value.trim().toUpperCase();
  if (project) {
    state.prefs.lastProject = project;
    savePrefs();
  }
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
    $('date').focus();
  });
});

$('repeatLastBtn').addEventListener('click', applyLastLog);
$('applyTemplateBtn').addEventListener('click', () => applyTemplateById($('templateSelect').value));
$('templateSelect').addEventListener('change', () => {
  if ($('templateSelect').value) applyTemplateById($('templateSelect').value);
});

$('saveCurrentTemplateBtn').addEventListener('click', () => {
  const content = $('description').value.trim();
  if (!content) {
    showToast('Description đang trống, chưa thể lưu mẫu.');
    return;
  }
  $('templateContent').value = content;
  $('templateManager').open = true;
  $('templateName').focus();
});

$('saveTemplateBtn').addEventListener('click', () => {
  if (saveTemplate($('templateName').value, $('templateContent').value)) {
    $('templateName').value = '';
    $('templateContent').value = '';
    showToast('Đã lưu mẫu Description.');
  }
});


$('settingsBtn').addEventListener('click', openSettings);
$('closeSettingsBtn').addEventListener('click', closeSettings);
document.querySelectorAll('[data-close-settings]').forEach(el => el.addEventListener('click', closeSettings));
$('runAuditBtn').addEventListener('click', runDayAudit);
$('clearAuditHistoryBtn').addEventListener('click', () => {
  if (!state.auditHistory.length) return;
  if (!confirm('Xóa toàn bộ lịch sử thao tác trên thiết bị này?')) return;
  state.auditHistory = [];
  writeStorage(STORAGE.audit, state.auditHistory);
  renderAuditHistory();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('settingsOverlay').classList.contains('hidden')) closeSettings();
});

$('worklogForm').addEventListener('submit', async event => {
  event.preventDefault();
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
      description: $('description').value.trim()
    };
    const data = await api('/api/worklog', { method: 'POST', body: JSON.stringify(payload) });

    state.prefs.lastProject = payload.project;
    state.prefs.lastTimeSpent = payload.timeSpent;
    savePrefs();
    addRecentIssue({ key: data.issue.key, project: payload.project, summary: data.issue.summary || state.currentIssueSummary });
    setLastLog(payload, data.issue.summary || state.currentIssueSummary);

    const result = $('resultCard');
    result.className = 'result ok';
    result.innerHTML = `
      <h3>✓ Logwork thành công</h3>
      <div class="meta"><strong>${escapeHtml(data.issue.key)}</strong>${data.issue.summary ? ` · ${escapeHtml(data.issue.summary)}` : ''}<br>${escapeHtml(data.date)} · Tổng ${minutesLabel(data.totalMinutes)}</div>
      ${data.segments.map(s => `<div class="segment"><span>${escapeHtml(s.start)} → ${escapeHtml(s.end)}</span><span>${minutesLabel(s.minutes)}</span></div>`).join('')}
      <button id="resultRepeatBtn" class="secondary result-action" type="button">↻ Lặp lại KEY này</button>
    `;
    result.classList.remove('hidden');
    $('resultRepeatBtn').addEventListener('click', applyLastLog);
    addAuditEntry({ ok: true, key: data.issue.key, message: `${data.date} · ${minutesLabel(data.totalMinutes)}`, segments: data.segments });
    showToast('Đã log work lên Jira.');
    $('key').select();
    setTimeout(() => loadFilterIssues({ quiet: true }), 1200);
  } catch (error) {
    const result = $('resultCard');
    result.className = 'result error';
    result.innerHTML = `<h3>Logwork chưa thành công</h3><div class="meta">${escapeHtml(error.message)}</div>`;
    result.classList.remove('hidden');
    addAuditEntry({ ok: false, key: $('key').value.trim().toUpperCase(), message: error.message });
    showToast(error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'LOG WORK';
  }
});

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
}

loadQuickData();
$('date').value = todayLocal();
$('bulkDate').value = todayLocal();
hydrateQuickInputs();
renderBulkSelection();
['gesturestart', 'gesturechange', 'gestureend'].forEach(name => {
  document.addEventListener(name, event => event.preventDefault(), { passive: false });
});
checkStatus();
