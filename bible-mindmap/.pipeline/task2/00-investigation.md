# task2 · 원어 사전 팝업 형식 불일치 조사 (H430 vs H776)

- 작성: 0-lead (Claude) · 2026-08-14 · **조사 전용 · 코드/데이터 무변경**
- 브랜치: `pipeline/task-investigate-lexicon-popup` (base `origin/main` = `32c088be`)
- 사용자 관찰: 창세기 1:1에서 엘로힘(H430)을 눌렀을 때의 사전 팝업이 에레츠(H776)와 동일한 형식으로 표시되지 않음

## 0. 결론 요약

| 질문 | 답 |
|---|---|
| (a) 실제로 무엇이 다른가 | 팝업의 **한글 사전 영역**에서 5가지가 다르다 (2절). 영문 BDB 본문 자체는 두 Strong이 동일한 경로·동일한 형식이다 |
| (b) 원인은 코드 분기인가 데이터인가 | **전부 데이터 차이다.** H430/H776을 갈라내는 코드 분기는 사전 팝업 경로에 존재하지 않는다. 유일한 Strong 하드코딩 분기는 **다언어 검색** 화면의 H430 전용 정렬 파일럿이며, 이는 H430에 요소를 *추가*하는 방향이다 |
| (c) 결함인가 의도된 차이인가 | **의도된 차이(게이트된 중간 상태)** 4건 + **정리 대상 잔존물** 1건. 사전 팝업 자체의 코드 결함은 발견되지 않았다 |
| 조치 | **코드 수정 대상 없음.** 해소하려면 H430의 사전 데이터(파일럿 enrichment · Full-Fidelity presentation)를 확장해야 하며, 이는 자비스/GPT 활성 영역 + 사람 승인 게이트다 → **구현 금지, 후속 과제로 등록** (5·8절) |
| 확인된 화면 | 본문 캔버스 원어 보기 → 단어 클릭 → **`[원어 사전]` 팝업** (사용자 확인 완료, 6절) |

## 1. 조사 범위와 방법

- 렌더링 경로 코드: `LexiconPopup.jsx`, `ApprovedKoreanLexiconPane.jsx`, `LexiconTranslationDrawer.jsx`, `lexiconTranslationPilotBridge.jsx`, `wordSearchAlignmentPilotBridge.jsx`, `lexiconFullFidelityPresentation.js`, `lexiconApprovalLoader.js`, `lexicon.js`
- 데이터: `data/lexicon/approval-registry.json`, `public/lexicon/ko/{registry,manifests,shards}`, `data/lexicon/handoff/*`, `src/data/lexiconTranslationPilot.js`
- 실측: bolls.life BDBT API를 H430·H776 양쪽으로 직접 호출해 응답 구조 비교 (읽기 전용 GET)
- 정책: `docs/lexicon-workflow/v4-EVIDENCE_FIRST_AUTONOMOUS.md` (현행 SSOT)

## 2. (a) 실제로 무엇이 다른가

### 2.1 같은 것 — 영문 원사전 본문

`fetchStrongDefinition()`(`src/utils/lexicon.js:172`)은 히브리어에 대해 로컬 청크와 bolls.life BDBT를 병렬 조회하고 **BDBT 우선**으로 반환한다(`lexicon.js:185-189`). 실측 결과 두 Strong 모두 BDBT 항목이 존재한다:

| Strong | BDBT 응답 | 정의 길이 | 구조 |
|---|---|---|---|
| H430 | 존재 | 583자 | `<ol><li>…<ol type=a>` 동일 |
| H776 | 존재 | 1117자 | `<ol><li>…<ol type=a>` 동일 |

→ 팝업 상단 배지도 양쪽 모두 `BDB`(`LexiconPopup.jsx:274`)로 동일하다. **영문 본문 형식은 차이 없음.**

### 2.2 다른 것 — 한글 승인 사전 영역 5가지

두 Strong 모두 Approval Registry에 등재돼 있고(`public/lexicon/ko/registry.json` 16개 항목에 H430·H776 모두 포함), 팝업의 `📚 한글 사전` 토글과 드로어는 양쪽 다 뜬다. 그러나 내용 구성이 다르다.

