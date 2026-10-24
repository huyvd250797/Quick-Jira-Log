(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./batch-plan'));else root.QuickJiraBatchReview=factory(root.QuickJiraBatchPlan);})(typeof globalThis!=='undefined'?globalThis:this,P=>{
 'use strict';
 const windows=[[480,720],[810,1050]],end=s=>P.minute(s.start)+s.minutes;
 const overlaps=(a,b)=>P.minute(a.start)<end(b)&&end(a)>P.minute(b.start);
 const total=p=>p.segments.reduce((n,s)=>n+s.minutes,0);
 function span(date,start,minutes){
  let at=P.minute(start),left=minutes;const segments=[];
  if(!Number.isInteger(at)||!Number.isInteger(minutes)||minutes<=0||minutes>480||at<480||at>=1050||at>=720&&at<810)throw Error('Chọn giờ bắt đầu trong 08:00–12:00 hoặc 13:30–17:30; thời lượng dương, tối đa 8h.');
  for(const [a,b] of windows){at=Math.max(at,a);const take=Math.min(left,b-at);if(take>0){segments.push({start:P.time(at),minutes:take});left-=take;}if(!left)break;}
  if(left)throw Error('Không đủ giờ làm việc phía dưới trong ngày. Kéo lên sớm hơn hoặc giảm TimeSpent.');
  return {date,segments,minutes};
 }
 function collisions(plans,occupied){const hits=[];for(let i=0;i<plans.length;i++){
  const p=plans[i];for(const s of p.segments){
   for(const r of occupied[p.date]||[])if(overlaps(s,{start:r.start,minutes:P.minute(r.end)-P.minute(r.start)}))hits.push({key:p.key,with:'Giờ đã log',date:p.date,start:s.start});
   for(const q of plans.slice(i+1))if(q.date===p.date&&q.segments.some(t=>overlaps(s,t)))hits.push({key:p.key,with:q.key,date:p.date,start:s.start});
  }}return hits;}
 function result(all,key,change,opts,swaps=[]){
  const changed=new Map(change.map(x=>[x.key,x])),final=all.map(x=>changed.get(x.key)||x);
  const collision=collisions(final,opts.occupied||{}).filter(x=>changed.has(x.key)||changed.has(x.with));
  const approved=final.map(x=>changed.has(x.key)?{...x,allowOverlap:collision.some(h=>h.key===x.key||h.with===x.key)}:x);
  P.validate(approved,opts.occupied||{},opts.allowed);
  return {problem:'',plans:approved.filter(x=>changed.has(x.key)),swaps,requiresOverlap:collision.length>0,collisions:collision};
 }
 function move(all,key,target,opts={}){try{
  const source=all.find(x=>x.key===key);if(!source||opts.locked?.includes(key))throw Error('Lịch này chỉ được xem.');
  if(!target)throw Error('Thả block trong khung lịch.');
  let desired,error;try{desired=span(target.date,target.start,total(source));}catch(e){error=e;}
  const hit=all.find(x=>x.key===opts.hovered&&x.key!==key);
  // Try exchanging complete split groups at the partner's first segment.
  let candidate=desired;
  if(hit)try{candidate=span(hit.date,hit.segments[0].start,total(source));}catch{}
  if(!candidate)throw error;
  const moved={...source,...candidate,allowOverlap:false};
  const partners=all.filter(x=>x.key!==key&&x.date===moved.date&&x.segments.some(s=>moved.segments.some(t=>overlaps(s,t))));
  const contains=partners.every(x=>!opts.locked?.includes(x.key)&&x.segments.every(s=>moved.segments.some(t=>P.minute(s.start)>=P.minute(t.start)&&end(s)<=end(t))));
  const changes=[moved];
  if(partners.length&&contains&&partners.reduce((n,x)=>n+total(x),0)<=total(source)){
   let slots=source.segments.map(s=>({...s}));
   for(const partner of partners){let remaining=total(partner),segments=[];
    for(const slot of slots){const take=Math.min(remaining,slot.minutes);if(take){segments.push({start:slot.start,minutes:take});slot.start=P.time(P.minute(slot.start)+take);slot.minutes-=take;remaining-=take;}if(!remaining)break;}
    if(remaining)throw Error('Không đủ chỗ đổi nhóm.');changes.push({...partner,date:source.date,segments,minutes:total(partner),allowOverlap:false});
   }
   const swapped=result(all,key,changes,opts,partners.map(x=>x.key));
   if(!swapped.requiresOverlap)return swapped;
  }
  // An impossible replacement preserves every partner and offers an explicit overlap.
  if(!desired)throw error;return result(all,key,[{...source,...desired,allowOverlap:false}],opts);
 }catch(e){return {problem:e.message,plans:[],swaps:[],collisions:[]};}}
 function resize(all,key,endMinute,opts={}){try{
  const p=all.find(x=>x.key===key);if(!p||opts.locked?.includes(key))throw Error('Lịch này chỉ được xem.');
  const start=P.minute(p.segments[0].start);
  if(!Number.isInteger(endMinute)||endMinute<=start||endMinute>1050)throw Error('Kéo cạnh dưới trong giờ làm việc, tối đa đến 17:30.');
  const segments=windows.map(([a,b])=>({start:Math.max(start,a),end:Math.min(endMinute,b)})).filter(s=>s.end>s.start).map(s=>({start:P.time(s.start),minutes:s.end-s.start}));
  const minutes=segments.reduce((n,s)=>n+s.minutes,0);if(minutes<30)throw Error('TimeSpent tối thiểu 30 phút.');
  return result(all,key,[{...p,segments,minutes,allowOverlap:false}],opts);
 }catch(e){return {problem:e.message,plans:[],swaps:[],collisions:[]};}}
 return {span,total,collisions,move,resize};
});
