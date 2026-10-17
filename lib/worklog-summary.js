(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.QuickJiraSummary = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function shift(date, days) {
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  }
  function dates(range) {
    const result = [];
    for (let date = range.start; date <= range.end; date = shift(date, 1)) result.push(date);
    return result;
  }
  function chunks(range, size = 3) {
    const days = dates(range), result = [];
    for (let i = 0; i < days.length; i += size) result.push({ start: days[i], end: days[Math.min(i + size - 1, days.length - 1)] });
    return result;
  }
  function classification(item) {
    // No inference from comment markers, clock time, or a day exceeding 8h.
    if (item.overtimeKnown !== true || typeof item.overtime !== 'boolean') return 'unknown';
    return item.overtime ? 'overtime' : 'regular';
  }
  function typeOf(item) {
    if (item.isSubtask === false) return { id: 'other', name: 'Task khác' };
    if (item.isSubtask !== true || !item.issueType || !item.issueTypeId) return { id: 'unknown', name: 'Chưa xác định' };
    return { id: `type:${item.issueTypeId}`, name: item.issueType };
  }
  function uniqueItems(items, range) {
    const seen = new Set();
    return (items || []).filter(item => {
      if (item.date < range.start || item.date > range.end || !(Number(item.timeSpentSeconds ?? Number(item.minutes) * 60) > 0)) return false;
      const id = `${item.key}|${item.id}`;
      if (!item.id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }
  function aggregate(items, range, project = '', today = range.end) {
    const all = uniqueItems(items, range);
    const selected = all.filter(item => !project || item.project === project);
    const projects = new Map(), types = new Map(), byDay = new Map();
    const totals = { regular: 0, overtime: 0, unknown: 0, total: 0 };
    for (const item of selected) {
      const seconds = Number(item.timeSpentSeconds ?? Number(item.minutes) * 60);
      const kind = classification(item), type = typeOf(item);
      const projectId = item.project || item.key.split('-')[0];
      if (!projects.has(projectId)) projects.set(projectId, { id: projectId, name: projectId, regular: 0, overtime: 0, unknown: 0, total: 0 });
      if (!types.has(type.id)) types.set(type.id, { ...type, total: 0 });
      if (!byDay.has(item.date)) byDay.set(item.date, { regular: 0, overtime: 0, unknown: 0, total: 0 });
      for (const target of [totals, projects.get(projectId), byDay.get(item.date)]) { target[kind] += seconds; target.total += seconds; }
      types.get(type.id).total += seconds;
    }
    const workdays = dates(range).filter(date => ![0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay()));
    const target = workdays.length * 28800;
    // Credit at most the daily target. Extra regular hours on one day cannot hide a missed day.
    const credited = workdays.reduce((sum, day) => sum + Math.min(28800, byDay.get(day)?.regular || 0), 0);
    const deficits = workdays.filter(day => day <= today).map(date => ({ date, seconds: Math.max(0, 28800 - (byDay.get(date)?.regular || 0)), unknown: byDay.get(date)?.unknown || 0 })).filter(day => day.seconds > 0);
    const sort = rows => [...rows.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    return { ...totals, target, credited, remaining: Math.max(0, target - credited), percent: target ? Math.min(100, credited / target * 100) : 0,
      items: selected, projects: sort(projects), types: sort(types), deficits,
      availableProjects: [...new Set(all.map(item => item.project || item.key.split('-')[0]))].sort() };
  }
  return { classification, typeOf, uniqueItems, aggregate, chunks, dates };
});
