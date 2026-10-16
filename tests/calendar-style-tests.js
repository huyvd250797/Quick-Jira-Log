'use strict';
const assert=require('node:assert/strict');const {displayDuration,projectKey,overtimeValue,isOvertime,paletteFor,colorDistance}=require('../lib/calendar-style');
assert.equal(JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname,'../manifest.webmanifest'),'utf8')).orientation,'any','installed PWA allows landscape rotation');
assert.equal(displayDuration(0),'—');assert.equal(displayDuration(480),'8h');assert.equal(displayDuration(30),'30m');assert.equal(displayDuration(90),'1h 30m');assert.equal(displayDuration(-1),'—');
for(const x of [true,1,'OT','Overtime','Có',{value:'Overtime'},[{value:'Yes'}]])assert(overtimeValue(x));
for(const x of [false,0,'No','Not Overtime','false',null,{id:'1'}])assert(!overtimeValue(x));
assert.equal(isOvertime({start:'17:30'}),false);assert.equal(isOvertime({start:'08:00',issueOvertime:true}),false);assert(isOvertime({overtime:true}));
assert.equal(projectKey({key:'EPU01-12'}),'EPU01');assert.equal(projectKey({project:'<script>'}),'OTHER');
let registry={};const used=new Set();for(let i=0;i<40;i++){const result=paletteFor(`PROJECT${i}`,registry,{random:()=>.37});registry=result.registry;const c=result.color;assert(c.h<185||c.h>260);assert(c.h<35||c.h>95);assert(c.s<=38);assert(c.l>=90);const token=`${c.h}:${c.s}:${c.l}`;assert(!used.has(token));used.add(token);assert.deepEqual(paletteFor(`PROJECT${i}`,registry).color,c);}
const a=paletteFor('EPU',{}, {random:()=>0}),b=paletteFor('EPU',{}, {random:()=>.99});assert.notDeepEqual(a.color,b.color);
const fresh=paletteFor('EPU',{}, {previous:a.registry,random:()=>0});assert.notDeepEqual(fresh.color,a.color,'reopening avoids previous assignment');
const corrupted=paletteFor('EPU',JSON.parse('{"__proto__":{"h":50,"s":55},"X":{"h":50,"s":55}}'));assert.equal(corrupted.registry.X,undefined);
console.log('V1.11.6 muted random palette, session consistency, no repeat and no blue/yellow passed');

const history=require('../handlers/worklog-history');const {createSessionCookie}=require('../lib/session');const oldFetch=global.fetch,oldSecret=process.env.APP_SESSION_SECRET;
(async()=>{let fieldCalls=0,batchFields=[];process.env.APP_SESSION_SECRET='calendar-style-tests-at-least-32-secret';const cookie=createSessionCookie({mode:'basic',username:'style-user',password:'test-only',me:{name:'style-user'}}).split(';')[0];
const issue=key=>({key,fields:{project:{key:key.split('-')[0]},summary:'Color test',status:{name:'Done'},customfield_9999:key==='BETA-2'?{value:'Overtime'}:null}});
const log=(id,date,start,seconds=3600)=>({id,author:{name:'style-user'},started:`${date}T${start}:00.000+0700`,timeSpentSeconds:seconds,comment:'Test'});
global.fetch=async(url,options={})=>{const u=new URL(String(url)),body=options.body?JSON.parse(options.body):{};
 if(u.pathname.endsWith('/field')){fieldCalls++;return Response.json([{id:'customfield_9999',name:'Overtime'}]);}
 if(u.pathname.endsWith('/search')){if(body.jql?.startsWith('key in')){batchFields.push(body.fields);return Response.json({issues:['ALPHA-1','BETA-2'].map(issue),total:2});}return Response.json({issues:[{key:'ALPHA-1'},{key:'BETA-2'}],total:2});}
 if(u.pathname.endsWith('/ALPHA-1/worklog'))return Response.json({total:4,worklogs:[log('regular','2026-10-16','08:00'),log('evening','2026-10-16','17:30'),log('weekend-normal','2026-10-17','08:00'),log('zero','2026-10-16','10:00',0)]});
 if(u.pathname.endsWith('/BETA-2/worklog'))return Response.json({total:1,worklogs:[{...log('jira-ot','2026-10-16','13:30'),comment:'Actual work\n\n[Quick Jira Log: Overtime]'}]});
 return new Response('{}',{status:404});
};
const run=()=>new Promise((resolve,reject)=>{const res={statusCode:200,setHeader(){},end(body){resolve({status:this.statusCode,data:JSON.parse(body)});}};history({method:'GET',query:{date:'2026-10-12',endDate:'2026-10-18',force:'1'},headers:{cookie}},res).catch(reject);});
try{const first=await run();assert.equal(first.status,200);const byId=Object.fromEntries(first.data.items.map(x=>[x.id,x]));assert(!byId.zero);assert.equal(byId.regular.overtime,false);assert.equal(byId.evening.overtime,false);assert.equal(byId['weekend-normal'].overtime,false);assert.equal(byId['jira-ot'].overtime,true);assert.equal(byId['jira-ot'].overtimeSource,'worklog-label');await run();assert.equal(fieldCalls,0);assert(batchFields.every(fields=>!fields.includes('customfield_9999')));assert.equal(byId['jira-ot'].description,'Actual work');console.log('V1.11.3 worklog-scoped OT label, no issue-field lookup and zero-duration filtering passed');}
finally{global.fetch=oldFetch;if(oldSecret==null)delete process.env.APP_SESSION_SECRET;else process.env.APP_SESSION_SECRET=oldSecret;}
})().catch(e=>{console.error(e);process.exitCode=1;});
