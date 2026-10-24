'use strict';

const { sendJson, methodNotAllowed } = require('../lib/http');
const { getSession, clearSessionCookie } = require('../lib/session');
const { JiraError, getMyself } = require('../lib/jira');
const { displaySegments, availableSlots, minutesInsideWindows, workWindowsFor } = require('../lib/scheduler');
const { loadOccupiedRangesStable } = require('../lib/worklog-guard');
const { dayAuditKey, cacheGet, cacheSet } = require('../lib/app-cache');
const { createPerf } = require('../lib/perf');
const { validDate } = require('../lib/ui-tools');
const { mapWithConcurrency } = require('../lib/async');
const { createProgressChannel } = require('../lib/progress');

const DAY_AUDIT_CACHE_MS = 15 * 1000;

function totalLoggedMinutes(ranges) {
  return (ranges || []).reduce((sum, r) => sum + Math.max(0, Number(r.end || 0) - Number(r.start || 0)), 0);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const session = getSession(req);
  if (!session) return sendJson(res, 401, { ok: false, error: 'Vui lòng đăng nhập Jira.' });

  const perf = createPerf();
  try {
    const url = new URL(req.url, 'http://localhost');
    if(url.searchParams.has('dates')){
      const dates=url.searchParams.get('dates').split(',');
      if(!dates.length||dates.length>7||new Set(dates).size!==dates.length||dates.some(d=>!validDate(d)))return sendJson(res,400,{ok:false,error:'Khoảng đối chiếu không hợp lệ (tối đa 7 ngày).'});
      const report=createProgressChannel(req,res),fractions=new Map(dates.map(d=>[d,0]));
      res.qjlCompletePhase='Đã đối chiếu giờ trống';
      const update=(date,value)=>{fractions.set(date,Math.max(fractions.get(date),value));report(5+90*[...fractions.values()].reduce((s,n)=>s+n,0)/dates.length,'Đang đối chiếu giờ trống');};
      const me=session.me||await getMyself(session),sharedReads=new Map();
      // Request-scoped snapshot only. Never reused for a later save or another account.
      const days=await mapWithConcurrency(dates,3,async date=>{
        const guard=await loadOccupiedRangesStable(date,[],me,session,{sharedReads,onProgress:value=>update(date,value)});
        update(date,1);
        return {date,occupied:displaySegments(guard.occupied.map(r=>({...r,minutes:r.end-r.start}))),checkedIssues:guard.issueKeys.length,checkedWorklogs:guard.checkedWorklogs};
      });
      return sendJson(res,200,{ok:true,days});
    }
    const date = String(url.searchParams.get('date') || '').trim();
    const key = String(url.searchParams.get('key') || '').trim().toUpperCase();
    const force = url.searchParams.get('force') === '1';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return sendJson(res, 400, { ok: false, error: 'Ngày planner không hợp lệ.' });

    const cacheKey = dayAuditKey(session, date, key);
    if (!force) {
      const cached = await perf.step('cacheRead', () => cacheGet(cacheKey));
      if (cached.hit) {
        const performance = perf.snapshot({ cacheHit: 1 });
        res.setHeader('Server-Timing', perf.serverTimingHeader({ cacheHit: 1 }));
        return sendJson(res, 200, { ...cached.value, cache: { hit: true, source: cached.source }, performance });
      }
    }

    const me = session.me || await perf.step('myself', () => getMyself(session));
    const guard = await perf.step('jiraAudit', () => loadOccupiedRangesStable(date, key ? [key] : [], me, session));
    const occupiedRaw = guard.occupied.map(r => ({ ...r, minutes: r.end - r.start }));
    const freeRaw = availableSlots(guard.occupied).map(r => ({ ...r, minutes: r.end - r.start }));
    const occupiedMinutes = totalLoggedMinutes(guard.occupied);
    const regularOccupiedMinutes = minutesInsideWindows(guard.occupied, workWindowsFor(date, false));
    const freeMinutes = freeRaw.reduce((sum, r) => sum + r.minutes, 0);

    const payload = {
      ok: true,
      date,
      checkedIssues: guard.issueKeys.length,
      checkedWorklogs: guard.checkedWorklogs,
      occupiedMinutes,
      regularOccupiedMinutes,
      freeMinutes,
      occupied: displaySegments(occupiedRaw),
      available: displaySegments(freeRaw),
      sources: guard.sources
    };
    await perf.step('cacheWrite', () => cacheSet(cacheKey, payload, DAY_AUDIT_CACHE_MS));
    const performance = perf.snapshot({ cacheHit: 0 });
    res.setHeader('Server-Timing', perf.serverTimingHeader({ cacheHit: 0 }));
    return sendJson(res, 200, { ...payload, cache: { hit: false }, performance });
  } catch (error) {
    if (error instanceof JiraError) {
      if (error.status === 401 && !res.headersSent) res.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(res, error.status || 500, { ok: false, error: error.message, details: error.details || undefined });
    }
    return sendJson(res, 500, { ok: false, error: 'Không kiểm tra được worklog trong ngày.' });
  }
};
