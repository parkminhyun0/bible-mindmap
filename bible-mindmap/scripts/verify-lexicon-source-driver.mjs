#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fingerprint } from './build-h776-parser-adapter.mjs';
import {
  DRIVER_BLOCKERS,
  preflightLexiconSourceDriver,
  runLexiconSourceDriver,
} from './lexicon-source-driver.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
const reportSchema = read('data/lexicon/schemas/SourceDriverReport.schema.json');
const policy = read('data/lexicon/source-driver-policy.json');
const registry = read('data/lexicon/source-registry.json');
const input = read('data/lexicon/fixtures/GEN-1-1-H776.parser-input.v1.json');
const evidence = read('data/lexicon/fixtures/GEN-1-1-H776.evidence-packet.v2.json');
const driverSource = fs.readFileSync(path.join(ROOT, 'scripts/lexicon-source-driver.mjs'), 'utf8');
const SHA = /^sha256:[a-f0-9]{64}$/;

function validateReportShape(report) {
  const errors = [];
  const need = (condition, message) => { if (!condition) errors.push(message); };
  need(reportSchema.$schema === 'https://json-schema.org/draft/2020-12/schema', 'report schema draft mismatch');
  need(reportSchema.additionalProperties === false, 'report schema must reject additional properties');
  for (const key of ['driver', 'route', 'selectedAdapterId', 'source', 'decision', 'parserOutputFingerprint', 'reportFingerprint']) {
    need(reportSchema.required?.includes(key), `report required field missing: ${key}`);
  }
  need(report?.schemaVersion === 1, 'report schemaVersion mismatch');
  need(report?.driver?.id === 'lexicon-source-driver', 'driver id mismatch');
  need(report?.driver?.version === policy.driverVersion, 'driver version mismatch');
  need(report?.driver?.policyVersion === policy.policyVersion, 'driver policyVersion mismatch');
  need(['preflight', 'execute'].includes(report?.operation), 'operation invalid');
  need(['legacy-adapter', 'source-parser', 'blocked'].includes(report?.route), 'route invalid');
  need(typeof report?.decision?.executionAllowed === 'boolean', 'executionAllowed missing');
  need(typeof report?.decision?.candidateGenerationAllowed === 'boolean', 'candidateGenerationAllowed missing');
  need(Array.isArray(report?.decision?.blockerCodes), 'blockerCodes missing');
  need(SHA.test(report?.reportFingerprint || ''), 'report fingerprint invalid');
  need(report?.reportFingerprint === fingerprint(report, 'reportFingerprint'), 'report fingerprint mismatch');
  return errors;
}

function makeSourceParseInput(source, processingMode = 'regression-only') {
  const value = structuredClone(input);
  value.requestId = `GEN-1-1-H776-${processingMode.toUpperCase()}`;
  value.parser.mode = 'source-parse';
  value.processingMode = processingMode;
  value.source = {
    sourceId: source.sourceId,
    registryWorkflowStatus: source.workflow.status,
    usagePolicy: 'automatic-evidence',
    sourceFingerprint: source.provenance.contentHash,
    locator: `${source.sourceId}:H776`,
  };
  value.options.emitSourceText = true;
  value.options.allowTranslationSnapshot = false;
  value.goldenReference = processingMode === 'candidate-generation' ? null : value.goldenReference;
  value.inputFingerprint = fingerprint(value, 'inputFingerprint');
  return value;
}

function buildSyntheticOutput(parserInput) {
  const output = {
    schemaVersion: 1,
    runId: 'SYNTHETIC-H776-SOURCE-RUN',
    requestId: parserInput.requestId,
    parser: structuredClone(parserInput.parser),
    processingMode: parserInput.processingMode,
    source: structuredClone(parserInput.source),
    identity: structuredClone(parserInput.identity),
    nodes: [{
      id: '1', parentId: null, depth: 0, order: 1,
      sourceText: 'synthetic source node', translationSnapshotKo: null,
      provenanceStatus: 'parsed-source', sourceLocator: `${parserInput.source.locator}:1`,
    }],
    summary: { rootCount: 1, nodeCount: 1, maxDepth: 0 },
    outputFingerprint: '',
  };
  output.outputFingerprint = fingerprint(output, 'outputFingerprint');
  return output;
}

