/* Content validator. Run: node tests/validate.js
   Loads the data and lesson files in a sandbox (no browser) and checks every step. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..');
const sandbox = { window: {} }; sandbox.window.SK = {}; vm.createContext(sandbox);
const files = ['js/data/glossary.js', 'js/data/examples.js', 'js/data/reference.js', 'js/data/worlds.js']
  .concat(fs.readdirSync(path.join(root, 'js/lessons')).filter(f => /^w\d\.js$/.test(f)).sort().map(f => 'js/lessons/' + f));
files.forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f }));
const SK = sandbox.window.SK;
const widgetSrc = fs.readFileSync(path.join(root, 'js/ui/widgets.js'), 'utf8');
const widgets = new Set([...widgetSrc.matchAll(/W\.(\w+) = function/g)].map(m => m[1]));
const errs = [], warns = [];
const E = (id, msg) => errs.push(id + ': ' + msg), W = (id, msg) => warns.push(id + ': ' + msg);
const TEACH = ['say', 'reveal', 'compare', 'explore', 'table', 'code', 'widget'];
const ids = new Set();
/* Grounding: every line a learner must write has to appear in a docs-badged contract (js/data/examples.js).
   A build/bug-fix step may name its contract with src: 'timeout'. Use sketch: true to opt out on purpose. */
const docLinesOf = src => (src && SK.examples[src] ? [SK.examples[src]] : Object.keys(SK.examples).map(k => SK.examples[k])).reduce((a, e) => a.concat(e.lines.map(L => L[0].trim())), []);
const inDocs = (txt, src) => docLinesOf(src).some(l => l.includes(txt));
/* keep identical to joinTokens in js/ui/quiz.js */
const joinTokens = t => { let o = ''; t.forEach((x, i) => { o = !i ? x : (/^[),;\].]/.test(x) || /[(\[.]$/.test(o)) ? o + x : o + ' ' + x; }); return o; };
const typeCount = {};
let counts = { lessons: 0, steps: 0, quiz: 0, words: 0 };

