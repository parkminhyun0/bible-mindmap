# task2 · 02-impl — 1-run 구현 기록

## 수정/생성 파일

- `src/utils/lexicon.js`
  - BDB HTML의 중첩 `ol/li`를 `DOMParser`로 공통 `nodes` 트리와 `meta`로 정규화했다.
  - 로컬 Strong's 정의는 문장별 depth 0 노드로 나누고 어원/KJV 용례를 meta로 분리했다. 기존 `definition` HTML과 `linkifyDefinition`은 호환용으로 보존했다.
  - BDB 요청에 6초 `AbortController` 타임아웃, 짧은 backoff를 둔 1회 재시도, BDB 성공 무기한 캐시/폴백 60초 TTL을 적용했다. 히브리어 폴백에는 실패 상태를 포함했다.
- `src/components/LexiconDefinitionTree.jsx` (신규)
  - BDB·Strong's·한글 승인본이 동일한 들여쓰기/마커 규칙을 쓰는 공통 트리 렌더러를 추가했다.
  - 영문 노드는 기존 `linkifyDefinition`을 거쳐 BibleHub/TWOT 링크를 유지하고, 승인 한글 텍스트는 문자열 그대로 렌더한다.
- `src/components/LexiconPopup.jsx`
  - `lexiconApprovalLoader.loadApprovedEntry(strong)`의 레지스트리 존재 여부로 승인본을 자동 선택한다.
  - 승인본은 정의 탭 상단에 읽기 전용 공통 트리로 표시하고 영문 BDB는 접이식으로 유지한다.
  - 미승인 BDB/Strong's도 공통 트리로 렌더하며, BDB 실패 상태와 meta 영역을 표시한다.
  - 기존 다이얼로그 aria-label, HEBREW/GREEK LEXICON 툴바 라벨, 첫 Strong 링크 및 BibleHub 전체 사전 링크 구조를 보존했다.
- `vite.config.js`
  - 기존 bolls 규칙 앞에 `dictionary-definition` 전용 `bm-bolls-dict-v1` SWR 캐시(300건, 30일, status 200)를 추가했다.
  - 절 본문 `bm-bolls-v1`은 `cacheableResponse.statuses`만 `[200]`으로 변경했고 handler/cacheName/maxEntries/maxAgeSeconds는 유지했다. 다른 runtimeCaching 규칙은 수정하지 않았다.
- `tests/lexicon-definition-format.spec.js` (신규)
  - `page.route` 고정 픽스처로 BDBT, Strong's 청크, 승인 registry/manifest/shard를 주입하는 T1~T7 계약 테스트를 작성했다.
  - BDB 정상/실패, 헬라어, H776 승인본 byte 보존, H/G/TWOT·헤더 링크, 한글 드로어 브리지 DOM, 임의 승인 Strong 자동 전환을 각각 검증한다.

## 실행한 검증

- `node scripts/verify-strong-external-link-policy.mjs` — PASS (16 behavior cases, static contract OK)
- `node scripts/verify-mobile-safety.mjs` — PASS
- `node scripts/verify-korean-gloss.mjs` — PASS (기존 H/G 개념 불균형 경고 2건 출력)
- `node scripts/verify-translation-alignment.mjs` — PASS
- `git diff --check` — PASS
- `npx oxlint ...` — 실행하지 못함. `node_modules`가 없고 제한된 환경에서 `npx`가 도구를 확보하지 못했다.
- `npx playwright test tests/lexicon-definition-format.spec.js --project=chromium` — 실행하지 못함. 로컬 `node_modules/.bin/playwright` 및 설치 브라우저가 없다. 따라서 T1~T7을 통과했다고 기록하지 않는다.
- `npm run build` — 실행하지 못함. 같은 이유로 로컬 의존성이 설치되어 있지 않다.

git commit/push는 수행하지 않았다.

## 반복 1회차 · 테스트 진입 경로 수정

