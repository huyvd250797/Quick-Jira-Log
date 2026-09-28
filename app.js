'use strict';

const APP_VERSION = '0.3.0';
const STORAGE = {
  prefs: 'quick-jira-log:prefs:v1',
  recent: 'quick-jira-log:recent-issues:v1',
  templates: 'quick-jira-log:templates:v1',
  lastLog: 'quick-jira-log:last-log:v1'
};

const $ = id => document.getElementById(id);
const state = {
  user: null,
  toastTimer: null,
  filterIssues: [],
  filterLoaded: false,
  filterLoading: false,
  issueLookupTimer: null,
  issueLookupSeq: 0,
  lastAutoIssueKey: '',
  currentIssueSummary: '',
  prefs: { lastProject: '', lastTimeSpent: '' },
  recentIssues: [],
  templates: [],
  lastLog: null
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
    lastTimeSpent: typeof prefs?.lastTimeSpent === 'string' ? prefs.lastTimeSpent : ''
  };
  const recent = readStorage(STORAGE.recent, []);
  state.recentIssues = Array.isArray(recent) ? recent.slice(0, 8) : [];
  const templates = readStorage(STORAGE.templates, []);
  state.templates = Array.isArray(templates) ? templates.filter(t => t?.id && t?.name && typeof t?.content === 'string').slice(0, 30) : [];
  const lastLog = readStorage(STORAGE.lastLog, null);
  state.lastLog = lastLog && typeof lastLog === 'object' ? lastLog : null;
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
  if (!state.filterLoaded && !state.filterLoading) loadFilterIssues();
}

function setLoggedOut() {
  state.user = null;
  state.filterIssues = [];
  state.filterLoaded = false;
  state.filterLoading = false;
  $('statusCard').classList.add('hidden');
  $('filterCard').classList.add('hidden');
  $('worklogCard').classList.add('hidden');
  $('loginCard').classList.remove('hidden');
  $('resultCard').classList.add('hidden');
  renderFilterIssues();
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

  list.innerHTML = issues.map(issue => `
    <button class="issue-row" type="button" data-key="${escapeHtml(issue.key)}" data-project="${escapeHtml(issue.project)}" data-summary="${escapeHtml(issue.summary || '')}">
      <div class="issue-main">
        <div class="issue-key-line"><strong>${escapeHtml(issue.key)}</strong>${issue.status ? `<span class="status-pill">${escapeHtml(issue.status)}</span>` : ''}</div>
        <div class="issue-summary">${escapeHtml(issue.summary || 'Không có summary')}</div>
        <div class="issue-meta">${escapeHtml([issue.project, issue.issueType, issue.priority].filter(Boolean).join(' · '))}</div>
      </div>
      <span class="issue-pick">Chọn</span>
    </button>
  `).join('');
  setFilterUi('list');

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
    const data = await api('/api/filter-issues', { method: 'GET', cache: 'no-store' });
    state.filterIssues = Array.isArray(data.issues) ? data.issues : [];
    state.filterLoaded = true;
    $('filterName').textContent = data.filter?.name || '[HuyVo] - No Work Logged';
    renderFilterIssues();
    if (data.truncated) showToast(`Filter có ${data.total} issue, app đang hiển thị 500 issue đầu.`);
  } catch (error) {
    state.filterLoaded = false;
    state.filterIssues = [];
    $('filterCount').textContent = '0';
    const closeNames = Array.isArray(error.details?.closeNames) && error.details.closeNames.length
      ? ` Filter gần giống: ${error.details.closeNames.join(', ')}.`
      : '';
    setFilterUi('error', `${error.message}${closeNames}`);
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
  if (!$('timeSpent').value && state.prefs.lastTimeSpent) $('timeSpent').value = state.prefs.lastTimeSpent;
  if (!$('project').value && state.prefs.lastProject) $('project').value = state.prefs.lastProject;
  $('repeatLastBtn').classList.toggle('hidden', !state.lastLog?.key);
  renderRecentIssues();
  renderTemplates();
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
    showToast('Đăng nhập Jira thành công. Đang tải filter...');
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
$('filterIssueSearch').addEventListener('input', renderFilterIssues);

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
    showToast('Đã log work lên Jira.');
    $('key').select();
    setTimeout(() => loadFilterIssues({ quiet: true }), 1200);
  } catch (error) {
    const result = $('resultCard');
    result.className = 'result error';
    result.innerHTML = `<h3>Logwork chưa thành công</h3><div class="meta">${escapeHtml(error.message)}</div>`;
    result.classList.remove('hidden');
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
hydrateQuickInputs();
checkStatus();
