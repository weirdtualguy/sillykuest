/* App shell and hash router. */
(function () {
  var SK = window.SK, h = SK.h;
  var shell = null, screenEl = null, chipsEl = null, sideEl = null, navEl = null;

  var TABS = [
    { r: 'learn', t: 'Learn', i: 'map' },
    { r: 'practice', t: 'Practice', i: 'target' },
    { r: 'lab', t: 'Lab', i: 'flask' },
    { r: 'words', t: 'Words', i: 'book' },
    { r: 'you', t: 'You', i: 'user' }
  ];

  function reviewCount() { return SK.state.mistakes.filter(SK.stepByKey).length; }

  /* The Today sheet: daily goal, streak, rank. One tap from every screen. */
  SK.todaySheet = function () {
    var st = SK.state, xp = SK.todayXp(), met = xp >= SK.GOAL, rk = SK.rank(), s = SK.streakNow();
    var safe = st.last === SK.day();
    var nxt = SK.nextLesson(), rs = nxt ? SK.resumeAt(nxt) : 0;
    var body = h('div', { class: 'td' },
      h('div', { class: 'td-ring', style: { width: '132px', height: '132px' } },
        h('span', { html: SK.ring(xp / SK.GOAL, 132, 13, met ? 'var(--good-t)' : 'var(--teal)') }),
        h('span', null, h('b', String(Math.min(xp, 999))), h('small', met ? 'XP today' : 'of ' + SK.GOAL + ' XP'))),
      h('p', met ? 'Daily goal reached.' + (xp > SK.GOAL ? ' ' + (xp - SK.GOAL) + ' bonus XP on top.' : ' Anything more is a bonus.') : (SK.GOAL - xp) + ' XP to your daily goal. Finish a lesson or a practice round to earn it.'),
      h('div', { class: 'td-row' },
        h('div', { class: 'card' }, h('strong', SK.ico('flame', 20), String(s) + (s === 1 ? ' day' : ' days')), h('div', { class: 'cap' }, s === 0 ? 'Start a streak today.' : safe ? 'Safe for today. Best: ' + st.best : 'Finish something today to keep it.')),
        h('div', { class: 'card' }, h('strong', rk.name), h('div', { class: 'cap' }, rk.next ? (rk.next.at - st.xp) + ' XP to ' + rk.next.name : 'Top rank reached')))
    );
    SK.modal({
      title: 'Today', body: body,
      actions: [{ label: 'Close', kind: 'alt' }, nxt
        ? { label: rs ? 'Resume ' + SK.num(nxt) : 'Continue ' + SK.num(nxt), fn: function () { location.hash = '#/lesson/' + nxt.id; } }
        : { label: 'Practice', fn: function () { location.hash = '#/practice'; } }]
    });
  };

  function chips() {
    var st = SK.state, xp = SK.todayXp(), goal = Math.min(1, xp / SK.GOAL), met = xp >= SK.GOAL, s = SK.streakNow();
    var xr = h('span', { class: 'xr', html: SK.ring(goal, 28, 3.5, met ? 'var(--good-t)' : 'var(--teal)') + SK.icon('bolt', 15) });
    return h('div', { class: 'hchips' },
      h('button', { type: 'button', class: 'chip fire' + (s ? '' : ' cold'), 'aria-label': s + ' day streak. Open today', onclick: SK.todaySheet }, SK.ico('flame', 20), h('span', String(s))),
      h('button', { type: 'button', class: 'chip xp' + (met ? ' met' : ''), 'aria-label': st.xp + ' XP total. Daily goal ' + Math.min(xp, SK.GOAL) + ' of ' + SK.GOAL + '. Open today', onclick: SK.todaySheet }, xr, h('span', String(st.xp))),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': st.set.sound ? 'Mute sound' : 'Turn sound on', html: SK.icon(st.set.sound ? 'sound' : 'mute', 22),
        onclick: function () { st.set.sound = !st.set.sound; SK.save(); renderChrome(); if (st.set.sound) SK.sfx('ok'); } }));
  }
  function side() {
    var st = SK.state, rk = SK.rank(), goal = Math.min(1, SK.todayXp() / SK.GOAL);
    return h('div', { class: 'side-in' },
      h('div', { class: 'card sd' }, h('div', { class: 'sd-ring', html: SK.ringHtml(goal, 84, 'var(--teal)') + '<span>' + Math.min(SK.todayXp(), SK.GOAL) + '</span>' }),
        h('div', h('strong', 'Daily goal'), h('div', { class: 'cap' }, SK.todayXp() >= SK.GOAL ? 'Done for today. Nice.' : (SK.GOAL - SK.todayXp()) + ' XP to go'))),
      h('div', { class: 'card sd' }, h('div', { html: SK.sil('hi', 64) }),
        h('div', h('strong', rk.name), h('div', { class: 'cap' }, rk.next ? (rk.next.at - st.xp) + ' XP to ' + rk.next.name : 'Top rank'), h('div', { class: 'meter' }, h('i', { style: { width: Math.round(rk.pct * 100) + '%' } })))),
      h('div', { class: 'card sd' }, SK.ico('flame', 28), h('div', h('strong', SK.streakNow() + ' day streak'), h('div', { class: 'cap' }, 'Best: ' + st.best))));
  }
  function nav(active) {
    var n = h('nav', { class: 'nav', 'aria-label': 'Main' },
      h('a', { class: 'brand', href: '#/learn', 'aria-label': 'SillyKuest home' }, h('span', { html: SK.sil('hi', 40) }), h('span', { class: 'wm' }, 'SillyKuest')));
    var rc = reviewCount();
    TABS.forEach(function (t) {
      var a = h('a', {
        class: 'tab' + (t.r === active ? ' on' : ''), href: '#/' + t.r, 'aria-current': t.r === active ? 'page' : null,
        html: '<span class="ti">' + SK.icon(t.i, 24) + '</span><span>' + t.t + '</span>'
      });
      /* tapping the tab you are on scrolls to the top */
      a.addEventListener('click', function () { if (t.r === active && location.hash.replace(/^#\/?/, '').split('/').length < 2) window.scrollTo({ top: 0, behavior: SK.reduced() ? 'auto' : 'smooth' }); });
      if (t.r === 'practice' && rc > 0) { a.appendChild(h('span', { class: 'tbadge', 'aria-label': rc + ' to review' }, rc > 9 ? '9+' : String(rc))); }
      n.appendChild(a);
    });
    return n;
  }
  function build() {
    var app = document.getElementById('app'); SK.clear(app);
    chipsEl = h('div', { class: 'chips-slot' }); screenEl = h('main', { class: 'screen', id: 'main' }); sideEl = h('aside', { class: 'side', 'aria-label': 'Your stats' }); navEl = h('div', { class: 'nav-slot' });
    var top = h('header', { class: 'top' }, h('a', { class: 'brand m', href: '#/learn' }, h('span', { html: SK.sil('hi', 34) }), h('span', { class: 'wm' }, 'SillyKuest')), chipsEl);
    shell = h('div', { class: 'shell' }, navEl, h('div', { class: 'col' }, top, screenEl), sideEl);
    app.appendChild(h('a', { class: 'skip', href: '#main' }, 'Skip to content'));
    app.appendChild(shell);
  }
  var activeTab = 'learn';
  function renderChrome() {
    SK.clear(chipsEl); chipsEl.appendChild(chips());
    SK.clear(sideEl); sideEl.appendChild(side());
    SK.clear(navEl); navEl.appendChild(nav(activeTab));
  }
  SK.refreshChrome = function () { if (shell) renderChrome(); };

  /* Scroll memory: each tab keeps its place, and a lesson or practice round opened from a screen returns to it. */
  var scrollMem = {}, curKey = null, curHash = null;
  function rootKey(r, a) {
    if (r === 'practice') return 'practice';
    if (r === 'lab') return a ? null : 'lab';
    if (r === 'words') return a ? null : 'words';
    if (r === 'ops' || r === 'cheat' || r === 'you') return r;
    if (r === '' || r === 'learn') return 'learn';
    return null;
  }
  function mount(tab, el, o) {
    o = o || {};
    if (tab !== 'learn' && SK.unwatchLearn) { SK.unwatchLearn(); SK.unwatchLearn = null; }
    activeTab = tab; SK.clear(screenEl); screenEl.appendChild(el); renderChrome();
    if (!o.keep) window.scrollTo(0, o.y || 0);
    document.title = (tab === 'learn' ? '' : TABS.filter(function (t) { return t.r === tab; })[0].t + ' | ') + 'SillyKuest';
  }

  function lessonSteps(l, from) { return l.steps.map(function (s, i) { return { step: s, key: SK.isQuiz(s) ? SK.quizKey(l, i) : null }; }); }
  function keysToSteps(keys) { return keys.map(function (k) { return { step: SK.stepByKey(k), key: k }; }).filter(function (x) { return x.step; }); }

  SK.route = function () {
    if (!shell) build();
    var hash = location.hash || '#/learn';
    var parts = hash.replace(/^#\/?/, '').split('/'), r = parts[0] || 'learn', a = parts[1], b = parts[2];
    var playerRoutes = { lesson: 1, boss: 1, review: 1, daily: 1, code: 1, vibe: 1, heist: 1 };
    var isPr = r === 'review' || r === 'daily' || r === 'code' || r === 'vibe' || r === 'heist';
    if (SK.activePlayer && !playerRoutes[r]) SK.activePlayer.close();

    if (playerRoutes[r]) {
      if (!SK.activePlayer) SK.backTo = curHash;
      var under = isPr || /practice/.test(SK.backTo || '') ? 'practice' : 'learn';
      if (activeTab !== under || !screenEl.firstChild) mount(under, under === 'practice' ? SK.screens.practice() : SK.screens.learn(), { keep: !!screenEl.firstChild });
      var cfg = null, toast = null;
      if (r === 'lesson') {
        var l = SK.lesson(a);
        if (!l) toast = 'That lesson does not exist.';
        else if (!SK.unlocked(l)) toast = 'Finish the earlier lessons first.';
        else cfg = { kind: 'lesson', id: l.id, title: l.title, world: l.world, color: SK.world(l.world).color, steps: lessonSteps(l), from: b === 'restart' ? 0 : SK.resumeAt(l) };
      } else if (r === 'boss') {
        var w = +a, wd = SK.world(w);
        if (!wd || !SK.worldOpen(w)) toast = 'Open that world first.';
        else cfg = { kind: 'boss', id: 'boss' + w, title: wd.boss.name, world: w, boss: wd.boss, color: wd.color, steps: keysToSteps(SK.shuffle(SK.bossKeys(w)).slice(0, 8)) };
      } else if (r === 'review') {
        var ks = SK.shuffle(SK.state.mistakes.filter(SK.stepByKey)).slice(0, 8);
        if (!ks.length) toast = 'Nothing to review yet.'; else cfg = { kind: 'practice', id: 'review', title: 'Review your slips', color: '#FF7F90', steps: keysToSteps(ks) };
      } else if (r === 'code') {
        var cp = SK.codePool(true); if (!cp.length) cp = SK.codePool(false).slice(0, 12);
        cfg = { kind: 'practice', id: 'code', title: 'Code workout', color: '#9A8CFF', steps: keysToSteps(SK.shuffle(cp).slice(0, 5)) };
      } else if (r === 'vibe') {
        cfg = { kind: 'practice', id: 'vibe', title: 'Vibe Check', color: '#FF8A5B', steps: SK.vibeSteps(5) };
      } else if (r === 'heist') {
        cfg = { kind: 'practice', id: 'heist', title: 'Vault Heist', color: '#2BB8A3', steps: SK.heistSteps() };
      } else if (r === 'daily') {
        var pool = SK.practicePool(true); if (!pool.length) pool = SK.practicePool(false).slice(0, 12);
        cfg = { kind: 'practice', id: 'daily', title: 'Daily five', color: '#FFCB45', steps: keysToSteps(SK.shuffle(pool).slice(0, 5)) };
      }
      if (cfg && cfg.steps.length) SK.play(cfg);
      else { if (toast) SK.toast(toast); location.hash = SK.backTo || (isPr ? '#/practice' : '#/learn'); }
      return;
    }

    var key = rootKey(r, a);
    if (curKey != null) scrollMem[curKey] = window.scrollY;
    var y = key != null && scrollMem[key] != null ? scrollMem[key] : 0;
    if (r === 'practice') mount('practice', SK.screens.practice(), { y: y });
    else if (r === 'lab') mount('lab', a === 'ex' ? SK.screens.labEx(b) : a === 'toy' ? SK.screens.labToy(b) : SK.screens.lab(), { y: y });
    else if (r === 'words') mount('words', SK.screens.words('words', a), { y: y });
    else if (r === 'ops') mount('words', SK.screens.words('ops'), { y: y });
    else if (r === 'cheat') mount('words', SK.screens.words('cheat'), { y: y });
    else if (r === 'you') mount('you', SK.screens.you(), { y: y });
    else {
      mount('learn', SK.screens.learn(), { y: y });
      if (SK.focusNext) { SK.focusNext = false; var cur = screenEl.querySelector('.pn.current'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'center' }); }
    }
    curKey = key; curHash = hash;
  };

  /* Install prompt (Android Chrome and Kiwi) */
  function refreshInstall() { if (shell && !SK.activePlayer && (activeTab === 'you' || activeTab === 'learn')) SK.route(); }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); SK.installEv = e; refreshInstall(); });
  window.addEventListener('appinstalled', function () { SK.installEv = null; SK.state.set.installNo = true; SK.save(); refreshInstall(); });

  function start() {
    build();
    window.addEventListener('hashchange', SK.route);
    SK.route();
    if (!SK.state.level && !Object.keys(SK.state.done).length && !/[?&]qa=1/.test(location.search)) SK.welcome(function (go) { if (go) location.hash = go; else SK.route(); });
    SK.save(); /* probe: if storage is blocked, SK.saveOk turns false and Learn says so */
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      var had = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (had) SK.toast('SillyKuest was updated.', { label: 'Reload', fn: function () { location.reload(); } });
        had = true;
      });
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
