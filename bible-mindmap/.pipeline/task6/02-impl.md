# task6 · 02-impl · 구현 요약

작성: 1-run (Claude Opus 5, ROLES.md 폴백 — Codex 사용량 소진)
커밋: `9bc2829d` (앞선 산출물 `23b0911d`, `adf4c09f`)
브랜치: `pipeline/task-korean-translit-batch02` (base `3667d15a`)

## 1. 만든 것

| 경로 | 내용 |
|---|---|
| `src/data/koreanGlossTopBatch02.js` | 신규. 245개 항목 (히브리어 206 · 헬라어 39) |
| `src/data/koreanGlossActive.js` | batch 02 import·병합·개수 집계 추가 |
| `scripts/verify-korean-strong-genesis.mjs` | 빈도 배치 검사를 두 배치 순회로 바꾸고 batch 02 전용 규칙 추가 |
| `.pipeline/task6/` | 입력·제안·판정·감사·최종안과 재현 도구 |

기존 `koreanGloss.js` · `koreanGlossGenesis1Batch01/02.js` · `koreanGlossTopBatch01.js`
는 **한 줄도 고치지 않았다.**

## 2. 대상 선정

`src/data/glossFrequency.json`(STEPBible 코퍼스 집계)의 내용어 후보 300개에서
이미 `KOREAN_GLOSS_ACTIVE`에 있는 55개를 뺀 245개. 빈도 840회~146회.

`lemma`·`translit`(라틴)·영문 뜻은 `public/data/strongs-def`에서 가져왔다.
히브리어 쪽은 이 출처에 라틴 음역이 비어 있어 작업자가 lemma의 모음부호를 보고
직접 채웠다.

## 3. 병렬 작업 구성

CMUX 워크스페이스 `음역 병렬 10`에 10패널 동시 가동.

**1라운드 — 독립 제안 (10패널)**

| 묶음 | 제안자 1 | 제안자 2 | 결과 |
|---|---|---|---|
| A | Gemini 3.1 Pro | Claude Opus 5 | 일치 49 / 불일치 0 |
| B | Gemini 3.1 Pro | Claude Opus 4.6 | 23 / 26 |
| C | Gemini 3.7 Flash | Claude Opus 5 | 45 / 4 |
| D | Gemini 3.1 Pro | Claude Sonnet 4.6 | 30 / 19 |
| E | Gemini 3.7 Flash | Claude Opus 4.6 | 30 / 19 |

합계 **일치 177 · 불일치 68**. 상대 산출물 열람을 금지해 독립성을 지켰고,
셰이드 A는 표기가 전부 일치하면서도 note 문구는 10건 모두 서로 달라 독립
작성이었음이 확인된다.

**2라운드 — 판정 5 + 감사 5 (10패널 재투입, 유휴 없음)**

- 판정: 불일치 68개를 각자 독립 판정. Gemini 3.1 Pro · Gemini 3.7 Flash ·
  Claude Opus 5 완료. Claude Opus 4.6 · Sonnet 4.6 은 Antigravity 개인 쿼터
  소진으로 실패(재시도도 동일). **3개 독립 판정으로 진행**했다.
  (batch 01 은 2개 모델로 판정했으므로 그보다 강하다.)
- 감사: 일치 177개를 다섯 묶음으로 나눠 규칙 일관성 감사.

## 4. 규칙 확정 — 표결이 아니라 선례로

세 판정자는 `waw`·`ayin_holam` 두 규칙에 3/3 합의했고, 나머지 셋은 2:1로 갈렸다.
소수 의견(Claude Opus 5)은 **이미 배포된 데이터의 선례**를 근거로 들었고, 실제
파일을 확인한 결과 선례가 소수 의견 쪽이었다.

| 쟁점 | 표결 | 저장소 선례 | 확정 |
|---|---|---|---|
| 베가드케파트 연음 | 2:1 기호 사용 | 창세기 배치 `ṭôb` · `ʿereb` · `bōqer` · `bādal` — 기호 없음 | **기호 없음** |
| 다게쉬 포르테 | 2:1 받침 살림 | `אַתָּה→아타` · `כַּפֹּרֶת→카포레트` · `θάλασσα→탈라사` — 안 겹침 | **안 겹침** |
| 음절 말 שׁ | 2:1 쉬 | `에쉬` · `데바쉬` · `쇼레쉬` · `이쉬` (예외 `나하시` 1건) | **쉬** |
| 자음 ו | 3:0 | — | **와/웨/위/워** |
| ע+홀렘 바브 | 3:0 | — | **아원** |

표만 세면 기존 사전과 어긋나는 표기가 들어왔을 자리다. 다수결을 그대로 쓰지
않고 선례를 기준으로 삼은 이유가 여기 있다.

