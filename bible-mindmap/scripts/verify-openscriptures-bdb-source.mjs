#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/lexicon/source-registry.json'), 'utf8'));
const review = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/lexicon/source-reviews/openscriptures-hebrewlexicon-bdb.license-review.v1.json'), 'utf8'));
const source = registry.sources.find((item) => item.sourceId === 'openscriptures-hebrewlexicon-bdb');

assert.ok(source, 'OpenScriptures BDB source missing');
assert.equal(source.license.status, 'approved');
assert.equal(source.license.expression, 'CC-BY-4.0');
assert.equal(source.license.attributionText, 'Open Scriptures Hebrew Bible Project');
assert.equal(source.license.derivativeAllowed, true);
assert.equal(source.license.redistributionAllowed, true);
assert.equal(source.license.externalLlmInputAllowed, true);
assert.equal(source.license.fullTextStorageAllowed, true);
assert.equal(source.provenance.version, '21c9add13bc727d3a951361778e97e3ff7afd1ce');
assert.deepEqual(source.provenance.datasetPaths, [
  'BrownDriverBriggs.xml',
  'LexicalIndex.xml',
  'BDBPartsOfSpeech.xml',
  'AugIndex.xml',
]);
assert.ok(['approved-pending-fingerprint', 'approved-ready'].includes(source.workflow.status));
assert.equal(review.reviewStatus, 'approved');
assert.equal(review.verdict, 'promote-approved');
assert.equal(review.candidateGenerationAllowed, false);
assert.ok(review.evidence.some((item) => item.authority === 'dataset-owner' && item.directlyApplies && item.exactLicenseExpression === 'CC-BY-4.0'));
assert.ok(review.promotionRequirements.some((item) => item.includes('fingerprint')));

if (source.workflow.status === 'approved-pending-fingerprint') {
  assert.equal(source.workflow.autoProcessingAllowed, false);
  assert.equal(source.provenance.fileCount, null);
  assert.equal(source.provenance.totalBytes, null);
  assert.equal(source.provenance.contentHash, null);
  assert.equal(source.provenance.retrievedAt, null);
}

if (source.workflow.status === 'approved-ready') {
  assert.equal(source.workflow.autoProcessingAllowed, true);
  assert.ok(Number.isInteger(source.provenance.fileCount) && source.provenance.fileCount === 4);
  assert.ok(Number.isInteger(source.provenance.totalBytes) && source.provenance.totalBytes > 0);
  assert.match(source.provenance.contentHash, /^sha256:[a-f0-9]{64}$/);
  assert.ok(!Number.isNaN(Date.parse(source.provenance.retrievedAt)));
}

console.log(`✓ OpenScriptures BDB source contract · ${source.workflow.status} · candidate generation disabled`);
