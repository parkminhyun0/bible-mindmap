# task6 · 사전 한글 음역 batch 02 (빈도 상위 245개) · 계획

작성: 0-lead (Claude Opus 5) · 2026-08-21
브랜치: `pipeline/task-korean-translit-batch02` (base: `origin/main` = `3667d15a`)

## 1. 배경

PR #390(`3667d15a`)으로 66권 빈도 상위 100개 중 87개에 한글 음역이 붙었다.
현재 런타임 사전 `KOREAN_GLOSS_ACTIVE`는 **256개**다.

`src/data/glossFrequency.json`의 코퍼스 빈도 후보 300개 가운데 아직 음역이
없는 항목이 **245개**(히브리어 206 · 헬라어 39, 빈도 840회~146회) 남아 있다.
이번 과제는 그 245개를 한 배치로 끝낸다.

## 2. 범위

### 하는 것
- 245개 Strong에 `translit`(SBL 라틴 음역)·`translitKo`(한글 음역)·`note` 부여
- 신규 파일 `src/data/koreanGlossTopBatch02.js` 생성
- `src/data/koreanGlossActive.js`에 배치 02 병합(기존 파일 내용은 수정하지 않음)
- 검증기 `scripts/verify-korean-strong-genesis.mjs`에 배치 02 규칙 추가

### 하지 않는 것
- **뜻(`glossKo`) 생성 금지.** 권위 사전 게이트가 별도로 있다. `glossKo`는
  `public/data/strongs-def`(Strong 원 정의)에서 기계적으로 옮겨 담기만 한다.
- 기존 `koreanGloss.js` · `koreanGlossGenesis1Batch01/02.js` · `koreanGlossTopBatch01.js` 수정
- 원어 철자·모음부호·악센트·Strong·lemma·형태론 변경
- UI 컴포넌트 변경, 광범위 리팩터링

## 3. 방법 — 10개 모델 패널 병렬 + 교차검증

`docs/transliteration-approval-gate.md`의 표기 원칙과, batch 01에서 쓴
"복수 관점 독립 작성 → 불일치만 별도 판정" 방식을 확대 적용한다.

245개를 5셰이드(A~E, 각 49개)로 나누고, **각 셰이드를 서로 다른 두 모델
계열이 독립으로** 음역한다. 상대의 산출물을 읽지 못하게 해 독립성을 지킨다.

| 셰이드 | 제안자 1 | 제안자 2 |
|---|---|---|
| A | Gemini 3.1 Pro (agy) | Claude Opus 5 (claude) |
| B | Gemini 3.1 Pro (agy) | Claude Opus 4.6 (agy) |
| C | Gemini 3.7 Flash (agy) | Claude Opus 5 (claude) |
| D | Gemini 3.1 Pro (agy) | Claude Sonnet 4.6 (agy) |
| E | Gemini 3.7 Flash (agy) | Claude Opus 4.6 (agy) |

CMUX 워크스페이스 `음역 병렬 10`에 10패널로 동시 실행하며, 각 패널은
stream-json을 사람이 읽는 로그로 바꿔 실시간 표시한다.

Codex(GPT-5)는 사용량 한도 소진으로 이번 사이클에서 제외한다.
Gemini CLI는 개인 무료 티어 지원 종료(IneligibleTierError)로 직접 호출이
막혀 있어, Antigravity(`agy`)를 통해 Gemini 3.1 Pro·3.7 Flash를 쓴다.

### 합의 처리
1. 두 제안의 `translitKo`가 **일치** → 채택
2. **불일치** → 제3 모델이 두 안을 비교해 판정(어느 쪽도 아니면 제3안 허용).
   판정 근거를 `note`에 남긴다.
3. 판정에서도 결론이 서지 않는 낱말 → `review: true` + `note`에 쟁점 기록.
   데이터에서 빼지 않고 검토 대상으로 남긴다.

### 안전 표시
- 전 항목 `review: true`로 시작한다(batch 01과 동일). 자동승인하지 않는다.
- 신학 민감어·고유명사는 학술 표기를 표제로, 관용 표기 차이는 `note`에 적는다.

## 4. 입출력

- 입력: `.pipeline/task6/input/shard-{A..E}.json` (245개, `manifest.json`에 집계)
  - 출처: `src/data/glossFrequency.json`(STEPBible 코퍼스 빈도) +
    `public/data/strongs-def`(lemma·라틴음역·영문 정의)
- 작업자 명세: `.pipeline/task6/WORKER_SPEC.md`
- 제안: `.pipeline/task6/proposals/{셰이드}-{모델}.json` (10개)
- 합의 결과: `.pipeline/task6/consensus.json`
- 최종 산출: `src/data/koreanGlossTopBatch02.js`

## 5. 역할

ROLES.md 폴백 규칙 적용(**Codex 부재 → Claude가 0-lead 겸 1-run, agy가 2-review**).

- 0-lead (Claude Opus 5): 01-plan · 패널 오케스트레이션 · 합의 산출 · 04-decision
- 제안자 10 (Gemini/Claude 혼성): 셰이드별 독립 음역안
- 1-run (Claude Opus 5): `src/` 반영 + 검증기 확장 + 02-impl
- 2-review (agy): 01/02와 구현 대조 검증, 테스트 직접 실행, 03-review 판정.
  **구현한 모델이 자기 구현을 검증하지 않는다**는 원칙에 따라 agy가 맡는다.

## 6. 검증 기준 (PASS 조건)

1. `node scripts/verify-korean-strong-genesis.mjs` 통과
2. `KOREAN_GLOSS_ACTIVE` 개수 = 256 + 245 = **501** (중복 키 0)
3. 245개 전부 `translit`·`translitKo` 비어 있지 않음, `review === true`
4. 기존 3개 배치 파일과 `koreanGloss.js` diff 없음
5. 같은 자모 조합이 배치 안에서 서로 다르게 표기되지 않음(일관성 검사)
6. `npm run lint` / 기존 테스트 스위트 통과
7. **PR CI(CodeQL 포함)까지 확인 후 판정.** 로컬 PASS만으로 사이클을 닫지 않는다.

## 7. PR

- `gh pr create --draft` 로만 생성한다. 이 저장소의 auto-merge 워크플로가
  일반 PR을 무승인 병합하므로 Draft가 유일한 차단 수단이다.
- Ready 전환과 병합은 사용자가 한다. 사이클 종료 전 `merged_by`를 점검한다.
