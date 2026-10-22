'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const codec=require('../lib/jira-editor-codec'),content=require('../lib/jira-content');
(async()=>{
 const sandbox={window:{},Uint8Array,Blob,File,URL,crypto:global.crypto};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'../jira-editor-images.js'),'utf8'),sandbox);const images=sandbox.window.QuickJiraEditorImages;
 const png=fs.readFileSync(path.join(__dirname,'../icons/icon-512.png'));assert.equal(await images.validate(new File([png],'photo.png',{type:'image/png'})),'png');
 for(const f of [new File(['<svg onload="x"/>'],'fake.png',{type:'image/png'}),new File([],'empty.png',{type:'image/png'}),new File([new Uint8Array(3*1024*1024+1)],'large.png',{type:'image/png'})])await assert.rejects(()=>images.validate(f));
 assert(codec.canVisual('Trước !photo.png|width=480! Sau'));assert(!codec.canVisual('!https://outside.example/tracker.png!'));assert(!codec.canVisual('{panel}!photo.png!{panel}'));
 const local=content.render('!photo.png|width=240!',{editor:true,localImages:[{name:'photo.png',url:'blob:https://app.test/example'}]});assert(local.includes('data-qjl-image-ref="photo.png|width=240"'));assert(local.includes('width="240"'));assert(!content.render('!photo.png!',{localImages:[{name:'photo.png',url:'https://outside.example/tracker'}]}).includes('<img'));
 const existing=content.render('!photo.png!',{editor:true,key:'CAL-2',attachments:[{id:'123',name:'photo.png',inline:true}]});assert(existing.includes('action=jira-attachment-content'));assert(existing.includes('data-qjl-image-ref'));assert(!existing.includes('<button'));
 const placeholder=content.render('!missing.png!',{editor:true});assert(placeholder.includes('data-qjl-image-ref'));assert(!placeholder.includes('src='));
 const batch=[{name:'qjl-abc.png'}];assert.equal(images.withoutPending('Trước !qjl-abc.png|width=480! Sau',batch),'Trước  Sau');assert.equal(images.withoutPending('!qjl-abc.png!',batch),'Ảnh đính kèm đang được bổ sung.');assert.equal(images.withoutPending('!old.png!',batch),'!old.png!');
 const csp=JSON.parse(fs.readFileSync(path.join(__dirname,'../vercel.json'),'utf8')).headers.flatMap(r=>r.headers).find(h=>h.key==='Content-Security-Policy').value;assert(csp.includes("img-src 'self' data: blob:"));assert(!csp.includes('img-src *'));
 console.log('Editor images: raster signature/size limits, safe local and Jira previews, supported image wiki, pending reference removal and CSP passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
