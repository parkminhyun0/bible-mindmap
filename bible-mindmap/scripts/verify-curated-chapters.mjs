// 장별 심화 curated 본문 정합성 verifier
// P0-1 하드 게이트 (PR 검증 대상):
//   1) 완전성 — 모든 장 존재, 초과/중복 장 없음
//   2) 절 범위 — 실제 lex 장 파일의 최대 절을 초과하면 FAIL
//   3) lex 필수 — corpus/책 디렉터리, 장 파일, 유효 JSON, 절 키가 없으면 FAIL
//   4) 구조 일관성 — structureNodes[0]와 keyVerses[0] 일치
//   5) 내용 — agenda·label 품질과 복제 검사
//
// 신학적 정확성은 기계가 판단하지 않으며 사용자 검토 게이트와 병행한다.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_BOOKS } from '../src/data/bibleBooks.js';
import { CURATED_CHAPTER_DETAILS } from '../src/data/curatedChapterDetails.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const issues = [];
const warns = [];
const fail = (m) => issues.push(m);
const warn = (m) => warns.push(m);

const argBooks = process.argv.slice(2).filter(Boolean);
const bookMeta = new Map(ALL_BOOKS.map((b) => [b.id, b]));

function loadLexMaxVerses(bookId) {
  const meta = bookMeta.get(bookId);
  const corpus = meta?.lexCorpus || (meta?.testament === 'NT' ? 'gnt' : 'hot');
  const dir = path.resolve(__dirname, `../public/data/lex/${corpus}/${bookId}`);

  if (!fs.existsSync(dir)) {
    fail(`${bookId}: lex 디렉터리 없음 (${path.relative(process.cwd(), dir)})`);
    return null;
  }

  const map = {};
  const jsonFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  if (jsonFiles.length === 0) {
    fail(`${bookId}: lex JSON 파일 없음 (${path.relative(process.cwd(), dir)})`);
    return null;
  }

  for (const f of jsonFiles) {
    const ch = Number(f.replace('.json', ''));
    if (!Number.isInteger(ch) || ch < 1) continue;

    const filePath = path.join(dir, f);
    let json;
    try {
      json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      fail(`${bookId}:${ch} lex JSON 파싱 실패 (${error.message})`);
      continue;
    }

    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      fail(`${bookId}:${ch} lex 루트가 객체가 아님`);
      continue;
    }

    const verses = Object.keys(json)
      .map(Number)
      .filter((v) => Number.isInteger(v) && v >= 1);

    if (verses.length === 0) {
      fail(`${bookId}:${ch} lex에 유효한 절 키가 없음`);
      continue;
    }

    map[ch] = Math.max(...verses);
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

  const expectedChapters = meta.chapters;
  const lexMap = loadLexMaxVerses(bookId);
  const chapterKeys = Object.keys(detail)
    .map(Number)
    .filter(Number.isInteger)
    .sort((a, b) => a - b);

  for (let ch = 1; ch <= expectedChapters; ch++) {
    if (!(ch in detail)) fail(`${bookId}:${ch}장 누락 (총 ${expectedChapters}장이어야 함)`);
    if (!lexMap || !Number.isInteger(lexMap[ch]) || lexMap[ch] < 1) {
      fail(`${bookId}:${ch} lex 장 데이터 없음 — 절 범위 검증 불가`);
    }
  }

  for (const ch of chapterKeys) {
    if (ch < 1 || ch > expectedChapters) {
      fail(`${bookId}:${ch}장은 책 범위(1~${expectedChapters}) 초과`);
    }
  }

  const seenAgenda = new Map();

  for (const ch of chapterKeys) {
    const entry = detail[ch];
    if (!entry || typeof entry !== 'object') {
      fail(`${bookId}:${ch} 항목이 객체가 아님`);
      continue;
    }

    const kv = entry.keyVerses?.[0];
    const sn = entry.structureNodes?.[0];
    const verse = kv?.verse;

    if (!Number.isInteger(verse)) {
      fail(`${bookId}:${ch} keyVerses[0].verse 정수 아님`);
      continue;
    }

    if (!sn || sn.verse !== verse) fail(`${bookId}:${ch} structureNodes[0].verse≠keyVerses[0].verse`);
    if (sn && sn.id !== `curated-${verse}`) fail(`${bookId}:${ch} structureNode id가 curated-${verse} 아님 (${sn.id})`);
    if (sn && sn.source !== 'curated') fail(`${bookId}:${ch} structureNode source≠'curated'`);

    const maxVerse = lexMap?.[ch];
    if (Number.isInteger(maxVerse)) {
      if (verse < 1 || verse > maxVerse) {
        fail(`${bookId}:${ch} verse ${verse}가 실제 범위 1~${maxVerse}절을 벗어남`);
      }
    }

    const agenda = (entry.agenda || '').trim();
    const label = (kv?.label || '').trim();
    if (agenda.length < 8) fail(`${bookId}:${ch} agenda 비었거나 과도하게 짧음`);
    if (label.length < 4) fail(`${bookId}:${ch} label 비었거나 과도하게 짧음`);
    if (seenAgenda.has(agenda)) {
      fail(`${bookId}:${ch} agenda가 ${seenAgenda.get(agenda)}장과 완전히 동일(복제)`);
    }
    seenAgenda.set(agenda, ch);
  }

  console.log(`  · ${bookId}: ${chapterKeys.length}/${expectedChapters}장 · lex 하드 대조`);
}

console.log(`장별 curated 본문 정합성 verifier · 대상 ${targets.length}권`);
if (warns.length) {
  console.log(`⚠️ 경고 ${warns.length}건:`);
  for (const w of warns) console.log(`  - ${w}`);
}
if (issues.length) {
  console.error(`✗ 본문 정합성 검증 실패 (${issues.length}건)`);
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exit(1);
}
console.log('✓ 장별 curated 본문 정합성 통과 (완전성·lex 필수·절범위·구조·내용)');
