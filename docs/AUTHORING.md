# Authoring guide

How the curriculum is built, how to add a lesson, and what the checks enforce.

## Layout

```
index.html                 entry point, loads classic scripts in order (no modules, no fetch)
sw.js, manifest.webmanifest, assets/   offline, install, icons
css/                       fonts (embedded) | base (tokens, envelope art, sheets) | shell (screens) | lesson (player, quizzes) | widgets | refine (latest layer)
js/theme.js                sets the theme before first paint
js/core.js                 DOM helper, text formatter, progress store, sound, icons, mascot, identicons, envelopes
js/data/                   glossary, examples (annotated contracts), reference (opcodes, cheat sheet), worlds (unlock rules, badges)
js/lessons/w1..w6.js       the curriculum
js/ui/                     quiz.js (question types) | steps.js (teaching steps, code reader) | widgets.js (toys) | player.js | screens.js | vibe.js | heist.js
js/app.js                  shell and hash router
tests/                     validate, vibe, repo (Node only) | browser, qtypes, ux, heist, v3, gentle, offline (Playwright)
```

Two practice modes have their own data:

- `js/ui/heist.js` is Vault Heist (`#/heist`). The learner builds `require` lines from chips and the rule is really evaluated against thief and honest transactions (`SK.heist.eval`). Levels are rows in `C`; every solution line must come from a contract in `js/data/examples.js`.
- `js/ui/vibe.js` is Vibe Check (`#/vibe`). Rows are `[example id, first line, last line, broken line, broken text, wrong repairs, why, claim]`. The right repair is read from `SK.examples`, so it cannot drift from the contract. `node tests/vibe.js` checks every row.

## Writing a lesson

Lessons live in `js/lessons/`. Each is an object with a list of steps:

```js
SK.addLesson({
  id: '2-6', title: 'My lesson', min: 5, blurb: 'One line for the lesson card.',
  steps: [
    { t: 'say', m: 'hi', x: 'Sil talks. **bold**, `code` and [[utxo|tappable terms]] work.' },
    { t: 'reveal', id: 'utxo', term: 'UTXO', plain: 'The plain-words version.', x: 'Why it matters.' },
    { t: 'code', ex: 'p2pk', x: 'Intro text' },
    { t: 'widget', w: 'gate', gate: true, x: 'Instruction' },     // gate: true = must interact to continue
    { t: 'mc', b: 1, q: 'Question?', opts: ['A', 'B', 'C'], a: 1, why: 'Shown after answering.' }
  ]
});
```

| Teaching step | Fields |
| --- | --- |
| `say` | `m` mood (hi, think, yay, wow, oops, calm), `x` |
| `reveal` | `id` (glossary), `term`, `plain`, `x` |
| `compare` | `a: {h, items[]}`, `b: {h, items[]}` |
| `explore` | `items: [{icon, h, x}]` tap-to-open cards |
| `table` | `cols`, `rows`, `code` |
| `code` | `ex` (id from `data/examples.js`) or `title`, `badge`, `lines: [[code, plain, pro?]]` |
| `widget` | `w` (name in `ui/widgets.js`), `gate`, plus widget options (`gate` takes `plain: true` to keep the word covenant off the screen) |

Any teaching step can add `pro: {h, x}` for a collapsible Pro corner. On a `say` step the corner sits under the speech bubble.

| Question step | Fields |
| --- | --- |
| `mc` | `opts` (3-4), `a` index |
| `tf` | `a` true or false |
| `fill` | `text` with `___` blanks, `chips`, `a[]`, `code` |
| `order` | `items` in the correct order, `mono`, optional `extra[]` decoy pieces that belong nowhere |
| `slots` | `slots[]` (rules in words), `pieces[]`, `a[]` (piece index per slot), `mono` |
| `build` | write one line from pieces: `tokens[]` (with decoys), `a` (one accepted sequence or a list of them), optional `before[]` / `after[]` context lines, `src` (the contract it comes from), or `sketch: true` for a line that is not in a contract |
| `match` | `pairs: [[left, right]]` (3-5) |
| `bug` | `lines[]`, `bug` index, optional `fix: {opts[], a}` adds a second stage: pick the line that repairs it |
| `sort` | `buckets[]`, `items: [{t, b, why}]` |

Every question needs `q` and `why`. Add `b: 1` to include it in the world's **boss fight**.

## Code blocks and honesty

`js/data/examples.js` holds annotated contracts. Each has a `badge`:

- `docs`: a standard contract. No tag is shown. The validator checks that every line a learner must write appears in one of these.
- `sketch`: written for teaching from syntax shown elsewhere. The learner sees a **Teaching sketch** tag, because it has not been through the compiler.

None of the Silverscript on screen has been run through the compiler here. Say so wherever it matters, and never claim a snippet is official.

## World 1 is gentle by design

World 1 is "no code yet" and the first thing a non-technical player meets, so it has its own rules:

- **One new idea per lesson.** If a lesson needs two ideas, make two lessons. Detail that only some players want goes in a Pro corner.
- **A real term appears only at its reveal stamp.** Until then use the envelope words ("the lock on the new envelope", "looking at the spend"). `node tests/validate.js` fails when a `reveal` in World 1 names a term (UTXO, Signature, Covenant, ...) that an earlier step uses outside a Pro corner. Titles and blurbs are exempt. Toys are code, so keep their text plain by hand: `gate` has `plain: true`, and `keylock` never says covenant.
- **After a new idea, the first question is a recognition pick** (`mc` or `tf` with an obviously wrong option). Discrimination tasks (`sort`, `build`, `order`) come later, or at the start of the next lesson as a look back with two Sil steps before it. `tests/gentle.js` checks the shape of the lessons that follow this rule.
- **Check on a 360 x 640 phone.** A toy result must be visible after a tap (`res()` in `widgets.js` scrolls it into view).

## Checks

After editing run `node tests/validate.js`. It checks every step shape, answer index, glossary link and widget name. For `build`, `bug` + `fix`, `slots` and `order` it also checks that every line a learner must write appears in a `docs` contract in `js/data/examples.js` (use `src: 'timeout'` to name the contract, or `sketch: true` to opt out on purpose). Pieces are joined with the same spacing rule as `SK.joinTokens` in `quiz.js`.

**Inserting a step into an existing lesson** moves the saved Review keys (`lesson:stepIndex`) of every later step. Add an entry `{ lesson, at, by }` to `SK.KEYSHIFTS` in `js/core.js` (at the end of the list, never reorder it) and saved progress and progress codes are migrated once, on load. Appending steps at the end needs nothing.

**Renumbering, splitting or reshaping lessons** touches everything saved under a lesson id: `done`, `resume`, `rs` and the Review keys (`bosses` are per world and stay). Add a `{ remap }` entry instead. 3.1.0 did this for World 1 (`W1_31` in `js/core.js`) and is the example to copy: `done` says which new ids an old id now covers (a split lesson counts for both halves), `moved` lists lessons whose steps kept their order (their saved place and Review keys follow, shifted by an offset), and `keys` maps the Review keys of reshaped lessons one by one. A key that is not listed lost its question and is dropped; a saved place inside a reshaped lesson is dropped too, so that lesson starts again. Then update `MAP` in `tests/gentle.js`, which proves every migrated key still shows the same question text.

**Code tasks.** Each world from 2 to 5 ends with a Workshop lesson (2-6, 3-7, 4-5, 5-5) where the learner writes and repairs code instead of picking answers. The **Code workout** in Practice (`#/code`) drills those tasks from finished lessons.

## QA tools

- `index.html?qa=1` adds a **QA solve** button in the player that answers the current step correctly.
- `node tests/validate.js` validates all content (Node only), enforces the World 1 term rule and prints the share of pick-the-answer questions.
- `node tests/vibe.js` checks every Vibe Check row. `node tests/repo.js` checks the offline file list, versions, banned strings and repo files.
- Playwright tests (`NODE_PATH=$(npm root -g) node tests/<name>.js`, or `npm install` first): `browser.js` plays every lesson, boss and practice mode at 360px and fails on any JavaScript error or horizontal overflow; `qtypes.js` answers code question types wrongly on purpose and checks progress rules and key migration; `ux.js` checks resume, folding, scroll memory, sheets and overflow at 320/360/412px; `heist.js`; `v3.js` (support sheet, saved-data safety, boss slips, resume stats, focus); `gentle.js` (the gentler World 1, the key lock toy, Pro corners, and the move of 3.0.0 progress to the new lesson ids; `--shots dir` saves screenshots in both themes); `offline.js` (service worker with the server stopped).

## Settings worth knowing

In **You**: sound, animations, theme, **Open every lesson** (skip the order), and a **progress code** to move progress between devices. Progress is stored in `localStorage` only, and a rejected progress code changes nothing.

## Fonts

Poppins (500, 700) and Lilita One (400), Latin subsets under the SIL OFL 1.1, are embedded in `css/fonts.css`, so the app needs no downloads and works from `file://`. Credits and the license text are in [THIRD_PARTY.md](../THIRD_PARTY.md). To swap a face, replace its `@font-face` rule and change the first name in `--f` (`css/base.css`) or `--disp` (`css/refine.css`).

## Keeping it accurate

Silverscript, Argent and vprogs APIs move. Before a release, re-read the lessons, sketches and contracts against the current official repositories, fix what changed, and note it in `CHANGELOG.md`.

## Releasing

1. Bump the version in `js/core.js`, `package.json` and `sw.js` (`node tests/repo.js` checks they agree).
2. Add a `CHANGELOG.md` entry.
3. `npm test` and `npm run test:browser`.
4. Push to `main`. The Pages workflow runs the Node checks first and publishes the app only if they pass.

First time only: in the repository, *Settings, Pages, Source: GitHub Actions*.
