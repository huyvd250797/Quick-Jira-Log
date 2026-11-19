'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../..');
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4',
  '.webmanifest': 'application/manifest+json' };
const csp = require('../../vercel.json').headers[0].headers.find(header => header.key === 'Content-Security-Policy').value;
let user = { username: 'boss-a', displayName: 'Boss A' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api') {
    res.setHeader('Content-Type', 'application/json');
    const action = url.searchParams.get('action');
    return res.end(JSON.stringify({
      ok: true, authenticated: !!user, user,
      ...(action === 'subtasks' ? { issues: [] } : { items: [], skipped: [] })
    }));
  }
  const filename = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
  if (!filename.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(filename, (err, bytes) => {
    res.writeHead(err ? 404 : 200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream',
      'Content-Security-Policy': csp, 'Cache-Control': 'no-store' });
    res.end(err ? 'Missing' : bytes);
  });
});

async function open(page) {
  await page.locator('#settingsBtn').click();
  await page.locator('#seasonalOpenBtn').click();
  assert(await page.locator('#seasonalDialog').isVisible());
}

async function closeSettings(page) {
  await page.locator('#closeSettingsBtn').click();
  await page.waitForFunction(() => !document.body.classList.contains('settings-open'));
}

async function save(page) {
  await page.getByRole('button', {name: 'Lưu cài đặt'}).click();
  await page.waitForFunction(() => !document.getElementById('seasonalDialog').open);
  await closeSettings(page);
}

async function start() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless: true, executablePath: process.env.QJL_CHROMIUM_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage']});
  try {
    for (const viewport of [{width: 1440, height: 900}, {width: 390, height: 844}]) {
      const context = await browser.newContext({viewport, serviceWorkers: 'block'});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.clock.setFixedTime(new Date('2026-12-19T17:00:20Z'));
      await page.goto(url);
      await page.waitForFunction(() => document.documentElement.dataset.seasonal === 'christmas'
        && !document.body.classList.contains('booting'));
      await page.evaluate(() => applyTheme('light'));
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
      assert.equal(await page.locator('#themeBtn').isEnabled(), true);
      await page.locator('#themeBtn').click();
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      await page.locator('#themeBtn').click();
      await open(page);
      assert.equal(await page.locator('#seasonalPreview').count(), 0);
      await page.locator('#seasonalTheme').selectOption('tet');
      const snapshot = await page.evaluate(() => localStorage.getItem(QuickJiraSeasonal.accountKey(state.user)));
      await page.locator('#seasonalShowPreviewBtn').click();
      await page.waitForFunction(() => QuickJiraSeasonalThemes.previewing);
      assert.equal(await page.locator('html').getAttribute('data-seasonal'), 'tet');
      assert(await page.locator('#dashboardCard').isVisible());
      assert(await page.locator('#settingsOverlay').isHidden());
      assert(await page.locator('.shell').evaluate(el => el.inert));
      assert.equal(await page.evaluate(() => localStorage.getItem(QuickJiraSeasonal.accountKey(state.user))), snapshot);
      await page.keyboard.press('Escape');
      assert(await page.locator('#seasonalDialog').isVisible());
      assert.equal(await page.locator('#seasonalTheme').inputValue(), 'tet');
      assert.equal(await page.locator('html').getAttribute('data-seasonal'), 'christmas');
      await page.locator('#seasonalShowPreviewBtn').click();
      await page.locator('#seasonalStopPreviewBtn').click();
      assert(await page.locator('#seasonalDialog').isVisible());
      assert.equal(await page.evaluate(() => localStorage.getItem(QuickJiraSeasonal.accountKey(state.user))), snapshot);
      await page.locator('#seasonalCancel').click();
      await closeSettings(page);
      assert.deepEqual(errors, []);
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
start().then(() => console.log('Live dashboard preview enter, ESC, exit button, draft preservation and theme switch passed.'))
  .catch(error => { console.error(error); server.close(); process.exitCode = 1; });
