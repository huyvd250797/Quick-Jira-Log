'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const lib = require('../lib/seasonal-calendar');
const root = path.join(__dirname, '..');
const read = filename => fs.readFileSync(path.join(root, filename), 'utf8');

class Element {
  constructor(id = '') {
    this.id = id;
    this.value = '';
    this.hidden = false;
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = {};
    this.scrollTop = 0;
    const classes = new Set();
    this.classList = {add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name)};
    this.scrollSurface = {scrollTop: 0};
  }
  addEventListener(type, callback) { this.listeners[type] = callback; }
  fire(type, details = {}) { this.listeners[type]?.({target: this, preventDefault() {}, ...details}); }
  replaceChildren(...children) { this.children = children; }
  querySelector() { return this.scrollSurface; }
  getAttribute(key) { return this.attributes.get(key); }
  focus() { this.focused = true; }
  setAttribute(key, value) { this.attributes.set(key, value); }
  toggleAttribute(key, force) { if (force) this.attributes.set(key, ''); else this.attributes.delete(key); }
  showModal() { this.open = true; }
  close() { this.open = false; this.fire('close'); }
  closest(selector) { return selector === '.seasonal-date-fields' && /seasonal(Annual|Once)/.test(this.id); }
}

const index = read('index.html');
const elements = new Map(Array.from(index.matchAll(/id="([^"]+)"/g), ([, id]) => [id, new Element(id)]));
const get = id => elements.get(id);
const html = new Element('html');
html.dataset.theme = 'dark';
const document = new Element('document');
const meta = new Element('meta');
document.documentElement = html;
document.getElementById = get;
const shell = new Element('shell');
document.querySelector = selector => selector === '.shell' ? shell : meta;

const reduced = new Element('reduced');
const window = new Element('window');
window.dispatchEvent = event => window.fire(event.type);
window.scrollTo = () => {};
window.lockOverlayBody = () => {};
window.unlockOverlayBody = () => {};
html.style = {};
const map = new Map();
let now = Date.parse('2026-12-19T16:59:59Z');
let nextMidnight;
window.QuickJiraSeasonal = {...lib, today: () => lib.today(now), untilMidnight: () => lib.untilMidnight(now)};
window.matchMedia = () => reduced;
const context = vm.createContext({window, document, Option: class Option {},
  localStorage: {getItem: key => map.get(key) || null, setItem: (key, value) => map.set(key, value)},
  Event: class Event { constructor(type) { this.type = type; } },
  getComputedStyle: () => ({getPropertyValue: () => '#091a36'}),
  setTimeout: (callback, delay) => { nextMidnight = {callback, delay}; },
  clearTimeout: () => { nextMidnight = null; }});
vm.runInContext(read('seasonal-shader.js'), context);
vm.runInContext(read('seasonal-collection.js'), context);
vm.runInContext(read('seasonal-scenes.js'), context);
vm.runInContext(read('seasonal-themes.js'), context);
const ui = window.QuickJiraSeasonalThemes;
const form = get('seasonalForm');
const change = (id, value, property = 'value') => {
  const target = get(id);
  target[property] = value;
  if (id === 'seasonalTheme') target.fire('change');
  form.fire('change', {target});
};

ui.setAccount({username: 'a', displayName: 'Account A'});
assert.equal(html.dataset.seasonal, undefined);
assert.equal(nextMidnight.delay, 1030);
now += nextMidnight.delay;
nextMidnight.callback();
assert.equal(html.dataset.seasonal, 'christmas');

assert(html.attributes.has('data-seasonal-motion'));
assert(get('seasonalHomeScene').innerHTML.includes('seasonal-snow'));
assert(get('seasonalTaskArt').innerHTML.includes('/seasonal-art/christmas.webp'));

get('seasonalOpenBtn').fire('click');
assert.equal(get('seasonalAccount').textContent, 'Account A');
change('seasonalTheme', 'birthday');
assert.equal(get('seasonalRepeatRow').hidden, true);
change('seasonalScheduleType', 'specific');
assert.equal(get('seasonalRepeatRow').hidden, false);
assert.equal(get('seasonalOnceFields').hidden, false);
change('seasonalRepeat', true, 'checked');
assert.equal(get('seasonalAnnualFields').hidden, false);
assert.equal(get('seasonalOnceFields').hidden, true);
form.fire('submit');
assert.equal(get('seasonalError').hidden, false);
assert(get('seasonalAnnualStart').focused);
change('seasonalAnnualStart', '20/12');
change('seasonalAnnualEnd', '20/12');
change('seasonalRepeat', false, 'checked');
assert.equal(get('seasonalOnceStart').value, '2026-12-20');
assert.equal(get('seasonalOnceEnd').value, '2026-12-20');
change('seasonalRepeat', true, 'checked');
change('seasonalRuleMotion', false, 'checked');

assert(html.attributes.has('data-seasonal-motion'));
form.fire('submit');
assert.equal(get('seasonalDialog').open, false);
get('seasonalOpenBtn').fire('click');
assert.equal(get('seasonalScheduleType').value, 'specific');
assert.equal(get('seasonalRepeat').checked, true);
assert.equal(get('seasonalAnnualStart').value, '20/12');
change('seasonalScheduleType', 'default');
assert.equal(get('seasonalRepeatRow').hidden, true);
assert.equal(get('seasonalAnnualFields').hidden, true);
get('seasonalCancel').fire('click');
assert.equal(html.dataset.seasonal, 'birthday');
assert(!html.attributes.has('data-seasonal-motion'));
assert.deepEqual(JSON.parse(map.get(lib.accountKey({username: 'a'}))).rules.birthday.schedule, {
  repeat: true, start: '12-20', end: '12-20'
});

ui.setAccount({username: 'b', displayName: 'Account B'});
assert.equal(html.dataset.seasonal, 'christmas');
get('seasonalOpenBtn').fire('click');
change('seasonalTheme', 'birthday');
assert.equal(get('seasonalScheduleType').value, 'default');
get('seasonalCancel').fire('click');
assert(!map.has(lib.accountKey({username: 'b'})));
reduced.matches = true;
reduced.fire('change');
assert(!html.attributes.has('data-seasonal-motion'));
reduced.matches = false;
reduced.fire('change');
assert(html.attributes.has('data-seasonal-motion'));
document.hidden = true;
document.fire('visibilitychange');
assert(!html.attributes.has('data-seasonal-motion'));
assert.equal(nextMidnight, null);
document.hidden = false;
document.fire('visibilitychange');
assert(html.attributes.has('data-seasonal-motion'));

get('seasonalOpenBtn').fire('click');
const key = lib.accountKey({username: 'b'});
map.set(key, JSON.stringify({rules: {christmas: {enabled: false}}}));
window.fire('storage', {key});
form.fire('submit');
assert.match(get('seasonalError').textContent, /tab khác/);
assert.equal(html.dataset.seasonal, undefined);
ui.setAccount({username: 'a'});
assert.equal(get('seasonalDialog').open, false);
assert.equal(html.dataset.seasonal, 'birthday');
ui.setAccount(null);
assert.equal(html.dataset.seasonal, 'christmas');
assert(get('seasonalBootScene').innerHTML.includes('seasonal-snow'));

// A V1.39.0 one-time range opens as specific and keeps its exact dates.
const priorKey = lib.accountKey({username: 'prior'});
map.set(priorKey, JSON.stringify({rules: {vacation: {schedule: {
  repeat: false, start: '2026-12-21', end: '2026-12-23'
}}}}));
ui.setAccount({username: 'prior'});
get('seasonalOpenBtn').fire('click');
change('seasonalTheme', 'vacation');
assert.equal(get('seasonalScheduleType').value, 'specific');
assert.equal(get('seasonalRepeat').checked, false);
assert.equal(get('seasonalOnceStart').value, '2026-12-21');
change('seasonalRepeat', true, 'checked');
assert.equal(get('seasonalAnnualStart').value, '21/12');
change('seasonalRepeat', false, 'checked');
form.fire('submit');
assert.deepEqual(JSON.parse(map.get(priorKey)).rules.vacation.schedule, {
  repeat: false, start: '2026-12-21', end: '2026-12-23'
});

assert(index.includes('id="seasonalPreview"'));
assert.equal(get('seasonalPreview').dataset.seasonal, 'vacation');
assert(!index.includes('Dữ liệu minh họa'));
get('seasonalOpenBtn').fire('click');
change('seasonalTheme', 'tet');
assert.equal(get('seasonalPreview').dataset.seasonal, 'tet');
assert(get('seasonalPreviewScene').innerHTML.includes('/seasonal-art/tet.webp'));
const storageBefore = JSON.stringify([...map]);
get('settingsOverlay').setAttribute('aria-hidden', 'false');
get('seasonalDialog').scrollSurface.scrollTop = 230;
get('seasonalShowPreviewBtn').fire('click');
assert.equal(ui.previewing, true);
assert.equal(html.dataset.seasonal, 'tet');
assert.equal(get('seasonalDialog').open, false);
assert.equal(shell.inert, true);
assert.equal(JSON.stringify([...map]), storageBefore, 'Preview must not save preferences');
document.fire('keydown', {key: 'Escape', stopImmediatePropagation() {}});
assert.equal(ui.previewing, false);
assert.equal(get('seasonalDialog').open, true);
assert.equal(shell.inert, false);
assert.equal(get('seasonalTheme').value, 'tet');
assert.equal(get('seasonalDialog').scrollSurface.scrollTop, 230);
assert.equal(JSON.stringify([...map]), storageBefore);
assert.notEqual(html.dataset.seasonal, 'tet');
get('seasonalShowPreviewBtn').fire('click');
get('seasonalStopPreviewBtn').fire('click');
assert(get('seasonalDialog').open);
assert.equal(ui.previewing, false);
get('seasonalCancel').fire('click');
// A newly-added theme follows the same account-scoped preview/save pipeline.
get('seasonalOpenBtn').fire('click');
change('seasonalTheme','national');
assert.equal(get('seasonalPreview').dataset.seasonal,'national');
assert(get('seasonalPreviewScene').innerHTML.includes('data-collection-theme="national"'));
const beforeNationalPreview=JSON.stringify([...map]);
get('seasonalShowPreviewBtn').fire('click');
assert.equal(html.dataset.seasonal,'national');
assert.equal(JSON.stringify([...map]),beforeNationalPreview);
get('seasonalStopPreviewBtn').fire('click');
assert(get('seasonalDialog').open);
assert.equal(get('seasonalTheme').value,'national');
change('seasonalEnabled',false,'checked');
get('seasonalCancel').fire('click');
assert.equal(JSON.stringify([...map]),beforeNationalPreview,'Cancel must not save new rules');
const css = read('seasonal-themes.css') + '\n' + read('seasonal-collection.css');
for (const id of lib.ids) {
  assert(css.includes(`[data-seasonal="${id}"]`));
  const collection = window.QuickJiraSeasonalCollection.has(id);
  const file = fs.readFileSync(path.join(root, collection ? "seasonal-collection" : "seasonal-art", id + ".webp"));
  assert.equal(file.toString("ascii", 8, 12), "WEBP");
  for (const effect of [0, 1]) {
    const scene = window.QuickJiraSeasonalScenes.scene(id, effect);
    const layers = Array.from(scene.matchAll(/class="[^"]*seasonal-scene-layer[^"]* seasonal-([a-z]+)"/g), match => match[1]);
    assert.equal((scene.match(/<img /g) || []).length, collection ? 0 : id === 'teachers' ? 2 : 1,
      'Only Teachers Day has mutually exclusive authored light/dark backdrops');
    if (id === 'teachers') {
      assert.match(scene, /seasonal-photo-dark.*teachers\.webp/);
      assert.match(scene, /seasonal-photo-light.*teachers-light\.webp/);
      assert.equal(fs.readFileSync(path.join(root, 'seasonal-art/teachers-light.webp')).toString('ascii',8,12), 'WEBP');
    }
    if (window.QuickJiraSeasonalShader.kinds[id]) assert.match(scene, /<canvas .*data-seasonal-surface/);
    else if (!collection) assert.equal(layers.length, 1);
    if (collection) { assert.match(scene, /data-collection-theme/); assert.match(scene, /collection-stage/); assert.match(scene, /collection-subject/); }
    for (const layer of layers) assert(css.includes(`.seasonal-${layer} i`), layer);
    if (['tet', 'school', 'halloween', 'teachers'].includes(id)) assert.match(scene, /<svg.*<path/);
  }
}
const keyframes = [...css.matchAll(/@keyframes [^{]+\{((?:[^{}]|\{[^{}]*\})*)\}/g)].map(match => match[1]).join(' ');
const animatedProperties = new Set(Array.from(keyframes.matchAll(/([a-z-]+):/g), match => match[1]));
assert.deepEqual([...animatedProperties].sort(), ['opacity', 'transform']);
assert(!index.includes('name="seasonalMode"'));
assert.match(index, /id="seasonalBootScene"/);
console.log('Seasonal UI fixture: midnight timer, validation, account isolation, concurrent tabs, motion controls and all 40 scene variants passed.');
