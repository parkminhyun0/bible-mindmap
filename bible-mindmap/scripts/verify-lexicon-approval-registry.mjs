import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  fingerprintWithout,
  readPhaseGate,
} from './lib/lexicon-evidence-verifier.mjs';
import { buildLexiconApprovalRegistry } from './build-lexicon-approval-registry.mjs';
import { buildLexiconManifest } from './build-lexicon-manifest.mjs';
import { buildLexiconShards, resolveShardDescriptor } from './build-lexicon-shards.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SCHEMA_DIR = path.join(ROOT, 'data/lexicon/schemas');
const TRACK_STATE_PATH = path.resolve(ROOT, '../docs/lexicon-workflow/TRACK_STATE.json');
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function verifySchemaSurface(fileName, requiredRootFields) {
  const schema = readJson(path.join(SCHEMA_DIR, fileName));
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema', `${fileName}: JSON Schema draft drift`);
  assert.ok(schema.$id.endsWith(`/schemas/lexicon/${fileName}`), `${fileName}: $id drift`);
  assert.equal(schema.type, 'object', `${fileName}: root must be object`);
  assert.equal(schema.additionalProperties, false, `${fileName}: root must fail closed on unknown properties`);
  assert.deepEqual(schema.required, requiredRootFields, `${fileName}: required root contract drift`);
  return schema;
}

function verifyNoProductionWriteSurface() {
  const forbidden = [
    path.join(ROOT, 'data/lexicon/approval-registry.json'),
    path.join(ROOT, 'data/lexicon/manifest.json'),
    path.join(ROOT, 'data/lexicon/shards'),
  ];
  for (const target of forbidden) {
    assert.equal(fs.existsSync(target), false, `P4 infrastructure must not create production data path: ${path.relative(ROOT, target)}`);
  }
}

function verifyStdoutOnlyBuilders() {
  for (const script of [
    'build-lexicon-approval-registry.mjs',
    'build-lexicon-manifest.mjs',
    'build-lexicon-shards.mjs',
  ]) {
    const result = spawnSync(process.execPath, [path.join(HERE, script), '--out'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0, `${script}: --out must fail closed before P4.5 audit`);
  }
}

function verifyPhaseAndDeprecatedLocks() {
  const phaseGate = readPhaseGate(TRACK_STATE_PATH);
  assert.equal(phaseGate.candidateGenerationAllowed, false, 'candidate generation must remain disabled');
  assert.equal(phaseGate.approvalRegistryPromotionAllowed, false, 'Approval Registry promotion must remain disabled');
  assert.equal(phaseGate.serviceUiWriteAllowed, false, 'service/UI write must remain disabled');

  const trackState = readJson(TRACK_STATE_PATH);
  assert.equal(trackState.state, 'P3_COMPLETE', 'P4 infrastructure must not self-promote track state');
  assert.equal(trackState.activePhase, 'P4_REGISTRY_SHARD_REACT_INTEGRATION', 'activePhase drift');
  const deprecated = new Set(trackState.deprecatedDefaultPaths || []);
  for (const required of [
    'ollama_local_ab_translation',
    'mac_model_preflight_as_start_gate',
    'gemini_full_corpus_retranslation',
    'model_majority_vote',
    'automatic_production_write_before_approval',
  ]) {
    assert.ok(deprecated.has(required), `deprecatedDefaultPaths lock missing: ${required}`);
  }
}

function verifyEmptyInfrastructure() {
  assert.throws(
    () => buildLexiconApprovalRegistry([{}]),
    /must remain empty until P4\.5 independent audit passes/,
    'non-empty Approval Registry must fail closed before P4.5',
  );

  const forgedRegistry = { schemaVersion: 1, entries: [{}] };
  assert.throws(
    () => buildLexiconManifest(forgedRegistry),
    /must remain empty while promotion is disabled/,
    'manifest builder must independently reject non-empty registry while promotion is disabled',
  );
  assert.throws(
    () => buildLexiconShards(forgedRegistry),
    /must remain empty while promotion is disabled/,
    'shard builder must independently reject non-empty registry while promotion is disabled',
  );

  const registryA = buildLexiconApprovalRegistry();
  const registryB = buildLexiconApprovalRegistry();
  assert.deepEqual(registryA, registryB, 'Approval Registry builder must be deterministic');
  assert.deepEqual(registryA.entries, [], 'Approval Registry initial entries must be empty');
  assert.match(registryA.registryFingerprint, SHA256_PATTERN, 'registryFingerprint must be sha256');
  assert.equal(registryA.registryFingerprint, fingerprintWithout(registryA, 'registryFingerprint'), 'registryFingerprint drift');

  const manifestA = buildLexiconManifest(registryA);
  const manifestB = buildLexiconManifest(registryB);
  assert.deepEqual(manifestA, manifestB, 'manifest builder must be deterministic');
  assert.equal(manifestA.count, 0, 'empty registry manifest count must be 0');
  assert.deepEqual(manifestA.entries, [], 'empty registry manifest entries must be empty');
  assert.match(manifestA.manifestFingerprint, SHA256_PATTERN, 'manifestFingerprint must be sha256');
  assert.equal(manifestA.manifestFingerprint, fingerprintWithout(manifestA, 'manifestFingerprint'), 'manifestFingerprint drift');

  const shardsA = buildLexiconShards(registryA);
  const shardsB = buildLexiconShards(registryB);
  assert.deepEqual(shardsA, shardsB, 'shard builder must be deterministic');
  assert.deepEqual(shardsA, [], 'empty registry must produce zero shards');

  assert.deepEqual(resolveShardDescriptor('H1', 'hebrew'), {
    shardId: 'hebrew-H1-H100',
    shardPath: 'shards/hebrew-H1-H100.json',
    scope: { kind: 'language-strong-range', language: 'hebrew', startStrong: 'H1', endStrong: 'H100' },
  });
  assert.equal(resolveShardDescriptor('H101', 'hebrew').shardPath, 'shards/hebrew-H101-H200.json');
  assert.equal(resolveShardDescriptor('G2316', 'greek').shardPath, 'shards/greek-G2301-G2400.json');
}

verifySchemaSurface('ApprovalRegistry.schema.json', ['schemaVersion', 'entries', 'registryFingerprint']);
verifySchemaSurface('LexiconManifest.schema.json', ['schemaVersion', 'count', 'entries', 'manifestFingerprint']);
verifySchemaSurface('LexiconShard.schema.json', ['schemaVersion', 'shardId', 'scope', 'count', 'entries', 'shardFingerprint']);
verifyPhaseAndDeprecatedLocks();
verifyNoProductionWriteSurface();
verifyStdoutOnlyBuilders();
verifyEmptyInfrastructure();

console.log('✓ P4 Approval Registry / manifest / shard infrastructure contract PASS');
console.log('  approval entries: 0 · manifest entries: 0 · shards: 0');
console.log('  candidate generation: disabled · Approval promotion: disabled · service/UI write: disabled');
