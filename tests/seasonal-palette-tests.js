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
const original = {tet:['#fff7f5','#fffdfc','#8c3441'],vacation:['#edfafa','#fcffff','#14685d'],april:['#fdf2ee','#fffaf8','#993645'],children:['#eff6ff','#fbfdff','#315d96'],birthday:['#faf1fa','#fffaff','#843b75'],moon:['#f3f3fc','#fdfcff','#61518b'],school:['#edf8f3','#fbfff9','#2c6662'],halloween:['#f8f2fc','#fffbff','#843e1e'],teachers:['#fbf4ea','#fffdf7','#874a35'],christmas:['#eef6ff','#fcfeff','#235b92']};
const palettes = [...css.matchAll(/^\[data-seasonal="([^"]+)"\] \{([^\n]+)\}/gm)];
assert.equal(palettes.length, 10);
let min = Infinity;
for (const [, name, definition] of palettes) {
  const values = Object.fromEntries([...definition.matchAll(/--season-([\w-]+): (#[0-9a-f]{6});/g)].map(match => [match[1], match[2]]));
  assert.deepEqual([values.light,values.pale,values.ink], original[name], name+' must match V1.39.3');
  for (const key of ['light', 'pale']) {
    const bg = values[key];

    for (const foreground of ['#1b2535', '#506078', values.ink]) {
      const ratio = contrast(bg, foreground);
      assert(ratio >= 4.5, name + ' ' + key + ' ratio ' + ratio);
      min = Math.min(min, ratio);
    }
  }
}
assert.match(css, /#filterCard \.issue-row \{[^}]*background: var\(--season-row\)/);
console.log('All ten light palettes match V1.39.3; text contrast minimum ' + min.toFixed(2));
