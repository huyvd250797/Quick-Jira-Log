'use strict';
const assert=require('node:assert/strict'),D=require('../lib/calendar-drafts');
const item=(id,start,minutes,date='2026-10-20',key='CAL-1')=>({id:String(id),key,date,start,started:`${date}T${start}:00.000+0700`,timeSpentSeconds:minutes*60,description:'Giữ nguyên mô tả',overtime:true});
const original=item(1,'15:00',150),unrelated=item(9,'09:00',30,'2026-10-19');
const target={date:'2026-10-20',start:'11:00',targetSeconds:9000,segments:[{date:'2026-10-20',start:'11:00',targetSeconds:3600},{date:'2026-10-20',start:'13:30',targetSeconds:5400}]};
const drafts=new Map([[D.key(original),{original,target,status:'pending'}]]),shown=D.project([original,unrelated],drafts),before=JSON.stringify([...drafts]);
for(const piece of shown.filter(x=>x.calendarSplitRoot)){
 const c=D.regroup(piece,drafts);assert.equal(c.problem,'');assert.equal(c.item.id,original.id);assert.equal(D.seconds(c.item),9000);assert.equal(c.item.calendarDragParts.length,2);assert(!c.item.calendarSplitRoot);
 const dropped=D.drop(c.item,{date:'2026-10-21',start:'08:00'},shown);assert.equal(dropped.problem,'');assert.equal(dropped.changes.length,1);assert.equal(D.seconds(dropped.changes[0]),9000);assert.equal(dropped.changes[0].start,'08:00');
 assert.equal(dropped.changes[0].description,original.description);assert.equal(dropped.changes[0].overtime,true);assert.equal(dropped.segments,undefined);
 const split=D.drop(c.item,{date:original.date,start:'11:30'},shown);assert.equal(split.problem,'');assert.deepEqual(split.segments.map(x=>[x.start,x.targetSeconds]),[['11:30',1800],['13:30',7200]]);assert.equal(split.segments.reduce((n,x)=>n+x.targetSeconds,0),9000);
 const over=D.drop(c.item,{date:original.date,start:'17:00'},shown);assert(over.problem);assert.equal(JSON.stringify([...drafts]),before,'Invalid/preview must never mutate drafts');
 const home=D.drop(c.item,original,shown);assert.equal(home.problem,'');assert(D.same(home.changes[0],original),'Return to Jira original can remove the draft');
 // Two partners can fit the two old source slots, regardless of length order.
 const b=item(2,'08:00',90,original.date,'CAL-2'),d=item(3,'09:30',60,original.date,'CAL-3');
 const swapped=D.drop(c.item,b,[...shown,b,d],b);assert.equal(swapped.problem,'');assert.deepEqual(swapped.changes.map(x=>[x.id,x.start]),[['1','08:00'],['2','13:30'],['3','11:00']]);assert(swapped.changes.every(D.inWindow));
 const big=item(2,'08:00',150);assert(D.drop(c.item,big,[...shown,big],big).problem.includes('liên tục'),'Never split another worklog implicitly to force a swap');
 const busy=[item(7,'14:00',30),item(8,'15:00',30)];const four=D.drop(c.item,{date:original.date,start:'11:00'},[...shown,...busy]);assert.equal(four.problem,'');assert.equal(four.segments.length,4);assert(four.requiresConfirmation);
}
assert.equal(D.regroup(unrelated,drafts).item,unrelated,'Same issue alone must not regroup another worklog');
const c=D.regroup(shown[1],drafts).item;target.segments[1].start='14:00';assert(D.regroup(c,drafts).problem,'Captured groups must reject changed signatures');target.segments[1].start='13:30';
drafts.get(D.key(original)).status='unknown';assert(D.regroup(shown[0],drafts).problem);drafts.get(D.key(original)).status='conflict';assert(D.regroup(shown[0],drafts).problem);drafts.clear();assert(D.regroup(shown[0],drafts).problem);
console.log('Draft regroup: either piece, identity isolation, exact total/OT/comment, move/re-split/>2, invalid no mutation, source-slot swap packing, original restoration and stale/unknown guards passed.');
