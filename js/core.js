/* SillyKuest core: tiny DOM helper, text formatter, progress store, sound,
   icons, the mascot, identicons, envelopes, modal + toast + term popover.
   Plain objects and functions only. No dependencies. */
(function () {
  'use strict';
  var SK = (window.SK = window.SK || {});
  SK.version = '3.1.1';
  /* The Kaspa address people can send KAS to. Shown in the Support sheet (You tab, Learn footer). */
  SK.DONATE = 'kaspa:qp26rvw8t7qxl2kyu70us2tptz3u4p09f6h6l4k4gxlc40uau2m0xvjjw9whl';

  /* ------------------------------------------------------------ DOM */
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
    el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
  function h(tag, attrs) {
    var el = document.createElement(tag), i = 2;
    if (attrs && (typeof attrs !== 'object' || attrs.nodeType || Array.isArray(attrs))) { i = 1; attrs = null; }
    if (attrs) {
      for (var k in attrs) {
        var v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'style' && typeof v === 'object') {
          for (var s in v) { if (s.indexOf('--') === 0) el.style.setProperty(s, v[s]); else el.style[s] = v[s]; }
        } else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  SK.h = h;
  SK.$ = function (s, r) { return (r || document).querySelector(s); };
  SK.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  SK.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  SK.esc = esc;

  /* Inline markup: **bold**, `code`, [[glossary-id|shown text]] */
  function fmt(s, plain) {
    s = esc(s);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, function (_, id, txt) {
      var g = SK.gloss && SK.gloss[id];
      var label = txt || (g ? g.term : id);
      if (plain) return label;
      return '<button type="button" class="term" data-term="' + id + '">' + label + '</button>';
    });
    return s;
  }
  SK.fmt = fmt;
  SK.paras = function (s, plain) {
    return String(s).split('\n\n').map(function (p) { return '<p>' + fmt(p, plain).replace(/\n/g, '<br>') + '</p>'; }).join('');
  };
  SK.shuffle = function (a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };
  SK.pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
  SK.clamp = function (n, lo, hi) { return Math.max(lo, Math.min(hi, n)); };
  SK.reduced = function () {
    return (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || (SK.state && SK.state.set.motion === false);
  };
  SK.wait = function (ms, fn) { return setTimeout(fn, SK.reduced() ? 0 : ms); };

  /* ---------------------------------------------------------- store */
  var KEY = 'sillykuest.v2';
  /* Saved Review keys look like "3-4:2" (lesson:stepIndex). When a teaching step is inserted into a lesson, the keys of the
     later steps move with it. Each entry here runs once per saved state (state.mig counts how many have run).
     Add new entries at the END only, and bump nothing else. Two kinds of entry:
       { lesson, at, by }   a step was inserted at index `at` of `lesson`: later Review keys move by `by`.
       { remap: {...} }     lessons were renumbered, split or reshaped. `remap` is described at W1_31 below. */
  /* 3.1.0 reshaped World 1 (one new idea per lesson): old 1-2 split into 1-2 and 1-3, every later lesson moved up one, and
     the old mass and DAA questions left the lesson path. Everything saved under an old id moves with its lesson.
       done    old lesson id -> the new ids it now covers (a split lesson counts for both halves, with the same stars)
       moved   lessons whose steps kept their order: old id -> [new id, step offset] (resume place and Review keys follow)
       keys    Review keys of reshaped lessons: old key -> new key. A key that is not listed lost its question and is dropped.
     A saved place inside a reshaped lesson is dropped too, so that lesson starts again from its first step. */
  var W1_31 = {
    done: { '1-2': ['1-2', '1-3'], '1-3': ['1-4'], '1-4': ['1-5'], '1-5': ['1-6'], '1-6': ['1-7'] },
    moved: { '1-3': ['1-4', 3], '1-4': ['1-5', 0] },
    keys: { '1-2:5': '1-3:7', '1-2:6': '1-3:6', '1-2:7': '1-4:2', '1-5:6': '1-6:5', '1-5:8': '1-6:7', '1-5:9': '1-6:8', '1-5:13': '1-6:9', '1-6:3': '1-7:3' }
  };
  SK.KEYSHIFTS = [{ lesson: '3-4', at: 1, by: 1 }, { remap: W1_31 }];
  function remap(st, m) {
    var k, d = {}, rz = {}, rr = {}, seen = {}, keys = [];
    function keep(t, v) { if (!d[t] || d[t].stars < v.stars) d[t] = { stars: v.stars }; }
    for (k in st.done) (m.done[k] || [k]).forEach(function (t) { keep(t, st.done[k]); });
    for (k in st.resume) {
      if (m.moved[k]) { rz[m.moved[k][0]] = st.resume[k] + m.moved[k][1]; if (st.rs[k]) rr[m.moved[k][0]] = st.rs[k]; }
      else if (!m.done[k]) { rz[k] = st.resume[k]; if (st.rs[k]) rr[k] = st.rs[k]; }
    }
    (st.mistakes || []).forEach(function (key) {
      var p = String(key).split(':'), nk = key;
      if (m.keys[key]) nk = m.keys[key];
      else if (m.moved[p[0]]) nk = m.moved[p[0]][0] + ':' + (+p[1] + m.moved[p[0]][1]);
      else if (m.done[p[0]]) nk = null;
      if (nk && !seen[nk]) { seen[nk] = 1; keys.push(nk); }
    });
    st.done = d; st.resume = rz; st.rs = rr; st.mistakes = keys;
  }
  function migrate(st) {
    var n = +st.mig || 0;
    for (; n < SK.KEYSHIFTS.length; n++) {
      var s = SK.KEYSHIFTS[n];
      if (s.remap) { remap(st, s.remap); continue; }
      st.mistakes = (st.mistakes || []).map(function (k) {
        var p = String(k).split(':');
        return p[0] === s.lesson && +p[1] >= s.at ? p[0] + ':' + (+p[1] + s.by) : k;
      });
    }
    st.mig = n;
    return st;
  }
  function defaults() {
    return {
      v: 2, mig: SK.KEYSHIFTS.length, xp: 0, streak: 0, best: 0, last: null, today: { d: null, xp: 0 },
      done: {}, bosses: {}, mistakes: [], badges: {}, resume: {}, rs: {},
      stats: { ok: 0, total: 0, bug: 0 },
      set: { sound: true, theme: 'system', openAll: false, motion: true },
      level: null
    };
  }
  /* Saved data is untrusted input: localStorage can be edited and progress codes get pasted from anywhere.
     Keep only known keys, with the right shape, so bad data can never break the app. */
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function cnt(v) { return typeof v === 'number' && isFinite(v) && v >= 0 ? Math.min(Math.floor(v), 1e9) : 0; }
  function isDay(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v); }
  function sanitize(o) {
    var d = defaults(), k;
    if (!isObj(o)) return d;
    d.mig = o.mig === undefined ? 0 : cnt(o.mig); /* saved before the shift table existed */
    d.xp = cnt(o.xp); d.streak = cnt(o.streak); d.best = cnt(o.best);
    d.last = isDay(o.last) ? o.last : null;
    if (isObj(o.today) && isDay(o.today.d)) d.today = { d: o.today.d, xp: cnt(o.today.xp) };
    if (isObj(o.done)) for (k in o.done) if (/^\d-\d$/.test(k) && isObj(o.done[k])) d.done[k] = { stars: SK.clamp(cnt(o.done[k].stars), 1, 3) };
    if (isObj(o.bosses)) for (k in o.bosses) if (/^\d$/.test(k) && o.bosses[k]) d.bosses[k] = true;
    if (Array.isArray(o.mistakes)) d.mistakes = o.mistakes.filter(function (m, i, a) { return typeof m === 'string' && /^\d-\d:\d{1,3}$/.test(m) && a.indexOf(m) === i; }).slice(0, 400);
    if (isObj(o.badges)) for (k in o.badges) if (/^[a-z0-9-]{1,24}$/.test(k) && o.badges[k]) d.badges[k] = cnt(o.badges[k]) || 1;
    if (isObj(o.resume)) for (k in o.resume) if (/^\d-\d$/.test(k) && cnt(o.resume[k]) > 0) d.resume[k] = cnt(o.resume[k]);
    if (isObj(o.rs)) for (k in o.rs) if (d.resume[k] && isObj(o.rs[k])) d.rs[k] = { m: cnt(o.rs[k].m), t: cnt(o.rs[k].t), o: cnt(o.rs[k].o) };
    if (isObj(o.stats)) ['ok', 'total', 'bug', 'build', 'heist'].forEach(function (n) { if (o.stats[n] !== undefined) d.stats[n] = cnt(o.stats[n]); });
    if (isObj(o.set)) {
      ['sound', 'openAll', 'motion', 'seenEnd'].forEach(function (n) { if (typeof o.set[n] === 'boolean') d.set[n] = o.set[n]; });
      if (['system', 'light', 'dark'].indexOf(o.set.theme) >= 0) d.set.theme = o.set.theme;
    }
    d.level = ['new', 'basics', 'builder'].indexOf(o.level) >= 0 ? o.level : null;
    return d;
  }
  function load() {
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* private mode or blocked storage: run in memory */ }
    return migrate(sanitize(raw));
  }
  SK.state = load();
  SK.saveOk = true;
  SK.save = function () { try { localStorage.setItem(KEY, JSON.stringify(SK.state)); SK.saveOk = true; } catch (e) { SK.saveOk = false; } };
  SK.reset = function () { SK.state = defaults(); SK.save(); };
  /* Progress codes are base64 of the UTF-8 JSON. */
  function b64e(s) { var b = new TextEncoder().encode(s), r = ''; for (var i = 0; i < b.length; i++) r += String.fromCharCode(b[i]); return btoa(r); }
  function b64d(s) { var r = atob(s), b = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) b[i] = r.charCodeAt(i); return new TextDecoder().decode(b); }
  SK.exportCode = function () { return b64e(JSON.stringify(SK.state)); };
  /* A bad code returns false and leaves the current progress untouched. */
  SK.importCode = function (code) {
    try {
      var o = JSON.parse(b64d(String(code).replace(/\s+/g, '')));
      if (!isObj(o) || o.v !== 2) return false;
      SK.state = migrate(sanitize(o));
      SK.save();
      return true;
    } catch (e) { return false; }
  };

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  SK.day = function (d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  function dayDiff(a, b) {
    var pa = a.split('-'), pb = b.split('-');
    return Math.round((new Date(pb[0], pb[1] - 1, pb[2]) - new Date(pa[0], pa[1] - 1, pa[2])) / 864e5);
  }
  SK.streakNow = function () {
    var s = SK.state;
    if (!s.last) return 0;
    return dayDiff(s.last, SK.day()) <= 1 ? s.streak : 0;
  };
  SK.touchStreak = function () {
    var s = SK.state, t = SK.day();
    if (s.last === t) return false;
    s.streak = s.last && dayDiff(s.last, t) === 1 ? s.streak + 1 : 1;
    s.best = Math.max(s.best, s.streak);
    s.last = t;
    return true;
  };
  SK.todayXp = function () { return SK.state.today.d === SK.day() ? SK.state.today.xp : 0; };
  SK.addXp = function (n) {
    var s = SK.state, t = SK.day();
    if (s.today.d !== t) s.today = { d: t, xp: 0 };
    s.today.xp += n; s.xp += n;
  };
  SK.GOAL = 30;
  SK.ranks = [
    { at: 0, name: 'Wispling' }, { at: 100, name: 'Shade' }, { at: 300, name: 'Spirit' },
    { at: 600, name: 'Specter' }, { at: 900, name: 'Phantom' }, { at: 1200, name: 'Ghost Architect' }
  ];
  SK.rank = function (xp) {
    xp = xp == null ? SK.state.xp : xp;
    var i = 0;
    for (var k = 0; k < SK.ranks.length; k++) if (xp >= SK.ranks[k].at) i = k;
    var cur = SK.ranks[i], nxt = SK.ranks[i + 1] || null;
    return { name: cur.name, index: i, next: nxt, pct: nxt ? (xp - cur.at) / (nxt.at - cur.at) : 1 };
  };

  /* Lesson resume: leaving a lesson part-way saves the step index, so the next start picks up there. */
  SK.resumeAt = function (l) {
    var i = SK.state.resume && SK.state.resume[l.id];
    return i > 0 && i < l.steps.length ? i : 0;
  };
  /* rs = {m: slips, t: questions seen, o: right first time} so stars and XP still count what happened before you left. */
  SK.setResume = function (id, i, rs) {
    var s = SK.state; if (!s.resume) s.resume = {}; if (!s.rs) s.rs = {};
    if (i > 0) { s.resume[id] = i; if (rs) s.rs[id] = rs; } else { delete s.resume[id]; delete s.rs[id]; }
    SK.save();
  };
  SK.minsLeft = function (l, i) { return Math.max(1, Math.round(l.min * (1 - (i || 0) / l.steps.length))); };
  SK.num = function (l) { return String(l.id).replace('-', '.'); };

  /* Progress ring as inline SVG. pct 0..1. */
  SK.ring = function (pct, size, sw, color, track) {
    var r = (size - sw) / 2, c = 2 * Math.PI * r, cx = size / 2;
    return '<svg class="rg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true">' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + (track || 'var(--paper-3)') + '" stroke-width="' + sw + '"/>' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + (color || 'var(--teal)') + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + (c * (1 - Math.max(0.001, Math.min(1, pct)))).toFixed(2) + '" transform="rotate(-90 ' + cx + ' ' + cx + ')"/></svg>';
  };

  /* Copy text. Uses the Clipboard API, then a hidden textarea. The promise rejects when the browser refuses. */
  SK.copy = function (txt) {
    function legacy() {
      return new Promise(function (res, rej) {
        var ta = h('textarea', { 'aria-hidden': 'true', readonly: true, tabindex: '-1', style: { position: 'fixed', top: 0, left: 0, opacity: 0 } });
        ta.value = txt; document.body.appendChild(ta); ta.focus(); ta.select();
        var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
        ta.remove();
        if (ok) res(); else rej(new Error('copy blocked'));
      });
    }
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt).catch(legacy);
    return legacy();
  };

  /* Screen reader announcements: one polite live region that exists before it is used. */
  var live = null;
  SK.announce = function (msg) {
    if (!live) { live = h('div', { class: 'sr', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }); document.body.appendChild(live); }
    live.textContent = '';
    setTimeout(function () { live.textContent = msg; }, 40);
  };

  /* ---------------------------------------------------------- sound */
  var ac = null;
  function tone(f, t0, dur, type, vol) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, ac.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.07, ac.currentTime + t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t0 + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(ac.currentTime + t0); o.stop(ac.currentTime + t0 + dur + 0.05);
  }
  SK.sfx = function (kind) {
    if (!SK.state.set.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      if (kind === 'ok') { tone(523, 0, 0.12, 'triangle'); tone(784, 0.09, 0.2, 'triangle'); }
      else if (kind === 'bad') { tone(220, 0, 0.22, 'sawtooth', 0.04); tone(165, 0.1, 0.25, 'sawtooth', 0.04); }
      else if (kind === 'tap') tone(660, 0, 0.05, 'square', 0.025);
      else if (kind === 'done') [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.11, 0.28, 'triangle', 0.07); });
      else if (kind === 'stamp') tone(110, 0, 0.18, 'sine', 0.12);
    } catch (e) {}
  };
  SK.buzz = function (p) { if (SK.state.set.sound && navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} };

  /* ---------------------------------------------------------- icons */
  var P = {
    flame: '<path d="M12 3c.8 3.8 5 5.4 5 10a5 5 0 0 1-10 0c0-2 .9-3.2 2-4 0 2 .8 3 2 3-.5-3.4-.4-6.2 1-9z"/>',
    star: '<path d="M12 3l2.8 5.9 6.2.8-4.6 4.3 1.2 6.3L12 17.3 6.4 20.3l1.2-6.3L3 9.7l6.2-.8z"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
    flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/><path d="M7.5 15h9"/>',
    crown: '<path d="M4 8l4 4 4-7 4 7 4-4-1.5 10h-13z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/>',
    bolt: '<path d="M13 2L5 14h6l-1 8 8-12h-6l1-8z"/>',
    sound: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    mute: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l4 6M21 9l-4 6"/>',
    map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>',
    envelope: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3.5 7.5L12 13.5l8.5-6"/>',
    code: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.6 8-8 9-4.4-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
    tree: '<circle cx="6" cy="5" r="2.5"/><circle cx="18" cy="12" r="2.5"/><circle cx="6" cy="19" r="2.5"/><path d="M6 7.5v9M6 12c0-3 6-1 9.5 0"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    rocket: '<path d="M12 3c4 2 6 6 6 10l-3 3H9l-3-3c0-4 2-8 6-10z"/><path d="M9 16l-2 4 4-1M15 16l2 4-4-1"/><circle cx="12" cy="10" r="1.6"/>',
    skull: '<path d="M5 12a7 7 0 0 1 14 0v3l-2 1v3H7v-3l-2-1z"/><path d="M9.5 12v.01M14.5 12v.01M11 17v2M13 17v2"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    play: '<path d="M7 4l13 8-13 8z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
    bug: '<ellipse cx="12" cy="13" rx="5" ry="6.5"/><path d="M12 7V4M7 11H3M17 11h4M7.5 16.5L4 19M16.5 16.5L20 19M9 5l1.5 2M15 5l-1.5 2"/>',
    heart: '<path d="M12 20.4S3.4 15.4 3.4 9.1A4.7 4.7 0 0 1 12 6.6a4.7 4.7 0 0 1 8.6 2.5c0 6.300-8.600 11.300-8.600 11.300z"/>',
    coin: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M9.5 10a2.5 1.8 0 0 1 5 0c0 2-5 1.4-5 4a2.5 1.8 0 0 0 5 0"/>'
  };
  SK.icon = function (name, size, cls) {
    return '<svg class="ic ' + (cls || '') + '" width="' + (size || 22) + '" height="' + (size || 22) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  };
  SK.ico = function (name, size, cls) { var s = h('span', { class: 'ico ' + (cls || '') }); s.innerHTML = SK.icon(name, size); return s; };

  /* --------------------------------------------------------- mascot */
  SK.sil = function (mood, size) {
    mood = mood || 'hi';
    var eyes = '<ellipse cx="46" cy="58" rx="5.2" ry="7.2" fill="#1D1B45"/><ellipse cx="74" cy="58" rx="5.2" ry="7.2" fill="#1D1B45"/><circle cx="47.8" cy="55.4" r="1.9" fill="#fff"/><circle cx="75.8" cy="55.4" r="1.9" fill="#fff"/>';
    var mouth = '<path d="M52 73q8 8 16 0" fill="none" stroke="#1D1B45" stroke-width="3.2" stroke-linecap="round"/>';
    var extra = '', armL = 'rotate(8 20 84)', armR = 'rotate(-8 100 84)';
    if (mood === 'yay') {
      eyes = '<path d="M40 61q6-9 12 0M68 61q6-9 12 0" fill="none" stroke="#1D1B45" stroke-width="3.6" stroke-linecap="round"/>';
      mouth = '<path d="M50 70q10 16 20 0z" fill="#1D1B45" stroke="#1D1B45" stroke-width="3" stroke-linejoin="round"/><path d="M55 77q5 4 10 0" fill="#FF7F90"/>';
      armL = 'rotate(-55 20 84)'; armR = 'rotate(55 100 84)';
    } else if (mood === 'think') {
      eyes = '<ellipse cx="47" cy="56" rx="5.2" ry="7.2" fill="#1D1B45"/><ellipse cx="75" cy="56" rx="5.2" ry="7.2" fill="#1D1B45"/><circle cx="49" cy="52.6" r="1.9" fill="#fff"/><circle cx="77" cy="52.6" r="1.9" fill="#fff"/><path d="M38 44l12-3M70 41l12 3" stroke="#1D1B45" stroke-width="3" stroke-linecap="round"/>';
      mouth = '<path d="M54 77h12" stroke="#1D1B45" stroke-width="3.2" stroke-linecap="round"/>';
    } else if (mood === 'oops') {
      mouth = '<path d="M52 80q8-8 16 0" fill="none" stroke="#1D1B45" stroke-width="3.2" stroke-linecap="round"/>';
      extra = '<path d="M92 36q5 8 0 11q-5-3 0-11z" fill="#55B9FF" stroke="#1D1B45" stroke-width="2.4"/>';
    } else if (mood === 'wow') {
      mouth = '<ellipse cx="60" cy="77" rx="5.5" ry="7" fill="#1D1B45"/>';
      eyes = '<ellipse cx="46" cy="56" rx="6" ry="8.4" fill="#1D1B45"/><ellipse cx="74" cy="56" rx="6" ry="8.4" fill="#1D1B45"/><circle cx="48" cy="53" r="2.3" fill="#fff"/><circle cx="76" cy="53" r="2.3" fill="#fff"/>';
      armL = 'rotate(-30 20 84)'; armR = 'rotate(30 100 84)';
    } else if (mood === 'calm') {
      eyes = '<path d="M40 60q6 6 12 0M68 60q6 6 12 0" fill="none" stroke="#1D1B45" stroke-width="3.4" stroke-linecap="round"/>';
    }
    var body = 'M20 62C20 32 38 12 60 12S100 32 100 62V104a10 10 0 0 1-20 0a10 10 0 0 1-20 0a10 10 0 0 1-20 0a10 10 0 0 1-20 0Z';
    return '<svg class="sil sil-' + mood + '" width="' + (size || 96) + '" height="' + (size || 96) * 1.08 + '" viewBox="0 0 120 130" role="img" aria-label="Sil the ghost">' +
      '<ellipse class="sil-shadow" cx="60" cy="124" rx="28" ry="4.5" fill="rgba(29,27,69,.22)"/>' +
      '<g class="sil-float">' +
      '<path d="M60 13q-3-9 7-10" fill="none" stroke="#37D6B4" stroke-width="4.5" stroke-linecap="round"/>' +
      '<ellipse cx="18" cy="84" rx="9" ry="5.5" fill="#fff" stroke="#1D1B45" stroke-width="3.4" transform="' + armL + '"/>' +
      '<ellipse cx="102" cy="84" rx="9" ry="5.5" fill="#fff" stroke="#1D1B45" stroke-width="3.4" transform="' + armR + '"/>' +
      '<path d="' + body + '" fill="#fff" stroke="#1D1B45" stroke-width="3.6" stroke-linejoin="round"/>' +
      '<ellipse cx="36" cy="70" rx="7" ry="4.4" fill="#FF7F90" opacity=".55"/><ellipse cx="84" cy="70" rx="7" ry="4.4" fill="#FF7F90" opacity=".55"/>' +
      eyes + mouth + extra + '</g></svg>';
  };

  /* ------------------------------------------- hashes and identicons */
  function hash53(str, seed) {
    var h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (var i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }
  SK.hex = function (seed, len) {
    var out = '', s = 0;
    while (out.length < len) { var x = hash53(seed, s++).toString(16); out += ('00000000000000' + x).slice(-14); }
    return out.slice(0, len);
  };
  SK.short = function (seed) { var x = SK.hex(seed, 16); return '0x' + x.slice(0, 4) + '\u2026' + x.slice(-4); };
  var PAL = ['#2FD3B0', '#8A7BFF', '#FF6F83', '#FFC233', '#4DB5FF', '#FF9A4D'];
  SK.identicon = function (seed, size) {
    var a = hash53(seed, 1) >>> 0, rects = '', r, c;
    a = (a ^ (a >>> 9)) >>> 0;
    for (r = 0; r < 5; r++) for (c = 0; c < 3; c++) {
      if ((a >>> (r * 3 + c)) & 1) {
        rects += '<rect x="' + c + '" y="' + r + '" width="1" height="1"/>';
        if (c < 2) rects += '<rect x="' + (4 - c) + '" y="' + r + '" width="1" height="1"/>';
      }
    }
    return '<svg viewBox="0 0 5 5" width="' + size + '" height="' + size + '" shape-rendering="crispEdges" aria-hidden="true"><rect width="5" height="5" fill="#fff"/><g fill="' + PAL[(a >>> 15) % 6] + '">' + rects + '</g></svg>';
  };

  /* -------------------------------------------------------- envelope */
  /* o: {amt, sub, stamp (seed), mark (seed), state: 'sealed'|'open'|'used'|'locked', accent, cls, label} */
  SK.env = function (o) {
    var open = o.state === 'open';
    var svg = '<svg class="env-svg" viewBox="0 0 132 92" aria-hidden="true"><rect class="env-body" x="2" y="2" width="128" height="88" rx="12"/>' +
      (open ? '<path class="env-flap" d="M4 6L66 -24L128 6Z"/>' : '<path class="env-flap" d="M4 8L66 47L128 8Z"/>') + '</svg>';
    var el = h('div', {
      class: 'env ' + (o.state ? 'is-' + o.state : '') + ' ' + (o.cls || ''),
      style: o.accent ? { '--ea': o.accent } : null,
      role: 'img', 'aria-label': o.label || ((o.amt || 'Envelope') + (o.sub ? ', ' + o.sub : ''))
    });
    el.innerHTML = svg;
    if (o.amt != null) add(el, h('div', { class: 'env-amt' }, o.amt));
    if (o.sub) add(el, h('div', { class: 'env-sub' }, o.sub));
    if (o.stamp) add(el, h('span', { class: 'env-stamp', html: SK.identicon(o.stamp, 26), title: 'Fingerprint' }));
    if (o.mark) add(el, h('span', { class: 'env-pm', html: SK.identicon(o.mark, 24), title: 'Family badge' }));
    if (o.state === 'locked') add(el, h('span', { class: 'env-lock', html: SK.icon('lock', 18) }));
    return el;
  };

  /* ---------------------------------------------- code highlighting */
  function set(s) { var o = {}; s.split(' ').forEach(function (k) { o[k] = 1; }); return o; }
  var KW = set('pragma silverscript contract entry function require if else for return struct constant new as');
  var TY = set('int temporal bool byte bytes pubkey sig datasig string State');
  var BI = set('checkSig checkSigEcdsa checkMsgSig checkMsgSigEcdsa blake2b sha256 tx this g16 validateOutputState validateOutputStateWithTemplate validateOutputStateWithInputTemplate readInputState readInputStateWithTemplate signed unsigned');
  SK.hl = function (code) {
    var re = /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*")|(#\[[^\]]*\])|\b(0x[0-9a-fA-F_]+|\d[\d_]*)\b|\b([A-Za-z_][A-Za-z0-9_]*)\b/g;
    var out = '', last = 0, m, cls, w;
    while ((m = re.exec(code))) {
      out += esc(code.slice(last, m.index)); last = re.lastIndex; cls = null;
      if (m[1]) cls = 'c'; else if (m[2]) cls = 's'; else if (m[3]) cls = 'm'; else if (m[4]) cls = 'n';
      else { w = m[5]; cls = KW[w] ? 'k' : TY[w] ? 't' : (BI[w] || /^Op[A-Z]/.test(w) || /^ScriptPubKey/.test(w)) ? 'b' : null; }
      out += cls ? '<span class="tk-' + cls + '">' + esc(m[0]) + '</span>' : esc(m[0]);
    }
    return out + esc(code.slice(last));
  };

  /* -------------------------------------------- overlays: modal etc */
  SK.modal = function (o) {
    var back = h('div', { class: 'modal-back' });
    var box = h('div', { class: 'modal card', role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title });
    var grab = h('button', { type: 'button', class: 'grab', 'aria-label': 'Close', tabindex: '-1' });
    box.appendChild(grab);
    box.appendChild(h('h2', o.title));
    var body = h('div', { class: 'modal-body' });
    if (typeof o.body === 'string') body.innerHTML = SK.paras(o.body, true); else add(body, o.body);
    box.appendChild(body);
    var acts = o.actions || [{ label: 'OK' }];
    var row = h('div', { class: 'modal-actions' + (acts.length > 2 ? ' stack' : '') });
    var closed = false, opener = document.activeElement;
    function close() {
      if (closed) return; closed = true;
      document.removeEventListener('keydown', onKey);
      if (opener && opener.isConnected && opener.focus) { try { opener.focus({ preventScroll: true }); } catch (x) {} }
      if (SK.reduced()) { back.remove(); return; }
      back.classList.add('leaving'); box.classList.add('leaving');
      setTimeout(function () { back.remove(); }, 230);
    }
    function onKey(e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      var f = SK.$$('button:not([disabled]):not(.grab), a[href], input:not([disabled]), textarea:not([disabled])', box);
      if (!f.length) return;
      var inside = box.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === f[0])) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (!inside || document.activeElement === f[f.length - 1])) { e.preventDefault(); f[0].focus(); }
    }
    acts.forEach(function (a) {
      row.appendChild(h('button', {
        class: 'btn ' + (a.kind || ''), type: 'button',
        onclick: function () { close(); if (a.fn) a.fn(); }
      }, a.label));
    });
    box.appendChild(row); back.appendChild(box);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    grab.addEventListener('click', close);
    /* drag the handle down to dismiss */
    var y0 = null, dy = 0, t0 = 0;
    grab.addEventListener('pointerdown', function (e) { y0 = e.clientY; dy = 0; t0 = Date.now(); box.classList.add('dragging'); try { grab.setPointerCapture(e.pointerId); } catch (x) {} });
    grab.addEventListener('pointermove', function (e) { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); box.style.transform = 'translateY(' + dy + 'px)'; });
    function release() {
      if (y0 == null) return;
      var fast = dy > 30 && (Date.now() - t0) < 250;
      y0 = null; box.classList.remove('dragging');
      if (dy > 90 || fast) { box.style.transform = ''; close(); } else box.style.transform = '';
    }
    grab.addEventListener('pointerup', release); grab.addEventListener('pointercancel', release);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(back);
    var first = box.querySelector('.modal-actions .btn:last-child') || box.querySelector('button:not(.grab)'); if (first) first.focus({ preventScroll: true });
    return { close: close };
  };
  /* act: optional {label, fn}. A toast with an action stays longer. */
  SK.toast = function (msg, act) {
    var t = h('div', { class: 'toast' + (act ? ' has-act' : ''), role: 'status' }, h('span', msg));
    if (act) t.appendChild(h('button', { type: 'button', onclick: function () { t.remove(); act.fn(); } }, act.label));
    document.body.appendChild(t); SK.announce(msg);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 300); }, act ? 9000 : 2200);
  };
  SK.confetti = function (n) {
    if (SK.reduced()) return;
    var box = h('div', { class: 'confetti', 'aria-hidden': 'true' }), kinds = ['env', 'coin', 'dot'];
    for (var i = 0; i < (n || 34); i++) {
      var k = kinds[i % 3];
      box.appendChild(h('i', {
        class: 'cf cf-' + k,
        style: {
          left: Math.random() * 100 + '%', background: PAL[i % PAL.length],
          animationDelay: Math.random() * 0.5 + 's', animationDuration: 1.8 + Math.random() * 1.4 + 's',
          '--dx': (Math.random() * 160 - 80) + 'px', '--rot': (Math.random() * 720 - 360) + 'deg'
        }
      }));
    }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 3600);
  };

  /* Glossary popover: tap any dotted-underline word */
  var pop = null;
  function closePop() { if (pop) { pop.remove(); pop = null; } }
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('.term');
    if (!t) { if (!(pop && pop.contains(e.target))) closePop(); return; }
    e.preventDefault(); closePop();
    var g = SK.gloss && SK.gloss[t.getAttribute('data-term')];
    if (!g) return;
    pop = h('div', { class: 'pop card', role: 'dialog', 'aria-label': g.term });
    pop.appendChild(h('div', { class: 'pop-t' }, g.term));
    pop.appendChild(h('div', { class: 'pop-s', html: fmt(g.s, true) }));
    pop.appendChild(h('a', { class: 'pop-a', href: '#/words/' + g.id, onclick: closePop }, 'Open in the dictionary'));
    document.body.appendChild(pop);
    var r = t.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
    var left = SK.clamp(r.left + r.width / 2 - pw / 2, 10, window.innerWidth - pw - 10);
    var top = r.bottom + 10; if (top + ph > window.innerHeight - 10) top = Math.max(10, r.top - ph - 10);
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePop(); });
  window.addEventListener('hashchange', closePop);

  /* ------------------------------------------------------- theme */
  SK.applyTheme = function () {
    var t = SK.state.set.theme, dark = t === 'dark' || (t === 'system' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-motion', SK.state.set.motion === false ? 'off' : 'on');
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', dark ? '#1A1741' : '#E8E6FF');
  };
  SK.applyTheme();
  if (window.matchMedia) {
    var mq = matchMedia('(prefers-color-scheme: dark)');
    (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(function () { SK.applyTheme(); });
  }
})();
