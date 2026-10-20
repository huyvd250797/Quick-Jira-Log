'use strict';
// These bindings are initialized before app.js. App globals are used only once
// rendering begins or after DOMContentLoaded; zoom never fetches or writes Jira.
const CALENDAR_ZOOM_KEY='quick-jira-log:calendar-zoom:v1';
let calendarZoomProfile=null,calendarZoomPrefs=null,calendarZoomGrid=null,calendarZoomPositionFrame=0,calendarZoomSaveTimer=0,calendarViewportRestoreFrame=0,calendarZoomDirty=false;

function calendarZoomSettings(){
  if(!calendarZoomPrefs){
    // Fix the profile for this page, so rotating a phone never changes its zoom.
    calendarZoomProfile=matchMedia('(pointer: coarse)').matches?'mobile':'desktop';
    calendarZoomPrefs=QuickJiraZoom.settings(readStorage(CALENDAR_ZOOM_KEY,{})?.[calendarZoomProfile]);
  }
  return calendarZoomPrefs;
}

function applyCalendarZoomGeometry(){
  const inner=$('weeklyCalendar').querySelector('.weekly-inner'),body=inner?.querySelector('.week-grid-body');
  const results=$('historyResults');
  if(!body||body.dataset.calendarResizing==='true'||!inner.getClientRects().length||!results.clientWidth)return;
  const previous=calendarZoomGrid?.inner===inner?calendarZoomGrid.geometry:null;
  const focus=previous?QuickJiraZoom.anchor({left:results.scrollLeft,top:results.scrollTop},previous):null;
  const css=getComputedStyle(inner),header=inner.querySelector('.week-grid-heading');
  const args={width:results.clientWidth,height:results.clientHeight,header:header.offsetHeight,
    minutes:Number(body.dataset.minuteRange)||600,days:Number(css.getPropertyValue('--week-days'))||5,
    timeWidth:parseFloat(css.getPropertyValue('--week-base-time'))||60,
    minDay:parseFloat(css.getPropertyValue('--week-base-day'))||170,
    fullscreen:state.calendarFullscreen,zoom:calendarZoomSettings()};
  let geometry=QuickJiraZoom.dimensions(args);
  if(previous&&['dayWidth','minutePx','timeWidth','width','height','header'].every(key=>Math.abs(previous[key]-geometry[key])<.001)&&previous.viewWidth===args.width)return;
  inner.style.width=`${geometry.width}px`;
  inner.style.minWidth=`${geometry.width}px`;
  inner.style.setProperty('--week-day-width',`${geometry.dayWidth}px`);
  inner.style.setProperty('--week-time-width',`${geometry.timeWidth}px`);
  // Header wrapping can change its height at the smallest column size.
  geometry=QuickJiraZoom.dimensions({...args,header:header.offsetHeight});
  inner.style.setProperty('--week-minute-px',`${geometry.minutePx}px`);
  const rect=inner.getBoundingClientRect(),area=results.getBoundingClientRect();
  geometry={...geometry,viewWidth:results.clientWidth,
    offsetLeft:rect.left-area.left-results.clientLeft+results.scrollLeft,
    offsetTop:rect.top-area.top-results.clientTop+results.scrollTop};
  calendarZoomGrid={inner,geometry};
  if(focus){
    const next=QuickJiraZoom.scrollToAnchor(focus,geometry,results.scrollWidth-results.clientWidth,results.scrollHeight-results.clientHeight);
    results.scrollTo({left:next.left,top:next.top,behavior:'instant'});
  }
}

