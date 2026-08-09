# AGENTS.md · Token-lite rules

## Startup
Use runtime context; never reread included files.

**FAST (default)**
1. Read only `memory/RESUME.json`.
2. Check the latest `main` summary and the named PR/task status only.
3. Report at most 4 short lines, then act.

**DEEP** only when requested, checkpoint age >12h, named work changed/closed/failed/conflicted/unknown, target PR is not mergeable, latest `main` may touch the task scope, or the new request may collide. Order: local `git status` → GitHub main/target PR/CI/Pages → one relevant Notion record → `SESSION_STATE.md` → `SYSTEM_DELTA.md`. Never fetch full dashboards when one page/property is enough.

Normal added resume context: ≤600 tokens. Do not load daily logs, long project memory, diffs, workflow logs, or full Notion pages without a DEEP trigger.

## Work
Truth: local → GitHub/CI/Pages → Notion → checkpoint → long memory.
Preserve existing work; use a separate branch; make the smallest safe change.
Finish: verify → PR/CI → main → Pages/Live SHA → Notion/dashboard. User screen confirmation is required for 100%.

## Memory
- `RESUME.json`: default checkpoint, <600 UTF-8 bytes; never store its own `main` SHA.
- `SESSION_STATE.md`: deep-only task detail, <1 KB.
- `SYSTEM_DELTA.md`: deep-only architecture/change reference.
- `MEMORY.md`: tiny index; no volatile status.
Update `RESUME.json` after task switch, deployment verdict, or blocker change.

## Lexicon track · mandatory shared check-in
The 66-book Korean original-language lexicon is one long-running track inside the wider Bible Mind Map project; it must not silently replace other project priorities.

For any lexicon translation, Strong, Evidence Packet, dictionary drawer, book usage layer, or 66-book rollout task:
1. Read `docs/lexicon-workflow/TRACK_STATE.json`.
2. Read `docs/lexicon-workflow/LLM_CHECKIN.md` and only the relevant section of `MASTER_WORKFLOW.md`.
3. Check latest `main`, the active lexicon PR/CI/Pages, the Notion top dashboard, the 66-book lexicon dashboard, and the target book/batch card.
4. Reconcile conflicts as GitHub code/schema/state → CI/Pages → Notion → chat history.
5. Keep one owner per file and one in-flight implementation PR for dependent work.

Default architecture: public/licensed sources → deterministic parsing → Evidence Packet → GPT candidate → verifier → Claude audit → Gemini disputes only → Jarvis integration → human exception/approval Gate. Ollama A/B, Mac model preflight, full-corpus Gemini retranslation, model majority vote, and pre-approval production writes are not default paths.

Autonomous work may proceed through deterministic parsing, evidence/verifier/audit bundle generation, and GitHub-to-Notion status synchronization. Stop for unknown licenses, R3/R4 final wording, changes to approved meanings, unresolved conflicts, approval-registry promotion, production release, or live-screen confirmation.

## Safety
Keep secrets/private data private. Ask before destructive, public, paid, scheduler/config, or sensitive production actions. Preserve existing configuration. Never load private memory in shared chats.

Keep `HEARTBEAT.md` empty without a concrete periodic task. Avoid polling loops and repetitive status narration.
