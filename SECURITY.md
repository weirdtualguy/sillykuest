# Security

SillyKuest is a static app. It has no server, no account and no network calls: everything runs in the browser and progress stays in `localStorage`. That keeps the attack surface small, but problems are still possible.

## What to report

- A way to run script in the app (XSS), or to get around the Content Security Policy in `index.html`.
- A progress code that damages saved data, or that is accepted when it should be rejected.
- A service worker problem that could serve the wrong files.
- The donation address (`SK.DONATE`) being changed or shown differently from `README.md`.

Teaching mistakes (a wrong claim about Kaspa or Silverscript) are not security problems. Please open a normal issue for those, with a link to the source that shows the right answer.

## How to report

Use GitHub's private reporting: open the repository's **Security** tab and choose **Report a vulnerability**. Please do not open a public issue for a security problem. Say what you did, what you expected and what happened.

## Supported versions

Only the latest release gets fixes.
