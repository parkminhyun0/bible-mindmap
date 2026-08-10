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
function verifyClosedWriteGates(record, label) {
  for (const gate of ['candidateGenerationAllowed','approvalRegistryWriteAllowed','serviceUiWriteAllowed','productionWriteAllowed','existingApprovedMeaningMutationAllowed']) {
    assert.equal(record?.[gate], false, `${label} gate must remain false: ${gate}`);
  }
}
function verifyReadinessFacts(readiness, expectedStatus) {
  assert.equal(readiness?.status, expectedStatus, `P5 readiness status must be ${expectedStatus}`);
  assert.equal(readiness?.goldBaseReady, '25/25', 'P5 readiness must cover all Gold base items');
  assert.equal(readiness?.candidateBaseReady, '24/24', 'P5 readiness must cover all non-golden base targets');
  assert.equal(readiness?.sourceUnitCount, 28, 'P5 readiness source unit count drift');
  assert.equal(readiness?.candidateUnitCount, 27, 'P5 candidate unit count drift');
  assert.equal(readiness?.bdbSourceNodeCount, 173, 'P5 readiness BDB source-node count drift');
  assert.equal(readiness?.h776ApprovedSenseCount, 26, 'P5 readiness must preserve H776 26/26');
  assert.equal(readiness?.h776RetranslationTarget, false, 'H776 must not become a retranslation target');
  assert.equal(readiness?.sourceReadinessOnly, true, 'P5 readiness must remain source-readiness-only');
  assert.equal(readiness?.candidateGenerationEligible, true, 'P5 readiness must establish candidate eligibility');
  verifyClosedWriteGates(readiness, 'P5 readiness');
  assert.equal(readiness?.independentReviewRequired, true, 'P5 readiness must require independent review');
  assert.deepEqual(readiness?.extendedStrongResolution, {
    H1254: ['H1254a'],
    H834: ['H834a', 'H834b', 'H834c', 'H834d'],
    H6030: ['H6030b'],
  }, 'P5 Extended Strong resolution drift');
}
function verifyPhaseLocks() {
  const trackState = readJson(TRACK_STATE_PATH);
  const candidatePhase = trackState.activePhase === 'P5_GENESIS_CANDIDATE_GENERATION';
  const phaseGate = readPhaseGate(TRACK_STATE_PATH);
  assert.equal(phaseGate.candidateGenerationAllowed, candidatePhase, 'candidate generation phase gate must match active phase');
  assert.equal(phaseGate.approvalRegistryPromotionAllowed, true, 'audited Approval Registry promotion prerequisite must remain present');
  assert.equal(phaseGate.serviceUiWriteAllowed, false, 'service/UI write must remain disabled');

  const phaseKey = `${trackState.state}/${trackState.activePhase}`;
  const supportedPhases = new Set([
    'P3_COMPLETE/P4_REGISTRY_SHARD_REACT_INTEGRATION',
    'P4_COMPLETE/P5_GENESIS_GOLD_SELECTION',
    'P4_COMPLETE/P5_GENESIS_EVIDENCE_READINESS',
    'P4_COMPLETE/P5_GENESIS_CANDIDATE_GENERATION',
  ]);
  assert.ok(supportedPhases.has(phaseKey), `unsupported lexicon phase for protected Registry contract: ${phaseKey}`);
  assert.equal(trackState.p4_5_independentAudit?.verdict, 'PASS_WITH_MANDATORY_PRE_FIRST_ENTRY_STEPS');

  if (trackState.activePhase.startsWith('P5_GENESIS_')) {
    assert.equal(trackState.p4Completion?.status, 'complete', 'P5 requires completed P4');
    assert.equal(trackState.p4Completion?.approvedSenseCount, 26, 'P5 must preserve H776 26/26');
    assert.equal(trackState.p4Completion?.liveShaVerified, true, 'P5 requires verified live SHA');
    assert.equal(trackState.p4Completion?.userScreenConfirmed, true, 'P5 requires user live-screen confirmation');

    const selection = trackState.p5GenesisGoldSelection;
    assert.equal(selection?.targetSize, 25, 'P5 Gold target must remain 25');
    assert.equal(selection?.selectionOnly, true, 'P5 selection contract must remain selection-only');
    verifyClosedWriteGates(selection, 'P5 selection');
    assert.equal(selection?.phaseTransitionEffectiveOnlyAfterIndependentReview, true, 'P5 transition must require independent review');
  }

  if (trackState.activePhase === 'P5_GENESIS_EVIDENCE_READINESS') {
    verifyReadinessFacts(trackState.p5GenesisEvidenceReadiness, 'VERIFIED_AWAITING_INDEPENDENT_REVIEW');
  }

  if (candidatePhase) {
    const readiness = trackState.p5GenesisEvidenceReadiness;
    verifyReadinessFacts(readiness, 'LIVE');
    assert.equal(readiness?.pr, 290, 'candidate phase requires reviewed readiness PR #290');
    assert.equal(readiness?.contractRunId, 31382686593, 'candidate phase requires successful main readiness contract');
    assert.equal(readiness?.mergeCommit, '10857e266a596320f2131c0694d8e01c6d488eff', 'readiness merge SHA drift');
    assert.equal(readiness?.liveDeployRun, 590, 'candidate phase requires Pages #590');
    assert.equal(readiness?.liveShaVerified, true, 'candidate phase requires verified readiness Live SHA');
    assert.equal(readiness?.independentReviewApproved, true, 'candidate phase requires independent readiness approval');
    assert.equal(readiness?.independentReviewApprovedBy, 'bible-mindmap-review');

    const candidate = trackState.p5GenesisCandidateGeneration;
    assert.equal(candidate?.status, 'ENABLED_ON_MAIN_AFTER_REVIEWED_MERGE');
    assert.equal(candidate?.transitionOnly, true, 'phase PR must remain transition-only');
    assert.equal(candidate?.evidenceReadinessRequired, true);
    assert.equal(candidate?.evidenceReadinessSatisfied, true);
    assert.equal(candidate?.candidateGenerationAllowed, true, 'candidate phase must explicitly allow candidate generation');
    assert.equal(candidate?.translationStarted, false, 'phase transition PR must not generate translations');
    assert.equal(candidate?.translationCandidatesGenerated, 0, 'phase transition PR must contain zero candidates');
    for (const gate of ['approvalRegistryWriteAllowed','serviceUiWriteAllowed','productionWriteAllowed','existingApprovedMeaningMutationAllowed']) {
      assert.equal(candidate?.[gate], false, `candidate phase must keep write gate false: ${gate}`);
    }
    assert.equal(candidate?.phaseTransitionEffectiveOnlyAfterIndependentReviewAndMerge, true, 'candidate phase must require independent review + merge');
    assert.equal(trackState.currentPhaseGate?.sourceDriverPolicyRequired, true, 'candidate phase requires source-driver dual lock');
    assert.equal(trackState.currentPhaseGate?.effectiveOnlyAfterIndependentReviewAndMerge, true, 'current phase gate must not self-promote before merge');
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
console.log(`  candidate generation: ${readPhaseGate(TRACK_STATE_PATH).candidateGenerationAllowed ? 'dual-gated enabled' : 'disabled'} · Approval Registry/UI/production writes: protected`);
