#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fingerprint } from './build-h776-parser-adapter.mjs';
import { readPhaseGate } from './lib/lexicon-evidence-verifier.mjs';
import { DEFAULT_SOURCE_ADAPTERS } from './lexicon-source-adapters.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_REGISTRY = 'data/lexicon/source-registry.json';
const DEFAULT_POLICY = 'data/lexicon/source-driver-policy.json';

export const DRIVER_BLOCKERS = Object.freeze({
  ADAPTER_AMBIGUOUS: 'ADAPTER_AMBIGUOUS',
  ADAPTER_NOT_REGISTERED: 'ADAPTER_NOT_REGISTERED',
  CANDIDATE_GENERATION_DISABLED: 'CANDIDATE_GENERATION_DISABLED',
  DERIVATIVE_PERMISSION_REQUIRED: 'DERIVATIVE_PERMISSION_REQUIRED',
  DRIVER_POLICY_INVALID: 'DRIVER_POLICY_INVALID',
  FULL_TEXT_STORAGE_REQUIRED: 'FULL_TEXT_STORAGE_REQUIRED',
  INPUT_FINGERPRINT_MISMATCH: 'INPUT_FINGERPRINT_MISMATCH',
  LEGACY_FINGERPRINT_MUST_BE_NULL: 'LEGACY_FINGERPRINT_MUST_BE_NULL',
  LEGACY_POLICY_REQUIRED: 'LEGACY_POLICY_REQUIRED',
  PARSER_ID_MISMATCH: 'PARSER_ID_MISMATCH',
  PHASE_GATE_DISABLED: 'PHASE_GATE_DISABLED',
  REGRESSION_EXECUTION_DISABLED: 'REGRESSION_EXECUTION_DISABLED',
  REGRESSION_ONLY_REQUIRED: 'REGRESSION_ONLY_REQUIRED',
  SOURCE_AUTO_PROCESSING_REQUIRED: 'SOURCE_AUTO_PROCESSING_REQUIRED',
  SOURCE_FINGERPRINT_MISMATCH: 'SOURCE_FINGERPRINT_MISMATCH',
  SOURCE_FINGERPRINT_REQUIRED: 'SOURCE_FINGERPRINT_REQUIRED',
  SOURCE_LICENSE_NOT_APPROVED: 'SOURCE_LICENSE_NOT_APPROVED',
  SOURCE_PARSE_POLICY_REQUIRED: 'SOURCE_PARSE_POLICY_REQUIRED',
  SOURCE_STATUS_MISMATCH: 'SOURCE_STATUS_MISMATCH',
  SOURCE_WORKFLOW_NOT_READY: 'SOURCE_WORKFLOW_NOT_READY',
  UNREGISTERED_SOURCE: 'UNREGISTERED_SOURCE',
  UNSUPPORTED_PARSER_MODE: 'UNSUPPORTED_PARSER_MODE',
});

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(ROOT, relativePath), 'utf8'));
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function validatePolicy(policy) {
  return Boolean(
    policy
    && policy.schemaVersion === 1
    && policy.driverId === 'lexicon-source-driver'
    && /^\d+\.\d+$/.test(policy.policyVersion || '')
    && /^\d+\.\d+\.\d+$/.test(policy.driverVersion || '')
    && typeof policy.candidateGenerationEnabled === 'boolean'
    && typeof policy.allowRegressionExecution === 'boolean'
  );
}

function findSource(registry, sourceId) {
  return registry?.sources?.find((source) => source.sourceId === sourceId) || null;
}

function selectAdapter(input, adapters) {
  const matches = (adapters || [])
    .filter((adapter) => adapter?.parserMode === input?.parser?.mode)
    .filter((adapter) => adapter?.sourceIds?.includes(input?.source?.sourceId))
    .filter((adapter) => typeof adapter.supports !== 'function' || adapter.supports(input))
    .sort((a, b) => a.adapterId.localeCompare(b.adapterId));
  return { adapter: matches.length === 1 ? matches[0] : null, matchCount: matches.length };
}

