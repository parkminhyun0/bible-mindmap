# P1-2d NVIDIA Hybrid production pilot

## 목적

검증된 `nvidia-hybrid-2048` 검색을 전체 사용자에게 즉시 적용하지 않고, 제한된 관리자·허용 사용자 범위에서 기존 keyword-only 검색과 병행 검증한다.

## 기본 상태

- 기본 mode: `off`
- 대상: 관리자이면서 명시적으로 pilot 허용된 사용자
- rollout: 0% 기본, 최대 5%
- 읽기 전용
- 운영 DB·사용자 데이터·production index 쓰기 금지
- raw query text 로그 금지
- 오류·시간 초과·권한 불충족 시 `keyword-only` 즉시 fallback
- feature flag를 `off`로 돌리면 즉시 rollback

## 모드

- `off`: keyword-only 결과만 반환하며 Hybrid 호출도 하지 않는다.
- `shadow`: Hybrid를 병행 실행해 비교 자료만 만들고 사용자에게는 keyword-only 결과를 반환한다.
- `pilot`: 승인된 관리자에게만 Hybrid 결과를 반환한다. 실패 시 keyword-only로 즉시 복귀한다.

## 환경 변수 계약

- `BIBLE_MINDMAP_HYBRID_PILOT_MODE=off|shadow|pilot`
- `BIBLE_MINDMAP_HYBRID_PILOT_ADMIN_ONLY=true`
- `BIBLE_MINDMAP_HYBRID_PILOT_READ_ONLY=true`
- `BIBLE_MINDMAP_HYBRID_PILOT_FALLBACK=keyword-only`
- `BIBLE_MINDMAP_HYBRID_PILOT_PERCENT=0..5`
- `BIBLE_MINDMAP_HYBRID_PILOT_TIMEOUT_MS=50..250`
- `BIBLE_MINDMAP_HYBRID_PILOT_LOG_QUERY_TEXT=false`

## 개인정보·로그 경계

검색 원문은 기록하지 않는다. 비교 telemetry에는 query SHA-256, 선택 pipeline, fallback 사유, 결과 개수, 경과 시간만 남긴다.

## 승격 조건

1. shadow mode에서 품질·fallback·오류율 검증
2. 관리자 1% 이하 pilot
3. 기존 검색 대비 정답 누락·오탐·지연 회귀 없음
4. rollback 동작 확인
5. 사람 승인과 별도 PR

이 문서는 production 활성화 승인이 아니다. P1-2d-a는 안전 계약과 재사용 가능한 pilot wrapper만 제공하며 live UI 연결은 후속 PR에서 진행한다.
