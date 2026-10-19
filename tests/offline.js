/* Offline check: serves the app on localhost, lets the service worker install, goes offline and reloads.
   Run from the app root: NODE_PATH=$(npm root -g) node tests/offline.js */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('FAIL: ' + m); } };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
server.listen(0, async () => {
  const base = 'http://localhost:' + server.address().port + '/';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(base); await page.waitForSelector('.welcome');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller || true, null, { timeout: 5000 });
  await page.waitForTimeout(800);
  const want = eval('(' + fs.readFileSync(path.join(root, 'sw.js'), 'utf8').match(/var FILES = (\[[\s\S]*?\]);/)[1] + ')').length;
  const info = await page.evaluate(async () => { const ks = await caches.keys(); const c = ks.length ? await (await caches.open(ks[0])).keys() : []; return { ks, n: c.length }; });
  ok(info.ks.length === 1 && info.ks[0] === 'sillykuest-' + require(path.join(root, 'package.json')).version, 'one cache named after the version: ' + info.ks);
  ok(info.n === want, 'every file in sw.js is cached: ' + info.n + ' of ' + want);
  /* really offline: stop the server (Playwright's setOffline does not reach the service worker's own requests) */
  await ctx.setOffline(true); server.closeAllConnections(); await new Promise(r => server.close(r));
  await page.reload(); await page.waitForSelector('.welcome', { timeout: 8000 }).catch(() => {});
  ok(!!(await page.$('.welcome, .learn')), 'the app loads with the network off');
  await page.evaluate(() => { SK.state.level = 'new'; SK.save(); location.hash = '#/lab'; });
  await page.waitForSelector('.lab', { timeout: 4000 }).catch(() => {});
  ok(!!(await page.$('.lab')), 'screens work offline');
  const miss = await page.evaluate(() => fetch('nope.js').then(r => 'status ' + r.status, () => 'network error'));
  ok(miss === 'network error', 'a missing script fails honestly instead of returning the app shell: ' + miss);
  ok(errs.filter(e => !/Failed to load resource|net::ERR/.test(e)).length === 0, 'no script errors: ' + errs.join(' | '));
  await browser.close();
  console.log('offline checks passed: ' + passes + ' | failed: ' + fails);
  process.exit(fails ? 1 : 0);
});
