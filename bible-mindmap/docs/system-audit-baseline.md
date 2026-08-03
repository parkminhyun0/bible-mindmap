# 성경 마인드맵 전체 시스템 감사 기준선

기준 브랜치: `main`
감사 시작 기준 커밋: `2ae1b844756ab30d2506c58a6328c3115813c1a0`

## 목적

현재 데이터와 기능을 검증 가능한 영역으로 나누고, 발견된 문제를 재현 테스트와 함께 수정한다. 각 단계는 별도 PR, 전체 CI, 병합, Notion 대시보드 갱신으로 종료한다.

## 감사 단계

| 단계 | 범위 | 완료 기준 | 상태 |
| --- | --- | --- | --- |
| A0 | 기준선·의존성·CI 정합성 | manifest/lock/import 일치, 임시 설치 우회 제거 | 완료 · PR #84 |
| A1 | 핵심 기능 브라우저 E2E | 저장·복원·노드·팝업·모달 smoke 통과 | 진행 중 |
| A2 | 성경·원어·정경·curated 데이터 | 장절·Strong·출처·참조·중복 하드 게이트 통과 | 대기 |
| A3 | 모바일·접근성 | 주요 viewport, 키보드, 포커스, 스크롤 계약 통과 | A1 일부 포함 |
| A4 | 검색·NVIDIA 품질 | Hybrid·차원·모델·오탐·출처 평가 통과 | 진행 중 |
| A5 | 보안·배포·라이브 | Secret 경계, dependency audit, production build, Pages smoke 통과 | 대기 |
| A6 | 잔여 문제 정리 | P0/P1 0건, 낮은 위험 항목 문서화 | 대기 |

## 최초 확인 문제와 처리 상태

1. `src/components/NodeEditor.jsx`가 직접 사용하는 `@tiptap/react`, `@tiptap/starter-kit`의 manifest 누락 — **A0 수정 완료**.
2. `package-lock.json` 루트에만 있던 `gh-pages` 선언 불일치 — **A0 수정 완료**.
3. PR CI의 Tiptap 임시 설치 우회 — **A0 제거 완료**, 순수 `npm ci` 검증.
4. Playwright 명령은 존재하지만 기본 PR CI에서 실행되지 않음 — **A1 처리 중**.
5. `npm ci` 결과 고위험 취약점 1건 — **A5 보안 감사 대상**.
6. GitHub Actions의 Node 20 action-runtime 경고 — **A5 CI 현대화 대상**.

## A1 브라우저 smoke 범위

- 앱 부팅과 저장된 캔버스 복원·새로고침 유지
- 모바일 자료 추가 시트와 문맥 성경 모달 생명주기
- 인물 검색 결과 스크롤과 추가 버튼 접근
- 배경 노드 리사이즈와 연결 핸들·본문 보존
- 문맥 성경·병렬 연구의 포커스 trap, Escape 닫기, 포커스 복귀
- 다크 모드·모션 감소·모바일·태블릿 모달 계약
- 실패 시 Playwright trace·스크린샷·HTML 보고서 artifact 보존

## 운영 원칙

- 기존 데이터나 기능을 근거 없이 삭제·축소하지 않는다.
- 수정 전 재현 가능성을 확인하고 수정과 함께 회귀 검증을 추가한다.
- AI·NVIDIA 결과는 candidate/평가 보고서로만 남기며 승인 없이 운영 DB를 바꾸지 않는다.
- 데이터 verifier, production build, 브라우저 E2E, 라이브 smoke를 서로 다른 증거로 구분한다.
- 완료된 단계는 즉시 최상위 Notion 대시보드와 `최근 수정 사항 (ChatGPT)`에 기록한다.
