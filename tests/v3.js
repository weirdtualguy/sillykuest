/* 3.0 behaviour checks: donate sheet, saved-data safety, resume stats, boss slips, focus, announcements.
   Run from the app root: NODE_PATH=$(npm root -g) node tests/v3.js */
const { chromium } = require('playwright');
const path = require('path');
const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('FAIL: ' + m); } };
(async () => {
  const browser = await chromium.launch();
  async function open(opts, init, query) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true }, opts || {}));
    if (init) await ctx.addInitScript(init);
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(url + (query || ''));
    return { ctx, page, errs };
  }
  const quiet = page => page.evaluate(() => { SK.state.set.sound = false; SK.state.set.motion = false; SK.state.level = 'new'; SK.applyTheme(); SK.save(); });
  const go = async (page, h) => { await page.evaluate(h => { location.hash = h; }, h); await page.waitForTimeout(150); };

  /* 1. clean load (a CSP violation would show up as a console error) */
  let { ctx, page, errs } = await open();
  await page.waitForSelector('.welcome');
  ok(errs.length === 0, 'no errors or CSP violations on load: ' + errs.join(' | '));
  ok(await page.evaluate(v => !document.querySelector('.boot') && SK.version === v, require('../package.json').version), 'boot screen replaced, version matches package.json');
  await quiet(page);
  await page.evaluate(() => document.querySelector('.welcome .btn.alt').click());

  /* 2. donate sheet: footer pill and You card, copy, failure path, focus */
  await go(page, '#/learn');
  await page.waitForSelector('.foot-donate');
  const donate = await page.evaluate(() => SK.DONATE);
  await page.evaluate(() => { window.__c = null; Object.defineProperty(navigator, 'clipboard', { value: { writeText: t => { window.__c = t; return Promise.resolve(); } }, configurable: true }); });
  await page.evaluate(() => { const b = document.querySelector('.foot-donate'); b.focus(); b.click(); });
  await page.waitForSelector('.modal .sup-name');
  ok((await page.textContent('.sup-name code')) === donate && !!donate, 'sheet shows the donation name');
  await page.click('.sup-name'); await page.waitForTimeout(120);
  ok((await page.evaluate(() => window.__c)) === donate, 'copy writes the name to the clipboard');
  ok((await page.textContent('.sup-copy')).trim() === 'Copied', 'copy button confirms');
  ok(/Copied/.test(await page.textContent('.sr[role=status]')), 'copy is announced to screen readers');
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('no')) }, configurable: true }); document.execCommand = () => false; });
  await page.click('.sup-name'); await page.waitForSelector('.toast');
  ok(/Could not copy/.test(await page.textContent('.toast')), 'a blocked copy says so instead of pretending');
  await page.evaluate(() => document.querySelector('.modal-actions .btn').focus());
  await page.keyboard.press('Tab');
  ok(await page.evaluate(() => !!document.activeElement.closest('.modal')), 'Tab stays inside the sheet');
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => !document.querySelector('.modal') && document.activeElement.classList.contains('foot-donate')), 'closing returns focus to the Donate button');
  await go(page, '#/you');
  await page.waitForSelector('.support .btn');
  await page.click('.support .btn'); await page.waitForSelector('.modal .sup-name');
  ok(true, 'You card opens the sheet');
  await page.keyboard.press('Escape');

  /* 3. saved data is untrusted */
  const r = await page.evaluate(() => {
    SK.state.xp = 77; SK.save(); const before = JSON.stringify(SK.state);
    const bad = ['', 'not base64!!', btoa('[]'), btoa('{"v":1}'), btoa('null')].map(c => SK.importCode(c));
    return { bad, same: JSON.stringify(SK.state) === before };
  });
  ok(r.bad.every(x => x === false), 'bad progress codes are rejected: ' + r.bad);
  ok(r.same, 'a rejected code leaves current progress untouched');
  const j = await page.evaluate(() => {
    const raw = '{"v":2,"xp":120,"streak":-4,"done":{"1-1":{"stars":9},"x":{"stars":1},"2-1":"no"},"mistakes":["1-1:2","bad","1-1:2"],"badges":{"first":5,"../x":1},"set":{"theme":"neon","sound":"yes","motion":false},"level":"wizard","__proto__":{"polluted":1},"resume":{"2-3":3,"9-9":-1},"rs":{"2-3":{"m":1,"t":2,"o":3}}}';
    const okImport = SK.importCode(btoa(raw)), s = SK.state;
    return { okImport, xp: s.xp, streak: s.streak, done: Object.keys(s.done).join(), stars: s.done['1-1'] && s.done['1-1'].stars, mistakes: s.mistakes.join(), badges: Object.keys(s.badges).join(), theme: s.set.theme, sound: s.set.sound, motion: s.set.motion, level: s.level, resume: JSON.stringify(s.resume), rs: JSON.stringify(s.rs), polluted: ({}).polluted, own: Object.prototype.hasOwnProperty.call(s, 'polluted') };
  });
  ok(j.okImport && j.xp === 120 && j.streak === 0, 'numbers are kept or zeroed: ' + JSON.stringify([j.xp, j.streak]));
  ok(j.done === '1-1' && j.stars === 3, 'only valid lessons survive, stars clamp to 3: ' + j.done + '/' + j.stars);
  ok(j.mistakes === '1-1:2' && j.badges === 'first', 'review keys and badges are validated: ' + j.mistakes + ' ' + j.badges);
  ok(j.theme === 'system' && j.sound === true && j.motion === false && j.level === null, 'settings fall back to safe values');
  ok(j.resume === '{"2-3":3}' && j.rs === '{"2-3":{"m":1,"t":2,"o":3}}', 'resume data is validated: ' + j.resume + ' ' + j.rs);
  ok(j.polluted === undefined && !j.own, 'no prototype pollution');
  ok(await page.evaluate(() => { const a = JSON.stringify(SK.state); return SK.importCode(SK.exportCode()) && JSON.stringify(SK.state) === a; }), 'export then import round-trips');
  ok(await page.evaluate(() => { try { return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(SK.exportCode()), c => c.charCodeAt(0)))).v === 2; } catch (e) { return false; } }), 'progress code is base64 of UTF-8 JSON');
  ok(errs.length === 0, 'no errors so far: ' + errs.join(' | '));
  await ctx.close();

  /* 4. corrupted localStorage at startup */
  ({ ctx, page, errs } = await open(null, () => { try { localStorage.setItem('sillykuest.v2', '{"v":2,"done":"x","set":null,"mistakes":5,"xp":"lots","resume":[],"stats":7}'); } catch (e) {} }));
  await page.waitForSelector('.welcome');
  ok(errs.length === 0 && await page.evaluate(() => SK.state.xp === 0 && Array.isArray(SK.state.mistakes) && SK.state.set.theme === 'system'), 'corrupted saved state loads as defaults without errors: ' + errs.join(' | '));
  await ctx.close();

  /* 5. blocked storage is announced on Learn */
  ({ ctx, page, errs } = await open(null, () => { Storage.prototype.setItem = function () { throw new Error('blocked'); }; }));
  await page.waitForSelector('.welcome'); await quiet(page);
  await page.evaluate(() => document.querySelector('.welcome .btn.alt').click()); await page.waitForTimeout(200);
  ok(await page.evaluate(() => SK.saveOk === false) && !!(await page.$('.tip.warn')), 'blocked storage shows a notice on Learn');
  await ctx.close();

  /* 6. Today sheet wording */
  ({ ctx, page, errs } = await open());
  await page.waitForSelector('.welcome'); await quiet(page);
  await page.evaluate(() => document.querySelector('.welcome .btn.alt').click());
  const t35 = await page.evaluate(() => { SK.state.today = { d: SK.day(), xp: 35 }; SK.todaySheet(); return document.querySelector('.modal').textContent; });
  ok(/5 bonus XP/.test(t35) && /XP today/.test(t35) && !/35 of 30/.test(t35), 'Today sheet shows bonus XP instead of "35 of 30"');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  const t20 = await page.evaluate(() => { SK.state.today = { d: SK.day(), xp: 20 }; SK.todaySheet(); return document.querySelector('.modal').textContent; });
  ok(/of 30 XP/.test(t20) && /10 XP to your daily goal/.test(t20), 'Today sheet below goal still counts down');
  await page.keyboard.press('Escape');

  /* 7. boss: slip counter, announcements, heading focus, early end on the third slip */
  await page.evaluate(() => {
    const steps = []; for (let i = 0; i < 8; i++) steps.push({ step: { t: 'mc', keep: true, q: 'Question ' + (i + 1) + '?', opts: ['right', 'wrong one', 'wrong two'], a: 0, why: 'Because reasons.' }, key: null });
    SK.play({ kind: 'boss', id: 'bossT', title: 'Test boss', world: 1, boss: { name: 'Test boss', quip: '' }, color: '#37D6B4', steps });
  });
  await page.waitForSelector('.boss-hud .slips');
  ok(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('q-text')), 'each question heading takes focus');
  for (let n = 1; n <= 3; n++) {
    await page.evaluate(() => document.querySelector('.opt[data-i="1"]').click());
    await page.evaluate(() => document.querySelector('.p-go').click());
    await page.waitForSelector('.p-sheet:not([hidden])');
    const lab = await page.getAttribute('.slips', 'aria-label');
    ok(n < 3 ? lab === 'Slips used: ' + n + ' of 2' : lab === 'Out of slips', 'slip counter after slip ' + n + ': ' + lab);
    ok(await page.evaluate(() => document.querySelectorAll('.slips i.on').length) === Math.min(n, 2), 'two pips light up (slip ' + n + ')');
    if (n === 1) { await page.waitForTimeout(120); ok(/Because reasons/.test(await page.textContent('.sr[role=status]')), 'the explanation is announced to screen readers'); }
    await page.evaluate(() => document.querySelector('.p-sheet button').click()); await page.waitForTimeout(60);
  }
  ok(await page.evaluate(() => /boss got away/i.test(document.querySelector('.player .done h1').textContent)), 'a third slip ends the fight at once');
  await page.evaluate(() => document.querySelector('.done-actions .btn.alt').click()); await page.waitForTimeout(150);

  /* 7b. Vault Heist reads rules with its own parser, so the strict CSP does not break it */
  const he = await page.evaluate(() => {
    const e = { pk: 'hannah', s: 'sig:hannah', tx: { time: 120 }, prev_state: { amount: 100 }, total: 100, mintAmount: 0, age: 700, period: 500 };
    const ev = x => SK.heist.eval(x, e);
    return { good: ev(['checkSig(s, pk)']), swapped: ev(['checkSig(pk, s)']), two: ev(['checkSig(s, pk)', 'tx.time >= 100']), early: ev(['tx.time >= 200']), age: ev(['this.ageDaa >= period']), eq: ev(['total == prev_state.amount']), mint: ev(['mintAmount > 0']), junk: ev(['pk; alert(1)']), call: ev(['alert(1)']), ctor: ev(['pk.constructor']), proto: ev(['tx.__proto__']), unknown: ev(['nope']), assign: ev(['total = 5']), empty: ev(['']), bang: ev(['!(total != 100)']), neg: ev(['-1 < 0']) };
  });
  ok(he.good === true && he.swapped === false && he.two === true && he.early === false, 'heist rules evaluate: ' + JSON.stringify(he));
  ok(he.age === true && he.eq === true && he.mint === false && he.bang === true && he.neg === true, 'heist comparisons, this.ageDaa, ! and unary minus work');
  ok([he.junk, he.call, he.ctor, he.proto, he.unknown, he.assign, he.empty].every(v => v === null), 'heist rejects junk, calls, prototype access and unknown names: ' + JSON.stringify([he.junk, he.call, he.ctor, he.proto, he.unknown, he.assign, he.empty]));

  /* 8. resume keeps what you already got wrong */
  const rem = await page.evaluate(() => { SK.reset(); SK.state.set.sound = false; SK.state.set.motion = false; SK.state.level = 'new'; SK.setResume('1-1', 4, { m: 2, t: 3, o: 1 }); return SK.lesson('1-1').steps.slice(4).filter(SK.isQuiz).length; });
  await page.close();
  page = await ctx.newPage();
  await page.goto(url + '?qa=1'); await page.waitForTimeout(200);
  await page.evaluate(() => { SK.state.set.sound = false; SK.state.set.motion = false; SK.state.level = 'new'; SK.applyTheme(); SK.setResume('1-1', 4, { m: 2, t: 3, o: 1 }); });
  await go(page, '#/lesson/1-1'); await page.waitForSelector('.player');
  let finished = false;
  for (let g = 0; g < 220 && !finished; g++) {
    finished = !!(await page.$('.player .done h1'));
    if (finished) break;
    await page.evaluate(() => {
      const sb = document.querySelector('.p-sheet:not([hidden]) button'); if (sb) { sb.click(); return; }
      const qa = document.querySelector('.qa-solve'); if (qa) qa.click();
      const go = document.querySelector('.p-go'); if (go && !go.hidden && !go.disabled) go.click();
    });
    await page.waitForTimeout(20);
  }
  ok(finished, 'lesson 1-1 plays to the end from a saved place');
  const fin = await page.evaluate(() => ({ stars: SK.state.done['1-1'] && SK.state.done['1-1'].stars, xp: SK.state.xp, total: SK.state.stats.total, rs: JSON.stringify(SK.state.rs), resume: JSON.stringify(SK.state.resume), cap: (document.querySelector('.done-goal .cap') || {}).textContent }));
  ok(fin.stars === 2, 'two earlier slips still cost a star: stars=' + fin.stars);
  ok(fin.xp === 15 + 5 * (3 + rem - 2), 'XP counts the questions from before you left: ' + fin.xp + ' vs ' + (15 + 5 * (3 + rem - 2)));
  ok(fin.total === rem, 'accuracy stats only count answers given: ' + fin.total + ' vs ' + rem);
  ok(fin.rs === '{}' && fin.resume === '{}', 'resume data is cleared at the end: ' + fin.rs + ' ' + fin.resume);
  ok(/of 30 XP today/.test(fin.cap || ''), 'completion screen shows the daily goal line: ' + fin.cap);
  ok(await page.evaluate(() => { SK.setResume('1-2', 3, { m: 1, t: 1, o: 0 }); SK.setResume('1-2', 0); return !SK.state.resume['1-2'] && !SK.state.rs['1-2']; }), 'start over clears resume and its stats');
  await ctx.close();

  await browser.close();
  console.log('v3 checks passed: ' + passes + ' | failed: ' + fails);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
