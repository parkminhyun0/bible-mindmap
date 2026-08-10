#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fingerprint } from './build-h776-parser-adapter.mjs';
import {
  buildOpenScripturesBdbOutput,
  createOpenScripturesBdbAdapter,
  loadOpenScripturesSourceFiles,
  OPENSCRIPTURES_BDB_SOURCE,
} from './build-openscriptures-bdb-adapter.mjs';
import { runLexiconSourceDriver } from './lexicon-source-driver.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => JSON.parse(fs.readFileSync(path.resolve(ROOT, relativePath), 'utf8'));
const input = read('data/lexicon/fixtures/GEN-1-1-H776.openscriptures-source-input.v1.json');
const evidence = read('data/lexicon/fixtures/GEN-1-1-H776.evidence-packet.v2.json');
const registry = read('data/lexicon/source-registry.json');
const diffSchema = read('data/lexicon/schemas/H776SourceTreeDiff.schema.json');

const EXPECTED_ACTUAL_NODE_IDS = Object.freeze([
  '1',
  '1.1', '1.1.1', '1.1.2', '1.1.3',
  '1.2', '1.2.1', '1.2.2', '1.2.3', '1.2.4', '1.2.5', '1.2.6', '1.2.7',
  '1.3', '1.3.1', '1.3.2',
  '1.4', '1.4.1', '1.4.2', '1.4.3', '1.4.4', '1.4.5',
  '1.5',
]);

const EXPECTED_MISSING = Object.freeze([
  Object.freeze({ goldenNodeId: '1.2.8', reason: 'legacy-node-not-present-in-pinned-source', mappedSourceNodeId: null }),
  Object.freeze({ goldenNodeId: '1.5.1', reason: 'legacy-split-of-source-node', mappedSourceNodeId: '1.5' }),
  Object.freeze({ goldenNodeId: '1.5.1.1', reason: 'legacy-split-of-source-node', mappedSourceNodeId: '1.5' }),
]);

