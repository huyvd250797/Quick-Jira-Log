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

    // 401 + AUTHENTICATED_FAILED: vẫn chỉ là sai thông tin đăng nhập, KHÔNG được báo CAPTCHA.
    calls = [];
    global.fetch = async (url, options = {}) => {
      calls.push({ url: String(url), method: String(options.method || 'GET').toUpperCase() });
      return makeResponse({ errorMessages: ['Login failed'] }, 401, { 'x-seraph-loginreason': 'AUTHENTICATED_FAILED' });
    };
    await assert.rejects(
      () => loginWithPassword('user', 'wrong-1'),
      error => error?.code === 'JIRA_INVALID_CREDENTIALS' && error?.status === 401
    );
    assert.equal(calls.length, 1);

    // 401 + AUTHENTICATION_FAILED: cũng là sai thông tin đăng nhập, KHÔNG được báo CAPTCHA.
    calls = [];
    global.fetch = async (url, options = {}) => {
      calls.push({ url: String(url), method: String(options.method || 'GET').toUpperCase() });
      return makeResponse({ errorMessages: ['Login failed'] }, 401, { 'x-seraph-loginreason': 'AUTHENTICATION_FAILED' });
    };
    await assert.rejects(
      () => loginWithPassword('user', 'wrong-2'),
      error => error?.code === 'JIRA_INVALID_CREDENTIALS' && error?.status === 401
    );
    assert.equal(calls.length, 1);

    // 403 + AUTHENTICATION_DENIED: Jira đã chuyển sang CAPTCHA/xác minh bảo mật.
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

    // Regression: nhiều lần sai pass vẫn báo sai credentials; chỉ khi Jira thật sự
    // trả AUTHENTICATION_DENIED thì mới chuyển sang CAPTCHA. Mỗi lần bấm Login = 1 request.
    calls = [];
    let loginAttempt = 0;
    global.fetch = async (url, options = {}) => {
      calls.push({ url: String(url), method: String(options.method || 'GET').toUpperCase() });
      loginAttempt += 1;
      if (loginAttempt === 1) return makeResponse({}, 401, { 'x-seraph-loginreason': 'AUTHENTICATED_FAILED' });
      if (loginAttempt === 2) return makeResponse({}, 401, { 'x-seraph-loginreason': 'AUTHENTICATION_FAILED' });
      return makeResponse({}, 403, { 'x-seraph-loginreason': 'AUTHENTICATION_DENIED' });
    };
    await assert.rejects(() => loginWithPassword('user', 'wrong-1'), error => error?.code === 'JIRA_INVALID_CREDENTIALS');
    await assert.rejects(() => loginWithPassword('user', 'wrong-2'), error => error?.code === 'JIRA_INVALID_CREDENTIALS');
    await assert.rejects(() => loginWithPassword('user', 'wrong-3'), error => error?.code === 'JIRA_CAPTCHA_REQUIRED');
    assert.equal(calls.length, 3);
    assert(calls.every(call => call.url.includes('/rest/auth/1/session')));

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

    console.log('V1.6.5 Jira auth classification integration tests passed.');
  } finally {
    global.fetch = originalFetch;
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
