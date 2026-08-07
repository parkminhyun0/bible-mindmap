# GPT 배치 계약 (자비스 시스템 · GPT DB 생성)

박 목사님 지시 · 2026-08-07 확정.

## 역할 분담

| 주체 | 담당 | 도구 |
|---|---|---|
| **자비스** | 시스템 방향성·계약 스키마·verifier·CI 게이트·최종 검수 | 이 폴더의 계약·`scripts/verify-gpt-batch.mjs` |
| **GPT** | 계약 준수 하에 실제 DB 값 생성 (반복 작업) | Notion 파이프라인 카드 |
| **Gemini** | 학술 교차감사 (uncertain·신학 민감어) | 배치 결과 대상 |

원칙:
- 콘텐츠 값은 GPT가 생성, 자비스는 값을 **만들지 않는다**.
- 자비스는 배치 검증 통과 여부만 판정. 실패 시 GPT에 반려·재작업 지시.
- `verify-gpt-batch.mjs`가 prebuild·CI에 자동 걸려 잘못된 배치는 main 진입 불가.

## 3트랙

| 트랙 | 계약 문서 | 대상 파일 | 검증기 |
|---|---|---|---|
| **정렬(alignment)** | [`alignment.md`](alignment.md) | `public/data/alignment/**/*.json` | `verify-translation-alignment.mjs` |
| **사전(gloss)** | [`gloss.md`](gloss.md) | `src/data/koreanGloss.js` | `verify-korean-gloss.mjs` |
| **인물(people)** | [`people.md`](people.md) | `src/data/biblicalPeopleT*.js` | `verify-biblical-people.mjs` |

## 배치 라이프사이클

1. **자비스**: 파일럿 범위 지정 → GPT 카드 발주 (Notion)
2. **GPT**: 배치 생성 → 브랜치 push → 카드에 SHA 기록 (상태 `2·진행중(GPT)`)
3. **CI**: `verify-gpt-batch` + 트랙별 verifier 자동 실행
4. **자동 통과** (auto confidence + 회귀 통과) → 자비스 최종 판독 → 머지
5. **검수 대기** (uncertain/신학 민감어) → Gemini 교차감사 → 자비스 개혁주의 검수 → 카드 `3·완료`
6. **머지·배포**: 자비스 담당

## 절대 규칙

1. **직접 값 생성 금지 (GPT 외 주체)**: 자비스도 콘텐츠 값을 임의로 만들지 않음.
2. **학술 근거 필수**: BDB/HALOT·BDAG·성경신학·신학자 저술. [[scholarly-verification-standard]]
3. **판본 안정성**: 정렬은 반드시 `tokenChecksum` 포함 (Gemini 지적 대비).
4. **재현 가능성**: 배치는 `sourceVersions` 기록 필수.
5. **verifier 미통과 = main 진입 불가**: prebuild가 강제.
