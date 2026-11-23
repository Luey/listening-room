# The Listening Room

[Open the live app](https://luey.github.io/listening-room/)

Browse Spanish videos by level or source and mark finished videos as watched. The app stores watched history in the browser and plays videos through YouTube.

## Run locally

Serve the app from the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

Open [localhost:8000](http://localhost:8000/). There is no separate build step. The HTML, CSS, JavaScript, manifest, icons, and bundled catalogue in `dist/` are the app source.

## Check a change

Install Node.js and run these commands from the repository root:

```sh
npm ci --prefix .cursor/skills/verify-listening-room
.cursor/skills/verify-listening-room/node_modules/.bin/playwright install chromium
.cursor/skills/verify-listening-room/verify.mjs all
```

See the [verification guide](.cursor/skills/verify-listening-room/SKILL.md) for individual journeys and manual phone and playback checks. Evidence stays local under `verification-evidence/`.

## Refresh the catalogue

With Python 3 and `yt-dlp` installed, run `python3 scripts/refresh_catalogue.py`. It reads the public playlists listed in the script, keeps each video ID once, and replaces `dist/catalog.json` after every playlist succeeds. Review the catalogue diff and run the browser checks before committing an update.

## Publish

GitHub Actions runs the browser checks on pull requests and pushes to `main`. A successful run on `main` publishes `dist/` to the existing GitHub Pages address.
