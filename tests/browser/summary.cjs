const assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { server } = require('./serve.cjs');
(async () => {
  await new Promise(r => server.listen(4193, '127.0.0.1', r));
  const browser = await chromium.launch({ ...(process.env.QJL_CHROMIUM_PATH ? { executablePath: process.env.QJL_CHROMIUM_PATH } : {}), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 1024, height: 700 }, { width: 390, height: 844 }, { width: 320, height: 683 }, { width: 844, height: 390 }]) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block', timezoneId: 'Asia/Ho_Chi_Minh' });
    const page = await context.newPage(), errors = [], calls = [];
    let failed = false, partial = false, slow = false, fieldDenied = false, patchCount = 0;
    let logs = [];
    const make = (id, date, minutes, extra = {}) => ({ id: String(id), key: `EPU01-${id}`, project: 'EPU01', summary: 'Hỗ trợ vận hành và trao đổi yêu cầu nghiệp vụ với nhà trường', description: 'Mô tả worklog', date, start: '08:00', end: '09:00', minutes, timeSpentSeconds: minutes * 60, issueType: 'Sub-task', issueTypeId: '5', subtaskTypeKnown: true, subtaskType: 'Supporting', subtaskTypeId: '101', subtaskTypeFieldId: 'customfield_12345', isSubtask: true, overtimeKnown: true, overtime: false, ...extra });
    for (let i = 0; i < 5; i++) logs.push(make(i + 1, `2026-10-${12 + i}`, 480));
    logs.push(make(6, '2026-10-16', 120, { overtime: true, start: '17:30', end: '19:30', subtaskType: 'Testing', subtaskTypeId: '102', project: 'INTRACOM01' }));
    logs.push(make(7, '2026-09-01', 90, { subtaskType: 'Developing', subtaskTypeId: '103' }));
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { const D = Date; window.Date = class extends D { constructor(...args) { super(...args.length ? args : ['2026-10-16T13:00:00Z']); } static now() { return D.parse('2026-10-16T13:00:00Z'); } }; });
    await page.route('**/api?*', async route => {
      const u = new URL(route.request().url()), action = u.searchParams.get('action'); calls.push(u.toString());
      let data = { ok: true }, status = 200;
      if (action === 'status') data = { ok: true, authenticated: true, user: { displayName: 'Boss', username: 'boss' } };
      if (action === 'subtasks') data = { ok: true, issues: [] };
      if (action === 'day-audit') data = { ok: true, regularOccupiedMinutes: 0, occupiedMinutes: 0, freeMinutes: 480, occupied: [], available: [] };
      if (action === 'worklog-history') {
        if (slow) await new Promise(r => setTimeout(r, 150));
        if (failed) { status = 502; data = { ok: false, error: 'Jira tạm thời không phản hồi.' }; }
        else data = { ok: true, items: logs.filter(x => x.date >= u.searchParams.get('date') && x.date <= (u.searchParams.get('endDate') || u.searchParams.get('date'))), skipped: partial ? [{ key: 'MISSING-1' }] : [] };
        if (fieldDenied && data.items) { data.items = data.items.map(x=>({...x,subtaskTypeKnown:false,subtaskType:'',subtaskTypeId:''})); data.sourceDetails={subtaskTypeField:{ok:false,message:'Chưa đọc được trường Sub-task Type trên Jira.'},subtaskTypeUnavailable:data.items.length}; }
      }
      if (action === 'worklog-correction') {
        const payload = route.request().postDataJSON();
        if (route.request().method() === 'PATCH') {
          const found = logs.find(x => x.id === payload.worklogId);
          found.minutes = 60; found.timeSpentSeconds = 3600; found.date = payload.date; found.description = payload.description; found.overtime = payload.overtime; patchCount++;
          data = { ok: true, worklogVerified: true, overtimeVerified: true };
        } else logs = logs.filter(x => x.id !== payload.worklogId);
      }
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    });
    await page.goto('http://127.0.0.1:4193');
    await page.waitForFunction(() => !document.body.classList.contains('booting'));
    await page.locator(viewport.width >= 900 ? '#plannerBtn' : '#mobilePlannerBtn').click();
    await page.waitForFunction(() => state.summary.loaded && !state.summary.loading);
    assert.equal(await page.locator('#summaryRegular').textContent(), '40h'); assert.equal(await page.locator('#summaryOvertime').textContent(), '2h'); assert.equal(await page.locator('#summaryTotal').textContent(), '42h');
    assert.equal(await page.locator('#summaryTypes .summary-chart-row').count(), 2);
    assert.equal(await page.locator('#runAuditBtn').count(), 0);
    assert((await page.locator('#summaryTypes').textContent()).includes('Supporting'));
    assert((await page.locator('#summaryTypes').textContent()).includes('Testing'));
    assert(!(await page.locator('#summaryTypes').textContent()).includes('Sub-task'));
    assert((await page.locator('#summaryTypes').textContent()).includes('95,2%')); 
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => applyTheme(t), theme);
      await page.waitForTimeout(250);
      const fit = await page.locator('.summary-sheet').evaluate(sheet => {
        const box = sheet.getBoundingClientRect();
        const controls = [...sheet.querySelectorAll('button,input,select')].filter(x => x.getClientRects().length);
        return { overflow: sheet.scrollWidth > sheet.clientWidth + 1, bad: controls.filter(x => { const r = x.getBoundingClientRect(); return r.left < box.left - 1 || r.right > box.right + 1; }).map(x => x.id) };
      });
      assert.equal(fit.overflow, false, JSON.stringify({ viewport, fit })); assert.deepEqual(fit.bad, [], JSON.stringify({ viewport, fit }));
      if (process.env.QJL_QA_OUTPUT) { fs.mkdirSync(process.env.QJL_QA_OUTPUT, { recursive: true }); await page.screenshot({ path: path.join(process.env.QJL_QA_OUTPUT, `summary-${viewport.width}-${theme}.png`) }); }
    }
    await page.locator('#summaryTypes [data-summary-type="1"]').click();
    assert.equal(await page.locator('#summaryDetailList .summary-worklog').count(), 1);
    await page.locator('#summaryDetailList .summary-worklog').click();
    assert(await page.locator('#worklogCorrectionDialog').evaluate(x => x.open));
    assert.equal(await page.evaluate(() => ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)), false);
    assert(await page.locator('#plannerOverlay').evaluate(x => x.inert));
    await page.locator('#correctionTimeSpent').fill('1h');
    await page.locator('#saveCorrectionBtn').click();
    await page.waitForFunction(() => !document.getElementById('worklogCorrectionDialog').open && state.summary.loaded && !state.summary.loading);
    assert.equal(patchCount, 1); assert.equal(await page.locator('#summaryTotal').textContent(), '41h'); assert.equal(await page.locator('#summaryOvertime').textContent(), '1h');
    assert.equal(await page.locator('#plannerOverlay').evaluate(x => x.inert), false);
    await page.locator('#summaryProject').selectOption('INTRACOM01');
    assert.equal(await page.locator('#summaryTotal').textContent(), '1h'); assert((await page.locator('#summaryGoalText').textContent()).includes('40h / 40h'));
    await page.locator('#summaryProject').selectOption('');
    fieldDenied = true;
    await page.locator('#summaryRefreshBtn').click(); await page.waitForFunction(() => state.summary.loaded && !state.summary.loading);
    assert.equal(await page.locator('#summaryTotal').textContent(), '41h');
    assert((await page.locator('#summaryTypeNotice').textContent()).includes('Chưa đọc được'));
    assert.equal(await page.locator('#summaryTypes .summary-chart-row').count(), 1);
    assert((await page.locator('#summaryTypes').textContent()).includes('Chưa xác định'));
    assert(!(await page.locator('#summaryTypes .summary-row-title').textContent()).includes('Sub-task'));
    fieldDenied = false;
    const savedType = {...logs[0]}; logs[0].subtaskType = ''; logs[0].subtaskTypeId = '';
    await page.locator('#summaryRefreshBtn').click(); await page.waitForFunction(() => state.summary.loaded && !state.summary.loading);
    assert((await page.locator('#summaryTypes').textContent()).includes('Chưa phân loại'));
    logs[0] = savedType;
    // Unknown OT is explicit and cannot become normal time.
    logs[0].overtimeKnown = false;
    await page.locator('#summaryRefreshBtn').click(); await page.waitForFunction(() => !state.summary.loading);
    assert(await page.locator('#summaryUnknown').isVisible()); assert.equal(await page.locator('#summaryRegular').textContent(), '≥ 32h');
    logs[0].overtimeKnown = true;
    failed = true; await page.locator('#summaryRefreshBtn').click(); await page.waitForFunction(() => !!state.summary.error && !state.summary.loading);
    assert.equal(await page.locator('#summaryContent').isVisible(), false);
    failed = false; partial = true; await page.locator('#summaryRefreshBtn').click(); await page.waitForFunction(() => state.summary.loaded && !state.summary.loading);
    assert((await page.locator('#summaryState').textContent()).includes('tạm tính'));
    partial = false;
    await page.locator('#summaryMonthBtn').click(); await page.waitForFunction(() => state.summary.loaded && !state.summary.loading);
    const segments = calls.filter(x => x.includes('scope=summary')).map(x => new URL(x));
    assert(segments.some(x => x.searchParams.get('date') === '2026-10-31'), 'last day of 31-day month requested');
    await page.locator('#summaryPrevBtn').click(); await page.waitForFunction(() => state.summary.loaded && !state.summary.loading);
    assert.equal(await page.locator('#summaryTotal').textContent(), '1h 30m');
    await page.locator('#summaryNextBtn').click(); await page.waitForFunction(() => !state.summary.loading);
    await page.locator('#summaryWeekBtn').click(); await page.waitForFunction(() => !state.summary.loading);
    // Fast navigation must not render an older request over the current period.
    slow = true;
    await page.locator('#summaryPrevBtn').click(); await page.locator('#summaryNextBtn').click();
    await page.waitForFunction(() => state.summary.loaded && !state.summary.loading);
    assert.equal(await page.locator('#summaryTotal').textContent(), '41h');
    slow = false;
    await page.locator('#summaryTypes [data-summary-type="1"]').click();
    await page.locator('#summaryDetailList .summary-worklog').click();
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#deleteCorrectionBtn').click();
    await page.waitForFunction(() => !document.getElementById('worklogCorrectionDialog').open && state.summary.loaded && !state.summary.loading);
    assert.equal(await page.locator('#summaryTotal').textContent(), '40h');
    assert.equal(await page.locator('#summaryTypes .summary-chart-row').count(), 1);
    assert.deepEqual(errors, []);
    await context.close(); console.log('Summary PC/mobile: layout/themes, native correction, mutation refresh, filters, unknown/error/partial, month boundaries and race passed', viewport);
  }
  await browser.close(); await new Promise(r => server.close(r));
})().catch(error => { console.error(error); server.close(); process.exit(1); });
