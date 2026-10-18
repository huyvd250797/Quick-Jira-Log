'use strict';
// Read-only calendar identities. Never use a selected user as authentication.
const { jiraFetch, JiraError } = require('./jira');
const { mapWithConcurrency } = require('./async');
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
  const attempt=async(path,timeoutMs)=>{try{return await jiraFetch(path,{timeoutMs},auth);}catch(error){if(error.status===401)throw error;return {response:{ok:false,status:error.status||502},data:null};}};
  const endpoints=[
    `/rest/api/2/user/picker?${new URLSearchParams({query,maxResults:'20',showAvatar:'false'})}`,
    `/rest/api/2/user/search?${new URLSearchParams({username:query,startAt:'0',maxResults:'20',includeActive:'true',includeInactive:'false'})}`
  ];
  let succeeded=false,unresolved=0,denied=false,malformed=false;
  for(const endpoint of endpoints) {
    const {response,data}=await attempt(endpoint,3500);
    if(response.status===401)throw new JiraError('Phiên Jira đã hết hạn.',401);
    if(!response.ok){denied ||= [403,404].includes(response.status);continue;}
    const raw=Array.isArray(data)?data:Array.isArray(data?.users)?data.users:Array.isArray(data?.users?.users)?data.users.users:Array.isArray(data?.values)?data.values:null;
    if(!raw){malformed=true;continue;}succeeded=true;
    const seenNames=new Set(),candidates=raw.filter(user=>{
      const name=String(user?.name||user?.username||'');
      if(!name||name.length>255||/[\x00-\x1f\x7f]/.test(name)||user.active===false||user.deleted===true||seenNames.has(normalize(name)))return false;
      seenNames.add(normalize(name));return true;
    }).slice(0,20);
    const users=await mapWithConcurrency(candidates,4,async candidate=>{
      const name=String(candidate.name||candidate.username);
      if(validUserKey(candidate.key)&&normalize(candidate.key)!==normalize(name))return publicUser({...candidate,name});
      // Picker responses can omit the key or use username as an alias. Resolve it
      // instead of silently dropping every suggestion or inventing a key.
      const lookup=await attempt(`/rest/api/2/user?username=${encodeURIComponent(name)}`,2500);
      if(lookup.response.status===401)throw new JiraError('Phiên Jira đã hết hạn.',401);
      if(lookup.response.ok&&validUserKey(lookup.data?.key)&&normalize(lookup.data?.name)===normalize(name)&&lookup.data?.active!==false)return publicUser(lookup.data);
      unresolved++;return null;
    });
    const seenKeys=new Set(),out=users.filter(user=>user&&!seenKeys.has(user.key)&&seenKeys.add(user.key));
    if(out.length)return out;
  }
  if(unresolved)throw new JiraError('Jira có kết quả tìm kiếm nhưng chưa đọc được định danh nhân sự. Hãy thử lại hoặc kiểm tra quyền Browse Users.',502);
  if(succeeded)return [];
  if(denied)throw new JiraError('Không tìm được người dùng. Hãy kiểm tra quyền Browse Users trên Jira.',403);
  throw new JiraError(malformed?'Jira trả về dữ liệu gợi ý nhân sự không hợp lệ.':'Chưa kết nối được chức năng tìm nhân sự trên Jira. Vui lòng thử lại.',502);
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
