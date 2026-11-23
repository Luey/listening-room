# Browse the library

Find videos by level, creator, or title, sort the results, and keep browsing beyond the first page.

## Sub-features

- `browse-page` adds results using **Show more**.
- `browse-filters` combines multiple difficulty buttons and source checkboxes.
- `browse-sort` orders the filtered videos by title, duration, or difficulty.
- `browse-search` finds a title, shows an empty state, and restores results when cleared.

## How to get to it (user POV)

On the homepage, use the difficulty buttons, source checkboxes, **Sort by**, or **Search videos**. On a phone, open **Filters** to find the difficulty, source, and sort controls. **Show more** sits below the video cards.

## Driving it with Playwright

Preconditions: The initial catalogue has at least 48 videos and includes beginner videos from VideoEle.

Run `.cursor/skills/verify-listening-room/verify.mjs browse`. **Show more** increases the visible list from 24 to 48. Toggle **Beginner** and **Advanced** together, then toggle Advanced off and uncheck all sources except **VideoEle**. Confirm the total matches the catalogue and the visible cards belong to VideoEle and show A1 or A2. Choose **Shortest first** and confirm the shortest matching video comes first. Return to **Catalog order**. Search for a known title from those results, then an absent title. The expected title appears, the missing title shows an empty state, and clearing the search restores results.

## Gotchas

VideoEle shows the original A1/A2 labels on cards. The level filter groups both under Beginner. Use the bundled catalogue to choose a current title.
