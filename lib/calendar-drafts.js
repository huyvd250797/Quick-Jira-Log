(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QuickJiraDrafts=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const key = item => `${item.key}:${item.id}`;
  const seconds = item => Number(item.timeSpentSeconds ?? item.minutes * 60);
  const minute = value => Number(value.slice(0,2))*60+Number(value.slice(3,5));
  const started = item => item.started || `${item.date}T${item.start}:00.000+0700`;
  const same = (a,b) => Date.parse(started(a)) === Date.parse(started(b)) && seconds(a) === seconds(b);
  function preview(original,target) {
    const duration = seconds(original), end = minute(target.start)+duration/60;
    const endTime = `${String(Math.floor(end/60)).padStart(2,'0')}:${String(Math.floor(end%60)).padStart(2,'0')}`;
    return {...original,date:target.date,start:target.start,end:endTime,started:`${target.date}T${target.start}:00.000+0700`,minutes:duration/60,timeSpentSeconds:duration};
  }
  function project(items,drafts) {
    const seen = new Set();
    const result = items.map(item => {const id=key(item);seen.add(id);const draft=drafts.get(id);return draft ? preview(item,draft.target) : item;});
    for(const [id,draft] of drafts) if(!seen.has(id)) result.push(preview(draft.original,draft.target));
    return result;
  }
  function overlaps(a,b) {return a.date === b.date && minute(a.start)<minute(b.start)+seconds(b)/60 && minute(a.start)+seconds(a)/60>minute(b.start);}
  // Jira guards every update separately. Vacate occupied originals before moving
  // another block into them; never bypass the guard for a cyclic swap.
  function plan(drafts,current) {
    const pending=[...drafts.values()],moving=new Set(pending.map(d=>key(d.original)));
    const final=pending.map(d=>preview(d.original,d.target));
    for(let i=0;i<final.length;i++) {
      if(final.slice(i+1).some(other=>overlaps(final[i],other)) || current.some(other=>!moving.has(key(other))&&overlaps(final[i],other)))
        throw new Error('Lịch đích đã có worklog. Chỉnh lại các block hoặc bỏ thay đổi và tải lại lịch.');
    }
    const ordered=[];
    while(pending.length) {
      const index=pending.findIndex(d=>!pending.some(other=>other!==d&&overlaps(preview(d.original,d.target),other.original)));
      if(index<0) throw new Error('Các lịch đang đổi chỗ vòng nhau. Hãy chuyển một block tới chỗ trống và lưu trước, rồi đổi chỗ tiếp.');
      ordered.push(pending.splice(index,1)[0]);
    }
    return ordered;
  }
  return {key,seconds,started,same,preview,project,overlaps,plan};
});
