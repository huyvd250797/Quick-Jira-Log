'use strict';
// WorklogPRO's native Server/DC form. Tokens/cookies never leave this server module.
const { JIRA_BASE_URL } = require('./config');
const { JiraError } = require('./jira');
const ACTION = '/secure/WPCreateWorklogOnIssueWithWorkLogAction.jspa';
const fail = (message, status = 502, code = 'WORKLOGPRO_FORM_FAILED', details = {}) => new JiraError(message, status, { provider: 'worklogpro', ...details }, code);
const decode = text => String(text || '').replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (all, entity) => {
  const names = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
  const n = entity[0] === '#' ? parseInt(entity.slice(entity[1].toLowerCase() === 'x' ? 2 : 1), entity[1].toLowerCase() === 'x' ? 16 : 10) : null;
  return n === null ? names[entity.toLowerCase()] : n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : all;
});
function attrs(tag) {
  const out = {};
  for (const m of tag.replace(/^<\/?[\w:-]+/, '').matchAll(/([^\s=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  return out;
}
function parseForm(html, { worklogId, key, attribute }) {
  const clean = String(html).replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const forms = [...clean.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/gi)].filter(m => attrs(m[0].match(/^<form\b[^>]*>/i)[0]).id === 'log-work-lean');
  if (forms.length !== 1) throw fail('Không đọc được form sửa WorklogPRO. Hãy đăng nhập lại hoặc kiểm tra phiên bản plugin.', 502, 'WORKLOGPRO_FORM_UNAVAILABLE', { stage: 'readWorklogForm' });
  const form = forms[0][0], formAttrs = attrs(form.match(/^<form\b[^>]*>/i)[0]);
  const action = new URL(formAttrs.action || '', JIRA_BASE_URL + ACTION);
  if (action.origin !== new URL(JIRA_BASE_URL).origin || action.pathname !== ACTION || formAttrs.method?.toLowerCase() !== 'post') throw fail('Đường lưu form WorklogPRO không hợp lệ. Chưa thay đổi worklog.');
  const fields = new URLSearchParams();
  // Keep successful controls, including unrelated/multi-value plugin attributes.
  for (const match of form.matchAll(/<input\b(?:"[^"]*"|'[^']*'|[^'">])*>|<textarea\b[^>]*>[\s\S]*?<\/textarea>|<select\b[^>]*>[\s\S]*?<\/select>/gi)) {
    const raw = match[0], a = attrs(raw.match(/^<[^>]*>/)[0]);
    if (!a.name || Object.hasOwn(a, 'disabled')) continue;
    const type = (a.type || 'text').toLowerCase();
    if (['submit', 'button', 'reset', 'image'].includes(type)) continue;
    if (['file', 'password'].includes(type)) throw fail('Form WorklogPRO có trường chưa được hỗ trợ. Chưa thay đổi worklog.');
    if (['checkbox', 'radio'].includes(type) && !Object.hasOwn(a, 'checked')) continue;
    if (/^<textarea/i.test(raw)) fields.append(a.name, decode(raw.replace(/^<textarea\b[^>]*>/i, '').replace(/<\/textarea>$/i, '')));
    else if (/^<select/i.test(raw)) {
      const options = [...raw.matchAll(/<option\b[^>]*>[\s\S]*?<\/option>/gi)].map(o => ({ a: attrs(o[0].match(/^<[^>]*>/)[0]), text: decode(o[0].replace(/<[^>]*>/g, '')) }));
      let selected = options.filter(o => Object.hasOwn(o.a, 'selected'));
      if (!selected.length && !Object.hasOwn(a, 'multiple')) selected = options.slice(0, 1);
      selected.filter(o => !Object.hasOwn(o.a, 'disabled')).forEach(o => fields.append(a.name, o.a.value ?? o.text));
    } else fields.append(a.name, a.value ?? (['checkbox', 'radio'].includes(type) ? 'on' : ''));
  }
  if (fields.get('worklogId') !== String(worklogId) || fields.get('issueKey') !== key) throw fail('Form Jira trả về không đúng worklog/issue. Chưa thay đổi dữ liệu.', 409);
  const ot = [...form.matchAll(/<input\b[^>]*>/gi)].map(m => attrs(m[0])).filter(a => a.name === `wa_${attribute.id}` && a.type === 'checkbox' && !Object.hasOwn(a, 'disabled'));
  if (ot.length !== 1) throw fail('Không tìm thấy checkbox Overtime có thể sửa trong form Jira.', 409, 'WORKLOGPRO_ATTRIBUTE_UNAVAILABLE');
  if (!action.searchParams.get('atl_token') && !fields.get('atl_token')) throw fail('Form Jira không có token bảo vệ hợp lệ. Chưa thay đổi worklog.', 409);
  for (const required of ['timeLogged', 'startDate', 'comment']) if (!fields.has(required)) throw fail('Form WorklogPRO thiếu trường bắt buộc. Chưa thay đổi worklog.');
  return { action, fields };
}
async function nativeFormUpdate({ key, worklogId, attribute, overtime, started, seconds, description }, auth, onDispatch = () => {}) {
  if (!/^[A-Z][A-Z0-9_]*-\d+$/.test(key || '') || !/^\d+$/.test(String(worklogId))) throw fail('Thiếu issue/worklog hợp lệ để sửa.', 400);
  const date = new Date(started);
  if (!Number.isFinite(date.getTime()) || date.getUTCSeconds() || date.getUTCMilliseconds()) throw fail('Form Jira chỉ hỗ trợ độ chính xác phút. Worklog có giây lẻ cần sửa trực tiếp trên Jira để tránh thay đổi giờ.', 409);
  const jar = new Map(String(auth?.cookie || '').split(';').map(x => x.trim().split(/=(.*)/s).slice(0, 2)).filter(x => x.length === 2));
  async function call(url, method, body) {
    const headers = { Accept: 'text/html,application/json', ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) };
    if (jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    if (auth?.mode === 'basic') headers.Authorization = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`;
    const timer = AbortSignal.timeout(8000);
    let response;
    try { response = await fetch(url, { method, headers, body, signal: timer, redirect: 'manual' }); }
    catch { throw fail('Kết nối form WorklogPRO bị gián đoạn.', 504, 'WORKLOGPRO_FORM_NETWORK', { stage: method === 'POST' ? 'updateOvertime' : 'readWorklogForm', method, endpoint: ACTION }); }
    for (const c of response.headers.getSetCookie?.() || []) { const pair = c.split(';')[0], i = pair.indexOf('='); if (i > 0) jar.set(pair.slice(0, i), pair.slice(i + 1)); }
    const location = response.headers.get('location');
    if (response.status === 401 || (location && /login|auth/i.test(location))) throw fail('Phiên form Jira đã hết hạn. Hãy đăng nhập lại.', 401, 'WORKLOGPRO_FORM_LOGIN_REQUIRED');
    if (!response.ok && !(method === 'POST' && [302, 303].includes(response.status) && location && new URL(location, JIRA_BASE_URL).origin === new URL(JIRA_BASE_URL).origin)) throw fail(`Jira từ chối ${method === 'POST' ? 'lưu' : 'đọc'} form WorklogPRO (HTTP ${response.status}).`, response.status >= 400 ? response.status : 502, 'WORKLOGPRO_FORM_REJECTED', { stage: method === 'POST' ? 'updateOvertime' : 'readWorklogForm', method, endpoint: ACTION, status: response.status });
    return response.text();
  }
  const open = new URL(ACTION, JIRA_BASE_URL);
  open.search = new URLSearchParams({ worklogId: String(worklogId), issueKey: key, inline: 'true', decorator: 'dialog' }).toString();
  const { action, fields } = parseForm(await call(open, 'GET'), { worklogId, key, attribute });
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(x => [x.type, x.value]));
  const value = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
  fields.set('startDate', value);
  // This companion is used by native client-side date validation.
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  fields.set('startDateJS', `${Number(parts.day)}/${months[Number(parts.month)-1]}/${parts.year.slice(-2)} ${Number(parts.hour)%12 || 12}:${parts.minute} ${Number(parts.hour)>=12?'PM':'AM'}`);
  fields.set('timeLogged', `${seconds / 60}m`); fields.set('comment', description); fields.set('adjustEstimate', 'leave');
  fields.set('inline', 'true'); fields.set('decorator', 'dialog');
  if (overtime) fields.set(`wa_${attribute.id}`, 'on'); else fields.delete(`wa_${attribute.id}`);
  onDispatch();
  const html = await call(action, 'POST', fields.toString());
  if (/<(?:div|span|p)\b[^>]*class=["'][^"']*\b(?:error|error-message)\b[^"']*["'][^>]*>\s*[^<\s]/i.test(html)) throw fail('Jira trả về lỗi kiểm tra dữ liệu khi lưu form. Hãy kiểm tra trực tiếp trên Jira.', 400, 'WORKLOGPRO_FORM_VALIDATION', { stage: 'updateOvertime', method: 'POST', endpoint: ACTION });
}
module.exports = { nativeFormUpdate, parseForm };
