import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { fingerprintWithout, readPhaseGate } from './lib/lexicon-evidence-verifier.mjs';
import { buildLexiconApprovalRegistry } from './build-lexicon-approval-registry.mjs';
import { buildLexiconManifest } from './build-lexicon-manifest.mjs';
import { buildLexiconShards, resolveShardDescriptor } from './build-lexicon-shards.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SCHEMA_DIR = path.join(ROOT, 'data/lexicon/schemas');
const TRACK_STATE_PATH = path.resolve(ROOT, '../docs/lexicon-workflow/TRACK_STATE.json');
const REGISTRY_PATH = path.join(ROOT, 'data/lexicon/approval-registry.json');
const MANIFEST_PATH = path.join(ROOT, 'data/lexicon/manifest.json');
const H776_SHARD_PATH = path.join(ROOT, 'data/lexicon/shards/hebrew-H701-H800.json');
const H776_PACKET_PATH = path.join(ROOT, 'data/lexicon/fixtures/GEN-1-1-H776.evidence-packet.v2.json');
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/;

function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
function verifySchemaSurface(fileName, requiredRootFields) {
  const schema = readJson(path.join(SCHEMA_DIR, fileName));
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema', `${fileName}: JSON Schema draft drift`);
  assert.ok(schema.$id.endsWith(`/schemas/lexicon/${fileName}`), `${fileName}: $id drift`);
  assert.equal(schema.type, 'object');
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required, requiredRootFields);
}
function verifyStdoutOnlyBuilders() {
  for (const script of ['build-lexicon-approval-registry.mjs','build-lexicon-manifest.mjs','build-lexicon-shards.mjs']) {
    const result = spawnSync(process.execPath, [path.join(HERE, script), '--out'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0, `${script}: --out must remain fail-closed; reviewed writes occur only through protected PRs`);
  }
}
function verifyPhaseLocks() {
  const phaseGate = readPhaseGate(TRACK_STATE_PATH);
  assert.equal(phaseGate.candidateGenerationAllowed, false, 'candidate generation must remain disabled');
  assert.equal(phaseGate.approvalRegistryPromotionAllowed, true, 'audited Approval Registry promotion prerequisite must remain present');
  assert.equal(phaseGate.serviceUiWriteAllowed, false, 'service/UI write must remain disabled');

  const trackState = readJson(TRACK_STATE_PATH);
  const phaseKey = `${trackState.state}/${trackState.activePhase}`;
  const supportedPhases = new Set([
    'P3_COMPLETE/P4_REGISTRY_SHARD_REACT_INTEGRATION',
    'P4_COMPLETE/P5_GENESIS_GOLD_SELECTION',
  ]);
  assert.ok(supportedPhases.has(phaseKey), `unsupported lexicon phase for protected Registry contract: ${phaseKey}`);
  assert.equal(trackState.p4_5_independentAudit?.verdict, 'PASS_WITH_MANDATORY_PRE_FIRST_ENTRY_STEPS');

  if (trackState.activePhase === 'P5_GENESIS_GOLD_SELECTION') {
    assert.equal(trackState.p4Completion?.status, 'complete', 'P5 selection requires completed P4');
    assert.equal(trackState.p4Completion?.approvedSenseCount, 26, 'P5 selection must preserve H776 26/26');
    assert.equal(trackState.p4Completion?.liveShaVerified, true, 'P5 selection requires verified live SHA');
    assert.equal(trackState.p4Completion?.userScreenConfirmed, true, 'P5 selection requires user live-screen confirmation');
    const p5 = trackState.p5GenesisGoldSelection;
    assert.equal(p5?.targetSize, 25, 'P5 Gold target must remain 25');
    assert.equal(p5?.selectionOnly, true, 'P5 first contract must remain selection-only');
    for (const gate of ['candidateGenerationAllowed','approvalRegistryWriteAllowed','serviceUiWriteAllowed','productionWriteAllowed','existingApprovedMeaningMutationAllowed']) {
      assert.equal(p5?.[gate], false, `P5 selection gate must remain false: ${gate}`);
    }
    assert.equal(p5?.phaseTransitionEffectiveOnlyAfterIndependentReview, true, 'P5 transition must require independent review');
  }

  for (const required of ['ollama_local_ab_translation','mac_model_preflight_as_start_gate','gemini_full_corpus_retranslation','model_majority_vote','automatic_production_write_before_approval']) {
    assert.ok(new Set(trackState.deprecatedDefaultPaths || []).has(required), `deprecatedDefaultPaths lock missing: ${required}`);
  }
  return trackState;
}
function approvedProjection(node) {
  return { id: node.id, parentId: node.parentId, depth: node.depth, order: node.order, translationKo: node.translationKo, evidenceSupport: node.evidenceSupport };
}
function verifyFirstH776Entry(trackState) {
  for (const target of [REGISTRY_PATH, MANIFEST_PATH, H776_SHARD_PATH]) assert.equal(fs.existsSync(target), true, `first approved-entry production file missing: ${path.relative(ROOT, target)}`);
  const registry = readJson(REGISTRY_PATH);
  const packet = readJson(H776_PACKET_PATH);
  assert.equal(registry.schemaVersion, 1);
  assert.equal(registry.entries.length, 1, 'first protected write must contain exactly one approved entry');
  assert.match(registry.registryFingerprint, SHA256_PATTERN);
  assert.equal(registry.registryFingerprint, fingerprintWithout(registry, 'registryFingerprint'), 'registryFingerprint drift');
  const entry = registry.entries[0];
  assert.equal(entry.identity.canonicalStrong, 'H776');
  assert.deepEqual(entry.identity, packet.identity, 'H776 approved identity must match Evidence Packet identity');
  assert.deepEqual(entry.approvedSenseTree, packet.senseNodes.map(approvedProjection), 'H776 Golden Korean meanings must remain 26/26 unchanged');
  assert.equal(entry.reviewer?.reviewerType, 'human');
  assert.equal(entry.reviewer?.reviewerId, 'parkminhyun0');
  assert.equal(entry.approvedAt, '2026-08-07T15:59:47Z', 'approval timestamp must stay anchored to verified H776 golden merge');
  assert.equal(entry.evidencePacketFingerprint, trackState.evidencePacketRegeneration.regeneratedPacketFingerprint, 'Evidence Packet fingerprint drift');
  assert.deepEqual(buildLexiconApprovalRegistry(registry.entries), registry, 'committed registry must equal deterministic builder output');
  const manifest = readJson(MANIFEST_PATH);
  assert.deepEqual(buildLexiconManifest(registry), manifest, 'committed manifest must equal deterministic builder output');
  assert.equal(manifest.count, 1);
  assert.equal(manifest.entries[0].strong, 'H776');
  assert.equal(manifest.entries[0].shardPath, 'shards/hebrew-H701-H800.json');
  const shards = buildLexiconShards(registry);
  assert.equal(shards.length, 1);
  assert.deepEqual(shards[0], readJson(H776_SHARD_PATH), 'committed H776 shard must equal deterministic builder output');
  assert.deepEqual(resolveShardDescriptor('H776', 'hebrew'), { shardId:'hebrew-H701-H800', shardPath:'shards/hebrew-H701-H800.json', scope:{kind:'language-strong-range',language:'hebrew',startStrong:'H701',endStrong:'H800'} });
}
verifySchemaSurface('ApprovalRegistry.schema.json', ['schemaVersion','entries','registryFingerprint']);
verifySchemaSurface('LexiconManifest.schema.json', ['schemaVersion','count','entries','manifestFingerprint']);
verifySchemaSurface('LexiconShard.schema.json', ['schemaVersion','shardId','scope','count','entries','shardFingerprint']);
const trackState = verifyPhaseLocks();
verifyStdoutOnlyBuilders();
verifyFirstH776Entry(trackState);
console.log('✓ protected Approval Registry contract PASS');
console.log(`  phase: ${trackState.state}/${trackState.activePhase} · approved entries: 1 (H776) · manifest entries: 1 · shards: 1`);
console.log('  candidate generation: disabled · audited promotion prerequisite: present · service/UI write: disabled');
