(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QuickJiraCalendarBounds=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(value,max)=>Math.max(0,Math.min(Math.max(0,max),value));
  function step(left,top,maxLeft,maxTop,dx,dy) {
    const x=clamp(left,maxLeft)+dx,y=clamp(top,maxTop)+dy;
    const nextLeft=clamp(x,maxLeft),nextTop=clamp(y,maxTop);
    return {left:nextLeft,top:nextTop,blocked:Math.abs(x-nextLeft)>.01||Math.abs(y-nextTop)>.01||Math.abs(left-clamp(left,maxLeft))>.01||Math.abs(top-clamp(top,maxTop))>.01};
  }
  return {step};
});
