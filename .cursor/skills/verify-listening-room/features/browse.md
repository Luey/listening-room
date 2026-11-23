# Browse the library

Find videos by level, creator, or title and keep browsing beyond the first page.

## Sub-features

- `browse-page` adds results using **Show more**.
- `browse-filters` combines level and source.
- `browse-search` finds a title, shows an empty state, and restores results when cleared.

## How to get to it (user POV)

On the homepage, use the level buttons, source dropdown, or **Search videos**. **Show more** sits below the video cards.

## Driving it with Playwright

Preconditions: The initial catalogue has at least 48 videos and includes beginner videos from VideoEle.

Run `.cursor/skills/verify-listening-room/verify.mjs browse`. **Show more** increases the visible list from 24 to 48. Choose **Beginner** and **VideoEle**. Confirm the total matches the catalogue and the visible cards belong to VideoEle and show A1 or A2. Search for a known title from those results, then an absent title. The expected title appears, the missing title shows an empty state, and clearing the search restores results.

## Gotchas

VideoEle shows the original A1/A2 labels on cards. The level filter groups both under Beginner. Use the bundled catalogue to choose a current title.
