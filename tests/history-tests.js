'use strict';

const assert = require('assert');
const { getIssuesByKeys } = require('../lib/jira');

const originalFetch = global.fetch;

(async () => {
  try {
    const calls = [];
    global.fetch = async (url, options = {}) => {
      calls.push({ url: String(url), method: String(options.method || 'GET').toUpperCase(), body: options.body || '' });
      const payload = options.body ? JSON.parse(options.body) : {};
      const count = Math.max(0, Number(payload.maxResults || 0));
      const issues = Array.from({ length: count }, (_, index) => ({
        key: `TEST-${calls.length}-${index + 1}`,
        fields: { project: { key: 'TEST' }, summary: 'History batch', status: { name: 'Done' } }
      }));
      return new Response(JSON.stringify({ issues, total: issues.length }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    };

    const keys = Array.from({ length: 150 }, (_, index) => `ABC-${index + 1}`);
    const issues = await getIssuesByKeys(keys, { mode: 'basic', username: 'u', password: 'p' });
    assert.equal(calls.length, 2, '150 issue metadata must be loaded in only 2 Jira search requests');
    assert(calls.every(call => call.method === 'POST' && call.url.includes('/rest/api/2/search')));
    assert.equal(issues.length, 150);
    console.log('V1.7.3 fast history batch metadata integration test passed.');
  } finally {
    global.fetch = originalFetch;
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
