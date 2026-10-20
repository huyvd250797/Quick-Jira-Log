'use strict';
const assert=require('node:assert/strict'),D=require('../lib/calendar-drafts');
const item=(id,start,seconds=3600,date='2026-10-16')=>({id:String(id),key:'CAL-1',date,start,started:`${date}T${start}:00.000+0700`,timeSpentSeconds:seconds,minutes:seconds/60,description:'Mô tả gốc',overtime:true});
const a=item(1,'15:00',3661),b=item(2,'09:00'),draft={original:a,target:{date:a.date,start:'08:00'}},map=new Map([[D.key(a),draft]]);
const preview=D.project([a,b],map);assert.equal(a.start,'15:00');assert.equal(preview[0].start,'08:00');assert.equal(preview[0].end,'09:01');assert.equal(preview[0].timeSpentSeconds,3661);assert.equal(preview[0].overtime,true);assert.equal(preview[0].description,a.description);
assert(!D.same(preview[0],a));assert(D.same(a,{...a,started:'2026-10-16T08:00:00.000Z'}));assert(!D.same(a,{...a,timeSpentSeconds:3600}));
assert.throws(()=>D.plan(map,[a,b]),/đích đã có/); // 3661s overlaps 09:00.
const one=item(1,'15:00'),two=item(2,'08:00');
const chain=new Map([[D.key(one),{original:one,target:{date:one.date,start:'08:00'}}],[D.key(two),{original:two,target:{date:two.date,start:'10:00'}}]]);
assert.deepEqual(D.plan(chain,[one,two]).map(d=>d.original.id),['2','1']);
chain.get(D.key(two)).target.start='15:00';assert.equal(D.plan(chain,[one,two])[0].cycle.length,2);
chain.get(D.key(two)).target.start='08:30';assert.throws(()=>D.plan(chain,[one,two]),/đích đã có/);
const cross={original:one,target:{date:'2026-10-19',start:'08:00'}};
assert.equal(D.project([],new Map([[D.key(one),cross]]))[0].date,'2026-10-19');
assert.equal(D.plan(new Map([[D.key(one),cross]]),[one,two]).length,1);
assert(!D.overlaps(item(1,'08:00'),item(2,'09:00')));assert(D.overlaps(item(1,'08:00',3601),item(2,'09:00')));
console.log('Calendar drafts: immutable preview, exact seconds/OT, cross-day, overlap, dependencies and cycle protection passed.');

const swaps=D.drop(one,{date:two.date,start:'08:30'},[one,two],two);assert.equal(swaps.problem,'');assert.equal(swaps.changes[0].start,'08:00');assert.equal(swaps.changes[1].start,'15:00');
assert.equal(D.drop(one,{date:two.date,start:'08:00'},[one,two,item(3,'15:30')],two).problem.includes('trùng'),true);
const short=item(4,'13:30',1800),long=item(5,'09:00',7200);
assert.equal(D.drop(short,{date:long.date,start:long.start},[short,long],long).problem,'');assert.equal(D.drop(short,long,[short,long],long).changes[1].timeSpentSeconds,7200);
const blocked=D.drop(short,long,[short,long,item(6,'14:00')],long);assert(blocked.problem);
const lunch=D.drop(item(7,'11:30',1800),long,[item(7,'11:30',1800),long],long);assert(lunch.problem);
assert.equal(D.drop(one,{date:one.date,start:'08:30'},[one,item(8,'08:00'),item(9,'09:00')]).changes[0].start,'08:00');
console.log('Drop swap: snap to partner, unequal durations, third-block/lunch/multiple conflicts passed.');
