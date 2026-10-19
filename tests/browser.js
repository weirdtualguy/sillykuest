/* Browser smoke test: loads the app from file://, plays lessons with the QA solver, reports errors.
   Usage: NODE_PATH=$(npm root -g) node tests/browser.js [--shots dir] [--only 1-1] */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const args = process.argv.slice(2);
const shotsDir = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null;
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const url = 'file://' + path.resolve(__dirname, '..', 'index.html') + '?qa=1';
  await page.goto(url);
  await page.evaluate(() => { SK.state.set.openAll = true; SK.state.set.sound = false; SK.state.set.motion = false; SK.applyTheme(); SK.save(); });
  const ids = await page.evaluate(() => SK.lessons.map(l => l.id));
  if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });
  const overflow = async (label) => {
    const o = await page.evaluate(() => { const m = document.querySelector('.p-main'); const d = document.documentElement; return { main: m ? m.scrollWidth - m.clientWidth : 0, page: d.scrollWidth - d.clientWidth, vw: innerWidth }; });
    if (o.main > 1 || o.page > 1 || o.vw !== 360) errors.push(label + ': horizontal overflow ' + JSON.stringify(o));
  };
  const shot = async (name) => { if (shotsDir) await page.screenshot({ path: path.join(shotsDir, name + '.png') }); };
  await page.reload(); await page.waitForSelector('.learn');
  await shot('learn');
  let total = 0;
  for (const id of ids) {
    if (only && id !== only) continue;
    await page.evaluate(h => { location.hash = h; }, '#/lesson/' + id);
    await page.waitForSelector('.player', { timeout: 3000 });
    let guard = 0, k = 0, stuck = 0;
    while (guard++ < 80) {
      if (await page.$('.player .done')) break;
      const sheetBtn = await page.$('.p-sheet:not([hidden]) button');
      if (sheetBtn) { await sheetBtn.click(); continue; }
      const qa = await page.$('.qa-solve'); if (qa) await qa.click();
      await overflow(id + ' step ' + guard);
      const go = await page.$('.p-go:not([hidden])');
      if (go) {
        const dis = await go.evaluate(b => b.disabled);
        if (!dis) { if (shotsDir && k < 40 && only) await shot(id + '-s' + (k++)); await go.click(); }
        else { await page.waitForTimeout(120); if (await go.evaluate(b => b.disabled)) { stuck++; if (stuck > 6) { errors.push(id + ': Continue stayed disabled at step ' + guard); break; } } }
      }
    }
    if (guard >= 80) errors.push(id + ': did not finish');
    total++;
    if (shotsDir && only) await shot(id + '-done');
    await page.evaluate(() => { if (SK.activePlayer) SK.activePlayer.close(); });
  }
  // bosses, review and daily
  async function runRoute(hash, label) {
    await page.evaluate(h => { location.hash = h; }, hash);
    try { await page.waitForSelector('.player', { timeout: 2500 }); } catch (e) { errors.push(label + ': player did not open'); return; }
    let g = 0, st = 0;
    while (g++ < 120) {
      if (await page.$('.player .done')) break;
      const sb = await page.$('.p-sheet:not([hidden]) button'); if (sb) { await sb.click(); continue; }
      const qa = await page.$('.qa-solve');
      if (qa) { try { await qa.click({ timeout: 2500 }); } catch (e) { const d = await page.evaluate(() => ({ sheetHidden: document.querySelector('.p-sheet') && document.querySelector('.p-sheet').hidden, actionsHidden: document.querySelector('.p-actions') && document.querySelector('.p-actions').hidden, hasDone: !!document.querySelector('.done'), step: (document.querySelector('.p-step') || {}).innerText })); errors.push(label + ': qa click blocked ' + JSON.stringify(d).slice(0, 300)); break; } }
      await overflow(label + ' step ' + g);
      const go = await page.$('.p-go:not([hidden])');
      if (go) { if (!(await go.evaluate(b => b.disabled))) await go.click({ timeout: 2500 }).catch(() => {}); else { await page.waitForTimeout(120); if (++st > 8) { errors.push(label + ': stuck'); break; } } }
    }
    if (g >= 120) errors.push(label + ': did not finish');
    const title = await page.$eval('.player .done h1', e => e.textContent).catch(() => '?');
    console.log('  ' + label + ' ->', title);
    await page.evaluate(() => { if (SK.activePlayer) SK.activePlayer.close(); });
  }
  for (let w = 1; w <= 6; w++) await runRoute('#/boss/' + w, 'boss ' + w);
  await runRoute('#/daily', 'daily five');
  await page.evaluate(() => { SK.state.mistakes = ['1-1:4', '2-1:4', '3-1:4']; SK.save(); });
  await runRoute('#/review', 'review');
  // screens
  for (const r of ['#/learn', '#/practice', '#/lab', '#/lab/ex/mecenas', '#/lab/toy/lanes', '#/words', '#/ops', '#/cheat', '#/you']) {
    await page.evaluate(h => { location.hash = h; }, r); await page.waitForTimeout(80);
    await shot('screen-' + r.replace(/[#\/]/g, '_'));
  }
  console.log('lessons played:', total, '| errors:', errors.length);
  errors.forEach(e => console.log('  ', e));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
