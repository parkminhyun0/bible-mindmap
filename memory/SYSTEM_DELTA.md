---
name: system-delta
description: ⚡ 과거 기억보다 먼저 확인하는 최신 시스템 변화·운영 구조·재개 기준
metadata:
  type: reference
---

# ⚡ 최신 시스템 델타 · 자비스 빠른 동기화

> 장기 기억 요약이 아니라, 새 세션에서 **현재 시스템이 과거 기억과 무엇이 달라졌는지** 빠르게 판정하는 변화량 지도다. 이 파일 안의 수치도 기준선일 뿐이며 실제 GitHub·CI·배포·Notion 조회가 항상 우선한다.

## 1. 진실의 우선순위
1. 현재 작업 디렉터리 `git status`와 로컬 미커밋 변경
2. GitHub 최신 `main`, 열린 PR, CI, Pages Live SHA
3. Notion 통합 대시보드·운영 관제·개발 작업·QA·최근 수정 사항
4. `memory/SESSION_STATE.md`
5. 이 파일과 장기 기억 파일

기억과 실제 상태가 다르면 실제 GitHub·CI·배포·Notion 상태를 우선한다.

## 2. 새 세션 필수 동기화
```bash
git status --short --branch
git fetch origin main --prune
git log --oneline origin/main -10
gh pr list --repo parkminhyun0/bible-mindmap --state open --limit 20
gh run list --repo parkminhyun0/bible-mindmap --limit 15
```

그다음 아래 Notion 페이지를 실제로 읽는다.
- 통합 대시보드: `3a10b963-e600-801e-9ba8-f449df24685b`
- Bible Research OS 방향 기준서: `3b20b963-e600-81eb-9f2d-dcc8fb35a3fd`
- 자동화 운영 현황: `3b20b963-e600-8159-9a16-d52da9c55c5f`
- 운영 관제 센터: `3b20b963-e600-81ca-9109-e88b14d13258`
- 기능·연구 센터: `3b20b963-e600-8114-8287-fab70d3b5773`
- QA·검증 센터: `3b20b963-e600-81ca-b5a6-fca7cff20096`
- 최근 수정 사항: `3ab0b963-e600-81df-92af-e2ce186f7239`
- GPT↔자비스 파이프라인 DB: `8c70b963-e600-8234-b736-01b7899554f1`

## 3. 시스템 구조 기준선 · 2026-08-05
- 방향: **Bible Research OS** — 구절 참조 → 문맥 성경 → 정경 추적 → 원어 연구 → 개인 연구 저장의 왕복 흐름.
- 공식 배포: **GitHub Pages → Cloudflare Worker → NVIDIA Build API**. Vercel은 공식 완료 판정에서 제외한다.
- 자동화: 일반 `chatgpt/*` PR은 전체 Actions·리뷰·충돌 게이트 통과 후 병합한다. 워크플로·Worker·API·Secret·성경/정경 데이터·스키마·lockfile은 승인 게이트를 유지한다.
- Notion: 통합 대시보드, 운영 관제 센터, 기능·연구 센터, QA 센터, 개발 작업 DB, 기능 포트폴리오, 릴리스·통합·회귀·사용자 확인 기록으로 분리 운영한다.
- 완료 게이트: 구현·병합·Pages·Live SHA 성공은 최대 95%. 박 목사님의 실제 화면 확인 후 100%.
- 문맥 성경: CI 기준 66/66권 curated, coarse 0, fallback 0, Arc 관계 1,262개.
- 정경 추적: 72개 개념, 415 arc 단계, 513용례, 누락·고아 0.
- 원어 연구: P2.1 왕복 연구와 P2.2 형태론 한국어 해설 엔진·UI 통합. 사용자 화면 확인 전 95% 유지.
- 검색: 정경 검색 → 자동완성·NVIDIA 비교 → 결과 선택 → 정경 상세 → 검색 복귀 흐름 연결.
- 교차 참조: 상단 편집창 칩을 단일 열기·닫기 진입점으로 사용.
- 모바일: 문맥 성경 상단 공백·학습 바 잘림·iOS 문서 스크롤·책 칩 가로 스크롤·장 이동 후 외부 스크롤 문제를 연속 보정.
- 자비스 최신화: PR #170에서 `MEMORY.md` → `SESSION_STATE.md` → `SYSTEM_DELTA.md` 2단계 재개 구조 도입.

## 4. 현재 알려진 작업·차단 기준선
- PR #169: 히브리서 1–13장 관찰 카드. A6 감사 집계 불일치 수정이 다음 작업이다.
  - 등록 `chapterCardCount=1154` / 실제 `1153`
  - 등록 `chapterCardMarkerChecked=2448` / 실제 `2445`
- PR #168: 데살로니가후서는 PR #162로 이미 병합되어 중복 정리 대상.
- PR #156: 3분할 문맥 성경 Preview Draft. 사용자 구조 승인 전 운영 병합 금지.
- PR #119: 오래된 부팅 fallback PR. 최신 main과 중복·충돌 재검토 전 병합 금지.
- TASK-26: 정경 추적 2차 확장. 후보 생성 → 검증 → 사람 검토 → 진행 → 커밋 → 배포 → Notion → 대시보드. 한 번에 최대 6개.

> 위 항목은 재개 기준선이다. 새 세션에서는 열린 PR과 CI를 다시 조회해 이미 해결됐거나 새로 생긴 변경을 먼저 반영한다.

## 5. 다른 작업을 즉시 시작하기 전 7줄 판정
1. 최신 main SHA와 마지막 변경
2. 로컬 미커밋 여부
3. 열린 PR과 차단 원인
4. CI·Pages·Live SHA 상태
5. 최근 Notion 구조·정책 변화
6. 요청 작업과 충돌하는 활성 작업
7. 지금 바로 실행할 첫 단계

사용자가 이미 새 작업을 지시했다면 이 보고 뒤 추가 확인 질문 없이 안전한 첫 단계부터 실행한다.

## 6. 업데이트 규칙
- `SESSION_STATE.md`: 현재 작업 하나와 즉시 다음 행동만, 2KB 이내.
- `SYSTEM_DELTA.md`: 최근 시스템 변화와 운영 기준만, 오래된 이력은 제거.
- `MEMORY.md`: 장기 원칙과 포인터만. 숫자·SHA·활성 PR을 장기간 고정하지 않는다.
- 완료 보고 직전, main 병합 후, 배포 판정 후, Notion 구조 변경 후 두 파일을 갱신한다.
