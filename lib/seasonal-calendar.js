'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QuickJiraSeasonal = factory();
})(globalThis, function () {
  const DAY = 86400000;
  const VIETNAM_OFFSET = 7 * DAY / 24;
  const UNIX_JDN = 2440588;
  const SYNODIC = 29.530588853;
  const EPOCH = 2415021.076998695;
  const toISO = value => new Date(value).toISOString().slice(0, 10);
  const shift = (date, days) => toISO(Date.parse(date) + days * DAY);
  const today = (now = Date.now()) => toISO(now + VIETNAM_OFFSET);
  const untilMidnight = (now = Date.now()) => DAY - ((now + VIETNAM_OFFSET) % DAY);

  // Vietnamese civil lunar days use UTC+7. Month 11 contains the winter
  // solstice. In a 13-month cycle, the first month without a major solar
  // term following month 11 is intercalary (Meeus / Hồ Ngọc Đức method).
  const rad = Math.PI / 180;
  const sin = angle => Math.sin(angle * rad);
  function moonDay(cycle) {
    const t = cycle / 1236.85;
    const t2 = t * t;
    const t3 = t2 * t;
    const sun = 359.2242 + 29.10535608 * cycle - .0000333 * t2 - .00000347 * t3;
    const moon = 306.0253 + 385.81691806 * cycle + .0107306 * t2 + .00001236 * t3;
    const latitude = 21.2964 + 390.67050646 * cycle - .0016528 * t2 - .00000239 * t3;
    const mean = 2415020.75933 + SYNODIC * cycle + .0001178 * t2 - .000000155 * t3
      + .00033 * sin(166.56 + 132.87 * t - .009173 * t2);
    const correction = (.1734 - .000393 * t) * sin(sun) + .0021 * sin(2 * sun)
      - .4068 * sin(moon) + .0161 * sin(2 * moon) - .0004 * sin(3 * moon)
      + .0104 * sin(2 * latitude) - .0051 * sin(sun + moon) - .0074 * sin(sun - moon)
      + .0004 * sin(2 * latitude + sun) - .0004 * sin(2 * latitude - sun)
      - .0006 * sin(2 * latitude + moon) + .001 * sin(2 * latitude - moon)
      + .0005 * sin(2 * moon + sun);
    const delta = t < -11
      ? .001 + .000839 * t + .0002261 * t2 - .00000845 * t3 - .000000081 * t2 * t2
      : -.000278 + .000265 * t + .000262 * t2;
    return Math.floor(mean + correction - delta + .5 + 7 / 24);
  }

  function solarTerm(day) {
    const t = (day - .5 - 7 / 24 - 2451545) / 36525;
    const t2 = t * t;
    const anomaly = 357.52910 + 35999.05030 * t - .0001559 * t2 - .00000048 * t2 * t;
    const longitude = 280.46645 + 36000.76983 * t + .0003032 * t2
      + (1.914600 - .004817 * t - .000014 * t2) * sin(anomaly)
      + (.019993 - .000101 * t) * sin(2 * anomaly) + .000290 * sin(3 * anomaly);
    return Math.floor((((longitude % 360) + 360) % 360) / 30);
  }

  function monthEleven(year) {
    const yearEnd = Date.UTC(year, 11, 31) / DAY + UNIX_JDN;
    const cycle = Math.floor((yearEnd - 2415021) / SYNODIC);
    return solarTerm(moonDay(cycle)) >= 9 ? moonDay(cycle - 1) : moonDay(cycle);
  }

  function lunarDate(year, month, day) {
    const first = monthEleven(year - 1);
    const last = monthEleven(year);
    const cycle = Math.round((first - EPOCH) / SYNODIC);
    let offset = month + 1;
    if (last - first > 365) {
      for (let index = 1; index <= offset; index += 1) {
        if (solarTerm(moonDay(cycle + index)) === solarTerm(moonDay(cycle + index + 1))) {
          offset += 1;
          break;
        }
      }
    }
    return toISO((moonDay(cycle + offset) + day - 1 - UNIX_JDN) * DAY);
  }

  const themes = {
    tet: { name: 'Tết Nguyên đán', label: '27 tháng Chạp – mùng 5 Tết (âm lịch)', lunar: true,
      effects: ['Cánh mai rơi', 'Mưa cánh mai'] },
    vacation: { name: 'Nghỉ mát', effects: ['Sóng vỗ chậm', 'Lá dừa theo gió'] },
    april: { name: 'Ngày 30/04', dates: ['04-30', '05-01'], effects: ['Cờ bay theo gió', 'Cờ bay phấp phới'] },
    children: { name: 'Quốc tế Thiếu nhi', dates: ['06-01', '06-01'], effects: ['Dải đuôi diều trong gió', 'Bong bóng bay lên'] },
    birthday: { name: 'Sinh nhật', effects: ['Tia sáng quanh nến', 'Giấy màu chúc mừng'] },
    moon: { name: 'Tết Trung thu', label: '13–15 tháng 8 âm lịch', lunar: true,
      effects: ['Mây trôi dưới trăng', 'Ánh đèn ông sao'] },
    school: { name: 'Khai giảng', dates: ['09-05', '09-05'], effects: ['Lá rơi nhẹ', 'Lá cuốn theo gió'] },
    halloween: { name: 'Halloween', dates: ['10-30', '10-31'], effects: ['Tàn lửa từ bí ngô', 'Sương trôi chậm'] },
    teachers: { name: 'Ngày 20/11', dates: ['11-19', '11-20'], effects: ['Cánh hoa rơi', 'Cánh hoa bay theo gió'] },
    christmas: { name: 'Giáng sinh', dates: ['12-20', '12-25'], effects: ['Tuyết rơi thưa', 'Tuyết rơi dày hơn'] }
  };

  const ids = Object.keys(themes);
  const priority = ['birthday', 'tet', 'april', 'children', 'moon', 'school', 'halloween', 'teachers', 'christmas', 'vacation'];
  function defaultRange(id, year) {
    if (id === 'tet') {
      const first = lunarDate(year, 1, 1);
      // Derive the actual length of Chạp from the immediately preceding new moon.
      const firstDay = Date.parse(first) / DAY + UNIX_JDN;
      const cycle = Math.round((firstDay - EPOCH) / SYNODIC);
      const chapStart = moonDay(cycle - 1);
      return [toISO((chapStart + 26 - UNIX_JDN) * DAY), shift(first, 4)];
    }
    if (id === 'moon') return [lunarDate(year, 8, 13), lunarDate(year, 8, 15)];
    return themes[id]?.dates?.map(date => `${year}-${date}`) || null;
  }

  function validISO(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01') return false;
    const millis = Date.parse(value);
    return Number.isFinite(millis) && toISO(millis) === value;
  }

  function validSchedule(value) {
    if (!value) return false;
    if (value.repeat === true) return [value.start, value.end].every(date =>
      typeof date === 'string' && /^\d{2}-\d{2}$/.test(date) && validISO(`2000-${date}`));
    return value.repeat === false && validISO(value.start) && validISO(value.end) && value.start <= value.end;
  }

  function validTheme(id) { return ids.includes(id); }
  function normalize(input) {
    const order = Array.isArray(input?.order) ? input.order.filter(validTheme) : [];
    return {
      motion: input?.motion !== false,
      order: [...new Set([...order, ...priority])],
      rules: Object.fromEntries(ids.map(id => {
        const rule = input?.rules?.[id];
        return [id, {
          enabled: rule?.enabled !== false,
          motion: rule?.motion !== false,
          effect: rule?.effect === 1 ? 1 : 0,
          schedule: validSchedule(rule?.schedule) ? rule.schedule : null
        }];
      }))
    };
  }

  function rangesFor(id, rule, date) {
    const year = Number(date.slice(0, 4));
    const schedule = rule.schedule;
    if (!schedule) return [defaultRange(id, year)].filter(Boolean);
    if (!schedule.repeat) return [[schedule.start, schedule.end]];
    return [year - 1, year].map(startYear => {
      const endYear = startYear + Number(schedule.end < schedule.start);
      return [`${startYear}-${schedule.start}`, `${endYear}-${schedule.end}`];
    }).filter(range => range.every(validISO));
  }

  function activeTheme(preferences, date) {
    return preferences.order.find(id => {
      const rule = preferences.rules[id];
      return rule.enabled && rangesFor(id, rule, date).some(([start, end]) => start <= date && date <= end);
    }) || '';
  }

  function accountKey(user) {
    const id = user?.accountId || user?.key || user?.username || user?.name;
    return id ? `qjl:seasonal:v1:${encodeURIComponent(String(id))}` : '';
  }

  return { themes, ids, today, untilMidnight, defaultRange, validSchedule, normalize, activeTheme, accountKey };
});
