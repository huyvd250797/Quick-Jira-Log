'use strict';

// WorklogPRO Server/DC API. Overtime is a worklog BOOL attribute, never an issue field.
// Contract: https://thestarware.atlassian.net/wiki/spaces/WLP/pages/24477792
const { jiraFetch, JiraError } = require('./jira');
const { mapWithConcurrency } = require('./async');
const BASE = '/rest/com.deniz.jira.worklog/1.0';
const normalized = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const positiveId = value => /^\d+$/.test(String(value)) && Number(value) > 0 && Number.isSafeInteger(Number(value));

function integrationError(message, status = 502, code = 'WORKLOGPRO_ERROR', details = {}) {
  return new JiraError(message, status, details, code);
}
async function request(path, auth, options = {}) {
  const { response, data } = await jiraFetch(`${BASE}${path}`, { timeoutMs: 3500, ...options }, auth);
  if (!response.ok) {
    const message = response.status === 401 ? 'Phiên Jira đã hết hạn.'
      : response.status === 403 ? 'Jira/WorklogPRO không cho phép đọc hoặc sửa worklog này. Hãy kiểm tra quyền và kỳ chấm công.'
      : response.status === 404 ? 'Không truy cập được API WorklogPRO hoặc worklog không còn tồn tại. Chưa xác nhận được Overtime trên Jira.'
      : 'WorklogPRO từ chối yêu cầu. Hãy kiểm tra lại trên Jira.';
    throw integrationError(message, response.status >= 400 ? response.status : 502, 'WORKLOGPRO_REQUEST_FAILED', { provider: 'worklogpro', status: response.status });
  }
  return data;
}

async function getOvertimeAttribute(auth, options = {}) {
  const data = await request('/attr', auth, options);
  if (!Array.isArray(data)) throw integrationError('API WorklogPRO trả về danh sách thuộc tính không hợp lệ.');
  const configured = String(process.env.WORKLOGPRO_OVERTIME_ATTRIBUTE_ID || '').trim();
  if (configured && !positiveId(configured)) throw integrationError('WORKLOGPRO_OVERTIME_ATTRIBUTE_ID phải là ID số hợp lệ.', 500);
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
  const data = await request(`/worklog/${encodeURIComponent(worklogId)}`, auth, options);
  if (String(data?.id) !== String(worklogId)) throw integrationError('WorklogPRO trả về sai Worklog ID.');
  attributesOf(data);
  return data;
}

async function updateNativeWorklog({ worklogId, current, attribute, overtime, started, seconds, description }, auth) {
  const authorUserKey = String(current.authorUserKey || '');
  if (!authorUserKey) throw integrationError('WorklogPRO không trả về tác giả worklog; chưa thực hiện thay đổi.');
  const workLogAttributes = attributesOf(current).filter(a => a.attrTypeId !== attribute.id);
  workLogAttributes.push({ attrTypeId: attribute.id, attrValue: overtime ? 'yes' : 'no' });
  // One plugin PUT updates time, comment and all attributes together. Never retry a write.
  let accepted = false;
  try {
    await request(`/worklog/${encodeURIComponent(worklogId)}`, auth, { method: 'PUT', timeoutMs: 8000, body: {
      workStart: started, timeSpent: seconds, authorUserKey, comment: description,
      adjustEstimate: 'leave', workLogAttributes
    } });
    accepted = true;
    const verified = await getWorklog(worklogId, auth);
    const when = typeof verified.workStart === 'number' ? verified.workStart : Date.parse(verified.workStart);
    const sameAttributes = workLogAttributes.filter(a => a.attrTypeId !== attribute.id).every(expected => attributesOf(verified).some(actual => actual.attrTypeId === expected.attrTypeId && String(actual.attrValue ?? '') === String(expected.attrValue ?? '')));
    if (overtimeOf(verified, attribute) !== overtime || when !== Date.parse(started) ||
        Number(verified.timeSpent) !== seconds || verified.comment !== description || verified.authorUserKey !== authorUserKey || !sameAttributes) {
      throw integrationError('Dữ liệu đọc lại từ Jira chưa khớp yêu cầu. Hãy tải lại lịch/Jira để kiểm tra trước khi lưu lại.', 502, 'WORKLOGPRO_VERIFY_FAILED');
    }
    return verified;
  } catch (error) {
    // A rejected 4xx did not succeed. A timeout/5xx/read-back error may follow a committed PUT.
    if (accepted || !(error?.status >= 400 && error?.status < 500)) {
      throw integrationError('Chưa xác nhận được kết quả lưu trên Jira. Worklog có thể đã thay đổi; hãy tải lại lịch/Jira để kiểm tra trước khi lưu lại.', error.status || 502, 'WORKLOGPRO_RESULT_UNKNOWN', { resultUnknown: true, provider: 'worklogpro' });
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
