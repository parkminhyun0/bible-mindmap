---
name: session-state
autoload: false
---

# Current task
Do not pin an active PR here. Resolve volatile work from GitHub Derived State first.

At the 2026-08-12 system-maintenance checkpoint there was no open PR before the maintenance branch was created.

## Deep resume
1. Read current `main`, open PRs, exact heads, required CI/review, Pages/Live state.
2. Read the one relevant Notion control record (`RUN_STATE` / `EXECUTOR`).
3. Read `TRACK_STATE.json` only for lexicon phase/governance facts.
4. Treat `RESUME.json` and this file as cache, never runtime authority.

## Safety
- Do not revive historical PR numbers merely because they appear in archived docs.
- Do not create a duplicate branch/PR for an already-active task.
- User screen confirmation is required before UI-visible work reaches 100%.
