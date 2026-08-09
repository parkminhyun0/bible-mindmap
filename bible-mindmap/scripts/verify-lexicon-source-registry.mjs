#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.join(ROOT, 'data', 'lexicon', 'source-registry.json');
const SCHEMA_PATH = path.join(ROOT, 'data', 'lexicon', 'schemas', 'SourceRegistry.schema.json');

const LICENSE_STATUSES = new Set([
  'approved',
  'internal-review-only',
  'metadata-only',
  'unknown',
  'prohibited',
]);
const RESTRICTED_LICENSE_STATUSES = new Set([
  'internal-review-only',
  'metadata-only',
  'unknown',
  'prohibited',
]);
const WORKFLOW_STATUSES = new Set([
  'approved-ready',
  'approved-pending-fingerprint',
  'internal-review-only',
  'metadata-only',
  'blocked',
]);
const FINGERPRINT_METHODS = new Set([
  'sha256-path-content-manifest-v1',
  'unresolved',
]);
const LANGUAGES = new Set(['hebrew', 'aramaic', 'greek', 'english', 'korean']);
const CANON = new Set(['old-testament', 'new-testament', 'both']);
const SOURCE_TYPES = new Set([
  'original-text',
  'morphology',
  'lexicon',
  'alignment',
  'translation',
  'metadata',
  'scan',
]);
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/;
const GIT_COMMIT_PATTERN = /^[a-f0-9]{40}$/;
const SOURCE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readJson(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function validHttpsUrl(value) {
  if (!nonEmpty(value)) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function allPermissionsDenied(license) {
  return [
    'derivativeAllowed',
    'redistributionAllowed',
    'externalLlmInputAllowed',
    'fullTextStorageAllowed',
  ].every((key) => license[key] === false);
}

function validateRegistry(registry) {
  const errors = [];
  const warnings = [];
  const fail = (message) => errors.push(message);
  const warn = (message) => warnings.push(message);

  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) {
    return { errors: ['registry root must be an object'], warnings };
  }

  if (registry.schemaVersion !== 1) fail('schemaVersion must be 1');
  if (registry.registryId !== 'lexicon-source-registry') fail('registryId mismatch');
  if (registry.project !== 'bible-mindmap-lexicon-ko') fail('project mismatch');
  if (!/^\d+\.\d+$/.test(String(registry.policyVersion || ''))) {
    fail('policyVersion must use major.minor');
  }

  const governance = registry.governance || {};
  if (!nonEmpty(governance.theologicalFramework)) fail('governance.theologicalFramework missing');
  if (governance.unknownLicenseBlocksAiInput !== true) fail('unknown licenses must block AI input');
  if (governance.unknownLicenseBlocksRedistribution !== true) fail('unknown licenses must block redistribution');
  if (!Array.isArray(governance.sourceTextPrecedence)) {
    fail('governance.sourceTextPrecedence must be an array');
  }

  if (!Array.isArray(registry.sources) || registry.sources.length === 0) {
    fail('sources must be a non-empty array');
    return { errors, warnings };
  }

  const seen = new Set();
  for (const [index, source] of registry.sources.entries()) {
    const label = source?.sourceId || `sources[${index}]`;
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      fail(`${label}: source must be an object`);
      continue;
    }

    if (!SOURCE_ID_PATTERN.test(String(source.sourceId || ''))) fail(`${label}: invalid sourceId`);
    if (seen.has(source.sourceId)) fail(`${label}: duplicate sourceId`);
    seen.add(source.sourceId);

    for (const field of ['title', 'role', 'scope']) {
      if (!nonEmpty(source[field])) fail(`${label}: ${field} missing`);
    }
    if (!CANON.has(source.canon)) fail(`${label}: invalid canon`);

    if (!Array.isArray(source.languages) || source.languages.length === 0) {
      fail(`${label}: languages missing`);
    } else {
      if (new Set(source.languages).size !== source.languages.length) fail(`${label}: duplicate language`);
      for (const language of source.languages) {
        if (!LANGUAGES.has(language)) fail(`${label}: unsupported language ${language}`);
      }
    }

    if (!Array.isArray(source.sourceTypes) || source.sourceTypes.length === 0) {
      fail(`${label}: sourceTypes missing`);
    } else {
      if (new Set(source.sourceTypes).size !== source.sourceTypes.length) fail(`${label}: duplicate sourceType`);
      for (const sourceType of source.sourceTypes) {
        if (!SOURCE_TYPES.has(sourceType)) fail(`${label}: unsupported sourceType ${sourceType}`);
      }
    }

    const license = source.license || {};
    if (!LICENSE_STATUSES.has(license.status)) fail(`${label}: invalid license status`);
    if (!nonEmpty(license.expression)) fail(`${label}: license expression missing`);
    if (license.licenseUrl !== null && !validHttpsUrl(license.licenseUrl)) {
      fail(`${label}: licenseUrl must be https or null`);
    }
    for (const key of [
      'attributionRequired',
      'changeNoticeRequired',
      'derivativeAllowed',
      'redistributionAllowed',
      'externalLlmInputAllowed',
      'fullTextStorageAllowed',
    ]) {
      if (typeof license[key] !== 'boolean') fail(`${label}: license.${key} must be boolean`);
    }
    if (license.attributionRequired && !nonEmpty(license.attributionText)) {
      fail(`${label}: attribution text required`);
    }
    if (license.expression === 'CC-BY-4.0') {
      if (!license.attributionRequired) fail(`${label}: CC-BY-4.0 requires attribution`);
      if (!license.changeNoticeRequired) fail(`${label}: CC-BY-4.0 requires change notice`);
      if (!license.derivativeAllowed || !license.redistributionAllowed) {
        fail(`${label}: CC-BY-4.0 permissions inconsistent`);
      }
    }

    const provenance = source.provenance || {};
    if (provenance.officialUrl !== null && !validHttpsUrl(provenance.officialUrl)) {
      fail(`${label}: officialUrl must be https or null`);
    }
    if (provenance.repositoryUrl !== null && !validHttpsUrl(provenance.repositoryUrl)) {
      fail(`${label}: repositoryUrl must be https or null`);
    }
    if (!Array.isArray(provenance.datasetPaths)) {
      fail(`${label}: datasetPaths must be an array`);
    } else {
      if (new Set(provenance.datasetPaths).size !== provenance.datasetPaths.length) {
        fail(`${label}: duplicate datasetPath`);
      }
      if (provenance.datasetPaths.some((value) => !nonEmpty(value))) {
        fail(`${label}: datasetPaths contains empty value`);
      }
    }
    if (!FINGERPRINT_METHODS.has(provenance.fingerprintMethod)) {
      fail(`${label}: unsupported fingerprintMethod`);
    }
    if (provenance.fileCount !== null && !positiveInteger(provenance.fileCount)) {
      fail(`${label}: fileCount must be positive integer or null`);
    }
    if (provenance.totalBytes !== null && !positiveInteger(provenance.totalBytes)) {
      fail(`${label}: totalBytes must be positive integer or null`);
    }
    if (provenance.contentHash !== null && !SHA256_PATTERN.test(String(provenance.contentHash))) {
      fail(`${label}: invalid contentHash`);
    }

    const workflow = source.workflow || {};
    if (!WORKFLOW_STATUSES.has(workflow.status)) fail(`${label}: invalid workflow status`);
    if (typeof workflow.autoProcessingAllowed !== 'boolean') {
      fail(`${label}: autoProcessingAllowed must be boolean`);
    }
    if (!nonEmpty(workflow.notes)) fail(`${label}: workflow notes missing`);

    if (RESTRICTED_LICENSE_STATUSES.has(license.status)) {
      if (workflow.autoProcessingAllowed) fail(`${label}: restricted license cannot auto process`);
      if (!allPermissionsDenied(license)) {
        fail(`${label}: restricted license must deny storage, LLM input, derivatives and redistribution`);
      }
      if (['unknown', 'prohibited'].includes(license.status) && workflow.status !== 'blocked') {
        fail(`${label}: ${license.status} license must use blocked workflow`);
      }
      if (license.status === 'internal-review-only' && workflow.status !== 'internal-review-only') {
        fail(`${label}: internal-review-only license must use matching workflow`);
      }
      warn(`${label}: restricted source is correctly excluded from automatic processing`);
    }

    if (workflow.status === 'approved-ready') {
      if (license.status !== 'approved') fail(`${label}: ready source requires approved license`);
      if (!workflow.autoProcessingAllowed) fail(`${label}: ready source must allow automatic processing`);
      if (provenance.versionStrategy === 'git-commit' && !GIT_COMMIT_PATTERN.test(String(provenance.version || ''))) {
        fail(`${label}: ready Git source requires full 40-character commit`);
      }
      if (provenance.fingerprintMethod !== 'sha256-path-content-manifest-v1') {
        fail(`${label}: ready source requires canonical manifest fingerprint`);
      }
      if (!positiveInteger(provenance.fileCount)) fail(`${label}: ready source requires fileCount`);
      if (!positiveInteger(provenance.totalBytes)) fail(`${label}: ready source requires totalBytes`);
      if (!SHA256_PATTERN.test(String(provenance.contentHash || ''))) {
        fail(`${label}: ready source requires sha256 contentHash`);
      }
      if (!nonEmpty(provenance.retrievedAt) || Number.isNaN(Date.parse(provenance.retrievedAt))) {
        fail(`${label}: ready source requires retrievedAt`);
      }
      if (!Array.isArray(provenance.datasetPaths) || provenance.datasetPaths.length === 0) {
        fail(`${label}: ready source requires datasetPaths`);
      }
    }

    if (workflow.status === 'approved-pending-fingerprint') {
      if (license.status !== 'approved') fail(`${label}: pending fingerprint requires approved license`);
      if (workflow.autoProcessingAllowed) fail(`${label}: pending fingerprint must not auto process`);
      if (provenance.versionStrategy === 'git-commit' && !GIT_COMMIT_PATTERN.test(String(provenance.version || ''))) {
        fail(`${label}: pending Git source requires full 40-character commit`);
      }
      if (provenance.fingerprintMethod !== 'sha256-path-content-manifest-v1') {
        fail(`${label}: pending source requires canonical manifest fingerprint method`);
      }
      if (provenance.fileCount !== null || provenance.totalBytes !== null || provenance.contentHash !== null) {
        fail(`${label}: pending fingerprint values must remain null`);
      }
      if (provenance.retrievedAt !== null) fail(`${label}: pending fingerprint retrievedAt must be null`);
      if (!Array.isArray(provenance.datasetPaths) || provenance.datasetPaths.length === 0) {
        fail(`${label}: pending fingerprint requires datasetPaths`);
      }
      warn(`${label}: license and commit approved, canonical fingerprint still pending`);
    }

    if (['internal-review-only', 'metadata-only', 'blocked'].includes(workflow.status)
      && workflow.autoProcessingAllowed) {
      fail(`${label}: ${workflow.status} cannot auto process`);
    }
  }

  for (const sourceId of governance.sourceTextPrecedence || []) {
    if (!seen.has(sourceId)) fail(`sourceTextPrecedence references missing source ${sourceId}`);
    const source = registry.sources.find((item) => item.sourceId === sourceId);
    if (['blocked', 'internal-review-only', 'metadata-only'].includes(source?.workflow.status)) {
      fail(`sourceTextPrecedence cannot include restricted source ${sourceId}`);
    }
  }

  return { errors, warnings };
}