function sourceSnapshot(input, source) {
  return {
    sourceId: input?.source?.sourceId || 'unregistered-source',
    registryWorkflowStatus: source?.workflow?.status || null,
    registryAutoProcessingAllowed: source?.workflow?.autoProcessingAllowed ?? null,
    licenseStatus: source?.license?.status || null,
    usagePolicy: input?.source?.usagePolicy,
    sourceFingerprint: input?.source?.sourceFingerprint ?? null,
  };
}

export function preflightLexiconSourceDriver(input, {
  registry = readJson(DEFAULT_REGISTRY),
  policy = readJson(DEFAULT_POLICY),
  adapters = DEFAULT_SOURCE_ADAPTERS,
  operation = 'preflight',
  trackStatePath,
} = {}) {
  const blockers = [];
  const phaseGate = readPhaseGate(trackStatePath);
  if (!validatePolicy(policy)) blockers.push(DRIVER_BLOCKERS.DRIVER_POLICY_INVALID);
  if (input?.parser?.id !== 'bdb-deterministic-tree-parser') blockers.push(DRIVER_BLOCKERS.PARSER_ID_MISMATCH);
  if (!input || typeof input !== 'object' || input.inputFingerprint !== fingerprint(input, 'inputFingerprint')) {
    blockers.push(DRIVER_BLOCKERS.INPUT_FINGERPRINT_MISMATCH);
  }

  const source = findSource(registry, input?.source?.sourceId);
  if (!source) blockers.push(DRIVER_BLOCKERS.UNREGISTERED_SOURCE);
  const parserMode = input?.parser?.mode;
  const isLegacyRegression = parserMode === 'legacy-golden-adapter'
    && input?.processingMode === 'regression-only'
    && input?.source?.usagePolicy === 'legacy-regression-only';
  if (source && !isLegacyRegression && source.workflow.status !== input?.source?.registryWorkflowStatus) {
    blockers.push(DRIVER_BLOCKERS.SOURCE_STATUS_MISMATCH);
  }

  const selection = selectAdapter(input, adapters);
  if (selection.matchCount === 0) blockers.push(DRIVER_BLOCKERS.ADAPTER_NOT_REGISTERED);
  if (selection.matchCount > 1) blockers.push(DRIVER_BLOCKERS.ADAPTER_AMBIGUOUS);

  if (parserMode === 'legacy-golden-adapter') {
    if (input?.processingMode !== 'regression-only') blockers.push(DRIVER_BLOCKERS.REGRESSION_ONLY_REQUIRED);
    if (input?.source?.usagePolicy !== 'legacy-regression-only') blockers.push(DRIVER_BLOCKERS.LEGACY_POLICY_REQUIRED);
    if (input?.source?.sourceFingerprint !== null) blockers.push(DRIVER_BLOCKERS.LEGACY_FINGERPRINT_MUST_BE_NULL);
    if (policy?.allowRegressionExecution !== true) blockers.push(DRIVER_BLOCKERS.REGRESSION_EXECUTION_DISABLED);
  } else if (parserMode === 'source-parse') {
    if (input?.source?.usagePolicy !== 'automatic-evidence') blockers.push(DRIVER_BLOCKERS.SOURCE_PARSE_POLICY_REQUIRED);
    if (policy?.requireApprovedReadyForSourceParse !== false && source?.workflow?.status !== 'approved-ready') blockers.push(DRIVER_BLOCKERS.SOURCE_WORKFLOW_NOT_READY);
    if (source?.workflow?.autoProcessingAllowed !== true) blockers.push(DRIVER_BLOCKERS.SOURCE_AUTO_PROCESSING_REQUIRED);
    if (source?.license?.status !== 'approved') blockers.push(DRIVER_BLOCKERS.SOURCE_LICENSE_NOT_APPROVED);
    if (policy?.requireSourceFingerprintForSourceParse !== false) {
      if (!input?.source?.sourceFingerprint) blockers.push(DRIVER_BLOCKERS.SOURCE_FINGERPRINT_REQUIRED);
      else if (input.source.sourceFingerprint !== source?.provenance?.contentHash) blockers.push(DRIVER_BLOCKERS.SOURCE_FINGERPRINT_MISMATCH);
    }
    if (policy?.requireFullTextStorageForSourceParse !== false && source?.license?.fullTextStorageAllowed !== true) blockers.push(DRIVER_BLOCKERS.FULL_TEXT_STORAGE_REQUIRED);
    if (policy?.requireDerivativePermissionForSourceParse !== false && source?.license?.derivativeAllowed !== true) blockers.push(DRIVER_BLOCKERS.DERIVATIVE_PERMISSION_REQUIRED);
    if (input?.processingMode === 'candidate-generation') {
      if (policy?.candidateGenerationEnabled !== true) blockers.push(DRIVER_BLOCKERS.CANDIDATE_GENERATION_DISABLED);
      if (phaseGate.candidateGenerationAllowed !== true) blockers.push(DRIVER_BLOCKERS.PHASE_GATE_DISABLED);
    }
  } else {
    blockers.push(DRIVER_BLOCKERS.UNSUPPORTED_PARSER_MODE);
  }

  const blockerCodes = uniqueSorted(blockers);
  const executionAllowed = blockerCodes.length === 0;
  const dualCandidateGateEnabled = policy?.candidateGenerationEnabled === true
    && phaseGate.candidateGenerationAllowed === true;
  const candidateGenerationAllowed = executionAllowed
    && input?.processingMode === 'candidate-generation'
    && dualCandidateGateEnabled;
  const route = executionAllowed
    ? (parserMode === 'legacy-golden-adapter' ? 'legacy-adapter' : 'source-parser')
    : 'blocked';
  const report = {
    schemaVersion: 1,
    reportId: `${input.requestId}-SOURCE-DRIVER`,
    driver: {
      id: policy?.driverId || 'lexicon-source-driver',
      version: policy?.driverVersion || '0.0.0',
      policyVersion: policy?.policyVersion || '0.0',
    },
    requestId: input.requestId,
    operation,
    route,
    selectedAdapterId: selection.adapter?.adapterId || null,
    source: sourceSnapshot(input, source),
    decision: {
      executionAllowed,
      candidateGenerationAllowed,
      candidateGenerationPolicy: dualCandidateGateEnabled ? 'license-gated' : 'disabled',
      blockerCodes,
    },
    parserOutputFingerprint: null,
    reportFingerprint: '',
  };
  report.reportFingerprint = fingerprint(report, 'reportFingerprint');
  return { report, adapter: selection.adapter };
}

