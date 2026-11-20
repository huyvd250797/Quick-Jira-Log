'use strict';
// Optional QA tooling: Sharp. Production references the full transparent atlases directly.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),sharp=require('sharp');
const root=path.resolve(__dirname,'..');
(async()=>{
 const hashes=new Set();let count=0;
 for(const name of ['a','b']) {
  const input=path.join(root,'seasonal-motifs/collection-'+name+'.png');const info=await sharp(input).metadata();assert(info.hasAlpha,'Real transparent cutouts required');
  for(let row=0;row<5;row++)for(let col=0;col<4;col++) {
   const left=Math.round(col*info.width/4),top=Math.round(row*info.height/5),right=Math.round((col+1)*info.width/4),bottom=Math.round((row+1)*info.height/5);
   const pixels=await sharp(input).extract({left,top,width:right-left,height:bottom-top}).ensureAlpha().raw().toBuffer();
   let visible=0,transparent=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i]>180)visible++;if(pixels[i]<20)transparent++;}
   assert(visible>pixels.length/4*.05,'Empty motif');assert(transparent>pixels.length/4*.05,'Motif has an opaque rectangular background');
   hashes.add(crypto.createHash('sha256').update(pixels).digest('hex'));count++;
  }
 }
 assert.equal(hashes.size,40,'40 genuinely different card cutouts, not flipped copies');
 const css=fs.readFileSync(path.join(root,'seasonal-collection.css'),'utf8');
 for(const percent of ['0%','33.333333%','66.666667%','100%'])assert(css.includes('--motif-col:'+percent));
 assert(css.includes('background-size:400% 500%'));assert(css.includes('issue-row:nth-child(4n+3)'));
 console.log('PASS: '+count+' different transparent motifs; four role/row assignments, no empty or opaque card image cells.');
})().catch(e=>{console.error(e);process.exitCode=1;});
