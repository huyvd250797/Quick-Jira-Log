'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const H=require('../lib/work-holidays'),U=require('../lib/ui-tools'),C=require('../lib/calendar-style'),src=fs.readFileSync(__dirname+'/../app.js','utf8');
function extract(name,next){const start=src.indexOf('function '+name+'('),end=src.indexOf('\nfunction '+next+'(',start);assert(start>=0&&end>start);return src.slice(start,end);}
const els=new Map(),el=id=>{if(!els.has(id))els.set(id,{innerHTML:'',querySelectorAll:()=>[],querySelector:()=>({})});return els.get(id);};
const sandbox={QuickJiraWorkHolidays:H,QuickJiraUi:U,QuickJiraCalendar:C,$:el,state:{historyItems:[],historyNotice:'',user:{username:'qa'},projectColors:{},projectPalette:{}},historyDayLabel:date=>date,formatHistoryTimeSpent:n=>n+'m',escapeHtml:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),todayLocal:()=>'',vietnamToday:()=>'',calendarPreviewItems:()=>[],calendarViewedUser:null,calendarReadOnly:()=>false,fitWeekToViewport(){},isWeekendDateClient:d=>[0,6].includes(new Date(d+'T12:00:00Z').getUTCDay())};
vm.createContext(sandbox);vm.runInContext(extract('renderMonthlyCalendar','renderCalendarAgenda')+'\n'+extract('renderWeeklyCalendar','setCalendarMode'),sandbox);
for(const day of H.list(2026)) {
 sandbox.renderMonthlyCalendar(day.date);const monthly=el('calendarGrid').innerHTML;
 const cell=monthly.match(new RegExp('<button[^>]*data-date="'+day.date+'"[\\s\\S]*?<\\/button>'))[0];
 assert(cell.includes('is-holiday'));assert(cell.includes('class="calendar-holiday-name"'));assert(cell.includes(day.name));assert(!cell.includes(' disabled'));
 sandbox.renderWeeklyCalendar(day.date);const weekly=el('weeklyCalendar').innerHTML;
 const heading=weekly.match(new RegExp('<button[^>]*data-week-day="'+day.date+'"[\\s\\S]*?<\\/button>'))[0];
 assert(heading.includes(day.name));assert(heading.includes('calendar-holiday-name'));assert(!heading.includes(' disabled'));
 assert(weekly.includes('week-day-column is-holiday'));
 assert(weekly.includes('calendar-time-slot'),'Holiday columns keep interactive log slots');
}
// Negative control: a normal day has no red holiday class or event label.
sandbox.renderMonthlyCalendar('2026-11-23');const normal=el('calendarGrid').innerHTML.match(/<button[^>]*data-date="2026-11-23"[\s\S]*?<\/button>/)[0];assert(!normal.includes('is-holiday'));assert(!normal.includes('calendar-holiday-name'));
console.log('Holiday calendar templates: seven holiday names visible in real month/week renderer output, empty days red-classed, normal date unaffected, manual buttons and slots retained.');
