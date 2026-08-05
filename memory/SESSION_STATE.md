---
name: session-state
autoload: false
---

# Current task
PR #169: fix Hebrews observation-card A6 audit counts.

## Next
1. `chapterCardCount`: 1154 → 1153
2. `chapterCardMarkerChecked`: 2448 → 2445
3. Run verifier, build, browser smoke.
4. Merge, verify Pages/Live SHA, update Notion.

## Known gates
- PR #156: preview structure requires user approval.
- PR #168: duplicate cleanup candidate.
- PR #119: stale/conflict review required.

Use `memory/RESUME.json` for normal startup. Load this file only for deep sync.
