(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QuickJiraSwapMotion=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(value,a,b)=>Math.min(Math.max(a,b),Math.max(Math.min(a,b),value));
 function flight(from,to,bounds,random=Math.random) {
  const x0=from.left+from.width/2,y0=from.top+from.height/2,x3=to.left+to.width/2,y3=to.top+to.height/2;
  const dx=x3-x0,dy=y3-y0,distance=Math.hypot(dx,dy),nx=-dy/Math.max(1,distance),ny=dx/Math.max(1,distance);
  const bend=clamp(distance*.2,32,110)*(.82+random()*.32),jitter=.78+random()*.28;
  const halfW=Math.max(from.width,to.width)/2,halfH=Math.max(from.height,to.height)/2;
  const controls=side=>[ {x:x0+dx*.27+nx*bend*side,y:y0+dy*.27+ny*bend*side}, {x:x0+dx*.73+nx*bend*side*jitter,y:y0+dy*.73+ny*bend*side*jitter} ];
  const overflow=points=>points.reduce((sum,p)=>sum+Math.max(0,bounds.left+halfW-p.x)+Math.max(0,p.x+halfW-bounds.right)+Math.max(0,bounds.top+halfH-p.y)+Math.max(0,p.y+halfH-bounds.bottom),0);
  let side=random()<.5?-1:1,points=controls(side);
  if(overflow(controls(-side))<overflow(points)){side=-side;points=controls(side);}
  // Keep the bow on screen when possible. Endpoints are never randomized.
  const p1=points[0],p2=points[1];
  if(bounds.right-bounds.left>=halfW*2){p1.x=clamp(p1.x,bounds.left+halfW,bounds.right-halfW);p2.x=clamp(p2.x,bounds.left+halfW,bounds.right-halfW);}
  const tilt=(.65+random()*.7)*side;
  const frames=Array.from({length:49},(_,i)=>{
   const t=i/48,u=1-t,x=u*u*u*x0+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*x3,y=u*u*u*y0+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*y3;
   const sx=1+(to.width/from.width-1)*t,sy=1+(to.height/from.height-1)*t,lift=1+Math.sin(Math.PI*t)*.018;
   return {offset:t,transform:`translate3d(${x-x0}px, ${y-y0}px, 0) rotate(${Math.sin(Math.PI*t)*tilt}deg) scale(${sx*lift}, ${sy*lift})`};
  });
  return {frames,duration:clamp(430+distance*.25,480,660),controlPoints:[{x:x0,y:y0},p1,p2,{x:x3,y:y3}]};
 }
 return {flight};
});
