'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const callbacks=new Map(),images=[],draws=[];let serial=0,io,resize,mutation,overlay=false;
class Node {
  constructor(id='') {this.id=id;this.dataset={};this.isConnected=true;this.attributes=new Set();this.classes=new Set();this.classList={add:s=>this.classes.add(s),contains:s=>this.classes.has(s)};}
  hasAttribute(s){return this.attributes.has(s);}
  toggleAttribute(s,value){if(value)this.attributes.add(s);else this.attributes.delete(s);}
  closest(s){if(s==='#seasonalPreview')return this.owner||null;if(s==='dialog[open]')return this.open?this:null;return null;}
  querySelector(s){return s==='.collection-flag-canvas'?this.canvas:null;}
}
const root=new Node('html');root.attributes.add('data-seasonal-motion');
const document={hidden:false,documentElement:root,getElementById:()=>null,querySelector:()=>overlay?{}:null,querySelectorAll:()=>[],addEventListener:(s,fn)=>{document[s]=fn;}};
const context=vm.createContext({window:{devicePixelRatio:3},document,
  Image:class {constructor(){this.listeners={};images.push(this);this.complete=false;this.naturalWidth=0;}addEventListener(s,fn){this.listeners[s]=fn;}load(){this.complete=true;this.naturalWidth=2400;this.naturalHeight=800;this.listeners.load();}},
  IntersectionObserver:class{constructor(fn){io=fn;}observe(){}unobserve(n){n.unobserved=true;}},
  ResizeObserver:class{constructor(fn){resize=fn;}observe(){}unobserve(){}},
  MutationObserver:class{constructor(fn){mutation=fn;}observe(){}},
  requestAnimationFrame:fn=>{callbacks.set(++serial,fn);return serial;}
});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../seasonal-collection.js'),'utf8'),context);
const api=context.window.QuickJiraSeasonalCollection;
const node=new Node();node.dataset={collectionTheme:'national',effect:'1'};
const ctx={clearRect(){},fillRect(){},drawImage(...args){draws.push(args);}};
node.canvas={getBoundingClientRect:()=>({width:320,height:160}),getContext:()=>ctx};
const container={querySelector:()=>node};
api.mount(container);api.mount(container);assert.equal(images.length,1,'No duplicate image/lifecycle on repeated mount');
io([{target:node,isIntersecting:true}]);assert.equal(callbacks.size,0,'Do not spin while texture is loading');
images[0].load();assert.equal(draws.length,96);assert(node.classes.has('collection-flag-ready'));
assert.equal(node.canvas.width,480,'DPR capped at 1.5');assert.equal(node.canvas.height,240);
assert.equal(draws[0][5],120,'Contain square sprite within rectangular host, no stretching');
assert.equal(draws[0][8],240,'Destination height preserves the square cell');
function step(time){const scheduled=[...callbacks.values()];callbacks.clear();scheduled.forEach(fn=>fn(time));}
step(100);const start=draws.at(-1)[6];step(116.667);assert.notEqual(draws.at(-1)[6],start,'Timestamp-driven true cloth motion');
root.attributes.delete('data-seasonal-motion');mutation();step(133);assert.equal(callbacks.size,0);assert(node.hasAttribute('data-collection-paused'));
root.attributes.add('data-seasonal-motion');mutation();assert.equal(callbacks.size,1);
document.hidden=true;document.visibilitychange();step(150);assert.equal(callbacks.size,0);
document.hidden=false;document.visibilitychange();step(170);assert.equal(callbacks.size,1);
io([{target:node,isIntersecting:false}]);step(190);assert.equal(callbacks.size,0);
io([{target:node,isIntersecting:true}]);overlay=true;mutation();step(210);assert.equal(callbacks.size,0,'Configuration overlay pauses dashboard');
const owner=new Node();owner.open=true;owner.attributes.add('data-seasonal-motion');node.owner=owner;api.refresh();step(230);assert.equal(callbacks.size,1,'Inline preview owns its own motion toggle');
owner.open=false;api.refresh();step(250);assert.equal(callbacks.size,0,'Closing preview pauses it');
node.isConnected=false;api.refresh();assert(node.unobserved,'Detached scene releases observers');
for(const id of ['newyear','lantern','womensday','hungking','doanngo','family','vulan','national','vietwomen','culture']) {
 assert(api.has(id));assert.notEqual(api.scene(id,0),api.scene(id,1));assert(api.corner(id).includes('x="-2"'));
}
const lantern=api.scene('lantern');assert(lantern.indexOf('collection-backdrop-dark')<lantern.indexOf('collection-subject'));
console.log('New collection: flag texture/geometry, real timestamp motion, loading/hidden/offscreen/modal pause, preview scope, cleanup and 20 effect variants passed.');

