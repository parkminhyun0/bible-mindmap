#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { clone, decideHandoff, validateHandoffState } from '../lib/executor-handoff.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../../..');
const contract = JSON.parse(await readFile(path.join(root, 'bible-mindmap/data/lexicon/v4/executor-handoff-contract.json'), 'utf8'));
const liveState = JSON.parse(await readFile(path.join(root, 'docs/lexicon-workflow/EXECUTOR_HANDOFF_STATE.json'), 'utf8'));

// Live state may be COMPLETE, ACTIVE, or HANDOFF_READY during a real canary.
// Decision fixtures must never depend on the current operational phase.
assert.deepEqual(validateHandoffState(liveState, contract), []);
const activeState = clone(liveState);
activeState.status = 'ACTIVE';
activeState.currentExecutor = 'GPT';
activeState.previousExecutor = 'JARVIS';
activeState.completedSteps = contract.stepOrder.slice(0, 6);
activeState.nextStep = contract.stepOrder[6];
activeState.nextAction = 'fixture: continue at the next incomplete step';
activeState.activePR = 301;
activeState.activeBranch = 'fixture/executor-handoff';
activeState.handoffReason = 'fixture-active-state';
activeState.externalAudit = { required: false, status: 'NOT_REQUIRED', provider: null, artifact: null };
assert.deepEqual(validateHandoffState(activeState, contract), []);

const baseRuntime = {
  retrievalOk: true,
  currentExecutor: 'GPT',
  currentHeadSHA: activeState.headSHA,
  headRelation: 'equal',
  prOpen: true,
  openPrCountForBranch: 1,
  candidateFingerprint: activeState.candidateFingerprint,
};

const fixtures = [];
function run(name, mutateState, mutateRuntime, expected) {
  const s = clone(activeState);
  const r = clone(baseRuntime);
  mutateState?.(s);
  mutateRuntime?.(r);
  const verdict = decideHandoff(s, r).verdict;
  assert.equal(verdict, expected, `${name}: expected ${expected}, got ${verdict}`);
  fixtures.push([name, verdict]);
}

run('same executor resumes next incomplete step', null, null, 'RESUME_SAME_EXECUTOR');
run('usage-limit handoff GPT to Jarvis', s => { s.status = 'EXECUTOR_HANDOFF_READY'; }, r => { r.currentExecutor = 'JARVIS'; }, 'HANDOFF_ACCEPTED');
run('usage-limit handoff Jarvis to GPT', s => { s.status = 'EXECUTOR_HANDOFF_READY'; s.currentExecutor = 'JARVIS'; s.previousExecutor = 'GPT'; }, r => { r.currentExecutor = 'GPT'; }, 'HANDOFF_ACCEPTED');
run('executor switch without ready state waits', null, r => { r.currentExecutor = 'JARVIS'; }, 'WAIT_FOR_HANDOFF_READY');
run('duplicate PR fails closed', null, r => { r.openPrCountForBranch = 2; }, 'FAIL_CLOSED');
run('retrieval failure fails closed', null, r => { r.retrievalOk = false; }, 'FAIL_CLOSED');
run('diverged head fails closed', null, r => { r.headRelation = 'diverged'; }, 'FAIL_CLOSED');
run('candidate fingerprint drift fails closed', null, r => { r.candidateFingerprint = 'sha256:' + '0'.repeat(64); }, 'FAIL_CLOSED');
run('external audit missing blocks substitution', s => { s.externalAudit.required = true; s.externalAudit.status = 'REQUIRED'; }, null, 'EXTERNAL_AUDIT_REQUIRED');
run('closed active PR fails closed', s => { s.activePR = 300; }, r => { r.prOpen = false; r.openPrCountForBranch = 0; }, 'FAIL_CLOSED');

const completeState = clone(activeState);
completeState.status = 'COMPLETE';
completeState.currentExecutor = 'NONE';
completeState.previousExecutor = 'GPT';
completeState.completedSteps = [...contract.stepOrder];
completeState.nextStep = null;
completeState.nextAction = 'fixture: no remaining handoff work';
completeState.activePR = 0;
completeState.activeBranch = 'none';
completeState.handoffReason = 'fixture-complete-state';
completeState.externalAudit = { required: false, status: 'NOT_REQUIRED', provider: null, artifact: null };
assert.deepEqual(validateHandoffState(completeState, contract), []);
const completeRuntime = {
  retrievalOk: true,
  currentExecutor: 'NONE',
  currentHeadSHA: completeState.headSHA,
  headRelation: 'equal',
  prOpen: false,
  openPrCountForBranch: 0,
  candidateFingerprint: completeState.candidateFingerprint,
};
assert.equal(decideHandoff(completeState, completeRuntime).verdict, 'COMPLETE', 'explicit COMPLETE fixture must remain COMPLETE');
fixtures.push(['complete state is terminal', 'COMPLETE']);

const bad = clone(activeState);
bad.completedSteps = ['state-reconcile', 'handoff-contract'];
assert.ok(validateHandoffState(bad, contract).some(e => e.includes('contiguous prefix')));

console.log(`✓ executor handoff dry-run: ${fixtures.length} decision fixtures + state-order adversarial check PASS`);
