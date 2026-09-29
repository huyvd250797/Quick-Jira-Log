'use strict';

const { sendJson, readJson, assertSameOrigin, methodNotAllowed } = require('../lib/http');
const { createSessionCookie } = require('../lib/session');
const { loginWithPassword, JiraError } = require('../lib/jira');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!assertSameOrigin(req)) return sendJson(res, 403, { ok: false, error: 'INVALID_ORIGIN' });

  try {
    const body = await readJson(req);
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    if (!username || !password) return sendJson(res, 400, { ok: false, error: 'Vui lòng nhập ID và mật khẩu Jira.' });

    const { auth, me } = await loginWithPassword(username, password);
    const sessionPayload = { ...auth, me: { displayName: me?.displayName || me?.name || username, name: me?.name || username, key: me?.key || '', accountId: me?.accountId || '', emailAddress: me?.emailAddress || '' } };
    res.setHeader('Set-Cookie', createSessionCookie(sessionPayload));
    return sendJson(res, 200, {
      ok: true,
      user: {
        displayName: me?.displayName || me?.name || username,
        username: me?.name || username
      }
    });
  } catch (error) {
    if (error?.code === 'APP_SESSION_SECRET_MISSING') {
      return sendJson(res, 500, { ok: false, error: 'Server chưa cấu hình APP_SESSION_SECRET.' });
    }
    if (error instanceof JiraError) return sendJson(res, error.status || 500, { ok: false, error: error.message });
    return sendJson(res, 500, { ok: false, error: 'Đăng nhập thất bại.' });
  }
};
