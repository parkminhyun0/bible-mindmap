# AGENTS.md · Token-lite rules

## Startup
Use runtime context; never reread unrelated files.

1. Derive volatile truth from GitHub first: latest `main`, active PR/exact head, required CI/review/deploy.
2. For lexicon work read `docs/lexicon-workflow/LICENSE_SAFE_FULL_FIDELITY_66BOOKS.md` as the sole semantic-quality policy SSOT, then `TRACK_STATE.json`, `LLM_CHECKIN.md`, and only the relevant Notion control record.
3. `memory/RESUME.json` is checkpoint/cache only; GitHub-derived state wins on conflict.
4. Deep history is loaded only when a named task changed, failed, conflicted, or executor handoff is active.

Truth order: `GitHub code/state → CI/Pages → active policy SSOT → Notion → checkpoint/cache → chat`.

## Work
Preserve existing work; use a separate branch; make the smallest safe change. Finish: verify → PR/CI → main → Pages/Live SHA → Notion. User screen confirmation is required for UI-visible 100%.

## Lexicon quality · mandatory
The 66-book Korean original-language lexicon uses one common quality contract: `docs/lexicon-workflow/LICENSE_SAFE_FULL_FIDELITY_66BOOKS.md`.

- C0 Rights/License PASS precedes source use.
- Every Strong preserves all source sense/subsense, structure, qualifier, usage restriction, identity/homograph, morphology, and provenance actually present in its Rights-PASS pinned source.
- `sourceUnitCount = koMappedUnitCount`; missing, improperly merged, unsupported, structure/qualifier/identity/morphology/provenance/corpus mismatch, theological overreach, and material unresolved must all be zero for PASS.
- H776 is the Golden Reference for information preservation/presentation, not a node-count template.
- GPT, 자비스, Claude, Gemini are the only semantic AI roles. All four use the same pinned baseline and submit independently. No fifth LLM, local model, or ad-hoc tie-breaker.
- Model majority is never authority. Evidence authority is original text/identity → context/morphology/usage → Rights-PASS lexical source → Rights-PASS public theological/lexical reference → AI analysis.
- All R0–R4 share the same Full-Fidelity baseline. Tier only adds research depth: R3 adds public theological/lexical Evidence; R4 adds extended public lexical/scholarly/biblical-usage research.
- R4 is not routed to per-Strong user wording selection. If extended Evidence resolves the issue, GPT performs final public-evidence adjudication; otherwise HOLD/DISPUTE.
- Normal Strong meanings are not individually sent to the user for semantic selection.
- Book lanes keep separate source packets/branches/PRs. Genesis and Luke content must not be mixed even though quality gates are identical.

## Deployment lanes
### Lane A — lexicon approved-data protected
Approval Registry, approved meanings, Golden/Gold Set data/contracts, policy SSOT, Tier matrix, governance-exception contract, approval schemas, and protected promotion logic require `lexicon-human-approval`: exact head, required CI, non-author reviewer with write/maintain/admin permission, unresolved required review 0. This repository approval is governance, not a second semantic translation step.

### Lane B — ordinary maintenance
UI/UX, ordinary bug fixes, search, bridge UI, and non-protected research/Evidence changes may use `ordinary-auto` after required checks. Do not request the lexicon review account merely for ordinary maintenance.

### Lane C — system trust boundary
`.github/workflows/**`, delivery-lane classifier, workflow-security verifier, `AGENTS.md`, scheduler/configuration and comparable self-governing controls are `system-manual`: never auto-merge; merge only after explicit maintainer authorization and required CI/security checks. If the same PR touches protected lexicon data, Lane A takes precedence.

`bible-mindmap/scripts/lib/delivery-lane-policy.mjs` is the lane-classification SSOT. `.github/workflows/delivery-lane-gate.yml` publishes the exact-head status. `.github/workflows/ordinary-auto-merge.yml` may merge only ordinary-auto.

## Executor handoff
For long-running lexicon work, conversation memory is never recovery SSOT.
1. Keep the same active branch/PR; do not duplicate.
2. Resume by resolving GitHub `main → active PR → current head → diff → CI/review/deploy → active Full-Fidelity policy → TRACK_STATE → RESUME cache`.
3. Reuse Evidence only when pinned inputs/fingerprints are unchanged.
4. A missing required GPT/Jarvis/Claude/Gemini result stays pending; another actor must not impersonate it.
5. Retrieval failure, duplicate PR, diverged checkpoint, fingerprint drift, missing required Evidence, or verifier failure is fail-closed.

## Memory
- `RESUME.json`: compact checkpoint/cache.
- `EXECUTOR_HANDOFF_STATE.json`: executor/task checkpoint.
- `SESSION_STATE.md` and `SYSTEM_DELTA.md`: deep-only context.
- No volatile status should be trusted over current GitHub state.

## Safety
Preserve existing data and configuration. Do not weaken verifiers or bypass protected review. Destructive or trust-boundary changes require explicit authorization. Keep private data private.
