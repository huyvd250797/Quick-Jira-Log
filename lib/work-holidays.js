'use strict';

// Application leave calendar requested by the owner, independent of visual themes.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./seasonal-calendar'));
  else root.QuickJiraWorkHolidays = factory(root.QuickJiraSeasonal);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (seasonal) {
  const fixed = Object.freeze({
    '01-01': 'Tết Dương lịch', '04-30': 'Ngày 30/04', '05-01': 'Ngày 01/05',
    '07-27': 'Ngày 27/07', '09-02': 'Quốc khánh', '11-24': 'Ngày 24/11'
  });
  const cache = new Map();
  function valid(date) {
    return /^\d{4}-\d{2}-\d{2}$/.test(date || '') && Number(date.slice(0,4)) >= 1900 &&
      Number(date.slice(0,4)) <= 2199 && Number.isFinite(Date.parse(date + 'T12:00:00Z')) && new Date(date + 'T12:00:00Z').toISOString() === date + 'T12:00:00.000Z';
  }
  function yearDates(year) {
    if (!Number.isInteger(year) || year < 1900 || year > 2199) throw Error('Lịch nghỉ hỗ trợ năm 1900–2199.');
    if (!cache.has(year)) {
      if (!seasonal?.defaultRange) throw Error('Chưa tải được lịch âm; vui lòng tải lại ứng dụng.');
      const map = new Map(Object.entries(fixed).map(([day,name]) => [year + '-' + day, name]));
      map.set(seasonal.defaultRange('hungking', year)[0], 'Giỗ Tổ Hùng Vương (10/3 âm lịch)');
      if (cache.size >= 16) cache.delete(cache.keys().next().value);
      cache.set(year, map);
    }
    return cache.get(year);
  }
  function name(date) { return valid(date) ? yearDates(Number(date.slice(0,4))).get(date) || '' : ''; }
  function isHoliday(date) { return !!name(date); }
  function nextWorkingDay(date) {
    if (!valid(date)) throw Error('Ngày không hợp lệ hoặc ngoài năm 1900–2199.');
    const cursor = new Date(date + 'T12:00:00Z');
    for (let i=0; i<32; i++) {
      const candidate = cursor.toISOString().slice(0,10);
      if (!valid(candidate)) throw Error('Ngày kế tiếp ngoài phạm vi lịch nghỉ.');
      if (![0,6].includes(cursor.getUTCDay()) && !isHoliday(candidate)) return candidate;
      cursor.setUTCDate(cursor.getUTCDate()+1);
    }
    throw Error('Chưa tìm được ngày làm việc kế tiếp.');
  }
  function automaticDay(date) { return isHoliday(date) ? nextWorkingDay(date) : date; }
  function list(year) { return [...yearDates(year)].map(([date,name])=>({date,name})).sort((a,b)=>a.date.localeCompare(b.date)); }
  return {isHoliday,name,nextWorkingDay,automaticDay,list};
});
