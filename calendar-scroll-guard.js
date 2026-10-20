'use strict';
// Native containment keeps compositor scrolling and momentum. Only old engines
// without CSS containment need the JS edge fallback; it uses cached bounds.
document.addEventListener('DOMContentLoaded',()=>{
  const overlay=$('historyOverlay'),results=$('historyResults');
  const active=()=>!overlay.classList.contains('hidden')&&state.historyView==='calendar';
  const nativeContainment=typeof CSS!=='undefined'&&CSS.supports('overscroll-behavior','none');
  const preventToolbarPan=event=>{
    if(active()&&!event.target.closest('input,textarea,select')&&event.touches.length===1&&event.cancelable)event.preventDefault();
  };
  $('calendarControls').addEventListener('touchmove',preventToolbarPan,{passive:false});
  if(nativeContainment)return;
  let touch=null,maxLeft=0,maxTop=0;
  const measure=()=>{maxLeft=Math.max(0,results.scrollWidth-results.clientWidth);maxTop=Math.max(0,results.scrollHeight-results.clientHeight);};
  const bounds=(dx=0,dy=0)=>QuickJiraCalendarBounds.step(results.scrollLeft,results.scrollTop,maxLeft,maxTop,dx,dy);
  const clamp=()=>{if(!active())return;const next=bounds();if(next.blocked)results.scrollTo(next.left,next.top);};
  if(window.ResizeObserver)new ResizeObserver(measure).observe(results);
  overlay.addEventListener('touchstart',event=>{
    touch=null;
    if(!active()||event.touches.length!==1||event.target.closest('input,textarea,select'))return;
    measure();const t=event.touches[0];touch={x:t.clientX,y:t.clientY,inside:results.contains(event.target)};
  },{capture:true,passive:true});
  overlay.addEventListener('touchmove',event=>{
    if(!touch||!active()||event.touches.length!==1){touch=null;return;}
    const t=event.touches[0],dx=touch.x-t.clientX,dy=touch.y-t.clientY;
    touch.x=t.clientX;touch.y=t.clientY;
    if(calendarGesture?.dragging||(calendarGesture?.mobile&&calendarGesture.ready))return;
    if(!touch.inside){if(event.cancelable)event.preventDefault();return;}
    const next=bounds(dx,dy);
    if(next.blocked&&event.cancelable){event.preventDefault();results.scrollTo(next.left,next.top);}
  },{capture:true,passive:false});
  for(const type of ['touchend','touchcancel'])overlay.addEventListener(type,()=>{touch=null;clamp();},{capture:true,passive:true});
  results.addEventListener('wheel',event=>{
    if(!active()||event.ctrlKey)return;
    measure();const unit=event.deltaMode===1?16:event.deltaMode===2?results.clientHeight:1;
    let dx=event.deltaX*unit,dy=event.deltaY*unit;
    if(event.shiftKey&&!dx){dx=dy;dy=0;}
    const next=bounds(dx,dy);
    if(next.blocked&&event.cancelable){event.preventDefault();results.scrollTo(next.left,next.top);}
  },{passive:false});
});
