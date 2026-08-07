#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findEnglishSpans,
  findKoreanSpans,
  findOriginalSpans,
  resolveHighlightSpans,
} from '../src/utils/translationAlignment.js';
import {
  ALIGNMENT_SCHEMA_VERSION,
  createTokenId,
  validateAlignmentRecord,
} from '../src/data/translationAlignmentContract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function selected(text, spans) {
  return spans.map(span => text.slice(span.start, span.end));
}

function runRegressionCases() {
  const hebrew = 'בְּרֵאשִׁית בָּרָא אֱלֹהִים';
  assert.deepEqual(selected(hebrew, findOriginalSpans(hebrew, ['אלהים'])), ['אֱלֹהִים']);

  const greek = 'χάρις θεοῦ καὶ εἰρήνη';
  assert.deepEqual(selected(greek, findOriginalSpans(greek, ['θεου'])), ['θεοῦ']);

  for (const word of ['하나님은', '하나님이', '하나님의', '하나님께서', '하나님께서는', '하나님에게도', '하나님을']) {
    const text = `${word} 말씀하셨다`;
    assert.deepEqual(selected(text, findKoreanSpans(text, ['하나님'])), [word], `Korean span failed: ${word}`);
  }
  assert.deepEqual(findKoreanSpans('하나님나라를 세우셨다', ['하나님']), [], 'invalid noun compound must not be guessed');
  assert.deepEqual(findKoreanSpans('그 말씀은 참되다', ['말']), [], 'substring inside another lexeme must not match');

  assert.deepEqual(selected("God's grace", findEnglishSpans("God's grace", ['God'])), ["God's"]);
  assert.deepEqual(selected('God created the heavens', findEnglishSpans('God created the heavens', ['create'])), ['created']);
  assert.deepEqual(findEnglishSpans('the creator spoke', ['create']), [], 'derivational words must not be treated as inflections');

  const explicitText = '하나님께서 말씀하셨다';
  const explicitRecord = {
    schemaVersion: ALIGNMENT_SCHEMA_VERSION,
    tokenId: 'genesis.1.1.hot.3',
    strong: 'H430',
    relation: 'direct',
    status: 'verified',
    confidence: 1,
    targets: { korean: { text: explicitText, spans: [{ start: 0, end: 5 }] } },
    sourceVersions: { dictionary: 'test', krv: 'test' },
  };
  assert.deepEqual(validateAlignmentRecord(explicitRecord), []);
  assert.deepEqual(
    selected(explicitText, resolveHighlightSpans({ text: explicitText, language: 'korean', entry: { s: 'H0430' }, alignmentRecord: explicitRecord }).spans),
    ['하나님께서']
  );
  assert.equal(createTokenId({ bookId: 'Genesis', chapter: 1, verse: 1, language: 'HOT', index: 3 }), 'genesis.1.1.hot.3');
}

function walkJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkJsonFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.json')) files.push(full);
  }
  return files;
}

function validateCommittedAlignments() {
  const alignmentRoot = path.join(ROOT, 'public', 'data', 'alignment');
  const errors = [];
  let records = 0;
  for (const file of walkJsonFiles(alignmentRoot)) {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    const list = Array.isArray(parsed) ? parsed : parsed.records || [];
    list.forEach((record, index) => {
      records += 1;
      validateAlignmentRecord(record).forEach(error => errors.push(`${path.relative(ROOT, file)}[${index}]: ${error}`));
    });
  }
  if (errors.length) throw new Error(`alignment data validation failed\n${errors.map(error => `- ${error}`).join('\n')}`);
  return records;
}

runRegressionCases();
const recordCount = validateCommittedAlignments();
console.log(`✓ translation alignment verifier passed · regression=18 · committedRecords=${recordCount}`);