function expectSource(registry, sourceId) {
  const source = registry.sources.find((item) => item.sourceId === sourceId);
  assert.ok(source, `required source missing: ${sourceId}`);
  return source;
}

function cloneRegistry(registry) {
  return JSON.parse(JSON.stringify(registry));
}

function runSelfTests(registry) {
  const restrictedButEnabled = cloneRegistry(registry);
  const restricted = restrictedButEnabled.sources.find((source) => source.license.status === 'unknown');
  restricted.workflow.status = 'approved-pending-fingerprint';
  restricted.license.externalLlmInputAllowed = true;
  assert.ok(validateRegistry(restrictedButEnabled).errors.some((message) => message.includes('must use blocked workflow')));

  const missingHash = cloneRegistry(registry);
  const approved = missingHash.sources.find((source) => source.license.status === 'approved');
  approved.workflow.status = 'approved-ready';
  approved.workflow.autoProcessingAllowed = true;
  approved.provenance.fileCount = null;
  approved.provenance.totalBytes = null;
  approved.provenance.contentHash = null;
  approved.provenance.retrievedAt = null;
  assert.ok(validateRegistry(missingHash).errors.some((message) => message.includes('contentHash')));

  const invalidCount = cloneRegistry(registry);
  const counted = invalidCount.sources.find((source) => source.license.status === 'approved');
  counted.workflow.status = 'approved-ready';
  counted.workflow.autoProcessingAllowed = true;
  counted.provenance.fileCount = 0;
  counted.provenance.totalBytes = 1;
  counted.provenance.contentHash = `sha256:${'0'.repeat(64)}`;
  counted.provenance.retrievedAt = '2026-08-10T00:00:00Z';
  assert.ok(validateRegistry(invalidCount).errors.some((message) => message.includes('fileCount')));

  const duplicate = cloneRegistry(registry);
  duplicate.sources.push(JSON.parse(JSON.stringify(duplicate.sources[0])));
  assert.ok(validateRegistry(duplicate).errors.some((message) => message.includes('duplicate sourceId')));

  const noAttribution = cloneRegistry(registry);
  const ccBy = noAttribution.sources.find((source) => source.license.expression === 'CC-BY-4.0');
  ccBy.license.attributionRequired = false;
  assert.ok(validateRegistry(noAttribution).errors.some((message) => message.includes('requires attribution')));
}

