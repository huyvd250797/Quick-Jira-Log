'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../calendar-interactions.js'),'utf8');
const context={};vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('function calendarInfoPlacement('),source.indexOf('function positionCalendarDragInfo(')),context);
const place=context.calendarInfoPlacement;
const frame={left:8,right:382,top:80,bottom:900};
const block=(top,bottom,left=80,right=330)=>({left,right,top,bottom});
function check(obstacles,above,expected,frameOverride=frame){
 const first=obstacles[0],p=place(frameOverride,obstacles,250,120,{x:80,top:first.top,bottom:first.bottom},above);
 if(!p)return null;
 assert(p.x>=frameOverride.left&&p.x+p.width<=frameOverride.right);
 assert(p.y>=frameOverride.top&&p.y+p.height<=frameOverride.bottom);
 for(const r of obstacles)assert(p.x+p.width<=r.left||p.x>=r.right||p.y+p.height<=r.top||p.y>=r.bottom,'Card covers preview');
 if(expected)assert.equal(p.side,expected);return p;
}
check([block(650,800)],true,'above');
check([block(100,220)],false,'below');
check([block(400,480)],true,'above');
check([block(400,480)],false,'below');
check([block(400,450),block(520,700)],false,'below');
check([block(100,260),block(300,600)],false,'below');
check([block(100,850)],true);
check([block(100,260)],true,null,{left:8,right:312,top:80,bottom:340});
assert.equal(check([block(80,900,8,382)],true),null,'No room: hide card instead of covering preview');
console.log('Calendar info: direction, middle, split/swap obstacles, compact viewport and no-space passed');
