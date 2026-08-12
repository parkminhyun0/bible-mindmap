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
  computeTokenChecksum,
  verifyTokenChecksum,
} from '../src/data/translationAlignmentContract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function selected(text, spans) {
  return spans.map(span => text.slice(span.start, span.end));
}

function normalizeRelativePath(value) {
  return String(value || '').split(path.sep).join('/');
}

function validateLegacyPilotRecord(record) {
  const errors = [];
  if (!record || typeof record !== 'object' || Array.isArray(record)) return ['legacy pilot must be an object'];
  if (typeof record.schemaVersion !== 'string' || !record.schemaVersion.endsWith('-pilot')) errors.push('legacy pilot schemaVersion must end with -pilot');
  if (!record.tokenId || typeof record.tokenId !== 'string') errors.push('legacy pilot tokenId is required');
  if (!record.strong || !/^[GH]\d+$/.test(String(record.strong).toUpperCase())) errors.push('legacy pilot strong must be a G/H Strong id');
  if (!record.tokenChecksum || !/^[0-9a-f]{8}$/.test(record.tokenChecksum)) errors.push('legacy pilot tokenChecksum must be an 8-hex hash');
  if (!record.alignment || typeof record.alignment !== 'object' || Array.isArray(record.alignment)) errors.push('legacy pilot alignment object is required');
  return errors;
}

function classifyAlignmentPayload(relativePath, parsed) {
  const rel = normalizeRelativePath(relativePath);
  if (rel === 'manifest.json') return { kind: 'manifest', records: [] };

  if (rel.startsWith('pilot/')) {
    const errors = validateLegacyPilotRecord(parsed);
    if (errors.length) throw new Error(`${rel}: ${errors.join('; ')}`);
    return { kind: 'legacy-pilot', records: [] };
  }

  if (Array.isArray(parsed)) return { kind: 'records-array', records: parsed };
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.records)) {
    return { kind: 'records-envelope', records: parsed.records };
  }
  if (parsed && typeof parsed === 'object' && parsed.schemaVersion === ALIGNMENT_SCHEMA_VERSION && typeof parsed.tokenId === 'string') {
    return { kind: 'single-record', records: [parsed] };
  }

  throw new Error(`${rel}: unsupported alignment JSON shape`);
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
  const hebrewToken = 'אֱלֹהִים';
  const explicitRecord = {
    schemaVersion: ALIGNMENT_SCHEMA_VERSION,
    tokenId: 'genesis.1.1.hot.3',
    strong: 'H430',
    relation: 'direct',
    status: 'verified',
    confidence: 1,
    tokenChecksum: computeTokenChecksum(hebrewToken),
    targets: { korean: { text: explicitText, spans: [{ start: 0, end: 5 }] } },
    sourceVersions: { dictionary: 'test', krv: 'test' },
  };
  assert.deepEqual(validateAlignmentRecord(explicitRecord), []);
  assert.deepEqual(
    selected(explicitText, resolveHighlightSpans({ text: explicitText, language: 'korean', entry: { s: 'H0430' }, alignmentRecord: explicitRecord }).spans),
    ['하나님께서']
  );
  assert.equal(createTokenId({ bookId: 'Genesis', chapter: 1, verse: 1, language: 'HOT', index: 3 }), 'genesis.1.1.hot.3');

  // 판본 안정성: 니쿳/악센트 차이는 무시(같은 checksum), 자모 변경은 감지(다른 checksum)
  assert.equal(computeTokenChecksum('אֱלֹהִים'), computeTokenChecksum('אלהים'), 'checksum must ignore niqqud/accents');
  assert.notEqual(computeTokenChecksum('אלהים'), computeTokenChecksum('אלוהים'), 'checksum must catch consonant changes');
  assert.ok(verifyTokenChecksum(explicitRecord, 'אלהים').ok, 'verifyTokenChecksum accepts identical stripped form');
  assert.equal(verifyTokenChecksum(explicitRecord, 'אלוהים').ok, false, 'verifyTokenChecksum rejects mismatched surface');

  // checksum 필드 없으면 record 검증 실패해야 함
  const missingChecksum = { ...explicitRecord };
  delete missingChecksum.tokenChecksum;
  const missingErrors = validateAlignmentRecord(missingChecksum);
  assert.ok(missingErrors.some(e => e.includes('tokenChecksum')), 'validateAlignmentRecord must require tokenChecksum');

  // status 없는 explicit alignment는 verified로 승격되어서는 안 됨
  const missingStatus = { ...explicitRecord };
  delete missingStatus.status;
  const missingStatusResolved = resolveHighlightSpans({
    text: explicitText,
    language: 'korean',
    entry: { s: 'H0430' },
    userQuery: '하나님',
    alignmentRecord: missingStatus,
  });
  assert.notEqual(missingStatusResolved.source, 'alignment-record', 'missing status must not consume explicit alignment as trusted');
  assert.notEqual(missingStatusResolved.status, 'verified', 'missing status must never become verified');

  // committed JSON shape는 명시적으로 분류하고 알 수 없는 shape는 fail-closed
  assert.equal(classifyAlignmentPayload('krv/test.json', [explicitRecord]).records.length, 1);
  assert.equal(classifyAlignmentPayload('krv/test.json', { records: [explicitRecord] }).records.length, 1);
  assert.equal(classifyAlignmentPayload('krv/test.json', explicitRecord).records.length, 1);
  assert.equal(classifyAlignmentPayload('manifest.json', { schemaVersion: 'manifest' }).kind, 'manifest');
  assert.equal(classifyAlignmentPayload('pilot/test.json', {
    schemaVersion: '0.1.0-pilot',
    tokenId: 'genesis.1.1.hot.2',
    strong: 'H430',
    tokenChecksum: computeTokenChecksum(hebrewToken),
    alignment: { status: 'verified-pilot' },
  }).kind, 'legacy-pilot');
  assert.throws(
    () => classifyAlignmentPayload('krv/bad.json', { schemaVersion: 'unexpected', payload: [] }),
    /unsupported alignment JSON shape/,
    'unknown committed JSON shapes must fail closed',
  );
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
  let legacyPilotFiles = 0;
  let manifestFiles = 0;

  for (const file of walkJsonFiles(alignmentRoot)) {
    const relativeToAlignment = path.relative(alignmentRoot, file);
    let classified;
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      classified = classifyAlignmentPayload(relativeToAlignment, parsed);
    } catch (error) {
      errors.push(`${path.relative(ROOT, file)}: ${error.message}`);
      continue;
    }

    if (classified.kind === 'legacy-pilot') legacyPilotFiles += 1;
    if (classified.kind === 'manifest') manifestFiles += 1;
    classified.records.forEach((record, index) => {
      records += 1;
      validateAlignmentRecord(record).forEach(error => errors.push(`${path.relative(ROOT, file)}[${index}]: ${error}`));
    });
  }

  if (errors.length) throw new Error(`alignment data validation failed\n${errors.map(error => `- ${error}`).join('\n')}`);
  return { records, legacyPilotFiles, manifestFiles };
}

runRegressionCases();
const summary = validateCommittedAlignments();
console.log(`✓ translation alignment verifier passed · regression=29 · committedRecords=${summary.records} · legacyPilotFiles=${summary.legacyPilotFiles} · manifestFiles=${summary.manifestFiles}`);
