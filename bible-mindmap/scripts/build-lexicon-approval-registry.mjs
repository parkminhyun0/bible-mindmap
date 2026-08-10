import assert from 'node:assert/strict';
import { fingerprintWithout, readPhaseGate } from './lib/lexicon-evidence-verifier.mjs';

export function buildLexiconApprovalRegistry(entries = []) {
  const phaseGate = readPhaseGate();
  assert.equal(phaseGate.approvalRegistryPromotionAllowed, false, 'P4 infrastructure requires Approval Registry promotion to remain disabled');
  assert.ok(Array.isArray(entries), 'Approval Registry entries must be an array');
  assert.equal(entries.length, 0, 'Approval Registry must remain empty until P4.5 independent audit passes');

  const registry = {
    schemaVersion: 1,
    entries: [],
    registryFingerprint: null,
  };
  registry.registryFingerprint = fingerprintWithout(registry, 'registryFingerprint');
  return registry;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  assert.equal(process.argv.includes('--out'), false, 'P4 infrastructure builder is stdout-only; repository write path is disabled until P4.5 audit');
  process.stdout.write(`${JSON.stringify(buildLexiconApprovalRegistry(), null, 2)}\n`);
}
