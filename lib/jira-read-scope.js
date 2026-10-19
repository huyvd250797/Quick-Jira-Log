'use strict';
const { AsyncLocalStorage } = require('node:async_hooks');
const { createHash } = require('node:crypto');
const scopes = new AsyncLocalStorage();

function withJiraReadScope(work) {
  return scopes.run({ pending: new Map(), searchGet: new Set() }, work);
}
function currentJiraReadScope() { return scopes.getStore(); }
function invalidatePendingJiraReads() { scopes.getStore()?.pending.clear(); }
function readIdentity(value) {
  // Keep credentials and cookies out of map keys, diagnostics and responses.
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function authIdentity(auth) {
  return readIdentity([auth?.mode, auth?.username, auth?.password, auth?.cookie]);
}
module.exports = { withJiraReadScope, currentJiraReadScope, invalidatePendingJiraReads, readIdentity, authIdentity };
