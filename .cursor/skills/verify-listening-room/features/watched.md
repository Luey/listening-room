# Keep watched history

Mark a video so it stays out of the default browse view, review history, and undo a mark when needed.

## Sub-features

- `watched-mark` hides the marked video while **Hide watched** is checked.
- `watched-review` shows the same video in the library when requested and in the dedicated history after a reload.
- `watched-undo` restores a marked video to the unwatched library.

## How to get to it (user POV)

Use **Mark watched** on a card or in the video dialog. Uncheck **Hide watched** above the library or select the **Watched** count near the heading.

## Driving it with Playwright

Preconditions: Use a fresh context and a catalogue with at least one video.

Run `.cursor/skills/verify-listening-room/verify.mjs watched`. Mark the first video. The card disappears by default and returns when you uncheck **Hide watched**. Reload and open watched history. It contains the same video. Undo the mark, see empty history, reload, and verify the video is available to mark again. For the dialog entry, also run the `player` journey.

## Gotchas

Watched history belongs to the browser and origin used. A fresh context begins empty. Finishing a real embedded video is a separate playback path.
