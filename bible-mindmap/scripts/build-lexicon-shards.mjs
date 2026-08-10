import assert from 'node:assert/strict';
import { fingerprintWithout, normalizeStrong } from './lib/lexicon-evidence-verifier.mjs';
import { buildLexiconApprovalRegistry } from './build-lexicon-approval-registry.mjs';

const STRONG_PATTERN = /^([HG])([1-9][0-9]*)([a-z]?)$/;

export function resolveShardDescriptor(strongValue, language) {
  const strong = normalizeStrong(strongValue);
  const match = strong.match(STRONG_PATTERN);
  assert.ok(match, `invalid Strong for shard routing: ${strongValue}`);
  const number = Number(match[2]);
  const start = Math.floor((number - 1) / 100) * 100 + 1;
  const end = start + 99;
  const prefix = match[1];
  const startStrong = `${prefix}${start}`;
  const endStrong = `${prefix}${end}`;
  const languageKey = language === 'greek' ? 'greek' : language === 'aramaic' ? 'aramaic' : 'hebrew';
  const shardId = `${languageKey}-${startStrong}-${endStrong}`;
  return {
    shardId,
    shardPath: `shards/${shardId}.json`,
    scope: {
      kind: 'language-strong-range',
      language: languageKey,
      startStrong,
      endStrong,
    },
  };
}

export function buildLexiconShards(registry = buildLexiconApprovalRegistry()) {
  assert.equal(registry?.schemaVersion, 1, 'Approval Registry schemaVersion must be 1');
  assert.ok(Array.isArray(registry.entries), 'Approval Registry entries must be an array');

  const groups = new Map();
  for (const entry of registry.entries) {
    const descriptor = resolveShardDescriptor(entry.identity.canonicalStrong, entry.identity.language);
    if (!groups.has(descriptor.shardId)) groups.set(descriptor.shardId, { descriptor, entries: [] });
    groups.get(descriptor.shardId).entries.push(entry);
  }

  return [...groups.values()]
    .sort((a, b) => a.descriptor.shardId.localeCompare(b.descriptor.shardId, 'en'))
    .map(({ descriptor, entries }) => {
      const sortedEntries = entries
        .slice()
        .sort((a, b) => normalizeStrong(a.identity.canonicalStrong).localeCompare(normalizeStrong(b.identity.canonicalStrong), 'en'));
      const shard = {
        schemaVersion: 1,
        shardId: descriptor.shardId,
        scope: descriptor.scope,
        count: sortedEntries.length,
        entries: sortedEntries,
        shardFingerprint: null,
      };
      shard.shardFingerprint = fingerprintWithout(shard, 'shardFingerprint');
      return shard;
    });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  assert.equal(process.argv.includes('--out'), false, 'P4 infrastructure builder is stdout-only; repository write path is disabled until P4.5 audit');
  process.stdout.write(`${JSON.stringify(buildLexiconShards(), null, 2)}\n`);
}
