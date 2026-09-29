'use strict';

const { sendJson, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const { FILTER_MAX_ISSUES, WORKLOG_SUBTASK_JQL } = require('../lib/config');
const { JiraError, searchWorklogCandidateSubtasks } = require('../lib/jira');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const session = getSession(req);
  if (!session) return sendJson(res, 401, { ok: false, error: 'Vui lòng đăng nhập Jira.' });

  try {
    const result = await searchWorklogCandidateSubtasks(session, FILTER_MAX_ISSUES);
    const issues = result.issues.map(issue => ({
      id: issue?.id || '',
      key: issue?.key || '',
      summary: issue?.fields?.summary || '',
      project: issue?.fields?.project?.key || '',
      status: issue?.fields?.status?.name || '',
      issueType: issue?.fields?.issuetype?.name || '',
      priority: issue?.fields?.priority?.name || '',
      timeSpentSeconds: Number(issue?.fields?.timespent || 0),
      created: issue?.fields?.created || ''
    })).filter(issue => issue.key);

    return sendJson(res, 200, {
      ok: true,
      source: 'fixed-jql',
      query: WORKLOG_SUBTASK_JQL,
      count: issues.length,
      total: result.total,
      truncated: result.truncated,
      issues
    });
  } catch (error) {
    if (error instanceof JiraError) {
      if (error.status === 401) res.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(res, error.status || 500, { ok: false, error: error.message, details: error.details || undefined });
    }
    return sendJson(res, 500, { ok: false, error: 'Không tải được danh sách Sub-task chưa logwork.' });
  }
};
