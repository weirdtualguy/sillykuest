/* Repository checks, Node only: node tests/repo.js
   Keeps the offline file list honest, the versions in sync and the repo clean before you push. */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('FAIL: ' + m); } };
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const exists = f => fs.existsSync(path.join(root, f));
function walk(dir, out = []) {
  for (const n of fs.readdirSync(path.join(root, dir))) {
    if (n === 'node_modules' || n === '.git') continue;
    const rel = path.posix.join(dir, n), st = fs.statSync(path.join(root, rel));
    if (st.isDirectory()) walk(rel, out); else out.push(rel);
  }
  return out;
}
const all = walk('.').map(f => f.replace(/^\.\//, ''));

/* 1. index.html -> files */
const html = read('index.html');
const refs = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)].map(m => m[1]).filter(u => !/^(https?:)?\/\//.test(u));
refs.forEach(f => ok(exists(f), 'index.html references a missing file: ' + f));
const scripts = refs.filter(f => f.endsWith('.js'));
ok(scripts.indexOf('js/theme.js') >= 0 && scripts.indexOf('js/theme.js') < scripts.indexOf('js/core.js'), 'theme.js loads before core.js');
ok(!/<script(?![^>]*\ssrc=)[^>]*>/.test(html), 'index.html has an inline <script> (the CSP only allows files)');
ok(/Content-Security-Policy/.test(html), 'index.html carries a Content-Security-Policy');

/* 2. service worker list matches what the page loads */
const sw = read('sw.js');
const list = eval('(' + sw.match(/var FILES = (\[[\s\S]*?\]);/)[1] + ')');
ok(new Set(list).size === list.length, 'sw.js FILES has duplicates');
list.filter(f => f !== './').forEach(f => ok(exists(f), 'sw.js caches a missing file: ' + f));
refs.forEach(f => ok(list.indexOf(f) >= 0, 'index.html loads ' + f + ' but sw.js does not cache it'));
const man = JSON.parse(read('manifest.webmanifest'));
man.icons.forEach(i => { ok(exists(i.src), 'manifest icon missing: ' + i.src); if (/\.png$/.test(i.src)) ok(list.indexOf(i.src) >= 0, 'manifest icon not cached: ' + i.src); });
ok(list.indexOf('manifest.webmanifest') >= 0, 'manifest not cached');

/* 3. versions agree */
const core = read('js/core.js'), ver = (core.match(/SK\.version = '([^']+)'/) || [])[1];
const pkg = JSON.parse(read('package.json'));
ok(ver && pkg.version === ver, 'package.json version ' + pkg.version + ' != SK.version ' + ver);
ok((sw.match(/VERSION = 'sillykuest-([^']+)'/) || [])[1] === ver, 'sw.js VERSION does not match SK.version ' + ver);
ok(new RegExp('^## \\[?' + ver.replace(/\./g, '\\.')).test((read('CHANGELOG.md').match(/^## .*$/m) || [''])[0]), 'CHANGELOG.md top entry is not ' + ver);

/* 4. nothing about the old source document, no network, no leftovers */
const text = all.filter(f => /\.(js|css|html|md|json|yml|yaml|webmanifest|txt)$/.test(f) && f !== 'tests/repo.js');
const banned = [[new RegExp('S' + 'SOT', 'i'), 'mentions the old source document'], [new RegExp('from the ' + 'docs', 'i'), 'carries the removed "from the docs" label']];
text.forEach(f => { const s = read(f); banned.forEach(([re, why]) => ok(!re.test(s), f + ' ' + why)); });
all.filter(f => /^(js|css)\//.test(f) && f.endsWith('.js')).forEach(f => {
  const s = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  ok(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|https?:\/\//.test(s), f + ' makes or names a network request (the app must stay offline-only)');
  ok(!/\beval\s*\(|\bnew\s+Function\b|\bFunction\s*[.(]/.test(s), f + ' uses eval or the Function constructor (blocked by the CSP)');
});
all.forEach(f => ok(!/(\.bak|\.orig|\.rej|\.zip|\.DS_Store|^apply_.*\.js)$/.test(path.basename(f)) && !/\.bak/.test(f), 'leftover file: ' + f));
ok(!all.some(f => /^(SILLY-HANDOFF|IMPLEMENTATION_STATE\d*|CHANGES)\.md$/.test(f)), 'internal handoff or old changes files are still in the repo');

/* 5. repo files a public project needs */
['README.md', 'LICENSE', 'THIRD_PARTY.md', 'CHANGELOG.md', 'CONTRIBUTING.md', '.gitignore', '.editorconfig', '.nojekyll', '.github/workflows/ci.yml', '.github/workflows/pages.yml', 'docs/AUTHORING.md'].forEach(f => ok(exists(f), 'missing ' + f));
const donate = (core.match(/SK\.DONATE = '([^']*)'/) || [])[1];
ok(!!donate, 'SK.DONATE is empty');
ok(donate && read('README.md').indexOf(donate) >= 0, 'README.md does not show the donation name ' + donate);
const fonts = read('css/fonts.css'), tp = read('THIRD_PARTY.md');
[...fonts.matchAll(/font-family:"([^"]+)"/g)].map(m => m[1]).filter((v, i, a) => a.indexOf(v) === i).forEach(n => ok(tp.indexOf(n) >= 0, 'THIRD_PARTY.md does not credit the embedded font ' + n));

console.log('repo checks passed: ' + passes + ' | failed: ' + fails);
process.exit(fails ? 1 : 0);
