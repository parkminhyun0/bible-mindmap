# P1-2 후속 — 남은 모달 공통 계약 확장

## 기준선

- 기준 브랜치: `main`
- 기준 병합: PR #65 (`b6c867b081c9372d65426bc2afa4a4f9928bd388`)
- 완료된 대표 적용: 문맥 성경, 병렬 본문 연구

## 목적

정경 추적, 본문 흐름, 구문 분석, 사용자 매뉴얼 등 남은 dialog를 `useModalDialog` 기반의 동일한 접근성·레이어 계약으로 점진 이관한다.

## 1차 구현 묶음

### 대상

1. `CanonicalConceptModal`
2. `ManualModal`

### 공통 계약

- dialog가 열릴 때 내부로 초기 포커스 이동
- Tab / Shift+Tab 포커스 순환
- 최상위 dialog만 Escape 처리
- 닫은 뒤 실행 버튼으로 포커스 복귀
- 모바일 body/html 스크롤 잠금과 중첩 안전 복원
- `role="dialog"`, `aria-modal="true"`, 접근 가능한 이름, `tabIndex={-1}`
- 실행 버튼의 `aria-haspopup="dialog"`, `aria-expanded`
- 모달 portal 레이어는 기존 `--at-layer-modal-portal` 계약 유지

## 보존 계약

- 정경 추적의 4탭, 개념 탐색, 용례 지도, 원문 분석, 구절 미리보기 유지
- 자식 팝업이 열린 상태에서는 Escape가 가장 위 자식부터 닫히도록 유지
- 사용자 매뉴얼의 섹션 탐색, 스크롤 위치, 빌드 정보 표시 유지
- 드래그, 리사이즈, 최소화, 최대화, 모바일 시트 동작 유지
- 성경·원어·정경 데이터와 저장 스키마 변경 금지

## 구현 주의

`CanonicalConceptModal`은 LexiconPopup 및 VersePreviewPopup을 중첩으로 열 수 있으므로 부모 모달의 Escape 처리와 공통 훅의 최상위 스택 계약이 충돌하지 않도록 한다. 필요하면 `useModalDialog`에 사용자 정의 Escape 핸들러를 추가하되 문맥 성경과 병렬 연구의 기존 회귀를 보존한다.

## 검증

- Desktop 정경 추적: 초기 포커스, Tab 순환, 자식 팝업 우선 Escape, 부모 닫기 및 포커스 복귀
- Mobile 정경 추적: 배경 스크롤 잠금, 하단 시트, 자식 팝업 중첩
- Desktop/Mobile 사용자 매뉴얼: 초기 포커스, Escape, 포커스 복귀, 긴 콘텐츠 스크롤
- Dark theme, reduced motion
- `npm run test:p1:modal`
- `npm run test:p0`
- `npm run build`

## 후속 묶음

- 본문 흐름
- 구문 분석
- Arc 및 기타 연구 dialog
- 실제 iOS Safari / Android Chrome 시각 QA
