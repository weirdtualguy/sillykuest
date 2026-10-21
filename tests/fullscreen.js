/* Full screen: fullscreen display mode in the manifest, the You-tab setting, a saved choice applied on the first tap,
   and the install suggestion not confusing a fullscreen browser tab with the installed app.
   Run from the app root: NODE_PATH=$(npm root -g) node tests/fullscreen.js */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const url = 'file://' + path.join(root, 'index.html');
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
let fails = 0, passes = 0;
function ok(c, m) { if (c) passes++; else { fails++; console.log('FAIL: ' + m); } }
(async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  ok(manifest.display === 'standalone', 'manifest display should be standalone so the installed app has no bar under the tab bar');
  const browser = await chromium.launch();
  const errs = [];
  async function open(init) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, userAgent: ANDROID });
    if (init) await ctx.addInitScript(init);
    const page = await ctx.newPage();
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(url); await page.waitForSelector('.welcome');
    await page.evaluate(() => { SK.state.set.sound = false; SK.save(); document.querySelector('.welcome .btn.alt').click(); });
    await page.waitForSelector('.world');
    return { ctx, page };
  }
  const goYou = async page => { await page.evaluate(() => { location.hash = '#/you'; }); await page.waitForSelector('.row-set'); };
  const fsRow = page => page.$('label.sw:has-text("Full screen")');

  /* 1. browser tab: the switch enters fullscreen, saves the choice, and turning it off leaves fullscreen */
  { const { ctx, page } = await open();
    await goYou(page);
    ok(!!(await fsRow(page)), 'Full screen switch shows in a browser tab');
    await page.click('label.sw:has-text("Full screen")');
    await page.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 3000 }).catch(() => {});
    ok(await page.evaluate(() => !!document.fullscreenElement), 'switching on enters fullscreen');
    ok(await page.evaluate(() => SK.state.set.fullscreen === true), 'the choice is saved');
    await page.click('label.sw:has-text("Full screen")');
    await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 3000 }).catch(() => {});
    ok(await page.evaluate(() => !document.fullscreenElement && SK.state.set.fullscreen === false), 'switching off leaves fullscreen and clears the choice');
    await ctx.close(); }

  /* 2. a saved choice is applied on the first tap of the next visit, not before (browsers need a tap) */
  { const { ctx, page } = await open();
    await page.evaluate(() => { SK.state.set.fullscreen = true; SK.save(); });
    await page.reload(); await page.waitForSelector('.world');
    ok(await page.evaluate(() => !document.fullscreenElement), 'no fullscreen before the first tap');
    await page.click('.nav a, .nav button >> nth=1');
    await page.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 3000 }).catch(() => {});
    ok(await page.evaluate(() => !!document.fullscreenElement), 'the first tap applies the saved choice');
    await ctx.close(); }

  /* 3. the installed app already opens fullscreen: no switch, no install suggestion */
  { const { ctx, page } = await open(() => {
      const mm = window.matchMedia.bind(window);
      window.matchMedia = q => /display-mode:\s*fullscreen/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q);
    });
    ok(await page.evaluate(() => SK.isInstalled() === true), 'fullscreen display mode counts as installed');
    await goYou(page);
    ok(!(await fsRow(page)), 'no Full screen switch inside the fullscreen installed app'); await ctx.close(); }

  /* 4. a browser tab in fullscreen through the API is not the installed app */
  { const { ctx, page } = await open(() => {
      const mm = window.matchMedia.bind(window);
      window.matchMedia = q => /display-mode:\s*fullscreen/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q);
      Object.defineProperty(document, 'fullscreenElement', { get: () => document.body, configurable: true });
    });
    ok(await page.evaluate(() => SK.isInstalled() === false), 'API fullscreen in a tab is not the installed app');
    await goYou(page);
    ok(!!(await fsRow(page)), 'the switch stays available so fullscreen can be turned off'); await ctx.close(); }

  /* 5. no Fullscreen API (iPhone): the switch is hidden */
  { const { ctx, page } = await open(() => { Object.defineProperty(document, 'fullscreenEnabled', { get: () => false, configurable: true }); });
    await goYou(page);
    ok(!(await fsRow(page)), 'no Full screen switch where the browser cannot do it');
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'no horizontal overflow'); await ctx.close(); }

  ok(errs.length === 0, 'JavaScript errors: ' + errs.slice(0, 2).join(' | '));
  await browser.close();
  console.log('fullscreen checks passed: ' + passes + ' | failed: ' + fails);
  process.exit(fails ? 1 : 0);
})();
