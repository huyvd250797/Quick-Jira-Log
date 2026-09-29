'use strict';

const { sendJson, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const { getMyself, JiraError } = require('../lib/jira');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const session = getSession(req);
  if (!session) return sendJson(res, 200, { ok: true, authenticated: false });

  // V0.8.0: encrypted app session is enough to enter the app instantly.
  // Jira will still validate the session on the next real API call.
  if (session.me?.name || session.me?.displayName || session.username) {
    return sendJson(res, 200, {
      ok: true, authenticated: true,
      user: {
        displayName: session.me?.displayName || session.me?.name || session.username,
        username: session.me?.name || session.username
      },
      fastSession: true
    });
  }

  // Compatibility with cookies created by V0.7.0.
  try {
    const me = await getMyself(session);
    return sendJson(res, 200, {
      ok: true, authenticated: true,
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
