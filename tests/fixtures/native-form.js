'use strict';
const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const action = '/secure/WPCreateWorklogOnIssueWithWorkLogAction.jspa';
function render(key, record, token='fresh-xsrf-token') {
 const d = new Date(record.workStart + 7*3600000).toISOString().slice(0,16).replace('T',' ');
 return `<form id="log-work-lean" method="post" action="${action}?atl_token=${token}">
 <input name="worklogId" value="${record.id}"><input name="issueKey" value="${key}">
 <input name="startDate" value="${d}"><input name="startDateJS" value="16/Oct/26 8:00 AM">
 <input name="timeLogged" value="${record.timeSpent/60}m">
 <input name="adjustEstimate" type="radio" checked value="auto"><input name="adjustEstimate" type="radio" value="leave">
 ${record.workLogAttributes.map(a=>['yes','no'].includes(a.attrValue)?`<input type="checkbox" name="wa_${a.attrTypeId}" ${a.attrValue==='yes'?'checked':''}>`:`<input name="wa_${a.attrTypeId}" value="${esc(a.attrValue)}">`).join('')}
 <textarea name="comment">${esc(record.comment)}</textarea>
 <select name="other"><option value="unselected">No</option><option value="PRESERVE" selected>Yes</option></select>
 </form>`;
}
function values(fields, record) {
 return {workStart: `${fields.get('startDate').replace(' ','T')}:00.000+0700`,timeSpent:parseInt(fields.get('timeLogged'),10)*60,
 comment:fields.get('comment'),adjustEstimate:fields.get('adjustEstimate'),authorUserKey:record.authorUserKey,
 workLogAttributes:record.workLogAttributes.map(a=>({...a,attrValue:['yes','no'].includes(a.attrValue)?fields.has(`wa_${a.attrTypeId}`)?'yes':'no':fields.get(`wa_${a.attrTypeId}`)}))};
}
module.exports={action,render,values};
