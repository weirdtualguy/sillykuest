/* Teaching steps and the code reader. SK.renderStep(step, ctx) -> {el, check?, solve?, auto?} */
(function () {
  var SK = window.SK, h = SK.h;
  var T = (SK.steps = {});

  function intro(step) { return step.x ? h('div', { class: 'intro', html: SK.paras(step.x) }) : null; }

  /* Sil says something */
  T.say = function (step, ctx) {
    ctx.setReady(true);
    var el = h('div', { class: 'say' },
      h('div', { class: 'say-sil', html: SK.sil(step.m || 'hi', 84) }),
      h('div', { class: 'bubble', html: SK.paras(step.x) }));
    return { el: el };
  };

  /* Plain words first, then the real name gets stamped on */
  T.reveal = function (step, ctx) {
    var g = step.id && SK.gloss[step.id];
    var done = false;
    var out = h('div', { class: 'rv-out', hidden: true },
      h('div', { class: 'stamp', 'aria-live': 'polite' }, step.term || (g && g.term)),
      h('div', { class: 'rv-def', html: SK.paras(step.x || (g && g.s) || '') }));
    if (g && g.p) out.appendChild(h('div', { class: 'rv-prec', html: '<strong>Precise version:</strong> ' + SK.fmt(g.p, true) }));
    var btn = h('button', { type: 'button', class: 'btn rv-btn' }, 'Reveal the real name');
    btn.addEventListener('click', function () {
      if (done) return; done = true;
      btn.hidden = true; out.hidden = false; SK.sfx('stamp'); SK.buzz(25); ctx.setReady(true);
      out.querySelector('.stamp').classList.add('thump');
    });
    ctx.setReady(false); ctx.hint('Tap to reveal the real name');
    return {
      el: h('div', { class: 'reveal' },
        h('div', { class: 'rv-plain card' }, h('div', { class: 'rv-k' }, 'In plain words'), h('div', { class: 'rv-t', html: SK.paras(step.plain) })),
        btn, out),
      solve: function () { btn.click(); }
    };
  };

  /* Two side-by-side lists */
  T.compare = function (step, ctx) {
    ctx.setReady(true);
    function col(c, k) {
      return h('div', { class: 'cmp-col card cmp-' + k },
        h('h3', c.h),
        h('ul', c.items.map(function (t) { return h('li', { html: SK.fmt(t) }); })));
    }
    return { el: h('div', null, intro(step), h('div', { class: 'cmp' }, col(step.a, 'a'), col(step.b, 'b'))) };
  };

  /* Tap-to-open cards */
  T.explore = function (step, ctx) {
    ctx.setReady(true);
    var opened = {}, n = 0;
    var count = h('div', { class: 'xp-count' }, '0 of ' + step.items.length + ' opened');
    var list = h('div', { class: 'xp-list' });
    step.items.forEach(function (it, i) {
      var body = h('div', { class: 'xp-body', hidden: true, html: SK.paras(it.x) });
      var b = h('button', { type: 'button', class: 'xp-item', 'aria-expanded': 'false' },
        it.icon ? SK.ico(it.icon, 22, 'xp-ic') : null,
        h('span', { class: 'xp-h', html: SK.fmt(it.h, true) }),
        h('span', { class: 'xp-chev', html: SK.icon('plus', 18) }));
      b.addEventListener('click', function () {
        var open = body.hidden;
        body.hidden = !open; b.setAttribute('aria-expanded', open ? 'true' : 'false'); b.classList.toggle('open', open);
        b.querySelector('.xp-chev').innerHTML = SK.icon(open ? 'minus' : 'plus', 18);
        if (open && !opened[i]) { opened[i] = 1; n++; count.textContent = n + ' of ' + step.items.length + ' opened'; }
        SK.sfx('tap');
      });
      list.appendChild(h('div', { class: 'xp-card card' }, b, body));
    });
    return { el: h('div', null, intro(step), count, list) };
  };

  /* Simple table */
  T.table = function (step, ctx) {
    ctx.setReady(true);
    var t = h('table', { class: 'tbl' + (step.code ? ' tbl-code' : '') },
      h('thead', null, h('tr', step.cols.map(function (c) { return h('th', c); }))),
      h('tbody', step.rows.map(function (r) {
        return h('tr', r.map(function (c, i) { return h('td', { html: step.code && i === 0 ? '<code>' + SK.esc(c) + '</code>' : SK.fmt(c, true) }); }));
      })));
    return { el: h('div', null, intro(step), h('div', { class: 'tbl-wrap' }, t)) };
  };

  /* ---------------- code reader ---------------- */
  SK.codeReader = function (o) {
    var showPro = !!o.pro, sel = -1, say = null;
    /* Only code written for teaching is tagged: it has not been through the compiler. */
    var head = h('div', { class: 'cr-head' }, h('span', { class: 'cr-title' }, o.title || 'Silverscript'),
      o.badge === 'sketch' ? h('span', { class: 'cr-badge sketch', title: 'Written for teaching. Not compiler-tested.' }, 'Teaching sketch') : null);
    if (o.copy) {
      head.appendChild(h('button', {
        type: 'button', class: 'cr-copy', 'aria-label': 'Copy code', html: SK.icon('copy', 18),
        onclick: function () { SK.copy(o.lines.map(function (l) { return l[0]; }).join('\n')).then(function () { SK.toast('Code copied'); }, function () { SK.toast('Could not copy'); }); }
      }));
    }
    var pre = h('div', { class: 'cr-code' }), rows = [];
    function explainable(i) { return !!o.lines[i][1]; }
    function nextFrom(i) { for (var k = i + 1; k < o.lines.length; k++) if (explainable(k)) return k; return -1; }
    function paint() {
      if (say) { say.remove(); say = null; }
      rows.forEach(function (r, i) { if (r) r.classList.toggle('on', i === sel); });
      if (sel < 0) return;
      var L = o.lines[sel], nx = nextFrom(sel);
      say = h('div', { class: 'cl-say', role: 'status' },
        h('span', { class: 'cl-face', html: SK.sil('hi', 30) }),
        h('div', { class: 'cl-txt' },
          h('div', { html: SK.fmt(L[1], true) }),
          (showPro && L[2]) ? h('div', { class: 'cl-pro', html: '<strong>Pro note.</strong> ' + SK.fmt(L[2], true) }) : null,
          nx >= 0 ? h('button', { type: 'button', class: 'cl-next', onclick: function () { select(nx, true); } }, 'Next line') : null));
      rows[sel].parentNode.insertBefore(say, rows[sel].nextSibling);
    }
    function select(i, scroll) {
      sel = i; paint(); SK.sfx('tap');
      if (scroll && say && say.scrollIntoView) say.scrollIntoView({ block: 'nearest', behavior: SK.reduced() ? 'auto' : 'smooth' });
    }
    o.lines.forEach(function (L, i) {
      var inner = '<span class="ln">' + (i + 1) + '</span><span class="ct">' + (SK.hl(L[0]) || '&nbsp;') + '</span>';
      var r;
      if (L[1]) { r = h('button', { type: 'button', class: 'cl', html: inner, onclick: function () { select(i, true); } }); }
      else { r = h('div', { class: 'cl dim', html: inner }); }
      rows.push(r); pre.appendChild(r);
    });
    var wrap = h('div', { class: 'cr' }, head, pre);
    var first = -1; for (var i = 0; i < o.lines.length; i++) if (explainable(i)) { first = i; break; }
    if (first >= 0 && o.autoOpen !== false) { sel = first; paint(); }
    return { el: wrap, setPro: function (v) { showPro = v; paint(); } };
  };

  T.code = function (step, ctx) {
    ctx.setReady(true);
    var ex = step.ex ? SK.examples[step.ex] : step;
    var cr = SK.codeReader({ lines: step.lines || ex.lines, title: step.title || ex.title, badge: step.badge || ex.badge });
    var wrap = h('div', null, intro(step), cr.el);
    if (step.cap) wrap.appendChild(h('p', { class: 'cap', html: SK.fmt(step.cap) }));
    return { el: wrap };
  };

  /* Widgets live in widgets.js */
  T.widget = function (step, ctx) {
    var w = SK.widgets[step.w];
    if (!w) { ctx.setReady(true); return { el: h('p', 'Missing widget: ' + step.w) }; }
    ctx.setReady(!step.gate);
    var inst = w(step, ctx) || {};
    var el = h('div', { class: 'widget-step' }, intro(step), inst.el);
    return { el: el, solve: inst.solve };
  };

  /* Public: render any step, adding the optional Pro corner */
  SK.renderStep = function (step, ctx) {
    var fn = T[step.t] || SK.quiz[step.t];
    if (!fn) { ctx.setReady(true); return { el: h('p', 'Unknown step type: ' + step.t) }; }
    var inst = fn(step, ctx);
    if (step.pro && !SK.QUIZ[step.t]) {
      var d = h('details', { class: 'pro' }, h('summary', null, 'Pro corner: ' + step.pro.h),
        h('div', { class: 'pro-body', html: SK.paras(step.pro.x) }));
      inst.el.appendChild(d);
    }
    return inst;
  };
})();