- `tests/lexicon-definition-format.spec.js`의 `openStrong`이 검증된 앱 진입 경로를 사용하도록 창세기/신약 책 선택 → 1장 선택 → `📖 본문 불러오기` → `+ 구절 추가` → 캔버스 절 노드 → `원어` 탭 → 대상 단어 → 원어 사전 다이얼로그 순서를 확인·보완했다.
- 대상 원어 단어 locator를 해당 `.react-flow__node` 내부로 한정하고 `toBeVisible({ timeout: 30_000 })` 후 클릭하도록 했다. T1~T7 각각에 `test.setTimeout(120_000)`을 추가했다.
- 모든 `page.route` 픽스처는 `openStrong`의 `page.goto('./')`보다 먼저 등록된다. T3는 `마태복음 1:1`을 캔버스에 추가하고 G3056 `λόγος`를 클릭하므로 히브리어 절을 경유하지 않는다.
- T1~T7의 기존 단언은 변경하거나 약화하지 않았으며 구현 파일도 수정하지 않았다.
- 지정 명령 `npx playwright test tests/lexicon-definition-format.spec.js --project=chromium --reporter=line`을 실행했으나 테스트 본체 전에 종료됐다. 호스트에는 PID 65212가 `127.0.0.1:4173`에서 LISTEN 중이지만 현재 실행 샌드박스의 `curl`은 해당 URL 연결을 거부(HTTP 000)했고, Playwright가 서버를 재사용하지 못해 `npm run dev`를 시도한 뒤 저장소에 없는 `public/data/lex/**` 검증 1255건으로 `predev`가 실패했다. 새 서버를 띄우지 말라는 지시에 따라 별도 서버는 시작하지 않았으며, 이 환경에서는 7개 통과 결과를 확인하지 못했다.

## 재검증 · 2026-08-14

- `node scripts/verify-strong-external-link-policy.mjs` — PASS (16 behavior cases; static contract OK)
- `npx oxlint` — PASS (exit 0; task2 범위 밖 기존 warning만 출력)
- `node scripts/verify-mobile-safety.mjs` — PASS
- `node scripts/verify-korean-gloss.mjs` — PASS (기존 H/G 개념 불균형 경고 2건)
- `node scripts/verify-translation-alignment.mjs` — PASS
- `git diff --check` — PASS
- `npx playwright test tests/lexicon-definition-format.spec.js --project=chromium --reporter=line` — **FAIL**. 샌드박스 밖에서 기존 `127.0.0.1:4173` 서버와 Chromium으로 테스트 본체를 실제 실행했다. T1·T2가 캔버스 원어 단어 chip 진입 단계에서 timeout, T3는 중단, T4~T7은 미실행이다. trace에서 `data/lex/hot/Gen/1.json`은 고정 fixture로 200 응답했고 JSON도 정확했으며 대상 ReactFlow 노드가 `.selected`임도 확인했으나, `VerseNode`가 `span[title*="H0430"]` chip을 렌더하지 않았다. 따라서 T1~T7을 PASS로 판정하지 않는다.

## 보호 계약 확인

- 구현 파일(`src/**`, `vite.config.js`)에는 특정 H430/H776/G3056 값에 따른 분기가 없다. 검색된 Strong 표기는 기존 0패딩 정규화 주석뿐이며, 테스트 파일의 값은 고정 fixture다.
- `data/lexicon/**`, `scripts/verify-lexicon*`, `docs/lexicon-workflow/**`, `.github/workflows/**`, tracked `reports/**`, tracked `.cache/**` 변경은 0이다. 기존 untracked `reports/**`/`.cache/**`는 읽거나 수정하지 않았다.
- 승인 한글 사전 데이터 파일 변경은 0이다. T4는 fixture 승인 문자열을 변형 없이 `innerText`로 비교하도록 유지했지만, 이번 실행에서는 T4가 실행되지 않았으므로 byte-preservation 런타임 PASS로 기록하지 않는다.

## 반복 3회차 · 검증 전략 교체(모듈/컴포넌트 레벨)

