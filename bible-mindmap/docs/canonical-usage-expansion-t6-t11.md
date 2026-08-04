# Tier6~Tier11 정경 용례지도 확장

## 범위
- 기존 개념 정의: 72개
- 기존 용례지도: 36개념
- 이번 추가: Tier6~Tier11 36개념
- 추가 용례: 228개
  - Tier6: 6개념 × 8용례 = 48
  - Tier7~Tier11: 30개념 × 6용례 = 180

## 데이터 파일
- `canonicalUsageMapT4.js`: Tier6
- `canonicalUsageMapT5.js`: Tier7
- `canonicalUsageMapT6.js`: Tier8
- `canonicalUsageMapT7.js`: Tier9
- `canonicalUsageMapT8.js`: Tier10
- `canonicalUsageMapT9.js`: Tier11

## 완료 게이트
1. 모든 `CANONICAL_CONCEPTS` 키에 usage map 존재
2. 고아 usage map 키 없음
3. 개념별 6~10용례
4. note 40자 이하
5. 동일 개념 내부 ref 중복 없음
6. 기존 정경 개념 verifier 통과
7. 애플리케이션 build 통과

## CI
`.github/workflows/canonical-usage-completeness.yml`에서 개념·ref 검증, 완전성 검증, 집계 출력, build를 연속 실행한다.

## UI 영향
`CanonicalConceptModal`은 `canonicalUsageMap.js`의 통합 결과를 사용하므로 Tier6~Tier11에서도 정경 전체 용례 영역이 렌더된다.
