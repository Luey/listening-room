# The Listening Room

GitHub `Luey/listening-room` is the source of truth. Use a checkout that has `dist/`, `AGENTS.md`, and `.cursor/skills/verify-listening-room/`. If they are missing, check the branch and checkout age before trying to create or maintain the skill. Preserve any uncommitted changes when updating an older checkout.

For app changes, run `npm test` first. It needs Node.js and no dependencies, browser, localhost server, or network. Follow the [verification guide](.cursor/skills/verify-listening-room/SKILL.md) for browser coverage. For this project, use `main` directly when the user authorizes publishing. GitHub Actions verifies changes on `main` before deploying them. If local browser launch or localhost is blocked, use that workflow for browser verification and wait for its result before calling the site published.

If Git writes fail with a permission error, request the narrow approval available in the session for the intended Git operation. If the session cannot grant it, preserve the changes and use an authorized checkout or ask the user to run the commit. A repository setting cannot grant access to `.git` or override session permissions.
