/* UX flow checks for v2.4: welcome shortcut, resume, map folding, scroll memory, sheets, practice unlock paths.
   Run from the app root: NODE_PATH=$(npm root -g) node tests/ux.js */
const { chromium } = require('playwright');
const path = require('path');
const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
let fails = 0, passes = 0;
function ok(c, m) { if (c) passes++; else { fails++; console.log('FAIL: ' + m); } }
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(url);
  await page.evaluate(() => { SK.state.set.sound = false; SK.save(); });

  /* 1. welcome: first run, pick a level, land inside lesson 1.1 */
  await page.waitForSelector('.welcome');
  ok(await page.evaluate(() => document.activeElement.classList.contains('welcome')), 'welcome focuses the dialog, not the first option');
  await page.click('.wopt >> nth=0');
  await page.waitForSelector('.player');
  ok((await page.evaluate(() => location.hash)) === '#/lesson/1-1', 'new level opens lesson 1.1 directly');

  /* 2. leaving mid-lesson saves the place and shows no confirm */
  await page.click('.p-go'); await page.click('.p-go'); await page.waitForTimeout(100);
  const stepAt = await page.evaluate(() => SK.state.resume && Object.keys(SK.state.resume).length);
  await page.click('.p-x'); await page.waitForTimeout(150);
  ok(!(await page.$('.modal')), 'no confirm dialog when leaving a lesson');
  const saved = await page.evaluate(() => SK.state.resume['1-1']);
  ok(saved >= 1, 'resume index saved on leave (got ' + saved + ')');
  ok(!(await page.$('.player')), 'player closed');
  ok((await page.textContent('.un-k')).indexOf('Pick up') === 0, 'up-next card offers to pick up');
  ok((await page.textContent('.nd-go')) === 'Resume', 'current node says Resume');

  /* 3. resume lands on the saved step */
  await page.click('.upnext'); await page.waitForSelector('.player');
  const prog = await page.evaluate(() => document.querySelector('.p-bar i').style.width);
  ok(parseFloat(prog) > 0, 'resumed lesson shows progress');
  await page.click('.p-x'); await page.waitForTimeout(100);

  /* 4. locked nodes toast instead of a sheet; locked worlds start folded; peek works */
  await page.click('.pn.s-locked >> nth=0'); await page.waitForSelector('.toast');
  ok(!(await page.$('.modal')), 'locked node shows toast, not a sheet');
  const closedFolded = await page.evaluate(() => Array.from(document.querySelectorAll('.world.closed')).every(w => w.classList.contains('fold')));
  ok(closedFolded, 'locked worlds are folded by default');
  await page.evaluate(() => { document.querySelector('.world.closed .wb').click(); });
  ok(await page.evaluate(() => !document.querySelector('.world.closed').classList.contains('fold')), 'tapping a locked world header peeks inside');

  /* 5. start over: sheet from the resume-bearing node when it is not the current one */
  await page.evaluate(() => { SK.state.done['1-1'] = { stars: 2, best: 2 }; SK.state.resume = { '1-2': 3 }; SK.save(); location.hash = '#/practice'; });
  await page.evaluate(() => { location.hash = '#/learn'; });
  await page.waitForSelector('.pn.current');
  await page.click('.pn.s-done >> nth=0'); await page.waitForSelector('.modal');
  ok((await page.textContent('.modal .modal-actions .btn')).indexOf('Replay') === 0, 'done lesson sheet offers Replay');
  await page.click('.grab'); await page.waitForTimeout(400);
  ok(!(await page.$('.modal')), 'grab handle closes the sheet');

  /* 5b. dragging the handle down dismisses the sheet; the current node with a saved place offers resume or restart */
  await page.click('.pn.current'); await page.waitForSelector('.modal'); await page.waitForTimeout(450);
  const acts = await page.$$eval('.modal .modal-actions .btn', bs => bs.map(b => b.textContent));
  ok(acts.join('|') === 'Start over|Resume', 'resume node sheet offers Start over and Resume (' + acts.join('|') + ')');
  const gb = await (await page.$('.grab')).boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + 10); await page.mouse.down(); await page.mouse.move(gb.x + gb.width / 2, gb.y + 80, { steps: 5 }); await page.mouse.move(gb.x + gb.width / 2, gb.y + 180, { steps: 5 }); await page.mouse.up();
  await page.waitForTimeout(450);
  ok(!(await page.$('.modal')), 'dragging the handle down closes the sheet');

  /* 6. scroll memory: leave Learn deep, come back, same place */
  await page.evaluate(() => window.scrollTo(0, 500)); await page.waitForTimeout(100);
  await page.evaluate(() => { location.hash = '#/lab'; }); await page.waitForTimeout(150);
  ok((await page.evaluate(() => window.scrollY)) === 0, 'new tab starts at top');
  await page.evaluate(() => { location.hash = '#/learn'; }); await page.waitForTimeout(200);
  const back = await page.evaluate(() => window.scrollY);
  ok(Math.abs(back - 500) < 30, 'Learn restores its scroll position (got ' + back + ')');

  /* 7. opening a lesson from the map and leaving keeps the map in place */
  await page.evaluate(() => window.scrollTo(0, 300)); await page.waitForTimeout(80);
  await page.evaluate(() => { location.hash = '#/lesson/1-2'; }); await page.waitForSelector('.player'); await page.click('.p-x'); await page.waitForTimeout(250);
  const y2 = await page.evaluate(() => window.scrollY);
  ok(Math.abs(y2 - 300) < 30, 'map scroll survives a lesson round trip (got ' + y2 + ')');

  /* 8. floating continue pill shows once the up-next card is off screen */
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForFunction(() => document.querySelector('.fab').classList.contains('show'), null, { timeout: 4000 }).catch(() => {});
  const fabInfo = await page.evaluate(() => ({ y: window.scrollY, h: document.documentElement.scrollHeight, show: document.querySelector('.fab').classList.contains('show'), up: document.querySelector('.upnext').getBoundingClientRect().top, nfab: document.querySelectorAll('.fab').length, hash: location.hash, io: !!SK.unwatchLearn }));
  ok(fabInfo.show, 'continue pill appears when scrolled past up-next ' + JSON.stringify(fabInfo));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => !document.querySelector('.fab').classList.contains('show'), null, { timeout: 4000 }).catch(() => {});
  ok(await page.evaluate(() => !document.querySelector('.fab').classList.contains('show')), 'continue pill hides at the top');

  /* 9. Today sheet from the chips */
  await page.click('.chip.xp'); await page.waitForSelector('.modal .td');
  ok((await page.textContent('.modal h2')) === 'Today', 'XP chip opens the Today sheet');
  await page.keyboard.press('Escape'); await page.waitForTimeout(350);
  ok(!(await page.$('.modal')), 'Escape closes the sheet');

  /* 10. practice: locked cards point at the next lesson instead of dead-ending */
  await page.evaluate(() => { SK.state.done = {}; SK.state.resume = {}; SK.save(); location.hash = '#/practice'; });
  await page.waitForSelector('.pcard.off');
  const href = await page.evaluate(() => document.querySelector('a.pcard.off').getAttribute('href'));
  ok(href === '#/lesson/1-1', 'locked practice card links to the next lesson (' + href + ')');

  /* 11. mistakes badge on the Practice tab */
  await page.evaluate(() => { SK.state.mistakes = ['1-1:5']; SK.save(); SK.refreshChrome(); });
  const badge = await page.evaluate(() => { const b = document.querySelector('.tbadge'); return b ? b.textContent : null; });
  ok(badge === null || badge === '1', 'review badge matches valid mistakes');

  /* 12. no horizontal overflow on any tab at 320 and 360 */
  for (const w of [320, 360, 412]) {
    await page.setViewportSize({ width: w, height: 740 });
    for (const h of ['#/learn', '#/practice', '#/lab', '#/words', '#/ops', '#/cheat', '#/you']) {
      await page.evaluate(h => { location.hash = h; }, h); await page.waitForTimeout(80);
      const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(o <= 1, 'no horizontal scroll at ' + w + ' on ' + h + ' (' + o + ')');
    }
  }
  ok(errs.length === 0, 'no page errors: ' + errs.join('|'));
  console.log('ux checks passed: ' + passes + ' | failed: ' + fails);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