const clips = new Set();
for (let round=0; round<3; round++) for (const id of ['newyear','lantern','womensday','hungking','doanngo','family','vulan','national','vietwomen','culture']) {
 const markup=api.scene(id,round%2)+api.corner(id);
 const definitions=[...markup.matchAll(/<clipPath id="([^"]+)" clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="[13]" height="[12]"\/><\/clipPath>/g)].map(m=>m[1]);
 assert.equal(definitions.length,['newyear','lantern','doanngo','vulan','national'].includes(id)?4:3,id+' must crop both backgrounds, corner, and optional moving object');
 for (const clip of definitions) {
  assert(!clips.has(clip),'Clip IDs must be unique across dashboard/splash/inline preview');clips.add(clip);
  assert(markup.includes('clip-path="url(#'+clip+')"'));
 }
}
console.log('Sprite clipping: Unique source-coordinate clip regions for both modes and simultaneous scenes, no collisions across simultaneous scenes.');

for(const id of ['newyear','lantern','womensday','hungking','doanngo','family','vulan','national','vietwomen','culture']) {
 const markup=api.scene(id,0);
 const panels=[...markup.matchAll(/<svg class="collection-backdrop collection-backdrop-(dark|light)"[^>]*viewBox="0 0 3 1"[\s\S]*?<\/svg>/g)];
 assert.equal(panels.length,2,id+' must have two compact panorama variants');
 assert(panels[0][0].includes('x="0" y="0" width="3" height="2"'));
 assert(panels[1][0].includes('x="0" y="-1" width="3" height="2"'));
}
console.log('Compact panels: all ten themes use source-coordinate 3:1 viewports and stacked dark/light variants.');

const css=fs.readFileSync(path.join(__dirname,'../seasonal-collection.css'),'utf8');
assert.match(css,/\.collection-scenic \{ background:transparent; \}/);
assert.match(css,/\.collection-scenic \.collection-plane \{[^}]*mask-image:url\("\/seasonal-feather\.svg"\)/);
assert.match(css,/#seasonalPreviewScene:has\(\.collection-scenic\) \{[^}]*mask:none; -webkit-mask:none/);
assert(css.includes('height:clamp(104px,31vw,142px)'),'Keep compact mobile budget');
console.log('Artwork blending: shared feather belongs to actual scene plane; transparent host and compact height retained.');

// Both options must differ in actual layers, not just data-effect or serial clip IDs.
for(const id of ['newyear','lantern','womensday','hungking','doanngo','family','vulan','national','vietwomen','culture']) {
 const normalize=markup=>markup.replace(/qjl-holiday-cell-\d+/g,'cell').replace(/petal-([trl])-\d+-\d+/g,'petal-$1').replace(/data-effect="[01]"/g,'');
 assert.notEqual(normalize(api.scene(id,0)),normalize(api.scene(id,1)),id+' needs two different physical compositions');
}
let disposedGPU=0, gpuTime=[];
context.window.QuickJiraSeasonalShader={create(canvas,image,theme){assert.equal(theme,'womensday');return {resize(w,h){assert.equal(w,320);assert.equal(h,160);},draw(t){gpuTime.push(t);return true;},dispose(){disposedGPU++;}};}};
overlay=false;const garden=new Node();garden.dataset={collectionTheme:'womensday',effect:'1'};
garden.canvas={getBoundingClientRect:()=>({width:320,height:160}),getContext(){throw Error('GPU scene must not request 2D context');}};
api.mount({querySelector:()=>garden});io([{target:garden,isIntersecting:true}]);images.at(-1).load();step(300);step(316.667);
assert(garden.classes.has('collection-scene-ready'));assert(gpuTime.at(-1)>0);
root.attributes.delete('data-seasonal-motion');api.refresh();step(330);const previousDraws=gpuTime.length;root.dataset.theme='light';mutation();assert.equal(gpuTime.length,previousDraws+1,'Mode change repaints frozen GPU scene without enabling motion');assert.equal(callbacks.size,0);root.attributes.add('data-seasonal-motion');api.refresh();
context.window.matchMedia=()=>({matches:true});api.refresh();step(334);assert.equal(callbacks.size,0,'Reduced motion must stop GPU frames');
context.window.matchMedia=()=>({matches:false});api.refresh();step(350);assert.equal(callbacks.size,1);
garden.isConnected=false;api.refresh();assert.equal(disposedGPU,1,'Detached GPU scene releases resources');
assert(!fs.readFileSync(path.join(__dirname,'../seasonal-collection.js'),'utf8').includes('elapsed %='),'No periodic phase reset may jump the wind');
console.log('Motion refinement: 20 distinct compositions, shared shader scene lifecycle, reduced-motion GPU pause, disposal and continuous wind phase passed.');
