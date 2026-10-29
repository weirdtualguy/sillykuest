/* Covenants Quiz: the landing screen (#/quiz), the result view and the share card.
   The round itself runs in the player (kind 'quiz', see js/ui/player.js); questions live in js/data/covenant-quiz.js.
   Privacy: the card is drawn on a canvas on this device. Nothing is sent anywhere. The only outbound thing is the
   "Post on X" button, which opens an X compose window in a new tab when the person taps it. */
(function () {
  var SK = window.SK, h = SK.h, S = SK.screens;

  /* Used when the app is opened from a file; on the web the page's own address is used, so forks share their own link. */
  SK.HOME = 'https://weirdtualguy.github.io/sillykuest/';
  var GREEN = '\uD83D\uDFE9', RED = '\uD83D\uDFE5';

  SK.shareUrl = function (score) {
    var base = /^https?:$/.test(location.protocol) ? location.origin + location.pathname.replace(/index\.html$/, '') : SK.HOME;
    return base + '#/quiz' + (score == null ? '' : '/' + score);
  };
  /* The text works on its own: the emoji row is the spoiler-free "grid" people can read at a glance, even with no image. */
  SK.quizShareText = function (score, log) {
    var t = SK.quizTier(score);
    return 'I scored ' + score + '/' + log.length + ' on the SillyKuest Covenants Quiz: ' + t.name + '.\n' +
      log.map(function (ok) { return ok ? GREEN : RED; }).join('') + '\nCan you beat it? ' + SK.shareUrl(score) + '\n#Kaspa';
  };

  /* ------------------------------------------------------------ the card */
  var W = 1200, H = 675, SANS = '"Poppins", system-ui, sans-serif', DISPLAY = '"Lilita One", "Poppins", system-ui, sans-serif';
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([document.fonts.load('400 40px "Lilita One"'), document.fonts.load('500 24px "Poppins"'), document.fonts.load('700 24px "Poppins"')]).catch(function () {});
  }
  function silImage(mood) {
    return new Promise(function (res) {
      var svg = SK.sil(mood, 300).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '), img = new Image();
      img.onload = function () { res(img); }; img.onerror = function () { res(null); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }
  function rr(x, px, py, w, hh, r) {
    x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + hh, r); x.arcTo(px + w, py + hh, px, py + hh, r);
    x.arcTo(px, py + hh, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath();
  }
  function blob(x, cx, cy, r, col) { var g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); }

  /* Draws the 1200x675 card. Resolves with the canvas. Colour is never the only signal: a tick or a cross sits in every square. */
  SK.quizCard = function (score, log) {
    var tier = SK.quizTier(score);
    return Promise.all([fontsReady(), silImage(score >= 7 ? 'yay' : score >= 4 ? 'hi' : 'think')]).then(function (r) {
      var sil = r[1], c = document.createElement('canvas'), x;
      c.width = W; c.height = H; x = c.getContext('2d');
      var g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#1D1B45'); g.addColorStop(1, '#2E2A72'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      blob(x, 1000, 150, 300, 'rgba(154,140,255,.30)'); blob(x, 90, 650, 320, 'rgba(55,214,180,.16)'); blob(x, 1130, 620, 190, 'rgba(255,203,69,.15)');
      x.textBaseline = 'alphabetic'; x.textAlign = 'left';

      /* label pill */
      var label = 'KASPA COVENANTS QUIZ';
      x.font = '700 24px ' + SANS; var lw = x.measureText(label).width + 44;
      x.fillStyle = '#37D6B4'; rr(x, 80, 64, lw, 50, 25); x.fill();
      x.fillStyle = '#1D1B45'; x.fillText(label, 102, 97);

      /* score */
      x.fillStyle = '#FFFFFF'; x.font = '400 236px ' + DISPLAY; x.fillText(String(score), 80, 342);
      var sw = x.measureText(String(score)).width;
      x.fillStyle = '#B6B2E8'; x.font = '400 118px ' + DISPLAY; x.fillText('/' + log.length, 80 + sw + 8, 342);

      /* tier */
      x.fillStyle = tier.color; x.font = '400 78px ' + DISPLAY; x.fillText(tier.name, 80, 438);
      x.fillStyle = '#C9C5F2'; x.font = '500 32px ' + SANS; x.fillText(tier.quip, 80, 490);

      /* one square per question, easiest first; a tick or a cross inside each */
      var s = 50, gap = 12, py = 528;
      log.forEach(function (ok, i) {
        var px = 80 + i * (s + gap);
        x.fillStyle = ok ? '#37D6B4' : '#FF7F90'; rr(x, px, py, s, s, 12); x.fill();
        x.strokeStyle = '#1D1B45'; x.lineWidth = 5; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath();
        if (ok) { x.moveTo(px + 13, py + 26); x.lineTo(px + 22, py + 35); x.lineTo(px + 38, py + 16); }
        else { x.moveTo(px + 16, py + 16); x.lineTo(px + 34, py + 34); x.moveTo(px + 34, py + 16); x.lineTo(px + 16, py + 34); }
        x.stroke();
      });

      /* Sil */
      if (sil) { x.save(); x.translate(985, 280); x.rotate(0.07); x.drawImage(sil, -170, -184, 340, 367); x.restore(); }

      /* footer */
      x.fillStyle = '#37D6B4'; x.font = '400 46px ' + DISPLAY; x.fillText('SillyKuest', 80, 640);
      x.fillStyle = '#FFFFFF'; x.font = '700 25px ' + SANS; x.textAlign = 'right';
      x.fillText(SK.shareUrl().replace(/^https?:\/\//, '').replace(/#.*$/, '').replace(/\/$/, ''), W - 80, 638);
      return c;
    });
  };

  /* ----------------------------------------------------------- sharing */
  function canShareFiles() {
    try {
      return !!(navigator.share && navigator.canShare && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] }));
    } catch (e) { return false; }
  }
  function fileName(score) { return 'sillykuest-covenants-quiz-' + score + '-of-10.png'; }
  function saveBlob(blob, score) {
    var url = URL.createObjectURL(blob), a = h('a', { href: url, download: fileName(score), hidden: true });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  }
  function postOnX(text) {
    window.open('https://x.com/intent/post?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer');
  }

  /* ----------------------------------------------------------- landing */
  var challenge = null; /* a friend's score from a shared link, kept for the result screen */
  S.quiz = function (param) {
    var root = h('div', { class: 'cq' }), st = SK.state.quiz;
    challenge = /^(\d|10)$/.test(param || '') ? +param : null;
    root.appendChild(h('div', { class: 'sh' }, h('h1', 'Covenants Quiz'), h('p', { class: 'sub' }, 'Ten questions on Kaspa covenants and Silverscript. About two minutes.')));
    if (challenge != null) {
      root.appendChild(h('div', { class: 'tip card cq-chal' }, h('span', { html: SK.icon('crown', 22) }),
        h('p', 'A friend scored ' + challenge + '/10 and earned the title ', h('strong', SK.quizTier(challenge).name), '. Can you beat it?')));
    }
    root.appendChild(h('div', { class: 'card cq-hero' },
      h('div', { class: 'cq-sil', html: SK.sil('think', 112) }),
      h('div', { class: 'cq-b' },
        h('ul', { class: 'cq-points' },
          h('li', 'Easy ones first, harder ones last.'),
          h('li', 'No timer, no account. A wrong answer tells you why.'),
          h('li', 'You get a score card to share, if you want to.')),
        h('a', { class: 'btn', href: '#/quiz/play' }, st.plays ? 'Play again' : 'Start the quiz'),
        st.plays ? h('p', { class: 'cap' }, 'Your best: ' + st.best + '/10 (' + SK.quizTier(st.best).name + ')') : null)));
    root.appendChild(h('p', { class: 'cq-fine' }, 'Your answers stay on this device. Sharing is your choice.'));
    return root;
  };

  /* ------------------------------------------------------------ result */
  /* o: { log: [bool], steps: [question], leave(hash) } */
  SK.quizResultView = function (o) {
    var log = o.log, n = log.length, score = log.filter(Boolean).length, tier = SK.quizTier(score), text = SK.quizShareText(score, log);
    var wrap = h('div', { class: 'cq-res' }), blobRef = null, busy = false;
    var mood = score >= 7 ? 'yay' : score >= 4 ? 'hi' : 'think';

    wrap.appendChild(h('div', { class: 'done-sil', html: SK.sil(mood, 112) }));
    wrap.appendChild(h('h1', 'You scored ' + score + '/' + n));
    wrap.appendChild(h('p', { class: 'done-sub' }, h('strong', tier.name), '. ' + tier.quip));
    if (challenge != null) {
      wrap.appendChild(h('p', { class: 'done-note strong' }, score > challenge ? 'You beat your friend’s ' + challenge + '/10.' : score === challenge ? 'You tied your friend’s ' + challenge + '/10.' : 'Your friend scored ' + challenge + '/10. Try again?'));
    }

    var wrongAt = []; log.forEach(function (ok, i) { if (!ok) wrongAt.push(i + 1); });
    var alt = 'Your result card: ' + score + ' out of ' + n + ', ' + tier.name + '. ' + (wrongAt.length ? 'Missed question' + (wrongAt.length > 1 ? 's ' : ' ') + wrongAt.join(', ') + '.' : 'Every question right.');
    var prev = h('div', { class: 'cq-card', role: 'img', 'aria-label': alt }, h('div', { class: 'cq-wait' }, 'Drawing your card…'));
    wrap.appendChild(prev);

    var bShare = h('button', { type: 'button', class: 'btn', disabled: true, hidden: !canShareFiles() }, 'Share');
    var bX = h('button', { type: 'button', class: 'btn' + (canShareFiles() ? ' alt' : ''), onclick: function () { postOnX(text); } }, 'Post on X');
    var bSave = h('button', { type: 'button', class: 'btn alt', disabled: true }, 'Save image');
    var bCopy = h('button', { type: 'button', class: 'btn alt', onclick: function () { SK.copy(text).then(function () { SK.toast('Text copied'); }, function () { SK.toast('Could not copy. Select the text by hand.'); }); } }, 'Copy text');
    var acts = h('div', { class: 'cq-acts' }, bShare, bX, bSave, bCopy);
    wrap.appendChild(acts);
    wrap.appendChild(h('p', { class: 'cq-fine' }, 'X cannot take an image from a link, so tap Save image and attach it to your post. The text works on its own too.'));

    bShare.addEventListener('click', function () {
      if (!blobRef || busy) return; busy = true;
      var file = new File([blobRef], fileName(score), { type: 'image/png' });
      navigator.share({ files: [file], text: text }).catch(function () { /* closed the sheet: nothing to do */ }).then(function () { busy = false; });
    });
    bSave.addEventListener('click', function () { if (blobRef) saveBlob(blobRef, score); });

    SK.quizCard(score, log).then(function (cv) {
      SK.clear(prev); prev.appendChild(cv);
      cv.toBlob(function (b) { if (!b) return; blobRef = b; bShare.disabled = false; bSave.disabled = false; }, 'image/png');
    });

    /* lessons behind the questions that were missed, once each, in the order asked */
    var seen = {}, miss = [];
    o.steps.forEach(function (s, i) { if (!log[i] && s.src && !seen[s.src] && SK.lesson(s.src)) { seen[s.src] = 1; miss.push(SK.lesson(s.src)); } });
    if (miss.length) {
      var list = h('ul', { class: 'cq-miss' });
      miss.slice(0, 4).forEach(function (l) { list.appendChild(h('li', h('b', SK.num(l)), ' ' + l.title)); });
      wrap.appendChild(h('div', { class: 'card cq-learn' }, h('h3', 'Worth a look'), h('p', { class: 'cap' }, 'The lessons behind the ones you missed:'), list));
    }

    var started = Object.keys(SK.state.done).length > 0;
    var go = h('button', { type: 'button', class: 'btn', onclick: function () {
      if (!started && !SK.state.level) { SK.state.level = SK.quizLevel(score); SK.save(); }
      o.leave(started || SK.state.level === 'builder' ? '#/learn' : '#/lesson/1-1');
    } }, started ? 'Back to the quest' : 'Start the quest');
    wrap.appendChild(h('div', { class: 'card cq-cta' },
      h('h3', started ? 'Keep climbing' : 'Learn it properly'),
      h('p', started ? 'Every lesson you finish makes the next quiz easier.' : 'SillyKuest is a free, game-like course: 34 short lessons, no account, works offline.'),
      go));
    wrap.appendChild(h('div', { class: 'done-actions' },
      h('button', { type: 'button', class: 'btn alt', onclick: function () { o.leave('#/quiz/play'); } }, 'Play again'),
      h('button', { type: 'button', class: 'btn alt', onclick: function () { o.leave('#/quiz'); } }, 'Back')));
    return wrap;
  };
})();
