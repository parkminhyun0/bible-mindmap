#!/usr/bin/env node

import { KOREAN_GLOSS } from '../src/data/koreanGloss.js';
import {
  KOREAN_GLOSS_GENESIS_1_BATCH_01,
  KOREAN_GLOSS_GENESIS_1_BATCH_01_META,
} from '../src/data/koreanGlossGenesis1Batch01.js';
import {
  KOREAN_GLOSS_GENESIS_1_BATCH_02,
  KOREAN_GLOSS_GENESIS_1_BATCH_02_META,
} from '../src/data/koreanGlossGenesis1Batch02.js';

const STRONG_RE = /^H\d+$/;
const REQUIRED_FIELDS = ['lemma', 'translit', 'translitKo', 'glossKo', 'note', 'review'];
const SENSITIVE = new Set(['H430']);
const batches = [
  {
    name: 'batch01',
    data: KOREAN_GLOSS_GENESIS_1_BATCH_01,
    meta: KOREAN_GLOSS_GENESIS_1_BATCH_01_META,
  },
  {
    name: 'batch02',
    data: KOREAN_GLOSS_GENESIS_1_BATCH_02,
    meta: KOREAN_GLOSS_GENESIS_1_BATCH_02_META,
  },
];

const errors = [];
const seen = new Set();
let totalEntries = 0;

for (const batch of batches) {
  const entries = Object.entries(batch.data);
  totalEntries += entries.length;

  if (entries.length !== batch.meta.entryCount) {
    errors.push(`${batch.name}: entryCount mismatch: meta=${batch.meta.entryCount}, actual=${entries.length}`);
  }
  if (batch.meta.status !== 'candidate') {
    errors.push(`${batch.name}: status must remain candidate before Jarvis/Gemini review`);
  }

  for (const [strong, entry] of entries) {
    if (!STRONG_RE.test(strong)) errors.push(`${batch.name}/${strong}: invalid Strong ID`);
    if (Object.prototype.hasOwnProperty.call(KOREAN_GLOSS, strong)) {
      errors.push(`${batch.name}/${strong}: duplicates existing koreanGloss.js entry`);
    }
    if (seen.has(strong)) errors.push(`${batch.name}/${strong}: duplicates another Genesis batch entry`);
    seen.add(strong);

    for (const field of REQUIRED_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(entry, field)) {
        errors.push(`${batch.name}/${strong}: missing ${field}`);
      }
    }

    for (const field of ['lemma', 'translit', 'translitKo', 'glossKo', 'note']) {
      if (typeof entry[field] !== 'string' || entry[field].trim() === '') {
        errors.push(`${batch.name}/${strong}: ${field} must be a non-empty string`);
      }
    }

    if (typeof entry.review !== 'boolean') errors.push(`${batch.name}/${strong}: review must be boolean`);
    if (SENSITIVE.has(strong) && entry.review !== true) {
      errors.push(`${batch.name}/${strong}: theological sensitive entry must remain review=true`);
    }
  }
}

if (errors.length) {
  console.error('✗ Genesis 1 Korean Strong batch verification failed');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('✓ Genesis 1 Korean Strong batch verification passed');
console.log(`  batches: ${batches.length}`);
console.log(`  new entries: ${totalEntries}`);
console.log('  existing duplicates: 0');
console.log('  cross-batch duplicates: 0');
console.log('  candidate status: preserved');
