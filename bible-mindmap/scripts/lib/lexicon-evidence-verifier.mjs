import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/;
const STRONG_PATTERN = /^([HG])([1-9][0-9]*)([a-z]?)$/;
const NODE_ID_PATTERN = /^[1-9][0-9]*(?:\.[1-9][0-9]*)*$/;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_TRACK_STATE_PATH = path.resolve(HERE, '../../../docs/lexicon-workflow/TRACK_STATE.json');
const PHASE_GATE_KEYS = ['candidateGenerationAllowed', 'approvalRegistryPromotionAllowed', 'serviceUiWriteAllowed'];

export function readPhaseGate(trackStatePath = DEFAULT_TRACK_STATE_PATH) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(trackStatePath, 'utf8'));
  } catch (error) {
    throw new Error(`phase gate read failed at ${trackStatePath} (fail-closed): ${error.message}`);
  }
  // currentPhaseGate is the mutable execution SSOT. p3_5_independentAudit is
  // retained only as a backward-compatible fallback for older checkpoints.
  const source = raw?.currentPhaseGate ?? raw?.p3_5_independentAudit;
  assert.ok(source && typeof source === 'object', 'TRACK_STATE.json must expose currentPhaseGate (or legacy p3_5_independentAudit) as phase-gate SSOT');
  const gate = {};
  for (const key of PHASE_GATE_KEYS) {
    assert.equal(typeof source[key], 'boolean', `TRACK_STATE phase gate ${key} must be boolean`);
    gate[key] = source[key];
  }
  return Object.freeze(gate);
}

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function sha256Canonical(value) {
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex')}`;
}

export function fingerprintWithout(value, key) {
  const copy = structuredClone(value);
  delete copy[key];
  return sha256Canonical(copy);
}

export function normalizeStrong(value) {
  const match = String(value || '').trim().match(/^([GHgh])0*(\d+)([A-Za-z]?)$/);
  if (!match || Number(match[2]) < 1) return String(value || '').trim().toUpperCase();
  return `${match[1].toUpperCase()}${Number(match[2])}${match[3].toLowerCase()}`;
}

function nonEmpty(value, label) {
  assert.equal(typeof value, 'string', `${label} must be a string`);
  assert.ok(value.trim(), `${label} must not be empty`);
}

function uniqueStrings(values, label) {
  assert.ok(Array.isArray(values), `${label} must be an array`);
  assert.equal(new Set(values).size, values.length, `${label} must be unique`);
}

function sameSet(actual, expected, label) {
  assert.deepEqual([...actual].sort(), [...expected].sort(), label);
}

function automaticSourceReady(source) {
  return Boolean(
    source
      && source.workflow?.status === 'approved-ready'
      && source.workflow?.autoProcessingAllowed === true
      && source.license?.status === 'approved'
      && source.license?.derivativeAllowed === true
      && source.license?.redistributionAllowed === true
      && source.license?.externalLlmInputAllowed === true
      && source.license?.fullTextStorageAllowed === true
      && SHA256_PATTERN.test(source.provenance?.contentHash || ''),
  );
}