function selfTest() {
  assert.equal(policy.candidateGenerationEnabled, false, 'candidate generation must remain disabled');
  assert.equal(policy.allowRegressionExecution, true, 'regression execution must remain enabled');
  assert.equal(driverSource.includes("sourceId === 'H776'"), false, 'driver core must remain Strong-neutral');

  const preflightA = preflightLexiconSourceDriver(input);
  const preflightB = preflightLexiconSourceDriver(input);
  assert.deepEqual(preflightA.report, preflightB.report, 'preflight report must be deterministic');
  assert.equal(preflightA.report.route, 'legacy-adapter');
  assert.equal(preflightA.report.selectedAdapterId, 'h776-legacy-golden-v1');
  assert.equal(preflightA.report.decision.executionAllowed, true);
  assert.equal(preflightA.report.decision.candidateGenerationAllowed, false);
  assert.deepEqual(preflightA.report.decision.blockerCodes, []);

  const tampered = structuredClone(input);
  tampered.source.locator = 'tampered-locator';
  const tamperedReport = preflightLexiconSourceDriver(tampered).report;
  assert.equal(tamperedReport.route, 'blocked');
  assert.ok(tamperedReport.decision.blockerCodes.includes(DRIVER_BLOCKERS.INPUT_FINGERPRINT_MISMATCH));

  const openBdb = registry.sources.find((source) => source.sourceId === 'openscriptures-hebrewlexicon-bdb');
  assert.equal(openBdb.workflow.status, 'approved-ready');
  const sourceParse = makeSourceParseInput(openBdb);
  const sourceParseReport = preflightLexiconSourceDriver(sourceParse).report;
  assert.equal(sourceParseReport.route, 'blocked');
  assert.deepEqual(sourceParseReport.decision.blockerCodes, [DRIVER_BLOCKERS.ADAPTER_NOT_REGISTERED]);

  const blockedCandidate = makeSourceParseInput(openBdb, 'candidate-generation');
  const blockedCandidateReport = preflightLexiconSourceDriver(blockedCandidate).report;
  assert.equal(blockedCandidateReport.route, 'blocked');
  assert.equal(blockedCandidateReport.decision.candidateGenerationAllowed, false);
  assert.ok(blockedCandidateReport.decision.blockerCodes.includes(DRIVER_BLOCKERS.CANDIDATE_GENERATION_DISABLED));
  assert.ok(blockedCandidateReport.decision.blockerCodes.includes(DRIVER_BLOCKERS.ADAPTER_NOT_REGISTERED));
  assert.equal(blockedCandidateReport.decision.blockerCodes.includes(DRIVER_BLOCKERS.SOURCE_WORKFLOW_NOT_READY), false);

  const syntheticHash = `sha256:${'1'.repeat(64)}`;
  const syntheticSource = {
    sourceId: 'synthetic-full-lexicon',
    license: { status: 'approved', fullTextStorageAllowed: true, derivativeAllowed: true },
    provenance: { contentHash: syntheticHash },
    workflow: { status: 'approved-ready', autoProcessingAllowed: true },
  };
  const syntheticInput = makeSourceParseInput(syntheticSource);
  const syntheticAdapter = {
    adapterId: 'synthetic-source-tree-v1',
    parserMode: 'source-parse',
    sourceIds: ['synthetic-full-lexicon'],
    supports: () => true,
    execute: buildSyntheticOutput,
  };
  const syntheticRun = runLexiconSourceDriver(syntheticInput, {
    registry: { sources: [syntheticSource] }, policy, adapters: [syntheticAdapter], operation: 'execute',
  });
  assert.equal(syntheticRun.report.route, 'source-parser');
  assert.equal(syntheticRun.report.decision.executionAllowed, true);
  assert.equal(syntheticRun.report.decision.candidateGenerationAllowed, false);
  assert.equal(syntheticRun.output.nodes[0].provenanceStatus, 'parsed-source');

  const syntheticCandidate = makeSourceParseInput(syntheticSource, 'candidate-generation');
  const syntheticCandidateRun = runLexiconSourceDriver(syntheticCandidate, {
    registry: { sources: [syntheticSource] }, policy, adapters: [syntheticAdapter], operation: 'execute',
  });
  assert.equal(syntheticCandidateRun.output, null);
  assert.deepEqual(syntheticCandidateRun.report.decision.blockerCodes, [DRIVER_BLOCKERS.CANDIDATE_GENERATION_DISABLED]);
}

const result = runLexiconSourceDriver(input, { operation: 'execute' });
const errors = validateReportShape(result.report);
const need = (condition, message) => { if (!condition) errors.push(message); };
need(result.report.operation === 'execute', 'H776 driver operation mismatch');
need(result.report.route === 'legacy-adapter', 'H776 driver route mismatch');
need(result.report.selectedAdapterId === 'h776-legacy-golden-v1', 'H776 adapter selection mismatch');
need(result.report.decision.executionAllowed === true, 'H776 regression execution blocked');
need(result.report.decision.candidateGenerationAllowed === false, 'H776 candidate generation must remain blocked');
need(result.report.decision.blockerCodes.length === 0, 'H776 regression report has blockers');
need(Boolean(result.output), 'H776 parser output missing');
need(result.report.parserOutputFingerprint === result.output?.outputFingerprint, 'parser output fingerprint link mismatch');
need(result.output?.summary?.nodeCount === 26, 'H776 driver node count mismatch');
need(result.output?.summary?.rootCount === 1, 'H776 driver root count mismatch');
need(result.output?.summary?.maxDepth === 3, 'H776 driver max depth mismatch');
need(result.output?.nodes?.length === evidence.senseNodes.length, 'driver/evidence node count mismatch');
evidence.senseNodes.forEach((node, index) => {
  const parsed = result.output?.nodes?.[index];
  for (const key of ['id', 'parentId', 'depth', 'order']) need(parsed?.[key] === node[key], `driver/evidence mismatch ${node.id}:${key}`);
  need(parsed?.translationSnapshotKo === node.translationKo, `driver/evidence translation mismatch ${node.id}`);
});
if (errors.length) {
  console.error(`✗ lexicon source driver failed · errors=${errors.length}`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}
selfTest();

function parseArg(prefix) {
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}
function writeJson(relativePath, value) {
  const target = path.resolve(ROOT, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}
const reportTarget = parseArg('--write-report=');
const outputTarget = parseArg('--write-output=');
if (reportTarget) writeJson(reportTarget, result.report);
if (outputTarget) writeJson(outputTarget, result.output);
console.log(`✓ lexicon source driver passed · route=${result.report.route} · adapter=${result.report.selectedAdapterId} · nodes=${result.output.summary.nodeCount} · approvedFullBdbAdapterPending=true · candidateGenerationAllowed=false`);
