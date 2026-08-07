#!/usr/bin/env node

import { KOREAN_GLOSS } from '../src/data/koreanGloss.js';
import {
  KOREAN_GLOSS_GENESIS_1_BATCH_01,
  KOREAN_GLOSS_GENESIS_1_BATCH_01_META,
} from '../src/data/koreanGlossGenesis1Batch01.js';

const STRONG_RE = /^H\d+$/;
const REQUIRED_FIELDS = ['lemma', 'translit', 'translitKo', 'glossKo', 'note', 'review'];
const SENSITIVE = new Set(['H430']);

const errors = [];
const entries = Object.entries(KOREAN_GLOSS_GENESIS_1_BATCH_01);

if (entries.length !== KOREAN_GLOSS_GENESIS_1_BATCH_01_META.entryCount) {
  errors.push(`entryCount mismatch: meta=${KOREAN_GLOSS_GENESIS_1_BATCH_01_META.entryCount}, actual=${entries.length}`);
}

for (const [strong, entry] of entries) {
  if (!STRONG_RE.test(strong)) errors.push(`${strong}: invalid Strong ID`);
  if (Object.prototype.hasOwnProperty.call(KOREAN_GLOSS, strong)) {
    errors.push(`${strong}: duplicates existing koreanGloss.js entry`);
  }

  for (const field of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(entry, field)) {
      errors.push(`${strong}: missing ${field}`);
    }
  }

  for (const field of ['lemma', 'translit', 'translitKo', 'glossKo', 'note']) {
    if (typeof entry[field] !== 'string' || entry[field].trim() === '') {
      errors.push(`${strong}: ${field} must be a non-empty string`);
    }
  }

  if (typeof entry.review !== 'boolean') errors.push(`${strong}: review must be boolean`);
  if (SENSITIVE.has(strong) && entry.review !== true) {
    errors.push(`${strong}: theological sensitive entry must remain review=true`);
  }
}

if (KOREAN_GLOSS_GENESIS_1_BATCH_01_META.status !== 'candidate') {
  errors.push('batch status must remain candidate before Jarvis/Gemini review');
}

if (errors.length) {
  console.error('✗ Genesis 1 Korean Strong batch verification failed');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('✓ Genesis 1 Korean Strong batch verification passed');
console.log(`  new entries: ${entries.length}`);
console.log(`  existing duplicates: 0`);
console.log(`  candidate status: ${KOREAN_GLOSS_GENESIS_1_BATCH_01_META.status}`);
