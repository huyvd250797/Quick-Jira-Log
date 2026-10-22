'use strict';
const {jiraFetch,JiraError}=require('./jira');
const {publicIssue}=require('./jira-search');
const {quoteJql}=require('./calendar-users');
const {normalize}=require('./jira-content');
const keyPattern=/^[A-Z][A-Z0-9_]*-\d+$/;
function params(query){const key=String(query.key||'').trim().toUpperCase(),offset=String(query.startAt??'0');if(!keyPattern.test(key)||key.length>100)throw new JiraError('Mã công việc không hợp lệ.',400);if(!/^\d{1,6}$/.test(offset)||Number(offset)>100000)throw new JiraError('Trang dữ liệu không hợp lệ.',400);return {key,startAt:Number(offset)};}
function failed(status){return new JiraError(status===401?'Phiên Jira đã hết hạn.':status===403?'Bạn chưa có quyền xem phần dữ liệu này trên Jira.':status===404?'Không tìm thấy hoặc không có quyền xem công việc này.':`Chưa tải được dữ liệu công việc (HTTP ${status}).`,status);}
async function issue(key,auth,full=false){
  const fields=full?'summary,project,issuetype,status,assignee,priority,updated,parent,description':'summary,project,issuetype,status,assignee,priority,updated,parent';
  const r=await jiraFetch(`/rest/api/2/issue/${encodeURIComponent(key)}?fields=${fields}${full?'&expand=renderedFields':''}`,{timeoutMs:5000},auth);
  if(!r.response.ok)throw failed(r.response.status);
  const item=publicIssue(r.data);if(!item||item.key!==key)throw new JiraError('Jira trả về công việc không đúng mã yêu cầu.',502);
  return {item,raw:r.data};
}
async function detail(query,auth){const {key}=params(query),{item,raw}=await issue(key,auth,true);return {issue:{...item,description:normalize(raw.fields?.description),descriptionHtml:typeof raw.renderedFields?.description==='string'?raw.renderedFields.description.slice(0,400000):''}};}
function page(data,field,startAt){
  const all=data?.[field],total=data?.total,actual=data?.startAt??startAt;
  if(!Array.isArray(all)||!Number.isSafeInteger(total)||total<0||Number(actual)!==startAt)throw new JiraError('Jira trả về trang dữ liệu không hợp lệ.',502);
  const raw=all.slice(0,25);
  if(raw.length&&startAt+raw.length>total)throw new JiraError('Tổng số bản ghi Jira không khớp trang dữ liệu.',502);
  const nextStartAt=startAt+raw.length;
  // Advance only by the records actually delivered, never by all.length.
  return {raw,total,startAt,nextStartAt,hasMore:raw.length>0&&nextStartAt<total&&nextStartAt<=100000,limited:nextStartAt>100000&&nextStartAt<total};
}
async function subtasks(query,auth){
  const {key,startAt}=params(query);await issue(key,auth);
  const body={jql:`parent = ${quoteJql(key)} ORDER BY key ASC`,startAt,maxResults:25,fields:['summary','project','issuetype','status','assignee','priority','updated','parent']};
  let r=await jiraFetch('/rest/api/2/search',{method:'POST',body,timeoutMs:7000},auth);
  if([403,404,405].includes(r.response.status))r=await jiraFetch('/rest/api/2/search?'+new URLSearchParams({...body,fields:body.fields.join(',')}),{timeoutMs:7000},auth);
  if(!r.response.ok)throw failed(r.response.status);
  const p=page(r.data,'issues',startAt),items=p.raw.map(publicIssue);
  if(items.some(x=>!x||x.parent!==key))throw new JiraError('Jira trả về subtask không đúng công việc cha.',502);
  const {raw,...pagination}=p;return {...pagination,items};
}
async function worklogs(query,auth){
  const {key,startAt}=params(query);await issue(key,auth);
  const r=await jiraFetch(`/rest/api/2/issue/${encodeURIComponent(key)}/worklog?`+new URLSearchParams({startAt:String(startAt),maxResults:'25'}),{timeoutMs:7000},auth);
  if(!r.response.ok)throw failed(r.response.status);
  let data=r.data;
  // Older Server installations can return the entire worklog list and ignore
  // both paging parameters. Only locally paginate when completeness is proven.
  if(Array.isArray(data?.worklogs)&&data.worklogs.length===data.total&&Number(data.startAt||0)===0)
    data={...data,startAt,worklogs:data.worklogs.slice(startAt,startAt+25)};
  const p=page(data,'worklogs',startAt);
  const items=p.raw.map(w=>({id:String(w.id??''),started:typeof w.started==='string'?w.started:'',timeSpentSeconds:Number.isSafeInteger(w.timeSpentSeconds)&&w.timeSpentSeconds>=0?w.timeSpentSeconds:null,
    author:{username:typeof w.author?.name==='string'?w.author.name.slice(0,255):'',displayName:typeof w.author?.displayName==='string'?w.author.displayName.slice(0,200):''},comment:normalize(w.comment)}));
  if(items.some(w=>!/^\d+$/.test(w.id)))throw new JiraError('Jira trả về định danh worklog không hợp lệ.',502);
  const {raw,...pagination}=p;return {...pagination,items};
}
module.exports={params,detail,subtasks,worklogs};
