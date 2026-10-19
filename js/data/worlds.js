/* Worlds, lesson registry, unlock rules, bosses and badges. */
(function () {
  var SK = (window.SK = window.SK || {});

  SK.worlds = [
    { id: 1, name: 'Envelope Town', tag: 'Kaspa basics, no code yet', color: '#37D6B4', icon: 'envelope',
      boss: { name: 'The Ledger Goblin', quip: 'Insists everything is an account balance.' }, badge: 'Postmaster' },
    { id: 2, name: 'Speak Silver', tag: 'Your first Silverscript', color: '#9A8CFF', icon: 'code',
      boss: { name: 'The Syntax Gremlin', quip: 'Swaps your >= for a <= when you blink.' }, badge: 'Silver Tongue' },
    { id: 3, name: 'First Covenants', tag: 'Contracts that remember', color: '#FFCB45', icon: 'shield',
      boss: { name: 'The Copycat Imp', quip: 'Swaps your code for a lookalike.' }, badge: 'Copycat Catcher' },
    { id: 4, name: 'Family Trees', tag: 'IDs, lineage and fan-outs', color: '#FF7F90', icon: 'tree',
      boss: { name: 'The Forger Fox', quip: 'Prints family badges at home.' }, badge: 'Family Historian' },
    { id: 5, name: 'Teamwork', tag: 'Contracts that cooperate', color: '#FFA05C', icon: 'link',
      boss: { name: 'The Tangle Troll', quip: 'Thinks covenants can call each other.' }, badge: 'Team Player' },
    { id: 6, name: 'Toccata Sky', tag: 'Proofs, lanes and based apps', color: '#55B9FF', icon: 'rocket',
      boss: { name: 'The Overengineer', quip: 'Uses a ZK proof to add two numbers.' }, badge: 'Sky Walker' }
  ];

  SK.lessons = [];
  SK.addLesson = function (l) {
    l.world = Number(String(l.id).split('-')[0]);
    SK.lessons.push(l);
  };
  SK.QUIZ = { mc: 1, tf: 1, fill: 1, order: 1, slots: 1, match: 1, bug: 1, sort: 1, build: 1 };
  SK.isQuiz = function (step) { return !!SK.QUIZ[step.t]; };

  SK.lesson = function (id) { for (var i = 0; i < SK.lessons.length; i++) if (SK.lessons[i].id === id) return SK.lessons[i]; return null; };
  SK.lessonsOf = function (w) { return SK.lessons.filter(function (l) { return l.world === w; }); };
  SK.world = function (w) { return SK.worlds[w - 1]; };

  SK.worldDone = function (w) { return SK.lessonsOf(w).every(function (l) { return SK.state.done[l.id]; }); };
  SK.worldOpen = function (w) {
    if (SK.state.set.openAll || w === 1) return true;
    /* progress made before a world grew new lessons keeps the next world open */
    if (SK.lessonsOf(w).some(function (l) { return SK.state.done[l.id]; })) return true;
    return SK.worldDone(w - 1) || !!SK.state.bosses[w - 1];
  };
  SK.unlocked = function (l) {
    if (SK.state.set.openAll) return true;
    if (!SK.worldOpen(l.world)) return false;
    var list = SK.lessonsOf(l.world), i = list.indexOf(l);
    return i === 0 || !!SK.state.done[list[i - 1].id];
  };
  SK.nextLesson = function () {
    for (var i = 0; i < SK.lessons.length; i++) {
      var l = SK.lessons[i];
      if (!SK.state.done[l.id] && SK.unlocked(l)) return l;
    }
    return null;
  };
  SK.after = function (l) {
    var i = SK.lessons.indexOf(l);
    for (var k = i + 1; k < SK.lessons.length; k++) if (SK.unlocked(SK.lessons[k]) && !SK.state.done[SK.lessons[k].id]) return SK.lessons[k];
    return null;
  };

  /* Quiz steps flagged b:1 form a world's boss fight. Keys are "lessonId:stepIndex". */
  SK.quizKey = function (l, i) { return l.id + ':' + i; };
  SK.stepByKey = function (key) {
    var p = key.split(':'), l = SK.lesson(p[0]);
    return l && l.steps[+p[1]] ? l.steps[+p[1]] : null;
  };
  SK.bossKeys = function (w) {
    var out = [];
    SK.lessonsOf(w).forEach(function (l) { l.steps.forEach(function (s, i) { if (s.b && SK.isQuiz(s)) out.push(SK.quizKey(l, i)); }); });
    return out;
  };
  SK.practicePool = function (onlyDone) {
    var out = [];
    SK.lessons.forEach(function (l) {
      if (onlyDone && !SK.state.done[l.id]) return;
      l.steps.forEach(function (s, i) { if (SK.isQuiz(s) && s.t !== 'match') out.push(SK.quizKey(l, i)); });
    });
    return out;
  };

  /* Code tasks: the questions where the learner writes or repairs code */
  SK.isCodeTask = function (s) { return s.t === 'build' || s.t === 'slots' || s.t === 'bug' || (s.t === 'fill' && !!s.code) || (s.t === 'order' && !!s.mono); };
  SK.codePool = function (onlyDone) {
    var out = [];
    SK.lessons.forEach(function (l) {
      if (onlyDone && !SK.state.done[l.id]) return;
      l.steps.forEach(function (s, i) { if (SK.isCodeTask(s)) out.push(SK.quizKey(l, i)); });
    });
    return out;
  };

  /* Badges */
  function anyDone(f) { var d = SK.state.done; for (var k in d) if (f(d[k])) return true; return false; }
  SK.badges = [
    { id: 'first', name: 'First flight', desc: 'Finish your first lesson.', icon: 'star', test: function () { return anyDone(function () { return true; }); } },
    { id: 'perfect', name: 'Spotless', desc: 'Earn three stars on a lesson.', icon: 'crown', test: function () { return anyDone(function (d) { return d.stars === 3; }); } },
    { id: 'streak3', name: 'On a roll', desc: 'Learn three days in a row.', icon: 'flame', test: function () { return SK.state.best >= 3; } },
    { id: 'bug5', name: 'Bug hunter', desc: 'Spot five bugs on the first try.', icon: 'bug', test: function () { return SK.state.stats.bug >= 5; } },
    { id: 'heist3', name: 'Vault keeper', desc: 'Stop every thief on three Vault Heist levels on the first run.', icon: 'lock', test: function () { return (SK.state.stats.heist || 0) >= 3; } },
    { id: 'build5', name: 'Code smith', desc: 'Write five lines of Silverscript correctly on the first try.', icon: 'code', test: function () { return (SK.state.stats.build || 0) >= 5; } },
    { id: 'boss1', name: 'Boss buster', desc: 'Beat your first boss.', icon: 'skull', test: function () { return Object.keys(SK.state.bosses).length > 0; } }
  ];
  SK.worlds.forEach(function (w) {
    SK.badges.push({ id: 'w' + w.id, name: w.badge, desc: 'Finish every lesson in ' + w.name + '.', icon: w.icon, world: w.id, test: function () { return SK.worldDone(w.id); } });
  });
  SK.badges.push({ id: 'all', name: 'Ghost Architect', desc: 'Finish every lesson in the quest.', icon: 'rocket', test: function () { return SK.lessons.every(function (l) { return SK.state.done[l.id]; }); } });

  SK.checkBadges = function () {
    var got = [];
    SK.badges.forEach(function (b) {
      if (!SK.state.badges[b.id] && b.test()) { SK.state.badges[b.id] = Date.now(); got.push(b); }
    });
    return got;
  };
})();
