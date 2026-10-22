(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QuickJiraContent=api;})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function normalize(value){
    const limit=200000;let truncated=false,text='';
    if(typeof value==='string')text=value;
    else if(value&&typeof value==='object'){
      const out=[];let count=0,size=0;
      function add(s){if(size>=limit){truncated=true;return;}out.push(s.slice(0,limit-size));size+=s.length;if(size>limit)truncated=true;}
      function walk(node,depth=0){
        if(!node||depth>24||++count>20000||size>=limit){truncated=true;return;}
        if(node.type==='text'&&typeof node.text==='string')add(node.text);
        else if(node.type==='hardBreak')add('\n');
        else if(node.type==='mention')add(String(node.attrs?.text||node.attrs?.displayName||'@Người dùng'));
        else if(node.type==='emoji')add(String(node.attrs?.text||node.attrs?.shortName||''));
        else if(node.type==='inlineCard')add(String(node.attrs?.url||''));
        else if(['media','mediaSingle','mediaGroup'].includes(node.type)){add('[Nội dung đính kèm — xem trên Jira]\n');return;}
        else if(node.type==='listItem')add('• ');
        if(Array.isArray(node.content))for(const child of node.content){walk(child,depth+1);if(size>=limit||count>20000)break;}
        if(['paragraph','heading','listItem','codeBlock','blockquote','tableRow'].includes(node.type))add('\n');
        if(node.type==='tableCell'||node.type==='tableHeader')add('\t');
      }
      walk(value);text=out.join('').trim();
    }
    if(text.length>limit){text=text.slice(0,limit);truncated=true;}
    return {text,truncated};
  }
  function safeUrl(value){try{const s=String(value).trim();if(/[\x00-\x20\x7f]/.test(s))return '';const u=new URL(s);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
  const color=value=>/^(?:#[a-f0-9]{3}(?:[a-f0-9]{3})?|rgba?\([0-9.,% ]{3,50}\)|(?:black|white|red|green|blue|yellow|orange|purple|grey|gray|teal|navy|maroon|lime|aqua|fuchsia|silver|olive))$/i.test(String(value||''))?value:'';
  function imageHtml(reference,options={}){
    const key=options.key;if(!/^[A-Z][A-Z0-9_]*-\d+$/.test(key||''))return escape('['+reference+']');
    const attachments=Array.isArray(options.attachments)?options.attachments:[];let file=null,ref=String(reference||'').split('|')[0].trim(),id='';
    try{const u=new URL(ref,'https://task.ascvn.com.vn');if(u.origin==='https://task.ascvn.com.vn'&&!u.username&&!u.password){const match=u.pathname.match(/^\/(?:secure\/(?:attachment|thumbnail)\/(\d{1,30})(?:\/|$)|rest\/api\/2\/attachment\/content\/(\d{1,30})$)/);id=match?.[1]||match?.[2]||'';}}catch{}
    if(id)file=attachments.find(a=>a.id===id);else if(!ref.includes('/')){try{ref=decodeURIComponent(ref);}catch{}const found=attachments.filter(a=>a.name===ref);if(found.length===1)file=found[0];}
    const jira='https://task.ascvn.com.vn/browse/'+encodeURIComponent(key);
    if(!file||!file.inline&&!file.thumbnail)return `<span class="jira-image-fallback">${escape(file?.name||'Ảnh trong mô tả')} · <a href="${jira}" target="_blank" rel="noopener noreferrer">Mở Jira ↗</a></span>`;
    const params=new URLSearchParams({action:'jira-attachment-content',key,id:file.id,...(!file.inline?{thumbnail:'1'}:{})});
    return `<span class="jira-inline-image"><button type="button" class="jira-inline-image-open" data-jira-inline-image="${escape(file.id)}" aria-label="Xem ảnh ${escape(file.name)}"><img src="/api?${escape(params.toString())}" alt="${escape(file.name)}" loading="lazy" decoding="async"></button><small class="jira-inline-image-error" hidden>Chưa tải được ảnh · <a href="${jira}" target="_blank" rel="noopener noreferrer">Mở Jira ↗</a></small>${!file.inline?'<small class="jira-image-quality">Ảnh xem trước · Mở Jira để xem bản gốc</small>':''}</span>`;
  }
  function inline(value,depth=0,options={}){
    if(depth>12)return escape(value);
    let prefix='\ue000qjl';while(value.includes(prefix))prefix+='x';const literals=[];value=value.replace(/\\([\\*_{}\[\]|!#^~])/g,(_,c)=>{const i=literals.push(c)-1;return prefix+i+'\ue001';});
    let html=inlinePlain(value,options,depth);for(let i=0;i<literals.length;i++)html=html.split(prefix+i+'\ue001').join(escape(literals[i]));return html;
  }
  function inlinePlain(value,options={},depth=0){
    const re=/\[([^\]\n|]+)\|([^\]\n]+)\]|\[https?:\/\/[^\]\n]+\]|\{\{([^{}\n]+)\}\}|\*([^*\n]+)\*|!(?<image>[^!\n]+)!|_(?<italic>[^_\n]+)_|\{color:(?<colorCode>[^}\n]+)\}(?<colorBody>[\s\S]*?)\{color\}/g;
    let html='',last=0,match;
    while((match=re.exec(value))){html+=escape(value.slice(last,match.index));
      if(match.groups?.colorCode!==undefined){const c=color(match.groups.colorCode);html+=c?`<span style="color:${escape(c)}">${inline(match.groups.colorBody,depth+1,options)}</span>`:escape(match[0]);}
      else if(match.groups?.italic!==undefined)html+='<em>'+inline(match.groups.italic,depth+1,options)+'</em>';
      else if(match.groups?.image!==undefined)html+=imageHtml(match.groups.image,options);
      else if(match[1]!==undefined){const url=safeUrl(match[2]);html+=url?`<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(match[1])}</a>`:escape(match[0]);}
      else if(match[0].startsWith('[http')){const url=safeUrl(match[0].slice(1,-1));html+=url?`<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(url)}</a>`:escape(match[0]);}
      else if(match[3]!==undefined)html+=`<code>${escape(match[3])}</code>`;
      else html+=`<strong>${inline(match[4],depth+1,options)}</strong>`;
      last=re.lastIndex;
    }
    return html+escape(value.slice(last));
  }
  function render(value,options={}){
    const formatted=value=>inline(value,0,options);
    function cells(text,delimiter){const out=[];let start=0,brackets=0;for(let i=0;i<text.length;i++){if(text[i]==='\\'){i++;continue;}if(text[i]==='[')brackets++;if(text[i]===']')brackets=Math.max(0,brackets-1);if(!brackets&&text.startsWith(delimiter,i)){out.push(text.slice(start,i));i+=delimiter.length-1;start=i+1;}}out.push(text.slice(start));return out;}
    const lines=String(value||'').replace(/\r\n?/g,'\n').split('\n');let out='',code=null,rows=[],list=[],activeColor='';
    function styled(line){let c=activeColor;const tokens=line.match(/\{color(?::[^}\n]+)?\}/g)||[];for(const token of tokens){if(token==='{color}')activeColor='';else activeColor=color(token.slice(7,-1))||activeColor;}
      const prefix=c&&!line.startsWith('{color:')?'{color:'+c+'}':'';let text=prefix+line;if(activeColor)text+='{color}';return text;
    }
    function flushTable(){if(rows.length){out+='<div class="jira-content-table"><table><tbody>'+rows.join('')+'</tbody></table></div>';rows=[];}}
    function flushList(){while(list.length)out+='</li></'+list.pop()+'>';}
    for(let line of lines){
      if(/^\{(?:code(?::[^}]*)?|noformat)\}\s*$/.test(line)){
        flushTable();flushList();if(code!==null){out+='<pre><code>'+escape(code.join('\n'))+'</code></pre>';code=null;}else code=[];continue;
      }
      if(code!==null){code.push(line);continue;}
      line=styled(line);
      if(/^\|.*\|\s*$/.test(line)){flushList();const header=line.startsWith('||'),parts=cells(line.trim().slice(header?2:1,header?-2:-1),header?'||':'|'),tag=header?'th':'td';rows.push('<tr>'+parts.map(x=>`<${tag}>${x.trim().split(' \\\\ ').map(formatted).join('<br>')}</${tag}>`).join('')+'</tr>');continue;}
      flushTable();const item=line.match(/^([*#]{1,8})\s+(.*)$/);
      if(item){const levels=[...item[1]].map(c=>c==='#'?'ol':'ul');let common=0;while(common<list.length&&common<levels.length&&list[common]===levels[common])common++;while(list.length>common)out+='</li></'+list.pop()+'>';if(list.length===levels.length&&list.length)out+='</li><li>';else{for(let i=list.length;i<levels.length;i++){out+='<'+levels[i]+'><li>';list.push(levels[i]);}}out+=formatted(item[2]);continue;}
      flushList();const heading=line.match(/^h([1-6])\.\s+(.+)$/);
      if(heading){const level=Math.min(6,Number(heading[1])+(options.editor?0:1));out+=`<h${level}>${formatted(heading[2])}</h${level}>`;}
      else if(line.trim())out+='<p>'+formatted(line)+'</p>';
      else out+='<div class="jira-content-gap"></div>';
    }
    flushTable();flushList();if(code!==null)out+='<pre><code>'+escape(code.join('\n'))+'</code></pre>';return out;
  }
  function rendered(html,options={}){
    if(typeof DOMParser==='undefined')return '';
    const doc=new DOMParser().parseFromString(String(html||'').slice(0,400000),'text/html');let count=0;
    const tags=new Set(['P','DIV','SPAN','FONT','STRONG','B','EM','I','U','S','DEL','SUP','SUB','BR','HR','UL','OL','LI','H1','H2','H3','H4','H5','H6','BLOCKQUOTE','PRE','CODE','TABLE','THEAD','TBODY','TR','TD','TH','A']);
    function clean(node,depth=0){if(++count>25000||depth>30)return '';if(node.nodeType===3)return escape(node.textContent);if(node.nodeType!==1)return '';if(['SCRIPT','STYLE','IFRAME','OBJECT','SVG','MATH','TEMPLATE','FORM'].includes(node.tagName))return '';
      if(node.tagName==='IMG')return imageHtml(node.getAttribute('src')||'',options);
      const children=[...node.childNodes].map(n=>clean(n,depth+1)).join('');if(!tags.has(node.tagName))return children;const tag=node.tagName==='FONT'?'span':node.tagName.toLowerCase();let attrs='',styles=[];
      if(tag==='a'&&children.includes('data-jira-inline-image='))return children;
      for(const prop of ['color','background-color']){const c=color(node.style?.getPropertyValue(prop)||'');if(c)styles.push(prop+':'+c);}
      const fontColor=color(node.getAttribute('color')||'');if(fontColor)styles.push('color:'+fontColor);
      if(styles.length)attrs+=' style="'+escape(styles.join(';'))+'"';
      if(tag==='a'){const url=safeUrl(node.getAttribute('href')||'');if(url)attrs+=' href="'+escape(url)+'" target="_blank" rel="noopener noreferrer"';}
      for(const prop of ['colspan','rowspan'])if(['td','th'].includes(tag)&&/^[1-9]\d?$/.test(node.getAttribute(prop)||''))attrs+=' '+prop+'="'+node.getAttribute(prop)+'"';
      return '<'+tag+attrs+'>'+children+(['br','hr'].includes(tag)?'':'</'+tag+'>');
    }
    return [...doc.body.childNodes].map(n=>clean(n)).join('');
  }
  return {normalize,render,safeUrl,rendered};
});
