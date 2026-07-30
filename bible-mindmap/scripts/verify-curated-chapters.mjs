// 장별 심화 curated 본문 정합성 verifier
// GPT가 생성한 장별 curated 데이터(agenda·verse·label)를 앱의 실제 원어 lex 데이터
// (public/data/lex/<hot|gnt>/<Book>/<ch>.json)와 대조해 기계적으로 검증한다.
//
// 검사 항목:
//   1) 완전성 — 그 책의 모든 장(1..chapters)이 빠짐없이 존재, 초과/중복 장 없음
//   2) 절 범위 — 각 장 verse가 [1, lexMaxVerse] 내. (lexMax+1은 히브리↔KRV 1절 오프셋
//      가능성 → WARNING으로 수동 확인, 그 이상은 FAIL)
//   3) 구조 일관성 — structureNodes[0].verse == keyVerses[0].verse == D의 verse,
//      id == `curated-<verse>`, source=='curated'
//   4) 내용 — agenda·label 비어있지 않음, agenda 과도하게 짧지 않음, 인접 장 완전 동일(복제) 금지
//
// 신학적 정확성은 기계가 판단 불가 → 사용자 스팟체크 게이트와 병행.

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

// 이번에 새로 검증할 대상(인자 없으면 registry의 모든 책). 예: node verify-curated-chapters.mjs Gen
const argBooks = process.argv.slice(2).filter(Boolean);
const bookMeta = new Map(ALL_BOOKS.map((b) => [b.id, b]));

function lexMaxVerses(bookId) {
  const meta = bookMeta.get(bookId);
  const corpus = meta?.lexCorpus || (meta?.testament === 'NT' ? 'gnt' : 'hot');
  const dir = path.resolve(__dirname, `../public/data/lex/${corpus}/${bookId}`);
  if (!fs.existsSync(dir)) return null;
  const map = {};
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const ch = Number(f.replace('.json', ''));
    if (!Number.isInteger(ch)) continue;
    try {
      const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      const verses = Object.keys(j).map(Number).filter(Number.isInteger);
      map[ch] = verses.length ? Math.max(...verses) : 0;
    } catch { map[ch] = 0; }
  }
  return map;
}

const targets = argBooks.length ? argBooks : Object.keys(CURATED_CHAPTER_DETAILS);

for (const bookId of targets) {
  const detail = CURATED_CHAPTER_DETAILS[bookId];
  if (!detail) { fail(`${bookId}: registry에 없음`); continue; }
  const meta = bookMeta.get(bookId);
  if (!meta) { fail(`${bookId}: bibleBooks 미등록`); continue; }
  const expectedChapters = meta.chapters;
  const lexMap = lexMaxVerses(bookId);

  const chapterKeys = Object.keys(detail).map(Number).filter(Number.isInteger).sort((a, b) => a - b);

  // 1) 완전성
  for (let ch = 1; ch <= expectedChapters; ch++) {
    if (!(ch in detail)) fail(`${bookId}:${ch}장 누락 (총 ${expectedChapters}장이어야 함)`);
  }
  for (const ch of chapterKeys) {
    if (ch < 1 || ch > expectedChapters) fail(`${bookId}:${ch}장은 책 범위(1~${expectedChapters}) 초과`);
  }

  const seenAgenda = new Map();
  for (const ch of chapterKeys) {
    const entry = detail[ch];
    if (!entry || typeof entry !== 'object') { fail(`${bookId}:${ch} 항목이 객체가 아님`); continue; }

    // 3) 구조 일관성
    const kv = entry.keyVerses?.[0];
    const sn = entry.structureNodes?.[0];
    const verse = kv?.verse;
    if (!Number.isInteger(verse)) { fail(`${bookId}:${ch} keyVerses[0].verse 정수 아님`); continue; }
    if (!sn || sn.verse !== verse) fail(`${bookId}:${ch} structureNodes[0].verse≠keyVerses[0].verse`);
    if (sn && sn.id !== `curated-${verse}`) fail(`${bookId}:${ch} structureNode id가 curated-${verse} 아님 (${sn.id})`);
    if (sn && sn.source !== 'curated') fail(`${bookId}:${ch} structureNode source≠'curated'`);

    // 2) 절 범위 (lex 대조)
    if (lexMap && lexMap[ch] != null) {
      const maxV = lexMap[ch];
      if (verse < 1) fail(`${bookId}:${ch} verse<1 (${verse})`);
      else if (verse > maxV + 1) fail(`${bookId}:${ch} verse ${verse} > 실제 최대 ${maxV}절 초과`);
      else if (verse === maxV + 1) warn(`${bookId}:${ch} verse ${verse} == lexMax+1 (${maxV}) — 히브리↔KRV 오프셋 가능, 수동 확인`);
    } else if (lexMap) {
      warn(`${bookId}:${ch} lex 데이터에 해당 장 없음 — 절 범위 미검증`);
    }

    // 4) 내용
    const agenda = (entry.agenda || '').trim();
    const label = (kv?.label || '').trim();
    if (agenda.length < 8) fail(`${bookId}:${ch} agenda 비었거나 과도하게 짧음`);
    if (label.length < 4) fail(`${bookId}:${ch} label 비었거나 과도하게 짧음`);
    if (seenAgenda.has(agenda)) fail(`${bookId}:${ch} agenda가 ${seenAgenda.get(agenda)}장과 완전히 동일(복제)`);
    seenAgenda.set(agenda, ch);
  }

  const lexNote = lexMap ? 'lex 대조' : 'lex 없음(절범위 미검증)';
  console.log(`  · ${bookId}: ${chapterKeys.length}/${expectedChapters}장 · ${lexNote}`);
}

console.log(`장별 curated 본문 정합성 verifier · 대상 ${targets.length}권`);
if (warns.length) {
  console.log(`⚠️ 경고 ${warns.length}건 (수동 확인 권장):`);
  for (const w of warns) console.log(`  - ${w}`);
}
if (issues.length) {
  console.error(`✗ 본문 정합성 검증 실패 (${issues.length}건)`);
  for (const i of issues) console.error(`  - ${i}`);
  process.exit(1);
}
console.log('✓ 장별 curated 본문 정합성 통과 (완전성·절범위·구조·내용)');
