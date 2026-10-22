'use strict';
const assert=require('node:assert/strict'),{render}=require('../lib/jira-content'),codec=require('../lib/jira-editor-codec');
assert.equal(codec.color('rgb(15, 138, 100)'),'#0f8a64');assert.equal(codec.color('#abc'),'#aabbcc');assert.equal(codec.color('url(javascript:x)'),'');
assert(codec.canVisual('h2. Tiêu đề\n\n* Nội dung\n\n{color:#0f8a64}Xong{color}'));assert(!codec.canVisual('{panel:title=Không mất}\nNội dung\n{panel}'));assert(!codec.canVisual('{code}abc{code}'));
assert.equal(codec.escapeText('*văn bản* | tên_file'),'\\*văn bản\\* \\| tên\\_file');
const literal=render('\\*văn bản\\* \\_tên\\_ và \\{color:red\\}');assert(!literal.includes('<strong>'));assert(!literal.includes('<em>'));assert(literal.includes('*văn bản* _tên_ và {color:red}'));
const nested=render('*_{color:#0f8a64}Nghiệp vụ{color}_*');assert(nested.includes('<strong><em><span style="color:#0f8a64">Nghiệp vụ</span></em></strong>'));
const list=render('* Một\n** Con\n* Hai\n# Ba');assert.equal((list.match(/<li>/g)||[]).length,4);assert(list.includes('<ul>'));assert(list.includes('<ol>'));assert.equal((list.match(/<li>/g)||[]).length,(list.match(/<\/li>/g)||[]).length);
const table=render('||Mã||Mô tả||\n|EPU01|Có \\| trong ô|\n| | |');assert.equal((table.match(/<td>/g)||[]).length,4);assert(table.includes('Có | trong ô'));
assert(render('h1. Tiêu đề',{editor:true}).includes('<h1>'));assert(render('h1. Tiêu đề').includes('<h2>'));
for(const payload of ['*_ <script>alert(1)</script> _*','{color:expression(x)}a{color}','[x|javascript:alert(1)]']){const result=render(payload);assert(!result.includes('<script>'));assert(!result.includes('href="javascript:'));assert(!result.includes('style="color:expression'));}
console.log('Editor codec: wiki escaping, nested emphasis/color, headings, nested lists, escaped table cells, advanced-source guard and safe preview passed.');
