'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const strips = [];
const gradient = { addColorStop() {} };
const context2d = {
  createLinearGradient: () => gradient,
  fillRect() {}, beginPath() {}, lineTo() {}, closePath() {}, arc() {}, fill() {},
  clearRect() { strips.length = 0; },
  drawImage(...args) { strips.push(args.slice(1)); }
};
let motion = true;
let next;
const html = { hasAttribute: () => motion };
const document = {
  hidden: false, documentElement: html,
  createElement: () => ({ getContext: () => context2d }),
  getElementById: () => null,
  querySelector: () => null
};
const flag = { getContext: () => context2d, closest: () => null, isConnected: true };
const window = {};
const browser = {
  window, document, requestAnimationFrame: callback => { next = callback; return 1; }
};
const source = fs.readFileSync(path.join(__dirname, '..', 'seasonal-scenes.js'), 'utf8');
vm.runInNewContext(source, browser);
const art = window.QuickJiraSeasonalScenes;
const mount = { querySelector: () => flag };
function tick(ms) { const callback = next; next = null; callback(ms); }
art.mount(mount, 'april', 0);
assert.equal(strips.length, 42);
const initial = strips.map(strip => strip.slice());
tick(100);
tick(116.67);
assert.notDeepEqual(initial.at(-1), strips.at(-1));
assert.deepEqual(initial[0], strips[0], 'Cloth remains pinned at the pole');
motion = false;
const stopped = strips.map(strip => strip.slice());
tick(133.34);
assert.deepEqual(strips, stopped);
assert.equal(next, null);
motion = true;
document.hidden = true;
art.refresh();
tick(150);
assert.deepEqual(strips, stopped);
assert.equal(next, null);
document.hidden = false;
flag.isConnected = false;
art.refresh();
assert.equal(next, null);
assert.match(art.scene('christmas', 0), /seasonal-snow/);
assert.match(art.scene('christmas', 1), /seasonal-snow/);
console.log('Flag canvas: true strip deformation, anchored pole edge, motion off, hidden-tab pause and unmount cleanup passed.');
