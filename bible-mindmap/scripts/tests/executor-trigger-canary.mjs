import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decideHandoff } from '../lib/executor-handoff.mjs';
import { decideTrigger, toHandoffReadyState } from '../lib/executor-trigger.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const triggerContract = JSON.parse(fs.readFileSync(path.join(root, 'data/lexicon/v4/executor-trigger-contract.json'), 'utf8'));
const handoffContract = JSON.parse(fs.readFileSync(path.join(root, 'data/lexicon/v4/executor-handoff-contract.json'), 'utf8'));

const sha = '1234567890abcdef1234567890abcdef12345678';
const fp = `sha256:${'a'.repeat(64)}`;
const jarvisState = {
  schemaVersion: 1,
  trackId: 'lexicon-ko-66',
  phase: 'CANARY_ACTIVE_WORK',
  status: 'ACTIVE',
  currentExecutor: 'JARVIS',
  previousExecutor: 'GPT',
  completedSteps: handoffContract.stepOrder.slice(0, 4),
  nextStep: handoffContract.stepOrder[4],
  nextAction: 'Continue canary from nextStep.',
  baseSHA: sha,
  headSHA: sha,
  candidateFingerprint: fp,
  activePR: 999,
  activeBranch: 'canary/jarvis-to-gpt',
  checkpointedAt: '2026-08-11T00:00:00.000Z',
  handoffReason: 'canary-active',
  externalAudit: { required: false, status: 'NOT_REQUIRED', provider: null, artifact: null }
};

const trigger = decideTrigger({
  handoffState: jarvisState,
  contract: triggerContract,
  signal: 'usage-limit',
  now: new Date('2026-08-11T00:01:00.000Z')
});
if (trigger.verdict !== 'EMIT_HANDOFF_READY') throw new Error(`unexpected trigger verdict: ${trigger.verdict}`);
if (trigger.targetExecutor !== 'GPT') throw new Error('target executor must be GPT');
if (trigger.resumeFrom !== jarvisState.nextStep) throw new Error('resumeFrom drift');

const readyState = toHandoffReadyState(jarvisState, trigger);
const claim = decideHandoff(readyState, {
  retrievalOk: true,
  openPrCountForBranch: 1,
  prOpen: true,
  headRelation: 'equal',
  candidateFingerprint: fp,
  currentExecutor: 'GPT',
  currentHeadSHA: sha,
});
if (claim.verdict !== 'HANDOFF_ACCEPTED') throw new Error(`unexpected claim verdict: ${claim.verdict}`);
if (claim.resumeFrom !== jarvisState.nextStep) throw new Error('claim resumeFrom drift');
if (JSON.stringify(claim.skipSteps) !== JSON.stringify(jarvisState.completedSteps)) throw new Error('completedSteps were not preserved');

console.log('JARVIS_TO_GPT_TRIGGER_CANARY PASS');
console.log(JSON.stringify({ trigger, claim }, null, 2));
