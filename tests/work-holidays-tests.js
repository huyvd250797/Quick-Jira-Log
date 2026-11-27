'use strict';
const assert=require('node:assert/strict'),H=require('../lib/work-holidays'),P=require('../lib/batch-plan'),R=require('../lib/batch-review'),fs=require('node:fs'),vm=require('node:vm');
for(const year of [2026,2027,2028,2030]) {
 const list=H.list(year);assert.equal(list.length,7);assert.equal(new Set(list.map(x=>x.date)).size,7);
 for(const md of ['01-01','04-30','05-01','07-27','09-02','11-24'])assert(H.isHoliday(year+'-'+md));
 const lunar=list.find(x=>x.name.startsWith('Giỗ'));const parts=new Intl.DateTimeFormat('en-u-ca-chinese',{timeZone:'Asia/Ho_Chi_Minh',month:'numeric',day:'numeric'}).formatToParts(new Date(lunar.date+'T05:00:00Z'));
 assert.equal(parts.find(x=>x.type==='month').value,'3');assert.equal(parts.find(x=>x.type==='day').value,'10');
 assert(!H.isHoliday(year+'-11-20'),'Visual themes are independent of leave');
}
assert(H.isHoliday('2026-04-26'));assert(!H.isHoliday('2027-04-26'));assert(!H.isHoliday('2026-02-30'));assert(!H.isHoliday('bad'));
assert.throws(()=>H.nextWorkingDay('2026-02-30'));assert.equal(H.automaticDay('2027-01-01'),'2027-01-04');assert.equal(H.automaticDay('2026-04-30'),'2026-05-04');assert.equal(H.automaticDay('2026-11-24'),'2026-11-25');
for(const holiday of H.list(2026)) {
 const dates=P.days(holiday.date,'week'),items=Array.from({length:4},(_,i)=>({key:'EPU-'+(i+1),minutes:60}));
 for(const keep of [false,true]) {
  const result=P.allocate(items,dates,{},keep);assert(result.plans.every(p=>!H.isHoliday(p.date)));assert.equal(result.plans.length,4);assert(result.unused>=0);
  if(dates.includes(holiday.date))assert(result.skippedDates.includes(holiday.date));
 }
}
const dates=P.days('2026-04-30','week'),r=P.allocate([{key:'EPU-1',minutes:480}],dates,{},true);assert(!r.plans.some(p=>['2026-04-30','2026-05-01'].includes(p.date)));
assert.equal(P.allocate([{key:'EPU-1'}],['2026-11-24'],{},false).plans.length,0);
assert.equal(P.allocate([{key:'EPU-1'}],['2026-11-24'],{},false).unplaced.length,1);
assert.deepEqual(P.automaticDates('2026-11-24','week'),P.days('2026-11-24','week'),'Keep all days available for explicit drag');
assert.deepEqual(P.automaticDates('2027-01-01','day'),['2027-01-04']);
const manual=R.move([{key:'EPU-1',date:'2026-11-23',segments:[{start:'08:00',minutes:60}],minutes:60}],'EPU-1',{date:'2026-11-24',start:'09:00'},{occupied:{},allowed:P.days('2026-11-24','week')});
assert.equal(manual.problem,'');assert.equal(manual.plans[0].date,'2026-11-24');P.validate(manual.plans,{},P.days('2026-11-24','week'));
// Browser bundle parity: shared lunar calendar before planner; no client/server policy drift.
const root=__dirname+'/..',ctx={};vm.createContext(ctx);for(const name of ['lib/seasonal-calendar.js','lib/work-holidays.js','lib/batch-plan.js'])vm.runInContext(fs.readFileSync(root+'/'+name,'utf8'),ctx);
assert.equal(JSON.stringify(ctx.QuickJiraWorkHolidays.list(2027)),JSON.stringify(H.list(2027)));
assert.equal(ctx.QuickJiraBatchPlan.allocate([{key:'EPU-1'}],['2026-11-24'],{},false).plans.length,0);
const shiftedScope=P.scope('2027-01-01','day');assert.deepEqual(shiftedScope.allocationDates,['2027-01-04']);assert.equal(shiftedScope.reviewDates[0],'2027-01-04');assert.equal(shiftedScope.reviewDates.at(-1),'2027-01-10');assert.equal(shiftedScope.allowedDates.length,7);
const weekScope=P.scope('2026-04-26','week');assert(weekScope.allowedDates.includes('2026-04-26'));assert(!weekScope.allocationDates.includes('2026-04-26'));
const week=P.days('2026-04-26','week');const visible=[...week,'2026-04-25','2026-04-26'];
const sundayMove=R.move([{key:'EPU-2',date:week[0],segments:[{start:'08:00',minutes:60}],minutes:60}],'EPU-2',{date:'2026-04-26',start:'09:00'},{occupied:{},allowed:visible});assert.equal(sundayMove.problem,'');assert.equal(sundayMove.plans[0].date,'2026-04-26','Manual lunar holiday on Sunday remains permitted');
const html=fs.readFileSync(root+'/index.html','utf8');assert(html.indexOf('/lib/seasonal-calendar.js')<html.indexOf('/lib/work-holidays.js'));assert(html.indexOf('/lib/work-holidays.js')<html.indexOf('/lib/batch-plan.js'));assert(html.indexOf('/lib/batch-plan.js')<html.indexOf('/app.js'));
console.log('Work holidays: seven annual leave rules, independent lunar dates, year rollover/weekend chains, day shifts, auto/fixed-duration exclusions, unplaced work, manual drag, browser/Node parity and script order passed.');
