'use strict';
// Optional pixel regression: NODE_PATH=<shared node_modules> node tests/seasonal-sprite-render-tests.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync(path.join(root,'seasonal-collection.js'),'utf8'),ctx);
const art=ctx.window.QuickJiraSeasonalCollection;
const ids=['newyear','lantern','womensday','hungking','doanngo','family','vulan','national','vietwomen','culture'];
const textureCache=new Map();
async function pixels(svg,id,w,h,unclipped=false) {
 // librsvg does not decode embedded WebP; losslessly transcode in memory for this test only.
 const file=svg.match(/href="([^"]+)"/)[1];
 if(!textureCache.has(file)) textureCache.set(file,await sharp(path.join(root,file.replace(/^\//,''))).png().toBuffer());
 const texture=textureCache.get(file);
 let source=svg.replace('<svg ',`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" `)
  .replace(/href="[^"]+"/,`href="data:image/png;base64,${texture.toString('base64')}"`);
 if(unclipped) source=source.replace(/ clip-path="[^"]+"/,'');
 const {data,info}=await sharp(Buffer.from(source)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const box=svg.match(/viewBox="0 0 ([0-9.]+) ([0-9.]+)"/);
 const ratio=Number(box[1])/Number(box[2]);
 const cw=Math.min(w,h*ratio),ch=cw/ratio,left=(w-cw)/2,top=(h-ch)/2;
 let outside=0,inside=0;
 for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
  const alpha=data[(y*w+x)*info.channels+3];
  if(x<left-1 || x>=left+cw+1 || y<top-1 || y>=top+ch+1) {if(alpha>4)outside++;}
  else if(alpha>20)inside++;
 }
 return {outside,inside};
}
(async()=>{
 let cases=0,oldLeaks=0;
 const clipIDs=new Set();
 for(const id of ids) {
  const scene=art.scene(id,0);
  const cells=[...scene.matchAll(/<svg class="(?:collection-backdrop collection-backdrop-(?:dark|light)|collection-subject-image)"[\s\S]*?<\/svg>/g)].map(m=>m[0]);
  cells.push(art.corner(id));assert(cells.length>=3);
  for(const cell of cells) {
   const clip=cell.match(/<clipPath id="([^"]+)"/)[1];assert(!clipIDs.has(clip));clipIDs.add(clip);
   for(const [w,h] of [[360,120],[160,240],[144,144]]) {
    const result=await pixels(cell,id,w,h);
    assert.equal(result.outside,0,id+' sprite leaked at '+w+'x'+h);
    assert(result.inside>100,id+' image unexpectedly blank');
    {const old=await pixels(cell,id,w,h,true);if(old.outside>0)oldLeaks++;}
    cases++;
   }
  }
 }
 assert(oldLeaks>=20,'Regression fixture must reproduce the original adjacent-cell leak');
 console.log(`PASS: ${cases} rendered sprite/viewport cases; no neighbouring pixels or blank layers. Unclipped control leaked in ${oldLeaks} comparison cases.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
