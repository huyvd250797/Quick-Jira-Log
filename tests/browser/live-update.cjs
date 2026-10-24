'use strict';
const assert=require('node:assert/strict'),http=require('http'),fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');let release=1;
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/api'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,authenticated:false}));return;}
 let f=path.join(root,u.pathname==='/'?'index.html':u.pathname);if(!f.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{let data=fs.readFileSync(f);if(u.pathname==='/sw.js')data=Buffer.from(data.toString().replace('v1.34.2-shell','v1.34.2-fixture-'+release));if(f.endsWith('index.html')&&release===2)data=Buffer.from(data.toString().replaceAll('V1.34.2','V1.34.3'));
 res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(404);res.end();}
});
(async()=>{await new Promise(r=>server.listen(4255,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.QJL_CHROMIUM_PATH,headless:true,args:['--no-sandbox']});const context=await browser.newContext(),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:4255');await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);assert(!(await page.locator('#appUpdateBanner').isVisible()),'first install is not an update');
 release=2;await page.evaluate(()=>{const now=Date.now();Date.now=()=>now+16000;window.dispatchEvent(new Event('focus'));});
 await page.waitForFunction(()=>state.swUpdateRegistration?.waiting&& !document.getElementById('appUpdateBanner').classList.contains('hidden'));
 // A real native worker installs while the original app stays open.
 assert.match(await page.title(),/V1.34.2/);await page.evaluate(()=>{state.bulkSubmitInFlight=true;});await page.locator('#appUpdateBtn').click();assert.match(await page.title(),/V1.34.2/);assert(await page.evaluate(()=>!state.swUpdateRequested));
 await page.evaluate(()=>{state.bulkSubmitInFlight=false;});await page.locator('#appUpdateBtn').click();await page.waitForFunction(()=>document.title.includes('V1.34.3'));
 assert.deepEqual(errors,[]);console.log('Live update: native worker first install, foreground discovery without closing, mutation guard, click activation and immediate reload to new HTML passed.');
 await browser.close();await new Promise(r=>server.close(r));})().catch(e=>{console.error(e);server.close();process.exit(1);});
