# 인물(people) 배치 계약

**대상 파일**: `bible-mindmap/src/data/biblicalPeople.js` (T1), `biblicalPeopleT2.js` (T2), `biblicalPeopleT3.js` (T3), `biblicalPeopleT4.js`... (확장)

## 항목 스키마 (T3에서 확립)

```js
{
  "id": "moses",
  "name": "모세",
  "aliases": [],
  "testament": "ot",
  "periodId": "wilderness-generation",
  "placeIds": [],
  "bibleRefs": ["출애굽기 3:1-4:17", "출애굽기 19:1-25"],
  "role": "출애굽 지도자·율법 중재자",
  "summary": "짧은 개혁주의 서술 (2~3문장)",
  "certainty": "confirmed",
  "relatedPeople": ["aaron", "joshua"]
}
```

## 필수 규칙 (`verify-biblical-people.mjs` 강제)

| 규칙 | 이유 |
|---|---|
| `id` 고유 (T1~Tn 통합 중복 금지) | 로스터 계약 |
| `periodId` = `biblicalPeriods.js`의 실제 ID | dangling 참조 금지 (T3에서 `wilderness` 잘못 → `wilderness-generation` 정정 실적) |
| `placeIds`·`relatedPeople` 원소도 실제 등록 ID만 | dangling 금지 |
| `certainty` = `confirmed` \| `estimated` \| `debated` | 학술 등급 |
| `bibleRefs` = 실제 본문 범위 | 본문 없는 인물 금지 |

## 학술 근거 ([[scholarly-verification-standard]])

- 이름·직분·bibleRefs: 성경 본문 + 표준 성경사전
- `summary`: 개혁주의 관점, 신학자 저술 근거
- `relatedPeople`: 성경·역사적 타당성 (시대착오·오연결 배제)
  - 단, T1/T2 관례상 **비동시대 주제·계보 연결 허용** (사사끼리, 조상↔후손). 이 관례는 유지.
- 동명이인 ID 분리 (라멕/므낫세/비느하스/므비보셋/요아스 등)

## 배치 처리 흐름

1. **선정**: 다음 티어 대상 명단 (T4 이후)
2. **생성**: GPT가 학술 근거 기반 항목 생성
3. **verify**: `node scripts/verify-biblical-people.mjs` 통과 (계약·중복·시대·장소·관계)
4. **Gemini 교차감사**: 시대·관계·certainty·오탐
5. **자비스 개혁주의 검수**: summary·신학 민감 인물
6. **PR → 머지 → 배포**

## 진행 상태 (오늘)

- T1 38명 + T2 44명 + T3 44명 = **총 126명 · verifier 통과**
- T4 이후 명단은 별도 카드 발주 대기

## 금지사항

- ❌ `periodId` 임의 지정 (biblicalPeriods.js 미등록 ID 금지)
- ❌ `bibleRefs` 없는 인물
- ❌ 동명이인 ID 병합
- ❌ Gemini 교차감사에서 지적된 시대착오 관계 미정정
