# 정렬(alignment) 배치 계약

**대상 파일**: `public/data/alignment/<translation>/<book>/<chapter>.json`

예: `public/data/alignment/krv/genesis/1.json`

## 파일 스키마

```json
{
  "schemaVersion": "1.0.0",
  "book": "genesis",
  "chapter": 1,
  "translation": "krv",
  "sourceVersions": {
    "dictionary": "2026-08-07.1",
    "lexicon": "stepbible-2026.08",
    "krv": "bolls-krv-2026.08"
  },
  "records": [
    {
      "schemaVersion": "1.0.0",
      "tokenId": "genesis.1.1.hot.3",
      "strong": "H430",
      "tokenChecksum": "5c0d9b6a",
      "relation": "direct",
      "status": "auto",
      "confidence": 0.98,
      "targets": {
        "korean": {
          "text": "태초에 하나님이 천지를 창조하시니라",
          "spans": [{ "start": 4, "end": 8 }]
        }
      },
      "sourceVersions": { "dictionary": "2026-08-07.1", "krv": "bolls-krv-2026.08" },
      "notes": "필요 시 자비스 검수 메모"
    }
  ]
}
```

## 필수 필드 (`validateAlignmentRecord` 강제)

| 필드 | 타입·규칙 |
|---|---|
| `schemaVersion` | `"1.0.0"` 고정 |
| `tokenId` | `createTokenId({bookId,chapter,verse,language,index})` 형식 |
| `strong` | `H430`/`G2316` 형식 (정규화, 선행 0 없음) |
| `tokenChecksum` | 8자리 hex FNV-1a. `computeTokenChecksum(원어표면형)` |
| `relation` | `direct` \| `one-to-many` \| `many-to-one` \| `omitted` \| `supplied` \| `uncertain` |
| `status` | `auto` \| `review` \| `verified` \| `rejected` |
| `confidence` | 0.0 ~ 1.0 |
| `targets.<lang>.spans` | `omitted`/`supplied`/`uncertain` 외에는 필수 |

## 정확도 기준 (자동/검수 분기)

| confidence | 처리 |
|---|---|
| ≥ 0.95 | 자동 승인(`status: auto`) — 자비스 최종 검수만 |
| 0.75 ~ 0.94 | 표본 검수(`status: review`) — Gemini 교차감사 후 자비스 |
| < 0.75 | 필수 검수(`status: review`) — Gemini + 자비스 필수 |
| 신학 민감어 (하나님/성령/그리스도/메시아 등) | confidence 무관 자비스 개혁주의 검수 |

## GPT 배치 발주 예시 (파일럿)

```
[정렬 파일럿 A] Genesis 1장 · KRV 정렬
- 대상: public/data/alignment/krv/genesis/1.json
- 범위: 31절 전체 원어 토큰
- 계약: docs/gpt-batch-contracts/alignment.md
- 툴:
  1. lex 데이터(hot/Gen/1.json)에서 각 토큰의 s(Strong), w(surface) 읽기
  2. computeTokenChecksum(w) 로 checksum 생성
  3. KRV 본문에서 sensible 매칭 위치를 spans 로 기록
  4. 애매하면 relation:"uncertain" + 낮은 confidence
- 절대: 사전에 없는 뜻 임의 생성 금지, 억지 매칭 금지
- 산출: PR → scripts/verify-translation-alignment.mjs 통과 필수
```

## 금지사항

- ❌ `tokenChecksum` 누락 (검증 실패)
- ❌ 사전에 없는 한국어 뜻으로 매칭
- ❌ 부분문자열 매칭 (예: "말"이 "말씀"에 걸리게)
- ❌ confidence 임의 부풀리기
- ❌ 신학 민감어 자동 승인 처리
- ❌ `koreanGloss.js` 동시 수정 (별도 트랙)
