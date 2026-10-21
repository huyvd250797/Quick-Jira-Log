'use strict';
// V1.19.1: one immediate interaction lock for all API work and UI completion.
// The card is delayed to avoid flashing on fast reads; the lock is never delayed.
window.QuickJiraBusy = (() => {
  const hud=document.createElement('dialog');hud.id='dataLoadingFeedback';hud.hidden=true;hud.tabIndex=-1;
  hud.setAttribute('aria-labelledby','dataLoadingTitle');hud.setAttribute('aria-describedby','dataLoadingDescription');
  hud.innerHTML='<div class="data-loading-card" role="status" aria-live="polite" aria-atomic="true"><span class="data-loading-spinner" aria-hidden="true"></span><strong id="dataLoadingTitle"></strong><span id="dataLoadingDescription">Vui lòng chờ xử lý xong để tiếp tục</span></div>';
  document.body.append(hud);
  const title=hud.querySelector('strong'),pending=new Map();
  const byId=id=>document.getElementById(id),shown=el=>!!el&&!el.closest('.hidden,[hidden]')&&!!el.getClientRects().length;
  const events=['pointerdown','pointermove','pointerup','mousedown','mouseup','click','dblclick','auxclick','contextmenu','touchstart','touchmove','touchend','wheel','keydown','keyup','beforeinput','input','change','submit','dragstart','drop'];
  let locked=false,queued=false,revealed=false,timer=0,source=null,updating=false;
  function titleFor(path,method='GET') {
    const action=new URL(path,location.href).searchParams.get('action');
    const labels={'login':'Đang đăng nhập Jira…','logout':'Đang đăng xuất…','status':'Đang kiểm tra phiên Jira…','subtasks':'Đang tải danh sách Sub-task…','issue-info':'Đang lấy thông tin công việc…','day-audit':'Đang kiểm tra giờ đã log…','worklog-history':'Đang cập nhật giờ làm…','calendar-history':'Đang tải lịch worklog…','calendar-users':'Đang tìm nhân sự trên Jira…','calendar-moves':'Đang lưu thay đổi lịch…','calendar-split':'Đang xử lý tách lịch…','worklog-correction':method==='DELETE'?'Đang xóa worklog…':'Đang lưu chỉnh sửa worklog…','worklog':'Đang logwork…','bulk-worklog':'Đang logwork hàng loạt…'};
    const searchLabels={'jira-search':'Đang tìm công việc trên Jira…','jira-search-options':'Đang tải bộ lọc Jira…'};
    return labels[action]||searchLabels[action]||'Đang xử lý dữ liệu…';
  }
  function current() {
    const s=typeof state==='undefined'?null:state;
    const ownProgress=!!byId('logProgressDialog')?.open&&!!s?.logProgress?.active;
    const boot=document.body.classList.contains('booting');
    let label='';
    if(s){
      if(s.calendarMovePending)label='Đang lưu thay đổi lịch…';
      else if(s.loginInFlight)label='Đang đăng nhập Jira…';
      else if(s.submitInFlight||s.bulkSubmitInFlight)label='Đang hoàn tất logwork…';
      else if(s.historyLoading)label='Đang tải lịch worklog…';
      else if(s.summary.loading)label='Đang tổng hợp giờ làm…';
      else if(s.filterLoading)label=byId('calendarLogDialog')?.open?'Đang tải Sub-task…':'Đang tải danh sách Sub-task…';
      else if(s.singleCapacity.loading&&shown(byId('worklogCard'))||s.bulkCapacity.loading&&shown(byId('bulkCard')))label='Đang kiểm tra giờ đã log…';
      else if(byId('worklogCorrectionDialog')?.open&&byId('saveCorrectionBtn')?.disabled)label='Đang lưu chỉnh sửa worklog…';
      else if(s.user&&byId('dashboardCard')?.getAttribute('aria-busy')==='true'&&shown(byId('dashboardCard')))label='Đang cập nhật giờ làm…';
    }
    if(ownProgress)label=byId('logProgressTitle').textContent;
    return pending.size||label||ownProgress?{title:label||[...pending.values()].at(-1),shield:ownProgress||boot}:null;
  }
  function stop(event) {
    if(!locked)return;
    if(event.cancelable)event.preventDefault();
    event.stopImmediatePropagation();
  }
  function focusGuard(event) {
    if(locked&&!hud.contains(event.target)&&!updating)hud.focus({preventScroll:true});
  }
  function listen(on) {
    for(const type of events)window[on?'addEventListener':'removeEventListener'](type,stop,{capture:true,passive:false});
    window[on?'addEventListener':'removeEventListener']('focusin',focusGuard,true);
  }
  function topLayer() {
    const host=document.fullscreenElement||document.body;
    if(hud.parentElement!==host){if(hud.open)hud.close();host.append(hud);}
    // DOM order does not establish top-layer order. A newly opened app dialog
    // invalidates our marker in the observer, so always re-promote in that case.
    if(hud.open&&hud.dataset.promote==='true')hud.close();
    delete hud.dataset.promote;
    if(!hud.open)hud.showModal();
  }
  function sync() {
    queued=false;if(updating)return;
    updating=true;
    try {
      const next=current();
      if(!next){
        clearTimeout(timer);timer=0;revealed=false;delete hud.dataset.visible;delete hud.dataset.shield;
        if(!locked)return;
        locked=false;listen(false);delete document.documentElement.dataset.qjlBusy;
        if(hud.open)hud.close();hud.hidden=true;
        const previous=source;source=null;
        if(previous?.isConnected&&!previous.disabled&&!previous.closest('.hidden,[hidden],[inert]')&&previous.getClientRects().length){
          const dialog=previous.closest('dialog'),active=[...document.querySelectorAll('dialog[open]')].at(-1);
          if((!dialog||dialog.open)&&(!active||active.contains(previous)))previous.focus({preventScroll:true});
        }
        return;
      }
      if(!locked){
        locked=true;source=document.activeElement;listen(true);document.documentElement.dataset.qjlBusy='true';
        // Clear pointer captures/long-press timers before a request can complete.
        if(typeof resetCalendarInteraction==='function')resetCalendarInteraction();
      }
      if(title.textContent!==next.title)title.textContent=next.title;
      hud.hidden=false;hud.toggleAttribute('data-shield',next.shield);
      topLayer();hud.focus({preventScroll:true});
      if(!next.shield&&!revealed&&!timer)timer=setTimeout(()=>{timer=0;revealed=true;schedule();},140);
      hud.toggleAttribute('data-visible',revealed&&!next.shield);
    } finally {updating=false;}
  }
  function schedule(){if(!queued){queued=true;queueMicrotask(sync);}}
  function begin(label='Đang xử lý dữ liệu…') {
    const token=Symbol();pending.set(token,label);if(updating)schedule();else sync();let released=false;
    return ()=>{if(released)return;released=true;pending.delete(token);schedule();};
  }
  async function run(label,fn){const end=begin(label);try{return await fn();}finally{end();}}
  hud.addEventListener('cancel',event=>{event.preventDefault();event.stopImmediatePropagation();});
  const observer=new MutationObserver(records=>{
    if(records.some(r=>r.target!==hud&&r.target.tagName==='DIALOG'&&r.attributeName==='open'&&r.target.open))hud.dataset.promote='true';
    schedule();
  });
  // Observe busy owners only. No subtree scan on drag/zoom/grid mutations.
  const owners=new Set([document.body,...document.querySelectorAll('dialog'),...['historyResults','plannerOverlay','worklogCard','bulkCard','singleCapacityCard','bulkCapacityCard','filterLoading','calendarTaskRefreshBtn','refreshFilterBtn','summaryRefreshBtn','dashboardCard','saveCorrectionBtn','loginBtn','captchaRetryBtn','logBtn','bulkLogBtn','calendarUserResults','logProgressPanel'].map(byId),byId('plannerOverlay')?.querySelector('.summary-body')]);
  for(const owner of owners)if(owner&&owner!==hud)observer.observe(owner,{attributes:true,attributeFilter:['class','hidden','aria-busy','open','disabled']});
  document.addEventListener('fullscreenchange',()=>{hud.dataset.promote='true';schedule();});
  document.addEventListener('DOMContentLoaded',schedule);
  return {begin,run,sync:schedule,titleFor,get active(){return locked;},get count(){return pending.size;}};
})();
