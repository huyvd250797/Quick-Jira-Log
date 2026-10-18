'use strict';
// Selected identity is read-only; state.user and logwork inputs remain personal.
let calendarViewedUser=null,calendarViewerRevision=0,calendarUserSearchSeq=0,calendarUserSearchTimer=0;
const calendarViewerCache=new Map();
const calendarReadOnly=()=>!!calendarViewedUser;
const calendarUserStorageKey=()=>`qjl:calendar-recent:v1:${encodeURIComponent(String(state.user?.username||'').toLowerCase())}`;
function cleanCalendarUser(user) {
  if(!user||typeof user.key!=='string'||!user.key||user.key.length>255||typeof user.username!=='string'||!user.username)return null;
  return {key:user.key,username:user.username.slice(0,255),displayName:String(user.displayName||user.username).slice(0,255)};
}
function recentCalendarUsers() {
  try {const list=JSON.parse(localStorage.getItem(calendarUserStorageKey())||'[]');return Array.isArray(list)?list.map(cleanCalendarUser).filter(Boolean).filter(x=>x.username.toLowerCase()!==String(state.user?.username||'').toLowerCase()).filter((x,i,a)=>a.findIndex(y=>y.key===x.key)===i).slice(0,3):[];}catch{return [];}
}
function rememberCalendarUser(user) {
  const clean=cleanCalendarUser(user);if(!clean)return;
  try{localStorage.setItem(calendarUserStorageKey(),JSON.stringify([clean,...recentCalendarUsers().filter(x=>x.key!==clean.key)].slice(0,3)));}catch{}
}
function syncCalendarViewer() {
  const other=calendarReadOnly(),visible=state.calendarFullscreen&&state.historyView==='calendar';
  $('calendarViewerControls').classList.toggle('hidden',!visible);
  $('calendarViewerLabel').textContent=other?calendarViewedUser.displayName:`${state.user?.displayName||state.user?.username||'Tôi'} (Tôi)`;
  $('calendarViewerBtn').disabled=state.calendarMovePending;
  $('calendarViewerMode').classList.toggle('hidden',!other);
  $('historyOverlay').classList.toggle('is-calendar-readonly',other);
  $('calendarGestureHint').classList.toggle('hidden',other||state.historyView!=='calendar'||state.calendarMode!=='week');
}
function closeCalendarUserPicker() {
  ++calendarUserSearchSeq;clearTimeout(calendarUserSearchTimer);
  if($('calendarUserDialog').open)$('calendarUserDialog').close();
}
function resetCalendarViewer({reload=false}={}) {
  const changed=calendarReadOnly();calendarViewedUser=null;++calendarViewerRevision;calendarViewerCache.clear();closeCalendarUserPicker();
  if($('calendarReadDialog').open)$('calendarReadDialog').close();
  if(changed){++state.historySeq;state.historyItems=[];state.historyLoaded=false;state.historyLoading=false;state.historyError='';state.historyNotice='';}
  syncCalendarViewer();
  if(changed&&reload&&state.user&&!$('historyOverlay').classList.contains('hidden'))void loadWorklogHistory({quiet:true});
}
function calendarUserRow(user) {
  const button=document.createElement('button');button.type='button';button.className='calendar-user-row';
  const name=document.createElement('strong'),username=document.createElement('small');name.textContent=user.displayName;username.textContent=user.username;button.append(name,username);
  button.addEventListener('click',()=>selectCalendarUser(user));return button;
}
function renderRecentCalendarUsers() {
  const list=recentCalendarUsers();$('calendarUserRecent').replaceChildren(...list.map(calendarUserRow));$('calendarUserRecentSection').classList.toggle('hidden',!list.length);
}
function openCalendarUserPicker() {
  if(!state.calendarFullscreen||state.historyView!=='calendar'||state.calendarMovePending)return;
  if(state.calendarDrafts.size){openCalendarSave();showToast('Lưu hoặc bỏ bản nháp trước khi xem lịch người khác.');return;}
  resetCalendarInteraction();closeCalendarUserPicker();$('calendarUserSearch').value='';$('calendarUserResults').replaceChildren();
  $('calendarUserSearchState').textContent='Nhập tên hoặc username để tìm trên Jira.';renderRecentCalendarUsers();$('calendarUserDialog').showModal();$('calendarUserCloseBtn').focus({preventScroll:true});
}
async function searchCalendarUserPicker() {
  const query=$('calendarUserSearch').value.trim(),sequence=++calendarUserSearchSeq,user=state.user;$('calendarUserResults').replaceChildren();
  if(query.length<2){$('calendarUserSearchState').textContent='Nhập ít nhất 2 ký tự để tìm người dùng.';return;}
  $('calendarUserSearchState').textContent='Đang tìm người dùng trên Jira…';
  try {
    const data=await api(`/api?action=calendar-users&query=${encodeURIComponent(query)}`,{method:'GET',cache:'no-store'});
    if(sequence!==calendarUserSearchSeq||state.user!==user||!$('calendarUserDialog').open)return;
    const users=(Array.isArray(data.users)?data.users:[]).map(cleanCalendarUser).filter(Boolean);$('calendarUserResults').replaceChildren(...users.map(calendarUserRow));
    $('calendarUserSearchState').textContent=users.length?`${users.length} người dùng · Chọn để xem lịch`:'Không tìm thấy người dùng phù hợp.';
  }catch(error){if(sequence===calendarUserSearchSeq&&state.user===user)$('calendarUserSearchState').textContent=error.message||'Chưa tìm được người dùng. Hãy thử lại.';}
}
function selectCalendarUser(user) {
  if(!state.calendarFullscreen||state.historyView!=='calendar'||state.calendarMovePending)return;
  if(state.calendarDrafts.size){closeCalendarUserPicker();openCalendarSave();return;}
  const clean=cleanCalendarUser(user);if(user&&!clean)return;
  resetCalendarInteraction();closeCorrection({immediate:true});closeCalendarUserPicker();
  calendarViewedUser=clean&&clean.username.toLowerCase()!==String(state.user?.username||'').toLowerCase()?clean:null;
  ++calendarViewerRevision;syncCalendarViewer();void loadWorklogHistory({quiet:true});
}
async function fetchCalendarViewerHistory(range,force=false) {
  const selected=calendarViewedUser,revision=calendarViewerRevision,user=state.user;if(!selected)throw new Error('Chưa chọn người dùng để xem lịch.');
  const key=`${user.username}|${selected.key}|${range.start}|${range.end}`,cached=calendarViewerCache.get(key);
  if(!force&&cached&&Date.now()-cached.at<20000){rememberCalendarUser(selected);return cached.data;}
  const data=await api(`/api?action=calendar-history&userKey=${encodeURIComponent(selected.key)}&date=${encodeURIComponent(range.start)}&endDate=${encodeURIComponent(range.end)}`,{method:'GET',cache:'no-store'});
  if(data.readOnly!==true||data.viewedUser?.key!==selected.key||!Array.isArray(data.items))throw new Error('Jira chưa xác nhận được đúng lịch người dùng đã chọn.');
  data.items=data.items.map(item=>({...item,calendarReadOnly:true}));
  if(state.user===user&&revision===calendarViewerRevision&&calendarViewedUser?.key===selected.key) {
    calendarViewedUser=cleanCalendarUser(data.viewedUser)||selected;rememberCalendarUser(calendarViewedUser);calendarViewerCache.set(key,{at:Date.now(),data});if(calendarViewerCache.size>24)calendarViewerCache.delete(calendarViewerCache.keys().next().value);
  }
  return data;
}
function openCalendarReadDetails(item) {
  if(!item?.calendarReadOnly)return;
  $('calendarReadTitle').textContent=item.key;$('calendarReadOwner').textContent=`${calendarViewedUser?.displayName||'Người dùng đã chọn'} · Chỉ xem`;
  const values=[['Ngày',historyDayLabel(item.date)],['Thời gian',`${item.start}–${item.end}`],['Thời lượng',formatHistoryTimeSpent(item.minutes)],['Dự án',item.project||'—'],['Overtime',item.overtimeKnown?(item.overtime?'Có':'Không'):'Chưa xác định trên Jira'],['Công việc',item.summary||'—'],['Mô tả',item.description||'—']];
  $('calendarReadInfo').replaceChildren(...values.map(([label,value])=>{const group=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;group.append(dt,dd);return group;}));
  $('calendarReadDialog').showModal();$('calendarReadCloseBtn').focus({preventScroll:true});
}
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&($('calendarUserDialog').open||$('calendarReadDialog').open)){event.preventDefault();event.stopImmediatePropagation();closeCalendarUserPicker();$('calendarReadDialog').close();}
},true);
document.addEventListener('DOMContentLoaded',()=>{
  $('calendarViewerBtn').addEventListener('click',openCalendarUserPicker);$('calendarUserCloseBtn').addEventListener('click',closeCalendarUserPicker);$('calendarUserMeBtn').addEventListener('click',()=>selectCalendarUser(null));
  $('calendarUserSearch').addEventListener('input',()=>{++calendarUserSearchSeq;clearTimeout(calendarUserSearchTimer);calendarUserSearchTimer=setTimeout(searchCalendarUserPicker,280);});
  $('calendarUserSearch').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();clearTimeout(calendarUserSearchTimer);void searchCalendarUserPicker();}});
  $('calendarReadCloseBtn').addEventListener('click',()=>$('calendarReadDialog').close());
  for(const id of ['calendarUserDialog','calendarReadDialog']) {
    $(id).addEventListener('cancel',event=>{event.preventDefault();if(id==='calendarUserDialog')closeCalendarUserPicker();else $(id).close();});
    $(id).addEventListener('click',event=>{if(event.target===$(id)){if(id==='calendarUserDialog')closeCalendarUserPicker();else $(id).close();}});
  }
});