function syncCalendarZoom(){
  const prefs=calendarZoomSettings();
  const available=state.historyView==='calendar'&&state.calendarMode==='week';
  const button=$('calendarZoomBtn');
  button.classList.toggle('hidden',!available);
  button.disabled=state.calendarMovePending||state.historyLoading||!state.historyLoaded||!!state.historyError;
  button.classList.toggle('has-zoom',prefs.time!==100||prefs.day!==100);
  button.title=`Thu phóng lịch · Khung giờ ${prefs.time}% · Cột ngày ${prefs.day}%`;
  button.setAttribute('aria-label',button.title);
  if(!available)closeCalendarZoom(false);
  for(const axis of ['time','day']){
    const slider=$(`calendarZoom-${axis}`),value=prefs[axis];
    slider.value=String(value);
    slider.setAttribute('aria-valuetext',`${value}%`);
    slider.style.setProperty('--zoom-fill',`${(value-75)/125*100}%`);
    $(`calendarZoomValue-${axis}`).textContent=`${value}%`;
    $(`calendarZoomValue-${axis}`).setAttribute('aria-label',`Đặt lại ${axis==='time'?'khung giờ':'cột ngày'} về 100%`);
    for(const dir of [-1,1])document.querySelector(`[data-zoom-axis="${axis}"][data-zoom-step="${dir}"]`).disabled=dir<0?value<=75:value>=200;
  }
  $('calendarZoomResetBtn').disabled=prefs.time===100&&prefs.day===100;
}

function setCalendarZoom(axis,value){
  if(state.calendarMovePending||!['time','day','both'].includes(axis))return;
  const prefs=calendarZoomSettings();
  if(axis==='both')calendarZoomPrefs={time:100,day:100};
  else calendarZoomPrefs={...prefs,[axis]:QuickJiraZoom.percent(value)};
  if(prefs.time===calendarZoomPrefs.time&&prefs.day===calendarZoomPrefs.day)return;
  calendarZoomDirty=true;
  clearTimeout(calendarZoomSaveTimer);
  calendarZoomSaveTimer=setTimeout(persistCalendarZoom,150);
  scheduleWeekFit();
  syncCalendarZoom();
}

function persistCalendarZoom(){
  clearTimeout(calendarZoomSaveTimer);calendarZoomSaveTimer=0;
  if(!calendarZoomPrefs||!calendarZoomDirty)return;
  calendarZoomDirty=false;
  const stored=readStorage(CALENDAR_ZOOM_KEY,{});
  writeStorage(CALENDAR_ZOOM_KEY,{desktop:QuickJiraZoom.settings(stored?.desktop),mobile:QuickJiraZoom.settings(stored?.mobile),[calendarZoomProfile]:calendarZoomPrefs});
}

function captureCalendarViewport(){
  const results=$('historyResults'),inner=$('weeklyCalendar').querySelector('.weekly-inner');
  const geometry=calendarZoomGrid?.inner===inner?calendarZoomGrid.geometry:null;
  if(!geometry||!inner?.getClientRects().length)return null;
  const columns=[...inner.querySelectorAll('.week-day-column')];
  const focal=QuickJiraZoom.anchor({left:results.scrollLeft,top:results.scrollTop},geometry);
  return {focal:QuickJiraExperience.focalSnapshot(focal,Number(columns[0]?.dataset.fromMinute)||0,columns.map(c=>c.dataset.calendarDate)),left:results.scrollLeft,top:results.scrollTop};
}
function restoreCalendarViewport(snapshot,attempt=0){
  if(!snapshot)return;
  const inner=$('weeklyCalendar').querySelector('.weekly-inner'),results=$('historyResults');
  if(!inner||calendarZoomGrid?.inner!==inner)return;
  const columns=[...inner.querySelectorAll('.week-day-column')];
  const body=inner.querySelector('.week-grid-body'),actual=columns[0]?.getBoundingClientRect(),geometry=calendarZoomGrid.geometry;
  if(actual&&attempt<3&&(Math.abs(actual.height/Number(body.dataset.minuteRange)-geometry.minutePx)>.002||Math.abs(actual.width-geometry.dayWidth)>.05)){
    cancelAnimationFrame(calendarViewportRestoreFrame);
    calendarViewportRestoreFrame=requestAnimationFrame(()=>{calendarViewportRestoreFrame=0;if(inner===$('weeklyCalendar').querySelector('.weekly-inner'))restoreCalendarViewport(snapshot,attempt+1);});
    return;
  }
  const anchor=QuickJiraExperience.focalAnchor(snapshot.focal,Number(columns[0]?.dataset.fromMinute)||0,columns.map(c=>c.dataset.calendarDate));
  const next=anchor?QuickJiraZoom.scrollToAnchor(anchor,calendarZoomGrid.geometry,results.scrollWidth-results.clientWidth,results.scrollHeight-results.clientHeight):snapshot;
  results.scrollTo({left:next.left,top:next.top,behavior:'instant'});
}

