/* Covenants Quiz data checks, Node only: node tests/covenant-quiz.js
   Keeps the bank honest: every question is well formed, traces to a real lesson, stands alone, and a draw is always a fair round. */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
global.window = global; global.document = {};
const SK = (window.SK = {});
SK.shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
for (const f of ['js/data/worlds.js', 'js/lessons/w1.js', 'js/lessons/w2.js', 'js/lessons/w3.js', 'js/lessons/w4.js', 'js/lessons/w5.js', 'js/lessons/w6.js', 'js/data/covenant-quiz.js'])
  (0, eval)(fs.readFileSync(path.join(root, f), 'utf8'));

let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('FAIL: ' + m); } };
const bank = SK.quizBank, ids = new Set();

bank.forEach(q => {
  const id = q.id || '(no id)';
  ok(/^q\d\d$/.test(id) && !ids.has(id), id + ': id is qNN and unique'); ids.add(id);
  ok([1, 2, 3].includes(q.tier), id + ': tier is 1, 2 or 3');
  ok(q.t === 'mc' || q.t === 'tf', id + ': type is mc or tf (the share-friendly types)');
  ok(typeof q.q === 'string' && q.q.length > 10 && q.q.length < 160, id + ': question text has a sensible length');
  ok(typeof q.why === 'string' && q.why.length > 10, id + ': has a why');
  ok(!!SK.lesson && !!SK.lesson(q.src), id + ': src ' + q.src + ' is a real lesson');
  /* a newcomer has seen no lesson: no references to a toy, a lesson or "the above" */
  ok(!/\b(above|the toy|in the lesson|this lesson|the counter above|you just)\b/i.test(q.q + ' ' + (q.opts || []).join(' ')), id + ': question stands alone');
  ok(!/\[\[|\]\]/.test(q.q + q.why + (q.opts || []).join('')), id + ': no glossary markup (it is not tappable here)');
  if (q.t === 'mc') {
    ok(Array.isArray(q.opts) && q.opts.length >= 3 && q.opts.length <= 4, id + ': 3 or 4 options');
    ok(new Set(q.opts).size === q.opts.length, id + ': options are distinct');
    ok(Number.isInteger(q.a) && q.a >= 0 && q.a < q.opts.length, id + ': a is an option index');
  } else ok(typeof q.a === 'boolean', id + ': tf answer is a boolean');
});

/* a round is fair: the right count per tier, easiest first, no repeats, stable across many draws */
for (let n = 0; n < 200; n++) {
  const r = SK.quizSteps(), tiers = r.map(x => x.step.tier), idl = r.map(x => x.step.id);
  if (n === 0) ok(r.length === SK.QUIZ_LEN, 'a round has ' + SK.QUIZ_LEN + ' questions');
  if (r.length !== SK.QUIZ_LEN || tiers.join('') !== [1, 1, 1, 2, 2, 2, 2, 3, 3, 3].join('') || new Set(idl).size !== idl.length) { ok(false, 'a draw is 3 easy + 4 medium + 3 hard, easiest first, no repeats: ' + tiers.join('')); break; }
}
[1, 2, 3].forEach(t => ok(bank.filter(q => q.tier === t).length >= SK.QUIZ_PICK[t] * 2, 'tier ' + t + ' has at least twice as many questions as one round draws (rounds stay varied)'));
const tf = bank.filter(q => q.t === 'tf'), tfTrue = tf.filter(q => q.a === true).length;
ok(tf.length >= 8 && tfTrue >= 1, 'a mix of true/false with at least one true (not all myths)');
const firsts = bank.filter(q => q.t === 'mc').map(q => q.a);
ok(firsts.every(a => a === 0), 'mc answers are authored first; the player shuffles them');

/* result ladder: covers 0..10, rises with the score, every tier has a colour and a quip */
for (let s = 0; s <= 10; s++) { const t = SK.quizTier(s); ok(!!t && !!t.name && !!t.color && !!t.quip, 'tier for ' + s + ' is complete'); }
ok(SK.quizTier(0).name === 'Fresh Ghost' && SK.quizTier(10).name === 'Ghost Architect', 'ladder runs Fresh Ghost to Ghost Architect');
let prev = -1; for (let s = 0; s <= 10; s++) { const i = SK.quizTiers.indexOf(SK.quizTier(s)); ok(i >= prev, 'ladder never goes down at ' + s); prev = i; }
ok(SK.quizTiers[0].min === 0, 'the ladder starts at 0');
ok(['new', 'basics', 'builder'].includes(SK.quizLevel(0)) && SK.quizLevel(10) === 'builder' && SK.quizLevel(0) === 'new', 'quizLevel maps onto the welcome levels');
/* tier names echo real quest badges, so the card previews something the app hands out */
const badges = new Set(SK.worlds.map(w => w.badge).concat(['Ghost Architect']));
SK.quizTiers.forEach(t => { if (t.name !== 'Fresh Ghost') ok(badges.has(t.name), t.name + ' is a real badge name'); });

console.log('covenant quiz checks passed: ' + passes + ' | failed: ' + fails);
process.exit(fails ? 1 : 0);
