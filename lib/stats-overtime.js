'use strict';
// Read-only report path. Mutation/readback workflows keep their existing reader.
const {jiraFetch,JiraError}=require('./jira');
const {mapWithConcurrency}=require('./async');
const {getOvertimeAttribute,getWorklog,attributesOf,overtimeOf}=require('./worklogpro');
async function direct(id,auth){
 const readAuth=auth?.mode==='session'&&auth.worklogproAuth?{mode:'basic',...auth.worklogproAuth}:auth;
 const {response,data}=await jiraFetch('/rest/com.deniz.jira.worklog/1.0/worklog/'+encodeURIComponent(id),{timeoutMs:2000},readAuth);
 if(!response.ok)throw new JiraError('Không đọc được Overtime (HTTP '+response.status+').',response.status);
 if(String(data?.id)!==id)throw new JiraError('WorklogPRO trả sai ID.',502);
 attributesOf(data);return data;
}
async function readStatsOvertime(ids,auth,preferred='auto'){
 const items=ids.map(id=>({id,overtime:false,overtimeKnown:false,overtimeSource:''}));
 if(!items.length)return {items,reader:preferred,unavailable:0};
 let attribute;
 try{attribute=await getOvertimeAttribute(auth,{timeoutMs:2000});}
 catch(e){if(e.status===401)throw e;return {items,reader:preferred,unavailable:items.length};}
 const deadline=Date.now()+24000;let reader=preferred==='native'?'native':'direct',unavailable=0,authError=null;
 async function read(item){
  try{
   if(authError)throw authError;
   if(Date.now()>=deadline)throw Error('Overtime deadline');
   let w;
   if(reader==='direct'){
    try{w=await direct(item.id,auth);}
    catch(e){if(e.status===401)throw e;reader='native';w=await getWorklog(item.id,auth,{timeoutMs:2000});}
   }else w=await getWorklog(item.id,auth,{timeoutMs:2000});
   item.overtime=overtimeOf(w,attribute);item.overtimeKnown=true;item.overtimeSource='worklogpro';
  }catch(e){if(e.status===401){authError=e;throw e;}unavailable++;}
 }
 // Probe once before scheduling the rest, avoiding N rejected direct requests.
 if(preferred==='auto'){await read(items[0]);await mapWithConcurrency(items.slice(1),10,item=>read(item));}
 else await mapWithConcurrency(items,10,item=>read(item));
 return {items,reader,unavailable};
}
module.exports={readStatsOvertime};
