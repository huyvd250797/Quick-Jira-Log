'use strict';

const $ = id => document.getElementById(id);
const state = { user: null, toastTimer: null };

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
  $('worklogCard').classList.remove('hidden');
  $('statusCard').classList.remove('hidden');
  $('userLabel').textContent = user?.displayName || user?.username || '';
}

function setLoggedOut() {
  state.user = null;
  $('statusCard').classList.add('hidden');
  $('worklogCard').classList.add('hidden');
  $('loginCard').classList.remove('hidden');
  $('resultCard').classList.add('hidden');
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
  if (!response.ok || !data?.ok) throw new Error(data?.error || 'Có lỗi xảy ra.');
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
    showToast('Đăng nhập Jira thành công.');
    $('key').focus();
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
