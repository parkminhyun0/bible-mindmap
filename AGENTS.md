# AGENTS.md · Token-lite rules

## Startup
Use runtime context; never reread included files.

**FAST (default)**
1. Read only `memory/RESUME.json`.
2. Check current `main` SHA and the named PR/task status only.
3. Report at most 4 short lines, then act.

**DEEP** only when requested, checkpoint age >12h, `main` changed, named work changed/closed/failed/conflicted/unknown, or the new request may collide. Order: local `git status` → GitHub main/target PR/CI/Pages → one relevant Notion record → `SESSION_STATE.md` → `SYSTEM_DELTA.md`. Never fetch full dashboards when one page/property is enough.

Normal added resume context: ≤600 tokens. Do not load daily logs, long project memory, diffs, workflow logs, or full Notion pages without a DEEP trigger.

## Work
Truth: local → GitHub/CI/Pages → Notion → checkpoint → long memory.
Preserve existing work; use a separate branch; make the smallest safe change.
Finish: verify → PR/CI → main → Pages/Live SHA → Notion/dashboard. User screen confirmation is required for 100%.

## Memory
- `RESUME.json`: default checkpoint, <600 UTF-8 bytes.
- `SESSION_STATE.md`: deep-only task detail, <1 KB.
- `SYSTEM_DELTA.md`: deep-only architecture/change reference.
- `MEMORY.md`: tiny index; no volatile status.
Update `RESUME.json` after task switch, merge, deployment verdict, or blocker change.

## Safety
Keep secrets/private data private. Ask before destructive, public, paid, scheduler/config, or sensitive production actions. Preserve existing configuration. Never load private memory in shared chats.

Keep `HEARTBEAT.md` empty without a concrete periodic task. Avoid polling loops and repetitive status narration.
