# Changelog

Versions follow `SK.version` in `js/core.js`. The service worker cache name and `package.json` must match it (`node tests/repo.js` checks).

## 3.0.0 - 2026-10-19

First public release.

### Changed
- Removed the source badge on code blocks and every mention of the old source document from the app, data, code, tests and docs. Only code written for teaching keeps a "Teaching sketch" tag, because it has not been through the compiler.
- Sil smiles on the welcome screen and the first Up next card (the startled face read as scared).
- Today sheet and completion screen show bonus XP ("35 XP today, 5 bonus XP on top") instead of "35 of 30".
- You tab: the streak tile says "Day streak" and no longer wraps onto a stray "1)".
- The envelope flap no longer overlaps the amount label.
- Every Lab toy has its own icon.
- A boss fight ends as soon as a third slip makes it unwinnable.

### Added
- **Support sheet** with a one-tap copy of the donation name: a card on You, a pill in the Learn footer.
- Slip counter in boss fights (two pips, "Out of slips").
- "SillyKuest was updated. Reload" prompt when a new version installs.
- Notice on Learn when the browser blocks saving, pointing to the progress code.
- Boot screen with Sil while the app loads.
- Content Security Policy (scripts from the app only, no network). The theme bootstrap moved to `js/theme.js` so no inline script is needed.
- Screen reader announcements for answer feedback and copy; each question heading takes focus.
- Tests: `tests/repo.js` (repo hygiene), `tests/v3.js` (this release), `tests/offline.js` (service worker, really offline).
- GitHub files: LICENSE, THIRD_PARTY.md, CI and Pages workflows, CONTRIBUTING.md, docs/AUTHORING.md.

### Fixed
- A bad progress code could leave progress half overwritten in memory. Saved data and progress codes are now validated key by key, and a rejected code changes nothing.
- Copy said "copied" even when the browser refused. It now says so, with a fallback for browsers without the Clipboard API.
- Leaving a lesson halfway kept the place but not the slips, so stars and XP restarted from zero. They now carry over.
- The "You finished the quest" flag was saved one step late.
- The service worker answered failed script requests with the app shell. Only page loads get the shell now.
- Restore and Erase routed twice.
- Sheets return focus to the button that opened them and keep Tab inside.
- Dropped the deprecated `escape` and `unescape` calls from progress codes (codes stay compatible).

## 2.9.0

- **Vault Heist** (Practice): write the `require` rule from chips, then watch it run against honest and thief transactions. Six levels, free retries, hint after two runs. Badge: Vault keeper.

## 2.8.0

- **Vibe Check** (Practice): a confident "VibeBot" calls a real contract safe, one line is broken. Find it, then pick the repair. Ten challenges, seven bug classes.
- Bug-hunt lines wrap instead of scrolling sideways.

## 2.5.0 - 2.7.0

- "Sil's post office" look: tilted sticker cards, postage-stamp badges, rubber-stamp answer feedback, display font for titles, colored stat tiles, rank-aware Sil.
- Dark mode pass: light rims on paper surfaces, one soft world-colored glow behind lessons.

## 2.4.0

- Lessons resume where you left off. One-tap Up next card and a floating Continue pill. Quest map rewritten with folding worlds. Daily goal ring and Today sheet. Draggable bottom sheets. Poppins embedded.

## 2.0.0 - 2.3.0

- Six worlds, 33 lessons, nine question types, boss fights, review bank, daily five, Code workout, dictionary, opcode list, cheat sheet, twelve toys and nine annotated contracts. More writing, fewer picks: build, bug, slots and order tasks.
