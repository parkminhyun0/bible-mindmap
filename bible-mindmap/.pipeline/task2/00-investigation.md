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

