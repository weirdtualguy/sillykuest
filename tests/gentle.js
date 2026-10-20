/* 3.1 behaviour checks: the gentler World 1 (lessons 1.2 to 1.7), the key-lock toy, plain wording before a term is earned,
   Pro corners, and the move of saved progress from the 3.0 lesson numbers to the new ones.
   Run from the app root: NODE_PATH=$(npm root -g) node tests/gentle.js [--shots dir]   (needs Playwright, like tests/browser.js) */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
const args = process.argv.slice(2);
const shotsDir = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null;
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('FAIL: ' + m); } };

/* What a 3.0.0 save looked like, and where each saved Review key has to land. The third column is the question the OLD key
   pointed at (taken from the 3.0.0 lessons): the new key must show that same question. */
const MAP = [
  ['1-2:5', '1-3:7', 'How is a covenant different'],
  ['1-2:6', '1-3:6', 'A covenant can require'],
  ['1-2:7', '1-4:2', 'Who can check this'],
  ['1-3:5', '1-4:8', 'state changes from 3 to 4'],
  ['1-3:6', '1-4:9', 'The covenant ID changes every time'],
  ['1-3:7', '1-4:10', 'Fill in the blank'],
  ['1-3:8', '1-4:11', 'Match each thing to what it does'],
  ['1-4:4', '1-5:4', 'compute_budget'],
  ['1-4:5', '1-5:5', 'Changing an input'],
  ['1-4:6', '1-5:6', 'An output can carry a covenant binding'],
  ['1-4:7', '1-5:7', 'Match each proposal'],
  ['1-5:6', '1-6:5', 'A covenant output is paid'],
  ['1-5:8', '1-6:7', 'An address contains the amount'],
  ['1-5:9', '1-6:8', 'Which kind of address'],
  ['1-5:13', '1-6:9', 'Match each prefix'],
  ['1-6:3', '1-7:3', 'How many sompi']
];
const DROPPED = ['1-5:3', '1-5:12', '1-6:5', '1-6:6', '1-6:8']; /* testnet paste, wrap-in-P2SH, mass (2) and the DAA clock: no longer lesson questions */
const OLD = () => ({
  v: 2, mig: 1, xp: 310, streak: 2, best: 4, last: '2026-10-18', today: { d: '2026-10-18', xp: 20 },
  done: { '1-1': { stars: 3 }, '1-2': { stars: 2 }, '1-3': { stars: 3 }, '1-4': { stars: 1 }, '1-5': { stars: 2 }, '1-6': { stars: 3 }, '2-1': { stars: 2 } },
  bosses: { '1': true }, badges: { first: 1, w1: 2 },
  resume: { '1-3': 5, '1-5': 3, '2-2': 4 }, rs: { '1-3': { m: 1, t: 2, o: 1 }, '1-5': { m: 0, t: 1, o: 1 }, '2-2': { m: 2, t: 3, o: 1 } },
  mistakes: ['1-1:4'].concat(MAP.map(m => m[0]), DROPPED, ['2-1:4']),
  stats: { ok: 40, total: 50, bug: 2 }, set: { sound: false, theme: 'dark', openAll: false, motion: true }, level: 'basics'
});

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });
  const shot = async n => { if (shotsDir) await page.screenshot({ path: path.join(shotsDir, n + '.png') }); };
  const quiet = () => page.evaluate(() => { SK.state.set.sound = false; SK.state.set.motion = false; SK.state.level = 'new'; SK.applyTheme(); SK.save(); });
  const theme = t => page.evaluate(t => { SK.state.set.theme = t; SK.applyTheme(); }, t);
  const boot = async (q) => { await page.goto(url + (q || '?qa=1')); await page.waitForSelector('.welcome, .learn'); };
  const skipWelcome = () => page.evaluate(() => { const b = document.querySelector('.welcome .btn.alt'); if (b) b.click(); });
  const reload = async () => { await page.reload(); await page.waitForSelector('.welcome, .learn'); };
  const closePlayer = () => page.evaluate(() => { if (SK.activePlayer) SK.activePlayer.close(); location.hash = '#/learn'; });
  /* open a lesson at a given step through the saved place, as a returning player would */
  const openAt = async (id, i) => {
    await closePlayer(); await page.waitForTimeout(60);
    await page.evaluate(([id, i]) => { SK.state.set.sound = false; SK.state.set.motion = false; SK.state.set.openAll = true; if (i > 0) SK.setResume(id, i, { m: 0, t: 0, o: 0 }); location.hash = '#/lesson/' + id; }, [id, i]);
    await page.waitForSelector('.player'); await page.waitForTimeout(150);
  };
  const overflow = () => page.evaluate(() => { const m = document.querySelector('.p-main'); return Math.max(m.scrollWidth - m.clientWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth); });
  const mainText = () => page.evaluate(() => document.querySelector('.p-main').innerText + ' ' + document.querySelector('.p-hint').innerText);
  const goBtn = () => page.evaluate(() => { const b = document.querySelector('.p-go'); return { disabled: b.disabled, hidden: b.hidden }; });
  const clickText = (sel, text) => page.evaluate(([sel, t]) => { const b = [...document.querySelectorAll(sel)].find(x => x.textContent.trim() === t); if (b) b.click(); return !!b; }, [sel, text]);

  await boot(); await quiet(); await skipWelcome();

  /* ================================================================ 1. the shape of the new World 1 */
  const w1 = await page.evaluate(() => SK.lessonsOf(1).map(l => ({
    id: l.id, title: l.title, steps: l.steps.map(s => s.t), pro: l.steps.map(s => !!s.pro),
    firstQuiz: l.steps.findIndex(SK.isQuiz), quiz: l.steps.map((s, i) => SK.isQuiz(s) ? s.t : null)
  })));
  ok(w1.map(l => l.id).join() === '1-1,1-2,1-3,1-4,1-5,1-6,1-7', 'World 1 has seven lessons: ' + w1.map(l => l.id));
  ok(w1.map(l => l.title).join('|') === 'Coins live in envelopes|Envelopes with locks|A lock that checks the spend|The sticky note inside|Meet Toccata|Reading an address|Sompi, the smallest coin', 'lesson order and titles: ' + w1.map(l => l.title).join('|'));
  const by = id => w1.find(l => l.id === id);
  /* one new idea per lesson: each new idea is followed by a recognition question, not a discrimination task */
  ['1-2', '1-3', '1-6', '1-7'].forEach(id => ok(['mc', 'tf'].indexOf(by(id).quiz[by(id).firstQuiz]) >= 0, id + ': the first question is a recognition pick (' + by(id).quiz[by(id).firstQuiz] + ')'));
  const l14 = by('1-4');
  ok(l14.steps.slice(0, 3).join() === 'say,say,sort' && l14.firstQuiz === 2, '1-4 opens with a look back: say, say, then the lock sort (' + l14.steps.slice(0, 3) + ')');
  ok(['mc', 'tf'].indexOf(l14.quiz.slice(3).find(Boolean)) >= 0, '1-4: the first question about the sticky note is a recognition pick');
  ok(!by('1-3').steps.includes('sort') && !by('1-2').steps.includes('sort'), 'the lock sort no longer sits in the lessons that introduce the lock ideas');
  ok(by('1-6').steps.indexOf('table') < 0 && by('1-6').pro.filter(Boolean).length >= 4, '1-6 has no byte tables in the main flow and keeps the detail in Pro corners (' + by('1-6').pro.filter(Boolean).length + ')');
  const l17 = await page.evaluate(() => { const l = SK.lesson('1-7'); const text = JSON.stringify(l.steps.map(s => { const c = Object.assign({}, s); delete c.pro; return c; })); const pro = l.steps.filter(s => s.pro).map(s => s.pro.x).join(' '); return { main: /\bmass\b|\bDAA\b|coinbase|outpoint/i.test(text), pro: /\bmass\b/i.test(pro) && /DAA score/.test(pro) }; });
  ok(!l17.main && l17.pro, '1-7 is sompi alone; mass and the DAA clock live in its Pro corner');
  const refs = await page.evaluate(() => { const out = []; SK.lessons.forEach(l => l.steps.forEach(s => { const m = JSON.stringify(s).match(/lessons? (\d-\d)/gi); if (m) m.forEach(x => out.push(l.id + ' -> ' + x.split(' ')[1] + ' ' + (SK.lesson(x.split(' ')[1]) || {}).title)); })); return out; });
  ok(refs.length >= 1 && refs.every(r => /Reading an address$/.test(r)), 'text that points at an earlier lesson still points at the right one: ' + refs.join('; '));
  ok(await page.evaluate(() => SK.lesson('3-5').steps.some(s => s.pro && /three kinds of mass/i.test(s.pro.h))), '3-5 explains the three kinds of mass in a Pro corner, since World 1 no longer does');
  ok(await page.evaluate(() => SK.bossKeys(1).length >= 8), 'the World 1 boss still has at least eight questions to draw from');
  ok(await page.evaluate(() => SK.lessons.every(l => l.steps.length >= 6)), 'every lesson keeps at least six steps');
  ok(await page.evaluate(() => SK.version) === require('../package.json').version, 'SK.version matches package.json');
  await page.evaluate(() => { SK.state.done = {}; SK.state.set.openAll = false; location.hash = '#/learn'; });
  await page.waitForSelector('.pn');
  ok(await page.evaluate(() => document.querySelector('.world').querySelectorAll('.pn:not(.boss)').length) === 7, 'the Learn map shows seven lesson nodes in World 1 (and the boss)');

  /* ================================================================ 2. saved progress moves with its lessons */
  const asNew = async (label, run) => { await page.evaluate(() => { localStorage.clear(); }); await run(); };
  await asNew('3.0.0 save', async () => { await page.evaluate(o => { localStorage.setItem('sillykuest.v2', JSON.stringify(o)); }, OLD()); await reload(); });
  const mig = await page.evaluate(() => { const s = SK.state; return { mig: s.mig, len: SK.KEYSHIFTS.length, done: Object.keys(s.done).sort().map(k => k + '=' + s.done[k].stars).join(','), resume: JSON.stringify(s.resume), rs: JSON.stringify(s.rs), mistakes: s.mistakes.slice(), xp: s.xp, bosses: Object.keys(s.bosses).join(), badges: Object.keys(s.badges).sort().join(), theme: s.set.theme, level: s.level, openW1: SK.worldDone(1), next: (SK.nextLesson() || {}).id }; });
  ok(mig.mig === mig.len && mig.len >= 2, 'a 3.0.0 save runs the new migration (mig ' + mig.mig + ' of ' + mig.len + ')');
  ok(mig.done === '1-1=3,1-2=2,1-3=2,1-4=3,1-5=1,1-6=2,1-7=3,2-1=2', 'done lessons move up, and the split lesson counts for both halves: ' + mig.done);
  ok(mig.openW1 && mig.next === '2-2', 'a finished World 1 stays finished, and the next lesson is where the player was heading: ' + mig.next);
  ok(mig.resume === '{"1-4":8,"2-2":4}', 'a saved place follows a lesson whose steps kept their order (+3 for the look back) and is dropped for a reshaped one: ' + mig.resume);
  ok(mig.rs === '{"1-4":{"m":1,"t":2,"o":1},"2-2":{"m":2,"t":3,"o":1}}', 'resume stats travel with the saved place: ' + mig.rs);
  const wantKeys = ['1-1:4'].concat(MAP.map(m => m[1]), ['2-1:4']);
  ok(mig.mistakes.join() === wantKeys.join(), 'Review keys land on their new keys and dropped questions disappear: ' + mig.mistakes.join());
  ok(mig.xp === 310 && mig.bosses === '1' && mig.badges === 'first,w1' && mig.theme === 'dark' && mig.level === 'basics', 'nothing else in the save changes');
  for (const [from, to, q] of MAP) {
    const got = await page.evaluate(k => { const s = SK.stepByKey(k); return s ? { q: s.q, quiz: SK.isQuiz(s) } : null; }, to);
    ok(got && got.quiz && got.q.indexOf(q) >= 0, from + ' -> ' + to + ' should still be "' + q + '" (got ' + (got && got.q) + ')');
  }
  ok(await page.evaluate(() => SK.state.mistakes.every(k => { const s = SK.stepByKey(k); return s && SK.isQuiz(s); })), 'every migrated Review key points at a real question');
  /* it runs once: persist, reload, nothing moves again */
  await page.evaluate(() => SK.save()); await reload();
  const again = await page.evaluate(() => ({ done: Object.keys(SK.state.done).sort().join(), resume: JSON.stringify(SK.state.resume), m: SK.state.mistakes.join() }));
  ok(again.done === '1-1,1-2,1-3,1-4,1-5,1-6,1-7,2-1' && again.resume === mig.resume && again.m === mig.mistakes.join(), 'the migration runs once, not on every load');
  /* the Review route plays with the migrated keys */
  await page.evaluate(() => { SK.state.set.sound = false; SK.state.set.motion = false; SK.state.level = 'new'; SK.applyTheme(); location.hash = '#/review'; });
  try { await page.waitForSelector('.player', { timeout: 2500 }); } catch (e) { fails++; console.log('FAIL: review did not open with migrated keys'); }
  let g = 0; while (g++ < 120) {
    if (await page.$('.player .done')) break;
    const sb = await page.$('.p-sheet:not([hidden]) button'); if (sb) { await sb.click(); continue; }
    const qa = await page.$('.qa-solve'); if (qa) await qa.click();
    const go = await page.$('.p-go:not([hidden])'); if (go && !(await go.evaluate(b => b.disabled))) await go.click();
  }
  ok(!!(await page.$('.player .done')), 'Review plays through with migrated keys'); await closePlayer();

  /* a progress code exported by 3.0.0 migrates on import; one exported by 3.1 does not move twice */
  await boot(); await quiet(); await skipWelcome();
  const imp = await page.evaluate(o => {
    const b = new TextEncoder().encode(JSON.stringify(o)); let r = ''; for (let i = 0; i < b.length; i++) r += String.fromCharCode(b[i]);
    const okImport = SK.importCode(btoa(r)); const s = SK.state;
    const first = { okImport, done: Object.keys(s.done).sort().join(), m: s.mistakes.join() };
    const code = SK.exportCode(); SK.importCode(code);
    return { first, second: { done: Object.keys(SK.state.done).sort().join(), m: SK.state.mistakes.join(), mig: SK.state.mig, len: SK.KEYSHIFTS.length } };
  }, OLD());
  ok(imp.first.okImport && imp.first.done === '1-1,1-2,1-3,1-4,1-5,1-6,1-7,2-1' && imp.first.m === wantKeys.join(), 'a 3.0.0 progress code is migrated on import');
  ok(imp.second.done === imp.first.done && imp.second.m === imp.first.m && imp.second.mig === imp.second.len, 'importing a code that is already current changes nothing');

  /* a save from before the shift table existed gets both migrations, in order */
  await asNew('very old save', async () => { await page.evaluate(() => { localStorage.setItem('sillykuest.v2', JSON.stringify({ v: 2, mistakes: ['3-4:1', '1-2:7', '1-3:5'], done: { '1-1': { stars: 1 }, '1-2': { stars: 1 } } })); }); await reload(); });
  const veryOld = await page.evaluate(() => ({ m: SK.state.mistakes.join(), done: Object.keys(SK.state.done).sort().join() }));
  ok(veryOld.m === '3-4:2,1-4:2,1-4:8' && veryOld.done === '1-1,1-2,1-3', 'a save with no migration counter runs every migration: ' + JSON.stringify(veryOld));
  /* a player who had only finished the first lesson is offered the new, gentler second lesson */
  await asNew('only 1-1', async () => { await page.evaluate(() => { localStorage.setItem('sillykuest.v2', JSON.stringify({ v: 2, mig: 1, done: { '1-1': { stars: 3 } }, resume: { '1-2': 4 }, rs: { '1-2': { m: 1, t: 1, o: 0 } }, level: 'new' })); }); await reload(); });
  const early = await page.evaluate(() => ({ next: SK.nextLesson().id, resume: SK.resumeAt(SK.lesson('1-2')), rs: JSON.stringify(SK.state.rs) }));
  ok(early.next === '1-2' && early.resume === 0 && early.rs === '{}', 'a player partway through the old 1.2 starts the new 1.2 from its first step: ' + JSON.stringify(early));
  /* new players start current */
  await page.evaluate(() => { SK.reset(); });
  ok(await page.evaluate(() => SK.state.mig === SK.KEYSHIFTS.length && Object.keys(SK.state.done).length === 0), 'a reset or new player starts up to date');

  /* ================================================================ 3. the key-lock toy (lesson 1.2) */
  await boot(); await quiet(); await skipWelcome();
  await openAt('1-2', 1);
  let t = await mainText();
  ok(!/covenant|signature/i.test(t), 'key lock toy: no covenant or signature wording before the reveal');
  ok((await goBtn()).disabled, 'key lock toy: Continue waits for the player to do something');
  ok(await page.evaluate(() => document.querySelectorAll('.scene button').length) === 1 && /without the key/.test(t), 'key lock toy: one clear action at first (try it without the key)');
  ok(await page.evaluate(() => !!document.querySelector('.env.is-locked')), 'key lock toy: the envelope shows as locked');
  ok(await overflow() <= 1, 'key lock toy: no horizontal overflow (phase 0)');
  await shot('keylock-0');
  await page.click('.scene .btn');
  t = await mainText();
  ok(/stays shut/.test(t) && /with my key/.test(t) && (await goBtn()).disabled, 'key lock toy: no key, the lock stays shut, then the key is offered');
  ok(await page.evaluate(() => document.querySelector('.res').classList.contains('no')), 'key lock toy: the shut lock is shown as blocked');
  await shot('keylock-1');
  await page.click('.scene .btn');
  t = await mainText();
  ok(await page.evaluate(() => !!document.querySelector('.env.is-open')) && /lets go/.test(t) && /Where should the 10 KAS go/.test(t), 'key lock toy: with the key the envelope opens and asks where the coins go');
  ok(await page.evaluate(() => document.querySelectorAll('.tries .btn').length) === 3 && (await goBtn()).disabled, 'key lock toy: three places to send it, Continue still waits');
  ok(await overflow() <= 1, 'key lock toy: no horizontal overflow (phase 2)');
  await shot('keylock-2');
  ok(await clickText('.tries .btn', 'All 10 to Mallory'), 'key lock toy: Mallory can be chosen');
  t = await mainText();
  ok(/never asked where the coins would go/.test(t) && !(await goBtn()).disabled, 'key lock toy: even a thief gets the coins, the lock only checked the key, and Continue opens');
  ok(await page.evaluate(() => document.querySelector('.res').classList.contains('ok')), 'key lock toy: the result reads as allowed');
  ok(await overflow() <= 1, 'key lock toy: no horizontal overflow (phase 3)');
  await shot('keylock-3');
  /* the QA solver and the 320px screen */
  await openAt('1-2', 1); await page.click('.qa-solve');
  ok(!(await goBtn()).disabled, 'key lock toy: the QA solver gets through it');
  await page.setViewportSize({ width: 320, height: 640 }); await openAt('1-2', 1);
  ok(await overflow() <= 1, 'key lock toy: fits 320px'); await page.click('.qa-solve'); ok(await overflow() <= 1, 'key lock toy: finished state fits 320px');
  await page.setViewportSize({ width: 360, height: 740 });

  /* ================================================================ 4. the lock toy keeps the covenant word for the stamp (lesson 1.3) */
  await openAt('1-3', 1);
  t = await mainText();
  ok(!/covenant/i.test(t) && /Key lock \+ rule/.test(t) && /Try a sneaky spend on the lock with a rule/.test(t), 'lock toy in lesson 1.3 says "rule", not "covenant", before the reveal');
  await clickText('.seg button', 'Key lock + rule');
  await clickText('.tries .btn', 'All 10 go to Mallory');
  t = await mainText();
  ok(/The rule looked at the new envelopes/.test(t) && !/covenant/i.test(t) && !(await goBtn()).disabled, 'lock toy: a blocked spend is explained without the covenant word');
  await shot('gate-plain');
  /* the result must be on screen after the tap, even on a short phone (it used to land below the fold) */
  for (const [w, hh] of [[360, 640], [320, 568]]) {
    await page.setViewportSize({ width: w, height: hh }); await openAt('1-3', 1);
    await clickText('.seg button', 'Key lock + rule'); await clickText('.tries .btn', 'All 10 go to Mallory'); await page.waitForTimeout(200);
    const vis = await page.evaluate(() => { const r = document.querySelector('.res').getBoundingClientRect(), b = document.querySelector('.p-main').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), mainBottom: Math.round(b.bottom) }; });
    ok(vis.bottom <= vis.mainBottom + 1 && vis.top >= 0, 'lock toy result is on screen after a tap at ' + w + 'x' + hh + ' ' + JSON.stringify(vis));
  }
  await page.setViewportSize({ width: 360, height: 740 }); await openAt('1-3', 1);
  await closePlayer(); await page.evaluate(() => { location.hash = '#/lab/toy/gate'; }); await page.waitForSelector('.seg');
  t = await page.evaluate(() => document.body.innerText);
  ok(/Plain key lock/.test(t) && /Covenant lock/.test(t), 'the Lab keeps the real names on the same toy');
  await closePlayer();

  /* ================================================================ 5. Pro corners: open, no overflow, and under the speech bubble */
  for (const [id, i] of [['1-3', 5], ['1-6', 0], ['1-6', 2], ['1-6', 4], ['1-6', 6], ['1-7', 4], ['1-7', 7]]) {
    for (const w of [320, 360]) {
      await page.setViewportSize({ width: w, height: 700 }); await openAt(id, i);
      if (id === '1-3') await page.click('.rv-btn');
      const n = await page.evaluate(() => { const d = document.querySelectorAll('.p-main details.pro'); d.forEach(x => { x.open = true; }); return d.length; });
      ok(n >= 1 && (await overflow()) <= 1, id + ' step ' + i + ' at ' + w + 'px: Pro corner open, overflow ' + (await overflow()));
    }
  }
  await page.setViewportSize({ width: 360, height: 740 });
  await openAt('1-6', 4); await page.evaluate(() => document.querySelector('.p-main details.pro').open = true); await shot('pro-light'); await theme('dark'); await shot('pro-dark'); await theme('light');
  for (const w of [360, 700]) {
    await page.setViewportSize({ width: w, height: 800 }); await openAt('1-6', 0);
    const pos = await page.evaluate(() => { const b = document.querySelector('.p-main .bubble').getBoundingClientRect(), p = document.querySelector('.p-main details.pro').getBoundingClientRect(); return { below: p.top >= b.bottom - 1, left: Math.abs(p.left - b.left) <= 3 }; });
    ok(pos.below && (w > 400 || pos.left), 'a Pro corner on a say step sits under the bubble at ' + w + 'px (' + JSON.stringify(pos) + ')');
  }
  await page.setViewportSize({ width: 360, height: 740 });

  /* ================================================================ 6. the look back opens lesson 1.4 */
  await openAt('1-4', 0); await shot('lookback-0');
  await page.click('.p-go'); await page.click('.p-go');
  ok(await page.evaluate(() => !!document.querySelector('.sort-card') && document.querySelectorAll('.sort-prog i').length === 5), 'lesson 1.4: the lock sort shows five cards after the two Sil steps');
  const sorted = await page.evaluate(() => SK.lesson('1-4').steps[2].items.every(i => !/successor|output|introspection/i.test(i.t + ' ' + i.why)));
  ok(sorted, 'the sort cards use envelope words, not successor or outputs');
  await shot('lookback-sort');

  /* ================================================================ 7. wording: unearned terms stay out of the rest of the toys and hints */
  for (const [id, i] of [['1-2', 0], ['1-3', 0], ['1-7', 0], ['1-7', 1]]) {
    await openAt(id, i); const tx = await mainText();
    ok(!/successor|introspection|\bsompi\b|\bUTXO\b|P2SH/i.test(tx), id + ' step ' + i + ': no unearned term on screen (' + tx.slice(0, 60).replace(/\s+/g, ' ') + ')');
  }

  /* ================================================================ 8. light and dark look */
  for (const th of ['light', 'dark']) {
    await theme(th);
    await openAt('1-2', 1); await page.click('.qa-solve'); await shot('keylock-done-' + th);
    await openAt('1-3', 1); await page.click('.qa-solve'); await shot('gate-done-' + th);
    await openAt('1-3', 5); await page.click('.rv-btn'); await page.evaluate(() => document.querySelectorAll('.p-main details.pro').forEach(x => { x.open = true; })); await shot('reveal-introspection-' + th);
    await openAt('1-7', 7); await page.evaluate(() => document.querySelectorAll('.p-main details.pro').forEach(x => { x.open = true; })); await shot('sompi-end-' + th);
  }
  await theme('light'); await closePlayer();

  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  console.log('gentle checks passed: ' + passes + ' | failed: ' + fails);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
