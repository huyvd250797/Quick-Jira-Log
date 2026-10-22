'use strict';
// Exercises action state transitions without claiming browser/layout coverage.
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
class Element{
 constructor(id=''){this.id=id;this.hidden=false;this.disabled=false;this.open=false;this.value='';this.textContent='';this.children=[];this.listeners={};this.options=[];this.scrollTop=0;}
 set innerHTML(v){this.html=v;this.options=[...v.matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)].map(m=>({value:m[1],text:m[2],disabled:false}));if(this.options.length)this.value=this.options[0].value;}
 get innerHTML(){return this.html||'';}
 addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}
 fire(name,e={}){for(const fn of this.listeners[name]||[])fn(e);}
 showModal(){this.open=true;}close(){this.open=false;queueMicrotask(()=>this.fire('close'));}focus(){}
 replaceChildren(){this.children=[];}append(node){this.children.push(node);}
}
(async()=>{
 const ids=[...fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8').matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]),nodes=new Map(ids.map(id=>[id,new Element(id)]));
 const el=id=>{assert(nodes.has(id),id);return nodes.get(id);};
 el('jiraEditKind').options=['transition','assignee','priority'].map(value=>({value,disabled:false}));el('jiraEditKind').value='transition';
 const options={updated:'stamp',current:{statusId:'3',priorityId:'2',assignee:{username:'boss',displayName:'Boss'}},warnings:[],canComment:true,canAssign:true,canUnassign:true,priorities:[{id:'1',name:'Highest'},{id:'2',name:'High'}],transitions:[{id:'10',name:'Start',to:{id:'4',name:'Doing'},supported:true,required:[]},{id:'20',name:'Resolve',to:{id:'5',name:'Done'},supported:false,required:[{name:'Resolution'}]}]};
 let count=0,mode='confirmed',writes=[],refreshes=0;const issue={key:'CAL-1'};
 const sandbox={window:{},document:{getElementById:el,createElement:()=>new Element()},state:{user:{username:'boss'}},crypto,Intl,Date,URLSearchParams,QuickJiraContent:{render:()=>'<p>safe</p>'},showToast(){},QuickJiraBusy:{get active(){return count>0;},begin(){count++;return ()=>count--; }},api:async(path,opts)=>{
  const a=new URL(path,'https://local').searchParams.get('action');
  if(a==='jira-update-options')return structuredClone(options);
  if(a==='jira-update-users')return {users:[{username:'alice',displayName:'Alice'}]};
  if(a==='jira-comments')return {items:[],total:0,nextStartAt:0,hasMore:false};
  if(a==='jira-update'){writes.push(JSON.parse(opts.body));if(mode==='network')throw Error('lost');return {ok:true,outcome:mode,message:mode};}
  throw Error('Unexpected '+a);
 }};
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../jira-actions.js'),'utf8'),sandbox);
 const actions=sandbox.window.QuickJiraActions;
 sandbox.window.QuickJiraSearch={async refreshDetail(key,tab){refreshes++;actions.setIssue(issue);if(tab==='comments')await actions.loadComments();}};
 actions.setIssue(issue);el('jiraCommentText').value='Draft survives another field update';
 await el('jiraDetailUpdateBtn').onclick();assert(el('jiraQuickEditDialog').open);assert.equal(count,0);
 el('jiraEditTransition').value='20';el('jiraQuickEditForm').onsubmit({preventDefault(){}});assert.equal(writes.length,0);assert(!el('jiraUpdateConfirmDialog').open);assert(el('jiraEditState').textContent.includes('Resolution'));
 el('jiraEditKind').value='priority';el('jiraEditKind').onchange();el('jiraEditPriority').value='1';
 el('jiraQuickEditForm').onsubmit({preventDefault(){}});assert(el('jiraUpdateConfirmDialog').open);assert.equal(writes.length,0);el('jiraUpdateCancelBtn').onclick();await Promise.resolve();assert.equal(writes.length,0);
 el('jiraQuickEditForm').onsubmit({preventDefault(){}});await el('jiraUpdateConfirmBtn').onclick();assert.equal(writes.length,1);assert.equal(writes[0].kind,'priority');assert.equal(refreshes,1);assert.equal(el('jiraCommentText').value,'Draft survives another field update');assert.equal(count,0);
 await actions.loadComments();assert(!el('jiraCommentForm').hidden);el('jiraCommentText').value='A new comment';el('jiraCommentForm').onsubmit({preventDefault(){}});assert.equal(writes.length,1);await el('jiraUpdateConfirmBtn').onclick();assert.equal(writes.length,2);assert.equal(writes[1].kind,'comment');assert.equal(el('jiraCommentText').value,'');
 mode='network';el('jiraCommentText').value='Keep this if response is lost';el('jiraCommentForm').onsubmit({preventDefault(){}});await el('jiraUpdateConfirmBtn').onclick();assert.equal(writes.length,3);assert(el('jiraCommentSendBtn').disabled);assert(!el('jiraActionResolveBtn').hidden);assert.equal(el('jiraCommentText').value,'Keep this if response is lost');assert.equal(count,0);
 el('jiraCommentForm').onsubmit({preventDefault(){}});assert(!el('jiraUpdateConfirmDialog').open);assert.equal(writes.length,3);
 actions.setIssue(issue);await actions.loadComments();assert(el('jiraCommentSendBtn').disabled,'Uncertain receipt survives refreshing this issue');el('jiraActionResolveBtn').onclick();assert(!el('jiraCommentSendBtn').disabled);
 actions.clear();assert.equal(el('jiraCommentText').value,'');assert.equal(el('jiraEditPeople').children.length,0);assert(!el('jiraQuickEditDialog').open);
 sandbox.state.user={username:'other'};actions.setIssue(issue);await actions.loadComments();assert(el('jiraActionNotice').hidden);assert.equal(count,0);
 console.log('Action UI state: confirmation/cancel, required-field block, preserved draft, verified refresh, unknown result lock/manual review, account cleanup passed (DOM fixture, no browser layout)');
})().catch(e=>{console.error(e);process.exitCode=1;});