| # | 항목 | H776 (에레츠) | H430 (엘로힘) | 결정 지점 |
|---|---|---|---|---|
| 1 | 승인 배지 | `✓ 사람 검토 완료` | `✓ Evidence 검증 승인` | `ApprovedKoreanLexiconPane.jsx:166-167`, `LexiconTranslationDrawer.jsx:99-100` |
| 2 | 안내 문구 | "사람 검토 승인 데이터를 사용합니다" | "Evidence AND-Gate 자동 승인 데이터를 사용합니다" | 같은 파일 `:168` / `:101` |
| 3 | **`어원 · BDB` + `TWOT 항목` 메타카드** | **표시됨** | **아예 없음** | `Pane.jsx:192-193`, `Drawer.jsx:115` — `enrichment` 유무로 조건부 렌더 |
| 4 | 의미 트리 뱃지 | `결합 근거` 3개 + `기존 승인 보존` 1개 뱃지가 붙음 | 뱃지 0개 (전부 direct) | `Pane.jsx` `EvidenceBadge` |
| 5 | `원문 출처` / `근거 구성` | 2줄(`stepbible-tahot`, `stepbible-tbesh`) · "직접 22 · 결합 3 · 기존승인 보존 1" | 1줄(`openscriptures-hebrewlexicon-bdb`) · "직접 13 · 결합 0 · 기존승인 보존 0" | `Pane.jsx:194-195` |

부가로 의미 트리 규모 자체가 **H776 26개 노드 vs H430 13개 노드**다(내용 차이이며 형식 차이는 아니다).

**가장 눈에 띄는 것은 3번**이다. H776에만 `어원 · BDB`와 `TWOT 항목` 카드 2개가 더 있어 카드 구성이 육안으로 달라 보인다.

### 2.3 다언어 검색 화면에만 있는 추가 차이

사용자가 보신 화면이 `[원어 성경 다언어 검색]`이라면 차이가 하나 더 있다. `wordSearchAlignmentPilotBridge.jsx`는 **창세기 1:1 + H430에만** 정렬 파일럿 패널을 주입한다:

- `wordSearchAlignmentPilotBridge.jsx:6-7` — `TARGET_REFERENCE = '창세기 1:1'`, `TARGET_STRONG_RE = /H0*430/i`
- `WordSearchAlignmentPilot.jsx:2-3` — `tokenId: 'GEN.1.1.hot.2'`, `strong: 'H430'`
- 결과: H430 용례 행에만 `data-word-search-alignment-panel="H430"` 패널이 추가로 붙는다. H776에는 없다.

즉 이 화면에서는 **H430이 H776보다 요소가 하나 더 많다.**

## 3. (b) 원인 — 코드 분기인가 데이터인가

### 3.1 사전 팝업 경로에 Strong별 코드 분기는 없다

`LexiconPopup.jsx`와 `lexicon.js`를 전수 검색한 결과 `H776`/`H430` 하드코딩 분기, license/provenance 전용 분기는 **없다**. 표시 분기는 `definition.source`(`bdbt`/`local`/BibleHub) 하나뿐이며 두 Strong 모두 `bdbt`로 동일하다.

승인 사전 로더도 차별하지 않는다. `lexiconApprovalLoader.js:98-136`의 lemma 검증은 `aliasLookup`(H1254a처럼 접미사 있는 항목을 base Strong으로 조회할 때)에만 적용되며, H430·H776은 정확 일치 경로라 lemma 게이트를 타지 않는다.

### 3.2 차이는 전부 데이터 범위에서 나온다

| 차이 | 데이터 출처 | 현재 범위 |
|---|---|---|
| 2.2의 1·2번 (배지·문구) | `approval-registry.json`의 `reviewer.reviewerType` | H776 = `human`(`parkminhyun0`, 2026-08-07 승인) · H430 = `evidence-policy`(`lexicon-v4-evidence-and-gate`, 2026-08-11 승인) |
| 2.2의 3번 (어원·TWOT) | `src/data/lexiconTranslationPilot.js` | **H776 1개 항목뿐.** 파일 주석에 "파일럿 범위는 H776(אֶרֶץ, 에레츠) 1개 항목"으로 명시돼 있음 |
| 2.2의 4·5번 | 승인 의미 트리의 `evidenceSupport`·`identity.sourceRefs` | 각 Strong의 Evidence 구성 차이 |
| `BDB 구조 완전 표시` 섹션 | `src/data/lexiconFullFidelityPresentation.js:1-6` | **H1254a 1개 항목뿐.** H430·H776 **둘 다 미표시** — 이 항목은 H430/H776 차이의 원인이 아니다 |

### 3.3 H430 파일럿·정렬 작업의 영향

사용자가 지목한 "H430 파일럿·정렬 작업의 영향"은 **사전 팝업에는 영향이 없다.** 확인 결과:

