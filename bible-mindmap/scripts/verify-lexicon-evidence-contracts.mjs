#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LEXICON_TRANSLATION_PILOT,
  normalizeLexiconTranslationStrong,
  resolveLexiconTranslationDisplayState,
} from '../src/data/lexiconTranslationPilot.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
const strongSchema = read('data/lexicon/schemas/StrongIdentity.schema.json');
const packetSchema = read('data/lexicon/schemas/EvidencePacket.schema.json');
const registry = read('data/lexicon/source-registry.json');
const packet = read('data/lexicon/fixtures/GEN-1-1-H776.evidence-packet.v2.json');
const reconciliation = read('data/lexicon/fixtures/GEN-1-1-H776.source-golden-reconciliation.v1.json');
const goldenRecord = LEXICON_TRANSLATION_PILOT.H776;
const BASELINE = 'sha256:4ac67c63c1498f84b0ffc9c716ea98091cd0ccd8d11ac5e00aecff34ebd56ddf';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}
function sha(value) { return `sha256:${crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')}`; }
function fingerprint(value, key) { const copy = structuredClone(value); delete copy[key]; return sha(copy); }
function normalizeStrong(value) {
  const match = String(value || '').trim().match(/^([GHgh])0*(\d+)([A-Za-z]?)$/);
  if (!match || Number(match[2]) < 1) return String(value || '').trim().toUpperCase();
  return `${match[1].toUpperCase()}${Number(match[2])}${match[3].toLowerCase()}`;
}
function flatten(nodes, parentId = null, depth = 0, out = []) {
  for (const node of nodes || []) {
    out.push({ id: node.id, parentId, depth, order: out.length + 1, translationKo: node.text });
    flatten(node.children, node.id, depth + 1, out);
  }
  return out;
}

