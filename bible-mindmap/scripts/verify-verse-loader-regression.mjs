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

// 런타임 로더가 정규화 계층과 NTGT 보조 경로를 실제로 사용해야 한다.
const apiSource = await readFile(path.join(root, 'src/api/bibleApi.js'), 'utf8');
check(apiSource.includes("from './verseNormalization'"), 'bibleApi가 verseNormalization을 사용하지 않습니다.');
check(apiSource.includes("'NTGT'"), 'TAGNT 누락 절을 보완할 NTGT 경로가 없습니다.');
check(apiSource.includes('assertVerseCoverage'), '요청 범위 완전성 검사가 bibleApi에 연결되지 않았습니다.');
check(apiSource.includes('aliasesForRange'), 'WEB 장절 alias가 bibleApi에 연결되지 않았습니다.');

if (failures.length) {
  console.error(`✗ 구절 로더 회귀 검증 실패 (${failures.length}건)`);
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}

console.log('✓ 구절 로더 회귀 검증 통과 — WEB 롬16:25-27, 원어 부분 응답, 보조 공급원 병합');
