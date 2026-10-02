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
    const captchaRetry = body.captchaRetry === true;
    if (!username || !password) return sendJson(res, 400, { ok: false, error: 'Vui lòng nhập ID và mật khẩu Jira.', code: 'LOGIN_FIELDS_REQUIRED' });

    // Hai lớp bảo vệ: burst guard giúp tránh đẩy Jira vào CAPTCHA; broad guard chặn spam dài hơn.
    // Nút "Tôi đã xác minh – Thử lại" có một scope riêng để người dùng không bị kẹt bởi burst guard cũ.
    const burstGate = await hit(req, captchaRetry ? 'login-captcha-retry' : 'login-burst', username, { limit: captchaRetry ? 1 : 2, windowMs: captchaRetry ? 15 * 1000 : 30 * 1000 });
    if (!burstGate.allowed) {
      res.setHeader('Retry-After', String(burstGate.retryAfterSeconds));
      return sendJson(res, 429, {
        ok: false,
        error: `Đăng nhập đang được tạm khóa để tránh Jira kích hoạt CAPTCHA. Hãy thử lại sau ${burstGate.retryAfterSeconds}s.`,
        code: 'LOGIN_COOLDOWN',
        retryAfterSeconds: burstGate.retryAfterSeconds
      });
    }

    const broadGate = await hit(req, 'login', username, { limit: 6, windowMs: 5 * 60 * 1000 });
    if (!broadGate.allowed) {
      res.setHeader('Retry-After', String(broadGate.retryAfterSeconds));
      return sendJson(res, 429, {
        ok: false,
        error: `Đăng nhập quá nhiều lần. Hãy thử lại sau ${broadGate.retryAfterSeconds}s.`,
        code: 'LOGIN_RATE_LIMITED',
        retryAfterSeconds: broadGate.retryAfterSeconds
      });
    }

    const { auth, me } = await loginWithPassword(username, password);
    await Promise.all([
      reset(req, 'login', username),
      reset(req, 'login-burst', username),
      reset(req, 'login-captcha-retry', username)
    ]);
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
    if (error instanceof JiraError) {
      const details = error.details && typeof error.details === 'object' ? error.details : null;
      return sendJson(res, error.status || 500, {
        ok: false,
        error: error.message,
        code: error.code || 'JIRA_ERROR',
        jiraUrl: details?.jiraUrl || null,
        details
      });
    }
    return sendJson(res, 500, { ok: false, error: 'Đăng nhập thất bại.' });
  }
};
