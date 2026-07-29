import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_BOOKS, isOT } from '../src/data/bibleBooks.js';
import { PARALLEL_KIND, SYNOPTIC_PARALLELS } from '../src/data/parallelStudy.js';
import { canCompareOriginalLanguages, compareParallelTexts } from '../src/utils/parallelDiff.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const issues = [];
const books = new Map(ALL_BOOKS.map((book) => [book.id, book]));
const setIds = new Set();
const SYNOPTIC_BOOKS = new Set(['Matt', 'Mark', 'Luke']);

const fail = (message) => issues.push(message);

for (const set of SYNOPTIC_PARALLELS) {
  if (!set.id || setIds.has(set.id)) fail(`평행단락 id 중복/누락: ${set.id || '(없음)'}`);
  setIds.add(set.id);

  if (!set.title) fail(`${set.id}: title 누락`);
  if (!Array.isArray(set.passages) || set.passages.length !== 3) {
    fail(`${set.id}: 공관 평행단락은 마태·마가·누가 3본문이어야 함`);
    continue;
  }

  const localRefs = new Set();
  const localBooks = new Set();
  for (const passage of set.passages) {
    const book = books.get(passage.book);
    if (!book) fail(`${set.id}: 알 수 없는 book id ${passage.book}`);
    if (!SYNOPTIC_BOOKS.has(passage.book)) fail(`${set.id}: 공관 레지스트리에 비공관복음 포함 ${passage.book}`);
    localBooks.add(passage.book);
    if (!Number.isInteger(passage.chapter) || passage.chapter < 1) fail(`${set.id}: chapter 오류`);
    if (book && passage.chapter > book.chapters) fail(`${set.id}: ${passage.book} ${passage.chapter}장은 책 범위를 초과`);
    if (!Number.isInteger(passage.verseStart) || passage.verseStart < 1) fail(`${set.id}: verseStart 오류`);
    if (!Number.isInteger(passage.verseEnd) || passage.verseEnd < passage.verseStart) fail(`${set.id}: verseEnd 오류`);

    const key = `${passage.book}:${passage.chapter}:${passage.verseStart}-${passage.verseEnd}`;
    if (localRefs.has(key)) fail(`${set.id}: 동일 본문 중복 ${key}`);
    localRefs.add(key);
  }

  for (const bookId of SYNOPTIC_BOOKS) {
    if (!localBooks.has(bookId)) fail(`${set.id}: 공관복음 ${bookId} 본문 누락`);
    if (typeof set.emphasis?.[bookId] !== 'string' || set.emphasis[bookId].trim().length < 20) {
      fail(`${set.id}: ${bookId} curated 편집·신학 관찰 누락/과도하게 짧음`);
    }
  }

  for (const bookId of Object.keys(set.emphasis || {})) {
    if (!set.passages.some((passage) => passage.book === bookId)) {
      fail(`${set.id}: emphasis가 평행단락에 없는 책을 가리킴 ${bookId}`);
    }
  }
}

for (const requiredKind of ['synoptic', 'quotation', 'allusion', 'echo', 'crossref']) {
  if (!PARALLEL_KIND[requiredKind]) fail(`관계 종류 누락: ${requiredKind}`);
}

if (SYNOPTIC_PARALLELS.length < 10) {
  fail(`curated 공관복음 시드가 너무 적음: ${SYNOPTIC_PARALLELS.length}개`);
}

const diffA = compareParallelTexts('A B C', 'A X C B');
if (!diffA.additions.includes('X')) fail('diff: 추가 어휘 X 판정 실패');
if (!diffA.moved.includes('B')) fail('diff: 어순 이동 B 판정 실패');

const diffB = compareParallelTexts('A B C', 'A C');
if (!diffB.omissions.includes('B')) fail('diff: 생략 어휘 B 판정 실패');

const diffVerseNumbers = compareParallelTexts('<span style="x">1</span>A B', '<span style="x">9</span>A B');
if (diffVerseNumbers.additions.includes('9') || diffVerseNumbers.omissions.includes('1')) {
  fail('diff: API 절 번호 span이 본문 어휘 비교에 포함됨');
}

if (canCompareOriginalLanguages('Gen', 'Matt', isOT) !== false) {
  fail('원어 안전장치: OT↔NT 직접 문자열 비교가 차단되지 않음');
}
if (canCompareOriginalLanguages('Matt', 'Mark', isOT) !== true) {
  fail('원어 안전장치: NT↔NT 비교가 허용되지 않음');
}
if (canCompareOriginalLanguages('Gen', 'Exod', isOT) !== true) {
  fail('원어 안전장치: OT↔OT 비교가 허용되지 않음');
}

const modalPath = path.resolve(__dirname, '../src/components/ParallelStudyModal.jsx');
const relatedPath = path.resolve(__dirname, '../src/components/RelatedPassagePopup.jsx');
const launcherPath = path.resolve(__dirname, '../src/components/ParallelStudyLauncher.jsx');
const mainPath = path.resolve(__dirname, '../src/main.jsx');
const modalSource = fs.readFileSync(modalPath, 'utf8');
const relatedSource = fs.readFileSync(relatedPath, 'utf8');
const launcherSource = fs.readFileSync(launcherPath, 'utf8');
const mainSource = fs.readFileSync(mainPath, 'utf8');

for (const marker of ['data-parallel-study', '공통·추가·생략·어순', '히브리어 OT ↔ 헬라어 NT']) {
  if (!modalSource.includes(marker)) fail(`ParallelStudyModal 필수 안전/UX 마커 누락: ${marker}`);
}
if (!relatedSource.includes("import ParallelStudyModal from './ParallelStudyModal'")) {
  fail('RelatedPassagePopup → ParallelStudyModal 보조 진입 연결 누락');
}
if (!relatedSource.includes('⇄ 병렬 연구')) {
  fail('RelatedPassagePopup 병렬 연구 보조 진입 버튼 누락');
}
if (!launcherSource.includes('data-research-tool="parallel-study-global"')) {
  fail('독립 병렬연구 물리 버튼 마커 누락');
}
if (!launcherSource.includes('minHeight: 44') || !launcherSource.includes("touchAction: 'manipulation'")) {
  fail('독립 병렬연구 버튼 모바일 터치 접근성 기준 누락');
}
if (!launcherSource.includes("lazy(() => import('./ParallelStudyModal'))")) {
  fail('독립 병렬연구 버튼 → ParallelStudyModal 연결 누락');
}
if (!mainSource.includes("import ParallelStudyLauncher from './components/ParallelStudyLauncher.jsx'")) {
  fail('main.jsx 독립 병렬연구 버튼 import 누락');
}
if (!mainSource.includes('<ParallelStudyLauncher />')) {
  fail('main.jsx 독립 병렬연구 버튼 mount 누락');
}

console.log(`병렬 본문 연구 verifier · curated sets ${SYNOPTIC_PARALLELS.length} · relation kinds ${Object.keys(PARALLEL_KIND).length} · independent launcher OK`);

if (issues.length) {
  console.error('✗ 병렬 본문 연구 검증 실패');
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exit(1);
}

console.log('✓ 병렬 본문 연구 데이터/비교 엔진/독립 UI 진입 검증 통과');
