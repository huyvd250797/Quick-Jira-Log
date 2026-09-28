'use strict';

const { JIRA_BASE_URL, FILTER_MAX_ISSUES } = require('./config');

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

async function getFavouriteFilters(auth) {
  const { response, data } = await jiraFetch('/rest/api/2/filter/favourite', {}, auth);
  if (response.status === 401 || response.status === 403) throw new JiraError('Phiên Jira đã hết hạn.', 401);
  if (!response.ok) throw new JiraError('Không lấy được danh sách Jira Filter yêu thích.', response.status, data);
  return Array.isArray(data) ? data : [];
}

async function searchFiltersByName(name, auth) {
  const params = new URLSearchParams({ filterName: name, maxResults: '100', expand: 'jql' });
  const { response, data } = await jiraFetch(`/rest/api/2/filter/search?${params.toString()}`, {}, auth);
  if (response.status === 404 || response.status === 405) return [];
  if (response.status === 401 || response.status === 403) throw new JiraError('Phiên Jira đã hết hạn.', 401);
  if (!response.ok) return [];
  if (Array.isArray(data?.values)) return data.values;
  if (Array.isArray(data)) return data;
  return [];
}

async function getFilter(filterId, auth) {
  const { response, data } = await jiraFetch(`/rest/api/2/filter/${encodeURIComponent(filterId)}?expand=jql`, {}, auth);
  if (response.status === 401 || response.status === 403) throw new JiraError('Phiên Jira đã hết hạn.', 401);
  if (response.status === 404) throw new JiraError('Jira Filter không còn tồn tại hoặc bạn không có quyền xem.', 404);
  if (!response.ok) throw new JiraError('Không đọc được Jira Filter.', response.status, data);
  return data;
}

async function resolveFilterByName(name, auth) {
  const wanted = String(name || '').trim().toLocaleLowerCase('vi');
  const favourites = await getFavouriteFilters(auth);
  let found = favourites.find(f => String(f?.name || '').trim().toLocaleLowerCase('vi') === wanted);

  // Nếu filter không được đánh dấu Favourite, Jira Data Center mới hơn có endpoint search.
  if (!found) {
    const searched = await searchFiltersByName(name, auth);
    found = searched.find(f => String(f?.name || '').trim().toLocaleLowerCase('vi') === wanted);
  }

  if (!found?.id) {
    const closeNames = favourites
      .map(f => String(f?.name || '').trim())
      .filter(Boolean)
      .filter(n => n.toLocaleLowerCase('vi').includes('work') || n.toLocaleLowerCase('vi').includes('huyvo'))
      .slice(0, 8);
    throw new JiraError(`Không tìm thấy filter "${name}". Hãy đảm bảo filter tồn tại và tài khoản hiện tại có quyền xem.`, 404, { closeNames });
  }

  if (!found.jql) {
    try { found = await getFilter(found.id, auth); } catch { /* search by filter ID vẫn có thể hoạt động */ }
  }
  return found;
}

async function searchFilterIssues(filter, auth, maxTotal = FILTER_MAX_ISSUES) {
  const id = String(filter?.id || '').trim();
  if (!id) throw new JiraError('Filter Jira không có ID hợp lệ.', 500);

  const issues = [];
  const pageSize = 100;
  let startAt = 0;
  let total = Infinity;

  while (startAt < total && issues.length < maxTotal) {
    const take = Math.min(pageSize, maxTotal - issues.length);
    const { response, data } = await jiraFetch('/rest/api/2/search', {
      method: 'POST',
      body: {
        jql: `filter = ${id}`,
        startAt,
        maxResults: take,
        fields: ['summary', 'project', 'status', 'issuetype', 'priority']
      },
      timeoutMs: 20000
    }, auth);

    if (response.status === 401 || response.status === 403) throw new JiraError('Phiên Jira đã hết hạn hoặc bạn không có quyền chạy filter.', 401);
    if (!response.ok) throw new JiraError(`Không chạy được filter "${filter?.name || id}".`, response.status, data);

    const page = Array.isArray(data?.issues) ? data.issues : [];
    issues.push(...page);
    total = Number.isFinite(Number(data?.total)) ? Number(data.total) : issues.length;
    if (!page.length) break;
    startAt += page.length;
  }

  return {
    total: Number.isFinite(total) ? total : issues.length,
    truncated: Number.isFinite(total) && total > maxTotal,
    issues
  };
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
  const worklogs = [];
  let startAt = 0;
  const pageSize = 1000;
  let total = Infinity;

  while (startAt < total) {
    const params = new URLSearchParams({ startAt: String(startAt), maxResults: String(pageSize) });
    const { response, data } = await jiraFetch(`/rest/api/2/issue/${encodeURIComponent(key)}/worklog?${params.toString()}`, {}, auth);
    if (response.status === 401 || response.status === 403) throw new JiraError('Phiên Jira đã hết hạn hoặc bạn không có quyền đọc worklog.', 401, data);
    if (!response.ok) throw new JiraError(`Không đọc được worklog của ${key}.`, response.status, data);

    const page = Array.isArray(data?.worklogs) ? data.worklogs : [];
    worklogs.push(...page);
    total = Number.isFinite(Number(data?.total)) ? Number(data.total) : worklogs.length;
    if (!page.length || page.length < pageSize) break;
    startAt += page.length;
  }
  return worklogs;
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
  getFavouriteFilters,
  resolveFilterByName,
  searchFilterIssues,
  searchIssuesWorkedOnDate,
  getIssueWorklogs,
  createWorklog,
  deleteWorklog
};
