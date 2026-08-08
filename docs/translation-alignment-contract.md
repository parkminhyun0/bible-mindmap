# 원어 다언어 정렬·하이라이트 계약 v1

## 목적

문자열 빈도 추정으로 KRV/WEB를 칠하지 않는다. 원어 토큰, 통합 사전 후보, 구절별 검증 span을 분리하고 정확도가 부족하면 표시하지 않는다.

## 런타임 우선순위

1. `alignmentRecord.targets[language].spans`가 있고 본문 버전이 일치하면 그 범위를 사용한다.
2. 원문은 실제 표면형 `entry.w`를 악센트·니쿳 비의존 방식으로 찾는다.
3. WEB는 사전 영문 후보와 `entry.g`를 단어 경계·보수적 굴절 규칙으로 찾는다.
4. KRV는 `koreanGloss.js`의 검수된 기본형을 찾고, 뒤에 붙은 유효한 조사 사슬까지 한 어절로 확장한다.
5. 후보가 없거나 충돌하면 `unresolved`로 두고 임의의 공통 음절을 칠하지 않는다.

## 새 파일

- `src/data/translationAlignmentContract.js`: tokenId, relation/status, 레코드 validator, 버전 stale 판정
- `src/utils/translationAlignment.js`: 원문/WEB/KRV span resolver
- `src/components/AlignedHighlightText.jsx`: UI 재사용 컴포넌트
- `scripts/verify-translation-alignment.mjs`: 대표 형태론·조사 회귀와 향후 정렬 JSON 검증

## WordSearchModal 연결

기존 `findKoreanWord()`와 `pickEnglishHl()`를 제거한다. 용례 행의 문자열 query 하이라이트 대신 다음처럼 교체한다.

```jsx
<AlignedHighlightText
  text={verseText}
  language={isKoreanView ? 'korean' : isEnglishView ? 'english' : 'original'}
  entry={r.word}
  userQuery={searchedQuery}
  color={fc}
  dir={textDir}
  fontFamily={textFont}
  fallback={fallbackMsg}
  showUnresolved
/>
```

`entry` 전체를 넘겨야 `w/l/s/m/g` 계약이 유지된다. Strong은 `H0430`과 `H430`을 같은 키로 정규화한다.

## 향후 정렬 산출물

경로 예시: `public/data/alignment/krv/genesis/1.json`

```json
{
  "records": [
    {
      "schemaVersion": "1.0.0",
      "tokenId": "genesis.1.1.hot.3",
      "strong": "H430",
      "relation": "direct",
      "status": "verified",
      "confidence": 1,
      "targets": {
        "korean": {
          "text": "...",
          "spans": [{ "start": 0, "end": 5 }]
        }
      },
      "sourceVersions": {
        "dictionary": "2026.08.07.1",
        "lexicon": "stepbible-2026.08",
        "krv": "bolls-krv-2026.08"
      }
    }
  ]
}
```

## 검증 명령

```bash
node scripts/verify-translation-alignment.mjs
```

향후 `package.json`의 `predev`·`prebuild`에 이 명령을 넣는다. UI 연결 PR에서는 H430/G2316만이 아니라 명사·동사·전치사 결합·소유 접미사·주격/속격/여격/대격 대표 세트를 추가한다.

## 안전 원칙

- 정렬 미확정은 무표시가 오표시보다 우선이다.
- 사전은 가능한 의미를 관리하고, alignment는 특정 구절의 실제 대응을 관리한다.
- 사전 수정 시 해당 Strong만, 역본 수정 시 해당 장만 증분 재생성한다.
- 기존 `w/tr/s/m/l/g`, 성경 본문, 사용자 저장 데이터는 수정하지 않는다.
