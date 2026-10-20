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
  function parts(draft) {
    return (draft.target.segments || [draft.target]).map((target,index)=>{
      const part=preview(draft.original,target);
      return draft.target.segments ? {...part,id:index?`${draft.original.id}~split${index}`:draft.original.id,calendarSplitRoot:key(draft.original),calendarSplitIndex:index} : part;
    });
  }
  function project(items,drafts) {
    const seen=new Set(),result=[];
    for(const item of items){const id=key(item);seen.add(id);const draft=drafts.get(id);result.push(...(draft?.target.segments&&draft.status==='unknown'?[{...item,calendarSplitRoot:id,calendarSplitUncertain:true}]:draft?parts(draft):[item]));}
    for(const [id,draft] of drafts)if(!seen.has(id)&&!(draft.target.segments&&draft.status==='unknown'))result.push(...parts(draft));
    return result;
  }
  function overlaps(a,b) {return a.date === b.date && minute(a.start)<minute(b.start)+seconds(b)/60 && minute(a.start)+seconds(a)/60>minute(b.start);}
  function inWindow(item) {
    const day=new Date(`${item.date}T12:00:00Z`).getUTCDay();
    const windows=day===0||day===6 ? [[480,720],[810,1050]] : [[480,720],[810,1050],[1050,1439]];
    return windows.some(([a,b])=>minute(item.start)>=a&&minute(item.start)+seconds(item)/60<=b);
  }
  const time = value => `${String(Math.floor(value/60)).padStart(2,'0')}:${String(Math.floor(value%60)).padStart(2,'0')}`;
  // Auto-fit stays within the selected day's regular windows; never silently adds OT.
  function fit(item,target,items) {
    let remaining=seconds(item),cursor=minute(target.start);const segments=[];
    if(cursor<480||cursor>=1050)return {problem:'Tự ráp lịch chỉ áp dụng trong 08:00–12:00 và 13:30–17:30 của ngày đã chọn.',changes:[]};
    if(Date.parse(started(item))%60000 || !Number.isSafeInteger(remaining)||remaining<=0)
      return {problem:'Giờ bắt đầu có giây lẻ hoặc thời lượng không hợp lệ. Mở chi tiết để chỉnh chính xác.',changes:[]};
    const occupied=items.filter(x=>key(x)!==key(item)&&x.date===target.date).map(x=>[minute(x.start),minute(x.start)+seconds(x)/60]).sort((a,b)=>a[0]-b[0]);
    for(const [from,to] of [[480,720],[810,1050]]) {
      let at=Math.max(cursor,from);if(at>=to)continue;
      const gaps=[];
      for(const [a,b] of occupied){if(b<=at||a>=to)continue;if(a>at)gaps.push([at,Math.min(a,to)]);at=Math.max(at,b);if(at>=to)break;}
      if(at<to)gaps.push([at,to]);
      for(const [a,b] of gaps){
        // Start times use exact minute boundaries, never round into an occupied second.
        const start=Math.ceil(a),take=Math.min(remaining,Math.floor((b-start)*60));
        if(take<=0)continue;
        segments.push({date:target.date,start:time(start),targetSeconds:take});remaining-=take;
        if(!remaining)break;
      }
      if(!remaining)break;
    }
    const changes=segments.map(t=>preview(item,t));
    if(segments.length>32)return {problem:'Ngày quá phân mảnh (hơn 32 phần). Chọn vị trí khác hoặc chia lần kéo nhỏ hơn.',changes:[]};
    if(remaining)return {problem:'Không đủ chỗ trống phía dưới trong ngày để giữ đủ thời lượng. Chọn vị trí sớm hơn hoặc ngày khác.',changes};
    return {problem:'',changes,segments:segments.length>1?segments:null,requiresConfirmation:segments.length>2,swap:null,swaps:[]};
  }
  function drop(item,target,items,hovered=null) {
    if(!target)return {problem:'Thả block vào cột ngày và khung giờ trong lịch.',changes:[]};
    if(item.calendarSplitRoot)return {problem:'Các phần tách đang chờ lưu. Lưu hoặc bỏ bản nháp trước khi kéo tiếp.',changes:[]};
    const others=items.filter(x=>key(x)!==key(item));
    let hit=hovered&&key(hovered)!==key(item)?others.find(x=>key(x)===key(hovered)):null;
    const intended=preview(item,target);
    if(!hit&&!inWindow(intended))return fit(item,target,items);
    if(!hit){const collisions=others.filter(x=>overlaps(intended,x));if(collisions.length)hit=collisions.sort((a,b)=>minute(a.start)-minute(b.start))[0];}
    const moved=preview(item,hit||target);
    const partners=hit?others.filter(x=>key(x)===key(hit)||overlaps(moved,x)).sort((a,b)=>minute(a.start)-minute(b.start)):[];
    const changes=[moved];let cursor=minute(item.start);
    for(const partner of partners){changes.push(preview(partner,{date:item.date,start:time(cursor)}));cursor+=seconds(partner)/60;}
    const result={changes,swap:partners[0]||null,swaps:partners};
    if(partners.length>11)return {...result,problem:'Một lần đổi chỗ hỗ trợ tối đa 12 worklog. Chọn nhóm nhỏ hơn.'};
    if(partners.some(x=>x.calendarSplitRoot))return {...result,problem:'Vùng thả có phần tách chưa lưu. Lưu hoặc bỏ bản nháp trước khi đổi chỗ.'};
    if(partners.length>1&&(partners.some(x=>minute(x.start)<minute(moved.start)||minute(x.start)+seconds(x)/60>minute(moved.start)+seconds(moved)/60)||partners.reduce((n,x)=>n+seconds(x),0)>seconds(item)||partners.slice(0,-1).some(x=>seconds(x)%60)))
      return {...result,problem:'Không đủ chỗ để đổi lịch: nhóm worklog phải nằm gọn trong vùng thả và vừa vùng nguồn.'};
    if(!changes.every(inWindow))return {...result,problem:'Vị trí mới đi qua giờ nghỉ hoặc nằm ngoài khung cho phép.'};
    const movedKeys=new Set(changes.map(key)),stationary=items.filter(x=>!movedKeys.has(key(x)));
    if(changes.some((x,i)=>changes.slice(i+1).some(y=>overlaps(x,y))||stationary.some(y=>overlaps(x,y))))
      return {...result,problem:'Không đủ chỗ để đổi lịch: thời lượng đang trùng một worklog khác.'};
    return {...result,problem:''};
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
    const final=pending.flatMap(parts);
    for(let i=0;i<final.length;i++) {
      if(!inWindow(final[i]))throw new Error('Thay đổi nằm ngoài khung giờ cho phép hoặc đi qua giờ nghỉ.');
      if(final.slice(i+1).some(other=>overlaps(final[i],other)) || current.some(other=>!moving.has(key(other))&&overlaps(final[i],other)))
        throw new Error('Lịch đích đã có worklog. Chỉnh lại các block hoặc bỏ thay đổi và tải lại lịch.');
    }
    const ordered=[];
    while(pending.length) {
      const index=pending.findIndex(d=>!pending.some(other=>other!==d&&parts(d).some(part=>overlaps(part,other.original))));
      if(index<0) {if(pending.some(d=>d.target.segments))throw new Error('Lưu hoặc bỏ nhóm đổi chỗ trước khi tách lịch phụ thuộc lẫn nhau.');ordered.push({cycle:pending.splice(0)});break;}
      ordered.push(pending.splice(index,1)[0]);
    }
    return ordered;
  }
  return {key,seconds,minute,started,same,preview,parts,project,overlaps,inWindow,fit,drop,resize,plan};
});
