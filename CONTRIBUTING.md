# Contributing

Thanks for helping people learn Kaspa. Small, careful changes are welcome.

## Set up

There is nothing to install to run or edit the app: open `index.html`, or run `python3 -m http.server 8080` and visit http://localhost:8080 (needed for the offline and install features).

```
npm test              # content, Vibe Check and repo checks (Node only)
npm run test:browser  # needs Playwright: npm install && npx playwright install chromium
```

## What a good change looks like

- **Accurate.** Silverscript, Argent and vprogs move fast. Do not teach a claim you cannot point to in the official repositories or specs. If code has not been through the compiler, say so (`badge: 'sketch'` shows a "Teaching sketch" tag).
- **Beginner first.** Concrete before abstract, plain words before the real term, no punishment for wrong answers. Read [docs/AUTHORING.md](docs/AUTHORING.md) for the lesson format and the rules the validator enforces.
- **Dependency free.** Classic scripts, no modules, no build step, no network calls. `tests/repo.js` fails on `fetch`, `eval` and external URLs in `js/`.
- **Phone first.** Check 360px wide in light and dark. Touch targets stay at least 44px.
- **Tested.** Run `npm test` before you push. If you change what a user sees, run the browser tests too.
- **Cache version.** If you change any shipped file, bump the version in `js/core.js`, `package.json` and `sw.js` together, and add a line to `CHANGELOG.md`.

## Reporting problems

Open an issue with the lesson or screen, what you expected and what happened. For a content error, include a link to the source that shows the right answer.

Please keep discussion kind and specific.
