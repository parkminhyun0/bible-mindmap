#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  aliasesForRange,
  assertVerseCoverage,
  mergeVerseRows,
  missingVerseNumbers,
  remapAliasRows,
} from '../src/api/verseNormalization.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

// WEB의 실제 배치(롬 14:24-26)를 앱 정경 참조(롬 16:25-27)로 변환한다.
const aliases = aliasesForRange('Rom', 16, 25, 27);
check(aliases.length === 1, 'WEB 로마서 송영 alias가 정확히 1개여야 합니다.');
const sourceRows = [
  { verse: 24, text: 'WEB doxology part 1' },
  { verse: 25, text: 'WEB doxology part 2' },
  { verse: 26, text: 'WEB doxology part 3' },
];
const mappedRows = remapAliasRows(sourceRows, aliases[0]);
check(mappedRows.map((row) => row.verse).join(',') === '25,26,27', 'WEB alias가 16:25-27로 매핑되지 않았습니다.');
check(missingVerseNumbers(mappedRows, 25, 27).length === 0, 'WEB alias 매핑 후 누락 절이 남았습니다.');

// 부분 성공을 성공으로 처리하던 회귀를 차단한다.
let partialRejected = false;
try {
  assertVerseCoverage([{ verse: 23, text: 'a' }, { verse: 24, text: 'b' }], 23, 27, 'GNT');
} catch (error) {
  partialRejected = error?.code === 'VERSE_COVERAGE_INCOMPLETE'
    && error.missingVerses?.join(',') === '25,26,27';
}
check(partialRejected, '원어 부분 응답 23-24절이 완전 응답으로 통과했습니다.');

// 1차 원어와 보조 원어를 합치면 요청 범위가 완성되어야 한다.
const primaryGreek = [{ verse: 23, text: 'primary 23' }, { verse: 24, text: 'primary 24' }];
const fallbackGreek = [{ verse: 25, text: 'fallback 25' }, { verse: 26, text: 'fallback 26' }, { verse: 27, text: 'fallback 27' }];
const mergedGreek = mergeVerseRows(primaryGreek, fallbackGreek);
check(assertVerseCoverage(mergedGreek, 23, 27, 'GNT').length === 5, '원어 보조 공급원 병합 후 23-27절이 완성되지 않았습니다.');

// 구약·신약 경계 표본에서 절 범위 완전성 규칙이 동일하게 작동해야 한다.
const canonicalSamples = [
  { label: '창세기 1:1-3', start: 1, end: 3, rows: [1, 2, 3] },
  { label: '시편 119:174-176', start: 174, end: 176, rows: [174, 175, 176] },
  { label: '말라기 4:4-6', start: 4, end: 6, rows: [4, 5, 6] },
  { label: '마태복음 1:23-25', start: 23, end: 25, rows: [23, 24, 25] },
  { label: '사도행전 28:29-31', start: 29, end: 31, rows: [29, 30, 31] },
  { label: '요한계시록 22:19-21', start: 19, end: 21, rows: [19, 20, 21] },
];
for (const sample of canonicalSamples) {
  const rows = sample.rows.map((verse) => ({ verse, text: `${sample.label} ${verse}` }));
  check(
    assertVerseCoverage(rows, sample.start, sample.end, sample.label).length === sample.rows.length,
    `${sample.label} 정경 범위 검증에 실패했습니다.`,
  );
}

// 런타임 로더가 정규화·보조 공급원·장/최종 결과 캐시를 실제로 사용해야 한다.
const apiSource = await readFile(path.join(root, 'src/api/bibleApi.js'), 'utf8');
check(apiSource.includes("from './verseNormalization'"), 'bibleApi가 verseNormalization을 사용하지 않습니다.');
check(apiSource.includes("'NTGT'"), 'TAGNT 누락 절을 보완할 NTGT 경로가 없습니다.');
check(apiSource.includes('assertVerseCoverage'), '요청 범위 완전성 검사가 bibleApi에 연결되지 않았습니다.');
check(apiSource.includes('aliasesForRange'), 'WEB 장절 alias가 bibleApi에 연결되지 않았습니다.');
check(apiSource.includes('chapterCache'), '장 단위 캐시가 제거되어 빠른 재전환 계약이 깨졌습니다.');
check(apiSource.includes('cachedPromise'), '동일 장 중복 요청을 합치는 Promise 캐시가 없습니다.');
check(/\{\s*noStore\s*=\s*false(?:\s*,|\s*})/.test(apiSource), '본문 요청의 기본 캐시 사용 계약이 제거되었습니다.');
check(apiSource.includes("...(noStore ? { cache: 'no-store' } : {})"), '선택적 no-store 처리 방식이 변경되었습니다.');
check(apiSource.includes('verseResultCache'), '동일 구절·역본 최종 결과 캐시가 없습니다.');
check(apiSource.includes('REMOTE_FETCH_CONCURRENCY'), '외부 본문 요청 동시성 제한이 없습니다.');
check(apiSource.includes('fetchBibleApiRows'), 'WEB 보조 공급자 경로가 없습니다.');

// UI는 가장 느린 역본을 기다리지 않고 탭별 요청을 독립적으로 완료해야 한다.
const verseNodeSource = await readFile(path.join(root, 'src/components/VerseNode.jsx'), 'utf8');
check(!verseNodeSource.includes('fetchAllTranslations'), 'VerseNode가 전체 역본 Promise 완료를 기다려 탭 전환을 지연합니다.');
check(verseNodeSource.includes('missing.forEach((tabId) =>'), '누락 역본별 독립 프리로드가 연결되지 않았습니다.');
check(verseNodeSource.includes('fetchVerse(data.bookId, data.chapter, data.verseStart, data.verseEnd, tabId)'), '각 탭의 본문을 독립적으로 요청하지 않습니다.');
check(verseNodeSource.includes('translations: { ...n.data.translations, [tabId]: text }'), '도착한 역본을 즉시 탭 캐시에 저장하지 않습니다.');
check(verseNodeSource.includes('preloadGenerationRef'), '이전 구절 요청이 현재 탭을 덮어쓰는 것을 막는 세대 가드가 없습니다.');
check(verseNodeSource.includes('setTabLoading((prev) => ({ ...prev, [tabId]: false }))'), '역본별 로딩 상태가 독립적으로 종료되지 않습니다.');

if (failures.length) {
  console.error(`✗ 구절 로더 회귀 검증 실패 (${failures.length}건)`);
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}

console.log('✓ 구절 로더 회귀 검증 통과 — 정경 완전성, WEB fallback, 원어 보완, 장/결과 캐시, 요청 큐, 탭별 즉시 전환');
