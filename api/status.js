'use strict';

const { sendJson, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const { getMyself, JiraError } = require('../lib/jira');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const session = getSession(req);
  if (!session) return sendJson(res, 200, { ok: true, authenticated: false });
  try {
    const me = await getMyself(session);
    return sendJson(res, 200, {
      ok: true,
      authenticated: true,
      user: { displayName: me?.displayName || me?.name || session.username, username: me?.name || session.username }
    });
  } catch (error) {
    if (error instanceof JiraError && error.status === 401) {
      res.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(res, 200, { ok: true, authenticated: false, expired: true });
    }
    return sendJson(res, 502, { ok: false, error: 'Không kiểm tra được phiên Jira.' });
  }
};
