'use strict';

// WorklogPRO Server/DC API. Overtime is a worklog BOOL attribute, never an issue field.
// Contract: https://thestarware.atlassian.net/wiki/spaces/WLP/pages/24477792
const { jiraFetch, JiraError } = require('./jira');
const { mapWithConcurrency } = require('./async');
const { nativeFormUpdate } = require('./worklogpro-form');
const { diagnostics } = require('./jira-diagnostics');
const BASE = '/rest/com.deniz.jira.worklog/1.0';
const normalized = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const positiveId = value => /^\d+$/.test(String(value)) && Number(value) > 0 && Number.isSafeInteger(Number(value));

function integrationError(message, status = 502, code = 'WORKLOGPRO_ERROR', details = {}) {
  return new JiraError(message, status, details, code);
}
async function request(path, auth, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const { stage = path === '/attr' ? 'readOvertimeAttribute' : method === 'PUT' ? 'updateOvertime' : 'readOvertime', ...fetchOptions } = options;
  const endpoint = `${BASE}${path}`;
  const pluginAuth = auth?.mode === 'session' && auth.worklogproAuth?.username && auth.worklogproAuth?.password
    ? { mode: 'basic', username: auth.worklogproAuth.username, password: auth.worklogproAuth.password } : auth;
  const headers = { ...(method === 'PUT' ? { 'X-Atlassian-Token': 'no-check' } : {}), ...fetchOptions.headers };
  let response, data;
  try { ({ response, data } = await jiraFetch(endpoint, { timeoutMs: 3500, ...fetchOptions, headers }, pluginAuth)); }
  catch (error) { throw integrationError(error.message, error.status || 502, error.code, { provider: 'worklogpro', stage, method, endpoint, status: error.status || 502 }); }
  if (!response.ok) {
    const details = diagnostics({ provider: 'worklogpro', stage, method, endpoint, response, data, auth: pluginAuth });
    if (response.status === 403 && pluginAuth?.mode === 'session') details.reauthenticate = true;
    const action = stage === 'readOvertimeAttribute' ? 'đọc danh sách thuộc tính Overtime'
      : stage === 'verifyOvertime' ? 'đọc lại Overtime sau khi lưu' : method === 'PUT' ? 'cập nhật Overtime' : 'đọc Overtime của worklog';
    const message = response.status === 401 ? 'Phiên Jira đã hết hạn.'
      : response.status === 403 ? `WorklogPRO từ chối ${action} (HTTP 403).${details.reauthenticate ? ' Hãy đăng xuất và đăng nhập lại để cập nhật xác thực WorklogPRO.' : ''}${details.jiraMessage ? ` Jira báo: ${details.jiraMessage}` : ''}`
      : response.status === 404 ? 'Không truy cập được API WorklogPRO hoặc worklog không còn tồn tại. Chưa xác nhận được Overtime trên Jira.'
      : 'WorklogPRO từ chối yêu cầu. Hãy kiểm tra lại trên Jira.';
    throw integrationError(message, response.status >= 400 ? response.status : 502, details.reauthenticate ? 'WORKLOGPRO_REAUTH_REQUIRED' : 'WORKLOGPRO_REQUEST_FAILED', details);
  }
  return data;
}

