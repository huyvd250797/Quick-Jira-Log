'use strict';
window.QuickJiraReading=(()=>{
 const $=id=>document.getElementById(id),dialog=$('jiraIssuePeekDialog'),body=$('jiraDetailBody'),tools=$('jiraDetailScrollTools'),top=$('jiraDetailTopBtn'),bottom=$('jiraDetailBottomBtn');
 let timer=0,frame=0,suppressUntil=0;
 const usable=()=>dialog.open&&$('jiraTab-description').getAttribute('aria-selected')==='true'&&body.scrollHeight>body.clientHeight+3;
 function visible(value){tools.classList.toggle('is-visible',value);tools.setAttribute('aria-hidden',String(!value));for(const button of [top,bottom])button.tabIndex=value?0:-1;}
 function hideLater(){clearTimeout(timer);timer=setTimeout(()=>{if(!tools.contains(document.activeElement))visible(false);},1000);}
 function update(){frame=0;if(performance.now()<suppressUntil||!usable())return;top.disabled=body.scrollTop<2;bottom.disabled=body.scrollTop+body.clientHeight>=body.scrollHeight-3;visible(true);hideLater();}
 function reset(){clearTimeout(timer);if(frame)cancelAnimationFrame(frame);frame=0;suppressUntil=performance.now()+120;visible(false);}
 function scroll(end){if(!usable())return;body.scrollTo({top:end?body.scrollHeight:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});hideLater();}
 body.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(update);},{passive:true});
 top.onclick=e=>{scroll(false);if(e.detail>0)top.blur();};bottom.onclick=e=>{scroll(true);if(e.detail>0)bottom.blur();};tools.addEventListener('focusout',hideLater);dialog.addEventListener('close',reset);
 function layout(){const footer=dialog.querySelector('footer');dialog.style.setProperty('--jira-reading-bottom',Math.ceil(footer?.getBoundingClientRect().height||66)+12+'px');if(!usable())visible(false);}
 const observer=new ResizeObserver(layout);observer.observe(body);observer.observe(dialog.querySelector('footer'));reset();
 return {reset};
})();
