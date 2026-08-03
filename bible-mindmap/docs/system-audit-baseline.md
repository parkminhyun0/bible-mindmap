# 성경 마인드맵 전체 시스템 감사 기준선

기준 브랜치: `main`
감사 시작 기준 커밋: `2ae1b844756ab30d2506c58a6328c3115813c1a0`

## 목적

현재 데이터와 기능을 검증 가능한 영역으로 나누고, 발견된 문제를 재현 테스트와 함께 수정한다. 각 단계는 별도 PR, 전체 CI, 병합, Notion 대시보드 갱신으로 종료한다.

## 감사 단계

| 단계 | 범위 | 완료 기준 | 상태 |
| --- | --- | --- | --- |
| A0 | 기준선·의존성·CI 정합성 | manifest/lock/import 일치, 임시 설치 우회 제거 | 완료 · PR #84 |
| A1 | 핵심 기능 브라우저 E2E | 저장·복원·노드·팝업·모달 smoke 통과 | 완료 · PR #85 |
| A2 | 성경·원어·정경·curated 데이터 | 장절·Strong·출처·참조·중복 하드 게이트 통과 | 진행 중 |
| A3 | 모바일·접근성 | 주요 viewport, 키보드, 포커스, 스크롤 계약 통과 | A1 일부 완료 |
| A4 | 검색·NVIDIA 품질 | Hybrid·차원·모델·오탐·출처 평가 통과 | 진행 중 |
| A5 | 보안·배포·라이브 | Secret 경계, dependency audit, production build, Pages smoke 통과 | 대기 |
| A6 | 잔여 문제 정리 | P0/P1 0건, 낮은 위험 항목 문서화 | 대기 |

## 최초 확인 문제와 처리 상태

1. `src/components/NodeEditor.jsx`가 직접 사용하는 `@tiptap/react`, `@tiptap/starter-kit`의 manifest 누락 — **A0 수정 완료**.
2. `package-lock.json` 루트에만 있던 `gh-pages` 선언 불일치 — **A0 수정 완료**.
3. PR CI의 Tiptap 임시 설치 우회 — **A0 제거 완료**, 순수 `npm ci` 검증.
4. Playwright 명령은 존재하지만 기본 PR CI에서 실행되지 않음 — **A1 수정 완료**, Chromium smoke 9개 통과.
5. browser smoke job의 lexicon 생성 누락 — **A1 수정 완료**, 테스트 서버와 실제 브라우저 검증 성공.
6. `npm ci` 결과 고위험 취약점 1건 — **A5 보안 감사 대상**.
7. GitHub Actions의 Node 20 action-runtime 경고 — **A5 CI 현대화 대상**.

## A2 데이터 감사 범위

- 성경 registry 39권·27권·66권과 책 ID·한글명·영문명·장 수의 유일성
- 한글 약어가 실제 66권 ID만 가리키는지 검증
- curated registry가 66권 전체를 정확히 포함하고 각 책의 모든 장을 보유하는지 역방향 검사
- 관찰카드 `Book:Chapter` 키, 책·장 범위, 필수 스키마, 원어 lex 존재, discourse marker 중복·본문 존재율 검증
- 정경 개념과 usage map의 잘못된 키를 차단하고 미구축 범위는 경고·수치로 분리
- 시대 DB의 group 관계와 ID 유일성 검증
- 기존 Strong 실재·절 상한·역본 절 번호 예외 검증과 함께 predev/prebuild 하드 게이트 적용

## 운영 원칙

- 기존 데이터나 기능을 근거 없이 삭제·축소하지 않는다.
- 수정 전 재현 가능성을 확인하고 수정과 함께 회귀 검증을 추가한다.
- AI·NVIDIA 결과는 candidate/평가 보고서로만 남기며 승인 없이 운영 DB를 바꾸지 않는다.
- 데이터 verifier, production build, 브라우저 E2E, 라이브 smoke를 서로 다른 증거로 구분한다.
- 완료된 단계는 즉시 최상위 Notion 대시보드와 `최근 수정 사항 (ChatGPT)`에 기록한다.
