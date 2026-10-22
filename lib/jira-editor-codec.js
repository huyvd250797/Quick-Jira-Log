(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QuickJiraEditorCodec=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const escapeText=value=>String(value||'').replace(/\u00a0/g,' ').replace(/\u200b/g,'').replace(/([\\*_{}\[\]|!#^~])/g,'\\$1');
 function color(value){const v=String(value||'').trim();if(/^#[a-f0-9]{6}$/i.test(v))return v.toLowerCase();if(/^#[a-f0-9]{3}$/i.test(v))return '#'+v.slice(1).split('').map(c=>c+c).join('').toLowerCase();const m=v.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);if(m&&m.slice(1).every(c=>Number(c)<=255))return '#'+m.slice(1).map(c=>Number(c).toString(16).padStart(2,'0')).join('');return '';}
 function toWiki(root){let nodes=0;
  function walk(node,depth=0,prefix='',inheritedColor=''){
   if(++nodes>25000||depth>30)throw Error('Mô tả quá phức tạp. Hãy rút gọn nội dung.');
   if(node.nodeType===3){const text=escapeText(node.textContent);return inheritedColor&&text.trim()?'{color:'+inheritedColor+'}'+text+'{color}':text;}if(node.nodeType!==1&&node!==root)return '';
   const tag=node.tagName||'';if(['SCRIPT','STYLE','IFRAME','OBJECT','SVG','MATH','TEMPLATE','INPUT','BUTTON'].includes(tag))return '';
   if(tag==='BR')return '\n';
   const currentColor=color(node.style?.color||node.getAttribute?.('color'))||inheritedColor;
   if(tag==='UL'||tag==='OL')return [...node.children].filter(n=>n.tagName==='LI').map(li=>walk(li,depth+1,prefix+(tag==='OL'?'#':'*'),currentColor)).join('')+'\n';
   if(tag==='LI'){let first='',nested='';for(const child of node.childNodes){if(['UL','OL'].includes(child.tagName))nested+=walk(child,depth+1,prefix,currentColor);else first+=walk(child,depth+1,prefix,currentColor);}return prefix+' '+first.trim().replace(/\n+/g,' ')+'\n'+nested;}
   if(tag==='TABLE'){
    let out='';for(const row of node.querySelectorAll('tr')){if(row.closest('table')!==node)continue;const cells=[...row.children].filter(n=>['TD','TH'].includes(n.tagName));if(!cells.length)continue;const mark=cells.every(n=>n.tagName==='TH')?'||':'|';out+=mark+cells.map(cell=>[...cell.childNodes].map(n=>walk(n,depth+1,'',color(cell.style?.color)||currentColor)).join('').trim().replace(/\n+/g,' \\\\ ')||' ').join(mark)+mark+'\n';}return '\n'+out+'\n';
   }
   let text=[...node.childNodes].map(n=>walk(n,depth+1,prefix,currentColor)).join('');
   if(['STRONG','B'].includes(tag))return text?'*'+text+'*':'';if(['EM','I'].includes(tag))return text?'_'+text+'_':'';
   if(tag==='CODE')return '{{'+text+'}}';
   if(tag==='A'){try{const u=new URL(node.getAttribute('href'));if(['https:','http:'].includes(u.protocol)&&!u.username&&!u.password)return '['+text+'|'+u.href.replace(/[\]\r\n|]/g,encodeURIComponent)+']';}catch{}return text;}
   if(/^H[1-6]$/.test(tag))return 'h'+tag[1]+'. '+text.trim()+'\n\n';
   if(['P','DIV','BLOCKQUOTE'].includes(tag)&&node!==root)return text+'\n\n';
   return text;
  }
  return walk(root).replace(/\n{3,}/g,'\n\n').trim();
 }
 function canVisual(value){const text=String(value||'').replace(/\\[\\*_{}\[\]|!#^~]/g,'').replace(/\{color(?::#[a-f0-9]{3,6})?\}/gi,'');return !/[{}!]/.test(text)&&!/^\s*(?:bq\.|----|\{)/m.test(text);}
 return {toWiki,color,canVisual,escapeText};
});
