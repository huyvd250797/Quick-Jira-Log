'use strict';

const { sendJson, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const { JIRA_FILTER_NAME, FILTER_MAX_ISSUES } = require('../lib/config');
const { JiraError, resolveFilterByName, searchFilterIssues } = require('../lib/jira');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const session = getSession(req);
  if (!session) return sendJson(res, 401, { ok: false, error: 'Vui lòng đăng nhập Jira.' });

  try {
    const filter = await resolveFilterByName(JIRA_FILTER_NAME, session);
    const result = await searchFilterIssues(filter, session, FILTER_MAX_ISSUES);
    const issues = result.issues.map(issue => ({
      id: issue?.id || '',
      key: issue?.key || '',
      summary: issue?.fields?.summary || '',
      project: issue?.fields?.project?.key || '',
      status: issue?.fields?.status?.name || '',
      issueType: issue?.fields?.issuetype?.name || '',
      priority: issue?.fields?.priority?.name || ''
    })).filter(issue => issue.key);

    return sendJson(res, 200, {
      ok: true,
      filter: {
        id: String(filter?.id || ''),
        name: filter?.name || JIRA_FILTER_NAME
      },
      count: issues.length,
      total: result.total,
      truncated: result.truncated,
      issues
    });
  } catch (error) {
    if (error instanceof JiraError) {
      if (error.status === 401) res.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(res, error.status || 500, {
        ok: false,
        error: error.message,
        details: error.details || undefined
      });
    }
    return sendJson(res, 500, { ok: false, error: 'Không tải được danh sách issue từ Jira Filter.' });
  }
};
