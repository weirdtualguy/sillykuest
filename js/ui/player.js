/* The player: runs a list of steps for a lesson, a boss fight or a practice round.
   cfg: {kind:'lesson'|'boss'|'practice', id, title, color, world, boss, steps:[{step, key}]} */
(function () {
  var SK = window.SK, h = SK.h;
  var GOOD = ['Nice!', 'Exactly.', 'You got it.', 'Spot on.', 'Sharp.'];
  var BAD = ['Not quite.', 'Close, but no.', 'Almost.'];
  var QA = /[?&]qa=1/.test(location.search);

  SK.monster = function (color, size) {
    return '<svg class="monster" width="' + (size || 72) + '" height="' + (size || 72) + '" viewBox="0 0 120 120" aria-hidden="true">' +
      '<path d="M34 30L24 6l24 14M86 30l10-24-24 14" fill="' + color + '" stroke="#1D1B45" stroke-width="3.6" stroke-linejoin="round"/>' +
      '<path d="M16 72C16 36 38 16 60 16s44 20 44 56c0 22-12 34-44 34S16 94 16 72Z" fill="' + color + '" stroke="#1D1B45" stroke-width="3.6"/>' +
      '<circle cx="42" cy="56" r="10" fill="#fff" stroke="#1D1B45" stroke-width="3"/><circle cx="78" cy="56" r="10" fill="#fff" stroke="#1D1B45" stroke-width="3"/>' +
      '<circle cx="45" cy="58" r="4.2" fill="#1D1B45"/><circle cx="75" cy="58" r="4.2" fill="#1D1B45"/>' +
      '<path d="M30 40l22 9M90 40l-22 9" stroke="#1D1B45" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M36 82l8 10 8-10 8 10 8-10 8 10 8-10" fill="#fff" stroke="#1D1B45" stroke-width="3.4" stroke-linejoin="round"/></svg>';
  };

  function addMistake(k) { var m = SK.state.mistakes; if (m.indexOf(k) < 0) m.push(k); }
  function dropMistake(k) { var m = SK.state.mistakes, i = m.indexOf(k); if (i >= 0) m.splice(i, 1); }

  SK.play = function (cfg) {
    if (SK.activePlayer) SK.activePlayer.close();
    var q = cfg.steps.map(function (s) { return { s: s.step, key: s.key, retry: false }; });
    var i = (cfg.kind === 'lesson' && cfg.from > 0 && cfg.from < q.length) ? cfg.from : 0, resumed = i > 0, rs0 = resumed && SK.state.rs ? SK.state.rs[cfg.id] : null;
    var dir = 'fwd', mistakes = rs0 ? rs0.m : 0, quizTotal = rs0 ? rs0.t : 0, quizOk = rs0 ? rs0.o : 0, hp = 100, checked = false, ready = false, inst = null, finished = false;
    var firstQuizCount = q.filter(function (x) { return SK.isQuiz(x.s); }).length || 1;

    var root = h('div', { class: 'player kind-' + cfg.kind + (cfg.world ? ' world-' + cfg.world : ''), style: { '--w': cfg.color || 'var(--teal)' }, role: 'dialog', 'aria-modal': 'true', 'aria-label': cfg.title });
    var bar = h('i'), x = h('button', { type: 'button', class: 'p-x', 'aria-label': 'Leave', html: SK.icon('x', 24), onclick: leave });
    var top = h('header', { class: 'p-top' }, x, h('div', { class: 'p-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100 }, bar));
    var hud = null, hpBar = null, mon = null, slipEl = null;
    if (cfg.kind === 'boss') {
      hpBar = h('i'); mon = h('div', { class: 'mon', html: SK.monster(cfg.color, 56) });
      slipEl = h('div', { class: 'slips', role: 'img', 'aria-label': 'Slips used: 0 of 2' }, h('span', 'Slips'), h('i'), h('i'));
      hud = h('div', { class: 'boss-hud' }, mon, h('div', { class: 'boss-info' }, h('div', { class: 'boss-top' }, h('strong', cfg.boss.name), slipEl), h('div', { class: 'hp', role: 'progressbar', 'aria-label': 'Boss health' }, hpBar)));
    }
    function paintSlips() {
      if (!slipEl) return;
      SK.$$('i', slipEl).forEach(function (p, k) { p.classList.toggle('on', mistakes > k); });
      slipEl.setAttribute('aria-label', mistakes > 2 ? 'Out of slips' : 'Slips used: ' + mistakes + ' of 2');
      slipEl.classList.toggle('out', mistakes > 2);
    }
    var stepBox = h('div', { class: 'p-step' }), main = h('main', { class: 'p-main' }, h('div', { class: 'p-in' }, stepBox));
    var back = h('button', { type: 'button', class: 'btn alt p-back', 'aria-label': 'Back', html: SK.icon('back', 24), onclick: goBack });
    var hint = h('span', { class: 'p-hint' });
    var go = h('button', { type: 'button', class: 'btn p-go', onclick: onGo }, 'Continue');
    var qa = QA ? h('button', { type: 'button', class: 'btn alt qa-solve', onclick: function () { if (inst && inst.solve) inst.solve(); } }, 'QA solve') : null;
    var actions = h('div', { class: 'p-actions' }, back, qa, go);
    var sheet = h('div', { class: 'p-sheet', hidden: true });
    var foot = h('footer', { class: 'p-foot' }, hint, sheet, actions);
    root.appendChild(top); if (hud) root.appendChild(hud); root.appendChild(main); root.appendChild(foot);
    document.body.appendChild(root); document.body.classList.add('no-scroll');
    document.addEventListener('keydown', onKey);

    var api = { close: close };
    SK.activePlayer = api;

    function close() { root.remove(); document.body.classList.remove('no-scroll'); document.removeEventListener('keydown', onKey); if (SK.activePlayer === api) SK.activePlayer = null; }
    function dest() { return SK.backTo || ('#/' + (cfg.kind === 'practice' ? 'practice' : 'learn')); }
    function leave() {
      if (finished) { close(); if (cfg.kind === 'lesson') SK.focusNext = true; location.hash = dest(); return; }
      if (i === 0 && quizTotal === 0) { close(); location.hash = dest(); return; }
      if (cfg.kind === 'lesson') {
        /* lessons save your place, so leaving costs nothing */
        SK.setResume(cfg.id, Math.min(i, cfg.steps.length - 1), { m: mistakes, t: quizTotal, o: quizOk });
        close(); location.hash = dest(); SK.toast('Saved. Pick it up any time.');
        return;
      }
      SK.modal({ title: 'Leave this ' + (cfg.kind === 'boss' ? 'fight' : 'round') + '?', body: 'You will lose your progress in it. Nothing else is affected.',
        actions: [{ label: 'Keep going', kind: 'alt' }, { label: 'Leave', kind: 'danger', fn: function () { close(); location.hash = dest(); } }] });
    }
    function onKey(e) {
      if (!SK.activePlayer || SK.activePlayer !== api) return;
      if (document.querySelector('.modal-back')) return;
      var t = e.target;
      if (e.key === 'Enter') {
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SUMMARY' || t.tagName === 'A')) return;
        var sb = sheet.querySelector('button');
        if (!sheet.hidden && sb) { e.preventDefault(); sb.click(); }
        else if (!finished && !go.disabled && !go.hidden) { e.preventDefault(); go.click(); }
      } else if (/^[1-9]$/.test(e.key) && !(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'))) {
        var o = root.querySelector('.opt[data-i="' + (+e.key - 1) + '"]');
        if (o && !o.disabled) o.click();
      }
    }

    function progress() { var p = Math.min(100, Math.round(i / q.length * 100)); bar.style.width = p + '%'; bar.parentNode.setAttribute('aria-valuenow', p); }
    function sync() { go.disabled = !ready; }
    function show() {
      var item = q[i], step = item.s, quiz = SK.isQuiz(step);
      checked = false; ready = false; inst = null;
      SK.clear(stepBox); sheet.hidden = true; actions.hidden = false; hint.hidden = false; hint.textContent = '';
      stepBox.classList.remove('in-fwd', 'in-back'); void stepBox.offsetWidth; stepBox.classList.add(dir === 'back' ? 'in-back' : 'in-fwd'); dir = 'fwd';
      main.scrollTop = 0;
      var ctx = {
        setReady: function (v) { ready = !!v; sync(); },
        hint: function (t) { hint.textContent = t; },
        finish: function (ok, o) { resolve(ok, o || {}); }
      };
      if (item.retry) stepBox.appendChild(h('div', { class: 'retry-tag' }, 'One more try at this one'));
      inst = SK.renderStep(step, ctx);
      stepBox.appendChild(inst.el);
      go.textContent = quiz ? 'Check' : 'Continue';
      go.hidden = !!inst.auto;
      back.hidden = !(i > 0 && !SK.isQuiz(q[i - 1].s) && !quiz);
      sync(); progress();
      var focusEl = stepBox.querySelector('h2'); if (focusEl) { focusEl.setAttribute('tabindex', '-1'); try { focusEl.focus({ preventScroll: true }); } catch (e) {} }
      if (resumed) { resumed = false; SK.toast('Picked up where you left off'); }
    }
    function onGo() {
      var step = q[i].s;
      if (SK.isQuiz(step) && !inst.auto) { if (!checked) { var r = inst.check(); resolve(r.ok, r); } }
      else next();
    }
    function goBack() { if (i > 0) { i--; dir = 'back'; show(); } }
    function next() { i++; if (i >= q.length) finish(); else show(); }

    function resolve(ok, r) {
      if (checked) return; checked = true;
      var item = q[i], step = item.s;
      if (!item.retry) {
        quizTotal++; SK.state.stats.total++;
        if (ok) { quizOk++; SK.state.stats.ok++; if (step.t === 'bug') SK.state.stats.bug++; if (step.t === 'build') SK.state.stats.build = (SK.state.stats.build || 0) + 1; } else { mistakes++; paintSlips(); }
        if (cfg.kind === 'boss') {
          if (ok) { hp = Math.max(0, hp - 100 / firstQuizCount); hpBar.style.width = hp + '%'; }
          mon.classList.remove('hit', 'laugh'); void mon.offsetWidth; mon.classList.add(ok ? 'hit' : 'laugh');
        }
      }
      if (item.key) { if (ok) dropMistake(item.key); else addMistake(item.key); }
      if (!ok && !item.retry && r.requeue !== false) q.push({ s: step, key: item.key, retry: true });
      SK.sfx(ok ? 'ok' : 'bad'); if (!ok) SK.buzz([30, 40, 30]); else SK.buzz(15);
      SK.save();
      var title = SK.pick(ok ? GOOD : BAD);
      SK.clear(sheet); sheet.className = 'p-sheet ' + (ok ? 'ok' : 'bad'); sheet.hidden = false; actions.hidden = true; hint.hidden = true;
      var body = h('div', { class: 'sh-body' }, h('strong', { class: 'sh-t' }, h('span', title), h('span', { class: 'stamp', 'aria-hidden': 'true' }, ok ? 'Sealed' : 'Returned')));
      if (step.why) body.appendChild(h('div', { class: 'sh-why', html: SK.paras(step.why, true) }));
      if (!ok && r.answer) body.appendChild(h('div', { class: 'sh-ans' }, h('span', 'Answer: '), r.mono || r.multiline ? h('pre', { class: 'codeblock sm', html: SK.hl(r.answer) }) : h('span', { html: SK.fmt(r.answer, true) })));
      /* a boss fight with three slips is already lost: end it now instead of making you play on */
      var cont = h('button', { type: 'button', class: 'btn ' + (ok ? '' : 'danger'), onclick: function () { if (cfg.kind === 'boss' && mistakes > 2) finish(); else next(); } }, 'Continue');
      var said = h('div', { html: SK.paras(step.why || '', true) }).textContent;
      SK.announce(title + (!ok && r.answer ? ' Answer: ' + h('span', { html: SK.fmt(r.answer, true) }).textContent + '.' : '') + ' ' + said);
      sheet.appendChild(h('div', { class: 'sh-row' }, h('span', { class: 'sh-face', html: SK.sil(ok ? 'yay' : 'oops', 54) }), body));
      sheet.appendChild(cont);
      cont.focus();
    }

    /* ---------- completion ---------- */
    function finish() {
      finished = true; progress(); bar.style.width = '100%';
      var S = SK.state, res = { xp: 0, stars: 0, title: '', sub: '', mood: 'yay', pass: true, cleared: false, next: null };
      var acc = quizTotal ? Math.round(quizOk / quizTotal * 100) : 100;
      if (cfg.kind === 'lesson') {
        var prev = S.done[cfg.id], stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
        res.xp = prev ? 5 : 15 + 5 * Math.max(0, quizTotal - mistakes);
        S.done[cfg.id] = { stars: Math.max(stars, prev ? prev.stars : 0) };
        res.stars = stars; res.title = 'Lesson complete'; res.sub = cfg.title;
        res.cleared = SK.worldDone(cfg.world) && !S.badges['w' + cfg.world];
        res.next = SK.after(SK.lesson(cfg.id));
        SK.setResume(cfg.id, 0);
      } else if (cfg.kind === 'boss') {
        res.pass = mistakes <= 2;
        if (res.pass) { var first = !S.bosses[cfg.world]; S.bosses[cfg.world] = true; res.xp = first ? 50 : 10; res.title = 'Boss defeated'; res.sub = cfg.boss.name + ' is gone. The next world is open.'; }
        else { res.mood = 'oops'; res.title = 'The boss got away'; res.sub = 'Too many slips (' + mistakes + '). Review the lessons and try again. You are allowed 2.'; }
      } else { res.xp = 3 * quizOk; res.title = 'Round complete'; res.sub = quizOk + ' of ' + quizTotal + ' right the first time.'; }
      var streakBefore = SK.streakNow();
      SK.touchStreak(); SK.addXp(res.xp);
      var badges = SK.checkBadges();
      var allDone = SK.lessons.every(function (l) { return S.done[l.id]; });
      res.firstEnd = allDone && cfg.kind === 'lesson' && !S.set.seenEnd;
      if (allDone && cfg.kind === 'lesson') S.set.seenEnd = true;
      SK.save();
      renderDone(res, acc, badges, streakBefore, allDone);
    }
    function stat(label, val, ic) { return h('div', { class: 'ds card ' + ({ flame: 'ds-a', target: 'ds-c' }[ic] || 'ds-b') }, h('div', { class: 'ds-v' }, SK.ico(ic, 22), h('span', val)), h('div', { class: 'ds-l' }, label)); }
    function renderDone(res, acc, badges, streakBefore, allDone) {
      SK.clear(main); foot.hidden = true; if (hud) hud.hidden = true;
      var wrap = h('div', { class: 'done' });
      var title = res.firstEnd ? 'You finished the quest' : res.title;
      wrap.appendChild(h('div', { class: 'done-sil', html: SK.sil(res.mood, 150) }));
      wrap.appendChild(h('h1', title));
      if (res.sub) wrap.appendChild(h('p', { class: 'done-sub' }, res.sub));
      if (cfg.kind === 'lesson') {
        var st = h('div', { class: 'stars', 'aria-label': res.stars + ' of 3 stars' });
        for (var k = 0; k < 3; k++) st.appendChild(h('span', { class: 'star' + (k < res.stars ? ' on' : ''), style: { animationDelay: 0.25 + k * 0.22 + 's' }, html: SK.icon('star', 44) }));
        wrap.appendChild(st);
      }
      wrap.appendChild(h('div', { class: 'dstats' },
        stat('XP earned', '+' + res.xp, 'bolt'), stat('Right first time', acc + '%', 'target'),
        stat('Day streak', String(SK.streakNow()), 'flame')));
      var txp = SK.todayXp(), met = txp >= SK.GOAL, prevPct = Math.min(100, Math.max(0, (txp - res.xp) / SK.GOAL * 100)), gm = h('i', { style: { width: prevPct + '%' } });
      wrap.appendChild(h('div', { class: 'done-goal card' }, h('div', { class: 'dg-t' }, met ? 'Daily goal reached' : 'Daily goal'),
        h('div', { class: 'meter', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': SK.GOAL, 'aria-valuenow': Math.min(txp, SK.GOAL) }, gm),
        h('div', { class: 'cap' }, Math.min(txp, SK.GOAL) + ' of ' + SK.GOAL + ' XP today' + (txp > SK.GOAL ? '. Bonus: +' + (txp - SK.GOAL) : ''))));
      setTimeout(function () { gm.style.width = Math.min(100, txp / SK.GOAL * 100) + '%'; }, SK.reduced() ? 0 : 450);
      if (SK.streakNow() > streakBefore && SK.streakNow() > 1) wrap.appendChild(h('p', { class: 'done-note' }, 'Streak extended. Come back tomorrow to keep it.'));
      if (res.cleared) wrap.appendChild(h('p', { class: 'done-note strong' }, SK.world(cfg.world).name + ' cleared. Its boss is waiting if you want to test out of the next world.'));
      if (badges.length) {
        var bl = h('div', { class: 'newbadges' }, h('h3', 'New badge' + (badges.length > 1 ? 's' : '')));
        badges.forEach(function (b) { bl.appendChild(h('div', { class: 'nb card' }, SK.ico(b.icon, 26), h('div', h('strong', b.name), h('div', { class: 'cap' }, b.desc)))); });
        wrap.appendChild(bl);
      }
      var row = h('div', { class: 'done-actions' });
      function leaveTo(hash) { close(); location.hash = hash; }
      if (cfg.kind === 'lesson' && res.next) {
        row.appendChild(h('button', { type: 'button', class: 'btn two', onclick: function () { leaveTo('#/lesson/' + res.next.id); } }, h('span', 'Next lesson'), h('small', SK.num(res.next) + ' ' + res.next.title)));
        row.appendChild(h('button', { type: 'button', class: 'btn alt', onclick: function () { SK.focusNext = true; leaveTo('#/learn'); } }, 'Back to the map'));
      } else if (cfg.kind === 'boss' && !res.pass) {
        row.appendChild(h('button', { type: 'button', class: 'btn', onclick: function () { leaveTo('#/boss/' + cfg.world); } }, 'Try again'));
        row.appendChild(h('button', { type: 'button', class: 'btn alt', onclick: function () { leaveTo(dest()); } }, 'Back'));
      } else row.appendChild(h('button', { type: 'button', class: 'btn', onclick: function () { if (cfg.kind === 'lesson') SK.focusNext = true; leaveTo(dest()); } }, 'Continue'));
      wrap.appendChild(row);
      main.appendChild(h('div', { class: 'p-in' }, wrap));
      main.scrollTop = 0;
      if (res.pass) { SK.sfx('done'); SK.buzz([40, 60, 40]); SK.confetti(res.cleared || allDone ? 60 : 36); } else SK.sfx('bad');
      var b0 = row.querySelector('button'); if (b0) { try { b0.focus({ preventScroll: true }); } catch (e) { b0.focus(); } main.scrollTop = 0; }
    }

    show();
    return api;
  };
})();
