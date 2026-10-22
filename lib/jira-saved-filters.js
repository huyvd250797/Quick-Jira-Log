'use strict';
const {jiraFetch,JiraError}=require('./jira');
const {publicIssue}=require('./jira-search');
const {readIdentity}=require('./jira-read-scope');
const text=(v,n=200)=>typeof v==='string'?v.slice(0,n):'';
function filterId(value){const id=String(value||'');if(!/^\d{1,20}$/.test(id))throw new JiraError('Chọn filter hoặc nhập ID filter hợp lệ.',400);return id;}
async function read(path,auth){const r=await jiraFetch(path,{timeoutMs:3000},auth);if(!r.response.ok)throw new JiraError(r.response.status===401?'Phiên Jira đã hết hạn.':r.response.status===403?'Jira chưa cho phép đọc filter này.':r.response.status===404?'Filter không còn tồn tại hoặc bạn chưa có quyền xem.':`Chưa tải được filter Jira (HTTP ${r.response.status}).`,r.response.status);return r.data;}
const rows=data=>Array.isArray(data)?data:Array.isArray(data?.values)?data.values:null;
function publicFilter(f){if(!/^\d+$/.test(String(f?.id||'')))return null;return {id:String(f.id),name:text(f.name),owner:text(f.owner?.displayName)||text(f.owner?.name),favourite:f.favourite===true};}
async function list(query,auth){
 const q=String(query.q||'').trim();if(q.length>100||/[\x00-\x1f\x7f]/.test(q))throw new JiraError('Tên filter không hợp lệ.',400);
 const warnings=[],all=[];let limited=false;
 async function optional(path,label){try{const data=await read(path,auth),items=rows(data);if(!items)throw new JiraError('Danh sách filter không hợp lệ.',502);limited||=items.length>=100||data?.isLast===false;return items;}catch(e){if(e.status===401)throw e;warnings.push(label);return null;}}
 const owner=auth.me?.name||auth.username||'';
 const [mine,favs]=await Promise.all([
  optional('/rest/api/2/filter/my?includeFavourites=true','Chưa đọc được danh sách filter sở hữu.'),
  optional('/rest/api/2/filter/favourite','Chưa đọc được filter yêu thích.')
 ]);
 if(mine)all.push(...mine);if(favs)all.push(...favs.map(x=>({...x,favourite:true})));
 if(!mine&&owner){const owned=await optional('/rest/api/2/filter/search?'+new URLSearchParams({owner,maxResults:'100'}),'Chưa tìm được filter sở hữu; hãy Favourite filter trên Jira hoặc dùng ID.');if(owned){const identities=[auth.me?.name,auth.me?.key,auth.username].filter(Boolean).map(v=>String(v).toLowerCase());all.push(...owned.filter(f=>[f.owner?.name,f.owner?.key].some(v=>v&&identities.includes(String(v).toLowerCase()))));const i=warnings.indexOf('Chưa đọc được danh sách filter sở hữu.');if(i>=0)warnings.splice(i,1);}}
 if(q.length>=2){const found=await optional('/rest/api/2/filter/search?'+new URLSearchParams({filterName:q,maxResults:'100'}),'Chưa tìm được thêm filter theo tên; vẫn có thể dùng filter đã tải hoặc ID.');if(found)all.push(...found);}
 const dedup=new Map();for(const f of all){const item=publicFilter(f);if(item){const old=dedup.get(item.id);dedup.set(item.id,{...item,favourite:item.favourite||old?.favourite||false});}}
 const items=[...dedup.values()].filter(f=>!q||f.name.toLocaleLowerCase().includes(q.toLocaleLowerCase())).sort((a,b)=>Number(b.favourite)-Number(a.favourite)||a.name.localeCompare(b.name));
 return {filters:items.slice(0,200),warnings,limited:limited||items.length>200};
}
async function search(query,auth){
 const id=filterId(query.filterId),offset=String(query.startAt||'0');if(!/^\d{1,5}$/.test(offset)||Number(offset)>10000)throw new JiraError('Trang dữ liệu không hợp lệ.',400);
 const f=await read('/rest/api/2/filter/'+id,auth);if(String(f?.id)!==id||typeof f.jql!=='string'||!f.jql.trim()||f.jql.length>50000)throw new JiraError('Jira không trả truy vấn hợp lệ của filter.',502);
 const revision=readIdentity([id,f.jql]);if(query.revision&&query.revision!==revision)throw new JiraError('Filter đã đổi điều kiện trên Jira. Bấm Xem công việc để tải lại từ đầu.',409);
 const body={jql:f.jql,startAt:Number(offset),maxResults:25,fields:['summary','project','issuetype','status','assignee','priority','updated','parent']};
 let r=await jiraFetch('/rest/api/2/search',{method:'POST',body,timeoutMs:7000},auth);
 if([403,404,405].includes(r.response.status))r=await jiraFetch('/rest/api/2/search?'+new URLSearchParams({...body,fields:body.fields.join(',')}),{timeoutMs:7000},auth);
 if(!r.response.ok)throw new JiraError(r.response.status===401?'Phiên Jira đã hết hạn.':r.response.status===403?'Bạn chưa có quyền xem kết quả filter.':r.response.status===400?'Jira không thực thi được filter. Kiểm tra điều kiện filter trên Jira.':'Chưa tải được công việc từ filter.',r.response.status);
 const data=r.data;if(!Array.isArray(data?.issues)||!Number.isSafeInteger(data.total)||data.total<0||Number(data.startAt??body.startAt)!==body.startAt||data.issues.length>25)throw new JiraError('Trang kết quả filter Jira không hợp lệ.',502);
 const issues=data.issues.map(publicIssue);if(issues.some(x=>!x))throw new JiraError('Jira trả mã công việc không hợp lệ.',502);
 const nextStartAt=body.startAt+issues.length;return {issues,total:data.total,nextStartAt,hasMore:issues.length>0&&nextStartAt<data.total&&nextStartAt<=10000,filter:publicFilter(f),revision};
}
module.exports={list,search};
