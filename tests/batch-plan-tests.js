'use strict';const assert=require('node:assert/strict'),P=require('../lib/batch-plan');
const dates=P.days('2026-10-24','week');assert.deepEqual(dates,['2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23']);
assert.throws(()=>P.days('2026-02-30','day'));const items=Array.from({length:6},(_,i)=>({key:'EPU-'+(i+1),minutes:120}));
let r=P.allocate(items,dates,{},false);assert.equal(r.plans.length,6);P.validate(r.plans,{},dates);assert(r.plans.every(p=>p.segments.every(s=>s.start<'12:00'||s.start>='13:30')));
assert.equal(new Set(r.plans.map(p=>p.key)).size,6);assert.equal(r.plans.reduce((n,p)=>n+p.minutes,0),2400);
const occupied={[dates[0]]:[{start:'08:00',end:'10:00'},{start:'11:00',end:'12:00'},{start:'13:30',end:'16:30'}]};
r=P.allocate([{key:'EPU-1',minutes:180}],dates,occupied,true);assert.equal(r.plans[0].date,dates[1]);assert.equal(r.plans[0].minutes,180);
r=P.allocate([{key:'EPU-1',minutes:120}],[dates[0]],{[dates[0]]:[{start:'08:00',end:'11:00'},{start:'14:30',end:'17:30'}]},true);assert.deepEqual(r.plans[0].segments,[{start:'11:00',minutes:60},{start:'13:30',minutes:60}]);
r=P.allocate([{key:'EPU-1',minutes:481}],dates,{},true);assert.equal(r.unplaced.length,1);assert.equal(r.plans.length,0);
assert.throws(()=>P.validate([{key:'EPU-1',date:dates[0],segments:[{start:'12:00',minutes:30}]}]));
assert.throws(()=>P.validate([{key:'EPU-1',date:dates[0],segments:[{start:'08:00',minutes:60}]},{key:'EPU-1',date:dates[1],segments:[{start:'08:00',minutes:60}]}]));
assert.throws(()=>P.validate([{key:'EPU-1',date:dates[0],segments:[{start:'08:00',minutes:60}]}],{[dates[0]]:[{start:'08:30',end:'09:30'}]}));
assert.throws(()=>P.validate([{key:'EPU-1',date:'2026-10-24',segments:[{start:'08:00',minutes:60}]}],{},dates));
const mixed=Object.fromEntries(dates.map((d,i)=>[d,[{start:'08:00',end:i===4?'12:00':'12:00'},{start:i===4?'17:30':'14:30',end:'17:30'}]]));
// Four 1h days and one 4h day: four Subtasks use the four largest days (7h), never waste a day to duplicate a bin.
mixed[dates[4]]=[{start:'08:00',end:'12:00'}];const packed=P.allocate(items.slice(0,4),dates,mixed,false);assert.equal(packed.plans.reduce((n,p)=>n+p.minutes,0),420);
console.log('Batch planner: weekday scope, calendar date, full-day capacity, single-day Subtask, lunch split, fixed durations, overflow and collisions passed.');
