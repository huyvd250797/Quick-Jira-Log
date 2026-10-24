'use strict';
// Restore read-only views after a mobile tab is discarded. Writes never resume.
window.QuickJiraResume=(()=>{
 let owner='',generation=0,timer=0,queue=Promise.resolve(),interacted=false;
 const $=id=>document.getElementById(id),shown=id=>$(id)&&!$(id).classList.contains('hidden');
 document.addEventListener('pointerdown',()=>interacted=true,{capture:true});
 function capture(){if(!owner||!state.user)return null;
  const route=$('projectStatsDialog')?.open?'stats':shown('historyOverlay')?'history':shown('plannerOverlay')?'summary':'home';
  const ids=['dashboardToday','dashboardWeek','dashboardTodayTarget','dashboardTodayRemaining','dashboardWeekRemaining','dashboardRange','dashboardWeekend','dashboardState'];
  return {route,filterIssues:state.filterLoaded?state.filterIssues:null,dashboard:state.dashboardUpdated?{date:state.dashboardDate,updated:state.dashboardUpdated,text:Object.fromEntries(ids.map(id=>[id,$(id).textContent])),todayBar:$('dashboardTodayBar').style.width,weekBar:$('dashboardWeekBar').style.width}:null,
   history:state.historyLoaded&&!calendarReadOnly()?{items:state.historyItems,date:$('historyDate').value,view:state.historyView,mode:state.calendarMode,scope:state.historyScrollScope,scroll:$('historyResults').scrollTop,viewport:captureCalendarViewport()}:null,
   summary:state.summary.loaded?{...state.summary,detail:null,loading:false}:null};
 }
 function flush(){clearTimeout(timer);timer=0;let data;try{data=capture();}catch{return queue;}const user=owner,token=generation;if(!data)return queue;queue=queue.catch(()=>{}).then(()=>{if(token===generation&&user===owner)return QuickJiraReportStorage.saveView(user,data);}).catch(()=>{});return queue;}
 function schedule(){if(!timer)timer=setTimeout(flush,350);}
 async function login(user){const name=String(user?.username||'');if(owner===name)return;owner=name;const token=++generation;interacted=false;
  try{const saved=await QuickJiraReportStorage.loadView(name);if(!saved||owner!==name||token!==generation||!state.user)return;
   if(saved.filterIssues&&!state.filterLoaded){state.filterIssues=saved.filterIssues;state.filterLoaded=true;renderFilterIssues();}
   if(saved.dashboard?.date===vietnamToday()&&!state.dashboardUpdated){const snap=saved.dashboard;state.dashboardDate=snap.date;state.dashboardUpdated=snap.updated;for(const [id,value]of Object.entries(snap.text))if($(id))$(id).textContent=value;$('dashboardTodayBar').style.width=snap.todayBar;$('dashboardWeekBar').style.width=snap.weekBar;$('dashboardCard').dataset.cached='true';$('dashboardState').textContent='Dữ liệu đã lưu · Đối chiếu với Jira khi có kết nối';}
   if(interacted)return;
   if(saved.route==='history'&&saved.history&&!$('projectStatsDialog').open){const h=saved.history;resetCalendarViewer();state.historyView=h.view;state.calendarMode=h.mode;state.historyItems=h.items;state.historyLoaded=true;state.historyError='';state.historyScrollScope=h.scope;$('historyDate').value=h.date;renderWorklogHistory();openOverlay('historyOverlay','closeHistoryBtn');void loadWorklogHistory({quiet:true});requestAnimationFrame(()=>{$('historyResults').scrollTop=h.scroll||0;if(h.viewport)restoreCalendarViewport(h.viewport);});}
   if(saved.route==='summary'&&saved.summary&&!$('projectStatsDialog').open){state.summary={...state.summary,...saved.summary};$('summaryDate').value=state.summary.date;renderSummary();openOverlay('plannerOverlay','closePlannerBtn');void loadSummary();}
  }catch{}
 }
 function logout({preserve=false}={}){const previous=owner;owner='';generation++;clearTimeout(timer);timer=0;if(previous&&!preserve)queue=queue.catch(()=>{}).then(()=>QuickJiraReportStorage.clear(previous)).catch(()=>{});}
 document.addEventListener('visibilitychange',()=>{if(document.hidden){void flush();void window.QuickJiraProjectReport?.flush();}});
 window.addEventListener('pagehide',()=>{void flush();void window.QuickJiraProjectReport?.flush();});
 document.addEventListener('click',schedule);document.addEventListener('change',schedule);setInterval(()=>{if(!document.hidden)void flush();},15000);
 if(typeof state!=='undefined'&&state.user)void login(state.user);
 return {login,logout,schedule,flush};
})();
