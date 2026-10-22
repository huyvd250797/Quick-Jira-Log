'use strict';
const {jiraFetch,JiraError}=require('./jira');
const {JIRA_BASE_URL}=require('./config');
const {quoteJql}=require('./calendar-users');
const issueKey=/^[A-Z][A-Z0-9_]*-\d+$/;
function input(value,max=160){const s=String(value??'').trim();if(s.length>max||/[\x00-\x1f\x7f]/.test(s))throw new JiraError('Giá trị tìm kiếm không hợp lệ hoặc quá dài.',400);return s;}
function searchParams(query={}){
  const q=input(query.q),project=input(query.project,100),status=input(query.status,100),type=input(query.type,100),assignee=input(query.assignee,255);
  const offset=String(query.startAt??'0');if(!/^\d{1,5}$/.test(offset)||Number(offset)>10000)throw new JiraError('Trang tìm kiếm không hợp lệ.',400);
  if(project&&!/^[A-Z][A-Z0-9_]*$/i.test(project))throw new JiraError('Mã dự án không hợp lệ.',400);
  if(q&&q.length<2)throw new JiraError('Nhập ít nhất 2 ký tự để tìm kiếm.',400);
  const clauses=[];
  if(q){
    if(issueKey.test(q.toUpperCase()))clauses.push(`key = ${quoteJql(q.toUpperCase())}`);
    else {
      // Treat user text as a literal Lucene phrase, never a JQL expression.
      const phrase='"'+q.replace(/[+\-&|!(){}\[\]^"~*?:\\/]/g,'\\$&')+'"';
      clauses.push(`text ~ ${quoteJql(phrase)}`);
    }
  }
  if(project)clauses.push(`project = ${quoteJql(project.toUpperCase())}`);
  if(status)clauses.push(`status = ${quoteJql(status)}`);
  if(type)clauses.push(`issuetype = ${quoteJql(type)}`);
  if(assignee==='@me')clauses.push('assignee = currentUser()');
  else if(assignee==='@unassigned')clauses.push('assignee is EMPTY');
  else if(assignee)clauses.push(`assignee = ${quoteJql(assignee)}`);
  return {jql:(clauses.length?clauses.join(' AND ')+' ':'')+'ORDER BY updated DESC, key ASC',startAt:Number(offset),maxResults:25};
}
function text(value,max=500){return typeof value==='string'?value.slice(0,max):'';}
function publicIssue(issue){
  const key=text(issue?.key,100),f=issue?.fields||{};
  if(!issueKey.test(key))return null;
  return {key,summary:text(f.summary),project:{key:text(f.project?.key,100),name:text(f.project?.name,200)},
    issueType:{id:text(f.issuetype?.id,100),name:text(f.issuetype?.name,100),subtask:!!f.issuetype?.subtask},
    status:{id:text(f.status?.id,100),name:text(f.status?.name,100),category:['new','indeterminate','done'].includes(f.status?.statusCategory?.key)?f.status.statusCategory.key:'new',...(['green','yellow','blue-gray','medium-gray','brown','blue'].includes(f.status?.statusCategory?.colorName)?{colorName:f.status.statusCategory.colorName}:{})},
    assignee:f.assignee?{username:text(f.assignee.name,255),displayName:text(f.assignee.displayName,200)}:null,
    priority:text(f.priority?.name,100),updated:text(f.updated,60),parent:issueKey.test(f.parent?.key||'')?f.parent.key:'',url:`${JIRA_BASE_URL}/browse/${encodeURIComponent(key)}`};
}
async function read(path,auth){
  const r=await jiraFetch(path,{timeoutMs:12000},auth);
  if(!r.response.ok)throw new JiraError(r.response.status===401?'Phiên Jira đã hết hạn.':r.response.status===403?'Tài khoản chưa có quyền đọc dữ liệu này trên Jira.':`Không tải được dữ liệu Jira (HTTP ${r.response.status}).`,r.response.status);
  return r.data;
}
async function search(query,auth){
  const params=searchParams(query),fields=['summary','project','issuetype','status','assignee','priority','updated','parent'];
  // Search is read-only, including Jira's POST search alternative.
  let r=await jiraFetch('/rest/api/2/search',{method:'POST',body:{...params,fields},timeoutMs:15000},auth);
  if([404,405,403].includes(r.response.status))r=await jiraFetch('/rest/api/2/search?'+new URLSearchParams({...params,fields:fields.join(',')}),{timeoutMs:15000},auth);
  if(!r.response.ok)throw new JiraError(r.response.status===401?'Phiên Jira đã hết hạn.':r.response.status===403?'Jira không cho phép tìm kiếm với tài khoản hiện tại.':r.response.status===400?'Jira không chấp nhận nội dung hoặc bộ lọc này. Hãy thử từ khóa đơn giản hơn hoặc đặt lại bộ lọc.':'Chưa tìm kiếm được trên Jira. Vui lòng thử lại.',r.response.status);
  if(!Array.isArray(r.data?.issues)||!Number.isInteger(r.data.total)||r.data.total<0)throw new JiraError('Jira trả về kết quả tìm kiếm không hợp lệ.',502);
  const raw=r.data.issues,issues=raw.map(publicIssue).filter(Boolean),startAt=Number(r.data.startAt??params.startAt);
  if(startAt!==params.startAt||raw.length>25)throw new JiraError('Jira trả về trang kết quả không hợp lệ.',502);
  return {issues,total:r.data.total,startAt,nextStartAt:startAt+raw.length,hasMore:raw.length>0&&startAt+raw.length<r.data.total};
}
async function options(query,auth){
  const project=input(query.project,100);if(project&&!/^[A-Z][A-Z0-9_]*$/i.test(project))throw new JiraError('Mã dự án không hợp lệ.',400);
  const warnings=[];
  async function optional(path,label){try{const data=await read(path,auth);if(!Array.isArray(data))throw new JiraError('Dữ liệu bộ lọc không hợp lệ.',502);return data;}catch(e){if(e.status===401)throw e;warnings.push(label);return [];}}
  const [projects,statusRows,types]=await Promise.all([
    optional('/rest/api/2/project','Chưa tải được danh sách dự án; có thể nhập mã dự án trực tiếp.'),
    optional(project?`/rest/api/2/project/${encodeURIComponent(project)}/statuses`:'/rest/api/2/status','Chưa tải được trạng thái; vẫn có thể tìm kiếm với các bộ lọc khác.'),
    project?Promise.resolve([]):optional('/rest/api/2/issuetype','Chưa tải được loại công việc.')]);
  const unique=items=>[...new Map(items.filter(x=>x.id&&x.name).map(x=>[x.id,x])).values()].sort((a,b)=>a.name.localeCompare(b.name));
  const map=x=>({id:text(x.id,100),name:text(x.name,100)});
  return {projects:projects.filter(x=>/^[A-Z][A-Z0-9_]*$/i.test(x.key||'')).map(x=>({key:x.key,name:text(x.name,200)})).sort((a,b)=>a.key.localeCompare(b.key)),
    statuses:unique((project?statusRows.flatMap(x=>Array.isArray(x.statuses)?x.statuses:[]):statusRows).map(map)),
    types:unique((project?statusRows:types).map(map)),warnings};
}
module.exports={searchParams,publicIssue,search,options};
