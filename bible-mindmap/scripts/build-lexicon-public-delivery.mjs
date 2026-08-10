import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fingerprintWithout } from './lib/lexicon-evidence-verifier.mjs';
import { buildLexiconManifest } from './build-lexicon-manifest.mjs';
import { buildLexiconShards } from './build-lexicon-shards.mjs';

const LANGUAGES = ['hebrew', 'aramaic', 'greek'];
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

function languageManifest(globalManifest, language) {
  const entries = globalManifest.entries.filter((entry) => entry.language === language).map((entry) => structuredClone(entry));
  const manifest = { schemaVersion: 1, count: entries.length, entries, manifestFingerprint: null };
  manifest.manifestFingerprint = fingerprintWithout(manifest, 'manifestFingerprint');
  return manifest;
}

export function buildLexiconPublicDelivery(registry) {
  const registryIndex = buildLexiconManifest(registry);
  const manifests = Object.fromEntries(LANGUAGES.map((language) => [language, languageManifest(registryIndex, language)]));
  const shards = Object.fromEntries(
    buildLexiconShards(registry).map((shard) => [`shards/${shard.shardId}.json`, shard]),
  );
  return { registry: registryIndex, manifests, shards };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  assert.equal(process.argv.includes('--out'), false, 'Public lexicon delivery builder is stdout-only; production delivery files are committed only through protected PRs');
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/lexicon/approval-registry.json'), 'utf8'));
  process.stdout.write(`${JSON.stringify(buildLexiconPublicDelivery(registry), null, 2)}\n`);
}
