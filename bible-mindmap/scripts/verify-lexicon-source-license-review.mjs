#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_PATH = path.join(ROOT, 'data', 'lexicon', 'source-registry.json');
const SCHEMA_PATH = path.join(ROOT, 'data', 'lexicon', 'schemas', 'SourceLicenseReview.schema.json');
const REVIEW_PATH = path.join(
  ROOT,
  'data',
  'lexicon',
  'source-reviews',
  'unfoldingword-bdb-enhanced.license-review.v1.json',
);

function readJson(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function sha256(value) {
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')}`;
}

function deniedRights(review) {
  return [
    'storeFullText',
    'externalLlmInput',
    'createTranslationDerivatives',
    'redistributeDerivedData',
  ].every((key) => review.rights?.[key] === false);
}

export function validateLicenseReview({ registry, schema, review }) {
  const errors = [];
  const fail = (message) => errors.push(message);

  if (schema?.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
    fail('review schema must use JSON Schema 2020-12');
  }
  if (schema?.properties?.schemaVersion?.const !== 1) fail('review schemaVersion contract missing');
  if (!schema?.$defs?.evidence?.required?.includes('directlyApplies')) {
    fail('review schema must distinguish direct and indirect evidence');
  }

  if (review?.schemaVersion !== 1) fail('review schemaVersion must be 1');
  if (review?.sourceId !== 'unfoldingword-bdb-enhanced') fail('review sourceId mismatch');
  if (review?.reviewStatus !== 'clarification-required') fail('review must remain clarification-required');
  if (review?.automationDecision !== 'blocked') fail('review automation must remain blocked');
  if (review?.candidateGenerationAllowed !== false) fail('candidate generation must remain disabled');
  if (review?.verdict !== 'retain-internal-review-only') fail('review verdict must retain restriction');
  if (!/^[a-f0-9]{40}$/.test(review?.dataset?.commit || '')) fail('review requires pinned commit');
  if (!Array.isArray(review?.dataset?.paths) || review.dataset.paths.length < 1) {
    fail('review requires dataset paths');
  }

  const evidence = review?.evidence || [];
  if (evidence.length < 3) fail('review requires at least three evidence records');
  const datasetEvidence = evidence.filter((item) => item.authority === 'dataset-owner' && item.directlyApplies);
  if (datasetEvidence.length !== 1) fail('review requires exactly one directly applicable dataset-owner statement');
  if (datasetEvidence.some((item) => item.exactLicenseExpression !== null)) {
    fail('current dataset-owner statement must not invent an exact license version');
  }
  const uhalPolicy = evidence.find((item) => item.evidenceId === 'official-uhal-license-policy');
  if (!uhalPolicy || uhalPolicy.directlyApplies !== false || uhalPolicy.exactLicenseExpression !== 'CC-BY-SA-4.0') {
    fail('UHAL organization policy must remain indirect evidence');
  }

  if (review?.rights?.readMetadata !== true || review?.rights?.internalLicenseReview !== true) {
    fail('metadata and internal review rights must remain available');
  }
  if (!deniedRights(review)) fail('unresolved review must deny full-text and derivative processing rights');
  if (!Array.isArray(review?.unresolvedQuestions) || review.unresolvedQuestions.length < 4) {
    fail('review requires unresolved rights questions');
  }
  if (!Array.isArray(review?.promotionRequirements) || review.promotionRequirements.length < 4) {
    fail('review requires explicit promotion requirements');
  }

  const source = registry?.sources?.find((item) => item.sourceId === review?.sourceId);
  if (!source) {
    fail('reviewed source missing from Source Registry');
  } else {
    if (source.license?.status !== 'internal-review-only') fail('registry license must remain internal-review-only');
    if (source.workflow?.status !== 'internal-review-only') fail('registry workflow must remain internal-review-only');
    if (source.workflow?.autoProcessingAllowed !== false) fail('registry automatic processing must remain disabled');
    for (const key of [
      'derivativeAllowed',
      'redistributionAllowed',
      'externalLlmInputAllowed',
      'fullTextStorageAllowed',
    ]) {
      if (source.license?.[key] !== false) fail(`registry license.${key} must remain false`);
    }
    if (source.provenance?.version !== review?.dataset?.commit) fail('review commit must match Source Registry');
    const registryPaths = [...(source.provenance?.datasetPaths || [])].sort();
    const reviewPaths = [...(review?.dataset?.paths || [])].sort();
    if (JSON.stringify(registryPaths) !== JSON.stringify(reviewPaths)) {
      fail('review paths must match Source Registry');
    }
  }

  return errors;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function runSelfTests({ registry, schema, review }) {
  const promoted = clone(registry);
  const source = promoted.sources.find((item) => item.sourceId === review.sourceId);
  source.license.status = 'approved';
  source.workflow.status = 'approved-ready';
  source.workflow.autoProcessingAllowed = true;
  assert.ok(
    validateLicenseReview({ registry: promoted, schema, review }).some((message) => message.includes('internal-review-only')),
  );

  const fabricatedVersion = clone(review);
  fabricatedVersion.evidence.find((item) => item.authority === 'dataset-owner').exactLicenseExpression = 'CC-BY-4.0';
  assert.ok(
    validateLicenseReview({ registry, schema, review: fabricatedVersion }).some((message) => message.includes('must not invent')),
  );

  const enabledCandidate = clone(review);
  enabledCandidate.candidateGenerationAllowed = true;
  assert.ok(
    validateLicenseReview({ registry, schema, review: enabledCandidate }).some((message) => message.includes('candidate generation')),
  );
}

function parseArg(prefix) {
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

const registry = readJson(REGISTRY_PATH);
const schema = readJson(SCHEMA_PATH);
const review = readJson(REVIEW_PATH);
const errors = validateLicenseReview({ registry, schema, review });

if (errors.length) {
  console.error(`✗ BDB source license review gate failed (${errors.length})`);
  errors.forEach((message) => console.error(`  - ${message}`));
  process.exit(1);
}

runSelfTests({ registry, schema, review });

const report = {
  schemaVersion: 1,
  reportId: 'unfoldingword-bdb-enhanced-license-review-report-v1',
  sourceId: review.sourceId,
  reviewedCommit: review.dataset.commit,
  verdict: review.verdict,
  reviewStatus: review.reviewStatus,
  automationDecision: review.automationDecision,
  candidateGenerationAllowed: review.candidateGenerationAllowed,
  evidenceCount: review.evidence.length,
  unresolvedQuestionCount: review.unresolvedQuestions.length,
  promotionRequirementCount: review.promotionRequirements.length,
  reviewFingerprint: sha256(review),
};

const writeTarget = parseArg('--write=');
if (writeTarget) {
  const outputPath = path.resolve(ROOT, writeTarget);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`✓ BDB source license review report wrote ${path.relative(ROOT, outputPath)}`);
} else {
  console.log(`✓ BDB source license review gate · ${review.verdict} · evidence=${review.evidence.length}`);
}