export function runLexiconSourceDriver(input, options = {}) {
  const operation = options.operation || 'execute';
  const preflight = preflightLexiconSourceDriver(input, { ...options, operation });
  if (operation !== 'execute' || !preflight.report.decision.executionAllowed) return { report: preflight.report, output: null };
  const output = preflight.adapter.execute(input);
  const report = structuredClone(preflight.report);
  report.parserOutputFingerprint = output.outputFingerprint;
  report.reportFingerprint = fingerprint(report, 'reportFingerprint');
  return { report, output };
}

function parseArg(prefix) {
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}
function writeJson(relativePath, value) {
  const target = path.resolve(ROOT, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}
function runCli() {
  const inputPath = parseArg('--input=');
  if (!inputPath) throw new Error('lexicon source driver requires --input=<parser-input.json>');
  const input = readJson(inputPath);
  const operation = parseArg('--operation=') || 'preflight';
  const result = runLexiconSourceDriver(input, { operation });
  const reportTarget = parseArg('--write-report=');
  const outputTarget = parseArg('--write-output=');
  if (reportTarget) writeJson(reportTarget, result.report);
  if (outputTarget && result.output) writeJson(outputTarget, result.output);
  if (!reportTarget) process.stdout.write(`${JSON.stringify(result.report, null, 2)}\n`);
  if (operation === 'execute' && !result.report.decision.executionAllowed) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) runCli();
