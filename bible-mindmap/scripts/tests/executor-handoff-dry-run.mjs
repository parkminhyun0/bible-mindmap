#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { clone, decideHandoff, validateHandoffState } from '../lib/executor-handoff.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../../..');
const contract = JSON.parse(await readFile(path.join(root, 'bible-mindmap/data/lexicon/v4/executor-handoff-contract.json'), 'utf8'));
const state = JSON.parse(await readFile(path.join(root, 'docs/lexicon-workflow/EXECUTOR_HANDOFF_STATE.json'), 'utf8'));

assert.deepEqual(validateHandoffState(state, contract), []);

const baseRuntime = {
  retrievalOk: true,
  currentExecutor: 'GPT',
  currentHeadSHA: state.headSHA,
  headRelation: 'equal',
  prOpen: true,
  openPrCountForBranch: state.activePR > 0 ? 1 : 0,
  candidateFingerprint: state.candidateFingerprint,
};

const fixtures = [];
function run(name, mutateState, mutateRuntime, expected) {
  const s = clone(state);
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

const bad = clone(state);
bad.completedSteps = ['state-reconcile', 'handoff-contract'];
assert.ok(validateHandoffState(bad, contract).some(e => e.includes('contiguous prefix')));

console.log(`✓ executor handoff dry-run: ${fixtures.length} decision fixtures + state-order adversarial check PASS`);
