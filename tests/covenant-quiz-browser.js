/* Covenants Quiz in a real browser: landing, a full round, the result view, the share card, the share text, the privacy and CSP rules.
   Usage: node tests/covenant-quiz-browser.js   (needs Playwright, like tests/browser.js) */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
(async () => {
  /* served over http so the share link uses the page's own address and the CSP is the real one */
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
  const server = http.createServer((req, res) => {
    const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
  }).listen(0);
  const base = 'http://localhost:' + server.address().port + '/';
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true, acceptDownloads: true });
  const page = await ctx.newPage(), errors = [], outbound = []; let passed = 0;
  const ok = (c, m) => { if (c) passed++; else errors.push('FAIL: ' + m); };
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('request', r => { if (!r.url().startsWith(base) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) outbound.push(r.url()); });
  await ctx.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI)); window.__opened = []; window.open = (u, t, f) => { window.__opened.push([u, t, f]); return null; }; });

  /* 1. a stranger arriving by a challenge link: no welcome overlay, the banner shows, the quiz is one tap away */
  await page.goto(base + '#/quiz/8');
  await page.waitForSelector('.cq-hero');
  ok(!(await page.$('.welcome')), 'a quiz link skips the welcome screen');
  ok((await page.textContent('.cq-chal')).includes('8/10') && (await page.textContent('.cq-chal')).includes('Family Historian'), 'challenge banner names the score and the title');
  ok(await page.evaluate(() => SK.state.xp === 0 && !SK.state.level), 'landing changes no progress');
  await page.evaluate(() => { SK.state.set.sound = false; SK.state.set.motion = false; SK.applyTheme(); });
  await page.goto(base + '#/quiz/99'); await page.waitForSelector('.cq-hero');
  ok(!(await page.$('.cq-chal')), 'a junk challenge value is ignored');

  /* 2. play a round: answer the first 7 right and the last 3 wrong, exercising both outcomes */
  await page.goto(base + '#/quiz/8'); await page.waitForSelector('.cq-hero');
  await page.click('.cq-hero .btn');
  await page.waitForSelector('.player.kind-quiz');
  for (let i = 0; i < 10; i++) {
    await page.waitForSelector('.p-step .q');
    const info = await page.evaluate(() => { const t = document.querySelector('.q-text').textContent; const q = SK.quizBank.find(b => SK.fmt(b.q, true).replace(/<[^>]+>/g, '') === t); return q ? { tier: q.tier, id: q.id } : null; });
    ok(!!info, 'question ' + (i + 1) + ' comes from the bank');
    if (info) ok(info.tier === (i < 3 ? 1 : i < 7 ? 2 : 3), 'question ' + (i + 1) + ' is in the right tier (easiest first)');
    const wantRight = i < 7;
    await page.evaluate(wr => {
      const t = document.querySelector('.q-text').textContent, q = SK.quizBank.find(b => SK.fmt(b.q, true).replace(/<[^>]+>/g, '') === t);
      const opts = [...document.querySelectorAll('.opt')];
      const rightText = q.t === 'tf' ? (q.a ? 'True' : 'False') : q.opts[q.a].replace(/`/g, '');
      const right = opts.find(o => o.querySelector('.lab').textContent.trim() === rightText.trim());
      const wrong = opts.find(o => o !== right);
      (wr ? right : wrong).click();
    }, wantRight);
    await page.click('.p-go');
    await page.waitForSelector('.p-sheet:not([hidden])');
    await page.click('.p-sheet .btn');
  }

  /* 3. the result view */
  await page.waitForSelector('.cq-res');
  const res = await page.evaluate(() => ({ h1: document.querySelector('.cq-res h1').textContent, state: JSON.parse(JSON.stringify(SK.state)), aria: document.querySelector('.cq-card').getAttribute('aria-label') }));
  ok(res.h1 === 'You scored 7/10', 'result says 7/10 (got "' + res.h1 + '")');
  ok(res.state.quiz.best === 7 && res.state.quiz.plays === 1, 'best score and play count are remembered');
  ok(res.state.xp === 0 && res.state.streak === 0 && res.state.mistakes.length === 0 && res.state.stats.total === 0, 'the quiz adds no XP, streak, Review entries or stats');
  ok(/Missed questions 8, 9, 10/.test(res.aria), 'the card has a text alternative naming the missed questions');
  ok((await page.textContent('.cq-res')).includes('Copycat Catcher'), 'tier for 7 is Copycat Catcher');
  ok((await page.textContent('.cq-res')).includes('beat your friend') === false && (await page.textContent('.cq-res')).includes('Your friend scored 8/10'), 'challenge comparison shown (7 < 8)');
  await page.waitForSelector('.cq-card canvas');

  /* 4. the card: right size, not blank, and the pixels differ for right and wrong squares */
  const card = await page.evaluate(() => {
    const c = document.querySelector('.cq-card canvas'), x = c.getContext('2d');
    const px = (a, b) => Array.from(x.getImageData(a, b, 1, 1).data).join(',');
    return { w: c.width, h: c.height, right: px(80 + 8, 528 + 8), wrong: px(80 + 9 * 62 + 8, 528 + 8), bg: px(600, 20), sil: px(985, 300) };
  });
  ok(card.w === 1200 && card.h === 675, 'card is 1200x675');
  ok(card.right !== card.wrong, 'a right square and a wrong square are drawn differently');
  ok(card.right.startsWith('55,214,180') && card.wrong.startsWith('255,127,144'), 'right is teal and wrong is coral (' + card.right + ' / ' + card.wrong + ')');
  const bg = card.bg.split(',').map(Number); ok(bg[0] < 70 && bg[1] < 70 && bg[2] < 120 && bg[2] > bg[0], 'background is the deep ink-to-indigo gradient (' + card.bg + ')');
  ok(card.sil !== card.bg, 'the mascot is drawn on the card');
  const shot = await page.$('.cq-card'); await shot.screenshot({ path: path.join(require('os').tmpdir(), 'cq-card-preview.png') });

  /* 5. share text and actions */
  const text = await page.evaluate(() => SK.quizShareText(7, [true, true, true, true, true, true, true, false, false, false]));
  ok(text.includes('7/10') && text.includes('Copycat Catcher') && text.includes('\uD83D\uDFE9'.repeat(7) + '\uD83D\uDFE5'.repeat(3)), 'share text has the score, the title and the emoji row');
  ok(text.includes(base + '#/quiz/7'), 'share link carries the score and the page\'s own address');
  ok(text.length - text.indexOf('http') < 120 && text.replace(/http\S+/, 'x'.repeat(23)).length <= 280, 'share text fits in one post');
  await page.waitForFunction(() => !document.querySelector('.cq-acts .btn:nth-child(3)').disabled);
  const dl = page.waitForEvent('download');
  await page.click('.cq-acts .btn:nth-child(3)');
  const d = await dl; ok(d.suggestedFilename() === 'sillykuest-covenants-quiz-7-of-10.png', 'saved file is named with the score');
  const p = await d.path(); const png = fs.readFileSync(p); ok(png.slice(1, 4).toString() === 'PNG' && png.length > 20000, 'saved file is a real PNG (' + png.length + ' bytes)');
  await page.click('.cq-acts .btn:nth-child(2)');
  const opened = await page.evaluate(() => window.__opened);
  ok(opened.length === 1 && opened[0][0].startsWith('https://x.com/intent/post?text=') && /noopener/.test(opened[0][2]), 'Post on X opens the compose link, noopener');
  ok(decodeURIComponent(opened[0][0].split('text=')[1]) === text, 'the post text is exactly the share text');
  const canShare = await page.evaluate(() => { try { return !!(navigator.share && navigator.canShare && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] })); } catch (e) { return false; } });
  ok((await page.$eval('.cq-acts .btn:first-child', b => b.hidden)) === !canShare, 'the Share button shows only when the browser can share files');

  /* 6. onboarding: a first-timer who taps Start the quest gets a suggested level and lands on lesson 1.1 */
  await page.click('.cq-cta .btn');
  await page.waitForFunction(() => location.hash === '#/lesson/1-1');
  ok(await page.evaluate(() => SK.state.level === 'basics'), '7/10 suggests the "basics" level');
  await page.evaluate(() => SK.activePlayer && SK.activePlayer.close());

  /* 7. play again from the result screen works even though the hash does not change */
  await page.goto(base + '#/quiz/play'); await page.waitForSelector('.player.kind-quiz');
  ok(await page.evaluate(() => document.querySelectorAll('.p-step .q').length === 1), 'a direct #/quiz/play link starts a round');
  await page.evaluate(() => { SK.state.quiz.best = 0; });

  /* 8. privacy and CSP: no network calls, no policy violations, no leftover state outside the quiz key */
  ok(outbound.length === 0, 'no request left this origin: ' + outbound.join(', '));
  const csp = await page.evaluate(() => window.__csp); ok(csp.length === 0, 'no CSP violations: ' + csp.join(' | '));

  /* 9. the quiz is reachable from Practice, and old saved progress still loads (no quiz key) */
  await page.goto(base + '#/practice'); await page.waitForSelector('.pcard');
  ok((await page.textContent('main')).includes('Covenants Quiz'), 'Practice lists the Covenants Quiz');
  ok(await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('sillykuest.v2')); delete s.quiz; localStorage.setItem('sillykuest.v2', JSON.stringify(s)); return true; }), 'drop the quiz key');
  await page.reload(); await page.waitForSelector('.pcard');
  ok(await page.evaluate(() => SK.state.quiz && SK.state.quiz.best === 0 && SK.state.quiz.plays === 0), 'progress saved before 3.3.0 loads with a default quiz record');
  ok(await page.evaluate(() => { const c = SK.exportCode(); SK.state.quiz.best = 9; SK.importCode(c); return SK.state.quiz.best === 0; }), 'the progress code carries the quiz record');

  await browser.close(); server.close();
  console.log('covenant quiz browser checks passed: ' + passed + ' | failed: ' + errors.length);
  errors.forEach(e => console.log(e));
  process.exit(errors.length ? 1 : 0);
})();