function verify(value) {
  assert.equal(strongSchema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(strongSchema.additionalProperties, false);
  assert.equal(packetSchema.properties?.schemaVersion?.const, 2);
  assert.equal(packetSchema.additionalProperties, false);
  for (const key of ['sourceInputs', 'senseNodes', 'licenseSummary', 'regeneration', 'packetFingerprint']) assert.ok(packetSchema.required.includes(key), `Evidence schema missing ${key}`);
  for (const key of ['evidenceSupport', 'sourceNodeId', 'observations']) assert.ok(packetSchema.$defs.senseNode.required.includes(key), `senseNode schema missing ${key}`);

  assert.equal(value.schemaVersion, 2);
  assert.equal(value.packetType, 'golden-reference');
  assert.equal(value.processingMode, 'regression-only');
  assert.equal(value.status, 'golden-reference-fixture');
  assert.equal(value.sourceRegistryPolicyVersion, registry.policyVersion);
  assert.equal(value.identity.canonicalStrong, 'H776');
  assert.equal(value.identity.identityId, 'H776');
  assert.equal(value.identity.baseStrong, 'H776');
  assert.equal(value.identity.language, 'hebrew');
  assert.equal(value.identity.lemma, goldenRecord.lemma);
  assert.equal(value.identity.lemmaNormalized, value.identity.lemma.normalize('NFC'));
  for (const form of value.identity.sourceForms) assert.equal(normalizeStrong(form), 'H776');
  assert.equal(value.identity.identityFingerprint, fingerprint(value.identity, 'identityFingerprint'));

  const registryById = new Map(registry.sources.map((source) => [source.sourceId, source]));
  const inputIds = new Set();
  for (const input of value.sourceInputs) {
    assert.ok(!inputIds.has(input.sourceId), `duplicate source ${input.sourceId}`);
    inputIds.add(input.sourceId);
    const source = registryById.get(input.sourceId);
    assert.ok(source, `unregistered source ${input.sourceId}`);
    assert.equal(input.usagePolicy, 'automatic-evidence');
    assert.equal(input.registryWorkflowStatus, 'approved-ready');
    assert.equal(source.workflow.status, 'approved-ready');
    assert.equal(source.workflow.autoProcessingAllowed, true);
    assert.equal(input.sourceFingerprint, source.provenance.contentHash);
  }
  assert.deepEqual([...value.licenseSummary.approvedSources].sort(), [...inputIds].sort());
  assert.deepEqual(value.licenseSummary.restrictedSources, []);
  assert.equal(value.licenseSummary.allAutomaticInputsApproved, true);
  assert.equal(value.licenseSummary.newGenerationAllowed, false);

  const golden = flatten(goldenRecord.definition);
  assert.equal(golden.length, 26);
  assert.equal(value.senseNodes.length, 26);
  value.senseNodes.forEach((node, index) => {
    const expected = golden[index];
    for (const key of ['id', 'parentId', 'depth', 'order', 'translationKo']) assert.equal(node[key], expected[key], `Golden drift ${expected.id}:${key}`);
    for (const ref of node.sourceRefs) assert.ok(inputIds.has(ref.sourceId), `${node.id}: undeclared sourceRef`);
    if (node.evidenceSupport === 'direct') {
      assert.equal(node.provenanceStatus, 'parsed-source');
      assert.equal(node.sourceNodeId, node.id);
      assert.ok(node.sourceText?.trim());
      assert.ok(node.sourceRefs.length > 0);
    } else if (node.evidenceSupport === 'combined') {
      assert.equal(node.provenanceStatus, 'reconciled-source');
      assert.ok(node.sourceNodeId);
      assert.ok(node.sourceText?.trim());
      assert.ok(node.sourceRefs.length > 0);
    } else {
      assert.equal(node.evidenceSupport, 'legacy-only');
      assert.equal(node.provenanceStatus, 'legacy-approved-snapshot');
      assert.equal(node.sourceNodeId, null);
      assert.equal(node.sourceText, null);
      assert.equal(node.sourceRefs.length, 0);
    }
  });

  const counts = value.senseNodes.reduce((out, node) => {
    if (node.evidenceSupport === 'direct') out.direct += 1;
    if (node.evidenceSupport === 'combined') out.combined += 1;
    if (node.evidenceSupport === 'legacy-only') out.legacyOnly += 1;
    return out;
  }, { direct: 0, combined: 0, legacyOnly: 0 });
  assert.deepEqual(counts, { direct: 22, combined: 3, legacyOnly: 1 });
  assert.deepEqual(value.regeneration.evidenceSupportCounts, counts);

  const legacy = value.senseNodes.find((node) => node.id === '1.2.8');
  assert.equal(legacy.evidenceSupport, 'legacy-only');
  const anomaly = value.senseNodes.find((node) => node.id === '1.2.3');
  assert.equal(anomaly.sourceText, 'trial territory');
  assert.ok(anomaly.observations.includes('SOURCE_TEXT_TRIAL_TERRITORY'));
  for (const id of ['1.5', '1.5.1', '1.5.1.1']) {
    const node = value.senseNodes.find((item) => item.id === id);
    assert.equal(node.evidenceSupport, 'combined');
    assert.equal(node.sourceNodeId, '1.5');
  }

  assert.equal(value.regeneration.baselineGoldenPacketFingerprint, BASELINE);
  assert.equal(value.regeneration.reconciliationId, reconciliation.reconciliationId);
  assert.equal(value.regeneration.reconciliationFingerprint, reconciliation.reconciliationFingerprint);
  assert.equal(value.regeneration.koreanSnapshotFingerprint, sha(golden.map(({ id, translationKo }) => ({ id, translationKo }))));
  assert.equal(value.regeneration.gates.evidenceRegenerationAllowed, true);
  for (const gate of ['candidateGenerationAllowed', 'approvalRegistryWriteAllowed', 'serviceUiWriteAllowed', 'goldenMeaningMutationAllowed']) assert.equal(value.regeneration.gates[gate], false, `${gate} must remain closed`);

  assert.equal(goldenRecord.reviewStatus, value.goldenRegression.expectedDisplayStatus);
  assert.equal(goldenRecord.twot?.entry, value.goldenRegression.expectedTwotEntry);
  assert.equal(goldenRecord.originKo, value.goldenRegression.expectedOriginKo);
  const display = resolveLexiconTranslationDisplayState('H0776');
  assert.equal(display.status, 'ready');
  assert.equal(display.displayAllowed, true);
  assert.equal(normalizeLexiconTranslationStrong('H0776'), 'H776');
  assert.equal(value.packetFingerprint, fingerprint(value, 'packetFingerprint'));
}

verify(packet);
const drift = structuredClone(packet);
drift.senseNodes[0].translationKo = '변경된 번역';
drift.packetFingerprint = fingerprint(drift, 'packetFingerprint');
assert.throws(() => verify(drift), /Golden drift/);
const fabricated = structuredClone(packet);
fabricated.senseNodes.find((node) => node.id === '1.2.8').sourceText = 'fabricated source';
fabricated.packetFingerprint = fingerprint(fabricated, 'packetFingerprint');
assert.throws(() => verify(fabricated));
console.log(`✓ lexicon evidence contract passed · H776 26/26 Korean preserved · support=22 direct + 3 combined + 1 legacy-only · generationAllowed=false · fingerprint=${packet.packetFingerprint}`);
