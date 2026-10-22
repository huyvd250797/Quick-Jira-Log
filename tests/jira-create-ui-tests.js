'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
// DOM fixture covers state, not CSS, layout, Safari or native validation.
const nodes=new Map();
class Element{
 constructor(id=''){this.id=id;this.hidden=false;this.disabled=false;this.open=false;this.value='';this.children=[];this.options=[];this.listeners={};this.textContent='';this.isConnected=true;}
 set innerHTML(value){this.html=value;this.options=[...value.matchAll(/<option value="([^"]*)"[^>]*>(.*?)<\/option>/g)].map(m=>({value:m[1],label:m[2],selected:false}));if(this.options.length)this.value=this.options[0].value;
  for(const m of value.matchAll(/<(input|textarea|select|button|p|div)\b([^>]*\bid="([^"]+)"[^>]*)>/g)){const e=new Element(m[3]);e.value=m[2].match(/\bvalue="([^"]*)"/)?.[1]||'';nodes.set(m[3],e);}
 }
 get innerHTML(){return this.html||'';}get selectedOptions(){return this.options.filter(o=>o.selected);}
 addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}fire(name,e={}){for(const fn of this.listeners[name]||[])fn(e);}
 showModal(){this.open=true;}close(){this.open=false;queueMicrotask(()=>this.fire('close'));}focus(){}replaceChildren(){this.children=[];}append(e){this.children.push(e);}removeAttribute(k){delete this[k];}
}
(async()=>{
 const root=path.join(__dirname,'..');for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/\bid="([^"]+)"/g))nodes.set(m[1],new Element(m[1]));
 const el=id=>{assert(nodes.has(id),id);return nodes.get(id);};let lock=0,posts=[],opened=[],mode='confirmed';
 const meta={project:'CAL',type:{id:'5',name:'Subtask',subtask:true},revision:'a'.repeat(64),canAssign:false,blocked:[],reporterUsername:'boss',fields:[{id:'summary',label:'Tiêu đề',kind:'text',required:true,hasDefault:false},{id:'customfield_12345',label:'Sub-task Type',kind:'select',required:true,hasDefault:false,options:[{id:'10',label:'Testing'}]},{id:'reporter',label:'Người báo cáo',kind:'reporter',required:true,hasDefault:false}]};
 const sandbox={window:{confirm:()=>true,QuickJiraSearch:{openCreated:async key=>opened.push(key)}},document:{getElementById:id=>nodes.get(id)||null,createElement:()=>new Element(),activeElement:null},state:{user:{username:'boss'}},crypto,URLSearchParams,Date,showToast(){},QuickJiraBusy:{get active(){return lock>0;},begin(){lock++;return()=>lock--; }},api:async(url,opts)=>{const q=new URL(url,'https://local').searchParams,a=q.get('action');
  if(a==='jira-create-projects')return {projects:[{key:'CAL',name:'Dự án'}]};if(a==='jira-create-types')return {types:[meta.type]};if(a==='jira-create-meta')return structuredClone(meta);
  if(a==='jira-create-parents')return {items:[{key:'CAL-1',summary:'Cha <script>',project:{key:'CAL'},issueType:{subtask:false}}]};
  if(a==='jira-create'){posts.push(JSON.parse(opts.body));if(mode==='network')throw Error('lost');return {ok:true,outcome:mode,key:mode==='confirmed'?'CAL-100':undefined,message:mode};}
  throw Error('Unexpected '+a);
 }};
 vm.runInNewContext(fs.readFileSync(path.join(root,'jira-create.js'),'utf8'),sandbox);const ui=sandbox.window.QuickJiraCreate;
 await ui.open();assert(el('jiraCreateDialog').open);assert.equal(posts.length,0);el('jiraCreateProject').value='CAL';await el('jiraCreateProjectBtn').onclick();el('jiraCreateType').value='5';await el('jiraCreateType').onchange();assert(!el('jiraCreateForm').hidden);
 el('jiraCreateForm').onsubmit({preventDefault(){}});assert(!el('jiraCreateConfirmDialog').open);assert(el('jiraCreateState').textContent.includes('cha'));
 el('jiraCreateParentQuery').value='CAL-1';await el('jiraCreateParentFindBtn').onclick();el('jiraCreateParents').children[0].onclick();el('jcf-summary').value='<script>Literal text</script>';el('jcf-customfield_12345').value='10';
 el('jiraCreateForm').onsubmit({preventDefault(){}});assert(el('jiraCreateConfirmDialog').open);assert.equal(posts.length,0);assert(!el('jiraCreatePreview').innerHTML.includes('<script>'));el('jiraCreateCancelBtn').onclick();await Promise.resolve();assert.equal(posts.length,0);
 el('jiraCreateCloseBtn').onclick();await ui.open();assert.equal(el('jcf-summary').value,'<script>Literal text</script>','Closing preserves draft in current session');el('jiraCreateForm').onsubmit({preventDefault(){}});await el('jiraCreateConfirmBtn').onclick();assert.equal(posts.length,1);assert.equal(posts[0].fields.customfield_12345,'10');assert.equal(posts[0].parent,'CAL-1');assert.equal(opened[0],'CAL-100');assert(!el('jiraCreateDialog').open);assert.equal(lock,0);
 await ui.open();assert(!el('jiraCreateReceipt').hidden);assert(el('jiraCreateContent').hidden);assert(!el('jiraCreateAnotherBtn').hidden);assert.equal(posts.length,1);
 ui.reset();await ui.open({parent:{key:'CAL-1',project:{key:'CAL'},summary:'Cha'}});assert(el('jiraCreateParentState').textContent.includes('CAL-1'),'Subtask shortcut verifies and presets parent');el('jcf-summary').value='Keep draft';el('jcf-customfield_12345').value='10';mode='network';el('jiraCreateForm').onsubmit({preventDefault(){}});await el('jiraCreateConfirmBtn').onclick();assert.equal(posts.length,2);assert(el('jiraCreateContent').hidden);assert(!el('jiraCreateCheckedBtn').hidden);assert(el('jiraCreateAnotherBtn').hidden);assert.equal(lock,0);
 el('jiraCreateForm').onsubmit({preventDefault(){}});assert.equal(posts.length,2);assert(!el('jiraCreateConfirmDialog').open);await ui.open();assert(!el('jiraCreateCheckedBtn').hidden);el('jiraCreateCheckedBtn').onclick();assert(!el('jiraCreateAnotherBtn').hidden);
 ui.reset();assert.equal(el('jiraCreateFields').children.length,0);assert.equal(el('jiraCreatePreview').children.length,0);assert(!el('jiraCreateDialog').open);
 console.log('Create UI state: dynamic fields, required parent, safe preview, cancel/no write, draft resume, confirmed detail, preset parent, unknown lock/manual check, cleanup passed (DOM fixture)');
})().catch(e=>{console.error(e);process.exitCode=1;});