async function getOvertimeAttribute(auth, options = {}) {
  const configured = String(process.env.WORKLOGPRO_OVERTIME_ATTRIBUTE_ID || '').trim();
  if (configured && !positiveId(configured)) throw integrationError('WORKLOGPRO_OVERTIME_ATTRIBUTE_ID phải là ID số hợp lệ.', 500);
  let data;
  try { data = await request('/attr', auth, options); }
  catch (error) {
    // An administrator-provided mapping can be used when only the global list is restricted.
    if (configured && [403, 404].includes(error.status)) return { id: Number(configured), name: 'Over Time?', configured: true };
    throw error;
  }
  if (!Array.isArray(data)) throw integrationError('API WorklogPRO trả về danh sách thuộc tính không hợp lệ.');
  const matches = data.filter(a => configured ? String(a?.id) === configured : normalized(a?.name) === 'overtime');
  if (matches.length !== 1) throw integrationError(matches.length > 1
    ? 'WorklogPRO có nhiều thuộc tính Over Time. Cần cấu hình ID thuộc tính để chọn đúng ô trên Jira.'
    : 'Không tìm thấy thuộc tính Over Time trong WorklogPRO. Chưa thay đổi worklog.', 409, 'WORKLOGPRO_ATTRIBUTE_UNAVAILABLE');
  const attribute = matches[0];
  if (!positiveId(attribute.id) || attribute.enabled === false || String(attribute.type).toUpperCase() !== 'BOOL') {
    throw integrationError('Thuộc tính Over Time của WorklogPRO phải đang bật và có kiểu checkbox (BOOL). Chưa thay đổi worklog.', 409, 'WORKLOGPRO_ATTRIBUTE_UNAVAILABLE');
  }
  return { id: Number(attribute.id), name: String(attribute.name) };
}

function attributesOf(worklog) {
  if (!Array.isArray(worklog?.workLogAttributes)) throw integrationError('WorklogPRO không trả về thuộc tính worklog; chưa thể xác nhận Overtime.');
  const seen = new Set();
  return worklog.workLogAttributes.map(a => {
    if (!positiveId(a?.attrTypeId) || seen.has(String(a.attrTypeId)) || !Object.hasOwn(a, 'attrValue')) throw integrationError('Dữ liệu thuộc tính WorklogPRO không hợp lệ.');
    seen.add(String(a.attrTypeId));
    return { attrTypeId: Number(a.attrTypeId), attrValue: a.attrValue };
  });
}

function overtimeOf(worklog, attribute) {
  const value = attributesOf(worklog).find(a => a.attrTypeId === attribute.id)?.attrValue;
  if (value == null || value === '' || [false, 0, '0', 'no', 'false'].includes(typeof value === 'string' ? value.toLowerCase().trim() : value)) return false;
  if ([true, 1, '1', 'yes', 'true'].includes(typeof value === 'string' ? value.toLowerCase().trim() : value)) return true;
  throw integrationError('Giá trị checkbox Over Time của WorklogPRO không hợp lệ.');
}

async function getWorklog(worklogId, auth, options = {}) {
  if (!positiveId(worklogId)) throw integrationError('Worklog ID không hợp lệ.', 400);
  // Native UI read-back endpoint: response groups worklogs beneath projects/issues.
  const endpoint = `/rest/com.deniz.jira.worklog/latest/worklog?id=${encodeURIComponent(worklogId)}`;
  const readAuth = auth?.mode === 'session' && auth.worklogproAuth ? { mode: 'basic', ...auth.worklogproAuth } : auth;
  const { response, data: report } = await jiraFetch(endpoint, { timeoutMs: options.timeoutMs || 3500 }, readAuth);
  let data;
  if ([404, 405].includes(response.status)) data = await request(`/worklog/${encodeURIComponent(worklogId)}`, auth, options);
  else {
    if (!response.ok) throw integrationError(`Không đọc được worklog WorklogPRO (HTTP ${response.status}).`, response.status,
      'WORKLOGPRO_REQUEST_FAILED', { provider: 'worklogpro', stage: options.stage || 'readOvertime', method: 'GET', endpoint, status: response.status });
    const matches = (report?.projects || []).flatMap(p => (p.issues || []).flatMap(i => (i.workLogs || []).filter(w => String(w.id) === String(worklogId)).map(w => ({ ...w, issueKey: i.key }))));
    if (matches.length !== 1) throw integrationError('WorklogPRO không trả về đúng một worklog cần đọc.', 502);
    data = matches[0];
  }
  if (String(data?.id) !== String(worklogId)) throw integrationError('WorklogPRO trả về sai Worklog ID.');
  attributesOf(data);
  return data;
}

