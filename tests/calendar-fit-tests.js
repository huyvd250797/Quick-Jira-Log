'use strict';
const assert=require('node:assert/strict'),D=require('../lib/calendar-drafts');
const make=(id,start,minutes,date='2026-10-20')=>({id:String(id),key:'CAL-'+id,date,start,started:`${date}T${start}:00.000+0700`,timeSpentSeconds:minutes*60,description:'Giữ mô tả',overtime:true});
let a=make(1,'15:00',120),b=make(2,'08:00',90),c=make(3,'09:30',30);
let p=D.drop(a,{date:a.date,start:'08:00'},[a,b,c],b);
assert.equal(p.problem,'');assert.deepEqual(p.changes.map(x=>[x.id,x.start,D.seconds(x)]),[['1','08:00',7200],['2','15:00',5400],['3','16:30',1800]]);assert.equal(p.swaps.length,2);
assert.deepEqual([a.start,b.start,c.start],['15:00','08:00','09:30']);assert(p.changes.every(x=>x.overtime&&x.description==='Giữ mô tả'));
// Packing cannot truncate, move unrelated blocks, or squeeze unequal totals.
assert(D.drop(a,b,[a,b,{...c,timeSpentSeconds:3600}],b).problem);
assert(D.drop(a,b,[a,b,c,make(4,'16:00',30)],b).problem);
assert(D.drop(a,b,[a,{...b,calendarSplitRoot:'CAL-2:2'},c],b).problem);
const drafts=new Map(p.changes.map(x=>{const original=[a,b,c].find(y=>D.key(x)===D.key(y));return[D.key(x),{original,target:{date:x.date,start:x.start,targetSeconds:D.seconds(x)}}];}));assert.equal(D.plan(drafts,[a,b,c])[0].cycle.length,3);
a=make(1,'13:30',150);p=D.drop(a,{date:a.date,start:'11:00'},[a]);assert.equal(p.problem,'');assert.deepEqual(p.segments.map(x=>[x.start,x.targetSeconds]),[['11:00',3600],['13:30',5400]]);assert(!p.requiresConfirmation);
// Trapped gaps after lunch require explicit confirmation, exact total stays unchanged.
b=make(2,'14:00',30);c=make(3,'15:00',30);p=D.drop(a,{date:a.date,start:'11:00'},[a,b,c]);assert.equal(p.problem,'');assert.equal(p.segments.length,4);assert(p.requiresConfirmation);assert.equal(p.segments.reduce((n,x)=>n+x.targetSeconds,0),9000);assert(p.changes.every(x=>D.inWindow(x)&&![b,c].some(y=>D.overlaps(x,y))));
let draft={original:a,target:{...p.segments[0],targetSeconds:9000,segments:p.segments}};const projected=D.project([a,b,c],new Map([[D.key(a),draft]]));assert.equal(projected.filter(x=>x.calendarSplitRoot).length,4);assert.equal(new Set(projected.map(D.key)).size,6);assert(D.drop(projected[0],b,projected).problem);assert.equal(D.plan(new Map([[D.key(a),draft]]),[a,b,c]).length,1);
const knownParts=D.parts(draft).map((x,i)=>({...x,id:i?String(100+i):a.id,calendarSplitRoot:undefined}));draft.status='unknown';const unknownView=D.project([...knownParts,b,c],new Map([[D.key(a),draft]]));assert.equal(unknownView.length,6,'Unknown split renders fresh Jira records, without duplicated virtual tails');assert.equal(unknownView[0].calendarSplitUncertain,true);
assert(D.drop(a,{date:a.date,start:'17:00'},[a]).problem); // cannot silently add OT or spill to another day.
p=D.drop(make(1,'08:00',30),{date:a.date,start:'12:30'},[]);assert.equal(p.changes[0].start,'13:30');assert(!p.segments);
// Seconds in occupied end are rounded UP for next start, preserving exact duration.
p=D.fit(make(1,'08:00',30),{date:a.date,start:'13:30'},[make(2,'13:30',30+1/60)]);assert.equal(p.changes[0].start,'14:01');assert.equal(D.seconds(p.changes[0]),1800);
assert(D.fit({...a,started:`${a.date}T13:30:01.000+0700`},b,[]).problem);
// Multiple days and full afternoons never spill into another day.
assert(D.fit(a,{date:'2026-10-24',start:'11:00'},[make(2,'13:30',240,'2026-10-24')]).problem);
console.log('Smart fit / multi-swap: 2h ↔ 90m+30m, packed destinations, lunch, fragmented 4 parts, exact totals/seconds, staged roots and no spill passed.');
