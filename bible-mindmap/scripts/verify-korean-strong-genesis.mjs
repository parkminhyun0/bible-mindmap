#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KOREAN_GLOSS } from '../src/data/koreanGloss.js';
import {
  KOREAN_GLOSS_GENESIS_1_BATCH_01,
  KOREAN_GLOSS_GENESIS_1_BATCH_01_META,
} from '../src/data/koreanGlossGenesis1Batch01.js';
import {
  KOREAN_GLOSS_GENESIS_1_BATCH_02,
  KOREAN_GLOSS_GENESIS_1_BATCH_02_META,
} from '../src/data/koreanGlossGenesis1Batch02.js';
import { KOREAN_GLOSS_ACTIVE } from '../src/data/koreanGlossActive.js';
import { findKoreanSpans, splitGlossCandidates } from '../src/utils/translationAlignment.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ALIGNMENT_PATH = path.join(ROOT, 'public/data/alignment/krv/genesis/1.json');
const STRONG_RE = /^H\d+$/;
const REQUIRED_FIELDS = ['lemma', 'translit', 'translitKo', 'glossKo', 'note', 'review'];
const SENSITIVE = new Set(['H430']);
const errors = [];

const batches = [
  { entries: KOREAN_GLOSS_GENESIS_1_BATCH_01, meta: KOREAN_GLOSS_GENESIS_1_BATCH_01_META },
  { entries: KOREAN_GLOSS_GENESIS_1_BATCH_02, meta: KOREAN_GLOSS_GENESIS_1_BATCH_02_META },
];
const seen = new Set();

for (const { entries: batch, meta } of batches) {
  const entries = Object.entries(batch);
  if (entries.length !== meta.entryCount) {
    errors.push(`${meta.batchId}: entryCount mismatch meta=${meta.entryCount}, actual=${entries.length}`);
  }
  if (meta.status !== 'candidate') errors.push(`${meta.batchId}: status must remain candidate`);

  for (const [strong, entry] of entries) {
    if (!STRONG_RE.test(strong)) errors.push(`${strong}: invalid Strong ID`);
    if (Object.prototype.hasOwnProperty.call(KOREAN_GLOSS, strong)) {
      errors.push(`${strong}: duplicates existing koreanGloss.js entry`);
    }
    if (seen.has(strong)) errors.push(`${strong}: duplicated across Genesis batches`);
    seen.add(strong);

    for (const field of REQUIRED_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(entry, field)) errors.push(`${strong}: missing ${field}`);
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
}

const expectedActiveCount = Object.keys(KOREAN_GLOSS).length + seen.size;
if (Object.keys(KOREAN_GLOSS_ACTIVE).length !== expectedActiveCount) {
  errors.push(`active dictionary count mismatch: expected=${expectedActiveCount}, actual=${Object.keys(KOREAN_GLOSS_ACTIVE).length}`);
}

const alignment = JSON.parse(fs.readFileSync(ALIGNMENT_PATH, 'utf8'));
const projected = alignment.records.map((record) => {
  const gloss = KOREAN_GLOSS_ACTIVE[record.strong];
  const candidates = gloss ? splitGlossCandidates(gloss.glossKo) : [];
  const verseText = record.targets?.korean?.text || '';

  if (!candidates.length) return { ...record, status: 'review', relation: 'uncertain', reason: 'missing' };
  const spans = findKoreanSpans(verseText, candidates);
  if (spans.length !== 1) {
    return { ...record, status: 'review', relation: spans.length ? 'direct' : 'uncertain', reason: spans.length ? 'multiple' : 'no-span' };
  }
  if (gloss.review === true || SENSITIVE.has(record.strong)) {
    return { ...record, status: 'review', relation: 'direct', reason: 'review-required' };
  }
  return { ...record, status: 'auto', relation: 'direct', reason: 'single-match' };
});

const total = projected.length;
const auto = projected.filter((r) => r.status === 'auto').length;
const review = projected.filter((r) => r.status === 'review').length;
const uncertain = projected.filter((r) => r.relation === 'uncertain').length;
const missing = projected.filter((r) => r.reason === 'missing').length;
const baselineAuto = alignment.records.filter((r) => r.status === 'auto').length;

if (total !== 52) errors.push(`expected 52 pilot tokens, got ${total}`);
if (auto < baselineAuto) errors.push(`projected auto count regressed: baseline=${baselineAuto}, projected=${auto}`);
if (missing >= 41) errors.push(`missing gloss count did not improve: baseline=41, projected=${missing}`);

if (errors.length) {
  console.error('✗ Genesis 1 Korean Strong verification failed');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('✓ Genesis 1 Korean Strong verification passed');
console.log(`  baseline entries: ${Object.keys(KOREAN_GLOSS).length}`);
console.log(`  extension entries: ${seen.size}`);
console.log(`  active entries: ${Object.keys(KOREAN_GLOSS_ACTIVE).length}`);
console.log(`  pilot tokens: ${total}`);
console.log(`  baseline auto: ${baselineAuto}/${total} (${((baselineAuto / total) * 100).toFixed(1)}%)`);
console.log(`  projected auto: ${auto}/${total} (${((auto / total) * 100).toFixed(1)}%)`);
console.log(`  projected review: ${review}`);
console.log(`  projected uncertain: ${uncertain}`);
console.log(`  projected missing gloss: ${missing}`);