async function updateNativeWorklog({ key, worklogId, current, attribute, overtime, started, seconds, description }, auth) {
  const authorUserKey = String(current.authorUserKey || '');
  if (!authorUserKey) throw integrationError('WorklogPRO không trả về tác giả worklog; chưa thực hiện thay đổi.');
  const workLogAttributes = attributesOf(current).filter(a => a.attrTypeId !== attribute.id);
  workLogAttributes.push({ attrTypeId: attribute.id, attrValue: overtime ? 'yes' : 'no' });
  // Use the native authenticated form, not the REST PUT rejected by this installation.
  if (current.canEdit === false) throw integrationError('Jira không cho phép sửa worklog này.', 403);
  let accepted = false, dispatched = false;
  try {
    await nativeFormUpdate({ key: key || current.issueKey, worklogId, attribute, overtime, started, seconds, description }, auth, () => { dispatched = true; });
    accepted = true;
    const verified = await getWorklog(worklogId, auth, { stage: 'verifyOvertime' });
    const when = typeof verified.workStart === 'number' ? verified.workStart : Date.parse(verified.workStart);
    const sameAttributes = workLogAttributes.filter(a => a.attrTypeId !== attribute.id).every(expected => attributesOf(verified).some(actual => actual.attrTypeId === expected.attrTypeId && String(actual.attrValue ?? '') === String(expected.attrValue ?? '')));
    if (overtimeOf(verified, attribute) !== overtime || when !== Date.parse(started) ||
        Number(verified.timeSpent) !== seconds || verified.comment !== description || verified.authorUserKey !== authorUserKey || !sameAttributes) {
      throw integrationError('Dữ liệu đọc lại từ Jira chưa khớp yêu cầu. Hãy tải lại lịch/Jira để kiểm tra trước khi lưu lại.', 502, 'WORKLOGPRO_VERIFY_FAILED');
    }
    return verified;
  } catch (error) {
    // A rejected 4xx is surfaced without retrying. A timeout/5xx/read-back error may follow a committed POST.
    if (accepted || (dispatched && !(error?.status >= 400 && error?.status < 500))) {
      throw integrationError('Chưa xác nhận được kết quả lưu trên Jira. Worklog có thể đã thay đổi; hãy tải lại lịch/Jira để kiểm tra trước khi lưu lại.', error.status || 502, 'WORKLOGPRO_RESULT_UNKNOWN', { ...error.details, resultUnknown: true, provider: 'worklogpro' });
    }
    throw error;
  }
}

async function enrichHistory(items, auth) {
  if (!items.length) return { unavailable: 0 };
  // Keep a slow plugin from exhausting the serverless request for an entire month.
  // In-flight GETs finish with their own timeout; unscheduled records stay explicitly unknown.
  const deadline = Date.now() + 18000;
  let attribute;
  try { attribute = await getOvertimeAttribute(auth, { timeoutMs: 2000 }); }
  catch (error) {
    if (error.status === 401) throw error;
    for (const item of items) { item.overtime = false; item.overtimeKnown = false; item.overtimeSource = ''; }
    return { unavailable: items.length, error: error.message };
  }
  let unavailable = 0;
  await mapWithConcurrency(items, 6, async item => {
    try {
      if (Date.now() >= deadline) throw integrationError('Chưa đọc kịp Overtime từ WorklogPRO.');
      const worklog = await getWorklog(item.id, auth, { timeoutMs: 2000 });
      item.overtime = overtimeOf(worklog, attribute);
      item.overtimeKnown = true;
      item.overtimeSource = 'worklogpro';
    } catch (error) {
      if (error.status === 401) throw error;
      item.overtime = false; item.overtimeKnown = false; item.overtimeSource = ''; unavailable++;
    }
  });
  return { unavailable };
}

module.exports = { getOvertimeAttribute, getWorklog, overtimeOf, updateNativeWorklog, enrichHistory };