- H430 정렬 파일럿(`WordSearchAlignmentPilot`, `wordSearchAlignmentPilotBridge`)은 `[role="dialog"][aria-label="원어 성경 다언어 검색"]`에만 주입된다(`wordSearchAlignmentPilotBridge.jsx:4`).
- 사전 팝업 브리지는 `[role="dialog"][aria-label^="원어 사전"]`을 대상으로 한다(`lexiconTranslationPilotBridge.jsx:6`). 두 브리지는 대상 다이얼로그가 달라 서로 간섭하지 않는다.
- 다만 **다언어 검색 화면**에서는 3.1의 결론과 별개로 H430 전용 파일럿이 실제로 형식 불일치를 만든다(2.3).

### 3.4 Full-Fidelity handoff 산출물 상태

```
data/lexicon/handoff/genesis-h1254a-full-fidelity/  candidate.json  evidence.json  presentation.ko.json
data/lexicon/handoff/genesis-h3117-full-fidelity/   candidate.json  evidence.json
data/lexicon/handoff/genesis-h430-full-fidelity/    candidate.json  evidence.json     ← presentation.ko.json 없음
```

H430은 Full-Fidelity **candidate/evidence까지 산출됐으나 한국어 presentation 직렬화가 아직 없다.** 따라서 `getLexiconFullFidelityPresentation('H430', …)`은 `null`을 반환하고(`lexiconFullFidelityPresentation.js:29-30`) 앱은 `approvedSenseTree`만 렌더한다. H776도 동일하게 `null`이다.

## 4. (c) 결함인가 의도된 차이인가

