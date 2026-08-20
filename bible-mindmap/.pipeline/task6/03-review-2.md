# task6 · 03-review-2 · 2-review 검증 판정 보고서

작성: 2-review (agy / Gemini 3.7 Flash)
일시: 2026-08-21
대상 브랜치: `pipeline/task-korean-translit-batch02` (base `origin/main` = `3667d15a`)
대상 PR: #391 (`feat(lexicon): 빈도 상위 Strong 한글 음역 245개 추가 (batch 02)`)
최종 판정: **PASS (통과)**

---

## 1. 개요 및 검증 요약

`.pipeline/ROLES.md`의 `2-review` 역할 규정에 따라 `.pipeline/task6/01-plan.md`의 명세 및 PASS 조건 7가지, `.pipeline/task6/02-impl.md`의 구현 내역 및 주장, 그리고 실제 코드베이스(`src/data/koreanGlossTopBatch02.js`, `src/data/koreanGlossActive.js`, `scripts/verify-korean-strong-genesis.mjs` 등)를 대조·실행 검증했습니다.

- **코드 수정 금지 준수**: 본 검증자는 일체의 제품 코드를 수정하지 않고 독립 검증 및 판정만 수행했습니다.
- **전수 검사 수행**: 표본 조사가 아닌 245개 전 항목에 대한 스크립트 전수 검사를 실행했습니다.
- **최종 판정**: **PASS** (01-plan.md 6절의 7가지 조건 전원 충족, PR #391 CI 12개 항목 전체 통과 확인).

---

## 2. 01-plan.md 6절 PASS 조건 7가지 상세 검증

### 1) `node scripts/verify-korean-strong-genesis.mjs` 통과
- **실행 명령**:
  ```bash
  node scripts/verify-korean-strong-genesis.mjs
  ```
- **실제 출력**:
  ```
  ✓ Genesis 1 Korean Strong verification passed
    baseline entries: 144
    extension entries: 25
    active entries: 501
    pilot tokens: 52
    baseline auto: 2/52 (3.8%)
    projected auto: 2/52 (3.8%)
    projected review: 50
    projected uncertain: 35
    projected missing gloss: 0
  ```
- **판정**: **PASS** (exit code 0, 에러 0건)

---

### 2) `KOREAN_GLOSS_ACTIVE` 개수 501개 (256 + 245) 및 중복 키 0개
- **검증 내용**:
  - 기존 4개 배치: `KOREAN_GLOSS`(144) + `GENESIS_1_BATCH_01`(13) + `GENESIS_1_BATCH_02`(12) + `TOP_BATCH_01`(87) = 256개
  - 신규 배치: `TOP_BATCH_02` = 245개 (히브리어 206개, 헬라어 39개)
  - 전체 활성 사전 합계 = **501개**
  - 5개 배치 간 및 배치 내부 키 중복 검사
- **실행 스크립트 검증 결과**:
  ```
  === 1. 개수 및 중복 키 검사 ===
  KOREAN_GLOSS: 144
  GENESIS_1_BATCH_01: 13
  GENESIS_1_BATCH_02: 12
  TOP_BATCH_01: 87
  TOP_BATCH_02: 245 (meta entryCount: 245)
  Active total: 501 (Expected: 144+13+12+87+245 = 501)
  중복 키 개수: 0 []
  ```
- **판정**: **PASS** (정확히 501개, 중복 키 0건)

---

### 3) 245개 전부 `translit`·`translitKo` 비어 있지 않고 `review === true`
- **검증 내용**: `src/data/koreanGlossTopBatch02.js` 내 245개 전 항목 전수 검사
- **실행 스크립트 검증 결과**:
  ```
  === 2. 245개 translit, translitKo, review 검사 ===
  히브리어(H) 개수: 206, 헬라어(G) 개수: 39
  emptyTranslit: 0
  emptyTranslitKo: 0
  nonTrueReview: 0
  ```
- **판정**: **PASS** (공백 음역 0건, `review: true` 245/245건 100% 충족)

---

### 4) 기존 배치 파일 4개에 diff 없음
- **실행 명령**:
  ```bash
  git diff --stat 3667d15a HEAD -- src/data/koreanGloss.js src/data/koreanGlossGenesis1Batch01.js src/data/koreanGlossGenesis1Batch02.js src/data/koreanGlossTopBatch01.js
  ```
- **실제 출력**: (출력 없음, diff 0건)
- **`src/` 및 `scripts/` 전체 diff 확인**:
  ```bash
  git diff --stat 3667d15a HEAD -- src/ scripts/
  ```
  ```
   .../scripts/verify-korean-strong-genesis.mjs       |   23 +-
   bible-mindmap/src/data/koreanGlossActive.js        |    5 +-
   bible-mindmap/src/data/koreanGlossTopBatch02.js    | 2005 ++++++++++++++++++++
   3 files changed, 2029 insertions(+), 4 deletions(-)
  ```
- **판정**: **PASS** (기존 4개 사전 파일 변경 0줄, 격리 원칙 완벽 준수)

---

### 5) `glossKo`에 새로 만든 한글 뜻 혼입 금지 (권위 사전 영문 정의 검증)
- **검증 내용**:
  - `glossKo` 필드에 임의 번역된 한글이 들어갔는지 정규표현식(`/[가-힣]/`) 전수 검사
  - 입력 셰이드(`.pipeline/task6/input/shard-*.json` 및 `public/data/strongs-def/`) 원본 영문 정의와 245개 일대일 대조
- **실행 스크립트 검증 결과**:
  ```
  Total checked: 245
  Mismatches with shard inputs: 0
  Hangul in glossKo: 0
  ```
- **판정**: **PASS** (한글 뜻 혼입 0건, 권위 사전 영문 정의 100% 일치)

---

### 6) 02-impl.md 4절의 다섯 규칙 일관성 전수 검사
245개 전체에 대해 스크립트로 규칙 준수 여부를 전수 검사했습니다.

| 규칙 | 검사 방법 및 기준 | 검사 결과 | 위반 건수 |
|---|---|---|---|
| **1. 베가드케파트 연음** | `translit` 내 결합문자/완성문자 연음 기호(`ḇ, ḡ, ḏ, ḵ, ṯ, p̄` 및 `\u0304, \u0331`) 검출 | 44건 기호 제거 완료 (`zāhāb`, `kesep` 등) | **0건** |
| **2. 다게쉬 포르테** | `translitKo` 내 장애음(`ㄱ, ㄷ, ㅂ, ㅅ, ㅆ, ㅈ, ㅊ, ㅋ, ㅌ, ㅍ`) 받침 검출 | 5건 받침 제거 완료 (`이샤`, `하타아`, `마테`, `기보르`, `아슈르`), 정상 표기인 `G1831` 엑세르코마이(ξ=ks) 1건 외 중복 받침 없음 | **0건** |
| **3. 음절 말 שׁ** | 어말/음절 말 `š`에 대응하는 한글이 '시'로 끝나는지 검출 | `H4940` 미쉬파하, `H6430` 펠리쉬티, 어말 `š` 12건 모두 '쉬' 적용, '시' 표기 0건 | **0건** |
| **4. 자음 ו (waw)** | 자음 `w`의 한글 표기가 '와/웨/위/워'인지 검출 | `H6680` 차와, `H8432` 타웨크, `H3069` 예호위, `H3881` 레위이, `H5771` 아원, `H4687` 미츠와, `H4194` 마웨트 | **0건** |
| **5. ע + 홀렘** | `ʿô / ʿō`의 한글 표기 일관성 검출 | `H5771` 아원, `H5930` 올라, `H5769` 올람, `H5750` 오드, `H6547` 파르오 | **0건** |

- **판정**: **PASS** (5개 규칙이 245개 전체에 일관되게 적용됨)

---

### 7) `npm run lint`, 테스트 스위트 및 PR CI (CodeQL 포함) 통과

#### (1) 로컬 검증
- **`npm run lint` (oxlint)**:
  - 결과: Found 168 warnings and **0 errors** (신규 파일 관련 에러 없음, exit code 0)
- **`node scripts/verify-korean-gloss.mjs`**:
  - `✓ 구조·과병합 가드 통과 (144항목, 73개념)`
- **`node scripts/verify-transliteration-policy.mjs`**:
  - `✓ 음역 정책 승인 게이트 통과`
- **`npm run predev` (34개 검증기 전체)**:
  - `✓ 34개 검증기 전체 통과`
- **`npm run test:smoke` (Playwright E2E 21개 테스트)**:
  - `21 passed (42.2s)`

#### (2) GitHub PR CI (CodeQL 포함)
- **대상 PR**: #391 (`https://github.com/parkminhyun0/bible-mindmap/pull/391`)
- **PR 상태**: `DRAFT` (무승인 자동 병합 방지 조치 완료)
- **`gh pr checks 391` 실행 결과**:
  ```
  Analyze (actions)               pass    35s
  Analyze (javascript-typescript) pass    1m11s
  Analyze (python)                pass    46s
  CodeQL                          pass    3s
  browser-smoke                   pass    2m44s
  contract                        pass    7s
  inventory                       pass    11s
  lexicon-human-approval          pass    0s     (ordinary-auto: no approved lexicon data touched)
  security-audit                  pass    18s
  verify                          pass    18s
  verify-and-build                pass    48s
  verify-resume-checkpoint        pass    15s
  ```
- **판정**: **PASS** (12개 CI 체크 전체 통과)

---

## 3. 02-impl.md 주장 사실 대조 및 지적 사항

### 1) 검증된 사실 (정확함)
- **항목 수 및 언어 비율**: 전체 245개 (히브리어 206개, 헬라어 39개) 일치.
- **1라운드 제안 집계**: 5개 셰이드 총 177건 합의, 68건 불일치 (A: 49/0, B: 23/26, C: 45/4, D: 30/19, E: 30/19) 정확함.
- **2라운드 판정**: 3개 독립 모델(Gemini 3.1 Pro, Gemini 3.7 Flash, Claude Opus 5)이 68건 판정 수행 완료.
- **기계적 규칙 교정 건수**: `final.json` 기준 베가드케파트 44건, 다게쉬 포르테 5건, 음절 말 שׁ 0건(총 49건) 정확함.
- **감사 지적 사항 처리**:
  - H4872, H3063, H3389, H4714의 note 필드에 관용 표기 차이 설명 온전히 수록됨 확인.
  - H3069(`יְהוִה`, 예호위) 표기 유지 및 사유 명시 확인.

### 2) 사실과 다른 기술 / 개선 지적 사항
1. **02-impl.md 6절 감사 결과 표의 누락**:
   - `02-impl.md` 6절의 표에 `| audit-C·D·E | 지적 없음 |`이라고 기술되어 있으나, 실제 산출물 `.pipeline/task6/audits/audit-E.json`에는 `G3972 (Paûlos)`에 대해 `파울로스` 대신 `파우로스` 제안(severity: low)이 1건 기록되어 있었습니다.
   - 비록 `ㄹ` 받침은 한국어 음절 분할 특성상 유지하는 것이 선례와 일치하여 최종적으로 `파울로스`가 채택되었으나, 감사 결과에 지적이 전혀 없었다는 서술은 실제 산출물과 불일치합니다.
2. **02-impl.md 8절의 PR CI 상태 기술**:
   - `02-impl.md` 작성 시점에는 `PR CI(CodeQL 포함)는 아직 확인 전이다`로 기술되었으나, 이후 Draft PR #391이 정상 생성되었고 12개 CI 항목(CodeQL 포함)이 모두 PASS 되었음을 본 검증 단계에서 확인했습니다.

---

## 4. 최종 판정

```
=====================================================
  task6 · 사전 한글 음역 batch 02 검증 결과: PASS
=====================================================
  - 활성 사전 항목 수: 501개 (256 + 245, 중복 0)
  - 245개 음역/검토 플래그: 전 항목 충족 (review: true)
  - 기존 4개 배치 파일 diff: 0건
  - 권위 사전 영문 정의 준수: 100% (임의 한글 번역 0건)
  - 5대 표기 규칙 일관성: 전수 검사 통과
  - 로컬 테스트 및 린트: 전체 통과 (oxlint 0 error)
  - GitHub Draft PR #391 CI (CodeQL 포함): 12개 항목 전체 통과
=====================================================
```