## 5. 규칙의 기계적 적용

`.pipeline/task6/tools/apply-rules.mjs`가 확정 규칙을 **불일치 68개만이 아니라
245개 전체**에 적용했다. 합의된 항목이라도 규칙에 어긋나면 고쳤다.

- 베가드케파트 44건 — `zāhāḇ→zāhāb`, `yāraḏ→yārad`, `kesep̄→kesep` 등
- 다게쉬 포르테 5건 — `잇샤→이샤`, `핫타아→하타아`, `맛테→마테`,
  `깁보르→기보르`, `앗슈르→아슈르`
- 음절 말 שׁ 0건 (이미 전부 규칙에 맞았다)

교정 내역은 `.pipeline/task6/final.json`의 `changes`에 항목별로 남아 있고,
교정된 항목의 `note`에는 어떤 규칙으로 왜 그렇게 적었는지 적었다.

**받침 규칙 초안의 오류를 잡은 과정**: 처음 구현은 `ㄹ`·`ㅁ`·`ㄴ` 받침도
겹자음으로 보아 `샬롬→사롬`, `예루샬라임→예루샤라임`, `엘레프→에레프` 같은
멀쩡한 표기를 31건 깎았다. 한국어는 자음 하나뿐인 `ל`·`מ`·`נ`도 앞 음절 받침과
뒤 음절 첫소리로 나눠 적는다. 유음·비음을 빼고 장애음 계열만 다루도록 고쳤다.
반대로 `ㅅ`받침+`ㅌ`(맛테·핫타아)을 처음엔 놓쳐 장애음 전체를 짝으로 넣었다.
교정 후 남은 받침은 `엑세르코마이`(ξ=ks) 하나이며 정상이다.

## 6. 감사에서 나온 지적 처리

| 지적 | 판단 |
|---|---|
| H4872·H3063·H3389·H4714 note 누락 (4건) | **오탐.** 감사 패킷을 만들 때 `note` 필드를 빼고 넘긴 탓이다. 실제 데이터에는 `관용 표기 '모세'와 차이` 등이 모두 들어 있다. 패킷 결함이며 다음 라운드에서 `note`를 포함해 넘긴다. |
| H3069 `예호위`를 `야훼`로 바꿔야 한다 | **채택 안 함.** H3069(`יְהוִה`)는 H3068과 달리 신명을 엘로힘으로 대독할 때의 모음이 붙은 별개 형태다. 현행 표기와 note가 맞다. |
| audit-C·D·E | 지적 없음 |

## 7. 안전 장치

- 전 항목 `review: true`. 검증기가 batch 02에 한해 이를 강제한다.
- `glossKo`는 생성하지 않았다. `strongs-def`의 영문 정의를 기계 복사했다.
  한글 뜻은 권위 사전 게이트에서 따로 다룬다.
- 검증기에 batch 02 전용 규칙 추가: `translit` 비어 있으면 실패(batch 01은
  TAHOT 미제공이라 허용), `review !== true`면 실패.

## 8. 검증 결과

| 항목 | 결과 |
|---|---|
| `node scripts/verify-korean-strong-genesis.mjs` | ✓ 통과 · **활성 사전 501개** (256+245, 계획 목표와 일치) |
| `npm run predev` (검증기 34개) | ✓ 전부 통과 |
| `npm run lint` | ✓ 통과 (exit 0, 신규 파일 경고 없음) |
| `verify-korean-gloss` · `verify-transliteration-policy` · `verify-translation-alignment` | ✓ 개별 통과 |
| 기존 배치 파일 diff | 없음 |
| 중복 키 | 0 (검증기가 배치 간·배치 내 중복을 검사) |

PR CI(CodeQL 포함)는 아직 확인 전이다.

## 9. 재현

```
node .pipeline/task6/tools/build-shards.mjs    # 입력 245개 → 5묶음
node .pipeline/task6/tools/consensus.mjs       # 제안 10개 대조 → 합의/불일치
node .pipeline/task6/tools/merge-rulings.mjs   # 판정 3개 다수결
node .pipeline/task6/tools/apply-rules.mjs     # 확정 규칙을 245개 전체에 적용
node .pipeline/task6/tools/build-batch02.mjs   # 최종 배치 파일 생성
```

## 10. 남은 일

- 2-review(agy) 검증
- Draft PR 생성 후 CodeQL 포함 CI 확인
- Antigravity Claude 쿼터 복구 후, 판정자 2명을 보태 68개 판정을 5표로 재확인할지 결정
- 다음 구간: 빈도 301위 이하 (전체 Strong 13,937개 중 현재 501개 수록)
