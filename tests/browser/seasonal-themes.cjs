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
    for (const viewport of [{width: 1440, height: 900}, {width: 1024, height: 900}, {width: 900, height: 900}, {width: 390, height: 844}]) {
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
      assert.equal(await page.locator('#seasonalPreview').count(), 1);
      // Exercise actual dashboard preview, both palettes, sprite assets and reserved text space.
      for (const theme of require('../../lib/seasonal-calendar').ids) {
        await page.locator('#seasonalTheme').selectOption(theme);
        await page.locator('#seasonalShowPreviewBtn').click();
        await page.waitForFunction(() => QuickJiraSeasonalThemes.previewing);
        await page.evaluate(() => {
          state.filterLoaded = true;
          state.filterIssues = [0,1].map(index => ({key: 'UI-' + (index+1), project: 'UI',
            summary: 'Tên công việc dài để kiểm tra họa tiết không che nội dung '.repeat(5), status: 'To Do'}));
          renderFilterIssues();
        });
        let teacherGeometry;
        for (const mode of ['light', 'dark']) {
          const metrics = await page.evaluate(async ({theme, mode}) => {
            applyTheme(mode);
            await new Promise(resolve => requestAnimationFrame(resolve));
            const image = new Image(); image.src = QuickJiraSeasonalCollection.has(theme) ? '/seasonal-collection/' + theme + '.webp' : '/seasonal-ornaments/' + theme + '.png';
            await image.decode();
            const rect = el => el.getBoundingClientRect();
            const scene = rect(document.getElementById('seasonalHomeScene'));
            const actions = rect(document.querySelector('.brand-actions'));
            const contentFits = [...document.querySelectorAll('#filterCard .issue-row')].every(row => {
              const style = getComputedStyle(row, '::after');
              const box = rect(row), main = rect(row.querySelector('.issue-main'));
              const left = box.right - parseFloat(style.right) - parseFloat(style.width);
              return main.right <= left + 1 && style.pointerEvents === 'none';
            });
            const first = document.querySelector('.hours-card');
            let matchingArtwork = true;
            if (theme === 'teachers') {
              const lightArt = document.querySelector('#seasonalHomeScene .seasonal-photo-light');
              const darkArt = document.querySelector('#seasonalHomeScene .seasonal-photo-dark');
              await lightArt.decode();
              matchingArtwork = lightArt.naturalWidth > 0
                && (getComputedStyle(lightArt).display !== 'none') === (mode === 'light')
                && (getComputedStyle(darkArt).display !== 'none') === (mode === 'dark');
            }
            const boxValues = box => [box.x, box.y, box.width, box.height];
            const visibleArt = document.querySelector('#seasonalHomeScene ' + (mode === 'light' ? '.seasonal-photo-light' : '.seasonal-photo-dark'));
            const geometry = theme === 'teachers'
              ? [...boxValues(scene), ...boxValues(actions), ...boxValues(rect(visibleArt))] : [];
            return {geometry, matchingArtwork, contentFits, sprite: getComputedStyle(first, '::after').backgroundImage,
              alpha: getComputedStyle(first, '::after').opacity,
              headerSeparated: actions.right <= scene.left + 1,
              mobileSeparated: ['.logo-refresh-btn', '.brand-copy', '.brand-actions'].every(selector => rect(document.querySelector('.brand ' + selector)).top >= scene.bottom - 1),
              horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
              sceneRadius: getComputedStyle(document.getElementById('seasonalHomeScene')).borderRadius};
          }, {theme, mode});
          assert.match(metrics.sprite, new RegExp((require('../../lib/seasonal-calendar').ids.indexOf(theme)>=10 ? '/seasonal-collection/' : '/seasonal-ornaments/') + theme + '\\.(png|webp)'));
          assert(Number(metrics.alpha) > 0);
          assert(metrics.matchingArtwork, theme + " artwork must follow the selected mode");
          if (theme === 'teachers') {
            if (teacherGeometry) metrics.geometry.forEach((value, index) =>
              assert(Math.abs(value - teacherGeometry[index]) <= 1, 'Theme mode must not change artwork/menu geometry'));
            teacherGeometry = metrics.geometry;
          }
          assert(metrics.contentFits, theme + ' task text must remain outside decoration');
          assert(!metrics.horizontalOverflow, theme + ' horizontal overflow at ' + viewport.width);
          assert.equal(metrics.sceneRadius, '0px');
          if (viewport.width >= 900) assert(metrics.headerSeparated, theme + ' menu must not overlap artwork');
          else assert(metrics.mobileSeparated, theme + ' mobile controls must be below artwork');
        }
        await page.keyboard.press('Escape');
        assert(await page.locator('#seasonalDialog').isVisible());
      }
      await page.evaluate(() => applyTheme('light'));
      await page.locator('#seasonalTheme').selectOption('tet');
      await page.waitForFunction(() => document.querySelector('#seasonalPreviewScene img')?.naturalWidth > 0);
      assert((await page.locator('#seasonalPreview').boundingBox()).height >= 180);
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
      if (viewport.width < 900) {
        // A real non-holiday date must remove the hero row, not merely hide the image.
        await page.clock.setFixedTime(new Date('2026-11-22T05:00:00Z'));
        await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
        await page.waitForFunction(() => !document.documentElement.hasAttribute('data-seasonal'));
        const plain = await page.evaluate(() => {
          const brand = document.querySelector('.brand'), scene = document.getElementById('seasonalHomeScene');
          return {display: getComputedStyle(brand).display, height: brand.getBoundingClientRect().height,
            sceneHeight: scene.getBoundingClientRect().height, sceneDisplay: getComputedStyle(scene).display};
        });
        assert.equal(plain.display, 'flex');
        assert.equal(plain.sceneDisplay, 'none');
        assert.equal(plain.sceneHeight, 0);
        assert(plain.height < 100, 'Non-themed header must not reserve hero whitespace');
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
start().then(() => console.log('Ten themed card sprites, PC header separation, long task text, both palettes, preview ESC and draft preservation passed.'))
  .catch(error => { console.error(error); server.close(); process.exitCode = 1; });
