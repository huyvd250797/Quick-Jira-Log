'use strict';

const { JIRA_BASE_URL, FILTER_MAX_ISSUES, FILTER_MAX_FILTERS } = require('./config');

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
  if (response.status === 401) throw new JiraError('Phiên Jira đã hết hạn.', 401);
  if (response.status === 403) throw new JiraError('Tài khoản Jira không có quyền dùng API này.', 403, data);
  if (!response.ok) throw new JiraError('Không đọc được thông tin tài khoản Jira.', response.status, data);
  return data;
}

async function getIssue(key, auth) {
  const safeKey = encodeURIComponent(key);
  const { response, data } = await jiraFetch(`/rest/api/2/issue/${safeKey}?fields=project,summary,status`, {}, auth);
  if (response.status === 404) throw new JiraError(`Không tìm thấy issue ${key}.`, 404);
  if (response.status === 401) throw new JiraError('Phiên Jira đã hết hạn.', 401);
  if (response.status === 403) throw new JiraError('Bạn không có quyền xem issue này.', 403, data);
  if (!response.ok) throw new JiraError('Không kiểm tra được issue Jira.', response.status, data);
  return data;
}

async function getFavouriteFilters(auth) {
  const { response, data } = await jiraFetch('/rest/api/2/filter/favourite', {}, auth);
  if (response.status === 401) throw new JiraError('Phiên Jira đã hết hạn.', 401);
  if (response.status === 403) throw new JiraError('Bạn không có quyền đọc Jira Filter yêu thích.', 403, data);
  if (!response.ok) throw new JiraError('Không lấy được danh sách Jira Filter yêu thích.', response.status, data);
  return Array.isArray(data) ? data : [];
}

async function searchFiltersByName(name, auth) {
  const params = new URLSearchParams({ filterName: name, maxResults: '100', expand: 'jql' });
  const { response, data } = await jiraFetch(`/rest/api/2/filter/search?${params.toString()}`, {}, auth);
  if (response.status === 404 || response.status === 405) return [];
  if (response.status === 401) throw new JiraError('Phiên Jira đã hết hạn.', 401);
  if (response.status === 403) return [];
  if (!response.ok) return [];
  if (Array.isArray(data?.values)) return data.values;
  if (Array.isArray(data)) return data;
  return [];
}



function unpackFilterList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.values)) return data.values;
  return [];
}

