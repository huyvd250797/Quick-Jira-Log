(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QuickJiraZoom=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const MIN=75,MAX=200,STEP=5;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function percent(value){return typeof value==='number'&&Number.isFinite(value)?clamp(Math.round(value/STEP)*STEP,MIN,MAX):100;}
  function settings(value){return {time:percent(value?.time),day:percent(value?.day)};}
  function dimensions({width,height,header,minutes,days,timeWidth,minDay,fullscreen,zoom}){
    const prefs=settings(zoom),count=Math.max(1,days),range=Math.max(1,minutes);
    const baseline=Math.max(minDay,(width-timeWidth)/count);
    // Keep all available space when the whole week already fits at a smaller zoom.
    const dayWidth=Math.max((width-timeWidth)/count,baseline*prefs.day/100);
    const minutePx=(fullscreen?Math.max(1,(height-header-2)/range):1)*prefs.time/100;
    return {dayWidth,minutePx,timeWidth,width:timeWidth+count*dayWidth,height,header};
  }
  function anchor(view,geometry){
    return {day:(view.left+(geometry.viewWidth-geometry.timeWidth)/2-geometry.offsetLeft)/geometry.dayWidth,
      minute:(view.top+(geometry.height-geometry.header)/2-geometry.offsetTop)/geometry.minutePx};
  }
  function scrollToAnchor(focus,geometry,maxLeft,maxTop){
    return {left:clamp(geometry.offsetLeft+focus.day*geometry.dayWidth-(geometry.viewWidth-geometry.timeWidth)/2,0,Math.max(0,maxLeft)),
      top:clamp(geometry.offsetTop+focus.minute*geometry.minutePx-(geometry.height-geometry.header)/2,0,Math.max(0,maxTop))};
  }
  return {MIN,MAX,STEP,percent,settings,dimensions,anchor,scrollToAnchor};
});
