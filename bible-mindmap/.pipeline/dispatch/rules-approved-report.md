# rules-approved 작업 보고서

## 변경 파일

- `scripts/verify-transliteration-policy.mjs`: `rules-approved` 상태 계약을 허용하고, migration 비활성·승인 정보·전체 mapping 승인·이관 함수 차단을 검증하도록 확장했다. `pending-pastor-approval`과 `rules-approved` 모두 canonical `transliterationPolicyVersion` 표식을 차단한다.
- `src/data/transliterationPolicy.js`: 표기 규칙 승인 상태와 박 목사님 승인 정보(2026-08-21)를 기록하고, 모든 proposed mapping을 승인했다. `migrationEnabled=false`와 이관 함수 차단은 유지했다.
- `docs/transliteration-approval-gate.md`: 상태와 표기 원칙 승인 체크박스를 갱신하고, 데이터 이관·앱 표시는 별도 승인이 필요함을 명시했다. 6단계 별도 PR 범위는 미승인으로 유지했다.

## 검증 시나리오

- `pending-pastor-approval`: 통과
- `rules-approved`: 통과
- `approved` (`migrationEnabled=true`): 통과
- `rules-approved`인데 `migrationEnabled=true`: 실패 — 계약 누수 없음

## 프로젝트 검증

- `npm run predev`: 통과
- `npm run lint`: 통과(기존 경고만 출력)

## Draft PR

- PR: #397 (Draft)
