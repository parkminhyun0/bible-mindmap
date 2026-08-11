# AGENTS.md · Token-lite rules

## Startup
Use runtime context; never reread included files.

**FAST (default)**
1. For lexicon work, derive volatile runtime truth from GitHub first: latest `main`, active lexicon PR/current exact head, required CI/review/deploy state. Use `bible-mindmap/scripts/derive-lexicon-runtime-state.mjs` when runtime credentials are available.
2. Read `memory/RESUME.json` only as a compact checkpoint/cache. If it conflicts with derived GitHub state, derived GitHub state wins and the cache must be reconciled in the active PR.
3. For non-lexicon work, read the named task/checkpoint and latest `main` summary only.
4. Report at most 4 short lines, then act.

**DEEP** only when requested, checkpoint age >12h, named work changed/closed/failed/conflicted/unknown, target PR is not mergeable, latest `main` may touch the task scope, the new request may collide, or executor handoff is active. Order: GitHub main/active PR/current head/diff/CI/review/deploy → one relevant Notion control record → `TRACK_STATE.json` → `RESUME.json` cache → `EXECUTOR_HANDOFF_STATE.json` → `SESSION_STATE.md` → `SYSTEM_DELTA.md`. Never fetch full dashboards when one page/property is enough.

Normal added resume context: ≤600 tokens. Do not load daily logs, long project memory, unrelated diffs, workflow logs, or full Notion pages without a DEEP trigger.

## Work
Truth: GitHub code/state → CI/Pages → Notion → checkpoint/cache → long memory. Preserve existing work; use a separate branch; make the smallest safe change. Finish: verify → PR/CI → main → Pages/Live SHA → Notion/dashboard. User screen confirmation is required for UI-visible 100%.

## Deployment lanes
Default outside high-risk exceptions is automatic delivery after safety checks.

### Lane A — Korean original-language lexicon · Evidence-First Autonomous v4
For Strong/BDB translation, Evidence Packet, Korean candidate wording, audit/dispute bundles, Approval Registry promotion, approved-meaning changes, book/66-book rollout, or lexicon production release:
- `docs/lexicon-workflow/v4-EVIDENCE_FIRST_AUTONOMOUS.md` is the policy SSOT.
- Normal entries may auto-progress only when every required Evidence AND-gate, deterministic verifier, independent audit/review, regression protection, exact-head review, and unresolved=0 condition passes.
- Model majority vote is never authority. R3 requires 3-of-3 on the same pinned baseline. R4 routes to `EXTENDED_RESEARCH_REQUIRED`; it does not immediately ask the user for wording.
- Mechanical review automation may verify exact-head identity, Evidence integrity, deterministic regression, CI, and deployment state. It must not convert R3/R4, theology-sensitive, unresolved-conflict, licensing, existing-approved-meaning mutation, security/cost/permission, or Golden-Audit halt cases into automatic approval.
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
3. A resuming executor MUST re-resolve GitHub `main → active PR → current head → diff → required CI/review/deploy → TRACK_STATE → RESUME cache → handoff state`; chat memory is advisory only.
4. Skip `completedSteps`; resume at `nextStep`; never replay completed semantic/data transformations.
5. Preserve candidate/Evidence fingerprints and all v4 gates across executor changes.
6. Missing required Claude/Gemini/external audit is `EXTERNAL_AUDIT_REQUIRED`; another model must not impersonate/substitute it.
7. Retrieval failure, duplicate PR, diverged checkpoint head, or fingerprint drift fails closed.

Repository code can make handoff deterministic and detectable from checkpoint state, but cannot itself detect a vendor quota or invoke ChatGPT/OpenClaw without an external scheduler/agent trigger. Never claim otherwise.

## Memory
- `RESUME.json`: compact checkpoint/cache, <600 UTF-8 bytes; never store its own `main` SHA. It is not volatile-runtime authority.
- `EXECUTOR_HANDOFF_STATE.json`: machine-readable executor/task checkpoint; its `headSHA` is the last verified head before the checkpoint commit, so every resume must query the current GitHub head again.
- `SESSION_STATE.md`: deep-only task detail, <1 KB.
- `SYSTEM_DELTA.md`: deep-only architecture/change reference.
- `MEMORY.md`: tiny index; no volatile status.
Update `RESUME.json` after task switch, deployment verdict, or blocker change, in the same active PR when possible.

## Lexicon track · mandatory shared check-in
The 66-book Korean original-language lexicon is one long-running track inside the wider Bible Mind Map project; it must not silently replace other project priorities.

For any lexicon translation, Strong, Evidence Packet, dictionary drawer, book usage layer, 66-book rollout, or lexicon automation task:
1. Derive current GitHub runtime state first (`main → active lexicon PR → exact head → required CI/review/deploy`).
2. Read `docs/lexicon-workflow/TRACK_STATE.json`, `docs/lexicon-workflow/v4-EVIDENCE_FIRST_AUTONOMOUS.md`, and `docs/lexicon-workflow/LLM_CHECKIN.md`.
3. Read `memory/RESUME.json` only as cache/checkpoint and reconcile it if stale.
4. If handoff is active, read `docs/lexicon-workflow/EXECUTOR_HANDOFF_STATE.json` and obey the handoff contract.
5. Read only the relevant Notion control record after GitHub truth is known.
6. Reconcile conflicts as GitHub code/schema/state → CI/Pages → Notion → checkpoint/cache → chat history.
7. Keep one owner per file and one in-flight dependent implementation PR. Research/Evidence preparation may occur off the promotion path, but only one dependent main-bound implementation/promotion PR is active at a time.
8. Reuse fingerprint-addressed Evidence/results when their pinned inputs are unchanged; after base movement, rerun only checks whose inputs or contracts changed. Never skip a required verifier merely because a cache exists.

Default architecture: public/licensed sources → deterministic parsing → Evidence Packet → GPT candidate → verifier → Claude independent audit → Gemini R3/dispute review when required → Jarvis/GPT integration → v4 Evidence gates → independent GitHub review → auto-merge/deploy. No pre-approval production writes, verifier weakening, or model-majority shortcuts.

## Review lease / heartbeat
- Required CI success starts the independent-review lease.
- A reviewer heartbeat means an explicit machine-readable in-progress signal tied to the same PR and exact head; a mere stale reviewer request is not a heartbeat.
- If no heartbeat or exact-head verdict is observed within the review SLA, the coordinator may re-request the primary reviewer and signal a configured independent fallback reviewer.
- If heartbeat is present, extend the lease instead of starting a competing reviewer, preventing race/dual-verdict conditions.
- R3/R4 or any human-exception class may receive mechanical review PASS evidence, but automation must not synthesize the final human exception approval.

## Safety
Keep secrets/private data private. Ask before destructive, public-sensitive, paid, scheduler/config, or security-sensitive production actions. Preserve existing configuration. Never load private memory in shared chats.

Keep `HEARTBEAT.md` empty without a concrete periodic task. Avoid polling loops and repetitive status narration.
