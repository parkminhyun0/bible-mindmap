#!/usr/bin/env node
import assert from 'node:assert/strict';
import { computeTokenChecksum } from '../src/data/translationAlignmentContract.js';
import {
  normalizeAlignmentPayload,
  resolveAlignmentPayload,
} from '../src/utils/alignmentLoaderCore.js';

const surface = 'אֱלֹהִים';
const checksum = computeTokenChecksum(surface);
assert.equal(checksum, '454e0125');

const record = {
  schemaVersion: '1.0.0',
  tokenId: 'genesis.1.1.hot.2',
  strong: 'H430',
  tokenChecksum: checksum,
  relation: 'direct',
  status: 'verified',
  confidence: 0.98,
  targets: {
    korean: {
      text: '태초에 하나님이 천지를 창조하시니라',
      spans: [{ start: 4, end: 8 }],
    },
  },
  sourceVersions: { dictionary: 'v1', krv: 'v1' },
};
const payload = { schemaVersion: '1.0.0', records: [record] };

const ready = resolveAlignmentPayload({
  payload,
  tokenId: 'GENESIS.1.1.HOT.2',
  currentSurface: surface,
  currentSourceVersions: { dictionary: 'v1', krv: 'v1' },
  verseText: '태초에 하나님이 천지를 창조하시니라',
});
assert.equal(ready.status, 'ready');
assert.deepEqual(ready.target.spans, [{ start: 4, end: 8 }]);

const stale = resolveAlignmentPayload({
  payload,
  tokenId: record.tokenId,
  currentSurface: surface,
  currentSourceVersions: { dictionary: 'v2', krv: 'v1' },
  verseText: record.targets.korean.text,
});
assert.equal(stale.status, 'stale');

const checksumMismatch = resolveAlignmentPayload({
  payload,
  tokenId: record.tokenId,
  currentSurface: 'אֱלוֹהַּ',
  currentSourceVersions: { dictionary: 'v1', krv: 'v1' },
  verseText: record.targets.korean.text,
});
assert.equal(checksumMismatch.status, 'checksum-mismatch');

const missing = resolveAlignmentPayload({
  payload: null,
  tokenId: record.tokenId,
  currentSurface: surface,
  verseText: record.targets.korean.text,
});
assert.equal(missing.status, 'missing');

const reviewPayload = {
  schemaVersion: '1.0.0',
  records: [{ ...record, status: 'review', relation: 'uncertain', confidence: 0.4, targets: { korean: { text: record.targets.korean.text, spans: [] } } }],
};
const review = resolveAlignmentPayload({
  payload: reviewPayload,
  tokenId: record.tokenId,
  currentSurface: surface,
  currentSourceVersions: { dictionary: 'v1', krv: 'v1' },
  verseText: record.targets.korean.text,
});
assert.equal(review.status, 'review');

const pilot = normalizeAlignmentPayload({
  tokenId: 'GEN.1.1.hot.2',
  tokenChecksum: checksum,
  bookId: 'genesis',
  chapter: 1,
  strong: 'H430',
  alignment: {
    relation: 'direct',
    status: 'verified-pilot',
    confidence: 0.98,
    krv: {
      translation: 'KRV',
      text: record.targets.korean.text,
      span: { start: 4, end: 8, text: '하나님이' },
    },
  },
  sourceVersions: { dictionary: 'v1', krv: 'v1' },
});
assert.equal(pilot.records[0].schemaVersion, '1.0.0');
assert.equal(pilot.records[0].status, 'verified');
assert.equal(pilot.records[0].tokenId, 'gen.1.1.hot.2');

console.log('✓ alignment loader verifier passed · ready/stale/checksum/missing/review/pilot');
