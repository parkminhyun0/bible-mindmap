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
| A2 | 성경·원어·정경·curated 데이터 | 장절·Strong·출처·참조·중복 하드 게이트 통과 | 완료 · PR #86 |
| A3 | 모바일·접근성 | 주요 viewport, 키보드, 포커스, 스크롤 계약 통과 | 완료 · PR #87 |
| A4 | 검색·NVIDIA 품질 | Hybrid·차원·모델·오탐·출처 평가 통과 | 코드·mock 완료 · PR #89 · 실제 확장 실측 대기 |
| A5 | 보안·배포·라이브 | Secret 경계, dependency audit, production build, Pages smoke 통과 | 진행 중 |
| A6 | 잔여 문제 정리 | P0/P1 0건, 낮은 위험 항목 문서화 | 대기 |

## 최초 확인 문제와 처리 상태

1. `src/components/NodeEditor.jsx`가 직접 사용하는 `@tiptap/react`, `@tiptap/starter-kit`의 manifest 누락 — **A0 수정 완료**.
2. `package-lock.json` 루트에만 있던 `gh-pages` 선언 불일치 — **A0 수정 완료**.
3. PR CI의 Tiptap 임시 설치 우회 — **A0 제거 완료**, 순수 `npm ci` 검증.
4. Playwright 명령은 존재하지만 기본 PR CI에서 실행되지 않음 — **A1 수정 완료**, Chromium smoke 9개 통과.
5. browser smoke job의 lexicon 생성 누락 — **A1 수정 완료**, 테스트 서버와 실제 브라우저 검증 성공.
6. 성경 registry·curated·관찰카드·정경 usage 역방향 검증 공백 — **A2 수정 완료**, 66권·1,189장 교차 검증.
7. 사용자 매뉴얼의 초기 포커스·Tab 순환·Escape·모바일 스크롤 잠금·포커스 복귀 공백 — **A3 수정 완료**, 전체 Chromium smoke 11개 통과.
8. NVIDIA PoC가 4문서·4직접질의만 사용해 1.00 점수가 과도하게 쉬우며 오탐을 측정하지 않음 — **A4 코드·mock 수정 완료**, 실제 확장 bake-off 대기.
9. `npm ci` 결과 고위험 취약점 1건 — **A5 production/full 분리 감사 중**.
10. GitHub Actions의 Node 20 action-runtime 경고 — **A5 Node 24 기반 Actions로 교체 중**.
11. 배포 workflow에 A0에서 제거한 Tiptap 임시 설치 우회가 잔존 — **A5 제거 중**.
12. 라이브 검증이 version.json 커밋만 비교하고 HTML·JS·CSS 실체를 확인하지 않음 — **A5 보강 중**.

## A5 보안·배포 감사 범위

- PR에서 production(`--omit=dev`)과 full npm audit를 분리 실행하고 JSON artifact 30일 보존
- production high/critical은 PR과 Pages 배포를 모두 하드 실패
- full audit의 개발 도구 취약점은 패키지·전이 경로·fix 가능 여부를 근거로 수정
- checkout v6·setup-node v6·upload-artifact v7·download-artifact v8·github-script v9로 Node 24 action runtime 정렬
- 배포 workflow의 Tiptap 런타임 보충 설치 삭제, 순수 lockfile과 dependency integrity 사용
- workflow security verifier로 오래된 Action 버전·`pull_request_target`·runtime lock repair·자동 NVIDIA 실행 차단
- Pages 검증을 commit 일치뿐 아니라 landing/app HTML·module JS·CSS 자산의 상태·콘텐츠 유형·크기로 확장
- deployment build에서 전체 Chromium smoke 11개와 production security audit를 재실행
- 배포 성공 후 실제 Pages run과 live asset 검증이 통과해야 A5 완료

## 운영 원칙

- 기존 데이터나 기능을 근거 없이 삭제·축소하지 않는다.
- 수정 전 재현 가능성을 확인하고 수정과 함께 회귀 검증을 추가한다.
- AI·NVIDIA 결과는 candidate/평가 보고서로만 남기며 승인 없이 운영 DB를 바꾸지 않는다.
- 데이터 verifier, production build, 브라우저 E2E, 라이브 smoke를 서로 다른 증거로 구분한다.
- 완료된 단계는 즉시 최상위 Notion 대시보드와 `최근 수정 사항 (ChatGPT)`에 기록한다.
