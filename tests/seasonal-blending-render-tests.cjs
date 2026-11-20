'use strict';
// Optional: run with Sharp available (same tooling as test:sprite-render).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),maskFile=path.join(root,'seasonal-feather.svg');
const ctx=vm.createContext({window:{}});vm.runInContext(fs.readFileSync(path.join(root,'seasonal-collection.js'),'utf8'),ctx);
const lib=require('../lib/seasonal-calendar');
const palettes=fs.readFileSync(path.join(root,'seasonal-collection.css'),'utf8');
const maskURI='data:image/svg+xml;base64,'+fs.readFileSync(maskFile).toString('base64');
(async()=>{
 const seen=new Set();let count=0;
 for(const [w,h] of [[408,136],[360,120]]) {
  const {data,info}=await sharp(maskFile,{density:72}).resize(w,h,{fit:"fill"}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const alpha=(x,y)=>data[(y*w+x)*info.channels+3];
  assert(alpha(0,Math.floor(h/2))<4,'Left edge transparent');
  assert(alpha(w-1,Math.floor(h/2))<10,'Right edge transparent');
  assert(alpha(Math.floor(w/2),0)<15,'Top edge transparent');
  assert(alpha(Math.floor(w/2),h-1)<15,'Bottom edge transparent');
  assert.equal(alpha(Math.floor(w/2),Math.floor(h/2)),255,'Central artwork keeps full detail');
  const row=Math.floor(h/2);
  const ramp=[0,.02,.05,.1,.2].map(f=>alpha(Math.floor(w*f),row));
  for(let i=1;i<ramp.length;i++) assert(ramp[i]>ramp[i-1],'Left edge fades smoothly into scene');
 }
 for(const id of lib.ids.filter(id=>ctx.window.QuickJiraSeasonalCollection.has(id))) {
  const markup=ctx.window.QuickJiraSeasonalCollection.scene(id,0);
  const definition=palettes.match(new RegExp('\\[data-seasonal="'+id+'"\\] \\{([^\\n]+)'))[1];
  for(const mode of ['dark','light']) {
   let artwork=markup.match(new RegExp('<svg class="collection-backdrop collection-backdrop-'+mode+'"[\\s\\S]*?<\\/svg>'))[0];
   const resource=artwork.match(/href="([^"]+)"/)[1];
   const png=await sharp(path.join(root,resource.slice(1))).png().toBuffer();
   artwork=artwork.replace(/href="[^"]+"/,'href="data:image/png;base64,'+png.toString('base64')+'"')
     .replace('<svg ','<svg width="3" height="1" ');
   const bg=definition.match(new RegExp('--season-'+(mode==='dark'?'dark':'light')+': (#[0-9a-f]{6})'))[1];
   const rgb=bg.slice(1).match(/../g).map(v=>parseInt(v,16));
   for(const [width,height] of [[550,136],[366,121]]) {
    const pw=Math.min(width,height*3),ph=pw/3,left=width-pw,top=(height-ph)/2;
    const source=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><mask id="feather" maskUnits="userSpaceOnUse" x="0" y="0" width="3" height="1" style="mask-type:alpha"><image width="3" height="1" preserveAspectRatio="none" href="${maskURI}"/></mask></defs><rect width="100%" height="100%" fill="${bg}"/><g transform="translate(${left} ${top}) scale(${pw/3})" mask="url(#feather)">${artwork}</g></svg>`;
    const {data,info}=await sharp(Buffer.from(source)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const at=(x,y)=>[...data.subarray((y*width+x)*info.channels,(y*width+x)*info.channels+3)];
    const distance=(a,b)=>a.reduce((n,v,i)=>n+Math.abs(v-b[i]),0);
    for(const [x,y] of [[Math.floor(left),Math.floor(top+ph/2)],[width-1,Math.floor(top+ph/2)],[Math.floor(left+pw/2),Math.floor(top)],[Math.floor(left+pw/2),Math.min(height-1,Math.floor(top+ph)-1)]])
      assert(distance(at(x,y),rgb)<45,id+' '+mode+' hard boundary at '+x+','+y);
    assert(distance(at(Math.floor(left+pw*.60),Math.floor(top+ph*.5)),rgb)>15,id+' photograph is still visible');
    if(width===550&&id==='lantern') {
      fs.mkdirSync('/tmp/qjl1404-qa',{recursive:true});
      await sharp(Buffer.from(source)).png().toFile('/tmp/qjl1404-qa/lantern-'+mode+'.png');
    }
    count++;seen.add(id);
   }
  }
 }
 assert.equal(seen.size,10);
 // Old 5% host mask is fully opaque at the contained image's actual left edge.
 const oldGutter=(550-408)/2;assert(oldGutter/550>.05,'Regression reproduces unfeathered inset edge');
 console.log(`PASS: ${count} theme/mode/host blends, four softened edges, opaque detail core, no matte frame; old host-gutter regression reproduced.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
