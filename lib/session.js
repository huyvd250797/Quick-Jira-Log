'use strict';

const crypto = require('crypto');

const COOKIE_NAME = 'qjl_session';

function getSecret() {
  const secret = String(process.env.APP_SESSION_SECRET || '');
  if (secret.length < 32) {
    const err = new Error('APP_SESSION_SECRET_MISSING');
    err.code = 'APP_SESSION_SECRET_MISSING';
    throw err;
  }
  return crypto.createHash('sha256').update(secret).digest();
}

function seal(payload) {
  const key = getSecret();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

function unseal(token) {
  try {
    const key = getSecret();
    const raw = Buffer.from(token, 'base64url');
    if (raw.length < 29) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    const data = JSON.parse(plaintext);
    if (!data || !data.exp || Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const out = {};
  const raw = String(req.headers.cookie || '');
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function getSession(req) {
  const token = parseCookies(req)[COOKIE_NAME];
  return token ? unseal(token) : null;
}

function createSessionCookie(auth) {
  const maxAge = Math.max(900, Number(process.env.SESSION_MAX_AGE_SECONDS || 43200));
  const now = Date.now();
  const token = seal({ ...auth, iat: now, exp: now + maxAge * 1000 });
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict; Priority=High`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Priority=High`;
}

module.exports = { getSession, createSessionCookie, clearSessionCookie };
