# Play a video

Open an individual video, use its YouTube link if needed, and record completion.

## Sub-features

- `player-open` opens the right video from both its title and thumbnail.
- `player-link` exposes the matching YouTube watch URL.
- `player-mark` manually records progress from the dialog.
- `player-finish` marks a video when the live embedded playback ends.

## How to get to it (user POV)

Click a video title or thumbnail. The dialog shows the player, **Watch on YouTube**, **Mark watched**, and **Close**.

## Driving it with Playwright

Preconditions: The public catalogue contains at least one video. Live completion additionally requires a currently embeddable video and working YouTube access.

Run `.cursor/skills/verify-listening-room/verify.mjs player`. Verify the title opens the correct dialog, the iframe sends the app origin to YouTube even when the page has a no-referrer policy, and the YouTube link resolves to its video ID. Close it. Open the same dialog via its thumbnail, mark the video manually, close with Escape, and see that the default library hides it.

For the live boundary, use an unwatched short video in a disposable browser session. Play it in the embedded player and let it finish without using **Mark watched**. Capture the watched state in the dialog, then close, reload, and confirm that video appears in **Watched**. Open **Watch on YouTube** for a separate video and confirm it opens the expected page. If YouTube blocks playback, note the actual error and report completion as unverified.

## Gotchas

The automated journey checks the dialog and the external URL without depending on a live YouTube response. Watching in another tab needs manual marking. Never inject an end event to claim live playback works.
