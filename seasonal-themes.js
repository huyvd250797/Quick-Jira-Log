'use strict';

window.QuickJiraSeasonalThemes = (() => {
  const calendar = window.QuickJiraSeasonal;
  const art = window.QuickJiraSeasonalScenes;
  const byId = id => document.getElementById(id);
  const root = document.documentElement;
  const dialog = byId('seasonalDialog');
  const form = byId('seasonalForm');
  const picker = byId('seasonalTheme');
  const preview = byId('seasonalPreview');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const formatDay = value => value.split('-').reverse().join('/');
  const monthDay = value => /^\d{2}\/\d{2}$/.test(value) ? value.split('/').reverse().join('-') : '';
  let key = '';
  let name = '';
  let saved = calendar.normalize();
  let draft = null;
  let editedVersion = '';
  let editing = '';
  let displayed = '';
  let midnightTimer;

  function readPreferences() {
    try { return calendar.normalize(JSON.parse(localStorage.getItem(key))); }
    catch { return calendar.normalize(); }
  }

  function syncThemeColor() {
    const color = root.dataset.seasonal
      ? getComputedStyle(root).getPropertyValue('--season-bg').trim()
      : root.dataset.theme === 'dark' ? '#07111f' : '#0f63e6';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  }

  function renderHome() {
    const id = key ? calendar.activeTheme(saved, calendar.today()) : '';
    const rule = saved.rules[id];
    const stamp = id ? `${id}:${rule.effect}` : '';
    if (stamp !== displayed) {
      displayed = stamp;
      if (id) root.dataset.seasonal = id;
      else delete root.dataset.seasonal;
      byId('seasonalHomeScene').innerHTML = id ? art.scene(id, rule.effect) : '';
      byId('seasonalTaskArt').innerHTML = id ? art.corner(id) : '';
      syncThemeColor();
    }
    root.toggleAttribute('data-seasonal-motion', !!rule?.motion && saved.motion && !reduced.matches && !document.hidden);
  }

  function refreshSchedule() {
    clearTimeout(midnightTimer);
    renderHome();
    if (key && !document.hidden) midnightTimer = setTimeout(refreshSchedule, calendar.untilMidnight() + 30);
    if (dialog.open) renderStatus();
  }

  function setAccount(user) {
    const next = calendar.accountKey(user);
    if (next === key) return;
    if (dialog.open) dialog.close();
    key = next;
    name = user?.displayName || user?.username || user?.name || '';
    saved = readPreferences();
    refreshSchedule();
  }

  function announceError(message = '', focus) {
    const error = byId('seasonalError');
    error.hidden = !message;
    error.textContent = message;
    focus?.focus();
  }

  function renderStatus() {
    const active = calendar.activeTheme(draft || saved, calendar.today());
    byId('seasonalCurrent').textContent = active ? `Áp dụng hôm nay · ${calendar.themes[active].name}` : 'Áp dụng hôm nay · Giao diện mặc định';
  }

  function renderPreview() {
    const rule = draft.rules[editing];
    const stamp = `${editing}:${rule.effect}`;
    if (preview.dataset.scene !== stamp) {
      preview.dataset.scene = stamp;
      preview.dataset.seasonal = editing;
      byId('seasonalPreviewScene').innerHTML = art.scene(editing, rule.effect);
      byId('seasonalPreviewTitle').textContent = calendar.themes[editing].name;
    }
    preview.toggleAttribute('data-seasonal-motion', rule.motion && draft.motion && !reduced.matches && !document.hidden);
    byId('seasonalReduced').hidden = !reduced.matches;
  }

  function renderScheduleFields(type) {
    byId('seasonalAnnualFields').hidden = type !== 'annual';
    byId('seasonalOnceFields').hidden = type !== 'once';
    const theme = calendar.themes[editing];
    const hint = byId('seasonalScheduleHint');
    if (type === 'annual') {
      hint.textContent = 'Theo dương lịch. Để áp dụng một ngày, chọn cùng ngày ở cả hai ô.';
    } else if (type === 'once') {
      hint.textContent = 'Theo dương lịch, tính cả ngày bắt đầu và ngày kết thúc.';
    } else {
      const range = calendar.defaultRange(editing, Number(calendar.today().slice(0, 4)));
      const dateLabel = range && (range[0] === range[1] ? formatDay(range[0]) : range.map(formatDay).join(' – '));
      hint.textContent = [theme.label, dateLabel].filter(Boolean).join(' · ') ||
        (editing === 'birthday' ? 'Chưa đặt lịch sinh nhật cho tài khoản này.' : 'Chưa đặt lịch nghỉ mát.');
    }
  }

  function renderPriority() {
    const index = draft.order.indexOf(editing);
    byId('seasonalPriority').textContent = `Ưu tiên khi trùng lịch · ${index + 1}/${draft.order.length}`;
    byId('seasonalUp').disabled = index === 0;
    byId('seasonalDown').disabled = index === draft.order.length - 1;
  }

  function renderRule() {
    const rule = draft.rules[editing];
    const schedule = rule.schedule;
    picker.value = editing;
    byId('seasonalEnabled').checked = rule.enabled;
    byId('seasonalRuleMotion').checked = rule.motion;
    const effect = byId('seasonalEffect');
    effect.replaceChildren(...calendar.themes[editing].effects.map((label, index) => new Option(label, String(index))));
    effect.value = rule.effect;
    byId('seasonalScheduleType').value = schedule ? (schedule.repeat ? 'annual' : 'once') : 'default';
    const annual = (schedule?.repeat ? [schedule.start, schedule.end] : calendar.themes[editing].dates || []).map(formatDay);
    const once = schedule && !schedule.repeat ? [schedule.start, schedule.end] : [];
    byId('seasonalAnnualStart').value = annual[0] || '';
    byId('seasonalAnnualEnd').value = annual[1] || '';
    byId('seasonalOnceStart').value = once[0] || '';
    byId('seasonalOnceEnd').value = once[1] || '';
    renderScheduleFields(byId('seasonalScheduleType').value);
    renderPriority();
    renderPreview();
    renderStatus();
  }

  function commitSchedule(silent = false) {
    const type = byId('seasonalScheduleType').value;
    if (type === 'default') {
      draft.rules[editing].schedule = null;
      return true;
    }
    const repeat = type === 'annual';
    const start = byId(repeat ? 'seasonalAnnualStart' : 'seasonalOnceStart');
    const end = byId(repeat ? 'seasonalAnnualEnd' : 'seasonalOnceEnd');
    const value = { repeat, start: repeat ? monthDay(start.value.trim()) : start.value,
      end: repeat ? monthDay(end.value.trim()) : end.value };
    if (!calendar.validSchedule(value)) {
      if (!silent) announceError(repeat ? 'Nhập hai ngày hợp lệ theo DD/MM.' : 'Nhập hai ngày hợp lệ, ngày kết thúc từ ngày bắt đầu trở đi.', !value.start ? start : end);
      return false;
    }
    draft.rules[editing].schedule = value;
    return true;
  }

  function movePriority(offset) {
    const from = draft.order.indexOf(editing);
    const to = from + offset;
    if (to < 0 || to >= draft.order.length) return;
    [draft.order[from], draft.order[to]] = [draft.order[to], draft.order[from]];
    renderPriority();
    renderStatus();
  }

  picker.replaceChildren(...calendar.ids.map(id => new Option(calendar.themes[id].name, id)));
  byId('seasonalOpenBtn').addEventListener('click', () => {
    if (!key || dialog.open) return;
    saved = readPreferences();
    editedVersion = JSON.stringify(saved);
    draft = calendar.normalize(saved);
    editing = draft.mode === 'manual' ? draft.manual : calendar.activeTheme(draft, calendar.today()) || draft.manual;
    byId('seasonalAccount').textContent = name;
    form.elements.seasonalMode.value = draft.mode;
    byId('seasonalMotion').checked = draft.motion;
    announceError();
    renderRule();
    dialog.showModal();
    dialog.querySelector('.seasonal-settings-scroll').scrollTop = 0;
  });

  byId('seasonalCloseBtn').addEventListener('click', () => dialog.close());
  byId('seasonalCancel').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { if (!dialog.open) draft = null; });

  picker.addEventListener('change', () => {
    const target = picker.value;
    if (!commitSchedule()) { picker.value = editing; return; }
    editing = target;
    if (draft.mode === 'manual') draft.manual = editing;
    announceError();
    renderRule();
  });

  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'seasonalMode') {
      draft.mode = input.value;
      if (draft.mode === 'manual') draft.manual = editing;
    }
    if (input.id === 'seasonalMotion') draft.motion = input.checked;
    if (input.id === 'seasonalEnabled') draft.rules[editing].enabled = input.checked;
    if (input.id === 'seasonalRuleMotion') draft.rules[editing].motion = input.checked;
    if (input.id === 'seasonalEffect') draft.rules[editing].effect = Number(input.value);
    if (input.id === 'seasonalScheduleType') renderScheduleFields(input.value);
    if (input === picker) return;
    if (input.closest('.seasonal-date-fields') || input.id === 'seasonalScheduleType') {
      if (!commitSchedule(true)) return;
    }
    announceError();
    renderPreview();
    renderStatus();
  });

  byId('seasonalUp').addEventListener('click', () => movePriority(-1));
  byId('seasonalDown').addEventListener('click', () => movePriority(1));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!key || !commitSchedule()) return;
    if (JSON.stringify(readPreferences()) !== editedVersion) {
      announceError('Cấu hình đã đổi ở tab khác. Đóng và mở lại để chỉnh theo bản mới nhất.');
      return;
    }
    try { localStorage.setItem(key, JSON.stringify(draft)); }
    catch { announceError('Trình duyệt không thể lưu cấu hình trên thiết bị này.'); return; }
    saved = calendar.normalize(draft);
    dialog.close();
    refreshSchedule();
  });

  function refreshMotionAndSchedule() {
    refreshSchedule();
    if (dialog.open && draft) renderPreview();
  }
  document.addEventListener('visibilitychange', refreshMotionAndSchedule);
  window.addEventListener('focus', refreshMotionAndSchedule);
  window.addEventListener('pageshow', refreshMotionAndSchedule);
  reduced.addEventListener('change', refreshMotionAndSchedule);
  window.addEventListener('storage', event => {
    if (key && (event.key === key || event.key === null)) {
      saved = readPreferences();
      refreshSchedule();
    }
  });

  return { setAccount, syncThemeColor };
})();
