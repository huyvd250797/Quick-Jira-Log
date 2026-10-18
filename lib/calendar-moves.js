'use strict';
const D=require('./calendar-drafts');
// Plan only against fresh server snapshots. Parking stays within involved dates,
// valid windows, and outside all current/final worklogs; no temporary log creation.
function schedule(originals,targets,occupied) {
 const current=originals.map(x=>({...x})),remaining=new Set(originals.map(D.key)),steps=[];
 const destinations=new Map(targets.map(x=>[D.key(x),x]));
 const dates=[...new Set(originals.flatMap((x,i)=>[x.date,targets[i].date]))];
 for(let attempt=0;remaining.size&&attempt<originals.length*3;attempt++) {
  const ready=current.find(x=>remaining.has(D.key(x))&&!current.some(y=>D.key(x)!==D.key(y)&&D.overlaps(destinations.get(D.key(x)),y)));
  let item=ready,to=ready&&destinations.get(D.key(ready)),temporary=false;
  if(!ready) {
   for(const candidate of current.filter(x=>remaining.has(D.key(x))).sort((a,b)=>D.seconds(a)-D.seconds(b))) {
    for(const date of dates) {
     for(let minute=480;minute<1440;minute+=1) {
      const start=`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
      const slot=D.preview(candidate,{date,start});
      if(D.inWindow(slot)&&![...occupied,...current,...targets].some(x=>D.overlaps(slot,x))){item=candidate;to=slot;temporary=true;break;}
     }
     if(to)break;
    }
    if(to)break;
   }
   if(!to)throw new Error('Không tìm được khoảng trống trung gian trong các ngày đang đổi để swap an toàn. Hãy giải phóng một khoảng trống rồi lưu lại.');
  }
  const from={...item};steps.push({from,to:{...to},temporary});Object.assign(item,to);
  if(!temporary)remaining.delete(D.key(item));
 }
 if(remaining.size)throw new Error('Chưa sắp được thứ tự đổi lịch an toàn.');
 return steps;
}
module.exports={schedule};
