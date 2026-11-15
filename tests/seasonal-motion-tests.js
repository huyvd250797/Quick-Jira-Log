'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
let next, resize, elapsed, disposed;
let enabled = true;
const document = {
  hidden: false,
  documentElement: { hasAttribute: () => enabled },
  getElementById: () => null,
  querySelector: () => null
};
const image = { complete: true, naturalWidth: 960, addEventListener() {} };
const canvas = { isConnected: true, clientWidth: 310, clientHeight: 110,
  closest: () => null, classList: { add() {}, remove() {} }, addEventListener() {} };
const container = { querySelector: name => name === 'img' ? image : canvas };
const window = {};
const context = vm.createContext({
  window, document, requestAnimationFrame: callback => { next = callback; return 1; }
});
vm.runInContext(read('seasonal-shader.js'), context);
const { kinds } = window.QuickJiraSeasonalShader;
window.QuickJiraSeasonalShader.create = (surface, texture, theme, effect) => {
  assert.equal(surface, canvas);
  assert.equal(texture, image);
  assert.equal(theme, 'april');
  assert.equal(effect, 1);
  return {
    resize(w, h) { resize = [w, h]; },
    draw(seconds) { elapsed = seconds; return true; },
    dispose() { disposed = true; }
  };
};
vm.runInContext(read('seasonal-scenes.js'), context);
const art = window.QuickJiraSeasonalScenes;
function tick(ms) { const run = next; next = null; run(ms); }
art.mount(container, 'april', 1);
tick(100);
assert.deepEqual(resize, [310, 110]);
tick(116.6667);
assert(Math.abs(elapsed - 1 / 60) < .000001, 'The renderer receives time in seconds.');
enabled = false;
tick(133.3334);
assert.equal(next, null);
assert(elapsed < .02);
enabled = true;
document.hidden = true;
art.refresh();
tick(150);
assert.equal(next, null);
document.hidden = false;
canvas.isConnected = false;
art.refresh();
assert.equal(next, null);
assert(disposed);
assert.equal(Object.keys(kinds).length, 5);
assert.match(art.scene('april', 0), /april\.webp/);
assert.match(art.scene('birthday', 0), /data-seasonal-surface/);
assert.match(art.scene('birthday', 1), /seasonal-confetti/);
assert.match(art.scene('halloween', 0), /seasonal-bat-left/);
assert.match(art.scene('halloween', 1), /seasonal-bat-right/);
assert.match(art.scene('christmas', 0), /seasonal-snow/);
console.log('Seasonal motion: source artwork, frame timing, disabled and hidden playback, cleanup, candle and bat and snow layers passed.');

// Simulate a browser with WebGL disabled and verify the media lifecycle.
window.QuickJiraSeasonalShader.create = () => null;
let played = 0;
let unloaded = false;
const video = {
  paused: true,
  setAttribute() {},
  classList: { add() {}, remove() {} },
  addEventListener() {},
  play() { played += 1; this.paused = false; return Promise.resolve(); },
  pause() { this.paused = true; },
  removeAttribute(name) { assert.equal(name, 'src'); this.src = ''; },
  load() { unloaded = true; }
};
document.createElement = name => { assert.equal(name, 'video'); return video; };
canvas.after = attached => assert.equal(attached, video);
canvas.isConnected = true;
art.mount(container, 'april', 1);
tick(200);
assert.equal(video.src, '/seasonal-motion/april-1.mp4');
assert.equal(played, 1);
assert.equal(video.muted, true);
assert.equal(video.playsInline, true);
assert.equal(next, null, 'Media playback does not keep a JavaScript frame loop');
enabled = false;
art.refresh();
tick(216.67);
assert(video.paused);
canvas.isConnected = false;
art.refresh();
assert(unloaded);
console.log('Media fallback selects the matching 60 FPS loop, pauses and unloads it.');