- 캔버스 원어 chip 로케이터에 의존하던 기존 `tests/lexicon-definition-format.spec.js`는 삭제하지 않고 전체 `test.describe.skip` 처리했다. 미완성 E2E 하네스는 `.pipeline/task2/04-decision.md`의 후속 과제로 분리했다.
- 신규 `tests/lexicon-definition-format.unit.spec.js`는 `page.goto('./')`로 브라우저 런타임만 열고 앱 UI를 조작하지 않는다. BDBT와 로컬 Strong's 청크만 `page.route` fixture로 주입한 뒤 Vite가 서빙하는 실제 `lexicon.js`와 `LexiconDefinitionTree.jsx`를 동적 import한다.
- U1~U5는 실제 정의 조회·DOMParser 정규화·React `createRoot` 렌더 DOM에서 BDB 중첩, 로컬 폴백/실패 상태, 헬라어 meta 분리, 승인 문자열 완전 일치, BibleHub/TWOT 링크를 검증한다.
- U6은 `detectStrong`/`findDefinitionToolbar`가 export되지 않는 한계를 주석으로 명시하고, 브리지가 소비하는 LexiconPopup의 dialog aria-label·언어 툴바 텍스트·첫 Strong 링크 생성 계약을 정적으로 검증한다.
- U7은 실제 `createLexiconApprovalLoader`에 메모리 fixture를 주입해 임의 Strong의 승인/미승인 결과를 검증하고, LexiconPopup이 `entry.s`를 일반 조회하며 `approvedEntry` 유무로 렌더 경로를 선택하고 특정 fixture Strong을 하드코딩하지 않았음을 함께 단언한다.
- 사용자 지시에 따라 이 샌드박스에서는 Playwright나 기타 실행 검증을 시도하지 않았다. 구현 파일(`src/**`, `vite.config.js`)은 수정하지 않았고 git commit/push도 수행하지 않았다.

## 반복 2회차 · lex 픽스처 주입

- `tests/lexicon-definition-format.spec.js`에 `**/data/lex/hot/GEN/1.json`과 `**/data/lex/gnt/JHN/1.json` route를 추가해, dev 서버의 SPA fallback 대신 실제 챕터 데이터 형식의 고정 JSON을 응답하도록 했다.
- 창세기 1:1 픽스처에는 `אֱלֹהִים`(`H0430`)과 `הָאָרֶץ`(`H0776`), 요한복음 1:1 픽스처에는 `λόγος`(`G3056`)를 포함했다. 모든 route는 `openStrong()`의 `page.goto('./')` 전에 등록된다.
- T3의 캔버스 추가 경로를 마태복음 1장에서 요한복음 1장으로 변경했다. T1~T7의 단언은 약화하거나 삭제하지 않았고 구현 파일은 수정하지 않았다.
- 사용자 지시에 따라 localhost/Playwright 테스트 실행은 시도하지 않았다. 실행 및 결과 확인은 0-lead에 위임한다.

## Codex 직접 최종 검증 · 2026-08-15

- 반복 3회차의 모듈/컴포넌트 대체 전략은 사용하지 않았다. 신규 unit spec은 제거했고, `tests/lexicon-definition-format.spec.js`의 실제 캔버스 E2E T1~T7을 다시 활성화했다.
- lex chapter fixture 경로를 실제 book id 대소문자(`Gen`, `John`)와 일치시켰다. 선택된 ReactFlow 노드의 역본 전환은 노드 내부의 비공식 클릭 경로가 아니라 기존 NodeEditor의 `편집 역본: 원어` UI를 사용한다.
- `npx playwright test tests/lexicon-definition-format.spec.js --project=chromium --reporter=line` — **PASS, 7/7** (19.1초). T1~T7 모두 실제 Chromium에서 실행됐다.
- `node scripts/verify-strong-external-link-policy.mjs` — PASS (16 cases)
- `npx oxlint` — PASS (exit 0, 기존 warning만 존재)
- `node scripts/verify-mobile-safety.mjs` — PASS
- `node scripts/verify-korean-gloss.mjs` — PASS (기존 불균형 warning 2건)
- `node scripts/verify-translation-alignment.mjs` — PASS
- `git diff --check` — PASS
- 보호 경로와 승인 한글 데이터는 변경하지 않았다. T4 승인 문자열 exact equality, T6 드로어, T7 registry-only 자동 전환을 모두 런타임에서 확인했다.
