---
name: system-delta
description: 현재 런타임 상태가 아니라 시스템 구조·재개 우선순위만 기록하는 deep reference
metadata:
  type: reference
---

# 시스템 델타 · 안정 기준

> 이 파일은 활성 PR·SHA·CI 수치·다음 작업 번호를 저장하지 않는다. 변동 상태는 항상 GitHub Derived State와 관련 Notion control record에서 다시 읽는다.

## 1. 진실의 우선순위
1. GitHub 최신 `main`, 열린 PR, exact head, diff, required CI/review
2. GitHub Pages 배포와 Live SHA
3. 관련 Notion control/status record
4. `docs/lexicon-workflow/TRACK_STATE.json` 같은 도메인 상태
5. `memory/RESUME.json` / `SESSION_STATE.md` checkpoint cache
6. 장기 기억과 과거 작업 로그

충돌하면 위 순서가 항상 우선한다.

## 2. 재개 규칙
- 기본 재개는 `AGENTS.md`의 FAST 규칙을 따른다.
- DEEP 재개가 필요해도 전체 대시보드나 과거 일일 로그를 먼저 읽지 않는다.
- 활성 작업은 GitHub에서 발견해야 하며, 이 파일의 과거 문구로 작업을 부활시키지 않는다.
- 이미 열린 PR이 있으면 같은 작업의 새 브랜치/PR을 만들지 않는다.

## 3. 배포·운영 구조
- 공개 완료 판정의 기준은 GitHub Pages + Live SHA다.
- Vercel은 공식 완료 Gate가 아니라 참고/보조 경로다.
- 대용량 정적 데이터는 `data-dist` 계열 배포 계약을 따르며 앱 셸과 분리한다.
- 사용자 화면에 보이는 변경은 자동 검증·배포가 성공해도 사용자 직접 확인 전 100%로 올리지 않는다.

## 4. 자동화 구조
- 일반 저위험 유지보수는 검증 후 자동 전달 가능한 Lane으로 운영한다.
- 원어 한글사전은 Evidence-First Autonomous v4 정책과 fail-closed Gate를 따른다.
- GitHub Derived State가 volatile runtime SSOT이며 `RESUME`/`TRACK_STATE`의 진행 문구가 실제 GitHub와 충돌하면 먼저 reconciliation한다.
- 자동화 실행의 `SUCCESS`는 곧 작업 수행을 뜻하지 않는다. actionable work가 없으면 `NOOP`로 구분한다.
- executor handoff는 동일 브랜치/PR과 fingerprint를 보존하고, 새 executor가 GitHub 상태를 다시 확인한 뒤 재개한다.

## 5. 프로젝트 구조
`<성경 마인드맵>`은 Bible Research OS로서 본문을 출발점으로 문맥·정경·원어·인물·장소·시대·개인 연구를 연결한다. 원어 한글사전, 디자인, 검색/NVIDIA, 성경 데이터는 전체 프로젝트 안의 독립 트랙이며 어느 한 트랙도 전체 우선순위를 암묵적으로 대체하지 않는다.

## 6. 이 파일의 업데이트 규칙
- 장기적으로 유지할 구조가 바뀔 때만 수정한다.
- 활성 PR, 현재 SHA, 오늘의 CI, 퍼센트, 일일 진행 내용은 기록하지 않는다.
- 일일 작업 이력은 Notion `하루 작업 브리핑`으로 보낸다.
