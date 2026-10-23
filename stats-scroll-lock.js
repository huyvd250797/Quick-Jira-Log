'use strict';
// iOS needs a fixed document as well as overflow:hidden for a modal.
window.QuickJiraStatsScroll=(()=>{
 const dialog=document.getElementById('projectStatsDialog');let saved=null,touch=null;
 const props=['position','top','left','right','width','overflow'];
 function lock(){if(saved)return;const body=document.body,html=document.documentElement;
  // Transfer an existing tool-overlay lock without retaining its delayed unlock.
  if(body.classList.contains('settings-open')){const y=state.settingsScrollY||0;body.classList.remove('settings-open');html.classList.remove('settings-open-root');body.style.removeProperty('top');window.scrollTo({left:0,top:y,behavior:'instant'});}
  saved={x:scrollX,y:scrollY,body:props.map(k=>[k,body.style.getPropertyValue(k),body.style.getPropertyPriority(k)]),overflow:[html.style.getPropertyValue('overflow'),html.style.getPropertyPriority('overflow')]};
  for(const [k,v]of Object.entries({position:'fixed',top:-saved.y+'px',left:'0',right:'0',width:'100%',overflow:'hidden'}))body.style.setProperty(k,v,'important');
  html.style.setProperty('overflow','hidden','important');
 }
 function unlock(){if(!saved)return;const s=saved;saved=null;
  for(const [k,v,p]of s.body)if(v)document.body.style.setProperty(k,v,p);else document.body.style.removeProperty(k);
  if(s.overflow[0])document.documentElement.style.setProperty('overflow',...s.overflow);else document.documentElement.style.removeProperty('overflow');
  window.scrollTo({left:s.x,top:s.y,behavior:'instant'});touch=null;
 }
 function canScroll(target,dx,dy){let el=target instanceof Element?target:null;
  while(el&&el!==dialog){const css=getComputedStyle(el);
   if(/auto|scroll/.test(css.overflowY)&&el.scrollHeight>el.clientHeight+1&&((dy>0&&el.scrollTop<el.scrollHeight-el.clientHeight-1)||(dy<0&&el.scrollTop>0)))return true;
   if(/auto|scroll/.test(css.overflowX)&&el.scrollWidth>el.clientWidth+1&&((dx>0&&el.scrollLeft<el.scrollWidth-el.clientWidth-1)||(dx<0&&el.scrollLeft>0)))return true;
   el=el.parentElement;
  }return false;
 }
 function guard(e,dx,dy){if(!saved||e.target.closest?.('#backgroundTasks'))return;
  if(!dialog.contains(e.target)||!canScroll(e.target,dx,dy)){if(e.cancelable)e.preventDefault();}
 }
 document.addEventListener('wheel',e=>guard(e,e.deltaX,e.deltaY),{capture:true,passive:false});
 document.addEventListener('touchstart',e=>{if(e.touches.length===1)touch={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
 document.addEventListener('touchmove',e=>{if(!saved||!touch||e.touches.length!==1)return;const t=e.touches[0],dx=touch.x-t.clientX,dy=touch.y-t.clientY;touch={x:t.clientX,y:t.clientY};guard(e,dx,dy);},{capture:true,passive:false});
 dialog.addEventListener('close',unlock);
 return {lock,unlock,get locked(){return !!saved;}};
})();
