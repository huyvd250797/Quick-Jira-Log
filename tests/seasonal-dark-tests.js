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
let panelOpen = false;
let syncPage;
const context = vm.createContext({
  MutationObserver: class { constructor(callback) { syncPage = callback; } observe() {} },
  state, STORAGE: {theme: 'preference'}, $: element,
  document: {
    documentElement: root,
    body: {classList: {contains: () => false}, dataset: {}},
    querySelectorAll: () => [],
    querySelector: selector => selector.startsWith('dialog') ? (panelOpen ? {} : null) : element('meta')
  },
  localStorage: {getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value)},
  window: {addEventListener: (event, run) => listeners.set(event, run)},
  showToast() {}
});
vm.runInContext(source.slice(start, end), context);
context.applyTheme('light');
assert.equal(root.dataset.theme, 'light');
assert.equal(saved.get('preference'), 'light');
assert(!element('themeBtn').disabled);
context.toggleTheme();
assert.equal(root.dataset.theme, 'dark');
assert.equal(saved.get('preference'), 'dark');
context.toggleTheme();
assert.equal(root.dataset.theme, 'light');
assert.equal(saved.get('preference'), 'light');
delete root.dataset.seasonal;
listeners.get('qjl-seasonal-change')();
assert.equal(root.dataset.theme, 'light');
root.dataset.seasonal = 'teachers';
listeners.get('qjl-seasonal-change')();
assert.equal(root.dataset.theme, 'light');
assert(!element('lightThemeBtn').disabled);
const css = fs.readFileSync(path.join(__dirname, '..', 'seasonal-themes.css'), 'utf8');
assert.match(css, /html\[data-theme="dark"\]\[data-seasonal\],[^{]*\{\s*--season-bg: var\(--season-dark\)/);
console.log('Theme preference remains switchable with active themes; home palette follows the selected mode.');
