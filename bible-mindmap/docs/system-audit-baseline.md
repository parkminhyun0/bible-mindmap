# 성경 마인드맵 전체 시스템 감사 기준선

기준 브랜치: `main`  
감사 시작 기준 커밋: `2ae1b844756ab30d2506c58a6328c3115813c1a0`  
A6 잔여 위험 기준 커밋: `a4ff2dec1009f9979201e865de79e35655b05011`

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
| A5 | 보안·배포·라이브 | Secret 경계, dependency audit, production build, Pages smoke 통과 | 완료 · PR #90 · main `a4ff2dec` |
| A6 | 잔여 문제 정리 | P0/P1 0건, 낮은 위험 항목 문서화 | 완료 · PR #91 |

## 최초 확인 문제와 처리 상태

1. `src/components/NodeEditor.jsx`가 직접 사용하는 `@tiptap/react`, `@tiptap/starter-kit`의 manifest 누락 — **A0 수정 완료**.
2. `package-lock.json` 루트에만 있던 `gh-pages` 선언 불일치 — **A0 수정 완료**.
3. PR CI의 Tiptap 임시 설치 우회 — **A0 제거 완료**, 순수 `npm ci` 검증.
4. Playwright 명령은 존재하지만 기본 PR CI에서 실행되지 않음 — **A1 수정 완료**, Chromium smoke 연결.
5. browser smoke job의 lexicon 생성 누락 — **A1 수정 완료**, 테스트 서버와 실제 브라우저 검증 성공.
6. 성경 registry·curated·관찰카드·정경 usage 역방향 검증 공백 — **A2 수정 완료**, 66권·1,189장 교차 검증.
7. 사용자 매뉴얼의 초기 포커스·Tab 순환·Escape·모바일 스크롤 잠금·포커스 복귀 공백 — **A3 수정 완료**, 전체 Chromium smoke 11개 통과.
8. NVIDIA PoC가 4문서·4직접질의만 사용해 1.00 점수가 과도하게 쉬우며 오탐을 측정하지 않음 — **A4 코드·mock 수정 완료**, 실제 확장 bake-off 대기.
9. `npm ci` 결과 고위험 취약점 1건 — **A5 수정 완료**, production/full high·critical 0건.
10. GitHub Actions의 Node 20 action-runtime 경고 — **A5 수정 완료**, Node 24 기반 Actions로 교체.
11. 배포 workflow에 A0에서 제거한 Tiptap 임시 설치 우회가 잔존 — **A5 제거 완료**.
12. 라이브 검증이 version.json 커밋만 비교하고 HTML·JS·CSS 실체를 확인하지 않음 — **A5 보강 완료**.
13. 모바일 사용자 매뉴얼이 변형된 하단 시트 내부에서 viewport 경계를 초과함 — **A5 수정 완료**, `document.body` 포털과 최종 애니메이션 경계 검증 적용.
14. 최신 구현으로 대체된 오래된 관찰카드 PR #37이 열린 상태로 잔존 — **A6 종료 완료**, 대체 근거를 남기고 미병합 종료.
15. 낮은 위험 경고가 로그에만 존재해 개선·악화 시 추적되지 않음 — **A6 수정 완료**, 기계 판독 등록부와 CI 하드 게이트 추가.

## A5 보안·배포 감사 완료 근거

- PR에서 production(`--omit=dev`)과 full npm audit를 분리 실행하고 JSON artifact 보존
- production/full high·critical 0건 하드 게이트
- checkout v6·setup-node v6·upload-artifact v7·download-artifact v8·github-script v9로 Node 24 action runtime 정렬
- 배포 workflow의 Tiptap 런타임 보충 설치 삭제, 순수 lockfile과 dependency integrity 사용
- workflow security verifier로 오래된 Action 버전·`pull_request_target`·runtime lock repair·자동 NVIDIA 실행 차단
- Pages 검증을 commit 일치뿐 아니라 landing/app HTML·module JS·CSS 자산의 상태·콘텐츠 유형·크기로 확장
- deployment build에서 전체 Chromium smoke 11개와 production security audit 재실행
- Pages run `30839522394`의 build·deploy·live verification·최종 pipeline 상태 성공

## A6 잔여 문제 정리 완료 근거

- 열린 issue 0건·열린 PR 0건을 확인하고, 대체된 PR #37 종료 근거 보존
- 저장소의 P0/P1/TODO/FIXME 표식 부재 확인
- `docs/system-audit-residual-risks.json`을 기계 판독 원본으로 사용
- `docs/system-audit-residual-risks.md`에 P0/P1 0건과 P2/P3 후속 조건 설명
- `verify-system-audit-residual-risks.mjs`가 실제 registry·원어 marker 출력·명시적 성경 예외·NVIDIA 수동 실행 경계를 대조
- 등록 수치가 개선되거나 악화돼도 근거 문서와 함께 검토하지 않으면 CI 실패
- PR #91 최초 검증 run `30840607215`에서 security-audit·전체 build·A6 verifier·Chromium smoke 11개 성공
- A4 실제 NVIDIA endpoint bake-off는 P2 수동 검증 대기로 유지하며 운영 DB를 변경하지 않음

## 운영 원칙

- 기존 데이터나 기능을 근거 없이 삭제·축소하지 않는다.
- 수정 전 재현 가능성을 확인하고 수정과 함께 회귀 검증을 추가한다.
- AI·NVIDIA 결과는 candidate/평가 보고서로만 남기며 승인 없이 운영 DB를 바꾸지 않는다.
- 데이터 verifier, production build, 브라우저 E2E, 라이브 smoke를 서로 다른 증거로 구분한다.
- 완료된 단계는 즉시 최상위 Notion 대시보드와 `최근 수정 사항 (ChatGPT)`에 기록한다.
