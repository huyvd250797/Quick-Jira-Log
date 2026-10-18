'use strict';
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
let previousWorker = true;
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/api') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, authenticated: false })); return;
  }
  if (u.pathname === '/sw.js' && previousWorker) {
    res.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' });
    res.end("self.addEventListener('install',e=>e.waitUntil(caches.open('quick-jira-log-v1.15.1-shell').then(c=>c.put('/old-brand-marker',new Response('old')))));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));"); return;
  }
  const p = path.join(root, u.pathname === '/' ? 'index.html' : u.pathname);
  if (!p.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  const type = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }[path.extname(p)] || 'application/octet-stream';
  fs.readFile(p, (e, data) => { res.writeHead(e ? 404 : 200, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(e ? 'Not found' : data); });
});
(async () => {
  await new Promise(r => server.listen(4212, 'localhost', r));
  const browser = await chromium.launch({ ...(process.env.QJL_CHROMIUM_PATH ? { executablePath: process.env.QJL_CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 315, height: 683 }, { width: 844, height: 390 }]) {
      const context = await browser.newContext({ viewport, isMobile: viewport.width < 900, hasTouch: viewport.width < 900, serviceWorkers: 'block' });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://localhost:4212/?private=do-not-copy#draft');
      await page.waitForFunction(() => !document.body.classList.contains('booting'));
      await page.evaluate(() => localStorage.setItem('branding-user-data', 'retain-settings'));
      for (const theme of ['light', 'dark']) {
        await page.evaluate(t => applyTheme(t), theme);
        await page.locator('#appIconHelpBtn').click();
        await page.waitForTimeout(200);
        assert(await page.locator('#appIconDialog').isVisible());
        const fit = await page.locator('#appIconDialog').evaluate(d => { const r = d.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1 && d.scrollWidth <= d.clientWidth + 1; });
        assert(fit, 'Icon guidance must fit small screens and landscape');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'closeAppIconBtn');
        assert(await page.locator('#appIconDialog img').evaluate(i => i.complete && i.naturalWidth === 192));
        await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async t => { window.copiedIconUrl = t; } } }));
        await page.locator('#copyAppIconUrlBtn').click();
        assert.equal(await page.evaluate(() => window.copiedIconUrl), 'http://localhost:4212/');
        assert(await page.locator('#appIconStatus').textContent().then(t => t.includes('Đã sao chép')));
        await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw Error('denied'); } } }));
        await page.locator('#copyAppIconUrlBtn').click();
        assert.equal(await page.locator('#appIconUrl').inputValue(), 'http://localhost:4212/');
        assert(await page.locator('#appIconUrl').isVisible());
        if (process.env.QJL_QA_OUTPUT) { fs.mkdirSync(process.env.QJL_QA_OUTPUT, { recursive: true }); await page.screenshot({ path: path.join(process.env.QJL_QA_OUTPUT, `branding-${viewport.width}-${theme}.png`) }); }
        await page.locator('#closeAppIconBtn').click();
        await page.waitForFunction(() => !document.getElementById('appIconDialog').open);
      }
      await page.locator('#appIconHelpBtn').click(); await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.getElementById('appIconDialog').open);
      assert.equal(await page.evaluate(() => localStorage.getItem('branding-user-data')), 'retain-settings');
      assert.deepEqual(errors, []); await context.close();
      console.log('Branding + responsive icon help + copy fallback passed', viewport);
    }
    // Upgrade a controlled client without forcing activation, losing storage,
    // or confusing a web-shell update with the native Home Screen icon.
    const context = await browser.newContext(), page = await context.newPage();
    await page.goto('http://localhost:4212');
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.waitForFunction(() => !document.body.classList.contains('booting'));
    await page.evaluate(() => localStorage.setItem('branding-upgrade-data', 'preserve-me'));
    previousWorker = false;
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await page.waitForFunction(() => !document.getElementById('appUpdateBanner').classList.contains('hidden'));
    assert((await page.evaluate(() => caches.keys())).includes('quick-jira-log-v1.15.1-shell'));
    const nav = page.waitForEvent('load');
    await page.locator('#appUpdateBtn').click(); await nav;
    await page.waitForFunction(async () => (await caches.keys()).includes('quick-jira-log-v1.15.2-shell') && !(await caches.keys()).includes('quick-jira-log-v1.15.1-shell'));
    assert.equal(await page.evaluate(() => localStorage.getItem('branding-upgrade-data')), 'preserve-me');
    const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json());
    assert.equal(manifest.start_url, '/'); assert.equal(manifest.scope, '/');
    assert(manifest.icons.every(i => i.src.endsWith('-v1152.png')));
    await context.setOffline(true);
    assert(await page.evaluate(async () => { const r = await fetch('/icons/apple-touch-icon-v1152.png'); return r.ok && r.headers.get('content-type').includes('image/png') && (await r.blob()).size > 100; }));
    assert(await page.evaluate(async () => (await fetch('/branding.js')).text()).then(t => t.includes('appIconDialog')));
    await context.close(); console.log('Real service-worker upgrade: waiting/confirm/reload, cache migration, storage preservation and offline icons passed.');
  } finally { await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e); server.close(); process.exit(1); });
