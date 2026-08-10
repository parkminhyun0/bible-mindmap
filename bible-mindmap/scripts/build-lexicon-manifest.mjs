import assert from 'node:assert/strict';
import {
  fingerprintWithout,
  normalizeStrong,
  readPhaseGate,
  sha256Canonical,
} from './lib/lexicon-evidence-verifier.mjs';
import { buildLexiconApprovalRegistry } from './build-lexicon-approval-registry.mjs';
import { resolveShardDescriptor } from './build-lexicon-shards.mjs';

export function buildLexiconManifest(registry = buildLexiconApprovalRegistry()) {
  assert.equal(registry?.schemaVersion, 1, 'Approval Registry schemaVersion must be 1');
  assert.ok(Array.isArray(registry.entries), 'Approval Registry entries must be an array');
  const phaseGate = readPhaseGate();
  if (!phaseGate.approvalRegistryPromotionAllowed) {
    assert.equal(
      registry.entries.length,
      0,
      'Approval Registry entries must remain empty while promotion is disabled',
    );
  }

  const entries = registry.entries
    .map((entry) => {
      const strong = normalizeStrong(entry.identity.canonicalStrong);
      const descriptor = resolveShardDescriptor(strong, entry.identity.language);
      return {
        strong,
        language: entry.identity.language,
        shardPath: descriptor.shardPath,
        entryFingerprint: sha256Canonical(entry),
      };
    })
    .sort((a, b) => a.strong.localeCompare(b.strong, 'en'));

  const manifest = {
    schemaVersion: 1,
    count: entries.length,
    entries,
    manifestFingerprint: null,
  };
  manifest.manifestFingerprint = fingerprintWithout(manifest, 'manifestFingerprint');
  return manifest;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  assert.equal(process.argv.includes('--out'), false, 'P4 infrastructure builder is stdout-only; repository write path is disabled until P4.5 audit');
  process.stdout.write(`${JSON.stringify(buildLexiconManifest(), null, 2)}\n`);
}
