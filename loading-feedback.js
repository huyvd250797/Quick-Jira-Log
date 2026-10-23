'use strict';
// V1.31: reads are background tasks; only confirmed writes/auth lock the UI.
window.QuickJiraBusy = (() => {
  const hud=document.createElement('dialog');hud.id='dataLoadingFeedback';hud.hidden=true;hud.tabIndex=-1;
  hud.setAttribute('aria-labelledby','dataLoadingTitle');hud.setAttribute('aria-describedby','dataLoadingDescription');
  hud.innerHTML='<div class="data-loading-card" role="status" aria-live="polite" aria-atomic="true"><span class="data-loading-spinner" aria-hidden="true"></span><strong id="dataLoadingTitle"></strong><span id="dataLoadingDescription">Vui lòng chờ xử lý xong để tiếp tục</span></div>';
  document.body.append(hud);
  const title=hud.querySelector('strong'),pending=new Map();
  const tray=document.createElement('aside');tray.id='backgroundTasks';tray.hidden=true;
  tray.setAttribute('popover','manual');tray.setAttribute('aria-label','Tác vụ nền');
  document.body.append(tray);
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const completed=new Map();let promote=true,lastTaskMarkup='',pressed=null,suppressClick=0,point=null;
  try{const p=JSON.parse(localStorage.getItem('qjl-task-position-v1'));if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))point={x:Math.max(0,Math.min(1,p.x)),y:Math.max(0,Math.min(1,p.y))};}catch{}
  function bounds(){const v=window.visualViewport;return {left:v?.offsetLeft||0,top:v?.offsetTop||0,width:v?.width||innerWidth,height:v?.height||innerHeight};}
  function place(){if(!point||tray.hidden)return;const b=bounds(),r=tray.getBoundingClientRect(),w=Math.max(0,b.width-r.width-16),h=Math.max(0,b.height-r.height-16);
   Object.assign(tray.style,{left:(b.left+8+point.x*w)+'px',top:(b.top+8+point.y*h)+'px',right:'auto',bottom:'auto'});
  }
  function chosen(){return [...pending.values(),...completed.values()].find(x=>x.id==='project-report');}
  function background(){
    const current=chosen();tray.hidden=!current;
    if(!current){if(tray.matches(':popover-open'))tray.hidePopover();tray.replaceChildren();lastTaskMarkup='';return;}
    const percent=current.total===undefined?null:current.total===0?100:Math.min(100,Math.floor((current.done||0)/current.total*100));
    const copy=percent===null?(current.detail||''):(current.done||0)+'/'+current.total+' · '+percent+'%';
    const markup='<button type="button" class="background-task-pill" data-task-open aria-label="Mở thống kê dự án, có thể kéo để di chuyển"><span class="background-task-spinner '+escape(current.status||'')+'" aria-hidden="true"></span><span class="background-task-copy"><strong>'+escape(current.label)+'</strong><small>'+escape(copy)+'</small><span class="background-task-track" aria-hidden="true"><i style="width:'+(percent??24)+'%"></i></span></span></button>';
    if(!pressed&&markup!==lastTaskMarkup){tray.innerHTML=markup;lastTaskMarkup=markup;}
    if(typeof tray.showPopover==='function'){
      if(promote&&tray.matches(':popover-open'))tray.hidePopover();if(!tray.matches(':popover-open'))tray.showPopover();
    }else {const host=[...document.querySelectorAll('dialog[open]')].filter(x=>x!==hud).at(-1)||document.fullscreenElement||document.body;if(tray.parentElement!==host)host.append(tray);}
    promote=false;place();
  }
  tray.addEventListener('pointerdown',e=>{if(e.button>0||!e.target.closest('[data-task-open]'))return;const r=tray.getBoundingClientRect();pressed={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top,moved:false};try{tray.setPointerCapture(e.pointerId);}catch{}});
  tray.addEventListener('pointermove',e=>{if(!pressed||e.pointerId!==pressed.id)return;const dx=e.clientX-pressed.x,dy=e.clientY-pressed.y;if(Math.hypot(dx,dy)>6)pressed.moved=true;if(!pressed.moved)return;
    e.preventDefault();const b=bounds(),r=tray.getBoundingClientRect(),w=Math.max(1,b.width-r.width-16),h=Math.max(1,b.height-r.height-16);
    point={x:Math.max(0,Math.min(1,(pressed.left+dx-b.left-8)/w)),y:Math.max(0,Math.min(1,(pressed.top+dy-b.top-8)/h))};place();
  });
  function endPointer(e){if(!pressed||pressed.id!==e.pointerId)return;const moved=pressed.moved;pressed=null;suppressClick=Date.now()+600;try{tray.releasePointerCapture(e.pointerId);}catch{}
   if(moved&&point)try{localStorage.setItem('qjl-task-position-v1',JSON.stringify(point));}catch{}
   if(e.type==='pointerup'&&!moved)chosen()?.onOpen?.();schedule();
  }
  tray.addEventListener('pointerup',endPointer);tray.addEventListener('pointercancel',endPointer);
  tray.addEventListener('click',e=>{if(e.target.closest('[data-task-open]')&&(e.detail===0||Date.now()>suppressClick))chosen()?.onOpen?.();});
  tray.addEventListener('contextmenu',e=>e.preventDefault());
  window.addEventListener('resize',place);window.visualViewport?.addEventListener('resize',place);window.visualViewport?.addEventListener('scroll',place);
  const animated=new Set();
  const targets={
   'subtasks':['filterLoading'],'worklog-history':['worklogHistoryState'],'calendar-history':['worklogHistoryState'],
   'jira-search':['jiraSearchState'],'jira-filter-issues':['jiraSearchState'],'jira-search-options':['jiraOptionsState'],
   'jira-issue':['jiraDetailNotice','jiraIssueDescription'],'jira-issue-subtasks':['jiraSubtasksState'],'jira-issue-worklogs':['jiraWorklogsState'],
   'jira-update-options':['jiraEditState'],'jira-subtask-edit-options':['jiraSubtaskEditState'],'jira-parent-edit-options':['jiraSubtaskEditState'],
   'jira-create-meta':['jiraCreateState'],'jira-create-types':['jiraCreateState'],'jira-create-projects':['jiraCreateState'],
   'calendar-users':['calendarUserSearchState','jiraPersonState'],'jira-attachments':['jiraFilesState'],'issue-info':['issueLookupState'],
   'jira-saved-filters':['jiraSavedState'],'jira-create-users':['jiraCreatePeopleState'],'jira-issue-comments':['jiraCommentsState'],
   'summary':['summaryState']
  };
  function animations(){
   const needed=new Set();
   if(typeof state!=='undefined'&&state.summary?.loading&&byId('summaryState'))needed.add(byId('summaryState'));
   for(const task of pending.values())if(!task.blocking)for(const id of targets[task.action]||[])if(byId(id))needed.add(byId(id));
   for(const el of animated)if(!needed.has(el)){el.classList.remove('qjl-inline-loading');el.querySelector(':scope > .qjl-inline-skeleton')?.remove();animated.delete(el);}
   for(const el of needed){if(!el.classList.contains('qjl-inline-loading')){el.classList.add('qjl-inline-loading');animated.add(el);}if(!el.querySelector(':scope > .qjl-inline-skeleton')){const skeleton=document.createElement('span');skeleton.className='qjl-inline-skeleton';skeleton.setAttribute('aria-hidden','true');skeleton.innerHTML='<i></i><i></i><i></i>';el.prepend(skeleton);}}
  }
  const byId=id=>document.getElementById(id),shown=el=>!!el&&!el.closest('.hidden,[hidden]')&&!!el.getClientRects().length;
  const events=['pointerdown','pointermove','pointerup','mousedown','mouseup','click','dblclick','auxclick','contextmenu','touchstart','touchmove','touchend','wheel','keydown','keyup','beforeinput','input','change','submit','dragstart','drop'];
  let locked=false,queued=false,revealed=false,timer=0,source=null,updating=false;
  function titleFor(path,method='GET') {
    const action=new URL(path,location.href).searchParams.get('action');
    const labels={'login':'Đang đăng nhập Jira…','logout':'Đang đăng xuất…','status':'Đang kiểm tra phiên Jira…','subtasks':'Đang tải danh sách Sub-task…','issue-info':'Đang lấy thông tin công việc…','day-audit':'Đang kiểm tra giờ đã log…','worklog-history':'Đang cập nhật giờ làm…','calendar-history':'Đang tải lịch worklog…','calendar-users':'Đang tìm nhân sự trên Jira…','calendar-moves':'Đang lưu thay đổi lịch…','calendar-split':'Đang xử lý tách lịch…','worklog-correction':method==='DELETE'?'Đang xóa worklog…':'Đang lưu chỉnh sửa worklog…','worklog':'Đang logwork…','bulk-worklog':'Đang logwork hàng loạt…'};
    const searchLabels={'jira-search':'Đang tìm công việc trên Jira…','jira-search-options':'Đang tải bộ lọc Jira…','jira-issue':'Đang đọc chi tiết công việc…','jira-issue-subtasks':'Đang tải subtask…','jira-issue-worklogs':'Đang tải worklog…'};
    const createLabels={'jira-create-projects':'Đang tải dự án Jira…','jira-create-types':'Đang tải loại công việc…','jira-create-meta':'Đang tải form tạo công việc…','jira-create-users':'Đang tìm người nhận việc…','jira-create-parents':'Đang tìm công việc cha…','jira-create':'Đang tạo công việc Jira…'};
    return labels[action]||searchLabels[action]||createLabels[action]||'Đang xử lý dữ liệu…';
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
    }
    if(ownProgress)label=byId('logProgressTitle').textContent;
    const writes=[...pending.values()].filter(x=>x.blocking);
    return writes.length||label||ownProgress?{title:label||writes.at(-1).label,shield:ownProgress||boot}:null;
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
      background();animations();
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
  function begin(label='Đang xử lý dữ liệu…',options={}) {
    const token=Symbol(),task={label,token:crypto.randomUUID(),...options};pending.set(token,task);if(updating)schedule();else sync();let released=false;
    const end=(result={})=>{if(released)return;released=true;pending.delete(token);if(options.retain&&!options.blocking){Object.assign(task,result,{status:result.error?'error':'complete'});completed.set(token,task);setTimeout(()=>{completed.delete(token);schedule();},12000);}schedule();};
    end.update=changes=>{if(!released){Object.assign(task,changes);schedule();}};
    end.cancel=()=>{released=true;pending.delete(token);completed.delete(token);schedule();};
    return end;
  }
  async function run(label,fn,options={}){const end=begin(label,options);try{return await fn();}finally{end();}}
  hud.addEventListener('cancel',event=>{event.preventDefault();event.stopImmediatePropagation();});
  const observer=new MutationObserver(records=>{
    if(records.some(r=>r.target!==hud&&r.target.tagName==='DIALOG'&&r.attributeName==='open'&&r.target.open)){hud.dataset.promote='true';promote=true;}
    schedule();
  });
  // Observe busy owners only. No subtree scan on drag/zoom/grid mutations.
  const owners=new Set([document.body,...document.querySelectorAll('dialog'),...['historyResults','plannerOverlay','worklogCard','bulkCard','singleCapacityCard','bulkCapacityCard','filterLoading','calendarTaskRefreshBtn','refreshFilterBtn','summaryRefreshBtn','dashboardCard','saveCorrectionBtn','loginBtn','captchaRetryBtn','logBtn','bulkLogBtn','calendarUserResults','logProgressPanel'].map(byId),byId('plannerOverlay')?.querySelector('.summary-body')]);
  for(const owner of owners)if(owner&&owner!==hud)observer.observe(owner,{attributes:true,attributeFilter:['class','hidden','aria-busy','open','disabled']});
  document.addEventListener('fullscreenchange',()=>{hud.dataset.promote='true';promote=true;schedule();});
  document.addEventListener('DOMContentLoaded',schedule);
  return {begin,run,sync:schedule,titleFor,clearBackground(){for(const [k,v] of pending)if(!v.blocking)pending.delete(k);completed.clear();schedule();},get active(){return locked;},get count(){return pending.size;}};
})();
