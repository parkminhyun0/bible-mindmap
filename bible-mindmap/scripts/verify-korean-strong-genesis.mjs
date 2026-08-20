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
import {
  KOREAN_GLOSS_TOP_BATCH_01,
  KOREAN_GLOSS_TOP_BATCH_01_META,
} from '../src/data/koreanGlossTopBatch01.js';
import {
  KOREAN_GLOSS_TOP_BATCH_02,
  KOREAN_GLOSS_TOP_BATCH_02_META,
} from '../src/data/koreanGlossTopBatch02.js';
import { KOREAN_GLOSS_ACTIVE } from '../src/data/koreanGlossActive.js';
import { findKoreanSpans, splitGlossCandidates } from '../src/utils/translationAlignment.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ALIGNMENT_PATH = path.join(ROOT, 'public/data/alignment/krv/genesis/1.json');
const STRONG_RE = /^H\d+$/;
const TOP_STRONG_RE = /^[HG]\d+$/;
const REQUIRED_FIELDS = ['lemma', 'translit', 'translitKo', 'glossKo', 'note', 'review'];
const SENSITIVE = new Set(['H430']);
const errors = [];

const batches = [
  { entries: KOREAN_GLOSS_GENESIS_1_BATCH_01, meta: KOREAN_GLOSS_GENESIS_1_BATCH_01_META },
  { entries: KOREAN_GLOSS_GENESIS_1_BATCH_02, meta: KOREAN_GLOSS_GENESIS_1_BATCH_02_META },
];
const seen = new Set();
const topSeen = new Set();

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

// 빈도 상위 배치(구약·신약 공통)도 같은 규칙으로 검사한다. 창세기 배치와 달리
// 헬라어(G) 항목을 포함하고, TAHOT 에 학술 음역 필드가 없어 히브리어 translit 은
// 비어 있을 수 있다. 그 두 가지만 다르고 나머지 계약은 동일하다.
for (const { entries: topBatch, meta } of [
  { entries: KOREAN_GLOSS_TOP_BATCH_01, meta: KOREAN_GLOSS_TOP_BATCH_01_META },
  { entries: KOREAN_GLOSS_TOP_BATCH_02, meta: KOREAN_GLOSS_TOP_BATCH_02_META },
]) {
  const entries = Object.entries(topBatch);
  if (entries.length !== meta.entryCount) {
    errors.push(`${meta.batchId}: entryCount mismatch meta=${meta.entryCount}, actual=${entries.length}`);
  }
  if (meta.status !== 'candidate') errors.push(`${meta.batchId}: status must remain candidate`);

  let reviewed = 0;
  for (const [strong, entry] of entries) {
    if (!TOP_STRONG_RE.test(strong)) errors.push(`${strong}: invalid Strong ID`);
    if (Object.prototype.hasOwnProperty.call(KOREAN_GLOSS, strong)) {
      errors.push(`${strong}: duplicates existing koreanGloss.js entry`);
    }
    if (seen.has(strong)) errors.push(`${strong}: duplicates a Genesis batch entry`);
    if (topSeen.has(strong)) errors.push(`${strong}: duplicated inside the top-frequency batch`);
    topSeen.add(strong);

    for (const field of REQUIRED_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(entry, field)) errors.push(`${strong}: missing ${field}`);
    }
    // translit 은 히브리어에서 비어 있을 수 있다(TAHOT 미제공). 나머지는 비면 안 된다.
    for (const field of ['lemma', 'translitKo', 'glossKo', 'note']) {
      if (typeof entry[field] !== 'string' || entry[field].trim() === '') {
        errors.push(`${strong}: ${field} must be a non-empty string`);
      }
    }
    if (typeof entry.translit !== 'string') errors.push(`${strong}: translit must be a string`);
    if (typeof entry.review !== 'boolean') errors.push(`${strong}: review must be boolean`);
    // variants 는 통용되는 다른 표기다. 있으면 팝업이 note 를 함께 보여 준다.
    // 비어 있는 배열이나 표제 표기와 같은 값이 들어가면 화면에 헛것이 뜬다.
    if (entry.variants !== undefined) {
      if (!Array.isArray(entry.variants) || entry.variants.length === 0) {
        errors.push(`${strong}: variants must be a non-empty array when present`);
      } else {
        for (const v of entry.variants) {
          if (typeof v !== 'string' || v.trim() === '') errors.push(`${strong}: variants entries must be non-empty strings`);
          if (v === entry.translitKo) errors.push(`${strong}: variants must not repeat translitKo`);
        }
      }
    }
    if (SENSITIVE.has(strong) && entry.review !== true) {
      errors.push(`${strong}: theological sensitive entry must remain review=true`);
    }
    if (entry.review === true) reviewed += 1;
  }
  if (reviewed !== meta.reviewedCount) {
    errors.push(`${meta.batchId}: reviewedCount mismatch meta=${meta.reviewedCount}, actual=${reviewed}`);
  }
  if (entries.length - reviewed !== meta.pendingCount) {
    errors.push(`${meta.batchId}: pendingCount mismatch meta=${meta.pendingCount}, actual=${entries.length - reviewed}`);
  }
}

// batch 02 는 히브리어 학술 음역까지 직접 채운 배치라 batch 01 과 달리 translit 이
// 비어 있으면 안 된다. 또 박 목사님 확인 전까지 전 항목이 검토 대상으로 남아야 한다.
for (const [strong, entry] of Object.entries(KOREAN_GLOSS_TOP_BATCH_02)) {
  if (typeof entry.translit !== 'string' || entry.translit.trim() === '') {
    errors.push(`${strong}: top-frequency-batch-02 requires a non-empty translit`);
  }
  if (entry.review !== true) {
    errors.push(`${strong}: top-frequency-batch-02 entries must remain review=true until approval`);
  }
}

// 활성 사전에 계산되지 않은 항목이 섞여 들어오지 않았는지 확인한다.
const expectedActiveCount = Object.keys(KOREAN_GLOSS).length + seen.size + topSeen.size;
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
