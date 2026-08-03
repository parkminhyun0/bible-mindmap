// 장별 관찰 카드(contextChapterCards)의 구조·원어 표지 정확성 verifier.
// 각 marker의 원어 자음 골격이 그 장의 실제 원어 lex(public/data/lex/{hot|gnt})에
// 존재하는지 기계 대조한다. GPT가 지어낸 표지와 잘못된 책·장 키를 자동 차단한다.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTEXT_CHAPTER_CARDS } from '../src/data/contextChapterCards.js';
import { getBook, isOT } from '../src/data/bibleBooks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LEX = (lang, book, ch) => path.join(ROOT, 'public/data/lex', lang, book, `${ch}.json`);
const errors = [];
const warnings = [];
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;

// 사도행전은 28:31의 '막힘없이'로 의도적인 열린 결말을 맺는다.
// 다음 장/책 예고를 인위적으로 붙이지 않고 종결 카드로 유지한다.
const TERMINAL_PREVIEW_EXCEPTIONS = new Map([
  ['Acts:28', 'Acts ends openly with the unhindered proclamation of the kingdom'],
]);

// 히브리: 니쿠드·칸틸레이션(U+0591–U+05C7) 제거 → 자음만. 헬라: NFD 후 결합기호 제거.
const stripHeb = (s) => s.normalize('NFD').replace(/[֑-ׇ]/g, '').replace(/[^א-ת]/g, '');
const stripGrk = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^Ͱ-Ͽ]/g, '').toLowerCase();

function lexConsonants(book, ch, ot) {
  const lang = ot ? 'hot' : 'gnt';
  const p = LEX(lang, book, ch);
  if (!fs.existsSync(p)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const set = new Set();
    for (const words of Object.values(data)) {
      if (!Array.isArray(words)) continue;
      for (const w of words) {
        const surface = typeof w?.w === 'string' ? w.w : '';
        const normalized = ot ? stripHeb(surface) : stripGrk(surface);
        if (normalized) set.add(normalized);
      }
    }
    return set.size ? set : null;
  } catch {
    return null;
  }
}

let checkable = 0;
let missing = 0;
let noLex = 0;
const misses = [];
const coverageByBook = new Map();

for (const [key, card] of Object.entries(CONTEXT_CHAPTER_CARDS)) {
  const match = /^([^:]+):(\d+)$/.exec(key);
  if (!match) {
    errors.push(`${key}: 관찰카드 키는 Book:Chapter 형식이어야 함`);
    continue;
  }
  const [, book, chText] = match;
  const ch = Number(chText);
  const meta = getBook(book);
  if (!meta) {
    errors.push(`${key}: 알 수 없는 책`);
    continue;
  }
  if (!Number.isInteger(ch) || ch < 1 || ch > meta.chapters) {
    errors.push(`${key}: 장 범위 1~${meta.chapters} 초과`);
    continue;
  }
  coverageByBook.set(book, (coverageByBook.get(book) || 0) + 1);

  if (!card || typeof card !== 'object' || Array.isArray(card)) {
    errors.push(`${key}: 카드가 객체가 아님`);
    continue;
  }
  if (!nonEmpty(card.coverEmoji)) errors.push(`${key}: coverEmoji 누락`);
  if (!nonEmpty(card.genre)) errors.push(`${key}: genre 누락`);
  if (!Array.isArray(card.observeThis) || card.observeThis.length < 2 || card.observeThis.some((item) => !nonEmpty(item))) {
    errors.push(`${key}: observeThis는 유효한 문장 2개 이상이어야 함`);
  }
  if (!Array.isArray(card.theologicalImplications) || card.theologicalImplications.length < 2
    || card.theologicalImplications.some((item) => !nonEmpty(item))) {
    errors.push(`${key}: theologicalImplications는 유효한 문장 2개 이상이어야 함`);
  }
  if (!nonEmpty(card.nextChapterPreview)) {
    const terminalReason = TERMINAL_PREVIEW_EXCEPTIONS.get(key);
    if (terminalReason) warnings.push(`${key}: 의도적 종결 카드 (${terminalReason})`);
    else errors.push(`${key}: nextChapterPreview 누락`);
  }
  if (!Array.isArray(card.discourseMarkers) || card.discourseMarkers.length < 1) {
    errors.push(`${key}: discourseMarkers 누락`);
    continue;
  }

  const ot = isOT(book);
  const set = lexConsonants(book, ch, ot);
  if (!set) {
    noLex += 1;
    errors.push(`${key}: 원어 lex 장 데이터가 없어 마커 검증 불가`);
    continue;
  }

  const strip = ot ? stripHeb : stripGrk;
  const seenMarkers = new Set();
  for (let index = 0; index < card.discourseMarkers.length; index += 1) {
    const dm = card.discourseMarkers[index];
    if (!dm || typeof dm !== 'object') {
      errors.push(`${key}.discourseMarkers[${index}]: 객체 아님`);
      continue;
    }
    if (!nonEmpty(dm.marker)) errors.push(`${key}.discourseMarkers[${index}]: marker 누락`);
    if (!nonEmpty(dm.role)) errors.push(`${key}.discourseMarkers[${index}]: role 누락`);
    if (!nonEmpty(dm.example)) warnings.push(`${key}.discourseMarkers[${index}]: example 누락`);

    const cons = strip(dm.marker || '');
    if (cons.length < 2) continue;
    if (seenMarkers.has(cons)) errors.push(`${key}: 중복 discourse marker 자음골격 ${cons}`);
    seenMarkers.add(cons);

    checkable += 1;
    const hit = [...set].some((word) => word.includes(cons) || cons.includes(word));
    if (!hit) {
      missing += 1;
      misses.push(`${key} · "${dm.marker}"(자음 ${cons})`);
    }
  }
}

const rate = checkable ? (missing / checkable) : 0;
const completeBooks = [...coverageByBook.entries()].filter(([book, count]) => count === getBook(book)?.chapters).length;
console.log(
  `관찰 카드 구조·마커 verifier · 카드 ${Object.keys(CONTEXT_CHAPTER_CARDS).length}장 · 완성 ${completeBooks}권 · `
  + `대조 ${checkable}개 · 미존재 ${missing} (${(rate * 100).toFixed(1)}%) · lex없음 장 ${noLex}`,
);
if (warnings.length) {
  console.warn(`⚠ 구조 경고 ${warnings.length}건:`);
  warnings.slice(0, 30).forEach((message) => console.warn(`   - ${message}`));
}
if (misses.length) {
  console.warn(`⚠ 본문 미존재 마커 ${misses.length}건 (versification·표기 변형 검토 필요):`);
  misses.slice(0, 30).forEach((message) => console.warn(`   - ${message}`));
}
if (rate > 0.25) errors.push(`미존재율 ${(rate * 100).toFixed(1)}% > 25% — 표지 날조 신호`);
if (errors.length) {
  console.error(`✗ 관찰 카드 구조·마커 검증 실패 (${errors.length}건)`);
  errors.slice(0, 100).forEach((message) => console.error(`   - ${message}`));
  process.exit(1);
}
console.log('✓ 관찰 카드 구조·마커 정확성 통과 (책·장·스키마·lex 대조)');
