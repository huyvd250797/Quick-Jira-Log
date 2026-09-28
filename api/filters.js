'use strict';

const { sendJson, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const { FILTER_MAX_FILTERS } = require('../lib/config');
const { JiraError, listSelectableFilters } = require('../lib/jira');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const session = getSession(req);
  if (!session) return sendJson(res, 401, { ok: false, error: 'Vui lòng đăng nhập Jira.' });

  try {
    const filters = await listSelectableFilters(session, FILTER_MAX_FILTERS);
    return sendJson(res, 200, {
      ok: true,
      filters: filters.map(filter => ({
        id: String(filter?.id || ''),
        name: String(filter?.name || `Filter ${filter?.id || ''}`),
        favourite: filter?.favourite === true,
        owner: filter?.owner?.displayName || filter?.owner?.name || ''
      })).filter(filter => filter.id)
    });
  } catch (error) {
    if (error instanceof JiraError) {
      if (error.status === 401) res.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(res, error.status || 500, { ok: false, error: error.message, details: error.details || undefined });
    }
    return sendJson(res, 500, { ok: false, error: 'Không tải được danh sách Jira Filter.' });
  }
};
