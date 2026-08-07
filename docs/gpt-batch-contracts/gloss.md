# 사전(gloss) 배치 계약

**대상 파일**: `bible-mindmap/src/data/koreanGloss.js`

## 항목 스키마 (기존 확립)

```js
"H430": {
  "glossKo": "하나님, 신",     // BDB/HALOT 기준 짧은 한글 뜻(쉼표 구분)
  "translitKo": "엘로힘",       // 표준 음역 (박 목사님 승인 필수)
  "concept": "하나님/신론"      // 정경 개념 그룹
}
```

## 필수 규칙 (`verify-korean-gloss.mjs` 강제)

| 규칙 | 이유 |
|---|---|
| 키 형식: `^[HG]\d+$` (선행 0 없음) | 정규화 필수 |
| `glossKo`·`translitKo`·`concept` 모두 비어있지 않음 | 필수 필드 |
| 짝 단어 뜻 과병합 금지 | [[lexicon-gloss-standard]] |

## 학술 근거 필수 ([[scholarly-verification-standard]])

- 히브리어: **BDB / HALOT**
- 헬라어: **BDAG** (보조 Thayer)
- 각 단어는 자기 사전 뜻만 표기 · 짝 단어의 뜻 끌어오기 금지
- 다의어는 실제 사전에 등재된 다의만 병기 (예: G395 아나톨레 = 돋음/동쪽/새벽)
- 신학 민감어(예수·성령·그리스도·메시아 등)는 개혁주의 검수 필수

## 배치 처리 흐름

1. **선정**: `src/data/glossFrequency.json`의 내용어 미수록 후보(빈도순)
2. **생성**: 소량 배치(20~30개), BDB/HALOT·BDAG 대조
3. **verify**: `node scripts/verify-korean-gloss.mjs` 통과
4. **Gemini 교차감사**: 다의어·과병합·번역 정확도
5. **자비스 개혁주의 검수**: 신학 민감어
6. **박 목사님 승인**: `translitKo` (한국 음역 관행)
7. **PR → 머지 → 배포**

## 진행 상태 (오늘)

- 기존 144항목 (파일럿)
- **149 배치**: GPT 진행중 (translitKo 승인 완료)
- 이후 배치는 이 계약대로

## 금지사항

- ❌ 근거 없는 뜻 임의 생성
- ❌ 짝 단어 뜻 과병합 (H1121 벤=아들 ≠ G5206 휘오테시아=양자삼음)
- ❌ 신학 민감어 자동 승인
- ❌ verify-korean-gloss 실패 상태로 PR 생성
