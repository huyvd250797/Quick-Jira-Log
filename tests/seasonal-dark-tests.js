'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const start = source.indexOf('function readThemePreference()');
const end = source.indexOf('function loadQuickData()', start);
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    classList: { toggle() {} }, setAttribute(name, value) { this[name] = value; }
  });
  return elements.get(id);
}
const saved = new Map([['preference', 'light']]);
const root = { dataset: {seasonal: 'moon'}, style: {} };
const state = {};
const listeners = new Map();
const context = vm.createContext({
  state, STORAGE: {theme: 'preference'}, $: element,
  document: {documentElement: root, querySelector: () => element('meta')},
  localStorage: {getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value)},
  window: {addEventListener: (event, run) => listeners.set(event, run)},
  showToast() {}
});
vm.runInContext(source.slice(start, end), context);
context.applyTheme('light');
assert.equal(root.dataset.theme, 'dark');
assert.equal(saved.get('preference'), 'light');
assert(element('themeBtn').disabled);
assert(element('lightThemeBtn').disabled);
delete root.dataset.seasonal;
listeners.get('qjl-seasonal-change')();
assert.equal(root.dataset.theme, 'light');
assert(!element('themeBtn').disabled);
context.applyTheme('dark');
assert.equal(saved.get('preference'), 'dark');
root.dataset.seasonal = 'teachers';
listeners.get('qjl-seasonal-change')();
assert.equal(root.dataset.theme, 'dark');
context.toggleTheme();
assert.equal(saved.get('preference'), 'dark');
delete root.dataset.seasonal;
listeners.get('qjl-seasonal-change')();
assert.equal(state.theme, 'dark');
console.log('Seasonal dark mode: active override, disabled controls, persisted preference and expiry restoration passed.');
