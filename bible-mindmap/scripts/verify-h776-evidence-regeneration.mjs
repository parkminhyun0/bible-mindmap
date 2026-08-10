#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildH776EvidencePacketV2 } from './build-h776-evidence-packet-v2.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TRACKED = 'data/lexicon/fixtures/GEN-1-1-H776.evidence-packet.v2.json';
const read = (relativePath) => JSON.parse(fs.readFileSync(path.resolve(ROOT, relativePath), 'utf8'));

function parseArg(prefix) {
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

const sourceOutputPath = parseArg('--source-output=');
if (!sourceOutputPath) throw new Error('requires --source-output=<json>');

const tracked = read(TRACKED);
const regenerated = buildH776EvidencePacketV2({ sourceOutput: read(sourceOutputPath) });
assert.deepEqual(regenerated, tracked, 'tracked H776 Evidence Packet differs from deterministic regeneration');

const support = regenerated.regeneration.evidenceSupportCounts;
assert.deepEqual(support, { direct: 22, combined: 3, legacyOnly: 1 });
assert.equal(regenerated.senseNodes.find((node) => node.id === '1.2.8').evidenceSupport, 'legacy-only');
assert.equal(regenerated.senseNodes.find((node) => node.id === '1.2.8').sourceText, null);
assert.equal(regenerated.senseNodes.find((node) => node.id === '1.2.3').sourceText, 'trial territory');
assert.ok(regenerated.senseNodes.find((node) => node.id === '1.2.3').observations.includes('SOURCE_TEXT_TRIAL_TERRITORY'));
for (const id of ['1.5', '1.5.1', '1.5.1.1']) {
  const node = regenerated.senseNodes.find((item) => item.id === id);
  assert.equal(node.evidenceSupport, 'combined');
  assert.equal(node.sourceNodeId, '1.5');
}
for (const gate of ['candidateGenerationAllowed', 'approvalRegistryWriteAllowed', 'serviceUiWriteAllowed', 'goldenMeaningMutationAllowed']) {
  assert.equal(regenerated.regeneration.gates[gate], false, `${gate} must remain false`);
}

const report = {
  schemaVersion: 1,
  caseId: 'GEN-1-1-H776',
  status: 'passed',
  packetFingerprint: regenerated.packetFingerprint,
  baselineGoldenPacketFingerprint: regenerated.regeneration.baselineGoldenPacketFingerprint,
  sourceOutputFingerprint: regenerated.regeneration.sourceOutputFingerprint,
  reconciliationFingerprint: regenerated.regeneration.reconciliationFingerprint,
  koreanSnapshotFingerprint: regenerated.regeneration.koreanSnapshotFingerprint,
  evidenceSupportCounts: regenerated.regeneration.evidenceSupportCounts,
  goldenTranslationsPreserved: true,
  candidateGenerationAllowed: false,
};

const writeReport = parseArg('--write-report=');
if (writeReport) {
  const outputPath = path.resolve(ROOT, writeReport);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}
console.log(`✓ H776 Evidence Packet regeneration verified · 22 direct + 3 combined + 1 legacy-only · Korean=26/26 preserved · fingerprint=${regenerated.packetFingerprint}`);
