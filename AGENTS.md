# AGENTS.md · Token-lite workspace rules

## Startup
Use runtime-provided context; never reread files already included.

Default **FAST resume**:
1. Read only `memory/RESUME.json`.
2. Check only current `main` SHA and the target PR/status named there.
3. Start the next safe action. Startup report: max 4 short lines.

Do **DEEP sync** only when one trigger is true:
- user requests latest/full synchronization;
- checkpoint is older than 12 hours;
- current `main` differs from `main_seen`;
- target PR/task changed, closed, failed, conflicted, or is unknown;
- requested work may collide with another active change.

DEEP order: local `git status` → GitHub main/target PR/CI/Pages → relevant Notion record → `memory/SESSION_STATE.md` → `memory/SYSTEM_DELTA.md`. Never fetch full Notion dashboards when one task/page or property is enough.

Resume budget: extra startup context should normally stay under **600 tokens**. Do not load daily logs, long-term project files, PR diffs, workflow logs, or full Notion pages unless required by a trigger.

## Truth and work
Truth order: local changes → GitHub/CI/Pages → Notion → checkpoint → long-term memory.
Preserve existing work; use a separate branch; make the smallest safe change.
Standard finish: verify → PR/CI → main → Pages/Live SHA → Notion/dashboard. User-visible confirmation is required for 100%.

## Memory
- `memory/RESUME.json`: machine checkpoint; keep under 600 UTF-8 bytes.
- `memory/SESSION_STATE.md`: human task detail; deep-load only; keep under 1 KB.
- `memory/SYSTEM_DELTA.md`: architecture/change reference; deep-load only.
- `MEMORY.md`: tiny index only; no volatile SHA, counts, or active-PR history.
Update the checkpoint after task switch, merge, deployment verdict, or blocker change.

## Safety
Never expose secrets or private data. Ask before destructive actions, public communications, paid services, scheduler/config changes, or sensitive production changes. Preserve/merge existing configuration by default. In shared/group contexts, do not load private memory.

## Heartbeat
Keep `HEARTBEAT.md` empty unless a concrete periodic task exists. Avoid polling loops and repetitive status narration.