function verifyIdentity(identity, registryById) {
  assert.equal(identity?.schemaVersion, 1, 'Strong identity schemaVersion must be 1');
  const canonicalStrong = normalizeStrong(identity?.canonicalStrong);
  assert.match(canonicalStrong, STRONG_PATTERN, 'canonicalStrong must be normalized Strong/Extended Strong');
  assert.equal(identity.identityId, canonicalStrong, 'identityId must equal canonicalStrong');

  const match = canonicalStrong.match(STRONG_PATTERN);
  const baseStrong = `${match[1]}${match[2]}`;
  const suffix = match[3] || null;
  assert.equal(identity.baseStrong, baseStrong, 'baseStrong must match canonicalStrong base');
  assert.equal(identity.disambiguationSuffix, suffix, 'disambiguationSuffix must match canonicalStrong suffix');
  assert.equal(identity.namespace, suffix ? 'extended-strong' : 'strong', 'namespace must match Strong suffix');
  assert.equal(identity.testament, match[1] === 'H' ? 'old-testament' : 'new-testament', 'testament must match Strong namespace');
  if (match[1] === 'G') assert.equal(identity.language, 'greek', 'Greek Strong must use greek language');
  if (match[1] === 'H') assert.ok(['hebrew', 'aramaic'].includes(identity.language), 'Hebrew Strong must use hebrew/aramaic language');

  nonEmpty(identity.lemma, 'identity.lemma');
  assert.equal(identity.lemmaNormalized, identity.lemma.normalize('NFC'), 'lemmaNormalized must be NFC');
  nonEmpty(identity.transliteration?.scientific, 'identity.transliteration.scientific');
  if (identity.transliteration?.korean !== null) nonEmpty(identity.transliteration?.korean, 'identity.transliteration.korean');
  nonEmpty(identity.partOfSpeech?.code, 'identity.partOfSpeech.code');
  nonEmpty(identity.partOfSpeech?.labelEn, 'identity.partOfSpeech.labelEn');
  if (identity.partOfSpeech?.labelKo !== null) nonEmpty(identity.partOfSpeech?.labelKo, 'identity.partOfSpeech.labelKo');

  uniqueStrings(identity.sourceForms, 'identity.sourceForms');
  assert.ok(identity.sourceForms.length > 0, 'identity.sourceForms must not be empty');
  for (const form of identity.sourceForms) {
    assert.equal(normalizeStrong(form), canonicalStrong, `source form ${form} must normalize to ${canonicalStrong}`);
  }

  assert.ok(Array.isArray(identity.sourceRefs) && identity.sourceRefs.length > 0, 'identity.sourceRefs must not be empty');
  for (const ref of identity.sourceRefs) {
    assert.ok(registryById.has(ref.sourceId), `identity references unregistered source ${ref.sourceId}`);
    nonEmpty(ref.locator, `identity source locator ${ref.sourceId}`);
  }

  assert.match(identity.identityFingerprint || '', SHA256_PATTERN, 'identityFingerprint must be sha256');
  assert.equal(identity.identityFingerprint, fingerprintWithout(identity, 'identityFingerprint'), 'identityFingerprint drift');
  return canonicalStrong;
}

function verifySenseTree(packet, inputIds) {
  assert.ok(Array.isArray(packet.senseNodes) && packet.senseNodes.length > 0, 'senseNodes must not be empty');
  const byId = new Map();
  const legacyNodes = [];

  packet.senseNodes.forEach((node, index) => {
    assert.match(node.id || '', NODE_ID_PATTERN, `invalid sense node id ${node.id}`);
    assert.ok(!byId.has(node.id), `duplicate sense node ${node.id}`);
    assert.equal(node.order, index + 1, `${node.id}: order must be deterministic`);
    assert.equal(Number.isInteger(node.depth) && node.depth >= 0, true, `${node.id}: depth must be a non-negative integer`);

    if (node.parentId === null) {
      assert.equal(node.depth, 0, `${node.id}: root depth must be 0`);
    } else {
      assert.match(node.parentId || '', NODE_ID_PATTERN, `${node.id}: invalid parentId`);
      const parent = byId.get(node.parentId);
      assert.ok(parent, `${node.id}: parent must appear before child`);
      assert.equal(node.depth, parent.depth + 1, `${node.id}: depth must equal parent depth + 1`);
      assert.ok(node.id.startsWith(`${node.parentId}.`), `${node.id}: id must descend from parentId`);
    }

    if (node.translationKo !== null) nonEmpty(node.translationKo, `${node.id}.translationKo`);
    assert.ok(Array.isArray(node.observations), `${node.id}: observations must be an array`);
    uniqueStrings(node.observations, `${node.id}.observations`);
    assert.ok(Array.isArray(node.sourceRefs), `${node.id}: sourceRefs must be an array`);
    for (const ref of node.sourceRefs) {
      assert.ok(inputIds.has(ref.sourceId), `${node.id}: undeclared sourceRef ${ref.sourceId}`);
      nonEmpty(ref.locator, `${node.id}: source locator`);
    }

    if (node.evidenceSupport === 'direct') {
      assert.equal(node.provenanceStatus, 'parsed-source', `${node.id}: direct evidence must be parsed-source`);
      assert.match(node.sourceNodeId || '', NODE_ID_PATTERN, `${node.id}: direct evidence needs sourceNodeId`);
      nonEmpty(node.sourceText, `${node.id}.sourceText`);
      assert.ok(node.sourceRefs.length > 0, `${node.id}: direct evidence needs sourceRefs`);
    } else if (node.evidenceSupport === 'combined') {
      assert.equal(node.provenanceStatus, 'reconciled-source', `${node.id}: combined evidence must be reconciled-source`);
      assert.match(node.sourceNodeId || '', NODE_ID_PATTERN, `${node.id}: combined evidence needs sourceNodeId`);
      nonEmpty(node.sourceText, `${node.id}.sourceText`);
      assert.ok(node.sourceRefs.length > 0, `${node.id}: combined evidence needs sourceRefs`);
    } else {
      assert.equal(node.evidenceSupport, 'legacy-only', `${node.id}: unsupported evidenceSupport`);
      assert.equal(packet.packetType, 'golden-reference', `${node.id}: legacy-only is regression-only`);
      assert.equal(packet.processingMode, 'regression-only', `${node.id}: legacy-only is regression-only`);
      assert.equal(node.provenanceStatus, 'legacy-approved-snapshot', `${node.id}: legacy-only provenance mismatch`);
      assert.equal(node.sourceNodeId, null, `${node.id}: legacy-only sourceNodeId must be null`);
      assert.equal(node.sourceText, null, `${node.id}: legacy-only sourceText must be null`);
      assert.equal(node.sourceRefs.length, 0, `${node.id}: legacy-only sourceRefs must be empty`);
      legacyNodes.push(node.id);
    }
    byId.set(node.id, node);
  });

  assert.ok(Array.isArray(packet.normalizedSenseClusters) && packet.normalizedSenseClusters.length > 0, 'normalizedSenseClusters must not be empty');
  const clusterIds = new Set();
  for (const cluster of packet.normalizedSenseClusters) {
    assert.ok(!clusterIds.has(cluster.clusterId), `duplicate cluster ${cluster.clusterId}`);
    clusterIds.add(cluster.clusterId);
    assert.ok(cluster.clusterId.startsWith(`${packet.identity.canonicalStrong}-S`), `cluster ${cluster.clusterId} must use packet Strong`);
    nonEmpty(cluster.labelKo, `${cluster.clusterId}.labelKo`);
    uniqueStrings(cluster.memberNodeIds, `${cluster.clusterId}.memberNodeIds`);
    assert.ok(cluster.memberNodeIds.length > 0, `${cluster.clusterId} must contain members`);
    for (const nodeId of cluster.memberNodeIds) assert.ok(byId.has(nodeId), `${cluster.clusterId}: unknown node ${nodeId}`);
  }

  return { byId, legacyNodes };
}