| 차이 | 판정 | 근거 |
|---|---|---|
| 승인 배지·문구 (2.2 #1·#2) | **의도된 정확한 표시** | 실제 승인 주체가 다르다. H776은 사람 승인, H430은 Evidence AND-Gate 자동 승인. 이를 같게 보이게 만드는 것이 오히려 정책 위반 |
| 어원·TWOT 카드 부재 (2.2 #3) | **의도된 파일럿 범위** (결함 아님, 미확장 상태) | `lexiconTranslationPilot.js` 주석이 범위를 H776 1개로 명시. 조건부 렌더가 정상 동작 중 |
| 근거 뱃지·출처 (2.2 #4·#5) | **의도된 데이터 반영** | Evidence 구성이 실제로 다르다 |
| Full-Fidelity 섹션 부재 (3.4) | **의도된 승인 게이트** | H430 handoff는 PR #363에서 `research only`로 공개됨. 정책 SSOT §4는 승인 앱 전달을 의도하는 계정에 한해 presentation 직렬화를 요구하며, 미완료 시 `Full-Fidelity App Active`를 주장하지 않는 것이 규정된 동작 |
| H430 전용 GEN.1.1 정렬 파일럿 (2.3) | **정리 대상 잔존물** | 노션 2026-08-08 기록에서 "DOM 브리지식 사후 수정 중단"·"정식 경로 설계"로 이미 대체 방침이 정해진 파일럿이다. 다만 이는 **정렬 트랙(자비스) 소관**이며 사전 팝업 문제와 별개다 |

**사전 팝업 경로에서 수정해야 할 코드 결함은 발견되지 않았다.**

## 5. 자비스/GPT 활성 영역 충돌 점검

사용자 관찰을 해소하려면 아래 데이터를 손봐야 하는데, 전부 타 자동화·사람 승인 영역이다.

| 해소에 필요한 변경 | 영역 | 판정 |
|---|---|---|
| `src/data/lexiconTranslationPilot.js`에 H430 추가 (어원·TWOT) | BDB 번역 파일럿 데이터 | **금지.** 사전 의미 데이터 생성은 GPT/자비스 lane, 신학 민감어(엘로힘)는 사람 예외 Gate |
| `data/lexicon/handoff/genesis-h430-full-fidelity/presentation.ko.json` 생성 + `lexiconFullFidelityPresentation.js` 등록 | Full-Fidelity 승인 파이프라인 | **금지.** 정책 SSOT §4·§10, 지문 정합(candidateFingerprint·approvedEvidenceFingerprint) 필요. 사람 승인 Gate |
| `approval-registry.json`의 H430 reviewer 변경 | Approval Registry | **절대 금지.** 정책 §"Approval Registry, approved meanings … remain human-review protected" |

**현재 브랜치 충돌은 없다.** 최근 25개 원격 브랜치를 전수 대조한 결과 위 파일들을 건드리는 미병합 브랜치는 0건이다(`chatgpt/ot-bdb-full-fidelity-presentation`은 `609b8a77`로 이미 main 병합됨). open PR #360·#345도 교집합이 없다. 다만 **자비스 Luke Lane이 활성 상태**이고 미커밋 산출물(`reports/genesis-*.json` 5건, `.cache/`)이 그대로 있어, 사전 데이터 영역 진입은 여전히 금지 대상이다.

## 6. 화면 확정 (사용자 확인 완료 · 2026-08-14)

조사 시점에는 두 화면 중 어느 쪽인지 미확정이었으나, 사용자 확인 결과 **1번 화면**으로 확정됐다.

- **확정 경로: 본문 캔버스 원어 보기 → 단어 클릭 → `[원어 사전]` 팝업**
- 따라서 2.3의 H430 전용 정렬 파일럿 패널(다언어 검색 전용)은 **이번 관찰과 무관하다.** 해당 잔존물 정리는 정렬 트랙(자비스) 소관으로 남긴다.
- 관찰된 형식 불일치의 실체는 2.2의 5가지이며, 그 중 사용자 눈에 가장 크게 보이는 것은 **`어원 · BDB` + `TWOT 항목` 카드 2개의 유무**다.

## 7. 판정 — 조사로 종결

- **01-plan.md 미작성 · 코드 수정 없음.** 사전 팝업 경로에서 수정할 코드 결함이 확인되지 않았고, 해소에 필요한 변경은 전부 타 lane·사람 승인 게이트 데이터이기 때문이다. 규칙("데이터 수정이 필요한 결론이면 구현하지 말고 보고만")에 따라 보고에서 종결한다.
- task2는 **조사 사이클로 마무리**한다. 산출물은 이 문서 하나이며 02-impl/03-review/04-decision은 생성하지 않는다(구현·검증 대상이 없음).

## 8. 후속 과제 등록 (담당 lane 조율 필요)

**"어디서 클릭하든 동일한 사전 결과"는 기존 시스템 요구사항이다.** 현재 상태는 그 요구사항을 아직 충족하지 못한 중간 단계이며, 이번 조사는 그 미충족 지점을 특정했다.

완성에 필요한 작업 — **전부 데이터 작업이며 0-lead 파이프라인이 단독 수행할 수 없다**:

1. **H430을 한글 승인 사전 파일럿 범위에 편입** — `src/data/lexiconTranslationPilot.js`의 파일럿 범위를 H776 1개에서 확장해 H430의 어원(BDB)·TWOT 항목을 포함시킨다. 사전 의미 데이터 생성이므로 GPT/자비스 lane 소관.
2. **사람 승인 게이트 통과** — 엘로힘(H430)은 신학 민감어다. 정책 SSOT상 신학 민감·기존 승인 의미 변경은 자동 승인 금지이며 **박 목사님 검토**를 거쳐야 한다.
3. (선택) Full-Fidelity presentation 직렬화 — `genesis-h430-full-fidelity/presentation.ko.json` 생성 + `lexiconFullFidelityPresentation.js` 등록. 이는 H776도 아직 미적용이라 두 Strong 간 차이의 원인은 아니지만, 정책 §4·§10 기준의 완성 조건이다.

→ **담당 lane(자비스/GPT)과 조율할 후속 과제로 등록한다.** 파이프라인(0-lead) 단독 착수 금지.

---

# 9. 재조사 (2026-08-14 · 최종 목표 확정 후)

## 9.0 이전 조사(1~8절)의 한계 — 정정

1~8절은 **한글 승인 사전 영역**만 비교했고, 사전 팝업의 **`📖 사전 정의` 탭(영문 본문)** 은 "두 Strong 모두 BDB로 동일"하다고 판정했다. 근거는 서버(개발 머신)에서 bolls.life BDBT API를 직접 호출한 결과였다.

**이 판정은 서버 관점에서는 옳았으나 런타임(브라우저) 관점에서는 불완전했다.** 사용자 실물 관찰(H430 정의 탭 = 영문 산문 + KJV 용례)은 `source: 'local'` 경로가 렌더된 상태이며, 이는 1~8절이 다루지 않은 층이다. 아래는 그 층의 재조사다.

## 9.1 확정된 목표 형식

> 모든 Strong 단어의 사전 정의는 **"BDB 구조 트리 → 한글 승인본"** 형식으로 통일한다. H776의 현재 표시가 표준이다.

## 9.2 증상의 코드적 정체

`📖 사전 정의` 탭은 `fetchStrongDefinition()` 결과 하나만 렌더한다(`LexiconPopup.jsx:37-43`, `:262-297`). 이 함수가 돌려주는 `source` 값에 따라 **완전히 다른 형식**이 나온다:

| `source` | 생성 위치 | 렌더 형식 | 배지 |
|---|---|---|---|
| `bdbt` | `lexicon.js:147-163` `fetchBDBDef()` — bolls.life 실시간 API | **BDB 구조 트리** (`<ol><li>` 중첩) | `BDB` |
| `local` | `lexicon.js:128-145` `lookupLocalDef()` — 로컬 Strong's 청크 | **영문 산문** + `어원:` + **`KJV 용례:`** | `Strong's` |

사용자가 보신 "영문 산문 + KJV 용례"는 `lexicon.js:143`의 `<p class="lex-kjv"><b>KJV 용례:</b>` — **`local` 경로에서만 생성되는 문자열**이다. 즉 H430은 BDB 조회에 실패해 Strong's 폴백으로 떨어진 상태다.

## 9.3 왜 H430이 산문으로 나오는가 — 실측

사용자가 제시한 세 가지 가설을 모두 검증했다.

| 가설 | 검증 | 결과 |
|---|---|---|
| **조회 키 0패딩** | `fetchStrongDefinition`이 `H0430 → H430` 정규화(`lexicon.js:176-177`), `fetchBDBDef`도 `H430`·`430` 두 형태를 순차 시도(`:149-151`) | **원인 아님** |
| **소스 선택 우선순위** | 배포 번들 실측: `n = r || t` (bdbt 우선, local 폴백) — 소스 코드와 동일 | **원인 아님** (우선순위는 정상) |
| **폴백 조건** | `fetchBDBDef`는 `!res.ok`면 `continue`, 두 형태 모두 실패 시 `null` 반환 → 조용히 `local`로 폴백 | **여기가 원인 지점** |

추가 실측으로 원인을 특정했다:

1. **API 자체는 정상.** 서버·브라우저 양쪽에서 H430/H776 모두 `200`, CORS `access-control-allow-origin: *`, 정상 BDB `<ol>` 트리 반환. 연속 10회 요청에서 rate-limit 없음. 히브리어 12개 표본 전수 보유(12/12).
2. **라이브 앱에서도 정상 응답.** 실제 배포 페이지(`parkminhyun0.github.io/bible-mindmap/app/`) 컨텍스트에서 fetch한 결과 H430 `200`(583바이트)·H776 `200`(1117바이트).
3. **그러나 서비스 워커 캐시가 포화 상태다.** `vite.config.js:168-177`이 `https://bolls.life/*` 전체를 `StaleWhileRevalidate` + `cacheName: 'bm-bolls-v1'` + **`maxEntries: 500`** + `maxAgeSeconds: 7일` + **`cacheableResponse: { statuses: [0, 200] }`** 로 캐싱한다. 라이브 브라우저에서 확인한 결과 **이 캐시는 이미 정확히 500개(상한)로 가득 차 있었다.**
   - bolls.life는 **KRV/WEB 절 본문 조회에도 쓰인다.** 사전 정의 항목이 수백 개의 절 요청과 같은 500칸을 두고 LRU 경쟁한다 → 사전 응답이 수시로 축출·재요청된다.
   - `statuses: [0, ...]` 는 **opaque/실패 응답까지 캐시 대상**으로 허용한다. 한 번 나쁜 응답이 들어가면 최대 7일간 그 단어만 BDB가 죽는다.
4. **인메모리 캐시가 실패를 세션 내내 고정한다.** `lexicon.js:165,195` `_defCache`는 폴백 결과(`local`)를 그대로 저장하고 **재시도 경로가 없다.** 한 번 산문으로 떨어진 단어는 페이지를 새로고침할 때까지 계속 산문이다.

**결론:** 원인은 데이터가 아니라 **코드(런타임 아키텍처)** 다. ① 표준 형식(BDB 트리)의 유일한 공급원이 **서드파티 실시간 API**이고, ② 실패 시 **형식이 다른 산문으로 조용히 폴백**하며, ③ SW·인메모리 캐시가 그 실패를 **단어 단위로 고착**시킨다. 그래서 같은 화면에서 어떤 단어는 BDB 트리, 어떤 단어는 산문이 되는 비대칭이 발생한다.

## 9.4 같은 증상의 범위

| 대상 | 현재 형식 | 규모 |
|---|---|---|
| **모든 헬라어 Strong** | **항상 `local` 산문** — `lexicon.js:190-193`이 헬라어는 BDB 조회를 아예 하지 않는다(주석: "헬라어: 로컬 청크만") | 신약 전체 (~5,600 Strong) · **상시 형식 불일치** |
| 히브리어 — BDB 조회 실패 단어 | 산문으로 폴백 | 비결정적. SW 캐시 축출·네트워크 상태에 따라 단어별·세션별로 달라짐 |
| 히브리어 — BDBT 미보유 단어 | 산문으로 폴백 | 표본 12/12 보유로 드물어 보이나 전수 미확인 |
| 한글 승인본 보유 Strong | `📖 사전 정의` 탭에는 **표시되지 않음**. 별도 `📚 한글 사전` 드로어에만 존재 | 16개 (H430·H776 포함) |

**가장 큰 발견은 헬라어다.** 히브리어 BDB 실패는 비결정적 사고지만, 헬라어는 **설계상 100% 산문**이라 "모든 Strong 형식 통일" 목표와 정면으로 충돌한다.

또한 마지막 행이 중요하다. **현재 `📖 사전 정의` 탭은 한글 승인본을 렌더하지 않는다.** 목표 형식의 "→ 한글 승인본" 단계가 이 탭에 아직 연결돼 있지 않다.

## 9.5 BDB 데이터가 정말 없는 단어의 형식 유지 방안

로컬 BDB 데이터셋은 저장소·`data-dist` 어디에도 없다(`public/data/`에는 `alignment`·`places.json`뿐). `data/lexicon/source-registry.json`에 `openscriptures-hebrewlexicon-bdb`·`unfoldingword-bdb-enhanced`가 **출처로 등록**돼 있으나 실제 사전 본문 데이터는 앱에 동봉돼 있지 않다.

따라서 "BDB 미보유" 단어(헬라어 전체 포함)에 대해서는 **BDB를 만들어낼 수 없다.** 형식 유지는 두 가지 방향뿐이다:

- **(권장) 구조 정규화** — Strong's 데이터(`어원`/`정의`/`KJV 용례`)를 BDB 트리와 **같은 구조 컴포넌트**에 넣어 렌더한다. 산문 문자열을 `dangerouslySetInnerHTML`로 그대로 쏟지 않고, 노드 목록으로 정규화해 동일한 들여쓰기·마커·타이포그래피를 적용한다. 출처 배지로 `BDB` / `Strong's`를 구분 표기해 사용자가 근거를 오해하지 않게 한다.
- (범위 외) BDB 로컬 데이터셋 구축 — 라이선스·Source Gate 심사가 필요한 데이터 작업이며 자비스/GPT lane 소관.

## 9.6 [데이터 층] 범위 외 확인 사항 — 기록만

- **전 단어 한글본 생산은 원어 한글사전 66권 lane 소관이다.** 관제 페이지 `📚 원어 한글사전 66권 · Public-First 관제 대시보드`, 진행 DB `📖 원어 한글사전 66권 진행 DB`(창세기·누가복음 활성)가 SSOT이며, 실행 주체는 현재 `EXECUTOR=자비스`, 생성·조사는 GPT다. 신학 민감·기존 승인 의미 변경은 `lexicon-human-approval` **사람 예외 Gate**를 유지한다.
- 현재 승인 완료는 **16개 Strong**(`public/lexicon/ko/registry.json`). 66권 전체 대비 극히 일부다.
- **코드 층 완성 시 "승인 진행에 따라 한글로 자동 전환되는 구조"가 되어야 한다.** 이는 01-plan의 **검증 항목으로 포함**한다: 승인 레지스트리에 항목이 추가되기만 하면 코드 변경 없이 해당 Strong의 정의 탭이 한글 승인본으로 전환되어야 하며, 미승인 Strong은 영문 BDB 트리를 유지해야 한다.

## 9.7 판정 — 코드 원인 확정, 01-plan 초안 작성

- 원인이 **코드**로 확정됐다(9.3). 지시대로 `01-plan.md` **초안**을 작성하고 보고·대기한다.
- 데이터 층(한글본 생산·BDB 로컬 데이터셋)은 **범위 외**이며 9.6에 기록만 한다.
- 8절의 후속 과제 등록은 유효하다. 다만 8절은 "한글 카드 2개 차이"를 다뤘고, 9절은 그보다 상위인 **정의 탭 형식 자체의 붕괴**를 다룬다. 코드 층은 후자를 해결하며, 전자는 데이터 승인이 진행되면 자동 해소되는 구조를 만든다.

