(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QuickJiraExperience=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function failureState(error){
    if(error?.details?.rolledBack)return 'rolledback';
    if(error?.details?.resultUnknown||/UNKNOWN/.test(error?.code||'')||!error?.status||error.status>=500)return 'unknown';
    return error.status===409?'conflict':'failed';
  }
  function totals(entries){
    const values=Array.from(entries),result={total:values.length,saved:0,failed:0,unknown:0,waiting:0};
    for(const entry of values){
      if(entry.status==='saved')result.saved++;
      else if(entry.status==='unknown')result.unknown++;
      else if(['failed','conflict','rolledback'].includes(entry.status))result.failed++;
      else result.waiting++;
    }
    return result;
  }
  function focalSnapshot(anchor,from,dates){
    const index=Math.max(0,Math.min(dates.length-1,Math.floor(anchor.day)));
    return {date:dates[index],fraction:Math.max(0,Math.min(1,anchor.day-index)),minute:from+anchor.minute};
  }
  function focalAnchor(snapshot,from,dates){
    const index=dates.indexOf(snapshot?.date);
    return index<0||!Number.isFinite(snapshot?.minute)?null:{day:index+snapshot.fraction,minute:snapshot.minute-from};
  }
  return {failureState,totals,focalSnapshot,focalAnchor};
});
