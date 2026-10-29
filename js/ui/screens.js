/* Screens. Each returns an element. The shell and router live in app.js. */
(function () {
  var SK = window.SK, h = SK.h;
  var S = (SK.screens = {});

  function ring(pct, size, color) {
    var r = (size - 10) / 2, c = 2 * Math.PI * r;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true"><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--paper-3)" stroke-width="7"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + (color || 'var(--teal)') + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + c * (1 - Math.min(1, pct)) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/></svg>';
  }
  SK.ringHtml = ring;

  function sw(label, checked, fn) {
    var cb = h('input', { type: 'checkbox' }); cb.checked = !!checked;
    cb.addEventListener('change', function () { fn(cb.checked); });
    return h('label', { class: 'sw' }, h('span', label), cb, h('i', { 'aria-hidden': 'true' }));
  }
  function back(hash, text) { return h('a', { class: 'backlink', href: hash, html: SK.icon('back', 18) + '<span>' + text + '</span>' }); }
  function head(t, sub) { return h('div', { class: 'sh' }, h('h1', t), sub ? h('p', { class: 'sub' }, sub) : null); }

  /* ========================================================== SUPPORT */
  /* Donate sheet: shows the Kaspa address from SK.DONATE (js/core.js) with a one-tap copy. */
  SK.supportSheet = function () {
    if (!SK.DONATE) return;
    var label = h('span', { class: 'sup-copy' }), timer = null;
    function paint(done) { label.innerHTML = SK.icon(done ? 'check' : 'copy', 18) + '<span>' + (done ? 'Copied' : 'Copy') + '</span>'; }
    paint(false);
    var chip = h('button', { type: 'button', class: 'sup-name', 'aria-label': 'Copy the Kaspa address' }, h('code', SK.DONATE), label);
    chip.addEventListener('click', function () {
      SK.copy(SK.DONATE).then(function () {
        chip.classList.add('done'); paint(true); SK.sfx('ok'); SK.announce('Copied the Kaspa address');
        clearTimeout(timer); timer = setTimeout(function () { chip.classList.remove('done'); paint(false); }, 1800);
      }, function () { SK.toast('Could not copy. Select the address and copy it by hand.'); });
    });
    SK.modal({
      title: 'Support SillyKuest',
      body: h('div', { class: 'sup' },
        h('div', { class: 'sup-sil', html: SK.sil('yay', 84) }),
        h('p', 'SillyKuest is free and open source, with no ads and no tracking. If it helped you, you can send a few KAS to this Kaspa address.'),
        chip,
        h('p', { class: 'cap' }, 'Paste it as the recipient in your wallet, and check that the first and last few characters match before you confirm.')),
      actions: [{ label: 'Close', kind: 'alt' }]
    });
  };

  /* ========================================================== INSTALL */
  /* What to suggest depends on where the app runs. Chrome hands over a prompt (SK.installEv). iPhone Safari has none, so
     we say where the button is. Android Chrome withholds the prompt when the app is already installed, so we say where to
     find it. Installed and running standalone: nothing to suggest. */
  SK.installText = {
    prompt: 'Install SillyKuest to open it like an app, even offline.',
    ios: 'Add SillyKuest to your Home Screen: tap Share, then Add to Home Screen.',
    android: 'Already installed? Open SillyKuest from your home screen. If not, open the three-dot menu and tap Install app.'
  };
  function media(q) { try { return !!(window.matchMedia && window.matchMedia(q).matches); } catch (e) { return false; } }
  /* Running as the installed app. display-mode "fullscreen" also matches while a browser tab is in fullscreen through the
     Fullscreen API, which is not an install, so that case is told apart by document.fullscreenElement. */
  SK.isInstalled = function () {
    return media('(display-mode: standalone)') || media('(display-mode: minimal-ui)') || navigator.standalone === true ||
      (media('(display-mode: fullscreen)') && !document.fullscreenElement);
  };
  SK.installMode = function () {
    var ua = navigator.userAgent || '';
    if (SK.isInstalled()) return null;
    if (SK.installEv) return 'prompt';
    if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return null;
  };
  /* Full screen: a normal browser tab keeps the system bars, and a web page cannot draw under them. The Fullscreen API
     hides them, so the setting asks for it. Browsers only allow it after a tap, so a saved choice is applied on the first tap. */
  SK.canFullscreen = function () {
    return !!document.fullscreenEnabled && !(media('(display-mode: fullscreen)') && !document.fullscreenElement);
  };
  SK.applyFullscreen = function (on) {
    var d = document;
    try {
      var p = on ? (!d.fullscreenElement && d.documentElement.requestFullscreen ? d.documentElement.requestFullscreen({ navigationUI: 'hide' }) : null)
                 : (d.fullscreenElement && d.exitFullscreen ? d.exitFullscreen() : null);
      if (p && p.catch) p.catch(function () { /* refused: the switch stays, the next tap tries again */ });
    } catch (e) { /* no Fullscreen API */ }
  };
  SK.doInstall = function () {
    var ev = SK.installEv; if (!ev) return; SK.installEv = null;
    try { ev.prompt(); } catch (e) { /* a prompt event can be used once */ }
  };

  /* ============================================================ LEARN */
  /* Map geometry. Every lesson is one fixed-height row, so the dotted trail can be computed instead of measured.
     Horizontal positions are percentages of the column width, vertical ones are pixels. */
  var ROW = 118, BOSSROW = 168;
  var OFF = [-8.4, -20.3, -20.3, -8.4, 8.4, 20.3, 20.3, 8.4];
  var fold = {};                      /* world id -> true (folded) or false (open); unset = default */

  function worldFold(wd, open, st) {
    if (fold[wd.id] !== undefined) return fold[wd.id];
    if (!open) return true;
    var next = SK.world(wd.id + 1), moved = next && SK.lessonsOf(next.id).some(function (l) { return st.done[l.id]; });
    return SK.worldDone(wd.id) && (!!st.bosses[wd.id] || !!moved);
  }
  function trail(list, n, doneN, bossY, hasBoss) {
    var pts = list.map(function (l, i) { return [50 + OFF[i % OFF.length], i * ROW + ROW / 2]; });
    if (hasBoss) pts.push([50, n * ROW + bossY]);
    function seg(a, b) { var dy = (b[1] - a[1]) * 0.55; return 'C' + a[0] + ' ' + (a[1] + dy) + ' ' + b[0] + ' ' + (b[1] - dy) + ' ' + b[0] + ' ' + b[1]; }
    function run(to) { var d = 'M' + pts[0][0] + ' ' + pts[0][1]; for (var i = 0; i < to && i < pts.length - 1; i++) d += seg(pts[i], pts[i + 1]); return d; }
    var H = n * ROW + (hasBoss ? BOSSROW : 0);
    var holder = h('div', { html: '<svg class="trail" viewBox="0 0 100 ' + H + '" preserveAspectRatio="none" aria-hidden="true" style="height:' + H + 'px"><path class="t-base" d="' + run(pts.length - 1) + '"/>' + (doneN > 0 ? '<path class="t-done" d="' + run(doneN) + '"/>' : '') + '</svg>' });
    return holder.firstChild;
  }

  S.learn = function () {
    if (SK.unwatchLearn) { SK.unwatchLearn(); SK.unwatchLearn = null; }
    var root = h('div', { class: 'learn' }), st = SK.state;
    var nxt = SK.nextLesson(), anyDone = Object.keys(st.done).length > 0;
    var rs = nxt ? SK.resumeAt(nxt) : 0;

    /* up next: one tap to carry on */
    var up = null;
    if (nxt) {
      var w = SK.world(nxt.world), first = !anyDone && !rs;
      up = h('a', { class: 'upnext card', href: '#/lesson/' + nxt.id, style: { '--w': w.color } },
        h('span', { class: 'un-sil', html: SK.sil('hi', 64) }),
        h('div', { class: 'un-b' },
          h('div', { class: 'un-k' }, first ? 'Hi, I’m Sil. Start here.' : rs ? 'Pick up where you left off' : 'Up next'),
          h('div', { class: 'un-t' }, h('span', { class: 'un-n' }, SK.num(nxt)), nxt.title),
          h('div', { class: 'un-s' }, first ? 'No jargon, no code. About ' + nxt.min + ' min.' : rs ? 'Step ' + (rs + 1) + ' of ' + nxt.steps.length + '. About ' + SK.minsLeft(nxt, rs) + ' min left.' : 'World ' + w.id + ': ' + w.name + '. About ' + nxt.min + ' min.'),
          rs ? h('div', { class: 'un-meter', 'aria-hidden': 'true' }, h('i', { style: { width: Math.round(rs / nxt.steps.length * 100) + '%' } })) : null),
        h('span', { class: 'un-go', 'aria-label': rs ? 'Resume' : 'Start', html: SK.icon('play', 22) }));
    } else {
      up = h('a', { class: 'upnext card', href: '#/practice' },
        h('span', { class: 'un-sil', html: SK.sil('yay', 64) }),
        h('div', { class: 'un-b' }, h('div', { class: 'un-k' }, 'Quest complete'), h('div', { class: 'un-t' }, 'You finished every lesson'), h('div', { class: 'un-s' }, 'Replay a lesson, rematch a boss, or keep it sharp in Practice.')),
        h('span', { class: 'un-go', html: SK.icon('target', 22) }));
    }
    root.appendChild(up);

    if (!SK.saveOk) {
      root.appendChild(h('div', { class: 'tip card warn', role: 'alert' }, h('span', { html: SK.icon('info', 22) }),
        h('p', 'This browser blocks saving, so progress is lost when you close the tab. Copy your progress code from the You tab to keep it.'),
        h('a', { class: 'btn alt sm', href: '#/you' }, 'Open You')));
    }
    if (st.level === 'builder' && !SK.worldDone(1) && !st.bosses[1]) {
      root.appendChild(h('div', { class: 'tip card' }, h('span', { html: SK.icon('crown', 22) }), h('p', 'You said you build things. Beat the Envelope Town boss to skip straight to World 2.'), h('a', { class: 'btn alt sm', href: '#/boss/1' }, 'Test out')));
    }

    var imode = SK.installMode();
    if (imode && !st.set.installNo && Object.keys(st.done).length) {
      var inst = h('div', { class: 'tip card install' }, h('span', { html: SK.icon('plus', 22) }),
        h('div', { class: 'in-b' }, h('p', SK.installText[imode]),
          h('div', { class: 'in-acts' },
            imode === 'prompt' ? h('button', { type: 'button', class: 'btn sm', onclick: function () { SK.doInstall(); inst.remove(); } }, 'Install') : null,
            h('button', { type: 'button', class: 'btn alt sm', onclick: function () { st.set.installNo = true; SK.save(); inst.remove(); } }, imode === 'prompt' ? 'Not now' : 'Got it'))));
      root.appendChild(inst);
    }

    /* worlds */
    SK.worlds.forEach(function (wd) {
      var open = SK.worldOpen(wd.id), list = SK.lessonsOf(wd.id), doneN = list.filter(function (l) { return st.done[l.id]; }).length;
      var folded = worldFold(wd, open, st), stars = 0;
      list.forEach(function (l) { if (st.done[l.id]) stars += st.done[l.id].stars; });
      var sec = h('section', { class: 'world' + (open ? '' : ' closed') + (folded ? ' fold' : ''), style: { '--w': open ? wd.color : 'var(--paper-3)' }, 'data-w': wd.id, 'aria-label': wd.name });
      var pips = h('span', { class: 'pips', 'aria-hidden': 'true' }); list.forEach(function (l) { pips.appendChild(h('i', { class: st.done[l.id] ? 'on' : '' })); });
      var sub = !open ? 'Locked' : doneN === list.length ? 'Finished, ' + stars + ' of ' + list.length * 3 + ' stars' : doneN === 0 && !folded ? wd.tag : '';
      var head = h('button', { type: 'button', class: 'wb', 'aria-expanded': folded ? 'false' : 'true', 'aria-label': 'World ' + wd.id + ': ' + wd.name + ', ' + doneN + ' of ' + list.length + ' done' + (open ? '' : ', locked'),
        onclick: function () { fold[wd.id] = !folded; var y = head.getBoundingClientRect().top; reflow(); var nh = SK.$('.world[data-w="' + wd.id + '"] .wb'); if (nh) window.scrollBy(0, nh.getBoundingClientRect().top - y); } },
        h('span', { class: 'wb-ic', html: SK.icon(open ? wd.icon : 'lock', 26) }),
        h('div', { class: 'wb-t' }, h('div', { class: 'wb-k' }, 'World ' + wd.id), h('h2', wd.name), sub ? h('p', sub) : null),
        h('span', { class: 'wb-r' }, pips, h('span', { class: 'wb-chev', html: SK.icon('back', 20) })));
      sec.appendChild(head);

      var hasBoss = true, n = list.length;
      var path = h('div', { class: 'path', style: { height: (n * ROW + BOSSROW) + 'px' } });
      var doneRun = 0; while (doneRun < n && st.done[list[doneRun].id]) doneRun++;
      path.appendChild(trail(list, n, st.bosses[wd.id] || doneRun === n ? n : doneRun, BOSSROW * 0.42, hasBoss));
      list.forEach(function (l, i) {
        var done = st.done[l.id], ok = SK.unlocked(l), isNext = nxt && nxt.id === l.id, rsl = SK.resumeAt(l);
        var state = done ? 'done' : ok ? 'open' : 'locked', xp = 50 + OFF[i % OFF.length], prev = list[i - 1];
        var node = h('button', {
          type: 'button', class: 'pn ' + (xp > 50 ? 'l ' : 'r ') + 's-' + state + (isNext ? ' current' : ''), style: { top: (i * ROW) + 'px', height: ROW + 'px', '--x': xp + '%' },
          'aria-label': SK.num(l) + ' ' + l.title + (done ? ', done, ' + done.stars + ' stars' : ok ? (isNext ? ', up next' : '') : ', locked'),
          onclick: function () {
            if (!ok) { SK.toast(prev && SK.worldOpen(l.world) ? 'Finish “' + prev.title + '” first.' : 'Finish World ' + (l.world - 1) + ' or beat its boss to open this one.'); node.classList.remove('nope'); void node.offsetWidth; node.classList.add('nope'); SK.buzz(20); return; }
            if (isNext && !rsl) { location.hash = '#/lesson/' + l.id; return; }   /* fresh next lesson: one tap */
            lessonSheet(l);                                                         /* resume or replay: offer the choice */
          }
        });
        node.appendChild(h('span', { class: 'pn-env' }, SK.env({ state: state === 'done' ? 'open' : state === 'locked' ? 'locked' : 'sealed', cls: 'nd', accent: wd.color, label: '', amt: state === 'done' ? '\u2713' : state === 'locked' ? null : SK.num(l) })));
        var lab = h('span', { class: 'pn-l' }, h('span', { class: 'nd-t' }, l.title));
        if (done) { var sx = h('span', { class: 'nd-stars', 'aria-hidden': 'true' }); for (var k = 0; k < 3; k++) sx.appendChild(h('i', { class: k < done.stars ? 'on' : '', html: SK.icon('star', 14) })); lab.appendChild(sx); }
        else if (ok) lab.appendChild(h('span', { class: 'nd-m' }, rsl ? 'Step ' + (rsl + 1) + ' of ' + l.steps.length : l.min + ' min'));
        node.appendChild(lab);
        if (isNext) node.appendChild(h('span', { class: 'nd-go' }, rsl ? 'Resume' : 'Start'));
        path.appendChild(node);
      });
      var bossState = st.bosses[wd.id] ? 'done' : open ? 'open' : 'locked';
      var boss = h('button', {
        type: 'button', class: 'pn boss s-' + bossState, style: { top: (n * ROW) + 'px', height: BOSSROW + 'px' }, 'aria-label': 'Boss: ' + wd.boss.name + (bossState === 'locked' ? ', locked' : bossState === 'done' ? ', defeated' : ''),
        onclick: function () { if (!open) { SK.toast('Open World ' + wd.id + ' first.'); return; } bossSheet(wd); }
      }, h('span', { class: 'pn-env' }, h('span', { class: 'bossic', html: SK.monster(bossState === 'locked' ? '#B9B5E0' : wd.color, 80) })),
        h('span', { class: 'pn-l' }, h('span', { class: 'nd-t' }, wd.boss.name), h('span', { class: bossState === 'done' ? 'nd-stars on' : 'nd-m' }, bossState === 'done' ? 'Defeated' : bossState === 'locked' ? 'Locked' : 'Boss fight')));
      path.appendChild(boss);
      sec.appendChild(path);
      if (!open) sec.appendChild(h('p', { class: 'closed-note' }, 'Finish World ' + (wd.id - 1) + ' or beat its boss to open this one.'));
      root.appendChild(sec);
    });
    root.appendChild(h('div', { class: 'foot-note' },
      h('p', 'SillyKuest is free and open source. Syntax and APIs may change, so check the official repositories before writing production code.'),
      h('button', { type: 'button', class: 'foot-donate', onclick: SK.supportSheet }, SK.ico('heart', 16), 'Support SillyKuest')));

    /* floating continue pill: shows once both the up-next card and the current node have scrolled out of view */
    if (nxt && 'IntersectionObserver' in window) {
      var nw = SK.world(nxt.world);
      var fab = h('a', { class: 'fab', href: '#/lesson/' + nxt.id, style: { '--w': nw.color }, 'aria-label': (rs ? 'Resume ' : 'Continue ') + SK.num(nxt) + ' ' + nxt.title, tabindex: '-1' },
        h('span', (rs ? 'Resume ' : 'Continue ') + SK.num(nxt) + ' ' + nxt.title), h('i', { html: SK.icon('play', 16) }));
      root.appendChild(fab);
      var seen = { up: true, cur: true };
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { seen[e.target === up ? 'up' : 'cur'] = e.isIntersecting; });
        var show = !seen.up && !seen.cur; fab.classList.toggle('show', show); fab.tabIndex = show ? 0 : -1;
      }, { rootMargin: '-62px 0px -70px 0px' });
      /* observe only once the nodes are in the document, otherwise the first reading is a false "not visible" */
      setTimeout(function () { if (!up.isConnected) return; io.observe(up); var cn = root.querySelector('.pn.current'); if (cn) io.observe(cn); else seen.cur = false; }, 0);
      SK.unwatchLearn = function () { io.disconnect(); };
    }
    return root;
  };
  /* re-render the Learn screen in place (fold toggles) without touching scroll or other state */
  function reflow() { var cur = SK.$('.screen > .learn'); if (!cur) return; if (SK.unwatchLearn) { SK.unwatchLearn(); SK.unwatchLearn = null; } var fresh = S.learn(); cur.parentNode.replaceChild(fresh, cur); }

  function lessonSheet(l) {
    var w = SK.world(l.world), done = SK.state.done[l.id], rs = SK.resumeAt(l);
    var quizN = l.steps.filter(SK.isQuiz).length;
    var body = h('div', { class: 'ls' },
      h('div', { class: 'ls-top', style: { '--w': w.color } }, h('span', { class: 'ls-ic', html: SK.icon(w.icon, 26) }), h('span', 'World ' + w.id + ': ' + w.name)),
      h('p', l.blurb),
      h('p', { class: 'cap' }, 'About ' + l.min + ' minutes. ' + l.steps.length + ' steps, ' + quizN + ' questions.'));
    if (done) { var s = h('div', { class: 'stars sm' }); for (var k = 0; k < 3; k++) s.appendChild(h('span', { class: 'star' + (k < done.stars ? ' on' : ''), html: SK.icon('star', 24) })); body.appendChild(s); }
    if (rs) body.appendChild(h('div', { class: 'resume-note' }, h('span', { html: SK.icon('info', 20) }), h('span', 'You stopped at step ' + (rs + 1) + ' of ' + l.steps.length + '.')));
    var acts = rs
      ? [{ label: 'Start over', kind: 'alt', fn: function () { SK.setResume(l.id, 0); location.hash = '#/lesson/' + l.id + '/restart'; } }, { label: 'Resume', fn: function () { location.hash = '#/lesson/' + l.id; } }]
      : [{ label: done ? 'Replay' : 'Start lesson', fn: function () { location.hash = '#/lesson/' + l.id; } }];
    SK.modal({ title: SK.num(l) + ' ' + l.title, body: body, actions: acts });
  }
  function bossSheet(wd) {
    var n = SK.bossKeys(wd.id).length, won = SK.state.bosses[wd.id];
    var body = h('div', { class: 'ls' }, h('div', { class: 'boss-art', html: SK.monster(wd.color, 110) }),
      h('p', { class: 'bq' }, wd.boss.quip),
      h('p', 'Answer ' + Math.min(8, n) + ' questions from this world. You may slip up twice. ' + (won ? 'You have beaten this boss already, so a rematch pays only 10 XP.' : 'Beat it to open the next world, even if you skipped lessons.')));
    SK.modal({ title: wd.boss.name, body: body, actions: [{ label: won ? 'Rematch' : 'Fight', fn: function () { location.hash = '#/boss/' + wd.id; } }] });
  }

  /* ========================================================== PRACTICE */
  S.practice = function () {
    var st = SK.state, root = h('div', { class: 'practice' });
    root.appendChild(head('Practice', 'Short rounds that make it stick.'));
    var xp = SK.todayXp(), met = xp >= SK.GOAL, s = SK.streakNow();
    root.appendChild(h('button', { type: 'button', class: 'today card', onclick: SK.todaySheet, style: { width: '100%', textAlign: 'left', font: 'inherit', color: 'inherit' } },
      h('span', { class: 'tg-ring' }, h('span', { style: { position: 'absolute', inset: 0 }, html: SK.ring(xp / SK.GOAL, 76, 9, met ? 'var(--good-t)' : 'var(--teal)') }), h('span', String(Math.min(xp, SK.GOAL)))),
      h('div', { class: 'tg-b' }, h('h3', met ? 'Daily goal reached' : 'Daily goal'),
        h('p', met ? 'Anything more is a bonus.' : (SK.GOAL - xp) + ' XP to go. One lesson or round gets you there.'),
        h('div', { class: 'tg-row' }, h('span', { class: 'tag' }, SK.ico('flame', 14), s + ' day streak')))));

    var m = st.mistakes.filter(SK.stepByKey);
    var anyDone = Object.keys(st.done).length > 0, nxt = SK.nextLesson();
    function lockedCard(icBg, icon, title, text) {
      return h('a', { class: 'pcard card off', href: nxt ? '#/lesson/' + nxt.id : '#/learn' },
        h('span', { class: 'pc-ic', html: SK.icon(icon, 28) }),
        h('div', { class: 'pc-b' }, h('h3', title), h('p', text), h('span', { class: 'pc-need' }, nxt ? 'Start lesson ' + SK.num(nxt) : 'Go to the map')),
        h('span', { class: 'pc-go', html: SK.icon('lock', 18) }));
    }
    function card(color, icon, title, text, href) {
      return h('a', { class: 'pcard card', href: href }, h('span', { class: 'pc-ic', style: { background: color }, html: SK.icon(icon, 28) }),
        h('div', { class: 'pc-b' }, h('h3', title), h('p', text)), h('span', { class: 'pc-go', html: SK.icon('play', 18) }));
    }
    root.appendChild(card('var(--sky)', 'target', 'Covenants Quiz', 'Ten questions, a score and a card to share. No lessons needed.' + (st.quiz && st.quiz.plays ? ' Your best: ' + st.quiz.best + '/10.' : ''), '#/quiz'));
    if (m.length) root.appendChild(card('var(--coral)', 'bug', 'Review your slips', m.length + ' question' + (m.length === 1 ? '' : 's') + ' you missed. Get them right to clear them.', '#/review'));
    else root.appendChild(h('div', { class: 'pcard card off' }, h('span', { class: 'pc-ic', html: SK.icon('bug', 28) }), h('div', { class: 'pc-b' }, h('h3', 'Review your slips'), h('p', 'Nothing to review. Missed questions land here.')), h('span', { class: 'pc-go', html: SK.icon('check', 18) })));
    root.appendChild(anyDone ? card('var(--sun)', 'bolt', 'Daily five', 'Five random questions from lessons you have finished.', '#/daily') : lockedCard('var(--sun)', 'bolt', 'Daily five', 'Unlocks after your first lesson. Then it mixes questions from everything you have learned.'));
    root.appendChild(anyDone ? card('var(--violet)', 'code', 'Code workout', 'Five code tasks: write a line, fix a bug, assemble a contract.', '#/code') : lockedCard('var(--violet)', 'code', 'Code workout', 'Unlocks after your first lesson. Then it drills the code tasks from everything you have learned.'));

    var vOpen = st.done['2-1'] || st.level === 'builder';
    root.appendChild(vOpen ? card('#FF8A5B', 'shield', 'Vibe Check', 'VibeBot wrote these contracts and swears they are safe. Catch the line it got wrong.', '#/vibe') : lockedCard(null, 'shield', 'Vibe Check', 'Unlocks after lesson ' + SK.num(SK.lesson('2-1')) + '. An overconfident AI hides one bug per contract. Can you find it?'));

    root.appendChild(vOpen ? card('#2BB8A3', 'lock', 'Vault Heist', 'Write the rule that guards a vault, then watch thieves test it. Six levels, free retries.', '#/heist') : lockedCard(null, 'lock', 'Vault Heist', 'Unlocks after lesson ' + SK.num(SK.lesson('2-1')) + '. Build the rule, then run real thief transactions against it.'));

    root.appendChild(h('h2', { class: 'sec' }, 'Boss rooms'));
    SK.worlds.forEach(function (wd) {
      var open = SK.worldOpen(wd.id), won = st.bosses[wd.id];
      root.appendChild(h('a', { class: 'brow card' + (open ? '' : ' off'), href: open ? '#/boss/' + wd.id : null, 'aria-disabled': open ? null : 'true', style: { '--w': wd.color } },
        h('span', { class: 'bossic', html: SK.monster(open ? wd.color : '#B9B5E0', 52) }),
        h('div', h('strong', wd.boss.name), h('div', { class: 'cap' }, 'World ' + wd.id + ': ' + wd.name)),
        h('span', { class: 'tag ' + (won ? 'good' : '') }, won ? 'Defeated' : open ? 'Ready' : 'Locked')));
    });
    return root;
  };

  /* ================================================================ LAB */
  var labTab = 'toys';
  var TOY_IC = { envelopes: 'envelope', gate: 'lock', counter: 'plus', template: 'shield', topology: 'tree', lineage: 'link', splitter: 'coin', leader: 'crown', tokenlab: 'flask', handshake: 'user', lanes: 'map', proofs: 'bolt' };
  S.lab = function () {
    var root = h('div', { class: 'lab' });
    root.appendChild(head('Lab', 'Play with the ideas, or read real contracts. No pressure, no score.'));
    var sg = h('div', { class: 'seg', role: 'tablist' }), list = h('div', { class: 'llist' });
    var tabs = [['toys', 'Toys', SK.toys.length], ['code', 'Contracts', SK.exOrder.length]];
    function draw() {
      SK.clear(list);
      SK.$$('button', sg).forEach(function (b) { var on = b.getAttribute('data-t') === labTab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
      if (labTab === 'toys') {
        SK.toys.forEach(function (t) {
          list.appendChild(h('a', { class: 'lrow card', href: '#/lab/toy/' + t.id },
            h('span', { class: 'lr-ic toy', html: SK.icon(TOY_IC[t.id] || 'flask', 24) }),
            h('div', h('strong', t.t), h('div', { class: 'cap' }, t.d)),
            h('span', { class: 'lr-chev', html: SK.icon('back', 20) })));
        });
      } else {
        SK.exOrder.forEach(function (id) {
          var e = SK.examples[id];
          list.appendChild(h('a', { class: 'lrow card', href: '#/lab/ex/' + id },
            h('span', { class: 'lr-ic', html: SK.icon('code', 24) }),
            h('div', h('strong', e.title), h('div', { class: 'cap' }, e.blurb), e.badge === 'sketch' ? h('span', { class: 'cr-badge sketch', style: { display: 'inline-block', marginTop: '6px' } }, 'Teaching sketch') : null),
            h('span', { class: 'lr-chev', html: SK.icon('back', 20) })));
        });
      }
    }
    tabs.forEach(function (t) {
      sg.appendChild(h('button', { type: 'button', role: 'tab', 'data-t': t[0], onclick: function () { labTab = t[0]; draw(); } }, t[1], h('span', { class: 'n' }, String(t[2]))));
    });
    root.appendChild(sg); root.appendChild(list); draw();
    return root;
  };
  S.labEx = function (id) {
    var e = SK.examples[id]; if (!e) return S.lab();
    var root = h('div', { class: 'lab-ex' });
    root.appendChild(back('#/lab', 'Lab'));
    root.appendChild(head(e.title, e.blurb));
    var cr = SK.codeReader({ lines: e.lines, title: e.title, badge: e.badge, copy: true });
    root.appendChild(sw('Show pro notes', false, function (v) { cr.setPro(v); }));
    root.appendChild(cr.el);
    root.appendChild(h('p', { class: 'cap' }, 'Annotated for learning. It has not been run through the compiler here, so check the official Silverscript repository before using it for real.'));
    return root;
  };
  S.labToy = function (id) {
    var t = SK.toys.filter(function (x) { return x.id === id; })[0]; if (!t) return S.lab();
    var root = h('div', { class: 'lab-toy' });
    root.appendChild(back('#/lab', 'Lab')); root.appendChild(head(t.t, t.d));
    var ctx = { setReady: function () {}, hint: function () {} };
    var step = {}; for (var k in (t.o || {})) step[k] = t.o[k];
    root.appendChild(h('div', { class: 'toy-box card' }, SK.widgets[t.w](step, ctx).el));
    return root;
  };

  /* ========================================================= DICTIONARY */
  S.words = function (tab, focus) {
    tab = tab || 'words';
    var root = h('div', { class: 'dict' });
    root.appendChild(head('Dictionary', 'Every term in plain English, with the precise version one tap away.'));
    var sg = h('div', { class: 'seg' });
    [['words', 'Words'], ['ops', 'Opcodes'], ['cheat', 'Cheat sheet']].forEach(function (t) {
      sg.appendChild(h('a', { href: '#/' + t[0], class: tab === t[0] ? 'on' : '', 'aria-current': tab === t[0] ? 'page' : null }, t[1]));
    });
    root.appendChild(sg);
    var body = h('div', { class: 'dbody' }); root.appendChild(body);
    if (tab === 'ops') opsView(body); else if (tab === 'cheat') cheatView(body); else wordsView(body, focus);
    return root;
  };
  function search(onq, ph) {
    var inp = h('input', { type: 'search', class: 'search', placeholder: ph, 'aria-label': ph, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'search' });
    var clr = h('button', { type: 'button', class: 'sclear', 'aria-label': 'Clear search', hidden: true, html: SK.icon('x', 18), onclick: function () { inp.value = ''; clr.hidden = true; onq(''); inp.focus(); } });
    inp.addEventListener('input', function () { clr.hidden = !inp.value; onq(inp.value.trim().toLowerCase()); });
    return h('div', { class: 'sbox' }, h('span', { html: SK.icon('search', 20) }), inp, clr);
  }
  function wordsView(body, focus) {
    var cat = 'All', q = '', list = h('div', { class: 'wlist' }), count = h('div', { class: 'rcount', 'aria-live': 'polite' });
    var cats = ['All'].concat(SK.glossary.reduce(function (a, g) { if (a.indexOf(g.cat) < 0) a.push(g.cat); return a; }, []));
    var chips = h('div', { class: 'chips scroll' });
    cats.forEach(function (c) { chips.appendChild(h('button', { type: 'button', class: 'chipbtn' + (c === cat ? ' on' : ''), onclick: function () { cat = c; SK.$$('.chipbtn', chips).forEach(function (b) { b.classList.toggle('on', b.textContent === c); }); draw(); } }, c)); });
    function draw() {
      SK.clear(list); var n = 0;
      SK.glossary.forEach(function (g) {
        if (cat !== 'All' && g.cat !== cat) return;
        if (q && (g.term + ' ' + g.s + ' ' + g.p).toLowerCase().indexOf(q) < 0) return;
        n++;
        var det = h('details', { class: 'word card', id: 'w-' + g.id }, h('summary', null,
          h('span', { class: 'w-t' }, h('strong', g.term), h('span', { class: 'w-p', html: SK.fmt(g.s, true) })),
          h('span', { class: 'tag' }, g.cat)),
          h('p', { html: SK.fmt(g.s, true) }), h('p', { class: 'prec', html: '<strong>Precise:</strong> ' + SK.fmt(g.p, true) }));
        if (focus === g.id) det.open = true;
        list.appendChild(det);
      });
      count.textContent = n ? (n === SK.glossary.length ? n + ' terms' : n + ' of ' + SK.glossary.length + ' terms') : '';
      if (!n) list.appendChild(h('p', { class: 'empty' }, 'No terms match. Try fewer letters or clear the filter.'));
    }
    body.appendChild(search(function (v) { q = v; draw(); }, 'Search terms'));
    body.appendChild(chips); body.appendChild(count); body.appendChild(list); draw();
    if (focus) setTimeout(function () { var el = document.getElementById('w-' + focus); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' }); }, 60);
  }
  function opsView(body) {
    var cat = 'All', q = '', list = h('div', { class: 'olist' });
    var chips = h('div', { class: 'chips scroll' });
    ['All'].concat(SK.opCats).forEach(function (c) { chips.appendChild(h('button', { type: 'button', class: 'chipbtn' + (c === cat ? ' on' : ''), onclick: function () { cat = c; SK.$$('.chipbtn', chips).forEach(function (b) { b.classList.toggle('on', b.textContent === c); }); draw(); } }, c)); });
    function draw() {
      SK.clear(list); var n = 0;
      SK.opcodes.forEach(function (o) {
        if (cat !== 'All' && o[2] !== cat) return;
        if (q && (o[0] + ' ' + o[1] + ' ' + o[3]).toLowerCase().indexOf(q) < 0) return;
        n++;
        list.appendChild(h('div', { class: 'op card' }, h('div', { class: 'op-h' }, h('code', o[0]), h('span', { class: 'hex' }, o[1])), h('p', o[3])));
      });
      if (!n) list.appendChild(h('p', { class: 'empty' }, 'No opcodes match.'));
    }
    body.appendChild(h('p', { class: 'cap' }, 'You will rarely type these yourself. Silverscript compiles down to them. ' + SK.opDisabled));
    body.appendChild(search(function (v) { q = v; draw(); }, 'Search opcodes'));
    body.appendChild(chips); body.appendChild(list); draw();
  }
  function cheatView(body) {
    SK.cheat.forEach(function (sec) {
      body.appendChild(h('h2', { class: 'sec' }, sec.title));
      body.appendChild(h('div', { class: 'tbl-wrap card' }, h('table', { class: 'tbl' },
        h('thead', null, h('tr', sec.cols.map(function (c) { return h('th', c); }))),
        h('tbody', sec.rows.map(function (r) { return h('tr', r.map(function (c, i) { return h('td', { html: sec.code && i === 0 ? '<code>' + SK.esc(c) + '</code>' : SK.esc(c) }); })); })))));
    });
  }

  /* ================================================================ YOU */
  S.you = function () {
    var st = SK.state, rk = SK.rank(), root = h('div', { class: 'you' });
    root.appendChild(h('section', { class: 'prof card', style: { '--rk': String((SK.ranks.length > 1 ? Math.max(0, SK.ranks.map(function (r) { return r.name; }).indexOf(rk.name)) / (SK.ranks.length - 1) : 1)) } }, h('div', { html: SK.sil('hi', 96) }),
      h('div', { class: 'prof-b' }, h('h1', rk.name), h('p', st.xp + ' XP' + (rk.next ? '. ' + (rk.next.at - st.xp) + ' more for ' + rk.next.name : '. Top rank reached')),
        h('div', { class: 'meter', role: 'progressbar', 'aria-valuenow': Math.round(rk.pct * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i', { style: { width: Math.round(rk.pct * 100) + '%' } })))));
    var done = Object.keys(st.done).length, acc = st.stats.total ? Math.round(st.stats.ok / st.stats.total * 100) : 0;
    root.appendChild(h('div', { class: 'dstats' },
      h('div', { class: 'ds card ds-a' }, h('div', { class: 'ds-v' }, SK.ico('flame', 22), h('span', String(SK.streakNow()))), h('div', { class: 'ds-l' }, 'Day streak')),
      h('div', { class: 'ds card ds-b' }, h('div', { class: 'ds-v' }, SK.ico('book', 22), h('span', done + '/' + SK.lessons.length)), h('div', { class: 'ds-l' }, 'Lessons done')),
      h('div', { class: 'ds card ds-c' }, h('div', { class: 'ds-v' }, SK.ico('target', 22), h('span', acc + '%')), h('div', { class: 'ds-l' }, 'Right first time'))));
    var got = SK.badges.filter(function (b) { return st.badges[b.id]; }).length;
    root.appendChild(h('h2', { class: 'sec' }, 'Badges ' + got + '/' + SK.badges.length));
    var bg = h('div', { class: 'badges' });
    SK.badges.forEach(function (b) {
      var have = st.badges[b.id], col = b.world ? SK.world(b.world).color : 'var(--sun)';
      bg.appendChild(h('div', { class: 'badge card' + (have ? ' got' : ''), style: { '--w': col } }, h('span', { class: 'bd-ic', html: SK.icon(have ? b.icon : 'lock', 26) }), h('strong', b.name), h('span', { class: 'cap' }, b.desc)));
    });
    root.appendChild(bg);
    root.appendChild(h('h2', { class: 'sec' }, 'Settings'));
    var set = h('div', { class: 'settings card' });
    set.appendChild(sw('Sound and vibration', st.set.sound, function (v) { st.set.sound = v; SK.save(); SK.refreshChrome(); if (v) SK.sfx('ok'); }));
    set.appendChild(sw('Animations', st.set.motion !== false, function (v) { st.set.motion = v; SK.save(); SK.applyTheme(); }));
    var oa = sw('Open every lesson', st.set.openAll, function (v) { st.set.openAll = v; SK.save(); });
    oa.querySelector('span').appendChild(h('small', 'Skip the order and jump to any lesson.'));
    set.appendChild(oa);
    if (SK.canFullscreen()) {
      var fs = sw('Full screen', st.set.fullscreen, function (v) { st.set.fullscreen = v; SK.save(); SK.applyFullscreen(v); });
      fs.querySelector('span').appendChild(h('small', 'Hide the browser bars and fill the whole screen. Swipe from the edge to bring them back.'));
      set.appendChild(fs);
    }
    var th = h('div', { class: 'row-set' }, h('span', 'Theme'));
    var seg = h('div', { class: 'seg sm' });
    [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].forEach(function (t) {
      seg.appendChild(h('button', { type: 'button', class: st.set.theme === t[0] ? 'on' : '', onclick: function () { st.set.theme = t[0]; SK.save(); SK.applyTheme(); SK.$$('button', seg).forEach(function (b) { b.classList.toggle('on', b.textContent === t[1]); }); } }, t[1]));
    });
    th.appendChild(seg); set.appendChild(th);
    var imode = SK.installMode();
    if (imode === 'prompt') {
      set.appendChild(h('div', { class: 'row-set' }, h('span', 'Install as an app'),
        h('button', { type: 'button', class: 'btn sm', onclick: function () { SK.doInstall(); SK.route(); } }, 'Install')));
    } else if (imode) {
      set.appendChild(h('div', { class: 'row-set' }, h('span', 'Install as an app', h('small', SK.installText[imode]))));
    }
    root.appendChild(set);
    if (SK.DONATE) {
      root.appendChild(h('section', { class: 'support card' },
        h('span', { class: 'sup-ic', html: SK.icon('heart', 26) }),
        h('div', { class: 'sup-b' }, h('h3', 'Support SillyKuest'), h('p', 'Free, open source, no ads. If it helped you, chip in a few KAS.')),
        h('button', { type: 'button', class: 'btn sm', onclick: SK.supportSheet }, 'Donate')));
    }
    root.appendChild(h('h2', { class: 'sec' }, 'Your progress code'));
    root.appendChild(h('p', { class: 'cap' }, 'Progress lives only in this browser. Copy the code to move it to another device, then paste it there and restore.'));
    var ta = h('textarea', { class: 'code-ta', rows: 3, 'aria-label': 'Progress code', placeholder: 'Paste a progress code here to restore it', autocapitalize: 'off', spellcheck: 'false' });
    var restore = h('button', { type: 'button', class: 'btn alt sm', disabled: true, onclick: function () { if (SK.importCode(ta.value)) { SK.toast('Progress restored'); if (location.hash === '#/learn') SK.route(); else location.hash = '#/learn'; } else SK.toast('That code did not work. Nothing was changed.'); } }, 'Restore');
    ta.addEventListener('input', function () { restore.disabled = !ta.value.trim(); });
    var row = h('div', { class: 'tries' },
      h('button', { type: 'button', class: 'btn alt sm', onclick: function () { var code = SK.exportCode(); SK.copy(code).then(function () { SK.toast('Code copied. Keep it somewhere safe.'); }, function () { ta.value = code; ta.select(); SK.toast('Code ready. Copy it somewhere safe.'); }); } }, 'Copy my code'),
      restore);
    root.appendChild(ta); root.appendChild(row);
    root.appendChild(h('h2', { class: 'sec' }, 'About'));
    root.appendChild(h('div', { class: 'about card' },
      h('p', 'SillyKuest ' + SK.version + '. Free, open source, no account, no tracking. Progress stays in this browser.'),
      h('p', 'This is a learning tool, not audited guidance. Silverscript, Argent and vprogs APIs may move. Check the official repositories before writing production code.'),
      h('button', { type: 'button', class: 'btn danger sm', onclick: function () { SK.modal({ title: 'Erase all progress?', body: 'XP, streak, stars and badges will be deleted from this browser. This cannot be undone.', actions: [{ label: 'Keep it', kind: 'alt' }, { label: 'Erase', kind: 'danger', fn: function () { SK.reset(); if (location.hash === '#/learn') SK.route(); else location.hash = '#/learn'; } }] }); } }, 'Erase progress')));
    return root;
  };

  /* ============================================================ WELCOME */
  /* done(go): go is a hash to open straight away (lesson 1.1), or null to just show the map. */
  SK.welcome = function (done) {
    var ov = h('div', { class: 'welcome', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Welcome', tabindex: '-1' });
    function pick(level, go) { SK.state.level = level; SK.save(); ov.remove(); document.body.classList.remove('no-scroll'); done(go); }
    function opt(level, icon, color, t, d, go) { return h('button', { type: 'button', class: 'wopt card', style: { '--w': color }, onclick: function () { pick(level, go); } }, h('span', { class: 'wi', html: SK.icon(icon, 24) }), h('div', h('strong', t), h('span', { class: 'd' }, d))); }
    ov.appendChild(h('div', { class: 'w-in' },
      h('div', { class: 'w-sil', html: SK.sil('hi', 116) }),
      h('h1', 'Hi, I’m Sil.'),
      h('p', 'I’m a ghost, which is fair, because Kaspa’s consensus is called GHOSTDAG. I’ll teach you how Kaspa covenants and Silverscript work, one small idea at a time.'),
      h('p', { class: 'w-q' }, 'Where are you starting from?'),
      opt('new', 'envelope', 'var(--teal)', 'Brand new to crypto', 'Start from the very beginning.', '#/lesson/1-1'),
      opt('basics', 'coin', 'var(--sun)', 'I know the basics', 'I have used wallets and coins.', '#/lesson/1-1'),
      opt('builder', 'code', 'var(--violet)', 'I build things', 'I write code. Let me test out of the easy parts.', null),
      h('p', { class: 'w-skip' }, h('button', { type: 'button', class: 'btn alt sm', onclick: function () { pick('new', null); } }, 'Look around first'), ' ',
        h('button', { type: 'button', class: 'btn alt sm', onclick: function () { ov.remove(); document.body.classList.remove('no-scroll'); done('#/quiz'); } }, 'Take the 2-minute quiz'))));
    document.body.appendChild(ov); document.body.classList.add('no-scroll');
    ov.focus({ preventScroll: true });
  };
})();
