# Memory index

Default startup: runtime context + `memory/RESUME.json` only.
Deep-load `memory/SESSION_STATE.md` or `memory/SYSTEM_DELTA.md` only when an `AGENTS.md` trigger is true.
Long-term references are opened only for the current task; volatile status never lives here.
