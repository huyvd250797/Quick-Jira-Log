'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const css = fs.readFileSync(require('node:path').join(__dirname, '..', 'seasonal-themes.css'), 'utf8');
function luminance(hex) {
  const parts = hex.slice(1).match(/../g).map(part => parseInt(part, 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return parts[0] * .2126 + parts[1] * .7152 + parts[2] * .0722;
}
function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + .05) / (dark + .05);
}
const palettes = [...css.matchAll(/^\[data-seasonal="([^"]+)"\] \{([^\n]+)\}/gm)];
assert.equal(palettes.length, 10);
let min = Infinity;
for (const [, name, definition] of palettes) {
  const values = Object.fromEntries([...definition.matchAll(/--season-([\w-]+): (#[0-9a-f]{6});/g)].map(match => [match[1], match[2]]));
  for (const key of ['light', 'pale', 'row-light', 'hover-light']) {
    const bg = values[key];
    assert(luminance(bg) < .89, name + ' should have a visible color');
    for (const foreground of ['#242535', '#383e4f', values.ink]) {
      const ratio = contrast(bg, foreground);
      assert(ratio >= 4.5, name + ' ' + key + ' ratio ' + ratio);
      min = Math.min(min, ratio);
    }
  }
}
assert.match(css, /#filterCard \.issue-row \{[^}]*background: var\(--season-row\)/);
console.log('All ten light palettes have colored surfaces and text contrast >= 4.5:1. Minimum ' + min.toFixed(2));
