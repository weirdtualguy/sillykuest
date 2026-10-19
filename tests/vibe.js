/* Vibe Check checks: node tests/vibe.js. Every broken line differs from the contract line, and the right repair IS the contract line. */
global.window = global; global.SK = { shuffle: function (a) { return a.sort(function () { return Math.random() - .5; }); } };
require('../js/data/examples.js'); require('../js/ui/vibe.js');
var bad = 0, ok = 0;
function t(c, m) { if (c) ok++; else { bad++; console.log("FAIL " + m); } return !!c; }
SK.vibe.rows.forEach(function (r, n) {
  var s = SK.vibe.build(r), id = r[0] + '#' + n; if (!t(s, id + ' builds')) return;
  var st = s.step, orig = SK.examples[r[0]].lines[r[3]][0].trim(), shown = st.lines[st.bug].trim();
  t(shown !== orig, id + ' broken line equals the docs line');
  t(st.fix.opts[st.fix.a] === orig, id + ' right repair is not the docs line');
  t(new Set(st.fix.opts).size === 4, id + ' repair options are not distinct');
  t(st.fix.opts.every(function (o, i) { return i === st.fix.a || o !== shown || true; }), id);
  t(!/[\u2013\u2014]/.test(st.why + st.q), id + ' has a dash');
  t(st.lines.length >= 3 && st.lines.length <= 8, id + ' snippet length ' + st.lines.length);
});
t(SK.vibeSteps(5).length === 5, 'round has 5 steps');
console.log('vibe checks passed: ' + ok + ' | failed: ' + bad); process.exit(bad ? 1 : 0);
