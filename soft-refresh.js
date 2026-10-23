'use strict';
// Refresh read models without navigating, clearing drafts or restarting reports.
(()=>{
 const button=document.getElementById('brandRefreshBtn');let active=false;
 button.addEventListener('click',async()=>{
  if(active||QuickJiraBusy.active)return;
  const user=state.user;if(!user){showToast('Đăng nhập Jira để làm mới dữ liệu.');return;}
  active=true;button.disabled=true;button.classList.add('is-refreshing');button.setAttribute('aria-busy','true');
  const position={x:scrollX,y:scrollY,list:document.getElementById('filterIssueList').scrollTop},before=state.dashboardUpdated;
  try{
   await Promise.allSettled([refreshDashboard({force:true}),loadFilterIssues({quiet:true})]);
   if(state.user!==user)return;
   document.getElementById('filterIssueList').scrollTop=position.list;
   window.scrollTo({left:position.x,top:position.y,behavior:'instant'});
   window.QuickJiraResume?.schedule();
   showToast(!state.filterLoaded||state.dashboardUpdated<=before?'Một phần dữ liệu chưa cập nhật được. Kiểm tra thông báo tại từng mục.':'Đã làm mới dữ liệu.');
  }finally{active=false;button.disabled=false;button.classList.remove('is-refreshing');button.removeAttribute('aria-busy');}
 });
})();
