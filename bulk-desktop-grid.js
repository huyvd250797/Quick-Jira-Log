'use strict';
// Desktop layout only: fit complete equal-height rows, never more than six tiles.
(()=>{
 const card=document.getElementById('bulkCard'),list=card?.querySelector('.bulk-items');if(!list)return;
 let frame=0;
 function update(){frame=0;
  if(innerWidth<900||card.classList.contains('hidden')||!document.body.classList.contains('desktop-editor-open'))return;
  const css=getComputedStyle(list),chrome=getComputedStyle(card),header=card.querySelector('.bulk-sticky-header'),footer=card.querySelector('.bulk-footer');
  const n=v=>parseFloat(v)||0,cols=css.gridTemplateColumns.split(' ').length,gap=n(css.rowGap),padding=n(css.paddingTop)+n(css.paddingBottom);
  const available=Math.max(0,innerHeight*.94-n(chrome.paddingTop)-n(chrome.paddingBottom)-n(chrome.borderTopWidth)-n(chrome.borderBottomWidth)-header.getBoundingClientRect().height-footer.getBoundingClientRect().height-4);
  const auto=card.classList.contains('is-auto-mode'),minimum=auto?142:200,preferred=auto?160:244;
  const rows=Math.max(1,Math.min(Math.floor(6/cols),Math.ceil(list.children.length/cols)||1,Math.floor((available-padding+gap)/(minimum+gap))||1));
  const height=Math.max(minimum,Math.min(preferred,Math.floor((available-padding-gap*(rows-1))/rows)));
  for(const [key,value] of [['--bulk-row-height',height+'px'],['--bulk-grid-height',(height*rows+gap*(rows-1)+padding)+'px']])if(list.style.getPropertyValue(key)!==value)list.style.setProperty(key,value);
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(update);}
 const observer=new MutationObserver(schedule);observer.observe(card,{attributes:true,attributeFilter:['class']});observer.observe(document.body,{attributes:true,attributeFilter:['class']});observer.observe(list,{childList:true});
 const resize=new ResizeObserver(schedule);resize.observe(card.querySelector('.bulk-sticky-header'));resize.observe(card.querySelector('.bulk-footer'));
 addEventListener('resize',schedule,{passive:true});schedule();
})();