function dedupeFilters(filters) {
  const seen = new Set();
  const out = [];
  for (const filter of filters || []) {
    const id = String(filter?.id || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(filter);
  }
  return out;
}

function ownerMatches(filter, me, auth) {
  const owner = filter?.owner || {};
  const ownerValues = [owner.name, owner.key, owner.accountId, owner.emailAddress].filter(Boolean).map(v => String(v).toLowerCase());
  if (!ownerValues.length) return false;
  const mine = [me?.name, me?.key, me?.accountId, me?.emailAddress, auth?.username].filter(Boolean).map(v => String(v).toLowerCase());
  return ownerValues.some(v => mine.includes(v));
}

async function listSelectableFilters(auth, maxTotal = FILTER_MAX_FILTERS) {
  const limit = Math.max(1, Math.min(Number(maxTotal) || FILTER_MAX_FILTERS, 200));

  // Jira Cloud / một số bản Jira Data Center mới: trả về các filter do user sở hữu,
  // có thể kèm filter yêu thích. Đây là endpoint ưu tiên vì đúng nhu cầu "filter của tôi".
  const myParams = new URLSearchParams({ includeFavourites: 'true', expand: 'jql', maxResults: String(limit) });
  const myAttempt = await jiraFetch(`/rest/api/2/filter/my?${myParams.toString()}`, {}, auth);
  if (myAttempt.response.status === 401) throw new JiraError('Phiên Jira đã hết hạn.', 401);
  // 403 ở /filter/my chỉ có nghĩa endpoint này không được phép trên Jira hiện tại; tiếp tục fallback.
  if (myAttempt.response.status === 403) { /* fallback below */ }
  if (myAttempt.response.ok) {
    const mine = dedupeFilters(unpackFilterList(myAttempt.data)).slice(0, limit);
    if (mine.length) return mine;
  }

  const me = await getMyself(auth);
  const candidates = [];

  // Jira Server/Data Center mới hơn có filter/search. Thử owner hiện tại trước.
  const ownerCandidates = [me?.name, me?.key, auth?.username].filter(Boolean);
  for (const owner of [...new Set(ownerCandidates)]) {
    const params = new URLSearchParams({ owner: String(owner), maxResults: String(limit), expand: 'jql' });
    const attempt = await jiraFetch(`/rest/api/2/filter/search?${params.toString()}`, {}, auth);
    if (attempt.response.status === 401) throw new JiraError('Phiên Jira đã hết hạn.', 401);
    if (attempt.response.status === 403) continue;
    if (attempt.response.ok) {
      const found = unpackFilterList(attempt.data);
      const owned = found.filter(filter => ownerMatches(filter, me, auth));
      candidates.push(...(owned.length ? owned : found));
    }
  }

  // Favourite luôn là fallback ổn định trên Jira Server/Data Center cũ.
  try { candidates.push(...await getFavouriteFilters(auth)); } catch (error) {
    if (error?.status === 401) throw error;
  }

  // Nếu search endpoint tồn tại nhưng tham số owner khác nhau giữa các phiên bản,
  // lấy thêm danh sách visible rồi giữ các filter xác định được là của user. Nhờ vậy
  // filter do user tạo nhưng chưa Favourite vẫn có thể xuất hiện.
  {
    const params = new URLSearchParams({ maxResults: String(limit), expand: 'jql' });
    const attempt = await jiraFetch(`/rest/api/2/filter/search?${params.toString()}`, {}, auth);
    if (attempt.response.ok) {
      const visible = unpackFilterList(attempt.data);
      const ownedVisible = visible.filter(f => ownerMatches(f, me, auth));
      if (ownedVisible.length) candidates.push(...ownedVisible);
      else if (!candidates.length) candidates.push(...visible.filter(f => f?.favourite === true));
    }
  }

  const filters = dedupeFilters(candidates).slice(0, limit);
  if (!filters.length) {
    throw new JiraError('Không tìm thấy Jira Filter nào của tài khoản hiện tại. Hãy tạo hoặc Favourite ít nhất một filter trên Jira.', 404);
  }
  return filters;
}

async function getFilter(filterId, auth) {
  const { response, data } = await jiraFetch(`/rest/api/2/filter/${encodeURIComponent(filterId)}?expand=jql`, {}, auth);
  if (response.status === 401) throw new JiraError('Phiên Jira đã hết hạn.', 401);
  if (response.status === 403) throw new JiraError('Bạn không có quyền xem Jira Filter này.', 403, data);
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

async function searchJqlPage(jql, startAt, maxResults, fields, auth) {
  const body = { jql, startAt, maxResults, fields };
  let attempt = await jiraFetch('/rest/api/2/search', { method: 'POST', body, timeoutMs: 20000 }, auth);

  // Một số Jira Server/Data Center chặn POST search (kể cả trả 403) nhưng vẫn cho GET search.
  // Chỉ 401 mới được coi là hết phiên; 403 phải thử GET trước rồi mới kết luận thiếu quyền.
  if (!attempt.response.ok && attempt.response.status !== 401) {
    const params = new URLSearchParams({
      jql,
      startAt: String(startAt),
      maxResults: String(maxResults),
      fields: Array.isArray(fields) ? fields.join(',') : String(fields || '')
    });
    const fallback = await jiraFetch(`/rest/api/2/search?${params.toString()}`, { timeoutMs: 20000 }, auth);
    if (fallback.response.ok || [401, 403].includes(fallback.response.status)) attempt = fallback;
  }

  if (attempt.response.status === 401) {
    throw new JiraError('Phiên Jira đã hết hạn.', 401, attempt.data);
  }
  if (attempt.response.status === 403) {
    throw new JiraError('Jira từ chối quyền tìm issue bằng JQL hiện tại.', 403, attempt.data);
  }
  return attempt;
}

async function searchFilterIssues(filter, auth, maxTotal = FILTER_MAX_ISSUES) {
  const id = String(filter?.id || '').trim();
  if (!id) throw new JiraError('Filter Jira không có ID hợp lệ.', 500);

  const jqlCandidates = [
    `filter = ${id}`,
    filter?.jql ? String(filter.jql) : ''
  ].filter(Boolean);
  let lastFailure = null;

  for (const jql of [...new Set(jqlCandidates)]) {
    const issues = [];
    const pageSize = 100;
    let startAt = 0;
    let total = Infinity;
    let failed = false;

    while (startAt < total && issues.length < maxTotal) {
      const take = Math.min(pageSize, maxTotal - issues.length);
      const { response, data } = await searchJqlPage(
        jql, startAt, take, ['summary', 'project', 'status', 'issuetype', 'priority'], auth
      );

      if (!response.ok) {
        lastFailure = { status: response.status, data };
        failed = true;
        break;
      }

      const page = Array.isArray(data?.issues) ? data.issues : [];
      issues.push(...page);
      total = Number.isFinite(Number(data?.total)) ? Number(data.total) : issues.length;
      if (!page.length) break;
      startAt += page.length;
    }

    if (!failed) {
      return {
        total: Number.isFinite(total) ? total : issues.length,
        truncated: Number.isFinite(total) && total > maxTotal,
        issues
      };
    }
  }

  throw new JiraError(`Không chạy được filter "${filter?.name || id}".`, lastFailure?.status || 502, lastFailure?.data || null);
}


function shiftIsoDate(date, days) {
  const match = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return date;
  const value = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
}

async function searchIssuesWorkedOnDate(date, auth) {
  // Jira Data Center đánh giá worklogDate theo timezone của server, không phải timezone user.
  // Quét thêm ngày liền trước/sau rồi lọc timestamp thật về Asia/Ho_Chi_Minh ở scheduler.
  const from = shiftIsoDate(date, -1);
  const to = shiftIsoDate(date, 1);
  const jql = `worklogAuthor = currentUser() AND worklogDate >= "${from}" AND worklogDate <= "${to}" ORDER BY updated DESC`;
  const keys = [];
  let startAt = 0;
  let total = Infinity;
  const pageSize = 100;

  while (startAt < total && keys.length < 2000) {
    const { response, data } = await searchJqlPage(jql, startAt, pageSize, ['key'], auth);
    if (!response.ok) throw new JiraError('Không lấy được worklog trong ngày.', response.status, data);
    const page = Array.isArray(data?.issues) ? data.issues : [];
    keys.push(...page.map(i => i?.key).filter(Boolean));
    total = Number.isFinite(Number(data?.total)) ? Number(data.total) : keys.length;
    if (!page.length) break;
    startAt += page.length;
  }
  return [...new Set(keys)];
}

async function getIssueWorklogs(key, auth) {
  const worklogs = [];
  let startAt = 0;
  const pageSize = 1000;
  let total = Infinity;

  while (startAt < total) {
    const params = new URLSearchParams({ startAt: String(startAt), maxResults: String(pageSize) });
    const { response, data } = await jiraFetch(`/rest/api/2/issue/${encodeURIComponent(key)}/worklog?${params.toString()}`, {}, auth);
    if (response.status === 401) throw new JiraError('Phiên Jira đã hết hạn.', 401, data);
    if (response.status === 403) throw new JiraError(`Không có quyền đọc worklog của ${key}.`, 403, data);
    if (!response.ok) throw new JiraError(`Không đọc được worklog của ${key}.`, response.status, data);

    const page = Array.isArray(data?.worklogs) ? data.worklogs : [];
    worklogs.push(...page);
    total = Number.isFinite(Number(data?.total)) ? Number(data.total) : worklogs.length;
    if (!page.length || page.length < pageSize) break;
    startAt += page.length;
  }
  return worklogs;
}



async function searchIssueKeysByJql(jql, auth, maxTotal = 2000) {
  const keys = [];
  let startAt = 0;
  let total = Infinity;
  const pageSize = 100;

  while (startAt < total && keys.length < maxTotal) {
    const take = Math.min(pageSize, maxTotal - keys.length);
    const { response, data } = await searchJqlPage(jql, startAt, take, ['key'], auth);
    if (!response.ok) throw new JiraError('Không quét được issue Jira để kiểm tra worklog.', response.status, data);
    const page = Array.isArray(data?.issues) ? data.issues : [];
    keys.push(...page.map(i => i?.key).filter(Boolean));
    total = Number.isFinite(Number(data?.total)) ? Number(data.total) : keys.length;
    if (!page.length) break;
    startAt += page.length;
  }
  return [...new Set(keys)];
}

async function searchIssuesWithWorklogDate(date, auth) {
  const from = shiftIsoDate(date, -1);
  const to = shiftIsoDate(date, 1);
  return searchIssueKeysByJql(`worklogDate >= "${from}" AND worklogDate <= "${to}" ORDER BY updated DESC`, auth, 3500);
}

async function searchRecentlyWorkedIssues(auth) {
  // Không phụ thuộc worklogDate để bù timezone/index date. Sau đó server vẫn lọc đúng ngày
  // bằng timestamp thật của từng worklog.
  return searchIssueKeysByJql('worklogAuthor = currentUser() AND updated >= -1d ORDER BY updated DESC', auth, 1200);
}

async function searchRecentlyUpdatedIssues(auth) {
  // Bù khoảng trễ index của worklogAuthor/worklogDate và khoảng 1 phút mà
  // /worklog/updated của Jira cố ý chưa trả về. Mọi issue vừa được log tay trên Jira
  // đều được lấy lại worklog trực tiếp rồi lọc theo author + ngày ở server app.
  try {
    return await searchIssueKeysByJql('updated >= -2h ORDER BY updated DESC', auth, 1000);
  } catch (error) {
    if (error?.status === 401) throw error;
    return [];
  }
}

function dateStartMsAtVietnam(date) {
  const ms = Date.parse(`${date}T00:00:00+07:00`);
  return Number.isFinite(ms) ? ms : null;
}

function vietnamToday() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

async function getWorklogsForIds(ids, auth) {
  const unique = [...new Set((ids || []).map(String).filter(Boolean))];
  const out = [];
  for (let i = 0; i < unique.length; i += 1000) {
    const batch = unique.slice(i, i + 1000).map(id => Number(id)).filter(Number.isFinite);
    if (!batch.length) continue;
    const { response, data } = await jiraFetch('/rest/api/2/worklog/list', {
      method: 'POST', body: { ids: batch }, timeoutMs: 20000
    }, auth);
    if (response.status === 401) throw new JiraError('Phiên Jira đã hết hạn.', 401, data);
    // Endpoint global này có thể bị cấm dù user vẫn đọc/log work trên issue bình thường.
    if (response.status === 403 || response.status === 404 || response.status === 405) return null;
    if (!response.ok) throw new JiraError('Không đọc được danh sách worklog Jira.', response.status, data);
    if (Array.isArray(data)) out.push(...data);
    else if (Array.isArray(data?.values)) out.push(...data.values);
  }
  return out;
}

async function getRecentlyChangedWorklogs(date, auth) {
  const dayStart = dateStartMsAtVietnam(date);
  if (dayStart == null) return { supported: false, worklogs: [], changedIds: 0, truncated: false };

  // Chỉ dùng global delta cho ngày gần hiện tại để tránh quét lịch sử toàn Jira quá lớn.
  // Ngày cũ vẫn được kiểm tra bằng JQL worklogDate + worklog từng issue.
  const todayStart = dateStartMsAtVietnam(vietnamToday());
  if (todayStart == null || dayStart < todayStart - 2 * 86400000 || dayStart > todayStart + 86400000) {
    return { supported: false, worklogs: [], changedIds: 0, truncated: false, skippedForAge: true };
  }

  let cursor = dayStart;
  const ids = [];
  let supported = true;
  let truncated = false;
  const maxPages = 20;

  for (let pageNo = 0; pageNo < maxPages; pageNo++) {
    const { response, data } = await jiraFetch(`/rest/api/2/worklog/updated?since=${encodeURIComponent(String(cursor))}`, {
      timeoutMs: 20000
    }, auth);
    if (response.status === 401) throw new JiraError('Phiên Jira đã hết hạn.', 401, data);
    // /worklog/updated là nguồn bổ trợ; 403 không được làm logout/chặn logwork.
    if (response.status === 403 || response.status === 404 || response.status === 405) {
      supported = false;
      break;
    }
    if (!response.ok) throw new JiraError('Không đọc được worklog delta từ Jira.', response.status, data);

    const values = Array.isArray(data?.values) ? data.values : [];
    ids.push(...values.map(v => v?.worklogId).filter(v => v != null));
    const lastPage = data?.lastPage === true || data?.isLastPage === true;
    if (lastPage || !values.length) break;

    let next = NaN;
    if (data?.nextPage) {
      try { next = Number(new URL(data.nextPage).searchParams.get('since')); } catch { /* use until */ }
    }
    if (!Number.isFinite(next)) next = Number(data?.until);
    if (!Number.isFinite(next)) break;
    if (next <= cursor) next = cursor + 1;
    cursor = next;
    if (pageNo === maxPages - 1) truncated = true;
  }

  if (!supported) return { supported: false, worklogs: [], changedIds: 0, truncated: false };
  const worklogs = await getWorklogsForIds(ids, auth);
  if (worklogs == null) return { supported: false, worklogs: [], changedIds: ids.length, truncated };
  return { supported: true, worklogs, changedIds: ids.length, truncated };
}


async function getIssueTransitions(key, auth) {
  const { response, data } = await jiraFetch(`/rest/api/2/issue/${encodeURIComponent(key)}/transitions?expand=transitions.fields`, {}, auth);
  if (response.status === 401) throw new JiraError('Phiên Jira đã hết hạn.', 401, data);
  if (response.status === 403) return [];
  if (!response.ok) return [];
  return Array.isArray(data?.transitions) ? data.transitions : [];
}

function normalizedStatusName(value) {
  return String(value || '').trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function statusLooksDone(status) {
  const category = normalizedStatusName(status?.statusCategory?.key || status?.statusCategory?.name);
  const name = normalizedStatusName(status?.name);
  return category === 'done' || ['done', 'hoan thanh', 'completed', 'complete', 'closed', 'resolved'].includes(name);
}

async function transitionIssueToDone(key, auth, issue = null) {
  const currentIssue = issue || await getIssue(key, auth);
  if (statusLooksDone(currentIssue?.fields?.status)) {
    return { ok: true, alreadyDone: true, status: currentIssue?.fields?.status?.name || 'Done' };
  }

  const transitions = await getIssueTransitions(key, auth);
  const exactDone = transitions.find(t => normalizedStatusName(t?.to?.name) === 'done');
  const categoryDone = transitions.find(t => statusLooksDone(t?.to));
  const namedDone = transitions.find(t => ['done', 'hoan thanh', 'completed', 'complete', 'close', 'closed', 'resolve', 'resolved'].includes(normalizedStatusName(t?.name)));
  const transition = exactDone || categoryDone || namedDone;
  if (!transition?.id) {
    return { ok: false, code: 'NO_DONE_TRANSITION', message: 'Worklog đã tạo nhưng workflow hiện tại không có transition sang Done.' };
  }

  const { response, data } = await jiraFetch(`/rest/api/2/issue/${encodeURIComponent(key)}/transitions`, {
    method: 'POST',
    body: { transition: { id: String(transition.id) } }
  }, auth);
  if (response.status === 401) throw new JiraError('Phiên Jira đã hết hạn.', 401, data);
  if (response.status === 403) return { ok: false, code: 'TRANSITION_FORBIDDEN', message: 'Worklog đã tạo nhưng tài khoản không có quyền chuyển issue sang Done.' };
  if (!response.ok && response.status !== 204) {
    return { ok: false, code: 'TRANSITION_FAILED', message: 'Worklog đã tạo nhưng Jira từ chối chuyển trạng thái sang Done.' };
  }
  return { ok: true, transitionId: String(transition.id), status: transition?.to?.name || 'Done' };
}

async function updateWorklog(key, worklogId, { started, seconds, description }, auth) {
  const { response, data } = await jiraFetch(`/rest/api/2/issue/${encodeURIComponent(key)}/worklog/${encodeURIComponent(worklogId)}?adjustEstimate=leave`, {
    method: 'PUT',
    body: { comment: description, started, timeSpentSeconds: seconds }
  }, auth);
  if (response.status === 401) throw new JiraError('Phiên Jira đã hết hạn.', 401, data);
  if (response.status === 403) throw new JiraError('Bạn không có quyền sửa worklog này.', 403, data);
  if (!response.ok) throw new JiraError('Jira từ chối cập nhật worklog.', response.status, data);
  return data;
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
  if (response.status === 401) throw new JiraError('Phiên Jira đã hết hạn.', 401, data);
  if (response.status === 403) throw new JiraError('Tài khoản Jira không có quyền Log Work trên issue này.', 403, data);
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
  listSelectableFilters,
  resolveFilterByName,
  searchFilterIssues,
  searchIssuesWorkedOnDate,
  searchIssuesWithWorklogDate,
  searchRecentlyWorkedIssues,
  searchRecentlyUpdatedIssues,
  getRecentlyChangedWorklogs,
  getIssueWorklogs,
  createWorklog,
  updateWorklog,
  deleteWorklog,
  getIssueTransitions,
  transitionIssueToDone,
  statusLooksDone
};
