'use strict';
const assert=require('node:assert/strict'),P=require('../lib/batch-plan'),H=require('../lib/work-holidays');
const tasks=Array.from({length:6},(_,i)=>({key:'EPU-'+(i+1),created:`2026-10-${String(10+i).padStart(2,'0')}T08:00:00+0700`,minutes:60}));
const days=P.days('2026-10-19','week'),input=tasks.slice().reverse(),before=JSON.stringify(input);
const timeline=result=>result.plans.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.segments[0].start.localeCompare(b.segments[0].start));
let r=P.allocate(input,days,{},false);assert.deepEqual(timeline(r).map(x=>x.key),tasks.map(x=>x.key));assert.equal(JSON.stringify(input),before,'Never mutate selection/source rows');
assert.equal(r.plans.reduce((n,p)=>n+p.minutes,0),2400);for(const d of days)assert.equal(r.plans.filter(p=>p.date===d).reduce((n,p)=>n+p.minutes,0),480);
assert.equal(r.plans[0].minutes,240);assert.equal(r.plans[1].minutes,240);
assert.equal(r.plans[0].date,r.plans[1].date,'The sixth task no longer jumps ahead into the first day');
assert.deepEqual(P.orderItems([{key:'Z-1',created:'2026-10-10T00:00:00Z'},{key:'A-9',created:'2026-10-09T23:00:00Z'}]).map(x=>x.key),['A-9','Z-1'],'Jira timestamp is stronger than key');
assert.deepEqual(P.orderItems([{key:'X-10'},{key:'X-2'},{key:'X-1'}]).map(x=>x.key),['X-1','X-2','X-10'],'Legacy keys use numeric fallback');
assert.deepEqual(P.orderItems([{key:'A-1',issueId:'90',created:'invalid'},{key:'B-9',issueId:'2',created:''}]).map(x=>x.key),['B-9','A-1']);
const occupied={'2026-10-19':[{start:'08:00',end:'12:00'},{start:'13:30',end:'17:20'}]};
r=P.allocate(input,['2026-10-19'],occupied,false);assert.equal(r.plans.reduce((n,p)=>n+p.minutes,0),10,'Fill final ten minutes to reach 8h; no 30m minimum leaves a gap');assert(r.plans.every(x=>x.minutes>0));
r=P.allocate(input,['2026-10-19'],{'2026-10-19':[{start:'08:00',end:'12:00'},{start:'13:30',end:'17:29'}]},false);assert.equal(r.plans.length,1);assert.equal(r.unplaced.length,5);assert.equal(r.plans[0].key,'EPU-1');assert.equal(r.plans[0].minutes,1);
r=P.allocate(input,['2026-10-19'],{'2026-10-19':[{start:'08:00',end:'12:00'},{start:'13:30',end:'17:30'}]},false);assert.equal(r.plans.length,0);assert.equal(r.unplaced.length,6);
r=P.allocate(input,['2026-10-19','2026-10-19'],{},false);assert.equal(r.plans.reduce((n,p)=>n+p.minutes,0),480,'Duplicate candidate dates cannot create extra capacity');
// Many item counts, input permutations, partial days and a holiday: FIFO and exact residual capacity.
for(let n=1;n<=20;n++) {
 const dateList=P.days('2026-11-24','week');
 const rows=Array.from({length:n},(_,i)=>({key:'APP-'+(i+1),created:new Date(Date.UTC(2026,9,1,0,i)).toISOString()})).reverse();
 const busy={};for(let i=0;i<dateList.length;i++)busy[dateList[i]]=[{start:'08:00',end:P.time(480+i*13)}].filter(x=>x.start!==x.end);
 const result=P.allocate(rows,dateList.slice().reverse(),busy,false),ordered=timeline(result);
 assert.deepEqual(ordered.map(x=>x.key),P.orderItems(rows).slice(0,ordered.length).map(x=>x.key));assert(!ordered.some(p=>H.isHoliday(p.date)));
 const used=[...new Set(ordered.map(p=>p.date))];
 for(const d of used){const planned=ordered.filter(x=>x.date===d).reduce((sum,x)=>sum+x.minutes,0),capacity=P.free(busy[d]).reduce((sum,x)=>sum+x.end-x.start,0);assert.equal(planned,capacity,'Exact remaining work-window capacity must be used');}
 if(n>=4)assert.equal(used.length,4,'Every non-holiday weekday reaches 8h when there are enough tasks');
 P.validate(result.plans,busy,dateList);
}
console.log('FIFO allocation: real creation timestamps, numeric legacy fallback, unchanged inputs, contiguous chronological groups, 8h daily totals, occupied/lunch gaps, 1–29m residuals, holidays, insufficient tasks and 20 reverse-input cases passed.');
