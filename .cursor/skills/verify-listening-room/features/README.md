# The Listening Room verification map

Use this index to choose the user journeys affected by a change. Run them against the current checkout before publishing.

## Baseline

Launch with the parent skill's `verify.mjs all` command. Each journey starts on the homepage with a disposable browser context, the bundled catalogue, and no watched history. Require the doctor and browser readiness checks before interacting.

## Features

| Feature | Command argument | What it covers |
| --- | --- | --- |
| [Browse the library](browse.md) | `browse` | Pagination, level, source, search, empty results |
| [Keep watched history](watched.md) | `watched` | Hide/show, reload persistence, review, undo |
| [Play a video](player.md) | `player` | Title and thumbnail entry, correct video link, marking from the dialog |
| [Use the app on a phone](pwa.md) | `pwa` | Mobile layout, install assets, offline library and watched history |

Run the manual phone or embedded playback paths when those boundaries change. Record the action and outcome separately from the automated results.
