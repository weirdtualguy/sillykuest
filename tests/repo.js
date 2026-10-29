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
  let s = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  /* The only file allowed to name a URL is the share card: the app's own address (for the link in a post), the X compose page
     opened when someone taps "Post on X", and the SVG namespace the mascot image needs. fetch and XHR stay banned everywhere. */
  if (f === 'js/ui/covenant-quiz.js') s = s.split('https://weirdtualguy.github.io/sillykuest/').join('').split('https://x.com/intent/post').join('').split('http://www.w3.org/2000/svg').join('');
  ok(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|https?:\/\//.test(s), f + ' makes or names a network request (the app must stay offline-only)');
  ok(!/\beval\s*\(|\bnew\s+Function\b|\bFunction\s*[.(]/.test(s), f + ' uses eval or the Function constructor (blocked by the CSP)');
});
all.forEach(f => ok(!/(\.bak|\.orig|\.rej|\.zip|\.DS_Store|^apply_.*\.js)$/.test(path.basename(f)) && !/\.bak/.test(f), 'leftover file: ' + f));
ok(!all.some(f => /^(SILLY-HANDOFF|IMPLEMENTATION_STATE\d*|CHANGES)\.md$/.test(f)), 'internal handoff or old changes files are still in the repo');

/* 5. repo files a public project needs */
['README.md', 'LICENSE', 'THIRD_PARTY.md', 'CHANGELOG.md', 'CONTRIBUTING.md', '.gitignore', '.editorconfig', '.nojekyll', '.github/workflows/ci.yml', '.github/workflows/pages.yml', '.github/dependabot.yml', '.github/PULL_REQUEST_TEMPLATE.md', '.github/ISSUE_TEMPLATE/bug.yml', '.github/ISSUE_TEMPLATE/content-error.yml', 'SECURITY.md', 'docs/AUTHORING.md'].forEach(f => ok(exists(f), 'missing ' + f));
ok(/needs:\s*check/.test(read('.github/workflows/pages.yml')), 'pages.yml deploys without waiting for the checks job');
const donate = (core.match(/SK\.DONATE = '([^']*)'/) || [])[1];
ok(!!donate, 'SK.DONATE is empty');
ok(donate && read('README.md').indexOf(donate) >= 0, 'README.md does not show the donation address ' + donate);
/* a Kaspa address carries a checksum: catch a mistyped or truncated donation address */
(function () {
  const CS = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l', G = [0x98f2bc8e61n, 0x79b76d99e2n, 0xf33e5fb3c4n, 0xae2eabe2a8n, 0x1e4f43e470n];
  const m = /^(kaspa|kaspatest):([a-z0-9]+)$/.exec(donate || '');
  ok(!!m, 'SK.DONATE is not a kaspa: or kaspatest: address');
  if (!m) return;
  const vals = [...m[1]].map(c => c.charCodeAt(0) & 31).concat([0], [...m[2]].map(c => CS.indexOf(c)));
  ok(vals.every(v => v >= 0), 'SK.DONATE has a character a Kaspa address cannot contain');
  let c = 1n;
  vals.forEach(d => { const c0 = c >> 35n; c = ((c & 0x07ffffffffn) << 5n) ^ BigInt(d); G.forEach((g, i) => { if ((c0 >> BigInt(i)) & 1n) c ^= g; }); });
  ok((c ^ 1n) === 0n, 'SK.DONATE fails the Kaspa address checksum (mistyped or cut short?)');
})();
/* installed Android app: the area under the tab bar shows the manifest background_color, so it must match the dark theme */
{
  const manifest = JSON.parse(read('manifest.webmanifest')), dark = /dark \? '(#[0-9A-Fa-f]{6})'/.exec(read('js/theme.js'));
  ok(!!dark && String(manifest.background_color).toLowerCase() === dark[1].toLowerCase(), 'manifest background_color should equal the dark theme colour in js/theme.js (it shows under the tab bar in the installed app)');
}
const fonts = read('css/fonts.css'), tp = read('THIRD_PARTY.md');
[...fonts.matchAll(/font-family:"([^"]+)"/g)].map(m => m[1]).filter((v, i, a) => a.indexOf(v) === i).forEach(n => ok(tp.indexOf(n) >= 0, 'THIRD_PARTY.md does not credit the embedded font ' + n));

console.log('repo checks passed: ' + passes + ' | failed: ' + fails);
process.exit(fails ? 1 : 0);
