'use strict';

const { JIRA_BASE_URL } = require('./config');

class JiraError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'JiraError';
    this.status = status;
    this.details = details;
  }
}

function withTimeout(ms = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

async function safeJson(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); }
  catch { return { raw: text.slice(0, 600) }; }
}

async function jiraFetch(path, options = {}, auth) {
  const timer = withTimeout(options.timeoutMs || 15000);
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {})
  };

  if (auth?.mode === 'session' && auth.cookie) headers.Cookie = auth.cookie;
  if (auth?.mode === 'basic' && auth.username && auth.password) {
    headers.Authorization = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`;
  }

  try {
    const response = await fetch(`${JIRA_BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: timer.signal,
      redirect: 'manual'
    });
    const data = await safeJson(response);
    return { response, data };
  } catch (error) {
    if (error?.name === 'AbortError') throw new JiraError('Jira phản hồi quá lâu. Vui lòng thử lại.', 504);
    throw new JiraError('Không thể kết nối Jira.', 502, error?.message || null);
  } finally {
    timer.done();
  }
}

async function loginWithPassword(username, password) {
  const sessionAttempt = await jiraFetch('/rest/auth/1/session', {
    method: 'POST',
    body: { username, password }
  });

  if (sessionAttempt.response.ok && sessionAttempt.data?.session?.name && sessionAttempt.data?.session?.value) {
    const auth = {
      mode: 'session',
      cookie: `${sessionAttempt.data.session.name}=${sessionAttempt.data.session.value}`,
      username
    };
    const me = await getMyself(auth);
    return { auth, me };
  }

  // Fallback cho Jira Server/Data Center bật HTTP Basic Auth.
  const basicAuth = { mode: 'basic', username, password };
  const meAttempt = await jiraFetch('/rest/api/2/myself', {}, basicAuth);
  if (meAttempt.response.ok) return { auth: basicAuth, me: meAttempt.data };

  const status = meAttempt.response.status || sessionAttempt.response.status;
  if (status === 401 || status === 403) {
    throw new JiraError('ID hoặc mật khẩu Jira không đúng, hoặc tài khoản không có quyền truy cập REST.', 401);
  }
  throw new JiraError('Jira không chấp nhận kiểu đăng nhập ID/Password hiện tại.', 502, {
    sessionStatus: sessionAttempt.response.status,
    basicStatus: meAttempt.response.status
  });
}

async function getMyself(auth) {
  const { response, data } = await jiraFetch('/rest/api/2/myself', {}, auth);
  if (response.status === 401 || response.status === 403) throw new JiraError('Phiên Jira đã hết hạn.', 401);
  if (!response.ok) throw new JiraError('Không đọc được thông tin tài khoản Jira.', response.status, data);
  return data;
}

async function getIssue(key, auth) {
  const safeKey = encodeURIComponent(key);
  const { response, data } = await jiraFetch(`/rest/api/2/issue/${safeKey}?fields=project,summary`, {}, auth);
  if (response.status === 404) throw new JiraError(`Không tìm thấy issue ${key}.`, 404);
  if (response.status === 401 || response.status === 403) throw new JiraError('Phiên Jira đã hết hạn hoặc bạn không có quyền xem issue.', 401);
  if (!response.ok) throw new JiraError('Không kiểm tra được issue Jira.', response.status, data);
  return data;
}

async function searchIssuesWorkedOnDate(date, auth) {
  const jql = `worklogAuthor = currentUser() AND worklogDate = "${date}"`;
  const params = new URLSearchParams({ jql, fields: 'key', maxResults: '1000' });
  const { response, data } = await jiraFetch(`/rest/api/2/search?${params.toString()}`, {}, auth);
  if (response.status === 401 || response.status === 403) throw new JiraError('Phiên Jira đã hết hạn.', 401);
  if (!response.ok) throw new JiraError('Không lấy được worklog trong ngày.', response.status, data);
  return Array.isArray(data?.issues) ? data.issues.map(i => i.key).filter(Boolean) : [];
}

async function getIssueWorklogs(key, auth) {
  const { response, data } = await jiraFetch(`/rest/api/2/issue/${encodeURIComponent(key)}/worklog?maxResults=5000`, {}, auth);
  if (!response.ok) throw new JiraError(`Không đọc được worklog của ${key}.`, response.status, data);
  return Array.isArray(data?.worklogs) ? data.worklogs : [];
}

async function createWorklog(key, { started, seconds, description }, auth) {
  const { response, data } = await jiraFetch(`/rest/api/2/issue/${encodeURIComponent(key)}/worklog?adjustEstimate=leave`, {
    method: 'POST',
    body: {
      comment: description,
      started,
      timeSpentSeconds: seconds
    }
  }, auth);
  if (response.status === 401 || response.status === 403) throw new JiraError('Không có quyền log work hoặc phiên Jira đã hết hạn.', 401, data);
  if (!response.ok) throw new JiraError('Jira từ chối tạo worklog.', response.status, data);
  return data;
}

async function deleteWorklog(key, worklogId, auth) {
  const { response } = await jiraFetch(`/rest/api/2/issue/${encodeURIComponent(key)}/worklog/${encodeURIComponent(worklogId)}?adjustEstimate=leave`, {
    method: 'DELETE'
  }, auth);
  return response.ok || response.status === 204 || response.status === 404;
}

module.exports = {
  JiraError,
  jiraFetch,
  loginWithPassword,
  getMyself,
  getIssue,
  searchIssuesWorkedOnDate,
  getIssueWorklogs,
  createWorklog,
  deleteWorklog
};
