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
  // Cold colors come first. Separate hue AND lightness to avoid near-identical pastels.
  const hues = [145, 280, 330, 170, 125, 300, 15, 155, 350, 290, 135, 315];
  const colors = [];
  for (const l of [80, 64, 88, 72, 84]) for (const s of [72, 88]) for (const h of hues) colors.push({ h, s, l });
  function lab({h,s,l}) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1-l);
    const channel = n => { const k=(n+h/30)%12; const v=l-a*Math.max(-1,Math.min(k-3,9-k,1)); return v<=.04045?v/12.92:((v+.055)/1.055)**2.4; };
    const r=channel(0),g=channel(8),b=channel(4);
    const x=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),y=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),z=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
    return [.2104542553*x+.793617785*y-.0040720468*z,1.9779984951*x-2.428592205*y+.4505937099*z,.0259040371*x+.7827717662*y-.808675766*z];
  }
  function colorDistance(a,b) { const x=lab(a),y=lab(b); return Math.hypot(...x.map((v,i)=>v-y[i])); }
  function paletteFor(project,saved){
    const key=projectKey({project}),registry=Object.create(null),used=[];
    for(const [k,v] of Object.entries(saved||{})){
      if(/^[A-Z][A-Z0-9_]{0,99}$/.test(k)&&colors.some(c=>c.h===v?.h&&c.s===v?.s&&c.l===v?.l)){
        registry[k]={h:v.h,s:v.s,l:v.l}; used.push(registry[k]);
      }
    }
    if(registry[key])return {color:registry[key],registry,changed:false};
    // Prioritize mint, lilac and rose; exclude the default blue and OT yellow.
    const preferred=[colors[0],colors[1],colors.find(c=>c.h===330&&c.l===64&&c.s===88)];
    let color=preferred.find(c=>!used.some(v=>v.h===c.h&&v.s===c.s&&v.l===c.l));
    if(!color){
      let best=-1;
      for(const candidate of colors){
        if(used.some(c=>c.h===candidate.h&&c.s===candidate.s&&c.l===candidate.l))continue;
        const separation=Math.min(...used.map(c=>colorDistance(candidate,c)));
        const score=separation*(candidate.h<=285?1.12:1);
        if(score>best){best=score;color=candidate;}
      }
    }
    // The palette supports 120 distinct swatches; keys remain visible beyond that.
    color ||= colors[used.length%colors.length];
    registry[key]={...color};return {color:registry[key],registry,changed:true};
  }
  return {displayDuration,projectKey,overtimeValue,isOvertime,paletteFor,colorDistance};
});
