import assert from 'node:assert/strict';
import { fingerprintWithout, normalizeStrong, readPhaseGate } from './lib/lexicon-evidence-verifier.mjs';

export function buildLexiconApprovalRegistry(entries = []) {
  const phaseGate = readPhaseGate();
  assert.equal(typeof phaseGate.approvalRegistryPromotionAllowed, 'boolean', 'Approval Registry promotion gate must be boolean');
  assert.ok(Array.isArray(entries), 'Approval Registry entries must be an array');
  if (entries.length > 0) {
    assert.equal(phaseGate.approvalRegistryPromotionAllowed, true, 'Approval Registry entries require audited promotion gate');
  }

  const normalizedEntries = entries
    .map((entry) => structuredClone(entry))
    .sort((a, b) => normalizeStrong(a.identity?.canonicalStrong).localeCompare(normalizeStrong(b.identity?.canonicalStrong), 'en'));
  const strongs = normalizedEntries.map((entry) => normalizeStrong(entry.identity?.canonicalStrong));
  assert.equal(new Set(strongs).size, strongs.length, 'Approval Registry Strong entries must be unique');

  const registry = {
    schemaVersion: 1,
    entries: normalizedEntries,
    registryFingerprint: null,
  };
  registry.registryFingerprint = fingerprintWithout(registry, 'registryFingerprint');
  return registry;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  assert.equal(process.argv.includes('--out'), false, 'Approval Registry builder is stdout-only; reviewed production files are committed only through protected PRs');
  process.stdout.write(`${JSON.stringify(buildLexiconApprovalRegistry(), null, 2)}\n`);
}
