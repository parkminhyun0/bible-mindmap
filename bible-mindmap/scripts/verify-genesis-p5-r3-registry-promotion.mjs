#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fingerprintWithout } from './lib/lexicon-evidence-verifier.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const TARGETS = ['H430','H1254a','H3117','H7307','H46'];
const REQUIRED_GATES = ['source-fidelity','license','sense-boundary','morphology','regression','korean-naturalness','corpus-alignment','theological-overreach'];
const POLICY_REVIEWER = { reviewerId: 'lexicon-v4-evidence-and-gate', reviewerType: 'evidence-policy' };

const registry = read('data/lexicon/approval-registry.json');
const evidence = read('reports/genesis-p5-r3-promotion-evidence.json');
const candidateManifest = read('data/lexicon/candidates/genesis-p5/manifest.json');
const geminiInput = read('reports/genesis-p5-r3-gemini-input.json');
const gemini = read('reports/genesis-p5-r3-gemini-dispute-results.json');
const claude = read('reports/genesis-p5-claude-audit-results.json');
const claudeRecheck = read('reports/genesis-p5-claude-audit-recheck-h4325-h46.json');
const candidateShards = ['core-theology-context','high-frequency-general','medium-frequency-general','low-frequency-general']
  .flatMap((name) => read(`data/lexicon/candidates/genesis-p5/${name}.json`).candidates);

assert.equal(evidence.schemaVersion, 1);
assert.equal(evidence.batchId, 'genesis-p5-r3-promotion-v1');
assert.equal(evidence.bundleFingerprint, candidateManifest.bundleFingerprint, 'promotion/candidate manifest fingerprint drift');
assert.deepEqual(new Set(evidence.entries.map((e) => e.strong)), new Set(TARGETS), 'promotion target set drift');

const registryByStrong = new Map(registry.entries.map((e) => [e.identity.canonicalStrong, e]));
const candidateByStrong = new Map(candidateShards.map((c) => [c.sourceStrong, c]));
const inputByStrong = new Map(geminiInput.map((e) => [e.strong, e]));
const geminiByStrong = new Map(gemini.verdicts.map((e) => [e.strong, e]));
const claudeByStrong = new Map(claude.audits.map((e) => [e.strong, e]));
const recheckByStrong = new Map(claudeRecheck.rechecks.map((e) => [e.strong, e]));

function projection(candidate) {
  return candidate.nodes.map((n, index) => {
    const parts = n.sourceNodeId.split('.');
    return {
      id: n.sourceNodeId,
      parentId: parts.length === 1 ? null : parts.slice(0, -1).join('.'),
      depth: parts.length - 1,
      order: index + 1,
      translationKo: n.textKo,
      evidenceSupport: 'direct',
    };
  });
}

for (const packet of evidence.entries) {
  const strong = packet.strong;
  assert.equal(packet.tier, 'R3', `${strong}: tier must be R3`);
  assert.equal(packet.gpt?.verdict, 'PASS', `${strong}: GPT PASS required`);
  assert.equal(packet.claude?.verdict, 'PASS', `${strong}: Claude PASS required`);
  assert.equal(packet.gemini?.verdict, 'PASS', `${strong}: Gemini PASS required`);
  assert.equal(packet.unresolvedThreads, 0, `${strong}: unresolved threads must be zero`);
  assert.equal(packet.disputeRequired, 0, `${strong}: unresolved dispute must be zero`);
  for (const gate of REQUIRED_GATES) assert.equal(packet.gates?.[gate], 'PASS', `${strong}: gate ${gate} must PASS`);
  assert.equal(packet.evidencePacketFingerprint, fingerprintWithout(packet, 'evidencePacketFingerprint'), `${strong}: promotion evidence fingerprint drift`);

  const candidate = candidateByStrong.get(strong);
  const input = inputByStrong.get(strong);
  const approved = registryByStrong.get(strong);
  assert.ok(candidate && input && approved, `${strong}: candidate/input/registry entry required`);
  assert.equal(candidate.risk?.tier, 'R3', `${strong}: candidate tier drift`);
  assert.equal(candidate.candidateFingerprint, packet.candidateFingerprint, `${strong}: candidate fingerprint drift`);
  assert.equal(geminiByStrong.get(strong)?.verdict, 'PASS', `${strong}: pinned Gemini final PASS required`);
  const claudeFinal = strong === 'H46' ? recheckByStrong.get(strong)?.newVerdict : claudeByStrong.get(strong)?.verdict;
  assert.equal(claudeFinal, 'PASS', `${strong}: pinned Claude final PASS required`);

  assert.deepEqual(approved.reviewer, POLICY_REVIEWER, `${strong}: evidence-policy reviewer provenance required`);
  assert.equal(approved.evidencePacketFingerprint, packet.evidencePacketFingerprint, `${strong}: Registry evidence fingerprint drift`);
  assert.equal(approved.identity.lemma, input.lemma, `${strong}: lemma drift`);
  assert.equal(approved.identity.lemmaNormalized, input.lemmaNormalized, `${strong}: normalized lemma drift`);
  assert.equal(approved.identity.transliteration.scientific, input.transliterationScientific, `${strong}: scientific transliteration drift`);
  assert.equal(approved.identity.transliteration.korean, input.transliterationKo, `${strong}: Korean transliteration drift`);
  assert.equal(approved.identity.partOfSpeech.code, input.partOfSpeech, `${strong}: POS drift`);
  assert.equal(approved.identity.sourceRefs[0]?.sourceId, 'openscriptures-hebrewlexicon-bdb', `${strong}: primary source drift`);
  assert.equal(approved.identity.sourceRefs[0]?.locator, input.pairs[0]?.sourceLocator, `${strong}: BDB locator drift`);
  assert.deepEqual(approved.approvedSenseTree, projection(candidate), `${strong}: approved sense tree must exactly project reviewed candidate`);
}

const h776 = registryByStrong.get('H776');
assert.ok(h776, 'H776 golden must remain present');
assert.equal(h776.approvedSenseTree.length, 26, 'H776 golden must remain 26/26');
assert.deepEqual(h776.reviewer, { reviewerId:'parkminhyun0', reviewerType:'human' }, 'H776 reviewer provenance must remain human');

console.log(`✓ Genesis P5 R3 Registry promotion · ${TARGETS.length}/5 exact candidate projections · GPT/Claude/Gemini PASS · unresolved=0 · H776 26/26 preserved`);
