'use strict';

const {
  JiraError,
  searchIssuesWorkedOnDate,
  searchIssuesWithWorklogDate,
  searchRecentlyUpdatedIssues,
  getRecentlyChangedWorklogs,
  getIssueWorklogs
} = require('./jira');
const { normalizeExistingWorklogs, mergeRanges } = require('./scheduler');

function identityContext(me, session) {
  return { ...(me || {}), username: session?.username || me?.name || '' };
}

function dedupeWorklogs(worklogs) {
  const seen = new Set();
  const out = [];
  for (const w of worklogs || []) {
    const id = String(w?.id || w?.worklogId || '');
    const fallback = `${w?.started || ''}|${w?.timeSpentSeconds || ''}|${w?.author?.name || w?.author?.key || ''}`;
    const key = id || fallback;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

async function safeIssueSource(fn, label) {
  try {
    return { ok: true, keys: await fn(), label };
  } catch (error) {
    if (error?.status === 401) throw error;
    return { ok: false, keys: [], label, error: error?.message || String(error) };
  }
}

async function loadOccupiedRanges(date, targetKeys, me, session) {
  // V0.6.0 reliability strategy:
  // 1) JQL currentUser + worklogDate: quét toàn ngày theo cách Jira hỗ trợ chính thức.
  // 2) JQL worklogDate không theo author: bù trường hợp author-index/case không ổn định,
  //    sau đó lọc author từ worklog thật.
  // 3) issue updated 30 phút gần nhất: bù index delay ngay sau khi user vừa log tay trên Jira.
  // 4) /worklog/updated + /worklog/list: bù các worklog thay đổi gần đây mà JQL chưa index.
  // 5) target issue luôn được đọc trực tiếp.
  // Chỉ sau khi hợp nhất tất cả nguồn mới tính slot trống.

  const [authorDay, anyDay, recentIssues] = await Promise.all([
    safeIssueSource(() => searchIssuesWorkedOnDate(date, session), 'worklogAuthor+worklogDate'),
    safeIssueSource(() => searchIssuesWithWorklogDate(date, session), 'worklogDate'),
    safeIssueSource(() => searchRecentlyUpdatedIssues(session), 'recent-updated-issues')
  ]);

  let delta = { supported: false, worklogs: [], changedIds: 0, truncated: false };
  try {
    delta = await getRecentlyChangedWorklogs(date, session);
  } catch (error) {
    if (error?.status === 401) throw error;
    delta = { supported: false, worklogs: [], changedIds: 0, truncated: false, error: error?.message || String(error) };
  }

  const target = (targetKeys || []).filter(Boolean);
  const issueKeys = [...new Set([
    ...authorDay.keys,
    ...anyDay.keys,
    ...recentIssues.keys,
    ...target
  ])];

  // Fail closed: nếu Jira không cho quét toàn ngày bằng cả JQL author lẫn JQL worklogDate
  // và global worklog delta cũng không khả dụng, không được phép mạo hiểm log trùng.
  const hasDayWideSource = authorDay.ok || anyDay.ok || delta.supported;
  if (!hasDayWideSource) {
    throw new JiraError(
      'Không thể kiểm tra đầy đủ toàn bộ worklog trong ngày trên Jira; đã dừng để tránh log trùng giờ.',
      502,
      { sources: [authorDay, anyDay], delta }
    );
  }

  const issueWorklogs = [];
  const concurrency = 8;
  for (let i = 0; i < issueKeys.length; i += concurrency) {
    const batch = issueKeys.slice(i, i + concurrency);
    const results = await Promise.all(batch.map(async issueKey => {
      try {
        return await getIssueWorklogs(issueKey, session);
      } catch (error) {
        throw new JiraError(
          `Không kiểm tra đầy đủ worklog của ${issueKey}; tạm dừng để tránh log trùng thời gian.`,
          error.status || 502,
          error.details || null
        );
      }
    }));
    for (const list of results) issueWorklogs.push(...list);
  }

  const flat = dedupeWorklogs([...(delta.worklogs || []), ...issueWorklogs]);
  const occupied = mergeRanges(normalizeExistingWorklogs(flat, date, identityContext(me, session)));

  return {
    occupied,
    issueKeys,
    checkedWorklogs: flat.length,
    sources: {
      authorDay: { ok: authorDay.ok, issues: authorDay.keys.length, error: authorDay.error || null },
      anyDay: { ok: anyDay.ok, issues: anyDay.keys.length, error: anyDay.error || null },
      recentIssues: { ok: recentIssues.ok, issues: recentIssues.keys.length, error: recentIssues.error || null },
      worklogDelta: {
        supported: Boolean(delta.supported),
        changedIds: Number(delta.changedIds || 0),
        worklogs: Array.isArray(delta.worklogs) ? delta.worklogs.length : 0,
        truncated: Boolean(delta.truncated),
        error: delta.error || null
      }
    }
  };
}

module.exports = { loadOccupiedRanges, identityContext, dedupeWorklogs };
