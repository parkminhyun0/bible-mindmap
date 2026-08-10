#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fingerprint } from './build-h776-parser-adapter.mjs';
import {
  buildOpenScripturesBdbOutput,
  loadOpenScripturesSourceFiles,
  OPENSCRIPTURES_BDB_SOURCE,
} from './build-openscriptures-bdb-adapter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => JSON.parse(fs.readFileSync(path.resolve(ROOT, relativePath), 'utf8'));
const reconciliation = read('data/lexicon/fixtures/GEN-1-1-H776.source-golden-reconciliation.v1.json');
const schema = read('data/lexicon/schemas/SourceGoldenReconciliation.schema.json');
const evidence = read('data/lexicon/fixtures/GEN-1-1-H776.evidence-packet.v2.json');
const input = read('data/lexicon/fixtures/GEN-1-1-H776.openscriptures-source-input.v1.json');

function parseArg(prefix) {
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function writeJson(relativePath, value) {
  const target = path.resolve(ROOT, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

function sameMembers(left, right) {
  if (left.length !== right.length) return false;
  const l = [...left].sort();
  const r = [...right].sort();
  return l.every((value, index) => value === r[index]);
}

function validateSchemaContract() {
  const errors = [];
  const need = (condition, message) => { if (!condition) errors.push(message); };
  need(schema.$schema === 'https://json-schema.org/draft/2020-12/schema', 'reconciliation schema draft mismatch');
  need(schema.additionalProperties === false, 'reconciliation schema must reject additional properties');
  need(String(schema.$id || '').endsWith('/SourceGoldenReconciliation.schema.json'), 'reconciliation schema id mismatch');
  for (const key of ['source', 'golden', 'sourceMappings', 'legacyRetained', 'observations', 'invariants', 'gates', 'reconciliationFingerprint']) {
    need(schema.required?.includes(key), `reconciliation schema required field missing: ${key}`);
  }
  return errors;
}

function validateReconciliation(output, sourceMapping) {
  const errors = [];
  const need = (condition, message) => { if (!condition) errors.push(message); };
  const sourceNodeIds = output.nodes.map((node) => node.id);
  const mappedSourceNodeIds = reconciliation.sourceMappings.map((entry) => entry.sourceNodeId);
  const goldenNodeIds = evidence.senseNodes.map((node) => node.id);
  const coveredGoldenNodeIds = [
    ...reconciliation.sourceMappings.flatMap((entry) => entry.goldenNodeIds),
    ...reconciliation.legacyRetained.map((entry) => entry.goldenNodeId),
  ];

  need(reconciliation.reconciliationFingerprint === fingerprint(reconciliation, 'reconciliationFingerprint'), 'reconciliation fingerprint mismatch');
  need(evidence.packetFingerprint === fingerprint(evidence, 'packetFingerprint'), 'regenerated Evidence Packet fingerprint mismatch');
  need(reconciliation.status === 'reviewed-structural', 'reconciliation status mismatch');
  need(reconciliation.processingMode === 'regression-only', 'reconciliation processing mode mismatch');

  need(reconciliation.source.sourceId === OPENSCRIPTURES_BDB_SOURCE.sourceId, 'reconciliation sourceId mismatch');
  need(reconciliation.source.sourceCommit === OPENSCRIPTURES_BDB_SOURCE.commit, 'reconciliation source commit mismatch');
  need(reconciliation.source.sourceFingerprint === OPENSCRIPTURES_BDB_SOURCE.aggregateFingerprint, 'reconciliation source fingerprint mismatch');
  need(reconciliation.source.lexicalEntryId === sourceMapping.lexicalEntryId, 'reconciliation LexicalIndex entry mismatch');
  need(reconciliation.source.sourceEntryId === sourceMapping.bdbEntryId, 'reconciliation BDB entry mismatch');
  need(reconciliation.source.nodeCount === output.summary.nodeCount, 'reconciliation source nodeCount mismatch');
  need(reconciliation.source.maxDepth === output.summary.maxDepth, 'reconciliation source maxDepth mismatch');

  need(reconciliation.golden.referenceCase === evidence.goldenRegression.referenceCase, 'reconciliation Golden reference mismatch');
  need(reconciliation.golden.packetId === evidence.packetId, 'reconciliation Golden packetId mismatch');
  need(reconciliation.golden.packetFingerprint === evidence.regeneration?.baselineGoldenPacketFingerprint, 'reconciliation Golden baseline fingerprint mismatch');
  need(reconciliation.golden.nodeCount === evidence.senseNodes.length, 'reconciliation Golden nodeCount mismatch');
  need(reconciliation.golden.maxDepth === evidence.goldenRegression.expectedMaxDepth, 'reconciliation Golden maxDepth mismatch');

  need(new Set(mappedSourceNodeIds).size === mappedSourceNodeIds.length, 'duplicate source mapping detected');
  need(sameMembers(mappedSourceNodeIds, sourceNodeIds), 'not all deterministic source nodes are accounted exactly once');
  need(new Set(coveredGoldenNodeIds).size === coveredGoldenNodeIds.length, 'duplicate Golden coverage detected');
  need(sameMembers(coveredGoldenNodeIds, goldenNodeIds), 'not all Golden nodes are accounted exactly once');

  const exactMappings = reconciliation.sourceMappings.filter((entry) => entry.relation === 'exact-id');
  need(exactMappings.length === 22, 'exact mapping count mismatch');
  exactMappings.forEach((entry) => {
    need(entry.goldenNodeIds.length === 1 && entry.goldenNodeIds[0] === entry.sourceNodeId, `exact mapping mismatch: ${entry.sourceNodeId}`);
    need(entry.sourceSupport === 'direct-node', `exact mapping source support mismatch: ${entry.sourceNodeId}`);
    need(entry.translationPolicy === 'preserve-approved-korean', `translation policy mismatch: ${entry.sourceNodeId}`);
  });

  const subtreeMappings = reconciliation.sourceMappings.filter((entry) => entry.relation === 'one-source-to-golden-subtree');
  need(subtreeMappings.length === 1, 'subtree mapping count mismatch');
  need(subtreeMappings[0]?.sourceNodeId === '1.5', 'subtree mapping source must be 1.5');
  need(JSON.stringify(subtreeMappings[0]?.goldenNodeIds) === JSON.stringify(['1.5', '1.5.1', '1.5.1.1']), 'source 1.5 Golden subtree mismatch');
  need(subtreeMappings[0]?.sourceSupport === 'combined-node', 'source 1.5 support must be combined-node');

  need(reconciliation.legacyRetained.length === 1, 'legacy retained count mismatch');
  const legacy = reconciliation.legacyRetained[0];
  need(legacy?.goldenNodeId === '1.2.8', 'legacy retained node must be 1.2.8');
  need(legacy?.mappedSourceNodeId === null, 'legacy retained 1.2.8 must not claim primary source support');
  need(legacy?.evidencePolicy === 'legacy-approved-snapshot-only', 'legacy retained evidence policy mismatch');
  need(legacy?.requiresSecondaryEvidenceBeforeMeaningChange === true, 'legacy retained secondary evidence gate missing');

  const anomaly = reconciliation.observations.find((entry) => entry.code === 'SOURCE_TEXT_TRIAL_TERRITORY');
  need(anomaly?.sourceNodeId === '1.2.3', 'trial territory observation source mismatch');
  need(anomaly?.status === 'open-reviewed', 'trial territory observation status mismatch');
  need(anomaly?.blocksEvidenceRegeneration === false, 'trial territory must not block evidence regeneration');
  need(anomaly?.blocksCandidateGeneration === true, 'trial territory must continue blocking candidate generation');
  need(output.nodes.find((node) => node.id === '1.2.3')?.sourceText.includes('trial territory'), 'pinned source trial territory text not reproduced');

  const coalesced = reconciliation.observations.find((entry) => entry.code === 'SOURCE_NODE_1_5_COALESCES_GOLDEN_DESCENDANTS');
  need(coalesced?.status === 'resolved-structural', 'source 1.5 structural observation not resolved');
  const source15 = output.nodes.find((node) => node.id === '1.5')?.sourceText || '';
  need(source15.includes('lands') && source15.includes('countries') && source15.includes('Canaan'), 'source 1.5 combined evidence not reproduced');

  need(reconciliation.invariants.allSourceNodesAccounted === true, 'allSourceNodesAccounted invariant missing');
  need(reconciliation.invariants.allGoldenNodesAccounted === true, 'allGoldenNodesAccounted invariant missing');
  need(reconciliation.invariants.sourceOnlyNodeCount === 0, 'sourceOnlyNodeCount must remain zero');
  need(reconciliation.invariants.droppedGoldenNodeCount === 0, 'droppedGoldenNodeCount must remain zero');
  need(reconciliation.invariants.syntheticSourceNodesAllowed === false, 'synthetic source nodes must remain forbidden');
  need(reconciliation.invariants.goldenPacketFingerprintPreserved === true, 'Golden packet fingerprint preservation invariant missing');

  need(reconciliation.gates.evidenceRegenerationAllowed === true, 'evidence regeneration was not unlocked');
  need(reconciliation.gates.candidateGenerationAllowed === false, 'candidate generation unexpectedly enabled');
  need(reconciliation.gates.approvalRegistryWriteAllowed === false, 'Approval Registry write unexpectedly enabled');
  need(reconciliation.gates.serviceUiWriteAllowed === false, 'service/UI write unexpectedly enabled');
  need(reconciliation.gates.goldenMeaningMutationAllowed === false, 'Golden meaning mutation unexpectedly enabled');
  return errors;
}

const bdbPath = parseArg('--bdb=') || '.cache/lexicon/openscriptures/BrownDriverBriggs.xml';
const indexPath = parseArg('--index=') || '.cache/lexicon/openscriptures/LexicalIndex.xml';
const sourceFiles = loadOpenScripturesSourceFiles({ bdbPath, indexPath });
const { output, mapping } = buildOpenScripturesBdbOutput(input, sourceFiles);
const errors = [...validateSchemaContract(), ...validateReconciliation(output, mapping)];
if (errors.length) {
  console.error(`✗ H776 source-to-Golden reconciliation failed · errors=${errors.length}`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

const report = {
  schemaVersion: 1,
  reportId: 'GEN-1-1-H776-SOURCE-GOLDEN-RECONCILIATION-VERIFY',
  reconciliationId: reconciliation.reconciliationId,
  reconciliationFingerprint: reconciliation.reconciliationFingerprint,
  sourceOutputFingerprint: output.outputFingerprint,
  baselineGoldenPacketFingerprint: reconciliation.golden.packetFingerprint,
  regeneratedPacketFingerprint: evidence.packetFingerprint,
  sourceNodeCount: output.summary.nodeCount,
  goldenNodeCount: evidence.senseNodes.length,
  exactMappingCount: reconciliation.sourceMappings.filter((entry) => entry.relation === 'exact-id').length,
  subtreeMappingCount: reconciliation.sourceMappings.filter((entry) => entry.relation === 'one-source-to-golden-subtree').length,
  legacyRetainedCount: reconciliation.legacyRetained.length,
  openObservationCodes: reconciliation.observations.filter((entry) => entry.status === 'open-reviewed').map((entry) => entry.code),
  gates: structuredClone(reconciliation.gates),
  reportFingerprint: '',
};
report.reportFingerprint = fingerprint(report, 'reportFingerprint');
const reportTarget = parseArg('--write-report=');
if (reportTarget) writeJson(reportTarget, report);
console.log(`✓ H776 source-to-Golden reconciliation passed · source=23 · Golden=26 · exact=22 · subtree=1 · legacyRetained=1 · baselinePreserved=true · evidenceRegenerationAllowed=true · candidateGenerationAllowed=false`);
