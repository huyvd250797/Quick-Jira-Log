'use strict';

const {
  JiraError,
  searchIssuesWorkedOnDate,
  searchIssuesWithWorklogDate,
  searchRecentlyWorkedIssues,
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

async function loadOccupiedRanges(date, targetKeys, me, session, options = {}) {
  // V0.6.2 reliability strategy:
  // 1) JQL currentUser + worklogDate: quét toàn ngày theo cách Jira hỗ trợ chính thức.
  // 2) JQL worklogDate không theo author: bù trường hợp author-index/case không ổn định,
  //    sau đó lọc author từ worklog thật.
  // 3) issue updated 30 phút gần nhất: bù index delay ngay sau khi user vừa log tay trên Jira.
  // 4) /worklog/updated + /worklog/list: bù các worklog thay đổi gần đây mà JQL chưa index.
  // 5) target issue luôn được đọc trực tiếp.
  // Chỉ sau khi hợp nhất tất cả nguồn mới tính slot trống.

  const [authorDay, recentWorked, recentIssues] = await Promise.all([
    safeIssueSource(() => searchIssuesWorkedOnDate(date, session), 'worklogAuthor+worklogDate-window'),
    safeIssueSource(() => searchRecentlyWorkedIssues(session), 'recent-worked-current-user'),
    safeIssueSource(() => searchRecentlyUpdatedIssues(session), 'recent-updated-issues')
  ]);

  // Full worklogDate scan can be very expensive because it includes worklogs of other users.
  // Only use it as a compatibility fallback when the currentUser day-wide query itself is unavailable.
  const anyDay = authorDay.ok
    ? { ok: false, keys: [], label: 'worklogDate-window', skipped: true }
    : await safeIssueSource(() => searchIssuesWithWorklogDate(date, session), 'worklogDate-window');

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
    ...recentWorked.keys,
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
  const skippedIssueWorklogs = [];
  const authorDaySet = new Set(authorDay.keys || []);
  const targetSet = new Set(target);
  const concurrency = 12;
  for (let i = 0; i < issueKeys.length; i += concurrency) {
    const batch = issueKeys.slice(i, i + concurrency);
    const results = await Promise.all(batch.map(async issueKey => {
      try {
        return { issueKey, worklogs: await getIssueWorklogs(issueKey, session) };
      } catch (error) {
        if (error?.status === 401) throw error;

        // Nếu chính issue cần log hoặc JQL xác nhận user đã worklog trên issue này trong ngày,
        // không đọc được worklog thì phải fail closed để tránh trùng giờ.
        if (targetSet.has(issueKey) || authorDaySet.has(issueKey)) {
          throw new JiraError(
            `Không kiểm tra được worklog của ${issueKey}; đã dừng để tránh log trùng thời gian.`,
            error.status || 502,
            error.details || null
          );
        }

        // Issue chỉ đến từ nguồn bổ trợ (worklogDate/recent) mà bị 403 thì bỏ qua,
        // không được làm mất session Jira của user.
        skippedIssueWorklogs.push({ issueKey, status: error?.status || 0, error: error?.message || String(error) });
        return { issueKey, worklogs: [] };
      }
    }));
    for (const result of results) issueWorklogs.push(...result.worklogs);
  }

  const excludeIds = new Set((options.excludeWorklogIds || []).map(String));
  const flat = dedupeWorklogs([...(delta.worklogs || []), ...issueWorklogs]).filter(w => !excludeIds.has(String(w?.id || w?.worklogId || '')));
  const occupied = mergeRanges(normalizeExistingWorklogs(flat, date, identityContext(me, session)));

  return {
    occupied,
    issueKeys,
    checkedWorklogs: flat.length,
    sources: {
      authorDay: { ok: authorDay.ok, issues: authorDay.keys.length, error: authorDay.error || null },
      anyDay: { ok: anyDay.ok, issues: anyDay.keys.length, skipped: Boolean(anyDay.skipped), error: anyDay.error || null },
      recentWorked: { ok: recentWorked.ok, issues: recentWorked.keys.length, error: recentWorked.error || null },
      recentIssues: { ok: recentIssues.ok, issues: recentIssues.keys.length, error: recentIssues.error || null },
      worklogDelta: {
        supported: Boolean(delta.supported),
        changedIds: Number(delta.changedIds || 0),
        worklogs: Array.isArray(delta.worklogs) ? delta.worklogs.length : 0,
        truncated: Boolean(delta.truncated),
        error: delta.error || null
      },
      skippedIssueWorklogs
    }
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function vietnamToday() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

async function loadOccupiedRangesStable(date, targetKeys, me, session, options = {}) {
  const first = await loadOccupiedRanges(date, targetKeys, me, session, options);
  if (date !== vietnamToday()) return first;

  // Với ngày hiện tại, Jira có thể index worklog vừa log tay chậm vài giây. Quét lần 2
  // trước khi lập lịch và hợp nhất kết quả để không vô tình quay lại 08:00.
  await sleep(250);
  const second = await loadOccupiedRanges(date, targetKeys, me, session, options);
  return {
    ...second,
    occupied: mergeRanges([...(first.occupied || []), ...(second.occupied || [])]),
    issueKeys: [...new Set([...(first.issueKeys || []), ...(second.issueKeys || [])])],
    checkedWorklogs: Math.max(Number(first.checkedWorklogs || 0), Number(second.checkedWorklogs || 0)),
    sources: { ...second.sources, stabilizationScan: true }
  };
}

module.exports = { loadOccupiedRanges, loadOccupiedRangesStable, identityContext, dedupeWorklogs };