function closeCalendarZoom(restore=true){
  const dialog=$('calendarZoomDialog');
  if(!dialog?.open)return;
  persistCalendarZoom();
  dialog.close();
  $('calendarZoomBtn').setAttribute('aria-expanded','false');
  if(restore&&$('calendarZoomBtn').getClientRects().length)$('calendarZoomBtn').focus({preventScroll:true});
}

function scheduleCalendarZoomPosition(){
  cancelAnimationFrame(calendarZoomPositionFrame);
  positionCalendarZoom();
  calendarZoomPositionFrame=requestAnimationFrame(positionCalendarZoom);
}

function positionCalendarZoom(){
  const dialog=$('calendarZoomDialog');
  if(!dialog.open)return;
  const vv=window.visualViewport,w=vv?.width||innerWidth,h=vv?.height||innerHeight;
  dialog.style.setProperty('--zoom-vh',`${h}px`);
  const anchor=$('calendarZoomBtn').getBoundingClientRect();
  const width=dialog.offsetWidth,height=dialog.offsetHeight;
  const left=Math.max(8,Math.min(w-width-8,anchor.right-width));
  const top=Math.max(8,Math.min(h-height-8,anchor.bottom+8));
  dialog.style.left=`${left+(vv?.offsetLeft||0)}px`;
  dialog.style.top=`${top+(vv?.offsetTop||0)}px`;
}

document.addEventListener('DOMContentLoaded',()=>{
  const dialog=$('calendarZoomDialog'),button=$('calendarZoomBtn');
  button.addEventListener('click',()=>{
    if(state.calendarMovePending||state.historyLoading||!$('weeklyCalendar').querySelector('.week-grid-body'))return;
    resetCalendarInteraction();
    $('historyOverlay').classList.remove('calendar-options-open');
    $('calendarOptionsBtn').setAttribute('aria-expanded','false');
    syncCalendarZoom();
    dialog.showModal();button.setAttribute('aria-expanded','true');scheduleCalendarZoomPosition();
    $('calendarZoomCloseBtn').focus({preventScroll:true});
  });
  $('calendarZoomCloseBtn').addEventListener('click',()=>closeCalendarZoom());
  $('calendarZoomResetBtn').addEventListener('click',()=>setCalendarZoom('both',100));
  for(const axis of ['time','day']){
    $(`calendarZoom-${axis}`).addEventListener('input',event=>setCalendarZoom(axis,Number(event.target.value)));
    $(`calendarZoomValue-${axis}`).addEventListener('click',()=>setCalendarZoom(axis,100));
  }
  document.querySelectorAll('[data-zoom-axis]').forEach(button=>button.addEventListener('click',()=>{
    const axis=button.dataset.zoomAxis;setCalendarZoom(axis,calendarZoomSettings()[axis]+25*Number(button.dataset.zoomStep));
  }));
  // Close only when both ends of a tap are outside; slider drags stay inside.
  let outside=false;
  dialog.addEventListener('pointerdown',event=>{outside=event.target===dialog&&!(event.clientX>=dialog.getBoundingClientRect().left&&event.clientX<=dialog.getBoundingClientRect().right&&event.clientY>=dialog.getBoundingClientRect().top&&event.clientY<=dialog.getBoundingClientRect().bottom);});
  dialog.addEventListener('click',event=>{if(outside&&event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeCalendarZoom();}outside=false;});
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeCalendarZoom();});
  document.addEventListener('keydown',event=>{
    if(dialog.open&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeCalendarZoom();}
  },true);
  for(const source of [window,window.visualViewport].filter(Boolean))source.addEventListener('resize',scheduleCalendarZoomPosition,{passive:true});
  window.visualViewport?.addEventListener('scroll',scheduleCalendarZoomPosition,{passive:true});
  if(window.ResizeObserver)new ResizeObserver(scheduleCalendarZoomPosition).observe(dialog);
  window.addEventListener('pagehide',persistCalendarZoom);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){persistCalendarZoom();closeCalendarZoom(false);}});
  syncCalendarZoom();
});