function texts(step) {
  const out = [];
  const walk = v => { if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.keys(v).forEach(k => walk(v[k])); };
  walk(step); return out;
}
SK.lessons.forEach(l => {
  counts.lessons++;
  if (ids.has(l.id)) E(l.id, 'duplicate lesson id'); ids.add(l.id);
  if (!/^[1-6]-\d$/.test(l.id)) E(l.id, 'bad id');
  ['title', 'blurb'].forEach(k => { if (!l[k]) E(l.id, 'missing ' + k); });
  if (!l.min) E(l.id, 'missing min');
  if (!l.steps || l.steps.length < 6) E(l.id, 'too few steps');
  if (!l.steps.some(s => s.t === 'say')) W(l.id, 'no Sil step');
  const quizN = l.steps.filter(s => SK.QUIZ[s.t]).length;
  if (quizN < 3) W(l.id, 'only ' + quizN + ' questions');
  const firstQuiz = l.steps.findIndex(s => SK.QUIZ[s.t]), lastTeach = l.steps.map(s => !SK.QUIZ[s.t]).lastIndexOf(true);
  l.steps.forEach((s, i) => {
    const id = l.id + '#' + i + '(' + s.t + ')'; counts.steps++;
    if (!TEACH.includes(s.t) && !SK.QUIZ[s.t]) return E(id, 'unknown step type');
    texts(s).forEach(t => {
      (t.match(/\[\[([a-z0-9-]+)(?:\|[^\]]+)?\]\]/g) || []).forEach(m => { const g = m.replace(/\[\[|\]\]|\|.*$/g, ''); if (!SK.gloss[g]) E(id, 'unknown glossary id ' + g); });
      if (/\u2014/.test(t)) W(id, 'em dash in text');
      if (/\*\*[^*]*$/.test(t.replace(/\*\*[^*]+\*\*/g, ''))) E(id, 'unbalanced ** in: ' + t.slice(0, 40));
      if ((t.match(/`/g) || []).length % 2) E(id, 'odd backticks in: ' + t.slice(0, 50));
    });
    if (SK.QUIZ[s.t]) {
      counts.quiz++; typeCount[s.t] = (typeCount[s.t] || 0) + 1;
      if (!s.q) E(id, 'missing q');
      if (!s.why) E(id, 'missing why');
    }
    switch (s.t) {
      case 'say': if (!s.x) E(id, 'missing x'); break;
      case 'reveal': if (!s.plain || !(s.term || s.id)) E(id, 'bad reveal'); if (s.id && !SK.gloss[s.id]) E(id, 'unknown gloss ' + s.id); break;
      case 'compare': if (!s.a || !s.b || !s.a.items.length) E(id, 'bad compare'); break;
      case 'explore': if (!s.items || s.items.length < 2) E(id, 'bad explore'); s.items.forEach(it => { if (!it.h || !it.x) E(id, 'explore item incomplete'); }); break;
      case 'table': if (!s.cols || !s.rows || s.rows.some(r => r.length !== s.cols.length)) E(id, 'bad table'); break;
      case 'code': if (s.ex) { if (!SK.examples[s.ex]) E(id, 'unknown example ' + s.ex); } else if (!s.lines || !s.lines.length) E(id, 'no lines'); break;
      case 'widget': if (!widgets.has(s.w)) E(id, 'unknown widget ' + s.w); break;
      case 'mc': if (!s.opts || s.opts.length < 3 || s.opts.length > 4) E(id, 'mc needs 3-4 opts'); if (!(s.a >= 0 && s.a < s.opts.length)) E(id, 'a out of range'); if (new Set(s.opts).size !== s.opts.length) E(id, 'duplicate options'); break;
      case 'tf': if (typeof s.a !== 'boolean') E(id, 'tf a must be boolean'); break;
      case 'fill': { const n = (s.text.match(/___/g) || []).length; if (n !== s.a.length) E(id, 'blank count ' + n + ' != answers ' + s.a.length); s.a.forEach(a => { if (!s.chips.includes(a)) E(id, 'chip missing for ' + a); }); if (s.chips.length > 6) W(id, 'many chips'); break; }
      case 'order': if (!s.items || s.items.length < 3) E(id, 'order needs 3+ items');
        if (s.extra) { if (!Array.isArray(s.extra) || !s.extra.length || s.extra.some(x => typeof x !== 'string')) E(id, 'extra must be a list of strings'); else { if (s.extra.length > 3) W(id, 'many decoys'); s.extra.forEach(x => { if (s.items.includes(x)) E(id, 'decoy equals a real item: ' + x); }); if (!s.mono) W(id, 'decoys without mono'); } }
        if (s.src && !SK.examples[s.src]) E(id, 'unknown src ' + s.src);
        if (s.mono && !s.sketch) s.items.forEach(it => { const t = it.trim(); if (t !== '}' && !inDocs(t, s.src)) W(id, 'order line not found in the docs contracts: ' + t); });
        break;
      case 'slots': if (!s.slots || !s.pieces || s.a.length !== s.slots.length || s.a.some(i => i >= s.pieces.length)) E(id, 'bad slots');
        else { if (new Set(s.a).size !== s.a.length) E(id, 'slots answers repeat a piece'); if (new Set(s.pieces).size !== s.pieces.length) E(id, 'duplicate pieces');
          if (s.src && !SK.examples[s.src]) E(id, 'unknown src ' + s.src);
          if (s.mono && !s.sketch) s.a.forEach(i => { if (!inDocs(s.pieces[i].trim(), s.src)) E(id, 'slots piece not found in the docs contracts: ' + s.pieces[i]); }); }
        break;
      case 'match': if (!s.pairs || s.pairs.length < 3 || s.pairs.length > 5) E(id, 'match needs 3-5 pairs'); break;
      case 'bug': if (!s.lines || !(s.bug >= 0 && s.bug < s.lines.length)) { E(id, 'bug index'); break; }
        if (s.fix) {
          const f = s.fix;
          if (!f.opts || f.opts.length < 3 || f.opts.length > 4) E(id, 'fix needs 3-4 opts');
          else if (!(f.a >= 0 && f.a < f.opts.length)) E(id, 'fix a out of range');
          else {
            if (new Set(f.opts.map(x => x.trim())).size !== f.opts.length) E(id, 'duplicate fix options');
            const good = f.opts[f.a].trim();
            if (good === s.lines[s.bug].trim()) E(id, 'the fix equals the buggy line');
            if (s.src && !SK.examples[s.src]) E(id, 'unknown src ' + s.src);
            if (!s.sketch && !inDocs(good, s.src)) E(id, 'fix not found in the docs contracts: ' + good);
          }
        }
        break;
      case 'build': {
        const acc = Array.isArray(s.a) && typeof s.a[0] === 'string' ? [s.a] : s.a;
        if (!Array.isArray(s.tokens) || s.tokens.length < 4 || s.tokens.some(t => typeof t !== 'string' || !t)) { E(id, 'build needs 4+ string tokens'); break; }
        if (!Array.isArray(acc) || !acc.length || acc.some(a => !Array.isArray(a) || !a.length)) { E(id, 'build needs an answer sequence'); break; }
        if (s.tokens.length > 12) W(id, 'many pieces (' + s.tokens.length + ')');
        s.tokens.forEach(t => { if (t.length > 32) W(id, 'long piece: ' + t); });
        const need = a => { const m = {}; a.forEach(t => m[t] = (m[t] || 0) + 1); return m; }, have = need(s.tokens);
        acc.forEach(a => { const n = need(a); Object.keys(n).forEach(t => { if ((have[t] || 0) < n[t]) E(id, 'piece "' + t + '" missing from tokens (needs ' + n[t] + ')'); }); });
        if (new Set(acc.map(a => JSON.stringify(a))).size !== acc.length) W(id, 'duplicate accepted answers');
        if (s.tokens.length <= Math.max.apply(null, acc.map(a => a.length))) W(id, 'no decoy pieces');
        if (s.src && !SK.examples[s.src]) E(id, 'unknown src ' + s.src);
        const line = joinTokens(acc[0]);
        if (!s.sketch && !inDocs(line, s.src)) E(id, 'answer not found in the docs contracts: ' + line);
        if (s.before && !Array.isArray(s.before) || s.after && !Array.isArray(s.after)) E(id, 'before/after must be lists');
        break;
      }
      case 'sort': if (!s.buckets || !s.items || s.items.some(i => !(i.b >= 0 && i.b < s.buckets.length) || !i.why)) E(id, 'bad sort'); break;
    }
  });
  if (firstQuiz < 2) W(l.id, 'quiz starts very early');
  if (lastTeach > l.steps.length - 1) W(l.id, 'ends on teaching'); // informational
});
/* World 1 is "no code yet": a term that a reveal step names (UTXO, Signature, Covenant, ...) may not appear in lesson text
   before that reveal. The plain words come first and the stamp names the idea. Pro corners are opt-in, so they are exempt;
   so are lesson titles and blurbs, which name the topic on the map. */
(function earnedTerms() {
  const reveals = [];
  SK.lessonsOf(1).forEach((l, li) => l.steps.forEach((s, si) => { if (s.t === 'reveal' && (s.term || s.id)) reveals.push({ term: s.term || SK.gloss[s.id].term, at: li * 1000 + si }); }));
  const noPro = step => { const c = Object.assign({}, step); delete c.pro; return c; };
  SK.lessonsOf(1).forEach((l, li) => l.steps.forEach((s, si) => {
    const here = li * 1000 + si, id = l.id + '#' + si + '(' + s.t + ')';
    /* the plain words of a reveal come before its stamp, so they must not use the term; its explanation comes after */
    const text = s.t === 'reveal' ? [s.plain || ''] : texts(noPro(s));
    reveals.forEach(r => {
      if (r.at < here || (r.at === here && s.t !== 'reveal')) return;
      const re = new RegExp('\\b' + r.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:s|\'s|\u2019s)?\\b', 'i');
      if (text.some(t => re.test(t.replace(/\[\[[a-z0-9-]+\|([^\]]+)\]\]/g, '$1')))) E(id, 'uses "' + r.term + '" before its reveal (lesson ' + SK.lessonsOf(1)[Math.floor(r.at / 1000)].id + ' step ' + (r.at % 1000) + '). Use plain words until the stamp.');
    });
  }));
})();
/* a "lesson 1-6" mentioned in text must be a lesson that exists (lessons were renumbered once; a stale pointer is easy to miss) */
SK.lessons.forEach(l => l.steps.forEach((s, si) => texts(s).forEach(t => { (t.match(/\blessons? (\d-\d)\b/gi) || []).forEach(m => { const id = m.split(' ')[1]; if (!SK.lesson(id)) E(l.id + '#' + si, 'points at lesson ' + id + ', which does not exist'); }); })));
SK.worlds.forEach(w => {
  const n = SK.lessonsOf(w.id).length, keys = SK.bossKeys(w.id).length;
  if (!n) E('world' + w.id, 'no lessons');
  if (keys < 6) W('world' + w.id, 'boss pool only ' + keys);
  console.log('World ' + w.id + ' ' + w.name.padEnd(16) + n + ' lessons, boss pool ' + keys);
});
Object.keys(SK.examples).forEach(k => SK.examples[k].lines.forEach((L, i) => { if (!Array.isArray(L) || typeof L[0] !== 'string') E('example ' + k, 'bad line ' + i); }));
SK.exOrder.forEach(k => { if (!SK.examples[k]) E('exOrder', 'missing ' + k); });
const toyBlock = widgetSrc.slice(widgetSrc.indexOf('SK.toys = ['));
[...toyBlock.matchAll(/w: '(\w+)'/g)].forEach(m => { if (!widgets.has(m[1])) E('toy', 'unknown widget ' + m[1]); });
counts.words = SK.glossary.length;
const wc = SK.lessons.reduce((n, l) => n + JSON.stringify(l.steps).split(/\s+/).length, 0);
console.log(JSON.stringify(counts), '| ~' + wc + ' words of lesson content | opcodes ' + SK.opcodes.length + ' | cheat sections ' + SK.cheat.length);
const recog = (typeCount.mc || 0) + (typeCount.tf || 0) + (typeCount.match || 0);
console.log('question types:', JSON.stringify(typeCount), '| pick-the-answer (mc, tf, match): ' + Math.round(recog / counts.quiz * 100) + '%');
warns.forEach(w => console.log('warn  ' + w));
errs.forEach(e => console.log('ERROR ' + e));
console.log(errs.length ? errs.length + ' error(s)' : 'content OK');
process.exit(errs.length ? 1 : 0);
