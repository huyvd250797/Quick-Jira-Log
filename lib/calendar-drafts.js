(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QuickJiraDrafts=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const key = item => `${item.key}:${item.id}`;
  const seconds = item => Number(item.timeSpentSeconds ?? item.minutes * 60);
  const minute = value => Number(value.slice(0,2))*60+Number(value.slice(3,5));
  const started = item => item.started || `${item.date}T${item.start}:00.000+0700`;
  const same = (a,b) => Date.parse(started(a)) === Date.parse(started(b)) && seconds(a) === seconds(b);
  function preview(original,target) {
    const duration = target.targetSeconds ?? seconds(original), end = minute(target.start)+duration/60;
    const endTime = `${String(Math.floor(end/60)).padStart(2,'0')}:${String(Math.floor(end%60)).padStart(2,'0')}`;
    return {...original,date:target.date,start:target.start,end:endTime,started:target.date===original.date&&target.start===original.start?started(original):`${target.date}T${target.start}:00.000+0700`,minutes:duration/60,timeSpentSeconds:duration};
  }
  function project(items,drafts) {
    const seen = new Set();
    const result = items.map(item => {const id=key(item);seen.add(id);const draft=drafts.get(id);return draft ? preview(item,draft.target) : item;});
    for(const [id,draft] of drafts) if(!seen.has(id)) result.push(preview(draft.original,draft.target));
    return result;
  }
  function overlaps(a,b) {return a.date === b.date && minute(a.start)<minute(b.start)+seconds(b)/60 && minute(a.start)+seconds(a)/60>minute(b.start);}
  function inWindow(item) {
    const day=new Date(`${item.date}T12:00:00Z`).getUTCDay();
    const windows=day===0||day===6 ? [[480,720],[810,1050]] : [[480,720],[810,1050],[1050,1439]];
    return windows.some(([a,b])=>minute(item.start)>=a&&minute(item.start)+seconds(item)/60<=b);
  }
  // Resolve a drop against the displayed draft positions. Dropping anywhere on
  // one occupied block snaps to that block's start and swaps both start/date pairs.
  function drop(item,target,items,hovered=null) {
    if(!target)return {problem:'Thả block vào cột ngày và khung giờ trong lịch.',changes:[]};
    const others=items.filter(x=>key(x)!==key(item));
    let hit=hovered&&key(hovered)!==key(item)?others.find(x=>key(x)===key(hovered)):null;
    const intended=preview(item,target);
    if(!hit){const collisions=others.filter(x=>overlaps(intended,x));if(collisions.length===1)hit=collisions[0];else if(collisions.length>1)return {problem:'Vùng thả trùng nhiều worklog. Chọn đúng một block để đổi chỗ.',changes:[intended]};}
    const moved=preview(item,hit||target),changes=hit?[moved,preview(hit,item)]:[moved];
    if(!changes.every(inWindow))return {problem:'Vị trí mới đi qua giờ nghỉ hoặc nằm ngoài khung cho phép.',changes,swap:hit};
    const movedKeys=new Set(changes.map(key)),stationary=items.filter(x=>!movedKeys.has(key(x)));
    if(changes.some((x,i)=>changes.slice(i+1).some(y=>overlaps(x,y))||stationary.some(y=>overlaps(x,y))))
      return {problem:'Không đủ chỗ để đổi lịch: thời lượng đang trùng một worklog khác.',changes,swap:hit};
    return {problem:'',changes,swap:hit||null};
  }
  // Resizing changes one duration only; collisions never trigger a swap.
  function resize(item,endMinute,items) {
    if(Date.parse(started(item)) % 60000 !== 0)
      return {problem:'Giờ bắt đầu có giây lẻ. Mở chi tiết worklog để chỉnh thời lượng chính xác.',changes:[]};
    const duration=(endMinute-minute(item.start))*60;
    if(!Number.isFinite(endMinute)||!Number.isSafeInteger(duration)||duration<1800||duration>57600)
      return {problem:'Thời lượng tối thiểu 30 phút. Kéo cạnh dưới theo mốc 30 phút.',changes:[]};
    const changed=preview(item,{date:item.date,start:item.start,targetSeconds:duration});
    const changes=[changed];
    if(!inWindow(changed))return {problem:'Thời lượng mới đi qua giờ nghỉ hoặc nằm ngoài khung cho phép.',changes};
    if(items.some(other=>key(other)!==key(item)&&overlaps(changed,other)))
      return {problem:'Thời lượng mới trùng worklog khác. Thu ngắn block hoặc chọn khoảng trống.',changes};
    return {problem:'',changes};
  }
  function plan(drafts,current) {
    const pending=[...drafts.values()],moving=new Set(pending.map(d=>key(d.original)));
    const final=pending.map(d=>preview(d.original,d.target));
    for(let i=0;i<final.length;i++) {
      if(!inWindow(final[i]))throw new Error('Thay đổi nằm ngoài khung giờ cho phép hoặc đi qua giờ nghỉ.');
      if(final.slice(i+1).some(other=>overlaps(final[i],other)) || current.some(other=>!moving.has(key(other))&&overlaps(final[i],other)))
        throw new Error('Lịch đích đã có worklog. Chỉnh lại các block hoặc bỏ thay đổi và tải lại lịch.');
    }
    const ordered=[];
    while(pending.length) {
      const index=pending.findIndex(d=>!pending.some(other=>other!==d&&overlaps(preview(d.original,d.target),other.original)));
      if(index<0) {ordered.push({cycle:pending.splice(0)});break;}
      ordered.push(pending.splice(index,1)[0]);
    }
    return ordered;
  }
  return {key,seconds,minute,started,same,preview,project,overlaps,inWindow,drop,resize,plan};
});
