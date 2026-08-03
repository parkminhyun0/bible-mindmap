# 성경 마인드맵 전체 시스템 감사 기준선

기준 브랜치: `main`
감사 시작 기준 커밋: `2ae1b844756ab30d2506c58a6328c3115813c1a0`

## 목적

현재 데이터와 기능을 검증 가능한 영역으로 나누고, 발견된 문제를 재현 테스트와 함께 수정한다. 각 단계는 별도 PR, 전체 CI, 병합, Notion 대시보드 갱신으로 종료한다.

## 감사 단계

| 단계 | 범위 | 완료 기준 | 상태 |
| --- | --- | --- | --- |
| A0 | 기준선·의존성·CI 정합성 | manifest/lock/import 일치, 임시 설치 우회 제거 | 진행 중 |
| A1 | 성경·원어·정경·curated 데이터 | 장절·Strong·출처·참조·중복 하드 게이트 통과 | 대기 |
| A2 | 핵심 기능 브라우저 E2E | 저장·복원·노드·팝업·역본·검색 smoke 통과 | 대기 |
| A3 | 모바일·접근성 | 주요 viewport, 키보드, 포커스, 스크롤 계약 통과 | 대기 |
| A4 | 검색·NVIDIA 품질 | Hybrid·차원·모델·오탐·출처 평가 통과 | 진행 중 |
| A5 | 보안·배포·라이브 | Secret 경계, production build, Pages smoke 통과 | 대기 |
| A6 | 잔여 문제 정리 | P0/P1 0건, 낮은 위험 항목 문서화 | 대기 |

## 최초 확인 문제

1. `src/components/NodeEditor.jsx`가 `@tiptap/react`, `@tiptap/starter-kit`을 직접 import하지만 `package.json`의 dependencies에는 누락되어 있다.
2. `package-lock.json`에는 위 패키지와 `gh-pages`가 루트 직접 의존성으로 기록되어 있어 manifest와 lock이 불일치한다.
3. PR CI가 불일치를 고정 버전 임시 설치로 우회하므로 새 환경에서 재현될 수 있다.
4. Playwright 명령은 존재하지만 기본 PR CI에서 실행되지 않아 브라우저 상호작용 회귀를 놓칠 수 있다.

## 운영 원칙

- 기존 데이터나 기능을 근거 없이 삭제·축소하지 않는다.
- 수정 전 재현 가능성을 확인하고 수정과 함께 회귀 검증을 추가한다.
- AI·NVIDIA 결과는 candidate/평가 보고서로만 남기며 승인 없이 운영 DB를 바꾸지 않는다.
- 데이터 verifier, production build, 브라우저 E2E, 라이브 smoke를 서로 다른 증거로 구분한다.
- 완료된 단계는 즉시 최상위 Notion 대시보드와 `최근 수정 사항 (ChatGPT)`에 기록한다.
