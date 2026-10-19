/* Vault Heist: write the rule that guards a covenant, then watch thieves try it.
   The rule you build is really evaluated against every transaction, so any phrasing that works wins.
   Each solution line is copied from a docs contract (SK.examples[ex]); tests/heist.js checks that.
   Level: [ex, q, head, tail, slots (chip banks), base env, scenarios [who, say, want, env], solution, hint, why] */
(function () {
  var SK = window.SK, h = SK.h, Q = SK.quiz;
  SK.QUIZ.heist = 1;
  var SIG = ['checkSig(', 's', ',', 'pk', ')', 'true', '!=', '=='], END = ['    }', '}'];
  var C = [
    ['p2pk', '**Guard the lock.** Only Hannah, who owns the key `pk`, may spend this envelope. Write the rule, then run the heist.',
      ['contract P2PK(pubkey pk) {', '    entry spend(sig s) {'], END, [SIG], { pk: 'hannah' },
      [['Hannah, the owner', 'signs with her own key', 1, { s: 'sig:hannah' }], ['Mallory, a thief', 'signs with her own key', 0, { s: 'sig:mallory' }], ['Spammy, a bot', 'sends no signature at all', 0, { s: 'none' }]],
      [['checkSig(', 's', ',', 'pk', ')']], 'A signature proves a key. `checkSig` takes the signature first, then the key.',
      'A covenant is a rule about the **transaction**. `require(true)` is an open door. `checkSig(s, pk)` makes the signature prove the key.'],
    ['timeout', '**Two locks, one door.** Hannah may take her money back, but only after the timeout and only with her own signature. Fill both rules.',
      ['contract TransferWithTimeout(pubkey sender, pubkey recipient, temporal timeout) {', '    entry reclaim(sig senderSig) {'], END,
      [['checkSig(', 'senderSig', ',', 'sender', 'recipient', ')', 'true'], ['tx.time', '>=', '<=', '==', 'timeout', 'true']], { sender: 'hannah', recipient: 'rick', timeout: 100 },
      [['Hannah, after the timeout', 'signs at time 120', 1, { senderSig: 'sig:hannah', tx: { time: 120 } }], ['Hannah, too early', 'signs at time 40', 0, { senderSig: 'sig:hannah', tx: { time: 40 } }], ['Rick, the recipient', 'signs at time 120 with his own key', 0, { senderSig: 'sig:rick', tx: { time: 120 } }]],
      [['checkSig(', 'senderSig', ',', 'sender', ')'], ['tx.time', '>=', 'timeout']], 'Every `require` is its own lock and all locks must open. After means the time is at least the timeout.',
      'Every `require` must pass, so two lines are two locks. `tx.time >= timeout` is a **minimum**: any time from the timeout onward works.'],
    ['mecenas', '**Be patient.** Rick may collect only once the envelope is at least `period` old. It must also work on exactly the right day.',
      ['contract Mecenas(pubkey recipient, byte[32] funder, int pledge, int period) {', '    entry receive() {'], ['        // payout rules follow', '    }', '}'],
      [['this.ageDaa', 'period', '>=', '<=', '>', '==']], { period: 500 },
      [['Rick, patient', 'the envelope is 700 old', 1, { age: 700 }], ['Rick, impatient', 'the envelope is only 100 old', 0, { age: 100 }], ['Rick, on the dot', 'the envelope is exactly 500 old', 1, { age: 500 }]],
      [['this.ageDaa', '>=', 'period']], 'At least means greater than, or equal to.',
      'Off by one slips are classic: `>` locks out the person on exactly the right day. A minimum age is `>=`.'],
    ['vault', '**No money printers.** This vault may pay out less than it takes in (the rest goes to miners), never more. Write the rule.',
      ['function conserve_and_bump(State[] prev_states, State[] new_states, sig leader_sig) {', '    // in_sum and out_sum are added up above'], ['}'],
      [['in_sum', 'out_sum', '>=', '<=', '==', '!=']], {},
      [['Honest spend', '100 in, 100 out', 1, { in_sum: 100, out_sum: 100 }], ['Fee payer', '100 in, 90 out, 10 for miners', 1, { in_sum: 100, out_sum: 90 }], ['Mallory, the printer', '100 in, 150 out', 0, { in_sum: 100, out_sum: 150 }]],
      [['in_sum', '>=', 'out_sum']], 'Outputs may never be bigger than inputs. Which side is the bigger one?',
      'Outputs can hold less than the inputs but never more. If the rule points the wrong way the vault prints money. The real contract uses `in_sum >= out_sum`.'],
    ['splitter', '**Split the pot.** Hannah splits a pot of 100 into pieces. The pieces must add up to exactly the old pot. Write the check.',
      ['function split(State prev_state, State[] new_states, sig owner_sig) {', '    // total = sum of the new pieces, added up above'], ['}'],
      [['total', 'prev_state.amount', '==', '>=', '<=', '!=']], { prev_state: { amount: 100 } },
      [['Fair split', '100 becomes 60 + 40', 1, { total: 100 }], ['Mallory, the copier', '100 becomes 60 + 60', 0, { total: 120 }], ['Mallory, the shaver', '100 becomes 50 + 30', 0, { total: 80 }]],
      [['total', '==', 'prev_state.amount']], 'Neither more nor less: the two sums must match.',
      '`>=` prints money and `<=` lets value vanish. An exact split needs `==`. This is the line PotSplitter uses.'],
    ['minter', '**Cap the minter.** A mint must be above zero and never above the allowance left in `prev_state.amount` (100). Two rules.',
      ['function mintTokens(State prev_state, sig ownerSig, int mintAmount, ...) : (State) {'], ['}'],
      [['mintAmount', '>', '0', '>=', '!=', 'true'], ['mintAmount', '<=', 'prev_state.amount', '>=', '<', '==']], { prev_state: { amount: 100 } },
      [['Mint 40', 'well inside the allowance', 1, { mintAmount: 40 }], ['Mint 100', 'exactly the whole allowance', 1, { mintAmount: 100 }], ['Mint 0', 'a spam mint of nothing', 0, { mintAmount: 0 }], ['Mint 500', 'far over the allowance', 0, { mintAmount: 500 }]],
      [['mintAmount', '>', '0'], ['mintAmount', '<=', 'prev_state.amount']], 'A cap is a ceiling you may touch: at most the allowance.',
      'Two guards: not nothing (`> 0`) and not too much (`<= prev_state.amount`). `<` would punish the person who mints exactly the cap.']
  ];

  function mix(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  function toStep(c) {
    return { t: 'heist', ex: c[0], q: c[1], head: c[2], tail: c[3], slots: c[4], base: c[5], sol: c[7], hint: c[8], why: c[9],
      sc: c[6].map(function (s) { return { who: s[0], say: s[1], want: !!s[2], env: mix(c[5], s[3]) }; }) };
  }
  /* Run the chosen rule lines against one transaction. Chips come from a fixed list, never free text.
     Returns true (every require passes), false, or null (not valid code yet). */
  /* The rule a learner builds is read by this small parser, never run as JavaScript, so the page's Content
     Security Policy can stay strict. It understands what the chips can make: names, numbers, true/false,
     member access (tx.time), checkSig(a, b), == != < <= > >=, + - and !. Anything else is "not valid yet". */
  function tokenize(src) {
    var out = [], i = 0, m, rest;
    while (i < src.length) {
      rest = src.slice(i);
      if (/^\s/.test(rest)) { i++; continue; }
      if ((m = /^\d+(?:\.\d+)?/.exec(rest))) out.push({ n: +m[0] });
      else if ((m = /^[A-Za-z_]\w*/.exec(rest))) out.push({ id: m[0] });
      else if ((m = /^(?:==|!=|<=|>=|[()\[\],.<>!+\-])/.exec(rest))) out.push({ op: m[0] });
      else return null;
      i += m[0].length;
    }
    return out;
  }
  function checkSig(a, b) { return a === 'sig:' + b; }
  function own(o, k) {
    if (o === null || typeof o !== 'object' || !Object.prototype.hasOwnProperty.call(o, k)) throw new Error('no such name');
    return o[k];
  }
  function evalExpr(src, env) {
    var t = tokenize(src), p = 0, self = { ageDaa: env.age };
    if (!t || !t.length) throw new Error('empty');
    function is(o) { return !!t[p] && t[p].op === o; }
    function eat(o) { if (is(o)) { p++; return true; } return false; }
    function need(o) { if (!eat(o)) throw new Error('expected ' + o); }
    function oneOf(list) { return t[p] && t[p].op && list.indexOf(t[p].op) >= 0 ? t[p++].op : null; }
    function equality() {
      var v = relation(), k, r;
      while ((k = oneOf(['==', '!=']))) { r = relation(); v = k === '==' ? v == r : v != r; }
      return v;
    }
    function relation() {
      var v = sum(), k, r;
      while ((k = oneOf(['<', '<=', '>', '>=']))) { r = sum(); v = k === '<' ? v < r : k === '<=' ? v <= r : k === '>' ? v > r : v >= r; }
      return v;
    }
    function sum() {
      var v = unary(), k, r;
      while ((k = oneOf(['+', '-']))) { r = unary(); v = k === '+' ? v + r : v - r; }
      return v;
    }
    function unary() { if (eat('!')) return !unary(); if (eat('-')) return -unary(); return postfix(); }
    function postfix() {
      var v = primary(), k, args;
      for (;;) {
        if (eat('.')) { k = t[p++]; if (!k || !k.id) throw new Error('name expected'); v = own(v, k.id); }
        else if (eat('[')) { k = equality(); need(']'); v = own(v, k); }
        else if (eat('(')) {
          args = []; if (!is(')')) { do { args.push(equality()); } while (eat(',')); } need(')');
          if (v !== checkSig) throw new Error('not callable');
          v = v.apply(null, args);
        } else return v;
      }
    }
    function primary() {
      var k = t[p++], v;
      if (!k) throw new Error('unexpected end');
      if (k.n !== undefined) return k.n;
      if (k.id) {
        if (k.id === 'true') return true;
        if (k.id === 'false') return false;
        if (k.id === 'this') return self;
        if (k.id === 'checkSig') return checkSig;
        if (k.id === 'age') throw new Error('unknown name');
        return own(env, k.id);
      }
      if (k.op === '(') { v = equality(); need(')'); return v; }
      throw new Error('unexpected ' + k.op);
    }
    var res = equality();
    if (p < t.length) throw new Error('trailing input');
    return res;
  }
  /* true = every require passes, false = one fails, null = not valid yet */
  function evalRule(exprs, env) {
    var pass = true;
    for (var i = 0; i < exprs.length; i++) {
      if (!exprs[i] || !/^[\w\s.()\[\],<>=!+\-]*$/.test(exprs[i])) return null;
      try { if (!evalExpr(exprs[i], env)) pass = false; } catch (e) { return null; }
    }
    return pass;
  }
  var line = function (S) { return 'require(' + SK.joinTokens(S) + ');'; };

  Q.heist = function (step, ctx) {
    var slots = step.slots.map(function (t) { return { chips: SK.shuffle(t.map(function (c) { return { c: c, used: false }; })), seq: [], btns: [] }; });
    var locked = false, busy = false, runs = 0, cards = [];
    var wrap = h('div', { class: 'q hx' }, h('h2', { class: 'q-text', html: SK.fmt(step.q, true) }));
    wrap.appendChild(h('pre', { class: 'codeblock ctx', html: SK.hl(step.head.join('\n')) }));
    slots.forEach(function (S, si) {
      S.line = h('div', { class: 'bline', 'aria-live': 'polite' });
      var bank = h('div', { class: 'bank bank-build' });
      S.chips.forEach(function (ch) {
        var b = h('button', { type: 'button', class: 'chipbtn mono' }, ch.c);
        b.addEventListener('click', function () { if (locked || busy || ch.used) return; S.seq.push(ch); ch.used = true; draw(); SK.sfx('tap'); });
        S.btns.push(b); bank.appendChild(b);
      });
      wrap.appendChild(h('div', { class: 'hx-row' }, h('code', 'require('), S.line, h('code', ');')));
      wrap.appendChild(bank);
    });
    wrap.appendChild(h('pre', { class: 'codeblock ctx', html: SK.hl(step.tail.join('\n')) }));
    var crew = h('div', { class: 'hx-crew' }), msg = h('div', { class: 'hx-msg', 'aria-live': 'polite' }), go = h('button', { type: 'button', class: 'btn hx-go' }, 'Run the heist');
    var show = h('button', { type: 'button', class: 'btn alt sm', hidden: true }, 'Show me the answer');
    step.sc.forEach(function (c) {
      var st = h('span', { class: 'hx-st' }, c.want ? 'Should pass' : 'Must be blocked');
      var el = h('div', { class: 'card hx-tx ' + (c.want ? 'friend' : 'thief') }, h('span', { class: 'hx-ic', html: SK.icon(c.want ? 'envelope' : 'bolt', 22) }),
        h('div', { class: 'hx-b' }, h('strong', c.who), h('span', { class: 'cap', html: SK.fmt(c.say, true) })), st);
      cards.push({ el: el, st: st }); crew.appendChild(el);
    });
    wrap.appendChild(h('div', { class: 'bank-label' }, 'The transactions'));
    wrap.appendChild(crew); wrap.appendChild(msg); wrap.appendChild(go); wrap.appendChild(show);

    function draw() {
      slots.forEach(function (S) {
        SK.clear(S.line);
        if (!S.seq.length) S.line.appendChild(h('span', { class: 'ph' }, 'tap pieces'));
        S.seq.forEach(function (ch, k) {
          var t = h('button', { type: 'button', class: 'chipbtn mono tk', 'aria-label': 'Take back ' + ch.c }, ch.c);
          t.addEventListener('click', function () { if (locked || busy) return; S.seq.splice(k, 1); ch.used = false; draw(); SK.sfx('tap'); });
          S.line.appendChild(t);
        });
        S.btns.forEach(function (b, i) { b.disabled = S.chips[i].used; b.classList.toggle('used', S.chips[i].used); });
      });
      go.disabled = busy || slots.some(function (S) { return !S.seq.length; });
    }
    function run(fast) {
      if (busy || locked) return;
      var exprs = slots.map(function (S) { return SK.joinTokens(S.seq.map(function (ch) { return ch.c; })); });
      var res = step.sc.map(function (c) { return evalRule(exprs, c.env); });
      if (res.indexOf(null) >= 0) { msg.textContent = 'That is not valid Silverscript yet. Check the order of the pieces.'; SK.sfx('bad'); return; }
      busy = true; runs++; draw(); msg.textContent = ''; var i = 0, bad = 0;
      cards.forEach(function (k) { k.el.classList.remove('pass', 'fail'); });
      (function tick() {
        if (i >= cards.length) return done();
        var c = step.sc[i], got = res[i], good = got === c.want, k = cards[i];
        k.el.classList.add(good ? 'pass' : 'fail');
        k.st.textContent = good ? (got ? 'Let in ✓' : 'Blocked ✓') : (got ? 'Slipped in ✗' : 'Locked out ✗');
        if (!good) bad++; SK.sfx(good ? 'ok' : 'bad'); i++;
        setTimeout(tick, fast || SK.reduced() ? 0 : 480);
      })();
      function done() {
        busy = false;
        if (!bad) {
          locked = true; if (runs === 1) SK.state.stats.heist = (SK.state.stats.heist || 0) + 1;
          return ctx.finish(true, { requeue: false });
        }
        msg.textContent = (step.sc.length - bad) + ' of ' + step.sc.length + ' went right. Change the rule and run again. Tries are free.' + (runs >= 2 ? ' Hint: ' + step.hint.replace(/`/g, '') : '');
        go.textContent = 'Run again'; show.hidden = runs < 3; draw();
      }
    }
    function fill() {
      slots.forEach(function (S, si) {
        S.chips.forEach(function (ch) { ch.used = false; }); S.seq = [];
        step.sol[si].forEach(function (t) { var ch = S.chips.filter(function (x) { return !x.used && x.c === t; })[0]; ch.used = true; S.seq.push(ch); });
      });
      draw();
    }
    go.addEventListener('click', function () { run(false); });
    show.addEventListener('click', function () { locked = true; ctx.finish(false, { answer: step.sol.map(line).join('\n'), mono: true, requeue: false }); });
    draw();
    return { el: wrap, auto: true, solve: function () { fill(); run(true); } };
  };

  SK.heist = { levels: C, eval: evalRule, line: line };
  SK.heistSteps = function () { return C.map(function (c) { return { step: toStep(c), key: null }; }); };
})();
