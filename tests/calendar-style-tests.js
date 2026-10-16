'use strict';
const assert=require('node:assert/strict');const {displayDuration,projectKey,overtimeValue,isOvertime,paletteFor}=require('../lib/calendar-style');
assert.equal(JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname,'../manifest.webmanifest'),'utf8')).orientation,'any','installed PWA allows landscape rotation');
assert.equal(displayDuration(0),'—');assert.equal(displayDuration(480),'8h');assert.equal(displayDuration(30),'30m');assert.equal(displayDuration(90),'1h 30m');assert.equal(displayDuration(-1),'—');
for(const x of [true,1,'OT','Overtime','Có',{value:'Overtime'},[{value:'Yes'}]])assert(overtimeValue(x));
for(const x of [false,0,'No','Not Overtime','false',null,{id:'1'}])assert(!overtimeValue(x));
assert.equal(isOvertime({start:'17:29'}),false);assert.equal(isOvertime({start:'17:30'}),true);assert.equal(isOvertime({date:'2026-10-17',start:'08:00'}),false);assert(isOvertime({start:'08:00',issueOvertime:true}));assert.equal(isOvertime({start:'18:00',overtime:false}),false);
assert.equal(projectKey({key:'EPU01-12'}),'EPU01');assert.equal(projectKey({project:'<script>'}),'OTHER');
let registry={};const used=new Set();for(let i=0;i<120;i++){const result=paletteFor(`PROJECT${i}`,registry);registry=result.registry;const c=result.color;assert(c.h>=120&&c.h<=340);const token=`${c.h}:${c.s}`;assert(!used.has(token));used.add(token);assert.deepEqual(paletteFor(`PROJECT${i}`,registry).color,c);}
const corrupted=paletteFor('EPU',JSON.parse('{"__proto__":{"h":50,"s":55},"X":{"h":50,"s":55}}'));assert(corrupted.color.h>=120);assert.equal(corrupted.registry.X,undefined);
console.log('V1.11.3 compact duration, OT classification and distinct persistent project palette passed');

const history=require('../handlers/worklog-history');const {createSessionCookie}=require('../lib/session');const oldFetch=global.fetch,oldSecret=process.env.APP_SESSION_SECRET;
(async()=>{let fieldCalls=0,batchFields=[];process.env.APP_SESSION_SECRET='calendar-style-tests-at-least-32-secret';const cookie=createSessionCookie({mode:'basic',username:'style-user',password:'test-only',me:{name:'style-user'}}).split(';')[0];
const issue=key=>({key,fields:{project:{key:key.split('-')[0]},summary:'Color test',status:{name:'Done'},customfield_9999:key==='BETA-2'?{value:'Overtime'}:null}});
const log=(id,date,start,seconds=3600)=>({id,author:{name:'style-user'},started:`${date}T${start}:00.000+0700`,timeSpentSeconds:seconds,comment:'Test'});
global.fetch=async(url,options={})=>{const u=new URL(String(url)),body=options.body?JSON.parse(options.body):{};
 if(u.pathname.endsWith('/field')){fieldCalls++;return Response.json([{id:'customfield_9999',name:'Overtime'}]);}
 if(u.pathname.endsWith('/search')){if(body.jql?.startsWith('key in')){batchFields.push(body.fields);return Response.json({issues:['ALPHA-1','BETA-2'].map(issue),total:2});}return Response.json({issues:[{key:'ALPHA-1'},{key:'BETA-2'}],total:2});}
 if(u.pathname.endsWith('/ALPHA-1/worklog'))return Response.json({total:4,worklogs:[log('regular','2026-10-16','08:00'),log('evening','2026-10-16','17:30'),log('weekend-normal','2026-10-17','08:00'),log('zero','2026-10-16','10:00',0)]});
 if(u.pathname.endsWith('/BETA-2/worklog'))return Response.json({total:1,worklogs:[log('jira-ot','2026-10-16','13:30')]});
 return new Response('{}',{status:404});
};
const run=()=>new Promise((resolve,reject)=>{const res={statusCode:200,setHeader(){},end(body){resolve({status:this.statusCode,data:JSON.parse(body)});}};history({method:'GET',query:{date:'2026-10-12',endDate:'2026-10-18',force:'1'},headers:{cookie}},res).catch(reject);});
try{const first=await run();assert.equal(first.status,200);const byId=Object.fromEntries(first.data.items.map(x=>[x.id,x]));assert(!byId.zero);assert.equal(byId.regular.overtime,false);assert.equal(byId.evening.overtime,true);assert.equal(byId['weekend-normal'].overtime,false);assert.equal(byId['jira-ot'].overtime,true);assert.equal(byId['jira-ot'].overtimeSource,'jira-issue');await run();assert.equal(fieldCalls,1);assert(batchFields.every(fields=>fields.includes('customfield_9999')));console.log('V1.11.3 Jira OT metadata batch/cache and zero-duration filtering passed');}
finally{global.fetch=oldFetch;if(oldSecret==null)delete process.env.APP_SESSION_SECRET;else process.env.APP_SESSION_SECRET=oldSecret;}
})().catch(e=>{console.error(e);process.exitCode=1;});
