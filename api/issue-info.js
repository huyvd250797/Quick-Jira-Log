'use strict';

const { sendJson, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const { JiraError, getIssue } = require('../lib/jira');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const session = getSession(req);
  if (!session) return sendJson(res, 401, { ok: false, error: 'Vui lòng đăng nhập Jira.' });

  const key = String(req.query?.key || '').trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_]*-\d+$/.test(key)) {
    return sendJson(res, 400, { ok: false, error: 'KEY Jira không hợp lệ.' });
  }

  try {
    const issue = await getIssue(key, session);
    return sendJson(res, 200, {
      ok: true,
      issue: {
        key: issue?.key || key,
        project: issue?.fields?.project?.key || '',
        summary: issue?.fields?.summary || ''
      }
    });
  } catch (error) {
    if (error instanceof JiraError) {
      if (error.status === 401) res.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(res, error.status || 500, { ok: false, error: error.message });
    }
    return sendJson(res, 500, { ok: false, error: 'Không đọc được thông tin issue.' });
  }
};
