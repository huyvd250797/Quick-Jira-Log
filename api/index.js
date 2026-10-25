'use strict';
const { withJiraReadScope } = require('../lib/jira-read-scope');

const handlers = Object.freeze({
  'project-stats': require('../handlers/project-stats'),
  'login': require('../handlers/login'),
  'logout': require('../handlers/logout'),
  'status': require('../handlers/status'),
  'subtasks': require('../handlers/subtasks'),
  'issue-info': require('../handlers/issue-info'),
  'jira-type-icon': require('../handlers/jira-working-tree'),
  'jira-working-tree': require('../handlers/jira-working-tree'),
  'jira-search': require('../handlers/jira-search'),
  'jira-saved-filters': require('../handlers/jira-filters'),
  'jira-filter-issues': require('../handlers/jira-filters'),
  'jira-search-options': require('../handlers/jira-search'),
  'jira-issue': require('../handlers/jira-issue'),
  'jira-attachments': require('../handlers/jira-attachments'),
  'jira-attachment-content': require('../handlers/jira-attachments'),
  'jira-attachment-upload': require('../handlers/jira-attachments'),
  'jira-issue-subtasks': require('../handlers/jira-issue'),
  'jira-issue-worklogs': require('../handlers/jira-issue'),
  'jira-update-options': require('../handlers/jira-quick-update'),
  'jira-update-users': require('../handlers/jira-quick-update'),
  'jira-comments': require('../handlers/jira-quick-update'),
  'jira-update': require('../handlers/jira-quick-update'),
  'jira-subtask-edit-options': require('../handlers/jira-subtask-edit'),
  'jira-subtask-edit': require('../handlers/jira-subtask-edit'),
  'jira-parent-edit-options': require('../handlers/jira-subtask-edit'),
  'jira-parent-edit': require('../handlers/jira-subtask-edit'),
  'jira-description-edit-options': require('../handlers/jira-subtask-edit'),
  'jira-description-edit': require('../handlers/jira-subtask-edit'),
  'jira-create-projects': require('../handlers/jira-create'),
  'jira-create-types': require('../handlers/jira-create'),
  'jira-create-meta': require('../handlers/jira-create'),
  'jira-create-subtask-context': require('../handlers/jira-create'),
  'jira-create-users': require('../handlers/jira-create'),
  'jira-create-reporters': require('../handlers/jira-create'),
  'jira-create-parents': require('../handlers/jira-create'),
  'jira-create': require('../handlers/jira-create'),
  'worklog': require('../handlers/worklog'),
  'bulk-worklog': require('../handlers/bulk-worklog'),
  'day-audit': require('../handlers/day-audit'),
  'worklog-history': require('../handlers/worklog-history'),
  'calendar-users': require('../handlers/calendar-users'),
  'calendar-history': require('../handlers/calendar-history'),
  'calendar-split': require('../handlers/calendar-split'),
  'calendar-moves': require('../handlers/calendar-moves'),
  'worklog-correction': require('../handlers/worklog-correction')
});

module.exports = async function handler(req, res) {
  const url = new URL(req.url || '/api', 'http://localhost');
  req.query = Object.assign(Object.fromEntries(url.searchParams.entries()), req.query || {});
  const action = String(req.query.action || '').trim();
  const target = handlers[action];

  if (!target) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify({ ok: false, error: 'API_NOT_FOUND' }));
  }

  return withJiraReadScope(() => target(req, res));
};
