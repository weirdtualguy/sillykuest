/* Interactive widgets. Each: SK.widgets[name] = function (step, ctx) -> {el, solve?}
   They call ctx.setReady(true) once the learner has done the thing. */
(function () {
  var SK = window.SK, h = SK.h;
  var W = (SK.widgets = {});
  var PAL = ['#2FD3B0', '#8A7BFF', '#FF6F83', '#FFC233', '#4DB5FF'];

  function btn(label, fn, cls) { return h('button', { type: 'button', class: 'btn ' + (cls || ''), onclick: fn }, label); }
  function seg(items, value, fn) {
    var el = h('div', { class: 'seg', role: 'tablist' }), bs = [];
    items.forEach(function (it) {
      var b = h('button', { type: 'button', role: 'tab', 'aria-selected': 'false', onclick: function () { set(it.v); fn(it.v); } }, it.t);
      b.setAttribute('data-v', it.v); bs.push(b); el.appendChild(b);
    });
    function set(v) { bs.forEach(function (b) { var on = b.getAttribute('data-v') === String(v); b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }); }
    set(value);
    return { el: el, set: set };
  }
  /* A result that lands below the fold on a short phone is easy to miss, and then the toy looks dead. Bring it into view.
     Does nothing when it is already visible, or when the toy is not inside the lesson player (the Lab page scrolls itself). */
  function inView(el) {
    SK.wait(40, function () {
      var box = el.closest && el.closest('.p-main');
      if (!box || !el.isConnected) return;
      var r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
      if (r.bottom > b.bottom - 6 && r.height < b.height) {
        var by = r.bottom - b.bottom + 14;
        if (box.scrollBy) box.scrollBy({ top: by, behavior: SK.reduced() ? 'auto' : 'smooth' }); else box.scrollTop += by;
      }
    });
  }
  function res() { var r = h('div', { class: 'res', 'aria-live': 'polite' }); r.show = function (ok, html) { r.className = 'res ' + (ok ? 'ok' : 'no'); r.innerHTML = '<strong>' + (ok ? 'Allowed. ' : 'Blocked. ') + '</strong>' + html; inView(r); }; r.note = function (html) { r.className = 'res'; r.innerHTML = html; }; return r; }
  function wrap(cls) { var el = h('div', { class: 'wg ' + (cls || '') }); for (var i = 1; i < arguments.length; i++) if (arguments[i]) el.appendChild(arguments[i]); return el; }

  /* 1. Open an envelope and pay Sam */
  W.envelopes = function (step, ctx) {
    var opened = false, sent = false, amt = 3;
    var scene = h('div', { class: 'scene' });
    var range = h('input', { type: 'range', min: 1, max: 9, step: 1, value: 3, 'aria-label': 'KAS to send to Sam' });
    var prev = h('div', { class: 'env-row' });
    function change() { return (10 - amt - 0.1).toFixed(1); }
    function drawPrev() {
      SK.clear(prev);
      prev.appendChild(SK.env({ amt: amt + ' KAS', sub: 'for Sam', state: 'sealed', stamp: 'sam|' + amt, accent: '#FFC233' }));
      prev.appendChild(SK.env({ amt: change() + ' KAS', sub: 'change, back to you', state: 'sealed', stamp: 'me|' + amt, accent: '#2FD3B0' }));
    }
    function draw() {
      SK.clear(scene);
      if (!opened) {
        scene.appendChild(h('button', { type: 'button', class: 'env-btn', 'aria-label': 'Open the 10 KAS envelope', onclick: function () { opened = true; SK.sfx('stamp'); SK.buzz(20); draw(); } },
          SK.env({ amt: '10 KAS', sub: 'your envelope', state: 'sealed', stamp: 'wallet|10' }), h('span', { class: 'env-hint' }, 'Tap to open it')));
      } else if (!sent) {
        scene.appendChild(h('div', { class: 'env-row' }, SK.env({ amt: '10 KAS', sub: 'opened', state: 'open' })));
        scene.appendChild(h('label', { class: 'rng' }, h('span', { id: 'rng-l' }, 'How much does Sam get?'), range));
        drawPrev(); scene.appendChild(prev);
        scene.appendChild(h('p', { class: 'cap' }, 'Whatever is left, minus a tiny network fee (0.1), comes back to you as change.'));
        scene.appendChild(btn('Send it', send, 'block'));
      } else {
        scene.appendChild(h('div', { class: 'env-row' }, SK.env({ amt: '10 KAS', sub: 'used up', state: 'used' })));
        drawPrev();
        scene.appendChild(prev);
        scene.appendChild(h('div', { class: 'res ok', html: '<strong>Done.</strong> The old envelope is gone for good. Two brand-new envelopes exist. Nothing was edited.' }));
        SK.confetti(14); ctx.setReady(true);
      }
    }
    function send() { sent = true; SK.sfx('ok'); draw(); }
    range.addEventListener('input', function () { amt = +range.value; drawPrev(); });
    ctx.hint('Open the envelope and send it');
    draw();
    return { el: wrap('', scene), solve: function () { opened = true; draw(); send(); } };
  };

  /* 2. One window versus many windows */
  W.parallel = function (step, ctx) {
    var ran = false;
    function lane(title, sub) {
      var toks = [1, 2, 3, 4].map(function (n) { return h('span', { class: 'tok' }, 'Pay ' + n); });
      var count = h('div', { class: 'lane-count' }, 'Waiting');
      return { toks: toks, count: count, el: h('div', { class: 'lane card' }, h('h3', title), h('p', { class: 'cap' }, sub), h('div', { class: 'toks' }, toks), count) };
    }
    var a = lane('Account style', 'One shared ledger. Payments go through one at a time.');
    var u = lane('Envelope style', 'Independent envelopes. Unrelated payments do not wait for each other.');
    var go = btn('Send 4 payments at once', run, 'block');
    function run() {
      if (ran) return; ran = true; go.disabled = true;
      a.toks.forEach(function (t, i) { setTimeout(function () { t.classList.add('done'); a.count.textContent = 'Turn ' + (i + 1) + ' of 4'; if (i === 3) fin(); }, SK.reduced() ? 0 : 520 * (i + 1)); });
      setTimeout(function () { u.toks.forEach(function (t) { t.classList.add('done'); }); u.count.textContent = 'Everything in 1 turn'; }, SK.reduced() ? 0 : 300);
    }
    function fin() { ctx.setReady(true); }
    ctx.hint('Press the button to compare');
    return { el: wrap('', h('div', { class: 'lanes2' }, a.el, u.el), go, h('p', { class: 'cap' }, 'A simplified picture. In the account model the shared state is the bottleneck; with UTXOs, independent envelopes can be handled side by side.')), solve: run };
  };

  /* 3a. A key lock on its own: shut without the key, open with it, and it never asks where the coins go.
     Used by lesson 1.2, before the covenant is introduced, so it says nothing about covenants. */
  W.keylock = function (step, ctx) {
    var phase = 0, who = null, WHO = ['Alice', 'Bob', 'Mallory'];
    var scene = h('div', { class: 'scene' }), out = res();
    function env(state, sub) { return SK.env({ amt: '10 KAS', sub: sub, state: state, accent: '#9A8CFF' }); }
    function focusFirst() { var b = scene.querySelector('button'); if (b) { try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } } }
    function draw() {
      SK.clear(scene);
      if (phase < 2) {
        scene.appendChild(h('div', { class: 'env-row' }, env('locked', 'locked')));
        scene.appendChild(h('p', { class: 'cap' }, phase === 0 ? 'A locked envelope with 10 KAS inside. You are not holding a key yet.' : 'Now take out your key.'));
        scene.appendChild(phase === 0 ? btn('Try to open it without the key', tryShut, 'block') : btn('Open it with my key', unlock, 'block'));
      } else if (phase === 2) {
        scene.appendChild(h('div', { class: 'env-row' }, env('open', 'open')));
        scene.appendChild(h('p', { class: 'lbl' }, 'Where should the 10 KAS go? The lock will not mind.'));
        var row = h('div', { class: 'tries' });
        WHO.forEach(function (n) { row.appendChild(btn('All 10 to ' + n, function () { send(n); }, 'alt')); });
        scene.appendChild(row);
      } else {
        scene.appendChild(h('div', { class: 'env-row' }, env('used', 'used up'), SK.env({ amt: '10 KAS', sub: 'for ' + who, state: 'sealed', stamp: 'keylock|' + who, accent: '#FFC233' })));
      }
    }
    function tryShut() { if (phase !== 0) return; phase = 1; SK.sfx('bad'); SK.buzz(40); out.show(false, 'You have no key, so the lock stays shut.'); draw(); focusFirst(); }
    function unlock() { if (phase !== 1) return; phase = 2; SK.sfx('stamp'); SK.buzz(20); out.show(true, 'Your key fits, so the lock lets go and the envelope opens.'); draw(); focusFirst(); }
    function send(n) {
      if (phase !== 2) return;
      who = n; phase = 3; SK.sfx('ok');
      out.show(true, n + ' gets all 10 KAS. The lock never asked where the coins would go. It only checked the key.');
      draw(); ctx.setReady(true);
    }
    ctx.hint('Try it without the key, then with it');
    out.note('Tap the button to see what the lock does.');
    draw();
    return { el: wrap('', scene, out), solve: function () { tryShut(); unlock(); send('Alice'); } };
  };

  /* 3. The gate: plain key lock versus covenant lock. step.plain keeps the covenant word off the screen (lesson 1.3 reveals it afterwards). */
  W.gate = function (step, ctx) {
    var lock = 'plain', blockedSeen = false, pl = !!step.plain;
    var out = res();
    var tries = [
      { t: 'Alice gets 6, I keep 4', alice: 6, d: 'Alice 6 KAS, you 4 KAS' },
      { t: 'All 10 go to Mallory', alice: 0, d: 'Mallory 10 KAS' },
      { t: 'Alice gets 2, Mallory gets 8', alice: 2, d: 'Alice 2 KAS, Mallory 8 KAS' }
    ];
    var rule = h('div', { class: 'rule card' });
    var sg = seg([{ v: 'plain', t: pl ? 'Key lock' : 'Plain key lock' }, { v: 'cov', t: pl ? 'Key lock + rule' : 'Covenant lock' }], 'plain', function (v) { lock = v; paint(); out.note('Pick a spend to try.'); });
    function paint() {
      rule.innerHTML = lock === 'plain'
        ? '<strong>This lock asks one question:</strong> is the owner signing? If yes, the coins can go anywhere.'
        : '<strong>This lock asks two questions:</strong> is the owner signing, <em>and</em> does Alice receive at least 5 KAS?';
    }
    var row = h('div', { class: 'tries' });
    tries.forEach(function (t) {
      row.appendChild(btn(t.t, function () {
        SK.sfx('tap');
        if (lock === 'plain') out.show(true, 'You signed, so the key lock is happy: ' + t.d + '. It never looked at where the money went.');
        else if (t.alice >= 5) out.show(true, 'You signed and Alice gets ' + t.alice + ' KAS, which is at least 5.');
        else { blockedSeen = true; out.show(false, 'The ' + (pl ? 'rule' : 'covenant') + ' looked at the new envelopes: Alice gets ' + t.alice + ' KAS, but the rule says at least 5. Your signature was not enough.'); SK.buzz(40); ctx.setReady(true); }
      }, 'alt'));
    });
    paint(); out.note('Pick a spend to try.');
    ctx.hint(pl ? 'Try a sneaky spend on the lock with a rule' : 'Try a sneaky spend on the covenant lock');
    return { el: wrap('', h('p', { class: 'cap' }, 'You own a 10 KAS envelope. Alice is owed at least 5 KAS from it. Try each spend under each lock.'), sg.el, rule, row, out), solve: function () { sg.set('cov'); lock = 'cov'; paint(); row.children[1].click(); } };
  };

  /* 4. Fingerprint changes, family badge stays (also the counter toy) */
  W.fingerprint = function (step, ctx) {
    var n = 0, next = 1, ok = 0, bad = 0, propose = !!step.propose;
    var hist = [], stage = h('div', { class: 'fp-stage' }), strip = h('div', { class: 'hist' }), info = h('div', { class: 'fp-info' }), out = res();
    var fam = 'family|sk';
    function cur() { return SK.env({ amt: 'count ' + n, state: 'sealed', stamp: 'script|' + n, mark: fam, cls: 'big' }); }
    function draw() {
      SK.clear(stage); stage.appendChild(cur());
      info.innerHTML = '<div><span class="dot a"></span><strong>Fingerprint</strong> (script hash): <code>' + SK.short('script|' + n) + '</code> <em>changes with the sticky note</em></div>' +
        '<div><span class="dot b"></span><strong>Family badge</strong> (covenant ID): <code>' + SK.short(fam) + '</code> <em>always the same</em></div>';
      SK.clear(strip);
      hist.forEach(function (k) { strip.appendChild(SK.env({ amt: '' + k, state: 'used', stamp: 'script|' + k, mark: fam, cls: 'tiny' })); });
      if (stepper) stepper.v.textContent = next;
    }
    function spend(v) {
      if (propose && v !== n + 1) { bad++; out.show(false, 'The rule says <code>new_state.count == prev_state.count + 1</code>. You proposed ' + v + ' after ' + n + '.'); SK.sfx('bad'); SK.buzz(40); check(); return; }
      hist.push(n); n = propose ? v : n + 1; next = n + 1; ok++; SK.sfx('ok');
      out.show(true, 'The old envelope was opened and a new one was created. New fingerprint, same family badge.'); draw(); check();
    }
    function check() { if (propose ? (ok >= 2 && bad >= 1) : ok >= 3) ctx.setReady(true); }
    var stepper = null, controls;
    if (propose) {
      var v = h('output', { class: 'step-v' }, '1');
      stepper = { v: v };
      controls = h('div', { class: 'stepper-row' },
        h('div', { class: 'stepper' }, h('button', { type: 'button', 'aria-label': 'Lower', html: SK.icon('minus', 18), onclick: function () { next = Math.max(0, next - 1); v.textContent = next; } }), v,
          h('button', { type: 'button', 'aria-label': 'Raise', html: SK.icon('plus', 18), onclick: function () { next++; v.textContent = next; } })),
        btn('Try this next count', function () { spend(next); }));
    } else controls = btn('Spend it: count + 1', function () { spend(n + 1); }, 'block');
    draw(); out.note(propose ? 'Propose a next count. Try a wrong one too.' : 'Spend the envelope three times.');
    ctx.hint(propose ? 'Make one accepted and one rejected spend' : 'Spend it three times');
    return {
      el: wrap('', stage, info, controls, out, h('div', { class: 'hist-l' }, 'Used envelopes'), strip),
      solve: function () { if (propose) { spend(n + 1); spend(n + 1); spend(n + 5); } else { spend(1); spend(2); spend(3); } }
    };
  };

  /* 5. The V1 transaction form */
  W.txv1 = function (step, ctx) {
    var F = [
      { k: 'version', l: 'version', d: 'Which transaction format this is. V1 is the new one that came with Toccata.' },
      { k: 'inputs', l: 'inputs[]', d: 'The envelopes being opened. Each points back to where it came from (previous_outpoint) and carries a signature_script and a sequence.' },
      { k: 'budget', l: 'compute_budget', sub: 1, d: 'How much script work this input is allowed to do. It replaces the old sig_op_count. Too low and validation fails; too high and the transaction is heavier and harder to get included. It is a resource commitment, not user intent: it does not change the txid or invalidate a signature.' },
      { k: 'outputs', l: 'outputs[]', d: 'The new envelopes. Each has a value and a script_public_key (its lock).' },
      { k: 'bind', l: 'covenant_binding?', sub: 1, d: 'An optional label on an output with two parts: authorizing_input (which input approved it) and covenant_id (which family it joins).' },
      { k: 'lock', l: 'lock_time', d: 'The transaction’s lock time field. Scripts can read it with OpTxLockTime.' },
      { k: 'lane', l: 'subnetwork_id', d: 'The lane tag. Native, coinbase, or a user lane that belongs to one app.' },
      { k: 'gas', l: 'gas', d: 'Only v1 user-lane transactions may carry non-zero gas. Native and reserved forms stay gas-free.' },
      { k: 'payload', l: 'payload', d: 'Free-form data. Based apps put their operations here.' },
      { k: 'mass', l: 'storage_mass', d: 'How much storage the transaction weighs. It is part of tx::hash but not of the txid.' }
    ];
    var seen = {}, detail = h('div', { class: 'tx-detail card', 'aria-live': 'polite' }, 'Tap any field to see what it does.');
    var cb = 1, slider = h('input', { type: 'range', min: 1, max: 40, value: 1, 'aria-label': 'compute_budget' });
    var calc = h('div', { class: 'tx-calc', hidden: true });
    var calcT = h('div');
    calc.appendChild(slider); calc.appendChild(calcT);
    function upd() { cb = +slider.value; calcT.innerHTML = '<code>compute_budget = ' + cb + '</code><br>allowance = ' + cb + ' × 10,000 + 9,999 = <strong>' + (cb * 10000 + 9999).toLocaleString('en-US') + ' script units</strong>'; }
    slider.addEventListener('input', upd); upd();
    var list = h('div', { class: 'tx-card card' }, h('div', { class: 'tx-title' }, 'Transaction V1'));
    F.forEach(function (f) {
      var b = h('button', { type: 'button', class: 'tx-f' + (f.sub ? ' sub' : ''), onclick: function () {
        seen[f.k] = 1; SK.sfx('tap');
        SK.$$('.tx-f', list).forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on');
        detail.innerHTML = '<strong>' + f.l + '</strong><br>' + SK.esc(f.d); calc.hidden = f.k !== 'budget'; if (f.k === 'budget') detail.appendChild(calc);
        if (Object.keys(seen).length >= 3) ctx.setReady(true);
      } }, h('code', f.l));
      list.appendChild(b);
    });
    ctx.hint('Tap three fields');
    return { el: wrap('', list, detail), solve: function () { ctx.setReady(true); } };
  };

  /* 6. Loop unrolling */
  W.loopUnroll = function (step, ctx) {
    var MAX = 4, start = 0, end = 3, moves = 0;
    var s1 = h('input', { type: 'range', min: 0, max: 4, value: 0, 'aria-label': 'start' }), s2 = h('input', { type: 'range', min: 0, max: 8, value: 3, 'aria-label': 'end' });
    var code = h('pre', { class: 'codeblock' }), slots = h('div', { class: 'unroll' }), msg = res();
    function draw() {
      code.innerHTML = SK.hl('for(i, ' + start + ', ' + end + ', ' + MAX + ') { ... }');
      SK.clear(slots);
      for (var k = 0; k < MAX; k++) {
        var i = start + k, run = i < end;
        slots.appendChild(h('div', { class: 'ur ' + (run ? 'run' : 'skip') }, h('span', { class: 'ur-n' }, 'copy ' + (k + 1)), h('span', { class: 'ur-v' }, run ? 'i = ' + i : 'skipped')));
      }
      var len = end - start;
      if (len <= 0) msg.note('start is not below end, so the loop does <strong>nothing</strong>. That is fine.');
      else if (len > MAX) { msg.className = 'res no'; msg.innerHTML = '<strong>Too long.</strong> The range has ' + len + ' steps but the bound is ' + MAX + '. If the compiler can prove that, compilation <strong>fails</strong>. If it only learns it at runtime, you must check it yourself.'; }
      else msg.note('Runs ' + len + ' time' + (len === 1 ? '' : 's') + ': i goes from ' + start + ' up to ' + (end - 1) + '. The end is <strong>not included</strong>.');
    }
    function mv() { start = +s1.value; end = +s2.value; draw(); if (++moves >= 4) ctx.setReady(true); }
    s1.addEventListener('input', mv); s2.addEventListener('input', mv);
    draw(); ctx.hint('Move the sliders a few times');
    return { el: wrap('', code, h('label', { class: 'rng' }, h('span', 'start'), s1), h('label', { class: 'rng' }, h('span', 'end'), s2), slots, msg), solve: function () { ctx.setReady(true); } };
  };

  /* 7. Introspection: tap an expression, see what it points at */
  W.introspect = function (step, ctx) {
    var ex = [
      { c: 'tx.inputs.length', v: '2', hl: ['i0', 'i1'], d: 'The number of inputs: 2.' },
      { c: 'tx.outputs.length', v: '2', hl: ['o0', 'o1'], d: 'The number of outputs: 2.' },
      { c: 'this.activeInputIndex', v: '0', hl: ['i0'], d: 'Which input is running this script: input 0.' },
      { c: 'tx.inputs[0].value', v: '10', hl: ['i0'], d: 'The amount in the envelope being opened: 10.' },
      { c: 'tx.outputs[0].value', v: '3', hl: ['o0'], d: 'The amount of the first new envelope: 3.' },
      { c: 'tx.outputs[1].scriptPubKey', v: 'same lock', hl: ['o1', 'i0'], d: 'The lock on output 1. Here it equals the lock on input 0, so the covenant lives on.' },
      { c: 'tx.version', v: '1', hl: ['tx'], d: 'The transaction version: this is a V1 transaction.' }
    ];
    var boxes = {};
    function box(k, l, a, sub) { var b = h('div', { class: 'ix' }, h('strong', l), h('span', a), sub ? h('em', sub) : null); boxes[k] = b; return b; }
    var tx = h('div', { class: 'ix-tx card' },
      h('div', { class: 'ix-col' }, h('div', { class: 'ix-h' }, 'Inputs'), box('i0', 'Input 0', '10 KAS', 'this script runs here'), box('i1', 'Input 1', '2 KAS', 'a fee envelope')),
      h('div', { class: 'ix-col' }, h('div', { class: 'ix-h' }, 'Outputs'), box('o0', 'Output 0', '3 KAS', 'to the recipient'), box('o1', 'Output 1', '8.9 KAS', 'change, same lock as input 0')));
    boxes.tx = tx;
    var out = res(), seen = {};
    var chips = h('div', { class: 'chips' });
    ex.forEach(function (e) {
      chips.appendChild(h('button', { type: 'button', class: 'chipbtn mono', onclick: function () {
        SK.sfx('tap'); Object.keys(boxes).forEach(function (k) { boxes[k].classList.remove('hl'); });
        e.hl.forEach(function (k) { boxes[k].classList.add('hl'); });
        out.note('<code>' + e.c + '</code> gives <strong>' + SK.esc(e.v) + '</strong>. ' + SK.esc(e.d));
        seen[e.c] = 1; if (Object.keys(seen).length >= 3) ctx.setReady(true);
      } }, e.c));
    });
    out.note('Tap an expression to see what it reads.'); ctx.hint('Tap three expressions');
    return { el: wrap('', tx, chips, out), solve: function () { ctx.setReady(true); } };
  };

  /* 8. Template: only the middle may change */
  W.template = function (step, ctx) {
    var n = 7, tampered = false, spent = 0, tried = 0;
    var bar = h('div', { class: 'tplbar' }), info = h('div', { class: 'fp-info' }), out = res();
    function draw() {
      SK.clear(bar);
      bar.appendChild(h('div', { class: 'seg-p' + (tampered ? ' bad' : '') }, h('span', 'prefix'), h('small', 'fixed code')));
      bar.appendChild(h('div', { class: 'seg-s' }, h('span', 'state'), h('small', 'count = ' + n)));
      bar.appendChild(h('div', { class: 'seg-p' + (tampered ? ' bad' : '') }, h('span', 'suffix'), h('small', 'fixed code')));
      var tpl = SK.short('tpl|' + (tampered ? 'evil' : 'ok')), exp = SK.short('tpl|ok');
      info.innerHTML = '<div><strong>Template hash</strong> (code only): <code>' + tpl + '</code> ' + (tampered ? '<span class="bad-t">does not match</span>' : '<span class="good-t">matches the expected one</span>') + '</div>' +
        '<div><strong>Expected</strong>: <code>' + exp + '</code></div>' +
        '<div><strong>Full fingerprint</strong>: <code>' + SK.short('full|' + n + '|' + tampered) + '</code></div>';
    }
    var b1 = btn('Spend: count + 1', function () {
      if (tampered) { out.show(false, 'The next envelope’s template hash does not match the expected one, so it is rejected.'); SK.sfx('bad'); return; }
      n++; spent++; out.show(true, 'Only the <strong>state</strong> in the middle changed. The template hash is identical, so the covenant accepts it.'); SK.sfx('ok'); draw(); done();
    }, 'alt');
    var b2 = btn('Tamper with the code', function () {
      tampered = !tampered; tried++; b2.textContent = tampered ? 'Undo the tampering' : 'Tamper with the code'; draw();
      if (tampered) out.show(false, 'A sneaky successor swapped in different code. Its template hash no longer matches. <strong>The covenant would refuse it.</strong>'); else out.note('Back to honest code.');
      SK.sfx(tampered ? 'bad' : 'tap'); done();
    }, 'alt');
    function done() { if (spent >= 1 && tried >= 1) ctx.setReady(true); }
    draw(); out.note('Try both buttons.'); ctx.hint('Spend once, then try tampering');
    return { el: wrap('', bar, info, h('div', { class: 'tries' }, b1, b2), out), solve: function () { b1.click(); b2.click(); } };
  };

  /* 9. Singleton and termination */
  W.singleton = function (step, ctx) {
    var term = false, tried = {}, out = res();
    var sg = seg([{ v: 'no', t: 'termination = disallowed' }, { v: 'yes', t: 'termination = allowed' }], 'no', function (v) { term = v === 'yes'; out.note('Pick what the rule returns.'); });
    var opts = [{ n: 0, t: '[ ]  (no successor)' }, { n: 1, t: '[ x ]  (one successor)' }, { n: 2, t: '[ x, y ]  (two successors)' }];
    var row = h('div', { class: 'tries' });
    opts.forEach(function (o) {
      row.appendChild(btn(o.t, function () {
        SK.sfx('tap'); tried[o.n + '|' + term] = 1;
        if (o.n === 1) out.show(true, 'Exactly one successor: the family carries on. This is what a singleton does.');
        else if (o.n === 0 && term) out.show(true, 'An empty list means <strong>terminate</strong>. The family ends here, on purpose.');
        else if (o.n === 0) out.show(false, 'With the default (disallowed), a singleton must continue with exactly one successor.');
        else out.show(false, 'A singleton can never have two successors. That would be a different topology.');
        if (Object.keys(tried).length >= 4) ctx.setReady(true);
      }, 'alt mono'));
    });
    out.note('Pick what the rule returns.'); ctx.hint('Try four combinations');
    return { el: wrap('', h('pre', { class: 'codeblock', html: SK.hl('#[covenant.singleton(mode = transition, termination = allowed)]\nfunction step(State prev_state, State[] next_states) : (State[])') }), sg.el, row, out), solve: function () { ctx.setReady(true); } };
  };

  /* 10. Topology picker */
  W.topology = function (step, ctx) {
    var T = {
      '1:1': { i: 1, o: 1, sugar: '#[covenant.singleton]', bind: 'auth', st: 'State prev_state, State new_state', say: 'One in, one out. A baton passed along.' },
      '1:N': { i: 1, o: 3, sugar: '#[covenant.fanout(to=Y)]', bind: 'auth', st: 'State prev_state, State[] new_states', say: 'One in, several out. A split.' },
      'N:M': { i: 3, o: 2, sugar: '#[covenant(binding=cov, from=X, to=Y)]', bind: 'cov', st: 'State[] prev_states, State[] new_states', say: 'Several in, several out. Needs a leader.' }
    };
    var seen = {}, view = h('div', { class: 'topo card' }), info = h('div', { class: 'topo-info' });
    var sg = seg(Object.keys(T).map(function (k) { return { v: k, t: k }; }), '1:1', show);
    function col(n, tone) { var c = h('div', { class: 'topo-col' }); for (var i = 0; i < n; i++) c.appendChild(SK.env({ state: 'sealed', cls: 'tiny', accent: tone, stamp: 't|' + tone + i })); return c; }
    function show(k) {
      var t = T[k]; seen[k] = 1; SK.clear(view);
      view.appendChild(col(t.i, '#8A7BFF')); view.appendChild(h('div', { class: 'topo-arrow', html: SK.icon('back', 28), style: { transform: 'scaleX(-1)' } })); view.appendChild(col(t.o, '#2FD3B0'));
      info.innerHTML = '<p>' + t.say + '</p><div class="kv"><span>Sugar</span><code>' + SK.esc(t.sugar) + '</code></div><div class="kv"><span>Binding</span><code>' + t.bind + '</code></div><div class="kv"><span>State shape</span><code>' + SK.esc(t.st) + '</code></div>';
      if (Object.keys(seen).length >= 3) ctx.setReady(true);
    }
    show('1:1'); ctx.hint('Look at all three shapes');
    return { el: wrap('', sg.el, view, info), solve: function () { ctx.setReady(true); } };
  };

  /* 11. Lineage: genesis, continuation, forgery */
  W.lineage = function (step, ctx) {
    var chain = [], gens = 0, did = {}, row = h('div', { class: 'env-row wrapr' }), out = res(), idSeed = null;
    function draw() {
      SK.clear(row);
      if (!chain.length) row.appendChild(h('p', { class: 'cap' }, 'No family yet. Start one with Genesis.'));
      chain.forEach(function (e, i) { row.appendChild(SK.env({ amt: 'step ' + i, state: 'sealed', cls: 'tiny', stamp: 'lin|' + i + idSeed, mark: idSeed })); });
    }
    var g = btn('Genesis: start a new family', function () {
      gens++; idSeed = 'cov|' + gens; chain = [1]; did.g = 1; SK.sfx('ok');
      out.show(true, 'A new covenant ID was born: <code>' + SK.short(idSeed) + '</code>. It is a hash of an outpoint that can never repeat, plus the first outputs.'); draw(); chk();
    }, 'alt');
    var c = btn('Continue: spend a family envelope', function () {
      if (!chain.length) { out.show(false, 'There is nothing to spend yet. Start a family first.'); return; }
      chain.push(1); did.c = 1; SK.sfx('ok');
      out.show(true, 'An input with this ID authorized a new output with the <strong>same</strong> ID. That is a continuation.'); draw(); chk();
    }, 'alt');
    var f = btn('Forge: make a family envelope from nothing', function () {
      did.f = 1; SK.sfx('bad'); SK.buzz(40);
      out.show(false, 'To carry the ID, an output must continue from an input that already has it, or be a genesis. A forger would have to pass the script checks or find a hash preimage. Forged family members are <strong>uncreatable</strong>.'); chk();
    }, 'alt');
    function chk() { if (did.g && did.c && did.f) ctx.setReady(true); }
    draw(); out.note('Try all three buttons.'); ctx.hint('Try genesis, continue and forge');
    return { el: wrap('', h('div', { class: 'tries' }, g, c, f), row, out), solve: function () { g.click(); c.click(); f.click(); } };
  };

  /* 12. Splitter */
  W.splitter = function (step, ctx) {
    var MAX = 4, POT = 10, vals = [4, 4, 2], okc = 0, badc = 0, rows = h('div', { class: 'srows' }), sum = h('div', { class: 'ssum' }), out = res();
    function draw() {
      SK.clear(rows);
      vals.forEach(function (v, i) {
        rows.appendChild(h('div', { class: 'srow' }, h('span', 'Piece ' + (i + 1)),
          h('div', { class: 'stepper' }, h('button', { type: 'button', 'aria-label': 'Less for piece ' + (i + 1), html: SK.icon('minus', 18), onclick: function () { vals[i] = Math.max(0, vals[i] - 1); draw(); } }),
            h('output', { class: 'step-v' }, v),
            h('button', { type: 'button', 'aria-label': 'More for piece ' + (i + 1), html: SK.icon('plus', 18), onclick: function () { vals[i]++; draw(); } })),
          h('button', { type: 'button', class: 'rm', 'aria-label': 'Remove piece ' + (i + 1), html: SK.icon('x', 18), onclick: function () { vals.splice(i, 1); draw(); } })));
      });
      var t = vals.reduce(function (a, b) { return a + b; }, 0);
      sum.innerHTML = 'Pieces: <strong>' + vals.length + '</strong> (max_outs = ' + MAX + ') &nbsp; Total: <strong>' + t + '</strong> (pot = ' + POT + ')';
    }
    var add = btn('Add a piece', function () { if (vals.length < 6) { vals.push(0); draw(); } }, 'alt');
    var go = btn('Split the pot', function () {
      var t = vals.reduce(function (a, b) { return a + b; }, 0);
      if (!vals.length) { out.show(false, 'There must be at least one piece.'); badc++; }
      else if (vals.length > MAX) { out.show(false, 'That is ' + vals.length + ' pieces but <code>max_outs</code> is ' + MAX + '.'); badc++; SK.sfx('bad'); }
      else if (t !== POT) { out.show(false, 'The pieces add up to ' + t + ', not ' + POT + '. <code>require(total == prev_state.amount)</code> fails.'); badc++; SK.sfx('bad'); }
      else { out.show(true, 'Pieces add up to exactly ' + POT + ' and there are ' + vals.length + ' of them.'); okc++; SK.sfx('ok'); }
      if (okc && badc) ctx.setReady(true);
    });
    draw(); out.note('Split a pot of 10. Try breaking a rule too.'); ctx.hint('Make one valid and one invalid split');
    return { el: wrap('', rows, sum, h('div', { class: 'tries' }, add, go), out), solve: function () { go.click(); vals = [9, 9]; go.click(); } };
  };

  /* 13. Handshake: covenants cooperate through co-spent inputs */
  W.handshake = function (step, ctx) {
    var cbx = h('input', { type: 'checkbox', id: 'hs-c' }), dbx = h('input', { type: 'checkbox', id: 'hs-d' }), out = res(), ok = 0, bad = 0;
    var token = SK.env({ amt: '50 tokens', sub: 'owner = covenant C', state: 'sealed', stamp: 'tok|1', accent: '#FFC233' });
    var go = btn('Spend the token', function () {
      if (cbx.checked) { out.show(true, 'A co-spent input carries covenant ID C. The token script checked it with <code>OpInputCovenantId</code> and was satisfied.'); ok++; SK.sfx('ok'); }
      else if (dbx.checked) { out.show(false, 'There is a witness input, but its covenant ID is D, not C. <code>OpInputCovenantId</code> does not match.'); bad++; SK.sfx('bad'); }
      else { out.show(false, 'No input owned by covenant C is in this transaction, so nobody vouched for the spend.'); bad++; SK.sfx('bad'); }
      if (ok && bad) ctx.setReady(true);
    });
    out.note('Tick the inputs to include, then spend.'); ctx.hint('Make one accepted and one rejected spend');
    return {
      el: wrap('', h('div', { class: 'env-row' }, token),
        h('label', { class: 'ck' }, cbx, h('span', 'Include an input owned by the Minter (covenant C)')),
        h('label', { class: 'ck' }, dbx, h('span', 'Include a decoy input owned by another covenant (D)')), go, out),
      solve: function () { go.click(); cbx.checked = true; go.click(); }
    };
  };

  /* 14. Leader and delegates */
  W.leader = function (step, ctx) {
    var del = 2, lead = 0, ok = 0, bad = 0, out = res(), view = h('div', { class: 'ld' });
    var s1 = seg([{ v: 1, t: 'Input 1' }, { v: 2, t: 'Input 2' }], 2, function (v) { del = +v; draw(); });
    var s2 = seg([{ v: 0, t: 'Input 0' }, { v: 1, t: 'Input 1' }, { v: 2, t: 'Input 2' }], 0, function (v) { lead = +v; draw(); });
    function draw() {
      SK.clear(view);
      [0, 1, 2].forEach(function (i) {
        var role = i === lead ? 'leader' : i === del ? 'delegate' : 'also in the family';
        view.appendChild(h('div', { class: 'ldb ' + (i === lead ? 'is-lead' : i === del ? 'is-del' : '') }, h('strong', 'Input ' + i), h('span', role)));
      });
    }
    var go = btn('Check the choice', function () {
      if (lead < del) { out.show(true, 'Input ' + del + ' points at input ' + lead + ' as its leader. The leader’s index is lower, so no cycles are possible.'); ok++; SK.sfx('ok'); }
      else { out.show(false, 'A delegate may only point at a leader with a <strong>lower</strong> index (<code>leader_index &lt; current_input_index</code>). Otherwise two inputs could point at each other forever.'); bad++; SK.sfx('bad'); }
      if (ok && bad) ctx.setReady(true);
    });
    draw(); out.note('Choose who the delegate is and who it picks as leader.'); ctx.hint('Make one valid and one invalid choice');
    return { el: wrap('', h('div', { class: 'lbl' }, 'The delegate is'), s1.el, h('div', { class: 'lbl' }, 'It picks as leader'), s2.el, view, go, out), solve: function () { go.click(); lead = 2; del = 1; go.click(); } };
  };

  /* 15. Token lab: conservation and the minter flag */
  W.tokenLab = function (step, ctx) {
    var minter = false, tried = {}, out = res();
    var sg = seg([{ v: 'no', t: 'Normal token envelope' }, { v: 'yes', t: 'Minter envelope' }], 'no', function (v) { minter = v === 'yes'; paint(); out.note('Try an action.'); });
    var envBox = h('div', { class: 'env-row' });
    function paint() { SK.clear(envBox); envBox.appendChild(SK.env({ amt: '10 tokens', sub: minter ? 'isMinter = true' : 'isMinter = false', state: 'sealed', stamp: 'k|10', accent: minter ? '#FFC233' : '#8A7BFF' })); }
    var acts = [
      { t: 'Split 10 into 6 + 4', f: function () { out.show(true, 'Total in is 10, total out is 10. Supply is conserved, so anyone may do this (with the right signatures).'); } },
      { t: 'Split 10 into 6 + 6', f: function () { if (minter) out.show(true, 'Minter envelopes may change supply, so 12 out is allowed.'); else out.show(false, 'In is 10 but out is 12. A non-minter must keep <code>totalIn == totalOut</code>.'); } },
      { t: 'Create a new minter output', f: function () { if (minter) out.show(true, 'A minter may pass its privilege on.'); else out.show(false, 'A non-minter can never create a minter output. That would be privilege escalation.'); } }
    ];
    var row = h('div', { class: 'tries' });
    acts.forEach(function (a) { row.appendChild(btn(a.t, function () { SK.sfx('tap'); a.f(); tried[a.t + minter] = 1; if (Object.keys(tried).length >= 4) ctx.setReady(true); }, 'alt')); });
    paint(); out.note('Try an action.'); ctx.hint('Try four combinations');
    return { el: wrap('', sg.el, envBox, row, out), solve: function () { ctx.setReady(true); } };
  };

  /* 16. Proof race: 738 dots */
  W.proofRace = function (step, ctx) {
    var P = [
      { k: 'ecdsa', n: 1, t: 'A normal signature (ECDSA)', time: '12.311 μs', ratio: '1×', extra: 'The baseline.' },
      { k: 'g16', n: 134, t: 'Groth16 proof', time: '1.649 ms', ratio: '~134×', extra: 'Tag 0x20. Compact proof (3 group elements). Not quantum-safe.' },
      { k: 'stark', n: 738, t: 'STARK proof (RISC Zero Succinct)', time: '9.081 ms', ratio: '~738×', extra: 'Tag 0x21. Larger proof. Quantum-safe.' }
    ];
    var grid = h('div', { class: 'dots', 'aria-hidden': 'true' }), dots = [], info = h('div', { class: 'pr-info card', 'aria-live': 'polite' }), seen = {};
    for (var i = 0; i < 738; i++) { var d = h('i'); dots.push(d); grid.appendChild(d); }
    function show(p) {
      dots.forEach(function (d, i) { d.className = i < p.n ? 'on' : ''; });
      info.innerHTML = '<strong>' + p.t + '</strong><br>Verification: <strong>' + p.time + '</strong> (' + p.ratio + ' the cost of one signature check)<br>' + p.extra;
      seen[p.k] = 1; if (Object.keys(seen).length >= 3) ctx.setReady(true);
    }
    var sg = seg(P.map(function (p) { return { v: p.k, t: p.ratio === '1×' ? 'Signature' : p.k === 'g16' ? 'Groth16' : 'STARK' }; }), 'ecdsa', function (v) { show(P.filter(function (p) { return p.k === v; })[0]); });
    show(P[0]); ctx.hint('Compare all three');
    return { el: wrap('', sg.el, h('p', { class: 'cap' }, 'Each dot is one signature check. Lit dots show how many fit in the time one proof takes.'), grid, info), solve: function () { ctx.setReady(true); } };
  };

  /* 17. Lane highway */
  W.lanes = function (step, ctx) {
    var sizes = [9, 7, 6, 5, 3], names = ['A', 'B', 'C', 'D', 'E'], cells = [], seed = 7;
    sizes.forEach(function (n, l) { for (var i = 0; i < n; i++) cells.push(l); });
    for (var i = cells.length - 1; i > 0; i--) { seed = (seed * 9301 + 49297) % 233280; var j = Math.floor(seed / 233280 * (i + 1)); var t = cells[i]; cells[i] = cells[j]; cells[j] = t; }
    var sel = -1, seen = {}, grid = h('div', { class: 'blk' }), cs = [], info = h('div', { class: 'ln-info card', 'aria-live': 'polite' });
    cells.forEach(function (l) { var c = h('i', { style: { '--lc': PAL[l] } }); cs.push(c); grid.appendChild(c); });
    function show(v) {
      sel = v; seen[v] = 1;
      cs.forEach(function (c, i) { c.className = sel < 0 || cells[i] === sel ? 'on' : 'dim'; });
      var mine = sel < 0 ? cells.length : sizes[sel];
      info.innerHTML = sel < 0
        ? 'One block, <strong>' + cells.length + '</strong> transactions from <strong>5</strong> apps. With one global line, a prover must walk through all of it.'
        : 'Lane ' + names[sel] + ' has <strong>' + mine + '</strong> of the ' + cells.length + ' transactions. A lane proof only needs <strong>' + mine + '</strong>. Cost follows <em>activity</em>, not total throughput.';
      if (Object.keys(seen).length >= 3) ctx.setReady(true);
    }
    var sg = seg([{ v: -1, t: 'All' }].concat(names.map(function (n, i) { return { v: i, t: 'Lane ' + n }; })), -1, function (v) { show(+v); });
    show(-1); ctx.hint('Pick three views');
    return { el: wrap('', sg.el, grid, info), solve: function () { ctx.setReady(true); } };
  };

  /* 18. Based-app pipeline */
  W.basedFlow = function (step, ctx) {
    var S = [
      { w: 'On Kaspa L1', h: 'Users send ordinary V1 transactions', x: 'Each operation is a normal transaction with a payload, tagged with the app’s lane ID.' },
      { w: 'Off-chain', h: 'A runtime executes the lane in order', x: 'It reads the ordered activity on the app’s lane and computes the new app state.' },
      { w: 'Off-chain', h: 'A prover makes a ZK proof', x: 'The proof says the runtime executed that lane activity correctly.' },
      { w: 'On Kaspa L1', h: 'A settlement covenant verifies', x: 'It checks the proof, the KIP-21 sequencing anchor, and any exits (withdrawals).' }
    ];
    var at = 0, view = h('div', { class: 'flow' }), nx = btn('Next stage', function () { at = Math.min(S.length - 1, at + 1); draw(); }, 'alt');
    function draw() {
      SK.clear(view);
      S.forEach(function (s, i) {
        view.appendChild(h('div', { class: 'fl ' + (i === at ? 'now ' : i < at ? 'past ' : 'later ') + (s.w === 'Off-chain' ? 'off' : 'on') },
          h('div', { class: 'fl-w' }, s.w), h('div', { class: 'fl-h' }, s.h), i <= at ? h('p', S[i].x) : null));
      });
      nx.disabled = at === S.length - 1; if (at === S.length - 1) ctx.setReady(true);
    }
    draw(); ctx.hint('Step to the end');
    return { el: wrap('', view, nx), solve: function () { at = S.length - 1; draw(); } };
  };

  /* Playground list for the Lab */
  SK.toys = [
    { id: 'envelopes', t: 'Open an envelope', d: 'Spend a 10 KAS envelope and watch the pieces appear.', w: 'envelopes' },
    { id: 'gate', t: 'Key lock versus covenant', d: 'Try to sneak money past each kind of lock.', w: 'gate' },
    { id: 'counter', t: 'The counter', d: 'Propose a next count and see whether the rule accepts it.', w: 'fingerprint', o: { propose: true } },
    { id: 'template', t: 'Template tamper test', d: 'Change the state, then try changing the code.', w: 'template' },
    { id: 'topology', t: 'Topology picker', d: '1:1, 1:N or N:M, and what each needs.', w: 'topology' },
    { id: 'lineage', t: 'Family lineage', d: 'Genesis, continuation and forgery.', w: 'lineage' },
    { id: 'splitter', t: 'Pot splitter', d: 'Split a pot without breaking the rules.', w: 'splitter' },
    { id: 'leader', t: 'Leader and delegates', d: 'Pick leaders without creating cycles.', w: 'leader' },
    { id: 'tokenlab', t: 'Token lab', d: 'Conservation, minters and privilege escalation.', w: 'tokenLab' },
    { id: 'handshake', t: 'Covenant handshake', d: 'Cooperate through co-spent inputs.', w: 'handshake' },
    { id: 'lanes', t: 'Lane highway', d: 'See why a lane proof only follows its own lane.', w: 'lanes' },
    { id: 'proofs', t: 'Proof race', d: 'How much a proof costs next to a signature.', w: 'proofRace' }
  ];
})();
