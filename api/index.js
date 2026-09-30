'use strict';

const handlers = Object.freeze({
  'login': require('../handlers/login'),
  'logout': require('../handlers/logout'),
  'status': require('../handlers/status'),
  'subtasks': require('../handlers/subtasks'),
  'issue-info': require('../handlers/issue-info'),
  'worklog': require('../handlers/worklog'),
  'bulk-worklog': require('../handlers/bulk-worklog'),
  'day-audit': require('../handlers/day-audit'),
  'worklog-history': require('../handlers/worklog-history'),
  'worklog-correction': require('../handlers/worklog-correction'),
  'worklog-preview': require('../handlers/worklog-preview')
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

  return target(req, res);
};
