'use strict';

const { JiraError, searchIssuesWorkedOnDate, getIssueWorklogs } = require('./jira');
const { normalizeExistingWorklogs, mergeRanges } = require('./scheduler');

function identityContext(me, session) {
  return { ...(me || {}), username: session?.username || me?.name || '' };
}

async function loadOccupiedRanges(date, targetKeys, me, session) {
  const searchedKeys = await searchIssuesWorkedOnDate(date, session);
  const issueKeys = [...new Set([...(searchedKeys || []), ...(targetKeys || [])].filter(Boolean))];
  const worklogLists = [];

  for (const issueKey of issueKeys) {
    try {
      worklogLists.push(await getIssueWorklogs(issueKey, session));
    } catch (error) {
      throw new JiraError(
        `Không kiểm tra đầy đủ worklog của ${issueKey}; tạm dừng để tránh log trùng thời gian.`,
        error.status || 502,
        error.details || null
      );
    }
  }

  const flat = worklogLists.flat();
  const occupied = mergeRanges(normalizeExistingWorklogs(flat, date, identityContext(me, session)));
  return {
    occupied,
    issueKeys,
    checkedWorklogs: flat.length
  };
}

module.exports = { loadOccupiedRanges, identityContext };
