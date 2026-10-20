/* Behaviour test for the code-writing question types and the progress rules.
   The QA solver only walks the happy path; this one answers wrongly on purpose, retries, and checks the layout.
   Usage: NODE_PATH=$(npm root -g) node tests/qtypes.js [--shots dir]   (needs Playwright, like tests/browser.js) */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const args = process.argv.slice(2);
const shotsDir = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null;
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  let passed = 0;
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html') + '?qa=1');
  await page.evaluate(() => { SK.state.set.sound = false; SK.state.set.motion = false; SK.applyTheme(); SK.save(); });
  if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });
  const ok = (cond, msg) => { if (cond) passed++; else errors.push('FAIL: ' + msg); };
  const shot = async n => { if (shotsDir) await page.screenshot({ path: path.join(shotsDir, n + '.png') }); };
  const closePlayer = () => page.evaluate(() => { if (SK.activePlayer) SK.activePlayer.close(); });
  /* open one step of a lesson alone in a practice player */
  const open = (id, i) => page.evaluate(([id, i]) => { SK.play({ kind: 'practice', id: 't', title: 't', color: '#9A8CFF', steps: [{ step: SK.lesson(id).steps[i], key: null }] }); }, [id, i]);
  const tapChip = text => page.evaluate(t => { const b = [...document.querySelectorAll('.bank .chipbtn')].find(x => !x.disabled && x.textContent === t); if (b) b.click(); return !!b; }, text);
  const tapLine = n => page.evaluate(n => { const r = document.querySelectorAll('.bugbox .bl')[n]; r.click(); }, n);
  const tapOpt = text => page.evaluate(t => { const b = [...document.querySelectorAll('.bug-opts .opt')].find(x => x.textContent.trim() === t); if (b) b.click(); return !!b; }, text);
  const click = sel => page.click(sel);
  const sheet = () => page.evaluate(() => { const s = document.querySelector('.p-sheet:not([hidden])'); return s ? { cls: s.className, ans: (s.querySelector('.sh-ans') || {}).innerText || '' } : null; });
  const retryTag = () => page.evaluate(() => !!document.querySelector('.retry-tag'));
  const noOverflow = async label => { const o = await page.evaluate(() => { const m = document.querySelector('.p-main'); return m.scrollWidth - m.clientWidth; }); ok(o <= 1, label + ': horizontal overflow ' + o); };

  /* ---- build: wrong answer, answer shown, retry, right answer ---- */
  await open('2-6', 2); await noOverflow('build');
  ok(await page.evaluate(() => document.querySelector('.p-go').disabled), 'build: Check disabled while the line is empty');
  await tapChip('contract'); await tapChip('spend('); await shot('build-partial');
  ok(!(await page.evaluate(() => document.querySelector('.p-go').disabled)), 'build: Check enabled once a piece is placed');
  await click('.bline .tk');                      /* take a piece back */
  ok(await page.evaluate(() => document.querySelectorAll('.bline .tk').length) === 1, 'build: tapping a placed piece removes it');
  await click('.bclear');
  ok(await page.evaluate(() => document.querySelectorAll('.bline .tk').length) === 0, 'build: Clear empties the line');
  await tapChip('contract'); await tapChip('spend('); await tapChip('sig'); await tapChip('s'); await tapChip(') {');
  await click('.p-go'); let s = await sheet();
  ok(s && /bad/.test(s.cls) && s.ans.includes('entry spend(sig s) {'), 'build: wrong line shows the right line (' + JSON.stringify(s) + ')');
  await shot('build-wrong');
  await click('.p-sheet button');
  ok(await retryTag(), 'build: a missed question comes back once');
  for (const t of ['entry', 'spend(', 'sig', 's', ') {']) await tapChip(t);
  await shot('build-right-line'); await click('.p-go'); s = await sheet();
  ok(s && /ok/.test(s.cls), 'build: right line accepted'); await shot('build-right');
  await closePlayer();

  /* ---- build: alternate answer + duplicate pieces + context lines ---- */
  await open('3-7', 2);
  ok(await page.evaluate(() => !!document.querySelector('.bline')), 'build: renders');
  for (const t of ['require(', 'prev_state.count', '+', '1', '==', 'new_state.count', ');']) await tapChip(t);
  await click('.p-go'); s = await sheet(); ok(s && /ok/.test(s.cls), 'build: an equivalent order is accepted'); await closePlayer();
  await open('4-5', 4);
  for (const t of ['for(', 'i', ',', '0', ',', 'new_states.length', ',', 'max_outs', ') {']) await tapChip(t);
  await shot('build-long'); await noOverflow('build long');
  await click('.p-go'); s = await sheet(); ok(s && /ok/.test(s.cls), 'build: repeated pieces (commas) work'); await closePlayer();
  await open('5-5', 2); ok(await page.evaluate(() => document.querySelectorAll('.codeblock.ctx').length) === 2, 'build: before and after lines are shown');
  await shot('build-context'); await closePlayer();

  /* ---- bug + repair: wrong line, right line wrong fix, both right ---- */
  await open('3-4', 3); await noOverflow('bugfix');
  ok(await page.evaluate(() => document.querySelector('.bug-go').disabled), 'bugfix: button waits for a line');
  ok(await page.evaluate(() => document.querySelector('.p-go').hidden), 'bugfix: footer Check hidden (inline buttons)');
  await tapLine(1); await click('.bug-go'); s = await sheet();
  ok(s && /bad/.test(s.cls) && /Line 5 is the bug/.test(s.ans) && s.ans.includes('require(new_state.count == prev_state.count + 1);'), 'bugfix: wrong line shows line and fix (' + JSON.stringify(s) + ')');
  await click('.p-sheet button'); ok(await retryTag(), 'bugfix: comes back once');
  await tapLine(4); await click('.bug-go'); await shot('bugfix-stage2');
  ok(await page.evaluate(() => !document.querySelector('.bugfix').hidden), 'bugfix: repair options appear after the right line');
  await tapOpt('require(new_state.count >= prev_state.count + 1);'); await click('.bugfix .bug-go');
  s = await sheet(); ok(s && /bad/.test(s.cls) && /should read/.test(s.ans), 'bugfix: right line, wrong repair is a miss (' + JSON.stringify(s) + ')');
  await shot('bugfix-wrong'); await closePlayer();
  await open('3-4', 3); await tapLine(4); await click('.bug-go');
  await tapOpt('require(new_state.count == prev_state.count + 1);'); await click('.bugfix .bug-go'); s = await sheet();
  ok(s && /ok/.test(s.cls), 'bugfix: right line and right repair is a hit'); await shot('bugfix-right'); await closePlayer();

  /* ---- order with decoys, labeled slots ---- */
  await open('2-6', 6); await noOverflow('order extra');
  ok(await page.evaluate(() => document.querySelectorAll('.slot').length) === 4 && await page.evaluate(() => document.querySelectorAll('.bank .chipbtn').length) === 6, 'order: 4 slots, 6 pieces (2 decoys)');
  await shot('order-extra-empty');
  for (const t of ['entry reclaim(sig senderSig) {', '    require(tx.time <= timeout);', '    require(checkSig(senderSig, sender));', '}']) await tapChip(t);
  await click('.p-go'); s = await sheet(); ok(s && /bad/.test(s.cls) && s.ans.includes('require(tx.time >= timeout);'), 'order: decoy in a slot is wrong'); await shot('order-extra-wrong'); await closePlayer();
  await open('2-6', 5); await noOverflow('slots'); await shot('slots-empty');
  ok(await page.evaluate(() => { const n = document.querySelector('.slots-labeled .slot-n'); return n && n.getBoundingClientRect().width > 150; }), 'slots: label sits above the slot, full width');
  for (const t of ['require(checkSig(recipientSig, recipient));', 'require(checkSig(senderSig, sender));', 'require(tx.time <= timeout);']) await tapChip(t);
  await click('.p-go'); s = await sheet(); ok(s && /bad/.test(s.cls), 'slots: the <= decoy is wrong'); await closePlayer();

  /* ---- tables fit a phone: every cell stays inside the screen ---- */
  for (const [id, i] of [['3-5', 6], ['3-5', 11], ['5-3', 10], ['3-6', 3]]) {
    await open(id, i);
    const w = await page.evaluate(() => { const t = document.querySelector('.tbl-wrap'); return t ? t.scrollWidth - t.clientWidth : -1; });
    ok(w <= 1, id + '#' + i + ': table scrolls sideways by ' + w + 'px'); await closePlayer();
  }
  await page.evaluate(() => { location.hash = '#/lesson/3-5'; });

  /* ---- returning player: finishing W1 before it grew keeps World 2 open ---- */
  const open2 = await page.evaluate(() => {
    SK.state.set.openAll = false; SK.state.bosses = {};
    SK.state.done = { '1-1': { stars: 3 }, '1-2': { stars: 3 }, '1-3': { stars: 3 }, '1-4': { stars: 3 }, '2-1': { stars: 2 }, '2-2': { stars: 2 } };
    return { w2: SK.worldOpen(2), l23: SK.unlocked(SK.lesson('2-3')), l21: SK.unlocked(SK.lesson('2-1')), w3: SK.worldOpen(3), l15: SK.unlocked(SK.lesson('1-5')) };
  });
  ok(open2.w2 && open2.l23 && open2.l21 && open2.l15 && !open2.w3, 'progress: World 2 stays open for a player who had not reached the later World 1 lessons yet ' + JSON.stringify(open2));
  await page.evaluate(() => { SK.state.done = {}; SK.state.bosses = {}; });
  ok(await page.evaluate(() => !SK.worldOpen(2)), 'progress: a new player still starts with World 2 closed');

  /* ---- converted multiple-choice questions now ask for code ---- */
  const find = (id, q) => page.evaluate(([id, q]) => SK.lesson(id).steps.findIndex(s => s.q && s.q.indexOf(q) >= 0), [id, q]);
  const typeAt = (id, i) => page.evaluate(([id, i]) => SK.lesson(id).steps[i].t, [id, i]);
  let ix = await find('2-5', 'same lock'); ok(ix > 0 && await typeAt('2-5', ix) === 'build', 'converted: 2-5 lock check is a build task');
  await open('2-5', ix); await noOverflow('lock check');
  for (const x of ['require(', 'tx.inputs[this.activeInputIndex]', '.scriptPubKey', '==', 'tx.outputs[1]', '.scriptPubKey', ');']) await tapChip(x);
  await click('.p-go'); s = await sheet(); ok(s && /ok/.test(s.cls), 'converted: swapped sides of == are accepted, repeated .scriptPubKey pieces work'); await closePlayer();
  await open('2-5', ix);
  for (const x of ['require(', 'tx.outputs[0]', '.scriptPubKey', '==', 'tx.inputs[this.activeInputIndex]', '.scriptPubKey', ');']) await tapChip(x);
  await click('.p-go'); s = await sheet(); ok(s && /bad/.test(s.cls) && s.ans.includes('tx.outputs[1].scriptPubKey == tx.inputs[this.activeInputIndex].scriptPubKey'), 'converted: output 0 instead of output 1 is wrong and the answer joins correctly'); await closePlayer();
  ix = await find('4-1', 'full declaration'); ok(ix > 0 && await typeAt('4-1', ix) === 'build', 'converted: 4-1 N:M declaration is a build task');
  await open('4-1', ix); await noOverflow('N:M declaration'); await shot('convert-nm');
  for (const x of ['#[', 'covenant(', 'binding=cov', ',', 'from=max_ins', ',', 'to=max_outs', ',', 'mode=verification', ')', ']']) await tapChip(x);
  await click('.p-go'); s = await sheet(); ok(s && /ok/.test(s.cls), 'converted: the 12-piece declaration is accepted'); await closePlayer();
  ix = await find('6-4', 'never checks the length'); ok(ix > 0 && await typeAt('6-4', ix) === 'build', 'converted: 6-4 cast check is a build task');
  await open('6-4', ix); for (const x of ['require(', 'data.length', '==', '32', ');']) await tapChip(x);
  await click('.p-go'); s = await sheet(); ok(s && /ok/.test(s.cls), 'converted: data.length check accepted'); await closePlayer();
  const left = await page.evaluate(() => { const bad = []; SK.lessons.forEach(l => l.steps.forEach((st, i) => { if (st.t === 'build' && !(st.tokens && st.a)) bad.push(l.id + '#' + i); })); return bad; });
  ok(!left.length, 'every build step has tokens and answers ' + left.join(','));

  /* ---- 3-4 opens with a warm-up, not a quiz ---- */
  const first3 = await page.evaluate(() => SK.lesson('3-4').steps.slice(0, 3).map(s => s.t));
  ok(first3.join() === 'say,explore,order', '3-4 opening is say, explore, order (' + first3 + ')');

  /* ---- saved Review keys follow their questions when a step is inserted ---- */
  await page.evaluate(() => { localStorage.setItem('sillykuest.v2', JSON.stringify({ v: 2, mistakes: ['3-4:1', '3-4:2', '3-4:3', '1-1:4', '2-1:4'], done: { '1-1': { stars: 3 } } })); });
  await page.reload(); await page.waitForSelector('.learn');
  const mig = await page.evaluate(() => ({ m: SK.state.mistakes, mig: SK.state.mig, len: SK.KEYSHIFTS.length, t3: SK.stepByKey('3-4:3').t, t4: SK.stepByKey('3-4:4').t, done: !!SK.state.done['1-1'] }));
  ok(mig.m.join() === '3-4:2,3-4:3,3-4:4,1-1:4,2-1:4' && mig.mig === mig.len && mig.t3 === 'bug' && mig.t4 === 'bug' && mig.done, 'migration: an old save keeps pointing at the same questions ' + JSON.stringify(mig));
  await page.reload(); await page.waitForSelector('.learn');
  ok(await page.evaluate(() => SK.state.mistakes.join()) === '3-4:2,3-4:3,3-4:4,1-1:4,2-1:4', 'migration: runs once, not on every load');
  const imp = await page.evaluate(() => { const old = { v: 2, mistakes: ['3-4:2', '5-1:5'], done: {} }; const code = btoa(unescape(encodeURIComponent(JSON.stringify(old)))); const r = SK.importCode(code); return { r, m: SK.state.mistakes, mig: SK.state.mig, len: SK.KEYSHIFTS.length }; });
  ok(imp.r && imp.m.join() === '3-4:3,5-1:5' && imp.mig === imp.len, 'migration: an old progress code is migrated on import ' + JSON.stringify(imp));
  await page.evaluate(() => { SK.reset(); });
  ok(await page.evaluate(() => SK.state.mig === SK.KEYSHIFTS.length && !SK.state.mistakes.length), 'migration: a reset or new player starts up to date');

  /* ---- code workout route plays through ---- */
  await page.evaluate(() => { SK.state.set.openAll = true; SK.save(); });
  await page.evaluate(() => { location.hash = '#/code'; });
  try { await page.waitForSelector('.player', { timeout: 2500 }); } catch (e) { errors.push('FAIL: code workout did not open'); }
  let g = 0; while (g++ < 60) {
    if (await page.$('.player .done')) break;
    const sb = await page.$('.p-sheet:not([hidden]) button'); if (sb) { await sb.click(); continue; }
    const qa = await page.$('.qa-solve'); if (qa) await qa.click();
    const go = await page.$('.p-go:not([hidden])'); if (go && !(await go.evaluate(b => b.disabled))) await go.click();
  }
  ok(!!(await page.$('.player .done')), 'code workout: finishes'); await closePlayer();

  console.log('checks passed:', passed, '| problems:', errors.length);
  errors.forEach(e => console.log('  ' + e));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
