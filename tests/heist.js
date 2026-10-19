/* Vault Heist: logic (solutions win, classic wrong rules fail, docs grounding) and the UI flow.
   Usage: NODE_PATH=$(npm root -g) node tests/heist.js   (needs Playwright, like tests/browser.js) */
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(), errors = []; let passed = 0;
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html') + '?qa=1');
  await page.evaluate(() => { SK.state.set.sound = false; SK.state.set.motion = false; SK.state.level = 'builder'; SK.applyTheme(); SK.save(); });
  const ok = (c, m) => { if (c) passed++; else errors.push('FAIL: ' + m); };
  const logic = await page.evaluate(() => {
    const out = [], steps = SK.heistSteps().map(x => x.step), run = (st, ex) => st.sc.map(c => SK.heist.eval(ex, c.env));
    steps.forEach((st, n) => {
      const ex = st.sol.map(s => SK.joinTokens(s)), r = run(st, ex);
      out.push(['L' + (n + 1) + ' solution passes every transaction', r.every((v, i) => v === st.sc[i].want)]);
      const docs = SK.examples[st.ex]; const lines = docs.lines.map(l => l[0].trim());
      out.push(['L' + (n + 1) + ' solution lines are in the ' + st.ex + ' docs contract', docs.badge === 'docs' && st.sol.every(s => lines.indexOf(SK.heist.line(s)) >= 0)]);
      out.push(['L' + (n + 1) + ' every solution piece is in its bank', st.sol.every((s, i) => s.every(t => st.slots[i].indexOf(t) >= 0))]);
    });
    const one = (n, ex) => run(steps[n], ex).map((v, i) => v === steps[n].sc[i].want);
    out.push(['L1 require(true) lets Mallory in', one(0, ['true'])[1] === false]);
    out.push(['L1 swapped checkSig locks Hannah out', one(0, ['checkSig(pk, s)'])[0] === false]);
    out.push(['L2 a missing time lock fails', one(1, ['checkSig(senderSig, sender)', 'true']).some(v => !v)]);
    out.push(['L3 ">" fails the exact day', one(2, ['this.ageDaa > period'])[2] === false]);
    out.push(['L4 "<=" lets the printer in', one(3, ['in_sum <= out_sum'])[2] === false]);
    out.push(['L5 ">=" lets the copier in', one(4, ['total >= prev_state.amount'])[1] === false]);
    out.push(['L6 ">= 0" lets a zero mint in', one(5, ['mintAmount >= 0', 'mintAmount <= prev_state.amount'])[2] === false]);
    out.push(['junk is rejected, not run', SK.heist.eval('pk; alert(1)', steps[0].sc[0].env) === null]);
    return out;
  });
  logic.forEach(([m, c]) => ok(c, m));
  /* UI flow: wrong rule first, then the right one */
  await page.evaluate(() => { location.hash = '#/heist'; });
  await page.waitForSelector('.hx-go');
  const tap = t => page.evaluate(t => { const b = [...document.querySelectorAll('.hx .bank .chipbtn')].find(x => !x.disabled && x.textContent === t); if (b) b.click(); return !!b; }, t);
  await tap('true'); await page.click('.hx-go'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => document.querySelectorAll('.hx-tx.fail').length === 2), 'wrong rule: two transactions go wrong');
  ok(await page.evaluate(() => !document.querySelector('.p-sheet:not([hidden])')), 'wrong rule does not end the level');
  ok(await page.evaluate(() => !document.querySelector('.hx-go').disabled), 'Run again stays available');
  await page.evaluate(() => document.querySelector('.hx .bline .tk').click());
  for (const t of ['checkSig(', 's', ',', 'pk', ')']) await tap(t);
  ok(await page.evaluate(() => document.querySelector('.hx .bline').textContent.replace(/\s/g, '') === 'checkSig(s,pk)'), 'line reads checkSig(s, pk)');
  await page.click('.hx-go'); await page.waitForSelector('.p-sheet.ok:not([hidden])', { timeout: 3000 }); ok(true, 'right rule is sealed');
  ok(await page.evaluate(() => SK.state.stats.heist === 0 || SK.state.stats.heist === undefined), 'second run does not count as first-run');
  /* the remaining five levels with the QA solver, then the end screen */
  for (let n = 2; n <= 6; n++) {
    await page.click('.p-sheet:not([hidden]) .btn'); await page.waitForSelector('.hx-go');
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'L' + n + ' has no horizontal overflow');
    await page.click('.qa-solve'); await page.waitForSelector('.p-sheet.ok:not([hidden])', { timeout: 3000 });
  }
  ok(await page.evaluate(() => SK.state.stats.heist === 5), 'five first-run levels counted');
  await page.click('.p-sheet:not([hidden]) .btn'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => !!document.querySelector('.player .done h1') || !!document.querySelector('.player .done')), 'round ends on the completion screen');
  await browser.close();
  console.log('heist checks passed: ' + passed + ' | failed: ' + errors.length);
  if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
})();
