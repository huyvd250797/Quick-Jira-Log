'use strict';
// Read-only calendar identities. Never use a selected user as authentication.
const { jiraFetch, JiraError } = require('./jira');
const normalize = value => String(value || '').trim().toLowerCase();
function publicUser(user) {
  return { key: String(user?.key || ''), username: String(user?.name || user?.username || ''), displayName: String(user?.displayName || user?.name || '') };
}
function validUserKey(key) { return typeof key === 'string' && key.length > 0 && key.length <= 255 && !/[\x00-\x1f\x7f]/.test(key); }
function authorIsUser(worklog,user) {
  const author=worklog?.author||{};
  // Stable keys take precedence. Duplicate display names are never identities.
  if(author.key&&user.key)return normalize(author.key)===normalize(user.key);
  if(author.accountId&&user.accountId)return String(author.accountId)===String(user.accountId);
  return !!author.name&&!!user.name&&normalize(author.name)===normalize(user.name);
}
async function resolveCalendarUser(key,auth) {
  if(!validUserKey(key))throw new JiraError('Người dùng Jira không hợp lệ.',400);
  const {response,data}=await jiraFetch(`/rest/api/2/user?key=${encodeURIComponent(key)}`,{},auth);
  if(!response.ok)throw new JiraError(response.status===401?'Phiên Jira đã hết hạn.':'Không tìm thấy hoặc không có quyền xem thông tin người dùng này.',response.status===401?401:response.status===403?403:404);
  if(!data?.key||!data?.name||normalize(data.key)!==normalize(key))throw new JiraError('Jira chưa xác nhận được đúng người dùng đã chọn.',502);
  return data;
}
async function searchCalendarUsers(query,auth) {
  const {response,data}=await jiraFetch(`/rest/api/2/user/picker?${new URLSearchParams({query,maxResults:'20',showAvatar:'false'})}`,{},auth);
  if(!response.ok)throw new JiraError(response.status===401?'Phiên Jira đã hết hạn.':'Không tìm được người dùng. Tài khoản cần quyền Browse Users trên Jira.',response.status===401?401:response.status===403||response.status===404?403:502);
  const seen=new Set();
  return (Array.isArray(data?.users)?data.users:[]).filter(u=>validUserKey(u?.key)&&u?.name&&!seen.has(u.key)&&seen.add(u.key)).slice(0,20).map(publicUser);
}
function quoteJql(value) { return '"'+String(value).replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"'; }
async function discoverCalendarUserIssues(date,endDate,user,auth) {
  const shift=(value,days)=>{const d=new Date(value+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
  const jql=`worklogAuthor = ${quoteJql(user.name)} AND worklogDate >= "${shift(date,-1)}" AND worklogDate <= "${shift(endDate,1)}" ORDER BY updated DESC`;
  const keys=[];let startAt=0,total=Infinity;
  while(startAt<total&&keys.length<2000) {
    let {response,data}=await jiraFetch('/rest/api/2/search',{method:'POST',body:{jql,startAt,maxResults:100,fields:['key']}},auth);
    if(!response.ok&&response.status!==401)({response,data}=await jiraFetch(`/rest/api/2/search?${new URLSearchParams({jql,startAt:String(startAt),maxResults:'100',fields:'key'})}`,{},auth));
    if(!response.ok)throw new JiraError('Không đọc được danh sách task của người dùng đã chọn.',response.status);
    const page=Array.isArray(data?.issues)?data.issues:[];keys.push(...page.map(x=>x.key).filter(Boolean));
    total=Number.isFinite(Number(data?.total))?Number(data.total):keys.length;
    if(!page.length)break;startAt+=page.length;
  }
  const result=[...new Set(keys)];result.truncated=startAt<total;return result;
}
module.exports={publicUser,validUserKey,authorIsUser,resolveCalendarUser,searchCalendarUsers,discoverCalendarUserIssues,quoteJql};
