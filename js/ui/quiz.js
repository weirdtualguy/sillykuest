/* Quiz question types. Every type is a function (step, ctx) -> {el, check?, solve, auto?}
   ctx.setReady(bool) enables the Check button. Self-checking types call ctx.finish(ok, opts).
   Phone-first: everything works by tapping, nothing needs drag and drop. */
(function () {
  var SK = window.SK, h = SK.h;
  var Q = (SK.quiz = {});

  function qhead(step) {
    var n = h('h2', { class: 'q-text', html: SK.fmt(step.q, true) });
    return n;
  }
  function codeBlock(src) { return h('pre', { class: 'codeblock', html: SK.hl(src) }); }

  /* ---------- multiple choice ---------- */
  function choice(step, ctx, opts, correct, isTf) {
    var order = opts.map(function (_, i) { return i; });
    if (!step.keep && !isTf) order = SK.shuffle(order);
    var sel = null, locked = false, btns = [];
    var wrap = h('div', { class: 'q' }, qhead(step));
    if (step.code) wrap.appendChild(codeBlock(step.code));
    var list = h('div', { class: 'opts' + (isTf ? ' opts-tf' : ''), role: 'radiogroup', 'aria-label': 'Answers' });
    order.forEach(function (oi, pos) {
      var b = h('button', { type: 'button', class: 'opt', role: 'radio', 'aria-checked': 'false', 'data-i': pos },
        h('span', { class: 'key', 'aria-hidden': 'true' }, String(pos + 1)),
        h('span', { class: 'lab', html: isTf ? esc(opts[oi]) : SK.fmt(opts[oi], true) }));
      b.addEventListener('click', function () {
        if (locked) return;
        sel = oi; SK.sfx('tap');
        btns.forEach(function (x, k) { var on = order[k] === sel; x.classList.toggle('on', on); x.setAttribute('aria-checked', on ? 'true' : 'false'); });
        ctx.setReady(true);
      });
      btns.push(b); list.appendChild(b);
    });
    function esc(s) { return SK.esc(s); }
    wrap.appendChild(list);
    return {
      el: wrap,
      check: function () {
        locked = true;
        btns.forEach(function (b, k) {
          b.disabled = true;
          if (order[k] === correct) b.classList.add('right');
          else if (order[k] === sel) b.classList.add('wrong');
        });
        return { ok: sel === correct, answer: opts[correct] };
      },
      solve: function () { btns[order.indexOf(correct)].click(); }
    };
  }
  Q.mc = function (step, ctx) { return choice(step, ctx, step.opts, step.a, false); };
  Q.tf = function (step, ctx) { return choice(step, ctx, ['True', 'False'], step.a ? 0 : 1, true); };

  /* ---------- fill the blanks (tap chips) ---------- */
  Q.fill = function (step, ctx) {
    var segs = step.text.split('___'), nb = segs.length - 1, vals = [], locked = false;
    for (var i = 0; i < nb; i++) vals.push(null);
    var chips = SK.shuffle(step.chips.map(function (c, i) { return { c: c, used: false, i: i }; }));
    var wrap = h('div', { class: 'q' }, qhead(step));
    var line = h('div', { class: step.code ? 'fill fill-code' : 'fill' });
    var blanks = [];
    segs.forEach(function (s, k) {
      line.appendChild(h('span', { class: 'fs', html: step.code ? SK.hl(s) : SK.fmt(s, true) }));
      if (k < nb) {
        var bl = h('button', { type: 'button', class: 'blank', 'aria-label': 'Blank ' + (k + 1) });
        bl.addEventListener('click', function () {
          if (locked || vals[k] == null) return;
          chips[vals[k]].used = false; vals[k] = null; render(); SK.sfx('tap');
        });
        blanks.push(bl); line.appendChild(bl);
      }
    });
    var bank = h('div', { class: 'bank' }), cbtns = [];
    chips.forEach(function (ch, ci) {
      var b = h('button', { type: 'button', class: 'chipbtn' + (step.code ? ' mono' : '') }, ch.c);
      b.addEventListener('click', function () {
        if (locked || ch.used) return;
        var k = vals.indexOf(null); if (k < 0) return;
        vals[k] = ci; ch.used = true; render(); SK.sfx('tap');
      });
      cbtns.push(b); bank.appendChild(b);
    });
    function render() {
      blanks.forEach(function (b, k) {
        b.textContent = vals[k] == null ? '' : chips[vals[k]].c;
        b.classList.toggle('filled', vals[k] != null);
      });
      cbtns.forEach(function (b, i) { b.disabled = chips[i].used; b.classList.toggle('used', chips[i].used); });
      ctx.setReady(vals.indexOf(null) < 0);
    }
    wrap.appendChild(line); wrap.appendChild(bank);
    return {
      el: wrap,
      check: function () {
        locked = true;
        var ok = true;
        blanks.forEach(function (b, k) {
          var good = chips[vals[k]].c === step.a[k]; ok = ok && good;
          b.classList.add(good ? 'right' : 'wrong');
        });
        cbtns.forEach(function (b) { b.disabled = true; });
        return { ok: ok, answer: step.a.join(',  ') };
      },
      solve: function () {
        vals.forEach(function (v, k) {
          if (v != null) { chips[v].used = false; vals[k] = null; }
        });
        step.a.forEach(function (want) {
          for (var ci = 0; ci < chips.length; ci++) if (!chips[ci].used && chips[ci].c === want) { cbtns[ci].click(); break; }
        });
      }
    };
  };

  /* ---------- order / slots (tap pieces into places) ---------- */
  function place(step, ctx, labeled) {
    var pieces = labeled ? step.pieces.slice() : step.items.concat(step.extra || []);
    var exp = labeled ? step.a.map(function (i) { return step.pieces[i]; }) : step.items.slice();
    var labels = labeled ? step.slots : exp.map(function (_, i) { return String(i + 1); });
    var order, tries = 0;
    do { order = SK.shuffle(pieces.map(function (_, i) { return i; })); tries++; }
    while (!labeled && tries < 20 && order.every(function (v, i) { return pieces[v] === exp[i]; }));
    var slots = labels.map(function () { return null; }), locked = false;
    var mono = !!step.mono;
    function label(t) { return mono ? h('span', { class: 'mono-in', html: SK.hl(t) }) : h('span', { html: SK.fmt(t, true) }); }
    var wrap = h('div', { class: 'q' }, qhead(step));
    var sl = h('div', { class: 'slots' + (mono ? ' slots-mono' : '') + (labeled ? ' slots-labeled' : '') }), sbtns = [];
    labels.forEach(function (lb, k) {
      var b = h('button', { type: 'button', class: 'slot', 'aria-label': 'Place ' + (k + 1) });
      b.addEventListener('click', function () { if (locked || slots[k] == null) return; slots[k] = null; render(); SK.sfx('tap'); });
      sbtns.push(b);
      sl.appendChild(h('div', { class: 'slot-row' }, labeled ? h('span', { class: 'slot-n', html: SK.fmt(lb, true) }) : h('span', { class: 'slot-n' }, lb), b));
    });
    var bank = h('div', { class: 'bank' + (mono ? ' bank-mono' : '') }), bbtns = [];
    order.forEach(function (pi) {
      var b = h('button', { type: 'button', class: 'chipbtn' }, label(pieces[pi]));
      b.addEventListener('click', function () {
        if (locked) return;
        var k = slots.indexOf(null); if (k < 0) return;
        slots[k] = pi; render(); SK.sfx('tap');
      });
      bbtns.push(b); bank.appendChild(b);
    });
    function render() {
      sbtns.forEach(function (b, k) {
        SK.clear(b);
        if (slots[k] != null) { b.appendChild(label(pieces[slots[k]])); b.classList.add('filled'); } else b.classList.remove('filled');
      });
      bbtns.forEach(function (b, i) { b.classList.toggle('used', slots.indexOf(order[i]) >= 0); b.disabled = slots.indexOf(order[i]) >= 0; });
      ctx.setReady(slots.indexOf(null) < 0);
    }
    wrap.appendChild(sl);
    wrap.appendChild(h('div', { class: 'bank-label' }, step.extra && step.extra.length ? 'Tap to place. Not every piece belongs.' : 'Tap to place'));
    wrap.appendChild(bank);
    return {
      el: wrap,
      check: function () {
        locked = true; var ok = true;
        sbtns.forEach(function (b, k) {
          var good = pieces[slots[k]] === exp[k]; ok = ok && good;
          b.classList.add(good ? 'right' : 'wrong');
        });
        bbtns.forEach(function (b) { b.disabled = true; });
        var ans = exp.join('\n');
        return { ok: ok, answer: ans, multiline: true, mono: mono };
      },
      solve: function () {
        slots.forEach(function (v, k) { slots[k] = null; });
        exp.forEach(function (want) {
          for (var i = 0; i < order.length; i++) {
            if (pieces[order[i]] === want && slots.indexOf(order[i]) < 0) { bbtns[i].click(); break; }
          }
        });
      }
    };
  }
  Q.order = function (step, ctx) { return place(step, ctx, false); };
  Q.slots = function (step, ctx) { return place(step, ctx, true); };

  /* ---------- match pairs ---------- */
  Q.match = function (step, ctx) {
    var L = step.pairs.map(function (p, i) { return { t: p[0], i: i }; });
    var R = SK.shuffle(step.pairs.map(function (p, i) { return { t: p[1], i: i }; }));
    var sel = null, done = {}, count = 0, mistakes = 0, over = false;
    var wrap = h('div', { class: 'q' }, qhead(step));
    var cols = h('div', { class: 'match' }), lc = h('div', { class: 'mcol' }), rc = h('div', { class: 'mcol' }), lb = [], rb = [];
    function mk(item, side, col, arr) {
      var b = h('button', { type: 'button', class: 'mbtn', html: SK.fmt(item.t, true) });
      b.addEventListener('click', function () { tap(side, item, b); });
      arr.push({ b: b, item: item }); col.appendChild(b);
    }
    L.forEach(function (x) { mk(x, 'l', lc, lb); });
    R.forEach(function (x) { mk(x, 'r', rc, rb); });
    function find(side, i) { return (side === 'l' ? lb : rb).filter(function (o) { return o.item.i === i; })[0]; }
    function tap(side, item, b) {
      if (over || done[side + item.i]) return;
      SK.sfx('tap');
      if (sel && sel.side === side) { sel.b.classList.remove('on'); sel = null; }
      if (!sel) { sel = { side: side, item: item, b: b }; b.classList.add('on'); return; }
      var a = sel; sel = null; a.b.classList.remove('on');
      var li = side === 'l' ? item.i : a.item.i, ri = side === 'r' ? item.i : a.item.i;
      if (li === ri) {
        var cls = 'm' + (count % 6);
        [find('l', li), find('r', li)].forEach(function (o) { o.b.classList.add('right', cls); o.b.disabled = true; });
        done['l' + li] = done['r' + li] = true; count++;
        if (count === L.length) { over = true; ctx.finish(mistakes === 0, { answer: '', requeue: false }); }
      } else {
        mistakes++; SK.sfx('bad'); SK.buzz(40);
        [a.b, b].forEach(function (x) { x.classList.add('shake'); setTimeout(function () { x.classList.remove('shake'); }, 400); });
      }
    }
    cols.appendChild(lc); cols.appendChild(rc); wrap.appendChild(cols);
    ctx.hint('Tap one on the left, then its partner on the right');
    return {
      el: wrap, auto: true,
      solve: function () { L.forEach(function (x) { find('l', x.i).b.click(); find('r', x.i).b.click(); }); }
    };
  };

  /* ---------- tap the buggy line ---------- */
  /* Two stages: find the buggy line, then pick the line that repairs it. step.fix = {opts[], a} */
  function bugFix(step, ctx) {
    var sel = null, locked = false, stage = 1, rows = [], fsel = null, fbtns = [], fixText = step.fix.opts[step.fix.a].trim();
    var forder = step.fix.opts.map(function (_, i) { return i; });
    if (!step.fix.keep) forder = SK.shuffle(forder);
    var wrap = h('div', { class: 'q' }, qhead(step));
    var box = h('div', { class: 'bugbox', role: 'radiogroup', 'aria-label': 'Code lines' });
    var go1 = h('button', { type: 'button', class: 'btn block bug-go' }, 'This is the buggy line');
    var go2 = h('button', { type: 'button', class: 'btn block bug-go' }, 'Check my fix');
    var pane = h('div', { class: 'bugfix', hidden: true });
    go1.disabled = true; go2.disabled = true;
    step.lines.forEach(function (code, i) {
      var r = h('button', { type: 'button', class: 'bl', role: 'radio', 'aria-checked': 'false' },
        h('span', { class: 'ln' }, String(i + 1)), h('span', { class: 'ct', html: SK.hl(code) || '&nbsp;' }));
      r.addEventListener('click', function () {
        if (locked || stage !== 1) return; sel = i; SK.sfx('tap');
        rows.forEach(function (x, k) { x.classList.toggle('on', k === i); x.setAttribute('aria-checked', k === i ? 'true' : 'false'); });
        go1.disabled = false;
      });
      rows.push(r); box.appendChild(r);
    });
    function lock() { locked = true; go1.disabled = true; go2.disabled = true; rows.forEach(function (r) { r.disabled = true; }); fbtns.forEach(function (b) { b.disabled = true; }); }
    go1.addEventListener('click', function () {
      if (locked || stage !== 1 || sel == null) return;
      if (sel !== step.bug) {
        lock(); rows.forEach(function (r, k) { if (k === step.bug) r.classList.add('right'); else if (k === sel) r.classList.add('wrong'); });
        ctx.finish(false, { answer: 'Line ' + (step.bug + 1) + ' is the bug.\nFix: ' + fixText, mono: true }); return;
      }
      stage = 2; SK.sfx('ok');
      rows.forEach(function (r, k) { r.disabled = true; r.classList.remove('on'); if (k === step.bug) r.classList.add('right'); });
      go1.hidden = true; pane.hidden = false;
      ctx.hint('Now pick the line that repairs it');
      if (pane.scrollIntoView) pane.scrollIntoView({ block: 'nearest', behavior: SK.reduced() ? 'auto' : 'smooth' });
    });
    pane.appendChild(h('div', { class: 'bank-label' }, 'Found it. How should line ' + (step.bug + 1) + ' read?'));
    var list = h('div', { class: 'opts bug-opts', role: 'radiogroup', 'aria-label': 'Repairs' });
    forder.forEach(function (oi) {
      var b = h('button', { type: 'button', class: 'opt', role: 'radio', 'aria-checked': 'false' },
        h('span', { class: 'lab mono-in', html: SK.hl(step.fix.opts[oi].trim()) }));
      b.addEventListener('click', function () {
        if (locked || stage !== 2) return; fsel = oi; SK.sfx('tap');
        fbtns.forEach(function (x, k) { var on = forder[k] === fsel; x.classList.toggle('on', on); x.setAttribute('aria-checked', on ? 'true' : 'false'); });
        go2.disabled = false;
      });
      fbtns.push(b); list.appendChild(b);
    });
    pane.appendChild(list); pane.appendChild(go2);
    go2.addEventListener('click', function () {
      if (locked || stage !== 2 || fsel == null) return;
      var ok = fsel === step.fix.a; lock();
      fbtns.forEach(function (b, k) { if (forder[k] === step.fix.a) b.classList.add('right'); else if (forder[k] === fsel) b.classList.add('wrong'); });
      ctx.finish(ok, { answer: 'Line ' + (step.bug + 1) + ' should read:\n' + fixText, mono: true });
    });
    wrap.appendChild(box); wrap.appendChild(go1); wrap.appendChild(pane);
    ctx.hint('Tap the buggy line, then press the button');
    return {
      el: wrap, auto: true,
      solve: function () {
        if (stage === 1) { rows[step.bug].click(); go1.click(); }
        if (stage === 2) { fbtns[forder.indexOf(step.fix.a)].click(); go2.click(); }
      }
    };
  }

  Q.bug = function (step, ctx) {
    if (step.fix) return bugFix(step, ctx);
    var sel = null, locked = false, rows = [];
    var wrap = h('div', { class: 'q' }, qhead(step));
    var box = h('div', { class: 'bugbox', role: 'radiogroup', 'aria-label': 'Code lines' });
    step.lines.forEach(function (code, i) {
      var r = h('button', { type: 'button', class: 'bl', role: 'radio', 'aria-checked': 'false' },
        h('span', { class: 'ln' }, String(i + 1)), h('span', { class: 'ct', html: SK.hl(code) || '&nbsp;' }));
      r.addEventListener('click', function () {
        if (locked) return; sel = i; SK.sfx('tap');
        rows.forEach(function (x, k) { x.classList.toggle('on', k === i); x.setAttribute('aria-checked', k === i ? 'true' : 'false'); });
        ctx.setReady(true);
      });
      rows.push(r); box.appendChild(r);
    });
    wrap.appendChild(box);
    return {
      el: wrap,
      check: function () {
        locked = true;
        rows.forEach(function (r, k) { r.disabled = true; if (k === step.bug) r.classList.add('right'); else if (k === sel) r.classList.add('wrong'); });
        var ok = sel === step.bug;
        return { ok: ok, answer: 'Line ' + (step.bug + 1) + ':  ' + step.lines[step.bug].trim() };
      },
      solve: function () { rows[step.bug].click(); }
    };
  };

  /* ---------- build a line of code from pieces (some pieces are decoys) ----------
     step.tokens = every piece, step.a = one accepted sequence or a list of them,
     optional step.before / step.after = read-only code lines around the one being written. */
  function joinTokens(t) {
    var o = '';
    t.forEach(function (x, i) { o = !i ? x : (/^[),;\].]/.test(x) || /[(\[.]$/.test(o)) ? o + x : o + ' ' + x; });
    return o;
  }
  SK.joinTokens = joinTokens;
  Q.build = function (step, ctx) {
    var acc = typeof step.a[0] === 'string' ? [step.a] : step.a;
    var chips = SK.shuffle(step.tokens.map(function (c, i) { return { c: c, used: false, i: i }; }));
    var seq = [], locked = false;
    var wrap = h('div', { class: 'q' }, qhead(step));
    function ctxBlock(lines) { return h('pre', { class: 'codeblock ctx', html: SK.hl(lines.join('\n')) }); }
    if (step.before && step.before.length) wrap.appendChild(ctxBlock(step.before));
    var line = h('div', { class: 'bline', 'aria-live': 'polite' });
    wrap.appendChild(line);
    if (step.after && step.after.length) wrap.appendChild(ctxBlock(step.after));
    var bank = h('div', { class: 'bank bank-build' }), cbtns = [];
    var clr = h('button', { type: 'button', class: 'btn alt sm bclear' }, 'Clear');
    clr.addEventListener('click', function () { if (locked) return; seq.forEach(function (ci) { chips[ci].used = false; }); seq = []; render(); SK.sfx('tap'); });
    chips.forEach(function (ch, ci) {
      var b = h('button', { type: 'button', class: 'chipbtn mono' }, ch.c);
      b.addEventListener('click', function () { if (locked || ch.used) return; seq.push(ci); ch.used = true; render(); SK.sfx('tap'); });
      cbtns.push(b); bank.appendChild(b);
    });
    function render() {
      SK.clear(line);
      if (!seq.length) line.appendChild(h('span', { class: 'ph' }, 'Tap the pieces below to write the line'));
      seq.forEach(function (ci, k) {
        var t = h('button', { type: 'button', class: 'chipbtn mono tk', 'aria-label': 'Take back ' + chips[ci].c }, chips[ci].c);
        t.addEventListener('click', function () { if (locked) return; seq.splice(k, 1); chips[ci].used = false; render(); SK.sfx('tap'); });
        line.appendChild(t);
      });
      cbtns.forEach(function (b, i) { b.disabled = chips[i].used; b.classList.toggle('used', chips[i].used); });
      clr.hidden = !seq.length;
      ctx.setReady(seq.length > 0);
    }
    var longest = Math.max.apply(null, acc.map(function (a) { return a.length; }));
    wrap.appendChild(h('div', { class: 'bank-label' }, step.tokens.length > longest ? 'Pieces. Not every one belongs.' : 'Pieces'));
    wrap.appendChild(bank); wrap.appendChild(clr);
    render();
    return {
      el: wrap,
      check: function () {
        locked = true;
        var got = seq.map(function (ci) { return chips[ci].c; });
        var ok = acc.some(function (a) { return a.length === got.length && a.every(function (t, i) { return t === got[i]; }); });
        line.classList.add(ok ? 'right' : 'wrong');
        cbtns.forEach(function (b) { b.disabled = true; });
        Array.prototype.forEach.call(line.querySelectorAll('button'), function (b) { b.disabled = true; });
        clr.hidden = true;
        return { ok: ok, answer: joinTokens(acc[0]), mono: true };
      },
      solve: function () {
        if (locked) return;
        seq.forEach(function (ci) { chips[ci].used = false; }); seq = [];
        acc[0].forEach(function (want) {
          for (var ci = 0; ci < chips.length; ci++) if (!chips[ci].used && chips[ci].c === want) { cbtns[ci].click(); break; }
        });
      }
    };
  };

  /* ---------- sort cards into buckets, one at a time ---------- */
  Q.sort = function (step, ctx) {
    var items = SK.shuffle(step.items), at = 0, mistakes = 0, over = false, answered = false;
    var wrap = h('div', { class: 'q' }, qhead(step));
    var prog = h('div', { class: 'sort-prog', 'aria-hidden': 'true' });
    items.forEach(function () { prog.appendChild(h('i')); });
    var card = h('div', { class: 'sort-card card', 'aria-live': 'polite' });
    var fb = h('div', { class: 'sort-fb', 'aria-live': 'polite' });
    var next = h('button', { type: 'button', class: 'btn alt sort-next', hidden: true }, 'Next card');
    var bw = h('div', { class: 'buckets' }), bb = [];
    step.buckets.forEach(function (name, bi) {
      var b = h('button', { type: 'button', class: 'bucket', html: SK.fmt(name, true) });
      b.addEventListener('click', function () { pick(bi); });
      bb.push(b); bw.appendChild(b);
    });
    function show() {
      var it = items[at]; answered = false;
      card.innerHTML = step.code ? '<code>' + SK.hl(it.t) + '</code>' : SK.fmt(it.t, true);
      card.className = 'sort-card card' + (step.code ? ' is-code' : '');
      fb.textContent = ''; fb.className = 'sort-fb'; next.hidden = true;
      bb.forEach(function (b) { b.disabled = false; b.classList.remove('right', 'wrong'); });
      Array.prototype.forEach.call(prog.children, function (d, i) { d.classList.toggle('now', i === at); });
    }
    function pick(bi) {
      if (over || answered) return;
      answered = true; var it = items[at], ok = bi === it.b;
      SK.sfx(ok ? 'ok' : 'bad'); if (!ok) { mistakes++; SK.buzz(40); }
      bb.forEach(function (b, k) { b.disabled = true; if (k === it.b) b.classList.add('right'); else if (k === bi) b.classList.add('wrong'); });
      prog.children[at].classList.add(ok ? 'ok' : 'no');
      fb.className = 'sort-fb ' + (ok ? 'ok' : 'no');
      fb.innerHTML = '<strong>' + (ok ? 'Yes. ' : 'Not quite. ') + '</strong>' + SK.fmt(it.why || '', true);
      next.textContent = at === items.length - 1 ? 'Finish' : 'Next card'; next.hidden = false; next.focus();
    }
    next.addEventListener('click', function () {
      if (at === items.length - 1) { over = true; ctx.finish(mistakes === 0, { answer: '', requeue: false }); return; }
      at++; show();
    });
    wrap.appendChild(prog); wrap.appendChild(card); wrap.appendChild(bw); wrap.appendChild(fb); wrap.appendChild(next);
    ctx.hint('Sort each card');
    show();
    return {
      el: wrap, auto: true,
      solve: function () {
        for (var n = 0; n < items.length; n++) { pick(items[at].b); next.click(); }
      }
    };
  };
})();
