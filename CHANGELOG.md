# Changelog

Versions follow `SK.version` in `js/core.js`. The service worker cache name and `package.json` must match it (`node tests/repo.js` checks).

## 3.2.5 - 2026-10-21

- Changed: app icon ghost now has four legs, matching the in-app mascot.

## 3.2.4 - 2026-10-21

- Fixed: manifest display is now standalone (3.2.3 changed the test but not the manifest).

## 3.2.3 - 2026-10-21

- Changed: installed app uses standalone display so system bars stay put.

## 3.2.2 - 2026-10-21

- Fixed: restored fullscreen display mode (3.2.1 wrongly switched to standalone). Page background still matches the tab bar.

## 3.2.1 - 2026-10-21

- Fixed: gap below the tab bar. Page background now matches the tab bar, and the app installs as standalone instead of fullscreen.

## 3.2.0 - 2026-10-21

### Added
- **Full screen.** The installed app now opens in fullscreen display mode, so the tab bar reaches the bottom edge of the screen and the system bars are hidden (swipe from an edge to show them for a moment). Older installs pick this up when Chrome refreshes the app, or after a reinstall. In a normal browser tab a page cannot draw under the system bars, so the You tab has a new **Full screen** setting that uses the browser's fullscreen mode instead; a saved choice is applied on your first tap, because browsers only allow it after a tap. The setting is hidden where it cannot work (iPhone) or is not needed (installed app).

### Fixed
- The install suggestion no longer treats a browser tab that is in fullscreen as the installed app, and recognises the installed app in fullscreen and minimal-ui display modes as well as standalone.
- The "Install as an app" row in the You tab ran its hint into the title on one line; the hint now sits on its own line like the other settings.

## 3.1.3 - 2026-10-21

### Fixed
- **A light strip under the tab bar in the installed app (Android).** On phones where Chrome does not let the page draw under the system navigation bar, Android shows the manifest's `background_color` there. It was the light lavender, which looked like a gap under the dark theme. It is now the dark theme's background (`#1A1741`), so the dark theme is seamless and the light theme gets a dark navigation strip. Chrome updates the installed app by itself within about a day; uninstalling and reinstalling shows it at once. Phones that let the page draw edge to edge were already fine, and the tab bar already pads for the system inset.

## 3.1.2 - 2026-10-20

### Added
- **An install suggestion.** After the first finished lesson, the Learn screen offers to install the app, once, and "Not now" or "Got it" hides it for good. It adapts: where Chrome offers an install prompt it has an Install button; on iPhone it says to tap Share, then Add to Home Screen; on Android, where Chrome hides the prompt once the app is already installed, it says to open SillyKuest from the home screen or use the three-dot menu. It never shows inside the installed app. The You tab shows the same advice as an Install row. `tests/install.js` covers each case.

### Fixed
- The install button in the You tab appeared only if Chrome's install event arrived while the You tab was open. The Learn and You screens now both refresh when it arrives, and never while a lesson is playing.

## 3.1.1 - 2026-10-20

### Changed
- **Donations go to a raw Kaspa address** instead of a Kaspa name, in the Support sheet and the README. The sheet shows the full address in small monospaced text with a Copy button under it, and tells people to check the first and last few characters in their wallet. `npm test` now checks the address checksum, so a mistyped or cut-off address fails the build.
- **Question text uses the plain body font** (Poppins) instead of the display font, in lessons, boss fights, Vibe Check and Vault Heist.

## 3.1.0 - 2026-10-20

Gentler onboarding. World 1 now teaches one new idea per lesson, and a real term appears only after the player has done something with it.

### Changed
- **World 1 has seven lessons** (was six). Lesson 1.2 is split: *Envelopes with locks* teaches only the plain key lock (try it with and without the key), and *A lock that checks the spend* (1.3) introduces the covenant. Every later lesson moved up one number.
- **Terms are earned.** The envelope wording stays until the reveal stamp: "the lock on the new envelope" instead of "successor's lock", "looking at the spend" instead of "introspection". Each term in World 1 (Signature, Covenant, Introspection, P2SH and its redeem script, Covenant ID, Address, Sompi) now comes as plain words first, and `npm test` fails if a lesson uses one early. The lock toy in 1.3 says "Key lock + rule" until the covenant is named.
- **Easier first questions.** After a new idea in 1.2, 1.3, 1.6 and 1.7 the first question is a recognition pick. The five-card "who can check this" sort moved from the lesson that introduces covenants to the start of 1.4, as a look back with two Sil steps before it.
- **1.6 Reading an address** went from 15 steps to 11. The version byte table and the lock bytes table are now Pro corners, and the testnet paste and wrap-in-P2SH questions left the lesson.
- **1.7 Sompi, the smallest coin** is sompi alone. Mass and the DAA clock moved to a Pro corner at its end, and the mass and DAA questions are gone. Lesson 3-5 gets its own Pro corner on the three kinds of mass; 2-4 already teaches the DAA score.
- Reveals in the new lessons show the plain words and the stamp. The precise wording moved to a Pro corner where it helps (Introspection) or stays in the dictionary.
- Net size: 34 lessons and 163 questions (was 33 and 161). The mass, DAA clock, testnet paste and wrap-in-P2SH questions left the lesson path.

### Added
- **Key lock toy** (`keylock`) for lesson 1.2: try the envelope without the key, then with it, then send the coins anywhere. The lock never asks where they go. The `gate` toy gained `plain: true`.
- **Progress migration.** 3.0.0 saves and progress codes are migrated once: finished lessons move to their new ids (the split lesson counts for both halves, with the same stars), a saved place follows lessons whose steps kept their order, and Review keys follow their questions. Review keys for questions that no longer exist are dropped, and a saved place inside a reshaped lesson starts again.
- `tests/validate.js` fails if a World 1 lesson uses a term before its reveal. `tests/gentle.js` checks the new lessons, toys, Pro corners and the migration (every migrated Review key must still show the same question).

### Fixed
- A toy result that landed below the fold was invisible on 360 x 640 and 320 x 568 phones, so the lock toy looked dead. Results now scroll into view.
- A Pro corner on a Sil step sat beside the speech bubble on wide screens. It now sits under it.

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
