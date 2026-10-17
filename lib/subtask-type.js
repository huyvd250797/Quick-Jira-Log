'use strict';

// Jira's issue type (Sub-task) and the custom select "Sub-task Type" are distinct.
// Resolve the custom field dynamically; never assume an installation-specific ID.
const { jiraFetch, JiraError } = require('./jira');
const { sessionUserKey } = require('./app-cache');
const cache = new Map();
const pending = new Map();
const TTL = 2 * 60 * 1000;
const validId = value => /^customfield_\d+$/.test(String(value || ''));
const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g, '');

function unavailable(message) { return { ok: false, id: '', name: 'Sub-task Type', message }; }

async function resolveSubtaskTypeField(auth, { force = false } = {}) {
  const configured = String(process.env.JIRA_SUBTASK_TYPE_FIELD_ID || '').trim();
  if (configured) return validId(configured)
    ? { ok: true, id: configured, name: 'Sub-task Type', source: 'configured' }
    : unavailable('Cấu hình trường Sub-task Type không hợp lệ. Hãy kiểm tra cấu hình kết nối.');
  const key = sessionUserKey(auth);
  if (pending.has(key)) return pending.get(key);
  const cached = cache.get(key);
  if (!force && cached && cached.expires > Date.now()) return cached.value;
  const request = (async () => {
    try {
      const { response, data } = await jiraFetch('/rest/api/2/field', { timeoutMs: 5000 }, auth);
      if (response.status === 401) throw new JiraError('Phiên Jira đã hết hạn.', 401);
      if (!response.ok || !Array.isArray(data)) return unavailable('Chưa đọc được danh sách trường Sub-task Type từ Jira. Hãy tải lại hoặc kiểm tra cấu hình kết nối.');
      const matches = data.filter(field => validId(field?.id) && normalize(field.name) === 'subtasktype');
      if (matches.length !== 1) return unavailable(matches.length > 1
        ? 'Jira có nhiều trường tên Sub-task Type. Cần chọn đúng trường trong cấu hình kết nối.'
        : 'Chưa tìm thấy trường Sub-task Type trên Jira. Hãy kiểm tra quyền xem trường hoặc cấu hình kết nối.');
      const value = { ok: true, id: matches[0].id, name: String(matches[0].name), source: 'discovered' };
      if (cache.size >= 100) cache.delete(cache.keys().next().value);
      cache.set(key, { value, expires: Date.now() + TTL });
      return value;
    } catch (error) {
      if (error?.status === 401) throw error;
      return unavailable('Chưa đọc được trường Sub-task Type từ Jira. Hãy thử tải lại.');
    }
  })();
  pending.set(key, request);
  try { return await request; } finally { if (pending.get(key) === request) pending.delete(key); }
}

function readSubtaskType(issue, field) {
  const unknown = { subtaskTypeKnown: false, subtaskType: '', subtaskTypeId: '', subtaskTypeFieldId: field?.id || '' };
  if (!field?.ok || !issue?.fields || !Object.hasOwn(issue.fields, field.id)) return unknown;
  const value = issue.fields[field.id];
  if (value == null || value === '') return { ...unknown, subtaskTypeKnown: true };
  // The native single-select response is { id, value }. Text values are also
  // supported for installations exposing a text-backed field. Arrays/objects
  // without a label stay unknown to avoid duplicating hours or guessing a type.
  const name = typeof value === 'string' ? value.trim()
    : !Array.isArray(value) && typeof value === 'object' && typeof value.value === 'string' ? value.value.trim() : '';
  if (!name) return unknown;
  const optionId = typeof value === 'object' && value.id != null ? String(value.id) : `value:${name}`;
  return { ...unknown, subtaskTypeKnown: true, subtaskType: name, subtaskTypeId: optionId };
}

module.exports = { resolveSubtaskTypeField, readSubtaskType };