export function verifyLexiconEvidencePacket(packet, registry, options = {}) {
  // Phase gate SSOT is TRACK_STATE.json, not the caller (M2 from P3.5 audit).
  // Tests can point at a fixture TRACK_STATE via options.trackStatePath, but
  // the value itself is never caller-provided; the file is authoritative.
  // A caller passing candidateGenerationAllowed that disagrees fails closed.
  const phaseGate = readPhaseGate(options.trackStatePath);
  const candidateGenerationAllowed = phaseGate.candidateGenerationAllowed;
  if (options.candidateGenerationAllowed !== undefined
      && options.candidateGenerationAllowed !== candidateGenerationAllowed) {
    throw new Error(
      `caller-provided candidateGenerationAllowed=${options.candidateGenerationAllowed} disagrees with TRACK_STATE=${candidateGenerationAllowed}`,
    );
  }
  assert.ok(packet && typeof packet === 'object' && !Array.isArray(packet), 'Evidence Packet must be an object');
  assert.equal(packet.schemaVersion, 2, 'Evidence Packet schemaVersion must be 2');
  nonEmpty(packet.packetId, 'packetId');
  assert.ok(['generation', 'golden-reference'].includes(packet.packetType), 'invalid packetType');
  assert.ok(['candidate-generation', 'regression-only'].includes(packet.processingMode), 'invalid processingMode');
  assert.ok(['source-ready', 'blocked-license', 'golden-reference-fixture'].includes(packet.status), 'invalid status');
  assert.equal(packet.sourceRegistryPolicyVersion, registry.policyVersion, 'source registry policy drift');

  const registryById = new Map(registry.sources.map((source) => [source.sourceId, source]));
  assert.equal(registryById.size, registry.sources.length, 'source registry IDs must be unique');
  const canonicalStrong = verifyIdentity(packet.identity, registryById);

  assert.ok(Array.isArray(packet.sourceInputs) && packet.sourceInputs.length > 0, 'sourceInputs must not be empty');
  const inputIds = new Set();
  const approvedIds = [];
  const restrictedIds = [];
  let allAutomaticInputsApproved = true;

  for (const input of packet.sourceInputs) {
    assert.ok(!inputIds.has(input.sourceId), `duplicate source input ${input.sourceId}`);
    inputIds.add(input.sourceId);
    const source = registryById.get(input.sourceId);
    assert.ok(source, `unregistered source input ${input.sourceId}`);
    assert.equal(input.registryWorkflowStatus, source.workflow?.status, `${input.sourceId}: registry workflow status drift`);
    uniqueStrings(input.locators, `${input.sourceId}.locators`);
    assert.ok(input.locators.length > 0, `${input.sourceId}.locators must not be empty`);

    if (input.usagePolicy === 'automatic-evidence') {
      const ready = automaticSourceReady(source);
      allAutomaticInputsApproved &&= ready;
      assert.equal(ready, true, `${input.sourceId}: automatic evidence source is not license/fingerprint ready`);
      assert.equal(input.sourceFingerprint, source.provenance.contentHash, `${input.sourceId}: source fingerprint drift`);
      approvedIds.push(input.sourceId);
    } else {
      assert.equal(input.usagePolicy, 'legacy-regression-only', `${input.sourceId}: invalid usagePolicy`);
      assert.equal(packet.processingMode, 'regression-only', `${input.sourceId}: legacy source cannot enter candidate generation`);
      restrictedIds.push(input.sourceId);
    }
  }

  sameSet(packet.licenseSummary.approvedSources, approvedIds, 'licenseSummary.approvedSources drift');
  sameSet(packet.licenseSummary.restrictedSources, restrictedIds, 'licenseSummary.restrictedSources drift');
  assert.equal(packet.licenseSummary.allAutomaticInputsApproved, allAutomaticInputsApproved, 'allAutomaticInputsApproved drift');
  const generationLicensed = allAutomaticInputsApproved && restrictedIds.length === 0;
  const expectedGenerationAllowed = Boolean(candidateGenerationAllowed && packet.processingMode === 'candidate-generation' && generationLicensed);
  assert.equal(packet.licenseSummary.newGenerationAllowed, expectedGenerationAllowed, 'newGenerationAllowed must obey current phase + license gate');

  if (packet.packetType === 'golden-reference') {
    assert.equal(packet.processingMode, 'regression-only', 'golden reference must be regression-only');
    assert.equal(packet.status, 'golden-reference-fixture', 'golden reference status mismatch');
    assert.ok(packet.regeneration && typeof packet.regeneration === 'object', 'golden reference requires regeneration metadata');
    assert.ok(packet.goldenRegression && typeof packet.goldenRegression === 'object', 'golden reference requires goldenRegression metadata');
    assert.equal(packet.licenseSummary.newGenerationAllowed, false, 'golden reference cannot enable generation');
  } else {
    assert.equal(packet.processingMode, 'candidate-generation', 'generation packet must use candidate-generation mode');
    assert.ok(['source-ready', 'blocked-license'].includes(packet.status), 'generation packet status mismatch');
    assert.equal(packet.regeneration, null, 'generation packet must not carry H776 regeneration metadata');
    assert.equal(packet.goldenRegression, null, 'generation packet must not carry Golden regression metadata');
  }

  verifySenseTree(packet, inputIds);

  assert.ok(Array.isArray(packet.representativeContexts) && packet.representativeContexts.length > 0, 'representativeContexts must not be empty');
  for (const context of packet.representativeContexts) {
    assert.match(context.reference || '', /^[A-Z0-9]{3}\.\d+\.\d+$/, `invalid context reference ${context.reference}`);
    nonEmpty(context.surface, `${context.reference}.surface`);
    nonEmpty(context.lemma, `${context.reference}.lemma`);
    assert.equal(context.lemma.normalize('NFC'), packet.identity.lemmaNormalized, `${context.reference}: context lemma mismatch`);
    nonEmpty(context.recommendedGlossKo, `${context.reference}.recommendedGlossKo`);
    uniqueStrings(context.sourceIds, `${context.reference}.sourceIds`);
    assert.ok(context.sourceIds.length > 0, `${context.reference}: sourceIds must not be empty`);
    for (const sourceId of context.sourceIds) assert.ok(inputIds.has(sourceId), `${context.reference}: undeclared source ${sourceId}`);
  }

  assert.match(packet.packetFingerprint || '', SHA256_PATTERN, 'packetFingerprint must be sha256');
  assert.equal(packet.packetFingerprint, fingerprintWithout(packet, 'packetFingerprint'), `${canonicalStrong}: packetFingerprint drift`);

  return {
    canonicalStrong,
    sourceCount: inputIds.size,
    senseCount: packet.senseNodes.length,
    legacyOnlyCount: packet.senseNodes.filter((node) => node.evidenceSupport === 'legacy-only').length,
    generationLicensed,
    candidateGenerationAllowed: expectedGenerationAllowed,
  };
}
