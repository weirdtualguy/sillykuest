/* Install suggestion: Chrome prompt, iPhone, Android (prompt withheld), installed app, dismiss, and the lesson not restarting.
   Run from the app root: NODE_PATH=$(npm root -g) node tests/install.js */
const { chromium } = require('playwright');
const path = require('path');
const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
let fails = 0, passes = 0;
function ok(c, m) { if (c) passes++; else { fails++; console.log('FAIL: ' + m); } }
(async () => {
  const browser = await chromium.launch();
  const errs = [];
  async function open(opts, standalone, finished) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true }, opts));
    if (standalone) await ctx.addInitScript(() => {
      const mm = window.matchMedia.bind(window);
      window.matchMedia = q => /display-mode:\s*standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q);
    });
    const page = await ctx.newPage();
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(url);
    await page.waitForSelector('.welcome');
    await page.evaluate((fin) => {
      SK.state.set.sound = false; if (fin) SK.state.done['1-1'] = { stars: 3 }; SK.save();
      document.querySelector('.welcome .btn.alt').click();
    }, finished);
    await page.waitForSelector('.upnext, .tip, .world');
    await page.evaluate(() => { location.hash = '#/learn'; SK.route(); });
    return { ctx, page };
  }
  const offer = page => page.evaluate(() => {
    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), { prompt() { window.__prompted = (window.__prompted || 0) + 1; return Promise.resolve(); } }));
  });
  const card = page => page.$('.install');
  const txt = async page => (await page.textContent('.install p')) || '';

  /* 1. Android, nothing finished yet: no suggestion on a first visit */
  { const { ctx, page } = await open({ userAgent: ANDROID }, false, false);
    ok(!(await card(page)), 'no install card before the first finished lesson'); await ctx.close(); }

  /* 2. Android, Chrome withholds the prompt (already installed): tell them where to find it, then hide for good */
  { const { ctx, page } = await open({ userAgent: ANDROID }, false, true);
    await page.waitForSelector('.install');
    ok(/Already installed\?/.test(await txt(page)) && /three-dot menu/.test(await txt(page)), 'Android card says where the installed app is');
    ok((await page.$$('.install .btn')).length === 1 && /Got it/.test(await page.textContent('.install .btn')), 'Android card has only Got it');
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'card does not overflow at 360px');
    await page.click('.install .btn');
    ok(!(await card(page)) && await page.evaluate(() => SK.state.set.installNo === true), 'Got it hides the card and saves that');
    await page.reload(); await page.waitForSelector('.world');
    ok(!(await card(page)), 'the card stays hidden after a reload');
    await ctx.close(); }

  /* 3. Chrome offers the prompt: Install button calls it once */
  { const { ctx, page } = await open({ userAgent: ANDROID }, false, true);
    await offer(page); await page.waitForSelector('.install .btn >> text=Install');
    ok(/Install SillyKuest/.test(await txt(page)), 'prompt card offers to install');
    await page.click('.install .btn >> text=Install');
    ok((await page.evaluate(() => window.__prompted)) === 1 && !(await card(page)) && (await page.evaluate(() => SK.installEv)) === null, 'Install calls the browser prompt once and clears the card');
    await ctx.close(); }

  /* 4. a prompt that arrives while a lesson is playing does not restart it */
  { const { ctx, page } = await open({ userAgent: ANDROID }, false, true);
    await page.evaluate(() => { location.hash = '#/lesson/1-1'; }); await page.waitForSelector('.player');
    const before = await page.evaluate(() => location.hash + '|' + document.querySelectorAll('.player').length);
    await offer(page); await page.waitForTimeout(250);
    ok((await page.evaluate(() => location.hash + '|' + document.querySelectorAll('.player').length)) === before, 'a late install event leaves the lesson alone');
    await ctx.close(); }

  /* 5. iPhone: no prompt exists, say where the button is */
  { const { ctx, page } = await open({ userAgent: IOS }, false, true);
    await page.waitForSelector('.install');
    ok(/Share/.test(await txt(page)) && /Add to Home Screen/.test(await txt(page)), 'iPhone card explains Share, then Add to Home Screen'); await ctx.close(); }

  /* 6. the installed app: nothing to suggest, on Learn or in You */
  { const { ctx, page } = await open({ userAgent: ANDROID }, true, true);
    await offer(page); await page.waitForTimeout(200);
    ok(!(await card(page)), 'no card inside the installed app');
    await page.evaluate(() => { location.hash = '#/you'; }); await page.waitForSelector('.row-set');
    ok(!/Install as an app/.test(await page.textContent('body')), 'no Install row inside the installed app'); await ctx.close(); }

  /* 7. desktop: only the real prompt triggers a suggestion */
  { const { ctx, page } = await open({ isMobile: false, hasTouch: false, viewport: { width: 1000, height: 800 } }, false, true);
    ok(!(await card(page)), 'desktop without a prompt shows nothing');
    await offer(page); await page.waitForSelector('.install .btn >> text=Install');
    ok(true, 'desktop shows the card once Chrome offers the prompt'); await ctx.close(); }

  /* 8. You tab row, and appinstalled hides everything */
  { const { ctx, page } = await open({ userAgent: ANDROID }, false, true);
    await page.evaluate(() => { location.hash = '#/you'; }); await page.waitForSelector('.row-set');
    ok(/Install as an app/.test(await page.textContent('.set, body')) && /home screen/.test(await page.textContent('body')), 'You tab shows the Android advice as a row');
    await offer(page); await page.waitForSelector('.row-set .btn >> text=Install');
    ok(true, 'You tab row turns into an Install button when Chrome offers the prompt');
    await page.evaluate(() => window.dispatchEvent(new Event('appinstalled'))); await page.waitForTimeout(200);
    ok(await page.evaluate(() => SK.state.set.installNo === true && SK.installEv === null), 'appinstalled saves that it is done');
    await page.evaluate(() => { location.hash = '#/learn'; }); await page.waitForSelector('.world');
    ok(!(await card(page)), 'no card after installing'); await ctx.close(); }

  ok(errs.length === 0, 'JavaScript errors: ' + errs.slice(0, 2).join(' | '));
  await browser.close();
  console.log('install checks passed: ' + passes + ' | failed: ' + fails);
  process.exit(fails ? 1 : 0);
})();
