'use strict';

const assert = require('assert');
const { loginWithPassword } = require('../lib/jira');

const originalFetch = global.fetch;
const makeResponse = (body, status, headers = {}) => new Response(
  body == null ? null : JSON.stringify(body),
  { status, headers: { 'content-type': 'application/json', ...headers } }
);

(async () => {
  try {
    // Sai password: tuyệt đối không gọi /myself fallback => 1 failed attempt cho 1 lần bấm Login.
    let calls = [];
    global.fetch = async (url, options = {}) => {
      calls.push({ url: String(url), method: String(options.method || 'GET').toUpperCase() });
      return makeResponse({ errorMessages: ['Login failed'] }, 401);
    };
    await assert.rejects(
      () => loginWithPassword('user', 'wrong'),
      error => error?.code === 'JIRA_INVALID_CREDENTIALS' && error?.status === 401
    );
    assert.equal(calls.length, 1);
    assert(calls[0].url.includes('/rest/auth/1/session'));

    // CAPTCHA: nhận diện X-Seraph-LoginReason và cũng dừng sau 1 request.
    calls = [];
    global.fetch = async (url, options = {}) => {
      calls.push({ url: String(url), method: String(options.method || 'GET').toUpperCase() });
      return makeResponse({}, 403, { 'x-seraph-loginreason': 'AUTHENTICATION_DENIED' });
    };
    await assert.rejects(
      () => loginWithPassword('user', 'pass'),
      error => error?.code === 'JIRA_CAPTCHA_REQUIRED' && error?.details?.jiraUrl === 'https://task.ascvn.com.vn'
    );
    assert.equal(calls.length, 1);

    // Endpoint session không hỗ trợ: mới được fallback Basic và đăng nhập thành công.
    calls = [];
    global.fetch = async (url, options = {}) => {
      calls.push({ url: String(url), method: String(options.method || 'GET').toUpperCase() });
      if (String(url).includes('/rest/auth/1/session')) return makeResponse({}, 404);
      if (String(url).includes('/rest/api/2/myself')) return makeResponse({ name: 'user', displayName: 'User' }, 200);
      throw new Error(`Unexpected fetch ${url}`);
    };
    const basicResult = await loginWithPassword('user', 'pass');
    assert.equal(basicResult.auth.mode, 'basic');
    assert.equal(calls.length, 2);

    // Session login thành công nhưng /myself bị 403 => phân loại quyền REST, không báo sai password.
    calls = [];
    global.fetch = async (url, options = {}) => {
      calls.push({ url: String(url), method: String(options.method || 'GET').toUpperCase() });
      if (String(url).includes('/rest/auth/1/session')) return makeResponse({ session: { name: 'JSESSIONID', value: 'abc' } }, 200);
      if (String(url).includes('/rest/api/2/myself')) return makeResponse({ message: 'Forbidden' }, 403);
      throw new Error(`Unexpected fetch ${url}`);
    };
    await assert.rejects(
      () => loginWithPassword('user', 'pass'),
      error => error?.code === 'JIRA_REST_PERMISSION_DENIED' && error?.status === 403
    );
    assert.equal(calls.length, 2);

    console.log('V1.6.3 Jira auth integration tests passed.');
  } finally {
    global.fetch = originalFetch;
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
