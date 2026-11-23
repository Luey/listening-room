---
name: verify-listening-room
description: Verify The Listening Room's browser and installable web app behavior after changes to browsing, watched history, playback, or the PWA shell.
---

# Verify The Listening Room

Run the browser checks against the current checkout. Follow [the feature map](features/README.md) for the affected user paths and for checks that need a real phone or YouTube.

## Launch

From the project root, with Node.js and npm available, install the pinned Playwright dependency and its matching Chromium once per checkout or dependency update:

```sh
npm ci --prefix .cursor/skills/verify-listening-room
.cursor/skills/verify-listening-room/node_modules/.bin/playwright install chromium
```

Run the whole suite:

```sh
.cursor/skills/verify-listening-room/verify.mjs all
```

The runner serves the real `dist/` on a free loopback port. It uses the bundled catalogue, starts with empty browser storage, and needs no build, database, credentials, or production session. The doctor must pass and the browser must show video cards before a journey starts. The runner closes its own browser and server on completion and on caught failures. If interrupted, terminate only the command or session you started.

If a managed macOS shell denies Chromium's Mach port registration, run this same command through the available permission flow for browser launch. Do not use the user's existing Chrome profile. If browser launch is unavailable, report that limitation and retain the doctor result.

## Doctor

The runner performs one read-only preflight for each run. It compares the HTML and catalogue served by its own listener with the exact files in this checkout, checks for the expected page title and enough distinct video IDs to page through the catalogue, and prints `Doctor ready` with the URL and count. A failure stops the run before driving Chromium. The browser readiness check then waits for the first real card.

## Drive

Use Playwright through `verify.mjs`. Each journey opens a fresh browser context. Use the roles and accessible names listed in the feature map when adding coverage. Run `all` after common app changes or the named journey while iterating on a focused fix. Report failures, missing preconditions, and any manual coverage still pending separately.

## Evidence

Keep `verification-evidence/<run-id>/run.txt`, screenshots, and ARIA snapshots. The log names each journey, records the actions and observed outcomes, and reports failures. For watched changes, assert the library and history after a reload. This exercises persistence without editing browser storage or injecting player events. When testing a live boundary manually, record the URL, browser/device, user action, resulting state, and any upstream error. Never claim phone installation or video completion from a local shell or player-dialog check alone.

## Cleanup

The runner closes its disposable browser contexts, Chromium process, and loopback listener in order. Runs can overlap because they use separate ports and browser contexts. Inspect the printed evidence directory after exit. Preserve it even if a journey fails. Keep generated evidence and installed dependencies out of Git.

## Helpers

The executable `verify.mjs` accepts `all`, `browse`, `watched`, `player`, or `pwa`. For example:

```sh
.cursor/skills/verify-listening-room/verify.mjs watched
```

Exit code zero means the selected automated journeys passed. A failure returns a nonzero exit code and leaves diagnostics in the run folder.
