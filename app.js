'use strict';

const $ = id => document.getElementById(id);
const state = {
  user: null,
  toastTimer: null,
  filterIssues: [],
  filterLoaded: false,
  filterLoading: false
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

function setLoggedIn(user) {
  state.user = user;
  $('loginCard').classList.add('hidden');
  $('filterCard').classList.remove('hidden');
  $('worklogCard').classList.remove('hidden');
  $('statusCard').classList.remove('hidden');
  $('userLabel').textContent = user?.displayName || user?.username || '';
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
    <button class="issue-row" type="button" data-key="${escapeHtml(issue.key)}" data-project="${escapeHtml(issue.project)}">
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
      $('key').value = button.dataset.key || '';
      $('project').value = button.dataset.project || String(button.dataset.key || '').split('-')[0] || '';
      $('worklogCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => $('timeSpent').focus(), 350);
      showToast(`Đã chọn ${button.dataset.key}.`);
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
    const result = $('resultCard');
    result.className = 'result ok';
    result.innerHTML = `
      <h3>✓ Logwork thành công</h3>
      <div class="meta"><strong>${escapeHtml(data.issue.key)}</strong>${data.issue.summary ? ` · ${escapeHtml(data.issue.summary)}` : ''}<br>${escapeHtml(data.date)} · Tổng ${minutesLabel(data.totalMinutes)}</div>
      ${data.segments.map(s => `<div class="segment"><span>${escapeHtml(s.start)} → ${escapeHtml(s.end)}</span><span>${minutesLabel(s.minutes)}</span></div>`).join('')}
    `;
    result.classList.remove('hidden');
    showToast('Đã log work lên Jira.');
    $('key').select();
    // Filter No Work Logged có thể thay đổi sau khi Jira re-index worklog.
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

$('date').value = todayLocal();
checkStatus();