const schema = readJson(SCHEMA_PATH);
const registry = readJson(REGISTRY_PATH);

assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.equal(schema.properties?.schemaVersion?.const, 1);
assert.ok(schema.properties?.governance);
assert.ok(schema.$defs?.source?.required?.includes('license'));
assert.ok(schema.$defs?.source?.required?.includes('provenance'));
assert.ok(schema.$defs?.license?.required?.includes('externalLlmInputAllowed'));
assert.ok(schema.$defs?.provenance?.required?.includes('fingerprintMethod'));
assert.ok(schema.$defs?.provenance?.required?.includes('fileCount'));
assert.ok(schema.$defs?.provenance?.required?.includes('totalBytes'));
assert.ok(schema.$defs?.provenance?.required?.includes('contentHash'));

const result = validateRegistry(registry);
if (result.warnings.length) {
  console.log(`⚠ source registry 상태 ${result.warnings.length}건:`);
  result.warnings.forEach((message) => console.log(`  - ${message}`));
}
if (result.errors.length) {
  console.error(`✗ lexicon source registry gate 실패 (${result.errors.length}건)`);
  result.errors.forEach((message) => console.error(`  - ${message}`));
  process.exit(1);
}

for (const sourceId of ['stepbible-tbesh', 'stepbible-tagnt', 'stepbible-tahot']) {
  const source = expectSource(registry, sourceId);
  assert.equal(source.license.expression, 'CC-BY-4.0');
  assert.equal(source.provenance.version, 'b86d26cdb1f51729e73b5b4eb7f7ccadc5dfba39');
  assert.equal(source.workflow.status, 'approved-ready');
  assert.equal(source.workflow.autoProcessingAllowed, true);
  assert.match(source.provenance.contentHash, SHA256_PATTERN);
}

