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
  const browser = await chromium.launch({ headless: true, executablePath: process.env.QJL_CHROMIUM_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    for (const viewport of [{width: 390, height: 844}, {width: 1440, height: 900}, {width: 320, height: 640}, {width: 844, height: 390}]) {
      const context = await browser.newContext({ viewport, isMobile: viewport.width <= 390, hasTouch: viewport.width <= 390 });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      user = { username: 'boss-a', displayName: 'Boss A' };
      await page.clock.setFixedTime(new Date('2026-12-19T17:00:20Z'));
      await page.goto(url);
      await page.waitForFunction(() => document.documentElement.dataset.seasonal === 'christmas' && !document.body.classList.contains('booting'));
      await page.evaluate(() => applyTheme('dark'));
      await open(page);
      assert.equal(await page.locator('#seasonalTheme').inputValue(), 'christmas');
      assert.equal(await page.locator('#seasonalAccount').textContent(), 'Boss A');
      await page.waitForFunction(() => document.querySelector('#seasonalPreviewScene img')?.naturalWidth > 0);
      assert((await page.locator('#seasonalPreview').boundingBox()).height >= 156, 'Preview must not shrink');
      assert.equal(await page.locator('#seasonalScheduleType option').count(), 2);
      assert(await page.locator('#seasonalRepeatRow').isHidden());
      assert(await page.locator('#seasonalDialog').evaluate(dialog => {
        const box = dialog.getBoundingClientRect();
        const scroll = dialog.querySelector('.seasonal-settings-scroll');
        return dialog.scrollWidth <= dialog.clientWidth + 1 && box.top >= 0 && box.bottom <= innerHeight + 1
          && scroll.scrollHeight > scroll.clientHeight;
      }), 'Settings can scroll with footer visible');
      if (process.env.QJL_QA_DIR && viewport.width === 390) await page.screenshot({path: path.join(process.env.QJL_QA_DIR, 'seasonal-settings.png')});

      if (viewport.width !== 390) {
        await page.keyboard.press('Escape');
        await closeSettings(page);
        assert.deepEqual(errors, []);
        await context.close();
        continue;
      }
      await page.locator('#seasonalTheme').selectOption('birthday');
      await page.locator('#seasonalScheduleType').selectOption('specific');
      await page.locator('#seasonalRepeat').check();
      await page.getByRole('button', {name: 'Lưu cài đặt'}).click();
      assert(await page.locator('#seasonalError').isVisible());
      await page.locator('#seasonalAnnualStart').fill('20/12');
      await page.locator('#seasonalAnnualEnd').fill('20/12');
      await save(page);
      assert.equal(await page.locator('html').getAttribute('data-seasonal'), 'birthday');
      const motion = page.locator('#seasonalHomeScene .seasonal-surface');
      await motion.evaluate(canvas => canvas.scrollIntoView());
      await page.waitForFunction(() => document.querySelector('#seasonalHomeScene canvas')?.classList.contains('is-ready'));
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => !document.documentElement.hasAttribute('data-seasonal-motion'));
      assert.equal(await motion.evaluate(e => getComputedStyle(e).visibility), 'hidden');
      await page.emulateMedia({ reducedMotion: 'no-preference' });

      await page.reload();
      await page.waitForFunction(() => document.documentElement.dataset.seasonal === 'birthday');
      user = { username: 'boss-b', displayName: 'Boss B' };
      await page.reload();
      await page.waitForFunction(() => document.documentElement.dataset.seasonal === 'christmas');
      await open(page);
      await page.locator('#seasonalTheme').selectOption('birthday');
      assert.equal(await page.locator('#seasonalScheduleType').inputValue(), 'default');
      await page.locator('#seasonalCancel').click();
      await closeSettings(page);
      user = { username: 'boss-a', displayName: 'Boss A' };
      await page.reload();
      await page.waitForFunction(() => document.documentElement.dataset.seasonal === 'birthday');
      await page.clock.setFixedTime(new Date('2026-12-20T17:00:01Z'));
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await page.waitForFunction(() => document.documentElement.dataset.seasonal === 'christmas');

      await open(page);
      assert.equal(await page.locator('[name=seasonalMode]').count(), 0);
      const result = [];
      for (const id of await page.evaluate(() => QuickJiraSeasonal.ids)) {
        await page.locator('#seasonalTheme').selectOption(id);
        await page.waitForFunction(theme => document.querySelector('#seasonalPreviewScene img')?.src.endsWith('/' + theme + '.webp') && document.querySelector('#seasonalPreviewScene img').naturalWidth > 0, id);
        for (const effect of ['0', '1']) {
          await page.locator('#seasonalEffect').selectOption(effect);
          if (['vacation', 'april', 'birthday', 'moon', 'halloween'].includes(id)) {
            const canvas = page.locator('#seasonalPreviewScene canvas');
            await canvas.evaluate(el => el.scrollIntoView({block: 'center'}));
            await page.waitForFunction(() => document.querySelector('#seasonalPreviewScene canvas')?.classList.contains('is-ready'));
            if (id === 'april') {
              const first = await canvas.screenshot();
              const second = await canvas.screenshot();
              assert.notDeepEqual(first, second);
            }
          } else {
            assert.equal(await page.locator('#seasonalPreviewScene .seasonal-scene-layer i').first().evaluate(e => getComputedStyle(e).animationPlayState), 'running');
          }
        }
        result.push(id);
      }
      assert.equal(result.length, 10);
      await page.locator('#seasonalMotion').uncheck();
      await save(page);
      assert.equal(await page.locator('html').getAttribute('data-seasonal'), 'christmas');
      assert.equal(await page.locator('html').getAttribute('data-seasonal-motion'), null);
      await page.evaluate(() => applyTheme('light'));
      assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'), '#eef6ff');
      await page.evaluate(() => applyTheme('dark'));
      assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'), '#091a36');
      if (process.env.QJL_QA_DIR) await page.screenshot({path: path.join(process.env.QJL_QA_DIR, 'seasonal-christmas.png')});

      user = null;
      await page.reload();
      await page.waitForFunction(() => !document.body.classList.contains('booting') && !document.getElementById('loginCard').classList.contains('hidden'));
      assert.equal(await page.locator('html').getAttribute('data-seasonal'), 'christmas');
      assert(await page.locator('#seasonalHomeScene .seasonal-snow').count());

      // An installed PWA can load the theme engine, visuals and style offline.
      await page.waitForFunction(() => !!navigator.serviceWorker.controller);
      await context.setOffline(true);
      for (const asset of ['/seasonal-themes.css', '/lib/seasonal-calendar.js', '/seasonal-shader.js', '/seasonal-scenes.js', '/seasonal-themes.js', '/seasonal-art/christmas.webp']) {
        assert(await page.evaluate(async pathname => (await fetch(pathname)).ok, asset));
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

start().then(() => console.log('Seasonal UI: all 10 scenes / 20 effects, account isolation, schedule, reduced motion, two palettes, 4 viewports and PWA cache passed.'))
  .catch(error => { console.error(error); server.close(); process.exitCode = 1; });
