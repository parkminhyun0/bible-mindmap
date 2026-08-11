import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decideTrigger, buildTriggerIssue } from './lib/executor-trigger.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const contractPath = path.join(root, 'data/lexicon/v4/executor-trigger-contract.json');
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

const requiredSignals = ['usage-limit', 'session-ended', 'tool-unavailable', 'stale-checkpoint-watch'];
const errors = [];
if (contract.schemaVersion !== 1) errors.push('schemaVersion must be 1');
if (contract.trackId !== 'lexicon-ko-66') errors.push('trackId mismatch');
if (contract.primaryExecutor !== 'GPT') errors.push('primaryExecutor must be GPT');
if (contract.rules?.gptIsPrimary !== true) errors.push('gptIsPrimary must be true');
if (contract.rules?.jarvisIsOptionalSupport !== true) errors.push('jarvisIsOptionalSupport must be true');
if (contract.rules?.noDuplicatePR !== true) errors.push('noDuplicatePR must be true');
if (contract.rules?.fingerprintMustRemainStable !== true) errors.push('fingerprintMustRemainStable must be true');
if (contract.rules?.externalAuditMayNotBeBypassed !== true) errors.push('externalAuditMayNotBeBypassed must be true');
if (!Number.isInteger(contract.pollIntervalMinutes) || contract.pollIntervalMinutes < 5 || contract.pollIntervalMinutes > 60) errors.push('pollIntervalMinutes must be 5..60');
for (const signal of requiredSignals) if (!contract.supportedSignals?.includes(signal)) errors.push(`missing signal: ${signal}`);
if (contract.emission?.channel !== 'github-issue') errors.push('emission.channel must be github-issue');
if (contract.claim?.targetExecutor !== 'GPT') errors.push('claim target must be GPT');
if (contract.claim?.mustUseSamePR !== true || contract.claim?.mustUseSameBranch !== true) errors.push('claim must reuse same PR/branch');

if (process.argv.includes('--self-test')) {
  const sha = '1234567890abcdef1234567890abcdef12345678';
  const state = {
    status: 'ACTIVE', currentExecutor: 'JARVIS', activePR: 42, activeBranch: 'canary/branch', nextStep: 'handoff-ci',
    headSHA: sha, candidateFingerprint: `sha256:${'b'.repeat(64)}`, completedSteps: ['state-reconcile'],
  };
  const decision = decideTrigger({ handoffState: state, contract, signal: 'usage-limit', now: new Date('2026-08-11T00:00:00Z') });
  if (decision.verdict !== 'EMIT_HANDOFF_READY') errors.push(`self-test trigger failed: ${decision.verdict}`);
  const issue = decision.verdict === 'EMIT_HANDOFF_READY' ? buildTriggerIssue({ decision, contract }) : null;
  if (!issue?.title.startsWith(contract.triggerIssuePrefix)) errors.push('self-test issue title mismatch');
  const gptState = { ...state, currentExecutor: 'GPT' };
  const gptDecision = decideTrigger({ handoffState: gptState, contract, signal: 'usage-limit' });
  if (gptDecision.verdict !== 'PRIMARY_CONTINUES') errors.push('GPT primary self-test failed');
  const completeDecision = decideTrigger({ handoffState: { ...state, status: 'COMPLETE' }, contract, signal: 'usage-limit' });
  if (completeDecision.verdict !== 'NOOP') errors.push('COMPLETE state must NOOP');
}

if (errors.length) {
  console.error('EXECUTOR TRIGGER CONTRACT FAIL');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('EXECUTOR TRIGGER CONTRACT PASS');
