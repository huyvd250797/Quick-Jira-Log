'use strict';

// Only return short structured Jira messages, never HTML, cookies or credentials.
function safeMessage(data, auth) {
  const messages = Array.isArray(data?.errorMessages) ? [...data.errorMessages] : [];
  if (typeof data?.message === 'string') messages.push(data.message);
  if (typeof data?.error === 'string') messages.push(data.error);
  if (data?.errors && typeof data.errors === 'object') messages.push(...Object.values(data.errors).filter(v => typeof v === 'string'));
  let text = messages.filter(v => typeof v === 'string').join(' · ').replace(/<[^>]*>/g, ' ').replace(/[\r\n\t]+/g, ' ');
  const credentials = [auth?.password, auth?.cookie, auth?.worklogproAuth?.password, process.env.APP_SESSION_SECRET];
  for (const entry of String(auth?.cookie || '').split(';')) { const split = entry.indexOf('='); if (split >= 0) credentials.push(entry.slice(split + 1).trim()); }
  if (auth?.username && auth?.password) credentials.push(Buffer.from(`${auth.username}:${auth.password}`).toString('base64'));
  if (auth?.worklogproAuth?.username && auth?.worklogproAuth?.password) credentials.push(Buffer.from(`${auth.worklogproAuth.username}:${auth.worklogproAuth.password}`).toString('base64'));
  for (const secret of credentials.filter(Boolean).sort((a,b)=>String(b).length-String(a).length)) text = text.split(String(secret)).join('[đã ẩn]');
  text = text.replace(/(?:authorization|cookie|password|token)\s*[:=]\s*\S+/gi, '[đã ẩn]');
  return text.trim().slice(0, 350);
}
function diagnostics({ provider, stage, method, endpoint, response, data, auth }) {
  const raw = String(data?.raw || '');
  const loginReason = String(response?.headers?.get?.('x-seraph-loginreason') || '').toUpperCase();
  const anonymous = response?.headers?.get?.('x-ausername') === 'anonymous';
  return {
    provider, stage, method, endpoint, status: response.status,
    ...(safeMessage(data, auth) ? { jiraMessage: safeMessage(data, auth) } : {}),
    ...(loginReason ? { loginReason: loginReason.slice(0, 80) } : {}),
    ...(anonymous ? { authenticationUnrecognized: true } : {}),
    ...(/xsrf|csrf/i.test(raw + JSON.stringify(data?.errorMessages || [])) ? { xsrfRejected: true } : {})
  };
}
module.exports = { diagnostics };
