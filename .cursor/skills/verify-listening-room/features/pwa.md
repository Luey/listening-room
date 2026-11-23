# Use the app on a phone

Browse on a narrow screen, install to the home screen, and use the cached library when offline.

## Sub-features

- `pwa-mobile` fits two cards per row and opens Browse, Search, and Watched from the bottom bar.
- `pwa-assets` serves a standalone web app manifest, icons, and an active service worker.
- `pwa-offline` reloads the library and records watched state offline.
- `pwa-install` launches the app from a real phone's home screen.

## How to get to it (user POV)

Open the hosted app on a phone. Tap **Install app** or use the browser's install menu. After installation, launch from the new home screen icon.

## Driving it with Playwright

Preconditions: The local loopback server serves the production files. The physical check needs the deployed HTTPS URL and access to the private site.

Run `.cursor/skills/verify-listening-room/verify.mjs pwa`. Use an iPhone viewport, confirm two cards per row and no horizontal overflow, then open Filters, choose a difficulty, leave only VideoEle checked, select Shortest first, and verify the summary and results. Reset and confirm the default sort and all sources return. Switch between Search and Browse using the bottom bar. Confirm the service worker and manifest assets, then reload offline. Mark a cached video and confirm it appears when you tap Watched in the bottom bar.

On an iPhone use Safari's **Share → Add to Home Screen**. On Android use Chrome's **Install app** or **Add to Home screen**. Launch from the icon, confirm the library loads, mark a video, close and reopen, and check watched history. Record device, browser, the home screen entry, and the reopened history. Clear the test watched mark or use a disposable context where possible.

## Gotchas

Mobile emulation cannot prove installation or private-site sign-in on a phone. Offline browsing does not include YouTube playback or thumbnails that were never loaded.
