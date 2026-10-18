'use strict';
// Keep native scrolling inside the calendar; intercept only an outward edge pan.
// CSS stops elastic/momentum overscroll. The event guard also covers diagonal
// touch gestures and prevents chaining from the fixed toolbar into the sheet.
document.addEventListener('DOMContentLoaded',()=>{
  const overlay=$('historyOverlay'),results=$('historyResults');let touch=null;
  const active=()=>!overlay.classList.contains('hidden')&&state.historyView==='calendar';
  const bounds=(dx=0,dy=0)=>QuickJiraCalendarBounds.step(results.scrollLeft,results.scrollTop,results.scrollWidth-results.clientWidth,results.scrollHeight-results.clientHeight,dx,dy);
  const clamp=()=>{if(!active())return;const next=bounds();if(next.blocked)results.scrollTo(next.left,next.top);};
  overlay.addEventListener('touchstart',event=>{
    touch=null;
    if(!active()||event.touches.length!==1||event.target.closest('input,textarea,select'))return;
    const t=event.touches[0];touch={x:t.clientX,y:t.clientY,inside:results.contains(event.target)};
  },{capture:true,passive:true});
  overlay.addEventListener('touchmove',event=>{
    if(!touch||!active()||event.touches.length!==1){touch=null;return;}
    const t=event.touches[0],dx=touch.x-t.clientX,dy=touch.y-t.clientY;
    touch.x=t.clientX;touch.y=t.clientY;
    // Worklog long-press/drag owns its gesture, including its own auto-scroll.
    if(calendarGesture?.dragging||(calendarGesture?.mobile&&calendarGesture.ready))return;
    if(!touch.inside){if(event.cancelable)event.preventDefault();return;}
    const next=bounds(dx,dy);
    if(next.blocked&&event.cancelable){event.preventDefault();results.scrollTo(next.left,next.top);}
  },{capture:true,passive:false});
  for(const type of ['touchend','touchcancel'])overlay.addEventListener(type,()=>{touch=null;clamp();},{capture:true,passive:true});
  results.addEventListener('wheel',event=>{
    if(!active()||event.ctrlKey)return;
    const unit=event.deltaMode===1?16:event.deltaMode===2?results.clientHeight:1;
    let dx=event.deltaX*unit,dy=event.deltaY*unit;
    if(event.shiftKey&&!dx){dx=dy;dy=0;}
    const next=bounds(dx,dy);
    if(next.blocked&&event.cancelable){event.preventDefault();results.scrollTo(next.left,next.top);}
  },{passive:false});
  results.addEventListener('scroll',clamp,{passive:true});
});
