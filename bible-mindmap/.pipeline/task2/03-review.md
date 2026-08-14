# task2 · 03-review — 2-review 독립 검증

- 검증자: agy (2-review)
- 검증 기준 head: `180aae25`
- 검증일: 2026-08-14
- 최종 판정: **FAIL**

## 판정 근거

필수 정적 verifier 5개는 모두 exit 0으로 통과했다. 그러나 신규 Playwright 계약 테스트는 구성된 web server의 `predev` 단계에서 `public/data/lex/**` 부재로 실패하여 테스트 본체에 진입하지 못했다. 따라서 T1~T7 중 어느 것도 이번 독립 review에서 PASS로 판정할 수 없다. `01-plan.md` 4절과 5절은 Playwright 미실행 또는 T1~T7 중 하나라도 미통과이면 PASS를 금지하므로 전체 판정은 FAIL이다.

## 직접 실행 Evidence

| 검증 | 직접 실행 명령 | 결과 |
|---|---|---|
| Strong 외부 링크 정책 | `node scripts/verify-strong-external-link-policy.mjs` | **PASS**, exit 0 · 16 behavior cases, static contract OK |
| oxlint | `npx oxlint` | **PASS**, exit 0 · 기존 범위 warning만 출력, lint error 0 |
| 모바일 안전 | `node scripts/verify-mobile-safety.mjs` | **PASS**, exit 0 |
| 한글 gloss | `node scripts/verify-korean-gloss.mjs` | **PASS**, exit 0 · 기존 H/G 개념 불균형 경고 2건 |
| 번역 정렬 | `node scripts/verify-translation-alignment.mjs` | **PASS**, exit 0 · regression=29, committedRecords=52 |
| Playwright T1~T7 | `npx playwright test tests/lexicon-definition-format.spec.js --project=chromium --reporter=line` | **FAIL**, exit 1 · config webServer 시작 실패 |
| diff whitespace | `git diff --check origin/main...HEAD` | **PASS**, 출력 없음 |

Playwright 실패의 직접 Evidence:

- `predev`의 본문 정합성 verifier가 `public/data/lex/hot/Gen` 등을 찾지 못해 1,255건 오류를 보고했다.
- 최종 오류: `Error: Process from config.webServer was not able to start. Exit code: 1`
- 테스트 runner가 T1을 시작하기 전에 종료했으므로 테스트 assertion 실행 건수는 0이다.

## T1~T7 결과

| 계약 | 결과 | 근거 |
|---|---|---|
| T1 히브리어 BDB 정상 | **미실행 / PASS 아님** | webServer predev 실패 |
| T2 히브리어 BDB 실패 폴백 | **미실행 / PASS 아님** | webServer predev 실패 |
| T3 헬라어 공통 트리 | **미실행 / PASS 아님** | webServer predev 실패 |
| T4 H776 승인 텍스트 보존 | **미실행 / PASS 아님** | webServer predev 실패 |
| T5 BibleHub/TWOT 링크 | **미실행 / PASS 아님** | webServer predev 실패 |
| T6 한글 사전 드로어 | **미실행 / PASS 아님** | webServer predev 실패 |
| T7 registry 자동 전환 | **미실행 / PASS 아님** | webServer predev 실패 |

## 계약·범위 정적 대조

- `src/utils/lexicon.js`, `src/components/LexiconDefinitionTree.jsx`, `src/components/LexiconPopup.jsx`의 구현 분기에서 특정 `H430`/`H776`/`G3056` 하드코딩은 발견되지 않았다. 해당 값은 테스트 fixture와 기존 0-padding 설명에만 있다.
- 승인 여부 분기는 `lexiconApprovalLoader.loadApprovedEntry(entry.s, { lemma: entry.l })` 결과로 결정되어 registry 추가 자동 전환을 의도한 구조다. 다만 T7 런타임 검증은 미실행이므로 계약 성립을 최종 확인하지 못했다.
- 승인 한글 문자열은 공통 트리에서 `approved ? node.text : ...` 경로로 직접 렌더하며 요약 함수에 전달되지 않는다. 실제 승인 데이터 파일 변경은 0이다. 다만 T4가 미실행이므로 런타임 byte-preservation은 PASS로 판정하지 않는다.
- `git diff --name-only origin/main...HEAD -- data/lexicon scripts/verify-lexicon\* docs/lexicon-workflow .github/workflows reports .cache` 출력은 0건이며, `*approval-registry.json` 변경도 0건이다. 기존 untracked `reports/**`와 `.cache/**`는 건드리지 않았다.
- `vite.config.js`의 의미 변경은 dictionary-definition 전용 `bm-bolls-dict-v1` 규칙 추가와 기존 `bm-bolls-v1` statuses `[0, 200]` → `[200]`뿐이다. 기존 본문 cache handler/name/entries/age 및 다른 runtime caching 규칙은 유지됐다. 파일 끝 newline 정규화만 부수 diff로 존재한다.
- 계획상 구현 파일과 별도로 사용자 명령에 따른 `CLAUDE.md` system-manual 정합화가 포함되어 있다. 보호 경로 변경은 없다.

## 수정 요구

1. fixture로 라우팅할 데이터가 로컬에 없어도 Playwright webServer가 시작되고 T1~T7 본체를 실제 실행할 수 있는 검증 경로를 마련한다. verifier/threshold 완화나 보호 데이터 생성·변경으로 우회해서는 안 된다.
2. 같은 exact head 후보에서 T1~T7을 모두 직접 재실행하고 각 결과를 기록한다.
3. T4의 승인 문자열 동일성과 T6 드로어, T7 registry-only 자동 전환을 런타임 Evidence로 확인한 뒤 재-review를 요청한다.

현재 결과는 환경 실패를 기능 PASS로 치환하지 않은 **검증 Gate FAIL**이며, 코드 기능 자체의 최종 실패를 단정한 판정은 아니다.
