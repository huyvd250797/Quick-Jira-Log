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
    return false;
  }
  // Restrained surfaces and accents: no default-blue or OT-yellow hues.
  const hues = [155, 280, 330, 170, 125, 300, 15, 350, 145, 290];
  const colors = [];
  for (const l of [90, 94]) for (const s of [30, 38]) for (const h of hues) colors.push({ h, s, l });
  function lab({h,s,l}) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1-l);
    const channel = n => { const k=(n+h/30)%12; const v=l-a*Math.max(-1,Math.min(k-3,9-k,1)); return v<=.04045?v/12.92:((v+.055)/1.055)**2.4; };
    const r=channel(0),g=channel(8),b=channel(4);
    const x=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),y=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),z=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
    return [.2104542553*x+.793617785*y-.0040720468*z,1.9779984951*x-2.428592205*y+.4505937099*z,.0259040371*x+.7827717662*y-.808675766*z];
  }
  function colorDistance(a,b) { const x=lab(a),y=lab(b); return Math.hypot(...x.map((v,i)=>v-y[i])); }
  function paletteFor(project,saved,{previous={},random=Math.random}={}) {
    const key=projectKey({project}),registry=Object.create(null),used=[];
    for(const [k,v] of Object.entries(saved||{})){
      if(/^[A-Z][A-Z0-9_]{0,99}$/.test(k)&&colors.some(c=>c.h===v?.h&&c.s===v?.s&&c.l===v?.l)){
        registry[k]={h:v.h,s:v.s,l:v.l};used.push(registry[k]);
      }
    }
    if(registry[key])return {color:registry[key],registry,changed:false};
    const same=(a,b)=>a?.h===b?.h&&a?.s===b?.s&&a?.l===b?.l;
    const unused=colors.filter(c=>!used.some(v=>same(c,v)));
    let candidates=unused.filter(c=>c.h!==previous[key]?.h);
    if(!candidates.length)candidates=unused.filter(c=>!same(c,previous[key]));
    if(!candidates.length)candidates=colors.filter(c=>c.h!==previous[key]?.h);
    // Compare the stronger accent colors so muted backgrounds can stay calm.
    const distance=(a,b)=>colorDistance({h:a.h,s:48,l:52},{h:b.h,s:48,l:52})+Math.abs(a.l-b.l)*.004;
    const ranked=candidates.map(c=>({color:c,score:used.length?Math.min(...used.map(v=>distance(c,v))):0})).sort((a,b)=>b.score-a.score);
    const pool=used.length?ranked.filter(c=>c.score>=ranked[0].score*.94):ranked;
    const value=Number(random());
    const index=Math.min(pool.length-1,Math.max(0,Math.floor((Number.isFinite(value)?value:0)*pool.length)));
    const color=pool[index].color;
    registry[key]={...color};return {color:registry[key],registry,changed:true};
  }
  return {displayDuration,projectKey,overtimeValue,isOvertime,paletteFor,colorDistance};
});
