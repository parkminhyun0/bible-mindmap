# P1-2d-c · NVIDIA Hybrid shadow server endpoint

## 상태

- 구현 상태: server core 및 mock verifier 완료
- 기본값: 비활성화
- GitHub Pages 현재 배포: endpoint 없음, 요청 0
- production 검색 노출: 없음
- 운영 DB 및 production index 쓰기: 없음

## endpoint

`POST /api/search/canonical-shadow`

요청은 서버가 검증한 관리자 세션과 allowlist가 모두 일치하는 경우에만 처리한다. 브라우저가 임의로 전달한 관리자 플래그는 인증 근거로 사용하지 않는다.

## 필수 환경 변수

- `BIBLE_MINDMAP_SHADOW_SERVER_ENABLED=true`
- `BIBLE_MINDMAP_SHADOW_KILL_SWITCH=false`
- `BIBLE_MINDMAP_SHADOW_ADMIN_IDS=<server actor ids>`
- `BIBLE_MINDMAP_SHADOW_RATE_LIMIT_PER_MINUTE=12`
- `BIBLE_MINDMAP_SHADOW_DAILY_REQUEST_LIMIT=250`
- `BIBLE_MINDMAP_SHADOW_TIMEOUT_MS=200`
- `NVIDIA_API_KEY=<server secret>`

기본 kill switch는 활성화 상태다. endpoint를 실제로 켜려면 enabled와 allowlist를 설정하고 kill switch를 명시적으로 내려야 한다.

## adapter 계약

배포 런타임은 다음 adapter를 주입해야 한다.

1. `authenticate(request)`
   - 서버 세션 검증
   - 안정적인 actor ID 반환
   - `serverSessionVerified`, `isAdmin`, `pilotAllowed` 반환
2. `rateLimiter({ actorHash, limit, windowSeconds })`
   - 공유 저장소 기반 분당 제한
3. `dailyBudget({ actorHash, limit })`
   - 일일 NVIDIA 호출 비용 제한
4. `searchHybrid({ queryVector, query, limit, readOnly })`
   - 승인된 72문서 shadow index만 읽기
   - 운영 index 쓰기 금지
5. `telemetrySink(record)`
   - 원문 검색어와 원본 actor ID 저장 금지
   - TTL 및 접근 통제 적용

## 보안 경계

- NVIDIA Secret은 서버 환경 변수에서만 읽는다.
- 브라우저 응답과 telemetry에 Secret을 포함하지 않는다.
- NVIDIA endpoint는 HTTPS만 허용한다.
- 요청 body는 shadow·readOnly 계약, 길이, baseline 수를 검사한다.
- 응답은 `no-store`와 `nosniff`를 사용한다.
- 오류 시 후보를 비우고 사용자 측 keyword baseline을 유지한다.
- Reranker는 호출하지 않는다.
- raw query 및 직접 사용자 식별자는 기록하지 않는다.

## 배포 전 남은 조건

현재 저장소에는 서버 런타임이 없다. 실제 활성화 전 다음 중 하나를 선택해야 한다.

- 정적 앱과 동일 origin에서 `/api`를 제공하는 통합 hosting
- custom domain reverse proxy를 통한 정적 Pages + serverless endpoint 결합

별도 origin CORS 호출은 P1-2d-b의 same-origin 안전 계약 때문에 허용하지 않는다.

## 승격 기준

- server adapter 통합 테스트 통과
- 실제 관리자 세션 인증 확인
- 분당 및 일일 제한 실측
- kill switch 즉시 차단 확인
- NVIDIA 오류 및 timeout fallback 확인
- telemetry 원문 부재 확인
- shadow 비교 최소 50건 후 품질·지연·비용 사람 검토

이 조건 전에는 `productionActivated: false`와 keyword-only 사용자 결과를 유지한다.
