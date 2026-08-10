# Executor-neutral Failover · Jarvis ↔ GPT

## Goal
Long lexicon work must survive usage limits, session ends, and tool outages without restarting the task, duplicating a PR, or weakening Evidence gates.

## Recovery SSOT
`main → active PR → current head → diff → required CI → TRACK_STATE → RESUME → EXECUTOR_HANDOFF_STATE`.
Conversation history is never sufficient recovery evidence.

## Checkpoint model
`EXECUTOR_HANDOFF_STATE.json` stores phase, completed steps, next step/action, base SHA, last-verified head SHA, candidate fingerprint, active PR/branch, executor, external-audit state, and handoff reason.

The state file cannot self-reference the SHA of the commit that contains itself. Therefore `headSHA` means the last verified head immediately before the checkpoint commit. A resuming executor must query GitHub current head and verify the stored head is identical to or an ancestor of it.

## Handoff
1. Finish only the smallest independently valid unit.
2. Commit/push the checkpoint on the same active branch.
3. Set `EXECUTOR_HANDOFF_READY` when an executor switch is required.
4. New executor re-reads GitHub SSOT and verifies branch/PR uniqueness, head ancestry, diff, CI, and candidate/Evidence fingerprint.
5. Skip `completedSteps`; continue from `nextStep`.
6. Preserve all v4 gates. Missing required external model evidence becomes `EXTERNAL_AUDIT_REQUIRED`.

## Fail closed
- more than one open PR for the active branch/task
- active PR closed unexpectedly
- checkpoint head diverged from current head
- candidate fingerprint drift
- GitHub state retrieval failure
- required external audit missing (no model substitution)
- any attempted verifier/gate weakening

## Automation boundary
GitHub can validate/reconstruct handoff state, but cannot directly know that an OpenClaw/ChatGPT vendor quota was exhausted unless an executor writes a checkpoint or an external heartbeat/scheduler observes staleness. It also cannot invoke another chat agent by itself.

Full unattended failover therefore has two layers:
1. **Repository layer (this contract):** deterministic checkpoint, recovery, duplicate prevention, CI verification.
2. **Trigger layer (separate):** scheduler/agent watches stale or `EXECUTOR_HANDOFF_READY` state and invokes the next executor.

Never describe layer 1 alone as automatic cross-vendor agent invocation.
