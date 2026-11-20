'use strict';

const assert = require('node:assert/strict');
const { ids, normalize, today, untilMidnight, defaultRange, activeTheme, accountKey, validSchedule } = require('../lib/seasonal-calendar');

assert.equal(ids.length, 20);
assert.deepEqual(defaultRange('tet', 2024), ['2024-02-06', '2024-02-14']); // 30 Chạp
assert.deepEqual(defaultRange('tet', 2026), ['2026-02-14', '2026-02-21']); // 29 Chạp
assert.deepEqual(defaultRange('tet', 2027), ['2027-02-03', '2027-02-10']);
assert.deepEqual(defaultRange('moon', 2025), ['2025-10-04', '2025-10-06']); // Leap sixth month
assert.deepEqual(defaultRange('moon', 2026), ['2026-09-23', '2026-09-25']);
assert.deepEqual(defaultRange('moon', 2027), ['2027-09-13', '2027-09-15']);
const boundary = Date.parse('2026-12-19T17:00:00.000Z');
assert.equal(today(boundary - 1), '2026-12-19');
assert.equal(today(boundary), '2026-12-20');
assert.equal(untilMidnight(boundary - 1), 1);
assert.equal(untilMidnight(boundary), 86400000);

let config = normalize();
const boundaries = [
  ['2026-02-14', 'tet'], ['2026-02-21', 'tet'], ['2026-02-22', ''],
  ['2026-04-30', 'april'], ['2026-05-01', 'april'], ['2026-05-02', ''],
  ['2026-06-01', 'children'], ['2026-06-02', ''], ['2026-07-20', ''],
  ['2026-09-05', 'school'], ['2026-09-25', 'moon'], ['2026-09-26', ''],
  ['2026-10-30', 'halloween'], ['2026-11-20', 'teachers'], ['2026-11-21', ''],
  ['2026-12-20', 'christmas'], ['2026-12-25', 'christmas'], ['2026-12-26', '']
];
for (const [date, theme] of boundaries) assert.equal(activeTheme(config, date), theme, date);

config = normalize({ rules: { birthday: { schedule: { repeat: true, start: '12-24', end: '01-02' } } } });
assert.equal(activeTheme(config, '2026-12-23'), 'christmas');
assert.equal(activeTheme(config, '2026-12-24'), 'birthday');
assert.equal(activeTheme(config, '2027-01-02'), 'birthday');
assert.equal(activeTheme(config, '2027-01-03'), '');
assert.equal(activeTheme(normalize({ ...config, order: ['christmas', 'birthday'] }), '2026-12-24'), 'christmas');
config.rules.birthday.enabled = false;
assert.equal(activeTheme(config, '2026-12-24'), 'christmas');
config = normalize({ rules: { vacation: { schedule: { repeat: false, start: '2026-07-11', end: '2026-07-14' } } } });
assert.equal(activeTheme(config, '2026-07-11'), 'vacation');
assert.equal(activeTheme(config, '2027-07-11'), '');
config = normalize({ rules: { birthday: { schedule: { repeat: true, start: '02-29', end: '02-29' } } } });
assert.equal(activeTheme(config, '2027-02-28'), '');
assert.equal(activeTheme(config, '2028-02-29'), 'birthday');
assert.equal(activeTheme(normalize({ mode: 'manual', manual: 'school' }), '2026-12-24'), 'christmas');
assert.equal(activeTheme(normalize({ mode: 'base' }), '2026-12-24'), 'christmas');
assert(!validSchedule({ repeat: false, start: '2026-03-01', end: '2026-02-28' }));
assert(!validSchedule({ repeat: true, start: '02-30', end: '03-01' }));
assert(!validSchedule({ repeat: true, start: ['05-03'], end: '05-04' }));
assert.equal(normalize({ rules: { birthday: { schedule: 'bad input' } } }).rules.birthday.schedule, null);
assert.notEqual(accountKey({ username: 'a', displayName: 'X' }), accountKey({ username: 'b', displayName: 'X' }));
assert.equal(accountKey({ displayName: 'X' }), '');
console.log('Seasonal calendar: eighteen holiday presets, VN midnight, lunar leap months, account keys, priority, annual rollover and one-off ranges passed.');

const newFixed = {newyear:'01-01',womensday:'03-08',family:'06-28',national:'09-02',vietwomen:'10-20',culture:'11-24'};
for (const [id, day] of Object.entries(newFixed)) {
  for (const year of [2026,2027,2030]) {
    assert.deepEqual(defaultRange(id, year), [`${year}-${day}`,`${year}-${day}`]);
    assert.equal(activeTheme(normalize(),`${year}-${day}`),id);
  }
}
const lunar2026 = {lantern:'2026-03-03',hungking:'2026-04-26',doanngo:'2026-06-19',vulan:'2026-08-27'};
const lunarFormatter = new Intl.DateTimeFormat('en-u-ca-chinese',{month:'numeric',day:'numeric',timeZone:'Asia/Ho_Chi_Minh'});
const lunarDays = {lantern:[1,15],hungking:[3,10],doanngo:[5,5],vulan:[7,15]};
for (const [id, date] of Object.entries(lunar2026)) assert.deepEqual(defaultRange(id,2026),[date,date]);
for (const year of [2026,2027,2028,2030]) for (const [id,[month,day]] of Object.entries(lunarDays)) {
  const [start,end] = defaultRange(id,year);
  assert.equal(start,end);
  const parts = Object.fromEntries(lunarFormatter.formatToParts(new Date(start+'T05:00:00Z')).map(p=>[p.type,p.value]));
  assert.equal(Number(parts.month),month,id+' lunar month '+year);
  // ICU Chinese calendar uses UTC+8 new moons; VN month 1/2027 starts a day earlier.
  if (year === 2027 && id === 'lantern') assert.equal(start,'2027-02-20');
  else assert.equal(Number(parts.day),day,id+' lunar day '+year);
  assert.equal(activeTheme(normalize(), start), id);
}
const legacy = normalize({motion:false,order:['teachers','birthday'],rules:{teachers:{enabled:false,effect:1},birthday:{schedule:{repeat:true,start:'11-20',end:'11-20'}}}});
assert.deepEqual(legacy.order.slice(0,2),['teachers','birthday']);
assert.equal(legacy.rules.teachers.enabled,false);
assert.equal(legacy.rules.teachers.effect,1);
assert.equal(legacy.rules.birthday.schedule.start,'11-20');
for (const id of Object.keys(newFixed).concat(Object.keys(lunarDays))) assert.equal(legacy.rules[id].enabled,true);
console.log('Ten new annual/lunar calendars, independent Intl lunar checks and legacy preference preservation passed.');
