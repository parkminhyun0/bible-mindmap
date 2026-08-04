# P1-2d-b 관리자 전용 Hybrid shadow bridge

## 상태

- 라이브 사용자 결과: 기존 keyword-only 유지
- NVIDIA 브라우저 직접 호출: 금지
- production index 쓰기: 없음
- 사용자 데이터 변경: 없음
- GitHub Pages 기본 상태: 비활성화·네트워크 요청 없음

## 실행 경계

브라우저 bridge는 서버가 다음 runtime bootstrap을 제공한 경우에만 동작한다.

```js
window.__BIBLE_MINDMAP_HYBRID_PILOT__ = {
  mode: 'shadow',
  serverSessionVerified: true,
  actor: { isAdmin: true, pilotAllowed: true },
  endpoint: '/api/search/canonical-shadow',
  timeoutMs: 200,
};
```

이 값은 브라우저의 최종 권한 판정이 아니다. same-origin endpoint가 인증 cookie와 서버 세션을 다시 검증하고, NVIDIA API 키를 서버 안에서만 사용해야 한다. 클라이언트가 bootstrap 값을 위조해도 endpoint가 요청을 거부해야 한다.

## 요청 계약

- method: `POST`
- credentials: `same-origin`
- cache: `no-store`
- redirect: `error`
- raw query는 검색 실행에만 사용하고 로그에는 저장하지 않는다.
- 브라우저 요청에 `Authorization`, NVIDIA API key 또는 provider secret을 포함하지 않는다.
- payload는 `mode: shadow`, `readOnly: true`, 현재 keyword baseline ID를 포함한다.

## 사용자 결과

shadow 응답은 후보 비교와 telemetry에만 사용한다. 화면에 표시되는 결과는 항상 기존 keyword baseline이다. endpoint 실패·timeout·응답 형식 오류가 발생해도 사용자 결과는 변하지 않는다.

## telemetry

브라우저 이벤트 `bible-mindmap:canonical-shadow-telemetry`에는 다음만 포함한다.

- 검색어 SHA-256
- baseline/candidate/overlap 건수
- 성공 또는 fallback 상태
- fallback 사유
- 지연시간
- no-write 안전 플래그

검색 원문과 사용자 식별자는 포함하지 않는다.

## 다음 승인 조건

P1-2d-c에서 실제 server endpoint를 추가하려면 다음이 선행돼야 한다.

1. 서버 인증·관리자 allowlist
2. Secret 기반 NVIDIA 호출
3. rate limit과 request budget
4. sanitized telemetry 저장소
5. kill switch와 keyword-only rollback
6. staging에서 timeout·오류·권한 거부 실측
