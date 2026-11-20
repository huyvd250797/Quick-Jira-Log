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
images[0].load();assert.equal(draws.length,48);assert(node.classes.has('collection-flag-ready'));
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
