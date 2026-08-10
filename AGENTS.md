# AGENTS.md · Token-lite rules

## Startup
Use runtime context; never reread included files.

**FAST (default)**
1. Read only `memory/RESUME.json`.
2. Check the latest `main` summary and the named PR/task status only.
3. Report at most 4 short lines, then act.

**DEEP** only when requested, checkpoint age >12h, named work changed/closed/failed/conflicted/unknown, target PR is not mergeable, latest `main` may touch the task scope, the new request may collide, or executor handoff is active. Order: GitHub main/active PR/current head/diff/CI → one relevant Notion control record → `TRACK_STATE.json` → `EXECUTOR_HANDOFF_STATE.json` → `SESSION_STATE.md` → `SYSTEM_DELTA.md`. Never fetch full dashboards when one page/property is enough.

Normal added resume context: ≤600 tokens. Do not load daily logs, long project memory, unrelated diffs, workflow logs, or full Notion pages without a DEEP trigger.

## Work
Truth: GitHub code/state → CI/Pages → Notion → checkpoint → long memory. Preserve existing work; use a separate branch; make the smallest safe change. Finish: verify → PR/CI → main → Pages/Live SHA → Notion/dashboard. User screen confirmation is required for UI-visible 100%.

## Deployment lanes
Default outside high-risk exceptions is automatic delivery after safety checks.

### Lane A — Korean original-language lexicon · Evidence-First Autonomous v4
For Strong/BDB translation, Evidence Packet, Korean candidate wording, audit/dispute bundles, Approval Registry promotion, approved-meaning changes, book/66-book rollout, or lexicon production release:
- `docs/lexicon-workflow/v4-EVIDENCE_FIRST_AUTONOMOUS.md` is the policy SSOT.
- Normal entries may auto-progress only when every required Evidence AND-gate, deterministic verifier, independent audit/review, regression protection, exact-head review, and unresolved=0 condition passes.
- Model majority vote is never authority. R3 requires 3-of-3 on the same pinned baseline. R4 routes to `EXTENDED_RESEARCH_REQUIRED`; it does not immediately ask the user for wording.
- Human exceptions are limited to unknown/prohibited licensing, existing approved meaning changes, unresolved evidence conflicts, theology policy, security/cost/permissions, or Golden Audit halt/regression.
- Never weaken or bypass v4 gates. New registry entry addition is not the same as mutating an existing approved entry.

### Lane B — ordinary maintenance · auto-deploy
For low-risk UI/UX, layout/style/responsive changes, ordinary bug fixes, and small feature changes that preserve existing data/schema/security contracts:
- Implement → PR → required CI/regression → merge → GitHub Pages → `verify:deploy`/Live SHA → relevant Notion sync automatically.
- Do not stop for a separate user `승인` command when all required checks pass.
- A lexicon PR may coexist with unrelated maintenance only when file scope/data contracts do not overlap and the lexicon dependent-PR rule is preserved.

Escalate either lane for destructive deletion, secrets/permissions/security, paid infrastructure, schema/migration, or material product decisions. If classification is ambiguous, fail closed.

## Executor handoff
For lexicon long-running work, conversation memory is never the recovery SSOT. Use:
- `bible-mindmap/data/lexicon/v4/executor-handoff-contract.json`
- `docs/lexicon-workflow/EXECUTOR_HANDOFF_STATE.json`

On usage limit, session end, tool unavailability, or planned executor switch:
1. Keep the same active branch/PR. Never create a duplicate PR for the same task.
2. If possible, checkpoint safe completed steps and set `EXECUTOR_HANDOFF_READY` before the executor disappears.
3. A resuming executor MUST re-resolve GitHub `main → active PR → current head → diff → required CI → TRACK_STATE → RESUME → handoff state`; chat memory is advisory only.
4. Skip `completedSteps`; resume at `nextStep`; never replay completed semantic/data transformations.
5. Preserve candidate/Evidence fingerprints and all v4 gates across executor changes.
6. Missing required Claude/Gemini/external audit is `EXTERNAL_AUDIT_REQUIRED`; another model must not impersonate/substitute it.
7. Retrieval failure, duplicate PR, diverged checkpoint head, or fingerprint drift fails closed.

Repository code can make handoff deterministic and detectable from checkpoint state, but cannot itself detect a vendor quota or invoke ChatGPT/OpenClaw without an external scheduler/agent trigger. Never claim otherwise.

## Memory
- `RESUME.json`: default checkpoint, <600 UTF-8 bytes; never store its own `main` SHA.
- `EXECUTOR_HANDOFF_STATE.json`: machine-readable executor/task checkpoint; its `headSHA` is the last verified head before the checkpoint commit, so every resume must query the current GitHub head again.
- `SESSION_STATE.md`: deep-only task detail, <1 KB.
- `SYSTEM_DELTA.md`: deep-only architecture/change reference.
- `MEMORY.md`: tiny index; no volatile status.
Update `RESUME.json` after task switch, deployment verdict, or blocker change.

## Lexicon track · mandatory shared check-in
The 66-book Korean original-language lexicon is one long-running track inside the wider Bible Mind Map project; it must not silently replace other project priorities.

For any lexicon translation, Strong, Evidence Packet, dictionary drawer, book usage layer, 66-book rollout, or lexicon automation task:
1. Read `memory/RESUME.json`.
2. Read `docs/lexicon-workflow/TRACK_STATE.json`, `docs/lexicon-workflow/v4-EVIDENCE_FIRST_AUTONOMOUS.md`, and `docs/lexicon-workflow/LLM_CHECKIN.md`.
3. If handoff is active, read `docs/lexicon-workflow/EXECUTOR_HANDOFF_STATE.json` and obey the handoff contract.
4. Check latest `main`, active lexicon PR/current head, required CI/Pages, and only the relevant Notion records.
5. Reconcile conflicts as GitHub code/schema/state → CI/Pages → Notion → chat history.
6. Keep one owner per file and one in-flight dependent implementation PR.

Default architecture: public/licensed sources → deterministic parsing → Evidence Packet → GPT candidate → verifier → Claude independent audit → Gemini R3/dispute review when required → Jarvis/GPT integration → v4 Evidence gates → independent GitHub review → auto-merge/deploy. No pre-approval production writes, verifier weakening, or model-majority shortcuts.

## Safety
Keep secrets/private data private. Ask before destructive, public-sensitive, paid, scheduler/config, or security-sensitive production actions. Preserve existing configuration. Never load private memory in shared chats.

Keep `HEARTBEAT.md` empty without a concrete periodic task. Avoid polling loops and repetitive status narration.
