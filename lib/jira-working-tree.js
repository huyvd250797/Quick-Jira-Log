'use strict';
// Jira relationships only: never infer a parent from BigPicture visual indentation.
const {jiraFetch,JiraError}=require('./jira');
const {quoteJql}=require('./calendar-users');
const {publicIssue,searchParams}=require('./jira-search');
const KEY=/^[A-Z][A-Z0-9_]*-\d+$/;
const FIELDS=['summary','project','issuetype','status','assignee','priority','updated','parent'];
async function read(path,auth){
 const r=await jiraFetch(path,{timeoutMs:15000},auth);
 if(!r.response.ok)throw new JiraError(r.response.status===401?'Phiên Jira đã hết hạn.':r.response.status===403?'Jira chưa cho phép đọc nhánh công việc này.':'Không đọc được cấu trúc Jira. Vui lòng thử lại.',r.response.status);
 return r.data;
}
async function metadata(auth){
 const [fields,types]=await Promise.all([read('/rest/api/2/field',auth),read('/rest/api/2/issuetype',auth)]);
 if(!Array.isArray(fields)||!Array.isArray(types))throw new JiraError('Cấu hình Jira không hợp lệ.',502);
 const links=fields.filter(f=>f.schema?.custom==='com.pyxis.greenhopper.jira:gh-epic-link'&&/^customfield_\d+$/.test(f.id));
 const epics=types.filter(t=>!t.subtask&&[t.name,t.untranslatedName].some(n=>String(n).toLowerCase()==='epic')&&/^\d+$/.test(t.id));
 if(links.length!==1||epics.length!==1)throw new JiraError('Chưa xác định được Epic Link hoặc loại Epic trên Jira. Cần kiểm tra cấu hình dự án; app không tự đoán quan hệ.',422);
 return {link:links[0].id,epicType:epics[0].id};
}
async function tree(query,auth){
 const kind=query.kind||'epics';if(!['epics','search','children','subtasks'].includes(kind))throw new JiraError('Loại nhánh không hợp lệ.',400);
 const project=String(query.project||'').trim().toUpperCase();
 if(!/^[A-Z][A-Z0-9_]*$/.test(project)||project.length>100)throw new JiraError('Chọn mã dự án hợp lệ.',400);
 const base=searchParams({project,startAt:query.startAt});
 const q=String(query.q||'').trim();if(q.length>160||/[\x00-\x1f\x7f]/.test(q))throw new JiraError('Từ khóa không hợp lệ.',400);
 const key=String(query.key||'').trim().toUpperCase();
 if(['children','subtasks'].includes(kind)&&!KEY.test(key))throw new JiraError('Mã công việc cha không hợp lệ.',400);
 const meta=await metadata(auth);let relation;
 if(kind==='children'||kind==='subtasks'){
  const parent=await read('/rest/api/2/issue/'+encodeURIComponent(key)+'?fields=issuetype,project',auth);
  if(parent?.key!==key||!parent.fields?.issuetype)throw new JiraError('Không xác định được công việc cha.',502);
  if(kind==='children'&&parent.fields.issuetype.id!==meta.epicType)throw new JiraError('Công việc đã chọn không phải Epic.',400);
  if(kind==='subtasks'&&(parent.fields.issuetype.subtask||parent.fields.issuetype.id===meta.epicType))throw new JiraError('Chọn Story, Task hoặc Bug để xem Subtask.',400);
  relation=kind==='children'?`cf[${meta.link.slice(12)}] = ${quoteJql(key)}`:`parent = ${quoteJql(key)}`;
 }else relation=kind==='epics'?`project = ${quoteJql(project)} AND issuetype = ${quoteJql(meta.epicType)}`:`project = ${quoteJql(project)} AND issuetype != ${quoteJql(meta.epicType)} AND issuetype not in subTaskIssueTypes()`;
 const jql=relation+' ORDER BY key ASC';
 const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
 const words=normalize(q).split(/\s+/).filter(Boolean);
 const started=Date.now();
 let offset=base.startAt,scanned=0,total=0,issues=[],hasMore=false;
 // A bounded scan gives substring/diacritic-insensitive matches, including partial keys.
 // nextStartAt always refers to Jira source rows, not the filtered match count.
 for(let page=0;page<(q?5:1);page++){
  const params={jql,startAt:offset,maxResults:25,fields:[...FIELDS,meta.link]};
  let r=await jiraFetch('/rest/api/2/search',{method:'POST',body:params,timeoutMs:8000},auth);
  if([403,404,405].includes(r.response.status))r=await jiraFetch('/rest/api/2/search?'+new URLSearchParams({...params,fields:params.fields.join(',')}),{timeoutMs:8000},auth);
  if(!r.response.ok)throw new JiraError(r.response.status===401?'Phiên Jira đã hết hạn.':r.response.status===403?'Jira chưa cho phép tìm công việc.':'Không tải được danh sách Jira. Vui lòng thử lại.',r.response.status);
  const d=r.data;if(!Array.isArray(d?.issues)||!Number.isInteger(d.total)||d.total<0||d.issues.length>25||Number(d.startAt??offset)!==offset||(!d.issues.length&&offset<d.total))throw new JiraError('Jira trả về trang dữ liệu không hợp lệ.',502);
  total=d.total;offset+=d.issues.length;scanned+=d.issues.length;
  issues=d.issues.map(i=>{const item=publicIssue(i);if(!item)return null;const epic=i.fields?.[meta.link];return {...item,epic:KEY.test(epic)?epic:''};}).filter(i=>i&&words.every(w=>normalize(i.key+' '+i.summary).includes(w)));
  hasMore=offset<total;if(issues.length||!hasMore||Date.now()-started>20000)break;
 }
 return {source:'jira',issues,total,startAt:base.startAt,nextStartAt:offset,hasMore,filtered:!!q,scanned};

}
module.exports={tree};
