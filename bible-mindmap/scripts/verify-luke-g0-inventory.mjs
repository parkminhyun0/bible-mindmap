#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');
const inventoryPath = path.join(APP_ROOT, 'data/lexicon/luke-g0-inventory.json');
const reportPath = path.join(APP_ROOT, 'data/lexicon/luke-g0-report.json');
const docPath = path.join(APP_ROOT, 'docs/luke-g0-inventory.md');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const [inventory, report, markdown] = await Promise.all([
  fs.readFile(inventoryPath, 'utf8').then(JSON.parse),
  fs.readFile(reportPath, 'utf8').then(JSON.parse),
  fs.readFile(docPath, 'utf8'),
]);

const s = inventory.summary;
assert(inventory.book === 'Luke', 'book must be Luke');
assert(inventory.stage === 'G0', 'stage must be G0');
assert(inventory.policy.productionWriteAllowed === false, 'production writes must remain disabled');
assert(inventory.policy.providerCallsAllowed === false, 'provider calls must remain disabled');
assert(s.chapters === 24, `expected 24 chapters, got ${s.chapters}`);
assert(s.verses === 1149, `expected 1149 verses, got ${s.verses}`);
assert(s.tagntSblTokenCount > 19000 && s.tagntSblTokenCount < 20000, `unexpected TAGNT token count ${s.tagntSblTokenCount}`);
assert(s.morphgntTokenCount > 19000 && s.morphgntTokenCount < 20000, `unexpected MorphGNT token count ${s.morphgntTokenCount}`);
assert(Math.abs(s.tokenCountDeltaTagntMinusMorphgnt) <= 100, `token delta too large: ${s.tokenCountDeltaTagntMinusMorphgnt}`);
assert(s.tagntUniqueStrongCount > 1800, `unexpected Strong count ${s.tagntUniqueStrongCount}`);
assert(s.tagntUniqueLemmaCount > 1900, `unexpected TAGNT lemma count ${s.tagntUniqueLemmaCount}`);
assert(s.existingKoreanStrongCount > 0, 'expected reusable Korean Strong entries');
assert(s.newTranslationStrongCount > 0, 'expected a non-empty new translation queue');
assert(
  s.existingKoreanStrongCount + s.newTranslationStrongCount === s.tagntUniqueStrongCount,
  'reuse and new Strong counts must partition the inventory',
);
assert(inventory.newTranslationQueue.length === s.newTranslationStrongCount, 'new queue count mismatch');
assert(inventory.chapterStats.length === 24, 'chapter stats must cover 24 chapters');
assert(inventory.diagnostics.duplicateTokenCount === 0, 'duplicate canonical token IDs are forbidden');
assert(inventory.diagnostics.missingStrongTokenIds.length === 0, 'missing Strong tokens are forbidden');
assert(report.pass === true, 'G0 report must pass');
assert(markdown.includes('누가복음 G0'), 'markdown report title missing');
assert(markdown.includes('실제 NVIDIA·OpenAI 호출: **0건**'), 'manual provider boundary missing');

const strongs = inventory.strongs.map((entry) => entry.strong);
assert(strongs.every((strong) => /^G[1-9]\d*$/u.test(strong)), 'Strong keys must be normalized');
for (let index = 1; index < strongs.length; index += 1) {
  assert(
    Number(strongs[index - 1].slice(1)) < Number(strongs[index].slice(1)),
    'Strong inventory must be strictly sorted',
  );
}

console.log(`Luke G0 verifier PASS: ${s.chapters} chapters, ${s.verses} verses, ${s.tagntSblTokenCount} tokens, ${s.tagntUniqueStrongCount} Strong.`);
