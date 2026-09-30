'use strict';

const { sendJson, readJson, assertSameOrigin, methodNotAllowed } = require('../lib/http');
const { createSessionCookie } = require('../lib/session');
const { loginWithPassword, JiraError } = require('../lib/jira');
const { hit, reset } = require('../lib/rate-limit');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!assertSameOrigin(req)) return sendJson(res, 403, { ok: false, error: 'INVALID_ORIGIN' });

  try {
    const body = await readJson(req, 8 * 1024);
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    if (!username || !password) return sendJson(res, 400, { ok: false, error: 'Vui lòng nhập ID và mật khẩu Jira.' });

    const gate = hit(req, 'login', username, { limit: 8, windowMs: 5 * 60 * 1000 });
    if (!gate.allowed) {
      res.setHeader('Retry-After', String(gate.retryAfterSeconds));
      return sendJson(res, 429, { ok: false, error: `Đăng nhập quá nhiều lần. Hãy thử lại sau ${gate.retryAfterSeconds}s.` });
    }

    const { auth, me } = await loginWithPassword(username, password);
    reset(req, 'login', username);
    const sessionPayload = {
      ...auth,
      me: {
        displayName: me?.displayName || me?.name || username,
        name: me?.name || username,
        key: me?.key || '',
        accountId: me?.accountId || '',
        emailAddress: me?.emailAddress || ''
      }
    };
    res.setHeader('Set-Cookie', createSessionCookie(sessionPayload));
    return sendJson(res, 200, {
      ok: true,
      user: { displayName: me?.displayName || me?.name || username, username: me?.name || username }
    });
  } catch (error) {
    if (error?.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { ok: false, error: 'Dữ liệu đăng nhập không hợp lệ.' });
    if (error?.message === 'INVALID_JSON') return sendJson(res, 400, { ok: false, error: 'Dữ liệu đăng nhập không hợp lệ.' });
    if (error?.code === 'APP_SESSION_SECRET_MISSING') {
      return sendJson(res, 500, { ok: false, error: 'Server chưa cấu hình APP_SESSION_SECRET.' });
    }
    if (error instanceof JiraError) return sendJson(res, error.status || 500, { ok: false, error: error.message });
    return sendJson(res, 500, { ok: false, error: 'Đăng nhập thất bại.' });
  }
};
