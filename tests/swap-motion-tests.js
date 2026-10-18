'use strict';
const assert=require('node:assert/strict'),{flight}=require('../lib/swap-motion');
const a={left:210,top:180,width:160,height:60},b={left:210,top:650,width:160,height:60},bounds={left:8,top:150,right:390,bottom:850};
const one=flight(a,b,bounds,()=>.12),two=flight(a,b,bounds,()=>.85);
assert.notDeepEqual(one.controlPoints,two.controlPoints);
assert.equal(one.frames[0].transform,'translate3d(0px, 0px, 0) rotate(0deg) scale(1, 1)');
const endpoint=one.frames.at(-1).transform;assert.match(endpoint,/translate3d\(0px, 470px, 0\)/);
assert(one.frames.some(x=>{const m=x.transform.match(/translate3d\(([-\d.]+)px/);return Math.abs(Number(m[1]))>15;}),'Vertical swaps must bend sideways');
for(const motion of [one,two,flight(b,a,bounds,()=>.5),flight(a,{left:20,top:180,width:140,height:90},bounds,()=>.4)]){
 assert(motion.duration>=480&&motion.duration<=660);
 assert(motion.frames.every(x=>Object.keys(x).every(k=>['offset','transform'].includes(k))));
 assert(motion.frames.every(x=>!x.transform.includes('NaN')&&!x.transform.includes('Infinity')));
 assert(motion.frames.every((x,i,list)=>i===0||x.offset>list[i-1].offset));
 const from=motion.controlPoints[0],to=motion.controlPoints.at(-1);assert(Number.isFinite(from.x+to.y));
}
console.log('Swap motion: varied curved routes, exact endpoints, finite transform-only frames and bounded duration passed.');
