#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fingerprintWithout,
  readPhaseGate,
  verifyLexiconEvidencePacket,
} from './lib/lexicon-evidence-verifier.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
const registry = read('data/lexicon/source-registry.json');
const h776 = read('data/lexicon/fixtures/GEN-1-1-H776.evidence-packet.v2.json');

// Phase gate SSOT is TRACK_STATE.json. Caller must not decide.
const PHASE_GATE = readPhaseGate();
assert.equal(PHASE_GATE.candidateGenerationAllowed, false,
  'P4 gate: candidateGenerationAllowed must be false until human-approved TRACK_STATE flip');

function withIdentityFingerprint(identity) {
  const value = structuredClone(identity);
  value.identityFingerprint = fingerprintWithout(value, 'identityFingerprint');
  return value;
}

function withPacketFingerprint(packet) {
  const value = structuredClone(packet);
  value.packetFingerprint = fingerprintWithout(value, 'packetFingerprint');
  return value;
}

function buildArbitraryStrongContractProbe() {
  const source = registry.sources.find((item) => item.sourceId === 'openscriptures-hebrewlexicon-bdb');
  assert.ok(source, 'OpenScriptures BDB source missing');
  const identity = withIdentityFingerprint({
    schemaVersion: 1,
    identityId: 'H1254',
    sourceForms: ['H1254', 'H01254'],
    canonicalStrong: 'H1254',
    baseStrong: 'H1254',
    disambiguationSuffix: null,
    namespace: 'strong',
    testament: 'old-testament',
    language: 'hebrew',
    lemma: 'בָּרָא',
    lemmaNormalized: 'בָּרָא'.normalize('NFC'),
    transliteration: { scientific: 'bārāʾ', korean: '바라' },
    partOfSpeech: { code: 'V', labelEn: 'verb', labelKo: '동사' },
    sourceRefs: [{ sourceId: source.sourceId, locator: 'contract-probe:H1254' }],
    identityFingerprint: 'sha256:placeholder',
  });

  return withPacketFingerprint({
    schemaVersion: 2,
    packetId: 'CONTRACT-PROBE-H1254',
    packetType: 'generation',
    processingMode: 'candidate-generation',
    status: 'source-ready',
    sourceRegistryPolicyVersion: registry.policyVersion,
    identity,
    sourceInputs: [{
      sourceId: source.sourceId,
      registryWorkflowStatus: source.workflow.status,
      usagePolicy: 'automatic-evidence',
      sourceFingerprint: source.provenance.contentHash,
      locators: ['contract-probe:H1254'],
    }],
    senseNodes: [{
      id: '1',
      parentId: null,
      depth: 0,
      order: 1,
      sourceText: 'contract probe source text',
      translationKo: '계약 검증용 자리표시자',
      provenanceStatus: 'parsed-source',
      evidenceSupport: 'direct',
      sourceNodeId: '1',
      observations: [],
      sourceRefs: [{ sourceId: source.sourceId, locator: 'contract-probe:H1254/sense[1]' }],
    }],
    normalizedSenseClusters: [{
      clusterId: 'H1254-S1',
      labelKo: '계약 검증용',
      memberNodeIds: ['1'],
    }],
    representativeContexts: [{
      reference: 'GEN.1.1',
      surface: 'בָּרָא',
      lemma: 'בָּרָא',
      recommendedGlossKo: '검증용',
      sourceIds: [source.sourceId],
    }],
    licenseSummary: {
      allAutomaticInputsApproved: true,
      newGenerationAllowed: false,
      approvedSources: [source.sourceId],
      restrictedSources: [],
      notes: 'P3 in-memory arbitrary Strong contract probe only; candidate generation remains disabled.',
    },
    regeneration: null,
    goldenRegression: null,
    packetFingerprint: 'sha256:placeholder',
  });
}

const h776Result = verifyLexiconEvidencePacket(h776, registry);
assert.equal(h776Result.canonicalStrong, 'H776');
assert.equal(h776Result.candidateGenerationAllowed, false);
assert.equal(h776Result.legacyOnlyCount, 1);

const arbitrary = buildArbitraryStrongContractProbe();
const arbitraryResult = verifyLexiconEvidencePacket(arbitrary, registry);
assert.equal(arbitraryResult.canonicalStrong, 'H1254');
assert.equal(arbitraryResult.candidateGenerationAllowed, false);
assert.equal(arbitraryResult.legacyOnlyCount, 0);

const identityDrift = structuredClone(arbitrary);
identityDrift.identity.lemma = 'שָׁנָה';
identityDrift.packetFingerprint = fingerprintWithout(identityDrift, 'packetFingerprint');
assert.throws(() => verifyLexiconEvidencePacket(identityDrift, registry), /lemmaNormalized|identityFingerprint/);

const fingerprintDrift = structuredClone(h776);
fingerprintDrift.sourceInputs[0].sourceFingerprint = `sha256:${'0'.repeat(64)}`;
fingerprintDrift.packetFingerprint = fingerprintWithout(fingerprintDrift, 'packetFingerprint');
assert.throws(() => verifyLexiconEvidencePacket(fingerprintDrift, registry), /source fingerprint drift/);

const undeclaredProvenance = structuredClone(h776);
undeclaredProvenance.senseNodes[0].sourceRefs = [{ sourceId: 'openscriptures-strongs', locator: 'fabricated' }];
undeclaredProvenance.packetFingerprint = fingerprintWithout(undeclaredProvenance, 'packetFingerprint');
assert.throws(() => verifyLexiconEvidencePacket(undeclaredProvenance, registry), /undeclared sourceRef/);

const generationEscape = structuredClone(arbitrary);
generationEscape.licenseSummary.newGenerationAllowed = true;
generationEscape.packetFingerprint = fingerprintWithout(generationEscape, 'packetFingerprint');
assert.throws(() => verifyLexiconEvidencePacket(generationEscape, registry), /current phase \+ license gate/);

const legacyInGeneration = structuredClone(arbitrary);
legacyInGeneration.senseNodes[0] = {
  ...legacyInGeneration.senseNodes[0],
  sourceText: null,
  provenanceStatus: 'legacy-approved-snapshot',
  evidenceSupport: 'legacy-only',
  sourceNodeId: null,
  sourceRefs: [],
};
legacyInGeneration.packetFingerprint = fingerprintWithout(legacyInGeneration, 'packetFingerprint');
assert.throws(() => verifyLexiconEvidencePacket(legacyInGeneration, registry), /legacy-only is regression-only/);

const packetFingerprintDrift = structuredClone(h776);
packetFingerprintDrift.packetFingerprint = `sha256:${'f'.repeat(64)}`;
assert.throws(() => verifyLexiconEvidencePacket(packetFingerprintDrift, registry), /packetFingerprint drift/);

// P3.5 M2 regression: caller MUST NOT be able to bypass the phase gate.
// Passing candidateGenerationAllowed=true while TRACK_STATE says false must fail closed.
assert.throws(
  () => verifyLexiconEvidencePacket(h776, registry, { candidateGenerationAllowed: true }),
  /disagrees with TRACK_STATE/,
);

console.log(
  `✓ generic lexicon evidence verifier passed · H776 regression=${h776Result.senseCount} nodes · arbitrary Strong probe=${arbitraryResult.canonicalStrong} · candidateGenerationAllowed=${PHASE_GATE.candidateGenerationAllowed} (SSOT: TRACK_STATE)`,
);
