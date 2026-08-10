import assert from 'node:assert/strict';
import { fingerprintWithout, readPhaseGate } from './lib/lexicon-evidence-verifier.mjs';

export function buildLexiconApprovalRegistry(entries = []) {
  const phaseGate = readPhaseGate();
  assert.equal(typeof phaseGate.approvalRegistryPromotionAllowed, 'boolean', 'Approval Registry promotion gate must be boolean');
  assert.ok(Array.isArray(entries), 'Approval Registry entries must be an array');
  assert.equal(entries.length, 0, 'Approval Registry first entry requires a dedicated post-promotion PR');

  const registry = {
    schemaVersion: 1,
    entries: [],
    registryFingerprint: null,
  };
  registry.registryFingerprint = fingerprintWithout(registry, 'registryFingerprint');
  return registry;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  assert.equal(process.argv.includes('--out'), false, 'P4 infrastructure builder is stdout-only; repository write path remains disabled until the first approved-entry PR');
  process.stdout.write(`${JSON.stringify(buildLexiconApprovalRegistry(), null, 2)}\n`);
}
