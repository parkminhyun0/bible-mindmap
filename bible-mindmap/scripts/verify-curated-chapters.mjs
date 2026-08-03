// 장별 심화 curated 본문 정합성 verifier
// P0-1 하드 게이트: 완전성, lex 필수, 절 범위, 구조, 내용 품질을 검사한다.
// lex corpus와 앱 기준 역본의 절 번호가 다른 경우는 명시적 예외만 허용한다.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_BOOKS, isOT } from '../src/data/bibleBooks.js';
import { CURATED_CHAPTER_DETAILS } from '../src/data/curatedChapterDetails.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const issues = [];
const warns = [];
const fail = (message) => issues.push(message);
const warn = (message) => warns.push(message);

const argBooks = process.argv.slice(2).filter(Boolean);
const bookMeta = new Map(ALL_BOOKS.map((book) => [book.id, book]));

// STEPBible TAGNT의 로마서 16장은 24절로 인덱싱되지만,
// KRV 등 앱 기준 역본에는 최종 송영이 25~27절로 존재한다.
const VERSE_MAX_OVERRIDES = new Map([
  ['Rom:16', { maxVerse: 27, reason: 'TAGNT/KRV versification difference for the final doxology' }],
]);

function getEffectiveMaxVerse(bookId, chapter, lexMaxVerse) {
  const override = VERSE_MAX_OVERRIDES.get(`${bookId}:${chapter}`);
  if (!override) return lexMaxVerse;
  if (override.maxVerse < lexMaxVerse) {
    fail(`${bookId}:${chapter} 절 상한 예외 ${override.maxVerse}가 lex 최대 ${lexMaxVerse}보다 작음`);
    return lexMaxVerse;
  }
  warn(`${bookId}:${chapter} 절 상한 ${lexMaxVerse}→${override.maxVerse} 적용 (${override.reason})`);
  return override.maxVerse;
}

function loadLexMaxVerses(bookId) {
  const meta = bookMeta.get(bookId);
  const corpus = meta?.lexCorpus || (isOT(bookId) ? 'hot' : 'gnt');
  const dir = path.resolve(__dirname, `../public/data/lex/${corpus}/${bookId}`);

  if (!fs.existsSync(dir)) {
    fail(`${bookId}: lex 디렉터리 없음 (${path.relative(process.cwd(), dir)})`);
    return null;
  }

  const map = {};
  const jsonFiles = fs.readdirSync(dir).filter((file) => file.endsWith('.json'));
  if (jsonFiles.length === 0) {
    fail(`${bookId}: lex JSON 파일 없음 (${path.relative(process.cwd(), dir)})`);
    return null;
  }

  for (const file of jsonFiles) {
    const chapter = Number(file.replace('.json', ''));
    if (!Number.isInteger(chapter) || chapter < 1) continue;

    const filePath = path.join(dir, file);
    let json;
    try {
      json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      fail(`${bookId}:${chapter} lex JSON 파싱 실패 (${error.message})`);
      continue;
    }

    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      fail(`${bookId}:${chapter} lex 루트가 객체가 아님`);
      continue;
    }

    const verses = Object.keys(json)
      .map(Number)
      .filter((verse) => Number.isInteger(verse) && verse >= 1);

    if (verses.length === 0) {
      fail(`${bookId}:${chapter} lex에 유효한 절 키가 없음`);
      continue;
    }

    map[chapter] = Math.max(...verses);
  }

  return map;
}

const targets = argBooks.length ? argBooks : Object.keys(CURATED_CHAPTER_DETAILS);

for (const bookId of targets) {
  const detail = CURATED_CHAPTER_DETAILS[bookId];
  if (!detail) {
    fail(`${bookId}: registry에 없음`);
    continue;
  }

  const meta = bookMeta.get(bookId);
  if (!meta) {
    fail(`${bookId}: bibleBooks 미등록`);
    continue;
  }

  const lexMap = loadLexMaxVerses(bookId);
  const chapterKeys = Object.keys(detail)
    .map(Number)
    .filter(Number.isInteger)
    .sort((a, b) => a - b);

  for (let chapter = 1; chapter <= meta.chapters; chapter += 1) {
    if (!(chapter in detail)) fail(`${bookId}:${chapter}장 누락 (총 ${meta.chapters}장이어야 함)`);
    if (!lexMap || !Number.isInteger(lexMap[chapter]) || lexMap[chapter] < 1) {
      fail(`${bookId}:${chapter} lex 장 데이터 없음 — 절 범위 검증 불가`);
    }
  }

  for (const chapter of chapterKeys) {
    if (chapter < 1 || chapter > meta.chapters) {
      fail(`${bookId}:${chapter}장은 책 범위(1~${meta.chapters}) 초과`);
    }
  }

  const seenAgenda = new Map();

  for (const chapter of chapterKeys) {
    const entry = detail[chapter];
    if (!entry || typeof entry !== 'object') {
      fail(`${bookId}:${chapter} 항목이 객체가 아님`);
      continue;
    }

    const keyVerse = entry.keyVerses?.[0];
    const structureNode = entry.structureNodes?.[0];
    const verse = keyVerse?.verse;

    if (!Number.isInteger(verse)) {
      fail(`${bookId}:${chapter} keyVerses[0].verse 정수 아님`);
      continue;
    }

    if (!structureNode || structureNode.verse !== verse) {
      fail(`${bookId}:${chapter} structureNodes[0].verse≠keyVerses[0].verse`);
    }
    if (structureNode && structureNode.id !== `curated-${verse}`) {
      fail(`${bookId}:${chapter} structureNode id가 curated-${verse} 아님 (${structureNode.id})`);
    }
    if (structureNode && structureNode.source !== 'curated') {
      fail(`${bookId}:${chapter} structureNode source≠'curated'`);
    }

    const lexMaxVerse = lexMap?.[chapter];
    if (Number.isInteger(lexMaxVerse)) {
      const maxVerse = getEffectiveMaxVerse(bookId, chapter, lexMaxVerse);
      if (verse < 1 || verse > maxVerse) {
        fail(`${bookId}:${chapter} verse ${verse}가 실제 범위 1~${maxVerse}절을 벗어남`);
      }
    }

    const agenda = (entry.agenda || '').trim();
    const label = (keyVerse?.label || '').trim();
    if (agenda.length < 8) fail(`${bookId}:${chapter} agenda 비었거나 과도하게 짧음`);
    if (label.length < 4) fail(`${bookId}:${chapter} label 비었거나 과도하게 짧음`);
    if (seenAgenda.has(agenda)) {
      fail(`${bookId}:${chapter} agenda가 ${seenAgenda.get(agenda)}장과 완전히 동일(복제)`);
    }
    seenAgenda.set(agenda, chapter);
  }

  console.log(`  · ${bookId}: ${chapterKeys.length}/${meta.chapters}장 · lex 하드 대조`);
}

console.log(`장별 curated 본문 정합성 verifier · 대상 ${targets.length}권`);
if (warns.length) {
  console.log(`⚠️ 경고 ${warns.length}건:`);
  for (const message of warns) console.log(`  - ${message}`);
}
if (issues.length) {
  console.error(`✗ 본문 정합성 검증 실패 (${issues.length}건)`);
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exit(1);
}
console.log('✓ 장별 curated 본문 정합성 통과 (완전성·lex 필수·절범위·구조·내용)');