const enhancedBdb = expectSource(registry, 'unfoldingword-bdb-enhanced');
assert.equal(enhancedBdb.license.status, 'internal-review-only');
assert.equal(enhancedBdb.workflow.status, 'internal-review-only');
assert.equal(enhancedBdb.license.externalLlmInputAllowed, false);
assert.equal(enhancedBdb.provenance.version, '5a7a632d6923641c4a71dbf23df719711e3d2041');

for (const blockedId of [
  'openscriptures-hebrewlexicon-bdb',
  'openscriptures-strongs',
  'korean-ot-nt-dictionary',
]) {
  const blocked = expectSource(registry, blockedId);
  assert.equal(blocked.workflow.status, 'blocked');
  assert.equal(blocked.workflow.autoProcessingAllowed, false);
}

runSelfTests(registry);

const ready = registry.sources.filter((source) => source.workflow.status === 'approved-ready').length;
const pending = registry.sources.filter((source) => source.workflow.status === 'approved-pending-fingerprint').length;
const internal = registry.sources.filter((source) => source.workflow.status === 'internal-review-only').length;
const blocked = registry.sources.filter((source) => source.workflow.status === 'blocked').length;
console.log(
  `✓ lexicon source registry gate 통과 · sources=${registry.sources.length} · ready=${ready} · pendingFingerprint=${pending} · internalReview=${internal} · blocked=${blocked}`,
);
