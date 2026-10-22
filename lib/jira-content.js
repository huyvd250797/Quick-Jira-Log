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
  function inline(value){
    const re=/\[([^\]\n|]+)\|([^\]\n]+)\]|\[https?:\/\/[^\]\n]+\]|\{\{([^{}\n]+)\}\}|\*([^*\n]+)\*/g;
    let html='',last=0,match;
    while((match=re.exec(value))){html+=escape(value.slice(last,match.index));
      if(match[1]!==undefined){const url=safeUrl(match[2]);html+=url?`<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(match[1])}</a>`:escape(match[0]);}
      else if(match[0].startsWith('[http')){const url=safeUrl(match[0].slice(1,-1));html+=url?`<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(url)}</a>`:escape(match[0]);}
      else if(match[3]!==undefined)html+=`<code>${escape(match[3])}</code>`;
      else html+=`<strong>${escape(match[4])}</strong>`;
      last=re.lastIndex;
    }
    return html+escape(value.slice(last));
  }
  function render(value){
    const lines=String(value||'').replace(/\r\n?/g,'\n').split('\n');let out='',code=null,rows=[],list=null;
    function flushTable(){if(rows.length){out+='<div class="jira-content-table"><table><tbody>'+rows.join('')+'</tbody></table></div>';rows=[];}}
    function flushList(){if(list){out+=`</${list}>`;list=null;}}
    for(const line of lines){
      if(/^\{(?:code(?::[^}]*)?|noformat)\}\s*$/.test(line)){
        flushTable();flushList();if(code!==null){out+='<pre><code>'+escape(code.join('\n'))+'</code></pre>';code=null;}else code=[];continue;
      }
      if(code!==null){code.push(line);continue;}
      if(/^\|.*\|\s*$/.test(line)){flushList();const header=line.startsWith('||'),cells=line.trim().slice(header?2:1,header?-2:-1).split(header?'||':'|'),tag=header?'th':'td';rows.push('<tr>'+cells.map(x=>`<${tag}>${inline(x.trim())}</${tag}>`).join('')+'</tr>');continue;}
      flushTable();const item=line.match(/^([*#])\s+(.+)$/);
      if(item){const tag=item[1]==='#'?'ol':'ul';if(list!==tag){flushList();out+=`<${tag}>`;list=tag;}out+='<li>'+inline(item[2])+'</li>';continue;}
      flushList();const heading=line.match(/^h([1-6])\.\s+(.+)$/);
      if(heading){const level=Math.min(6,Number(heading[1])+1);out+=`<h${level}>${inline(heading[2])}</h${level}>`;}
      else if(line.trim())out+='<p>'+inline(line)+'</p>';
      else out+='<div class="jira-content-gap"></div>';
    }
    flushTable();flushList();if(code!==null)out+='<pre><code>'+escape(code.join('\n'))+'</code></pre>';return out;
  }
  return {normalize,render,safeUrl};
});
