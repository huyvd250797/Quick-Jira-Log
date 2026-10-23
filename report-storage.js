'use strict';
// Atomic page + cursor checkpoints. No credentials or write requests are stored.
window.QuickJiraReportStorage=(()=>{
 let database;
 function open(){if(database)return database;database=new Promise((resolve,reject)=>{
  const r=indexedDB.open('qjl-report-resume-v1',1);
  r.onupgradeneeded=()=>{const db=r.result;db.createObjectStore('jobs',{keyPath:'owner'});const p=db.createObjectStore('pages',{keyPath:'key'});p.createIndex('run',['owner','runID']);p.createIndex('owner','owner');db.createObjectStore('views',{keyPath:'owner'});};
  r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();database=null;};resolve(r.result);};r.onerror=()=>{database=null;reject(r.error);};r.onblocked=()=>{database=null;reject(Error('Kho lưu tiến độ đang bận.'));};
 });return database;}
 async function transaction(stores,work,retry=true){const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(stores,'readwrite');let value;tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(tx.error||Error('Chưa lưu được tiến độ.'));try{work(tx,x=>value=x);}catch(e){tx.abort();reject(e);}});}catch(e){if(retry&&['InvalidStateError','UnknownError'].includes(e?.name)){try{db.close();}catch{}database=null;return transaction(stores,work,false);}throw e;}}
 function erasePages(tx,owner){const r=tx.objectStore('pages').index('owner').openCursor(IDBKeyRange.only(owner));r.onsuccess=()=>{const c=r.result;if(c){c.delete();c.continue();}};}
 async function start(owner,meta){return transaction(['jobs','pages'],(tx,set)=>{erasePages(tx,owner);tx.objectStore('jobs').put({...meta,owner,savedAt:Date.now(),version:1});set(true);});}
 async function commit(owner,runID,page,patch){return transaction(['jobs','pages'],(tx,set)=>{const jobs=tx.objectStore('jobs'),r=jobs.get(owner);r.onsuccess=()=>{
  if(r.result?.runID!==runID){set(false);return;}if(page)tx.objectStore('pages').put({...page,key:owner+'|'+runID+'|'+page.key,owner,runID});jobs.put({...r.result,...patch,owner,runID,savedAt:Date.now()});set(true);
 };});}
 async function load(owner){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(['jobs','pages'],'readonly');let meta,pages=[];const r=tx.objectStore('jobs').get(owner);r.onsuccess=()=>{meta=r.result;if(meta){const p=tx.objectStore('pages').index('run').getAll(IDBKeyRange.only([owner,meta.runID]));p.onsuccess=()=>pages=p.result;}};tx.oncomplete=()=>resolve(meta?{meta,pages}:null);tx.onerror=()=>reject(tx.error);});}
 async function clear(owner){return transaction(['jobs','pages','views'],tx=>{tx.objectStore('jobs').delete(owner);erasePages(tx,owner);tx.objectStore('views').delete(owner);});}
 async function saveView(owner,data){return transaction(['views'],tx=>tx.objectStore('views').put({owner,data,savedAt:Date.now()}));}
 async function loadView(owner){const db=await open();return new Promise((resolve,reject)=>{const r=db.transaction('views').objectStore('views').get(owner);r.onsuccess=()=>resolve(r.result&&Date.now()-r.result.savedAt<86400000?r.result.data:null);r.onerror=()=>reject(r.error);});}
 return {start,commit,load,clear,saveView,loadView};
})();
