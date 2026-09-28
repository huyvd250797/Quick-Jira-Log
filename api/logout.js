'use strict';

const { sendJson, assertSameOrigin, methodNotAllowed } = require('../lib/http');
const { clearSessionCookie } = require('../lib/session');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!assertSameOrigin(req)) return sendJson(res, 403, { ok: false, error: 'INVALID_ORIGIN' });
  res.setHeader('Set-Cookie', clearSessionCookie());
  return sendJson(res, 200, { ok: true });
};
