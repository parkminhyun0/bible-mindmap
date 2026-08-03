import {
  ALL_BOOKS,
  OT_BOOKS,
  NT_BOOKS,
  KO_ABBR,
  getBook,
} from '../src/data/bibleBooks.js';
import { CURATED_CHAPTER_DETAILS } from '../src/data/curatedChapterDetails.js';
import { CONTEXT_CHAPTER_CARDS } from '../src/data/contextChapterCards.js';
import { CANONICAL_CONCEPTS } from '../src/data/canonicalConcepts.js';
import { CANONICAL_USAGE_MAP } from '../src/data/canonicalUsageMap.js';
import {
  BIBLICAL_PERIODS,
  BIBLICAL_PERIOD_GROUPS,
} from '../src/data/biblicalPeriods.js';

const errors = [];
const warnings = [];
const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;

function checkUnique(items, selector, label) {
  const seen = new Map();
  for (const item of items) {
    const value = selector(item);
    if (!nonEmpty(value)) {
      fail(`${label}: 빈 값`);
      continue;
    }
    if (seen.has(value)) fail(`${label}: 중복 "${value}" (${seen.get(value)} / ${item.id ?? '?'})`);
    else seen.set(value, item.id ?? '?');
  }
}

if (OT_BOOKS.length !== 39) fail(`구약 책 수 ${OT_BOOKS.length} (39 요구)`);
if (NT_BOOKS.length !== 27) fail(`신약 책 수 ${NT_BOOKS.length} (27 요구)`);
if (ALL_BOOKS.length !== 66) fail(`전체 책 수 ${ALL_BOOKS.length} (66 요구)`);

checkUnique(ALL_BOOKS, (book) => book.id, 'book.id');
checkUnique(ALL_BOOKS, (book) => book.ko, 'book.ko');
checkUnique(ALL_BOOKS, (book) => book.en, 'book.en');

for (const book of ALL_BOOKS) {
  if (!Number.isInteger(book.chapters) || book.chapters < 1) {
    fail(`${book.id}: chapters가 양의 정수가 아님 (${book.chapters})`);
  }
  if (getBook(book.id) !== book) fail(`${book.id}: getBook registry identity 불일치`);
}

const bookIds = new Set(ALL_BOOKS.map((book) => book.id));
for (const [abbr, bookId] of Object.entries(KO_ABBR)) {
  if (!nonEmpty(abbr)) fail('KO_ABBR: 빈 약어 키');
  if (!bookIds.has(bookId)) fail(`KO_ABBR.${abbr}: 알 수 없는 book id ${bookId}`);
}

const curatedKeys = Object.keys(CURATED_CHAPTER_DETAILS);
for (const bookId of bookIds) {
  if (!Object.hasOwn(CURATED_CHAPTER_DETAILS, bookId)) fail(`curated registry: ${bookId} 책 전체 누락`);
}
for (const bookId of curatedKeys) {
  if (!bookIds.has(bookId)) fail(`curated registry: 알 수 없는 책 ${bookId}`);
}

const cardCountsByBook = new Map();
for (const [key, card] of Object.entries(CONTEXT_CHAPTER_CARDS)) {
  const match = /^([^:]+):(\d+)$/.exec(key);
  if (!match) {
    fail(`관찰카드 키 형식 오류: ${key}`);
    continue;
  }
  const [, bookId, chapterText] = match;
  const meta = getBook(bookId);
  const chapter = Number(chapterText);
  if (!meta) {
    fail(`관찰카드 ${key}: 알 수 없는 책`);
    continue;
  }
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > meta.chapters) {
    fail(`관찰카드 ${key}: 장 범위 1~${meta.chapters} 초과`);
  }
  if (!card || typeof card !== 'object' || Array.isArray(card)) {
    fail(`관찰카드 ${key}: 객체 아님`);
    continue;
  }
  cardCountsByBook.set(bookId, (cardCountsByBook.get(bookId) || 0) + 1);
}

const conceptKeys = Object.keys(CANONICAL_CONCEPTS);
const usageKeys = Object.keys(CANONICAL_USAGE_MAP || {});
for (const key of usageKeys) {
  if (!Object.hasOwn(CANONICAL_CONCEPTS, key)) fail(`canonical usage: 존재하지 않는 개념 ${key}`);
}
const missingUsageKeys = conceptKeys.filter((key) => !Object.hasOwn(CANONICAL_USAGE_MAP || {}, key));
if (missingUsageKeys.length) {
  warn(`canonical usage 확장 대기 ${missingUsageKeys.length}/${conceptKeys.length}개: ${missingUsageKeys.slice(0, 12).join(', ')}${missingUsageKeys.length > 12 ? '…' : ''}`);
}

checkUnique(BIBLICAL_PERIOD_GROUPS, (group) => group.id, 'period group.id');
checkUnique(BIBLICAL_PERIODS, (period) => period.id, 'period.id');
const periodGroupIds = new Set(BIBLICAL_PERIOD_GROUPS.map((group) => group.id));
for (const period of BIBLICAL_PERIODS) {
  if (!periodGroupIds.has(period.group)) fail(`${period.id}: 알 수 없는 period group ${period.group}`);
}

const totalChapters = ALL_BOOKS.reduce((sum, book) => sum + book.chapters, 0);
const cardCount = Object.keys(CONTEXT_CHAPTER_CARDS).length;
const completeCardBooks = ALL_BOOKS.filter((book) => (cardCountsByBook.get(book.id) || 0) === book.chapters);
const partialCardBooks = ALL_BOOKS.filter((book) => {
  const count = cardCountsByBook.get(book.id) || 0;
  return count > 0 && count < book.chapters;
});

console.log(
  `데이터 registry 감사 · 성경 ${ALL_BOOKS.length}권/${totalChapters}장 · curated ${curatedKeys.length}권 · `
  + `관찰카드 ${cardCount}장(${completeCardBooks.length}권 완성·${partialCardBooks.length}권 부분) · `
  + `정경개념 ${conceptKeys.length} · 용례지도 ${usageKeys.length} · 시대 ${BIBLICAL_PERIODS.length}`,
);
if (warnings.length) {
  console.log(`⚠ 데이터 확장 상태 ${warnings.length}건:`);
  warnings.forEach((message) => console.log(`  - ${message}`));
}
if (errors.length) {
  console.error(`✗ 데이터 registry 정합성 실패 (${errors.length}건)`);
  errors.forEach((message) => console.error(`  - ${message}`));
  process.exit(1);
}
console.log('✓ 데이터 registry 정합성 통과 (66권·약어·curated·관찰카드 키·정경 용례·시대 관계)');
