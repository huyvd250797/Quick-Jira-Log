'use strict';
const {JiraError}=require('./jira');
const plain=(v,n=200)=>typeof v==='string'?v.slice(0,n):'';
const optionKinds=['option','priority','version','component','resolution','securitylevel'];
function describe(id,field){
 const schema=field.schema||{},custom=String(schema.custom||'').split(':').at(-1),type=schema.type;
 const d={id,label:plain(field.name)||id,required:field.required===true,hasDefault:field.hasDefaultValue===true,kind:'unsupported',options:[]};
 if(!/^(?:[a-z][a-zA-Z0-9]*|customfield_\d+)$/.test(id)||['project','issuetype','parent'].includes(id))return null;
 // Create-screen metadata may omit operations; an explicit restriction still wins.
 if(field.operations!==undefined&&(!Array.isArray(field.operations)||!field.operations.includes('set')))return d;
 if(id==='assignee'&&type==='user')d.kind='assignee';
 else if(id==='timetracking')d.kind='estimate';
 else if(id==='reporter'&&type==='user')d.kind='reporter';
 else if(type==='string'&&(!schema.custom||['textfield','textarea','url'].includes(custom))&&!['reporter','security'].includes(id))d.kind=custom==='url'?'url':id==='description'||id==='environment'||custom==='textarea'?'textarea':'text';
 else if(type==='number'&&(!schema.custom||custom==='float'))d.kind='number';
 else if(type==='date'||custom==='datepicker')d.kind='date';
 else if(type==='datetime'||custom==='datetime')d.kind='datetime';
 else if(type==='boolean')d.kind='boolean';
 else if(type==='array'&&schema.items==='string'&&(id==='labels'||custom==='labels'))d.kind='labels';
 else if(optionKinds.includes(type)||type==='array'&&optionKinds.includes(schema.items)){
  if(Array.isArray(field.allowedValues)&&field.allowedValues.length<=1000&&!field.allowedValues.some(v=>Array.isArray(v?.children)&&v.children.length)){
   d.kind=type==='array'?'multi':'select';
   d.options=field.allowedValues.filter(v=>v&&/^\d+$/.test(String(v.id))&&v.disabled!==true&&v.archived!==true).map(v=>({id:String(v.id),label:plain(v.value)||plain(v.name)||String(v.id)}));
  }
 }
 return d;
}
function encode(field,value){
 const fail=()=>{throw new JiraError(`Giá trị không hợp lệ: ${field.label}.`,400);};
 if(field.kind==='unsupported')return fail();
 if(field.kind==='boolean'){if(typeof value!=='boolean')return fail();return value;}
 if(field.kind==='number'){if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>1e15)return fail();return value;}
 if(['multi','labels'].includes(field.kind)){
  if(!Array.isArray(value)||value.length>100||value.some(x=>typeof x!=='string')||new Set(value).size!==value.length)return fail();
  if(field.kind==='labels'){if(value.some(x=>!x||x.length>255||/\s|[\x00-\x1f\x7f]/.test(x)))return fail();return value;}
  if(value.some(id=>!field.options.some(x=>x.id===id)))return fail();return value.map(id=>({id}));
 }
 if(typeof value!=='string'||!value.trim())return fail();
 if(field.kind==='estimate'){if(!estimateSeconds(value))return fail();return {originalEstimate:value.trim()};}
 if(field.kind==='select'){if(!field.options.some(x=>x.id===value))return fail();return {id:value};}
 if(['assignee','reporter'].includes(field.kind)){if(value.length>255||/[\x00-\x1f\x7f]/.test(value))return fail();return {name:value};}
 if(field.kind==='date'){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)return fail();return value;
 }
 if(field.kind==='datetime'){
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?(?:Z|[+-]\d{2}:?\d{2})$/.test(value)||Number.isNaN(Date.parse(value))||new Date(value.slice(0,10)).toISOString().slice(0,10)!==value.slice(0,10))return fail();
  return new Date(value).toISOString().replace('Z','+0000');
 }
 const max=field.id==='summary'?255:field.kind==='textarea'?20000:1000;
 if(value.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)||field.kind!=='textarea'&&/[\r\n\t]/.test(value))return fail();
 if(field.kind==='url'){try{const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)return fail();}catch{return fail();}}
 return value.trim();
}
const missing=v=>v===undefined||v===null||v===''||Array.isArray(v)&&!v.length;
function estimateSeconds(value){if(typeof value!=='string'||value.length>100||!/^\s*(?:\d+\s*[wdhm]\s*)+$/i.test(value))return 0;let total=0;for(const m of value.matchAll(/(\d+)\s*([wdhm])/gi))total+=Number(m[1])*({w:40*3600,d:8*3600,h:3600,m:60}[m[2].toLowerCase()]);return Number.isSafeInteger(total)&&total>0&&total<=10*365*24*3600?total:0;}
module.exports={describe,encode,missing,estimateSeconds};
