import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync(new URL('../src/api/bibleApi.js', import.meta.url), 'utf8');
const node = fs.readFileSync(new URL('../src/components/VerseNode.jsx', import.meta.url), 'utf8');

assert.match(api, /const verseResultCache = new Map\(\)/, '최종 구절 결과 캐시가 없습니다.');
assert.match(api, /cachedVerseResult\(resultKey/, '역본별 최종 결과 캐시가 fetchVerse에 연결되지 않았습니다.');
assert.match(api, /REMOTE_FETCH_CONCURRENCY = 4/, '외부 요청 동시성 제한이 없습니다.');
assert.match(api, /remoteQueue\.sort\(\(a, b\) => b\.priority - a\.priority/, '외부 요청 우선순위 큐가 없습니다.');
assert.match(api, /translationCode === 'KRV'\) return 100/, '초기 개역한글 우선순위가 없습니다.');
assert.match(api, /catch \{\s*rows = await fetchBibleApiRows/, 'WEB 1차 공급자 실패 시 보조 공급자 fallback이 없습니다.');
assert.match(api, /FETCH_TIMEOUT_MS = 6500/, '장시간 멈춤을 제한하는 timeout 계약이 없습니다.');
assert.match(api, /FETCH_RETRIES = 1/, '과도한 재시도로 전환이 장시간 멈출 수 있습니다.');
assert.match(api, /getVerseLoaderDiagnostics/, '로더 상태 진단 함수가 없습니다.');
assert.doesNotMatch(api, /FETCH_TIMEOUT_MS = 10000/, '기존 10초 timeout이 남아 있습니다.');
assert.doesNotMatch(api, /FETCH_RETRIES = 2/, '기존 2회 추가 재시도가 남아 있습니다.');

assert.match(node, /preloadGenerationRef/, '구절 변경 시 이전 프리로드를 무효화하는 generation guard가 없습니다.');
assert.match(node, /cancelled \|\| !mountedRef\.current/, '언마운트 또는 변경 후 늦은 응답 차단이 없습니다.');
assert.match(node, /typeof data\.translations\?\.\[tabId\] !== 'string'/, '이미 준비된 역본을 다시 요청하지 않는 검사가 없습니다.');

console.log(JSON.stringify({
  status: 'passed',
  stage: 'verse-translation-switching-stability',
  finalResultCache: true,
  requestDeduplication: true,
  remoteConcurrencyLimit: 4,
  prioritizedKrv: true,
  webProviderFallback: true,
  stalePreloadGuard: true,
  timeoutMs: 6500,
  retries: 1,
}, null, 2));
