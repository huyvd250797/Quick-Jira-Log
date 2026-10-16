(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QuickJiraCalendar=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function displayDuration(minutes){const total=Math.max(0,Math.round(Number(minutes)||0));return [Math.floor(total/60)?`${Math.floor(total/60)}h`:'',total%60?`${total%60}m`:''].filter(Boolean).join(' ')||'—';}
  function projectKey(item){const raw=String(item?.project||String(item?.key||'').split('-')[0]||'OTHER').trim().toUpperCase();return /^[A-Z][A-Z0-9_]{0,99}$/.test(raw)?raw:'OTHER';}
  function overtimeValue(value){
    if(typeof value==='boolean')return value;
    if(typeof value==='number')return value>0;
    if(Array.isArray(value))return value.some(overtimeValue);
    if(value&&typeof value==='object')return overtimeValue(value.value??value.name??false);
    return ['true','yes','1','ot','overtime','có','co'].includes(String(value||'').trim().toLowerCase());
  }
  function isOvertime(item){
    if(typeof item?.overtime==='boolean')return item.overtime;
    if(overtimeValue(item?.issueOvertime))return true;
    const match=String(item?.start||'').match(/^(\d{1,2}):(\d{2})$/);
    if(!match)return false;
    const start=Number(match[1])*60+Number(match[2]);
    return start>=1050; // Fallback follows the app's weekday OT window, never an issue-wide guess from weekend alone.
  }
  function paletteFor(project,saved){
    const key=projectKey({project});const registry=Object.create(null);const used=new Set();
    for(const [k,v] of Object.entries(saved||{})){
      if(/^[A-Z][A-Z0-9_]{0,99}$/.test(k)&&Number.isInteger(v?.h)&&v.h>=120&&v.h<=340&&Number.isInteger(v?.s)&&v.s>=48&&v.s<=68){registry[k]={h:v.h,s:v.s};used.add(`${v.h}:${v.s}`);}
    }
    if(registry[key])return {color:registry[key],registry,changed:false};
    let hash=2166136261;for(const c of key){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619)>>>0;}
    let color;
    for(let i=0;i<1105;i++){const n=(hash+i*37)%1105;const candidate={h:120+n%221,s:48+Math.floor(n/221)*5};if(!used.has(`${candidate.h}:${candidate.s}`)){color=candidate;break;}}
    color ||= {h:120+hash%221,s:48};registry[key]=color;return {color,registry,changed:true};
  }
  return {displayDuration,projectKey,overtimeValue,isOvertime,paletteFor};
});