function parseArg(prefix) {
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function writeJson(relativePath, value) {
  const target = path.resolve(ROOT, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

function validateSchemaContract() {
  const errors = [];
  const need = (condition, message) => { if (!condition) errors.push(message); };
  need(diffSchema.$schema === 'https://json-schema.org/draft/2020-12/schema', 'diff schema draft mismatch');
  need(diffSchema.additionalProperties === false, 'diff schema must reject additional properties');
  need(String(diffSchema.$id || '').endsWith('/H776SourceTreeDiff.schema.json'), 'diff schema id mismatch');
  for (const key of ['source', 'mapping', 'actualTree', 'goldenTree', 'comparison', 'reportFingerprint']) {
    need(diffSchema.required?.includes(key), `diff schema required field missing: ${key}`);
  }
  return errors;
}

function validateInputContract() {
  const errors = [];
  const need = (condition, message) => { if (!condition) errors.push(message); };
  const source = registry.sources.find((entry) => entry.sourceId === input.source.sourceId);
  need(input.inputFingerprint === fingerprint(input, 'inputFingerprint'), 'source input fingerprint mismatch');
  need(input.processingMode === 'regression-only', 'source input must remain regression-only');
  need(input.parser.mode === 'source-parse', 'source input parser mode mismatch');
  need(source?.workflow?.status === 'approved-ready', 'OpenScriptures source not approved-ready');
  need(source?.workflow?.autoProcessingAllowed === true, 'OpenScriptures auto processing not enabled');
  need(source?.license?.status === 'approved', 'OpenScriptures license not approved');
  need(source?.provenance?.version === OPENSCRIPTURES_BDB_SOURCE.commit, 'OpenScriptures commit mismatch');
  need(source?.provenance?.contentHash === OPENSCRIPTURES_BDB_SOURCE.aggregateFingerprint, 'OpenScriptures aggregate fingerprint mismatch');
  need(input.source.registryWorkflowStatus === source?.workflow?.status, 'source input registry status mismatch');
  need(input.source.sourceFingerprint === source?.provenance?.contentHash, 'source input provenance mismatch');
  need(input.options.emitSourceText === true, 'source input must emit source text');
  need(input.options.allowTranslationSnapshot === false, 'source input cannot carry translation snapshot');
  need(input.goldenReference?.referenceCase === 'GEN-1-1-H776', 'source input golden reference mismatch');
  return errors;
}

function buildDiffReport(output, mapping, sourceFiles) {
  const actualNodeIds = output.nodes.map((node) => node.id);
  const goldenNodeIds = evidence.senseNodes.map((node) => node.id);
  const actualSet = new Set(actualNodeIds);
  const goldenSet = new Set(goldenNodeIds);
  const matchedNodeIds = goldenNodeIds.filter((id) => actualSet.has(id));
  const sourceOnlyNodeIds = actualNodeIds.filter((id) => !goldenSet.has(id));
  const missingGoldenNodes = goldenNodeIds
    .filter((id) => !actualSet.has(id))
    .map((id) => EXPECTED_MISSING.find((entry) => entry.goldenNodeId === id) || {
      goldenNodeId: id,
      reason: 'unclassified-missing-golden-node',
      mappedSourceNodeId: null,
    });

  const report = {
    schemaVersion: 1,
    reportId: 'GEN-1-1-H776-OPENSCRIPTURES-SOURCE-DIFF',
    source: {
      sourceId: OPENSCRIPTURES_BDB_SOURCE.sourceId,
      commit: OPENSCRIPTURES_BDB_SOURCE.commit,
      aggregateFingerprint: OPENSCRIPTURES_BDB_SOURCE.aggregateFingerprint,
      files: sourceFiles.files,
    },
    mapping: {
      canonicalStrong: input.identity.canonicalStrong,
      lexicalEntryId: mapping.lexicalEntryId,
      bdbEntryId: mapping.bdbEntryId,
      lemma: mapping.lemma,
      transliteration: mapping.transliteration,
      partOfSpeech: mapping.partOfSpeech,
      briefDefinition: mapping.briefDefinition,
      twot: mapping.twot,
    },
    actualTree: {
      nodeCount: output.summary.nodeCount,
      rootCount: output.summary.rootCount,
      maxDepth: output.summary.maxDepth,
      outputFingerprint: output.outputFingerprint,
      nodeIds: actualNodeIds,
    },
    goldenTree: {
      nodeCount: evidence.goldenRegression.expectedNodeCount,
      maxDepth: evidence.goldenRegression.expectedMaxDepth,
      packetFingerprint: evidence.packetFingerprint,
      nodeIds: goldenNodeIds,
    },
    comparison: {
      verdict: missingGoldenNodes.length || sourceOnlyNodeIds.length ? 'structural-difference' : 'exact-structure-match',
      matchedNodeCount: matchedNodeIds.length,
      matchedNodeIds,
      sourceOnlyNodeIds,
      missingGoldenNodes,
      maxDepthDelta: output.summary.maxDepth - evidence.goldenRegression.expectedMaxDepth,
      observations: [
        {
          code: 'SOURCE_TEXT_TRIAL_TERRITORY',
          sourceNodeId: '1.2.3',
          severity: 'review-required',
          detail: "Pinned BrownDriverBriggs.xml reads 'trial territory'; no automatic correction or Korean meaning change is authorized.",
        },
        {
          code: 'SOURCE_NODE_1_5_COALESCES_GOLDEN_DESCENDANTS',
          sourceNodeId: '1.5',
          severity: 'informational',
          detail: 'Pinned source has one sense-5 node while the Golden Reference preserves two additional explanatory descendants.',
        },
      ],
      candidateGenerationAllowed: false,
      approvalRegistryWriteAllowed: false,
      goldenMeaningMutationAllowed: false,
    },
    reportFingerprint: '',
  };
  report.reportFingerprint = fingerprint(report, 'reportFingerprint');
  return report;
}

function validateOutputAndReport(output, mapping, report) {
  const errors = [];
  const need = (condition, message) => { if (!condition) errors.push(message); };
  need(mapping.lexicalEntryId === 'bep', 'LexicalIndex entry mismatch');
  need(mapping.bdbEntryId === 'a.fx.aa', 'BDB entry mapping mismatch');
  need(mapping.twot === '167', 'TWOT mapping mismatch');
  need(mapping.transliteration === 'ʾereṣ', 'scientific transliteration mismatch');
  need(output.summary.rootCount === 1, 'actual rootCount mismatch');
  need(output.summary.nodeCount === 23, 'actual nodeCount mismatch');
  need(output.summary.maxDepth === 2, 'actual maxDepth mismatch');
  need(output.nodes.map((node) => node.id).join('|') === EXPECTED_ACTUAL_NODE_IDS.join('|'), 'actual source node order mismatch');
  need(output.nodes.every((node, index) => node.order === index + 1), 'actual source order not contiguous');
  need(output.nodes.every((node) => node.provenanceStatus === 'parsed-source'), 'actual provenance mismatch');
  need(output.nodes.every((node) => node.translationSnapshotKo === null), 'source parse must not carry Korean snapshot');
  need(output.nodes.every((node) => Boolean(node.sourceText?.trim())), 'source parse contains empty source text');
  need(output.outputFingerprint === fingerprint(output, 'outputFingerprint'), 'actual output fingerprint mismatch');
  need(output.nodes.find((node) => node.id === '1.2.3')?.sourceText.includes('trial territory'), 'pinned source observation missing');
  const sense5 = output.nodes.find((node) => node.id === '1.5')?.sourceText || '';
  need(sense5.includes('lands') && sense5.includes('countries') && sense5.includes('Canaan'), 'source sense 1.5 coalesced text mismatch');

  need(report.comparison.verdict === 'structural-difference', 'diff verdict mismatch');
  need(report.comparison.matchedNodeCount === 23, 'matched node count mismatch');
  need(report.comparison.sourceOnlyNodeIds.length === 0, 'unexpected source-only nodes');
  need(JSON.stringify(report.comparison.missingGoldenNodes) === JSON.stringify(EXPECTED_MISSING), 'missing Golden nodes mismatch');
  need(report.comparison.maxDepthDelta === -1, 'maxDepth delta mismatch');
  need(report.comparison.candidateGenerationAllowed === false, 'candidate generation unexpectedly enabled');
  need(report.comparison.approvalRegistryWriteAllowed === false, 'Approval Registry write unexpectedly enabled');
  need(report.comparison.goldenMeaningMutationAllowed === false, 'Golden meaning mutation unexpectedly enabled');
  need(report.reportFingerprint === fingerprint(report, 'reportFingerprint'), 'diff report fingerprint mismatch');
  return errors;
}

function selfTest(sourceFiles) {
  const first = buildOpenScripturesBdbOutput(input, sourceFiles);
  const second = buildOpenScripturesBdbOutput(input, sourceFiles);
  assert.deepEqual(first, second, 'OpenScriptures adapter output must be deterministic');

  const candidate = structuredClone(input);
  candidate.processingMode = 'candidate-generation';
  candidate.goldenReference = null;
  candidate.inputFingerprint = fingerprint(candidate, 'inputFingerprint');
  assert.throws(() => buildOpenScripturesBdbOutput(candidate, sourceFiles), /regression-only/);

  const tamperedIndex = sourceFiles.indexXml.replace('strong="776"', 'strong="7760"');
  assert.throws(() => buildOpenScripturesBdbOutput(input, { ...sourceFiles, indexXml: tamperedIndex }), /not found/);
}

const bdbPath = parseArg('--bdb=') || '.cache/lexicon/openscriptures/BrownDriverBriggs.xml';
const indexPath = parseArg('--index=') || '.cache/lexicon/openscriptures/LexicalIndex.xml';
const sourceFiles = loadOpenScripturesSourceFiles({ bdbPath, indexPath });
const direct = buildOpenScripturesBdbOutput(input, sourceFiles);
const adapter = createOpenScripturesBdbAdapter({ bdbPath, indexPath });
const driven = runLexiconSourceDriver(input, { adapters: [adapter], operation: 'execute' });
const report = buildDiffReport(direct.output, direct.mapping, sourceFiles);
const errors = [
  ...validateSchemaContract(),
  ...validateInputContract(),
  ...validateOutputAndReport(direct.output, direct.mapping, report),
];
if (driven.report.route !== 'source-parser') errors.push('source driver did not select source-parser route');
if (driven.report.selectedAdapterId !== 'openscriptures-bdb-xml-v1') errors.push('source driver adapter selection mismatch');
if (driven.report.decision.executionAllowed !== true) errors.push('source driver execution blocked');
if (driven.report.decision.candidateGenerationAllowed !== false) errors.push('source driver candidate generation unexpectedly enabled');
if (driven.output?.outputFingerprint !== direct.output.outputFingerprint) errors.push('direct/driver output mismatch');
if (errors.length) {
  console.error(`✗ OpenScriptures BDB adapter failed · errors=${errors.length}`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}
selfTest(sourceFiles);

const outputTarget = parseArg('--write-output=');
const reportTarget = parseArg('--write-report=');
const driverTarget = parseArg('--write-driver-report=');
if (outputTarget) writeJson(outputTarget, direct.output);
if (reportTarget) writeJson(reportTarget, report);
if (driverTarget) writeJson(driverTarget, driven.report);
console.log(`✓ OpenScriptures BDB adapter passed · strong=H776 · mapping=bep→a.fx.aa · sourceNodes=23 · goldenNodes=26 · missing=3 · candidateGenerationAllowed=false`);
