---
name: bible-notion-map
description: 성경 마인드맵 Notion 페이지·블록 id 맵 — 대시보드 LIVE 현황 블록 포함 (릴리스 자동화용)
metadata:
  type: reference
---

성경 마인드맵 Notion 구조 및 자동화가 갱신하는 블록 id. 관련: [[bible-release-workflow]]

**페이지 id**
- 최상위 대시보드: `3a10b963-e600-801e-9ba8-f449df24685b`
- 시스템 아키텍처: `3a80b963-e600-81a7-a360-fbf8313c2fe2`
- 정책·규칙: `3a80b963-e600-8144-9d5c-eb8bb074d213`
- 비평장치: `3a80b963-e600-814e-8f62-ecb847463b76`
- 책별 등록 현황: `3a80b963-e600-81af-a3ae-df5483e517b4`
- UX·모바일 개선 이력: `3a80b963-e600-8198-96c0-fdf79a6527d7`
- 워크플로우·실전 가이드: `3a80b963-e600-8108-9e67-ff629afe7f0d`
- 세션 재개 프로토콜: `3a80b963-e600-8151-9e61-d342ae253e40`
- 문맥 성경: `3a60b963-e600-801a-9c2b-e612d12d9d2b`
- 심화 기능 로드맵: `3ac0b963-e600-812e-90d7-c48b88782e52`
- 당일 수정 기록(2026-07-29): `3ab0b963-e600-8162-8609-e6ea0c43140d`
- ✝️ 신학 검증 프로토콜(장로교 개혁주의): `3ad0b963-e600-818c-aae4-fff59e649b3e` — 표준문서·해석원칙·이단 signature 체크리스트·3중 검증흐름·자체점검 체크리스트. 대시보드 top 신학 callout(`3ad0b963-e600-8116-...`)이 page mention으로 링크. 코드 가드 `verify-doctrinal-safety.mjs` + `bible-mindmap/AGENTS.md 「신학 기준」`과 3중 동기화. 새 콘텐츠·GPT 브리프 작성 시 이 페이지 기준.

**자동화 갱신 대상 블록 (대시보드)**
- 🚨 **에이전트 헌장 콜아웃 (최상단)**: `3ac0b963-e600-81a6-a4d0-df7f1d07aa32` — 안티패턴 금지·릴리스 규칙 요약. 세션 시작 에이전트가 대시보드 최상단에서 자동으로 봄.
- 🔴 **LIVE 현황 콜아웃 (활성 · 2026-07-30 갱신)**: `6eeb39f4-dc34-4ea8-9af6-357c11e6813a` (구 id `3ad0b963-e600-812b-8318-f392a1d1d951`는 archived됨)
  - 매 릴리스 마지막에 **수동** rich_text 갱신: `라이브 커밋 <sha> · 배포 <상태> · 최근 완료 · 다음`.
  - PATCH `v1/blocks/<id>` 로 `callout.rich_text` 교체. **주의**: `ntn` CLI는 PATCH children의 `after` 미지원 → 새 블록 삽입/이동은 `curl`(Notion-Version 2022-06-28) 사용.
- 🤖 **CI 자동 배포 로그 콜아웃 (CI가 자동 갱신 · 수동 편집 X)**: `3ac0b963-e600-81da-85b4-ea15fee06408`
  - `scripts/notion-live-update.mjs`가 매 배포 성공 시 SHA·시각·run URL **+ 최신 커밋 subject + 최근 5커밋 이력**을 자동 기록(2026-07-30 확장). 자비스·GPT가 대시보드만 보고 "무엇이 최신인지" 즉시 파악용. git log 사용 → notion job checkout에 `fetch-depth: 0` 필수. 기본 대상 id가 이 값(env `NOTION_CI_LOG_BLOCK`로 오버라이드 가능).
- 📊 **진행률 대시보드**: heading `3ad0b963-e600-81d4-a0e5-f87d8f092bd7` · 3열 그리드 column_list `3ad0b963-e600-8105-8bcf-f5e45170c04b` · 영역별 %바 code `3ad0b963-e600-811c-8935-c59539810110`. 진행 상황 변동 시 그리드 콜아웃 + %바 갱신.
- 📱 **모바일 안전 규칙 콜아웃**: `3ac0b963-e600-812d-b3a1-f39e07b0622a` (고정 선언).
- 🗺️ **기능 구조도 코드 블록**: `3ac0b963-e600-810c-9621-dbd52e5fd1dc`
  - **기능이 추가/변경되면 반드시 갱신**(기능→핵심 파일 트리). 코드블록 PATCH `v1/blocks/<id>` `code.rich_text`.
- 📂 **로컬 파일 구조 코드 블록**: `d6175a71-64a2-4b80-8b19-d4cb5f31f7c6`
  - 파일/디렉토리 구조 변경 시 갱신.
- **주의**: 코드 블록 rich_text 단일 text는 ≤2000자 → 초과 시 여러 text 조각으로 분할해 PATCH.

**🔁 GPT↔자비스 작업 파이프라인 DB (2026-07-30 신설)**
- database id: `399f5e95-384f-40a0-965e-023baec84e68` · **data_source id(폴링/쿼리용)**: `10571568-8e98-4432-bba9-0410c2e6e553` · 대시보드(`3a10b963…685b`) 하위 inline DB.
- 속성: `Name`(title) · `상태`(select: 1·대기(GPT픽업)/2·진행중(GPT)/3·완료(GPT)→자비스/4·검증·배포(자비스)/5·승인대기(사용자)/6·승인완료/반려·재작업) · `유형`(select).
- 각 카드 본문: 「작업 지시」(자비스 작성) + 「GPT 결과」(GPT 기록). 사용법 행 고정.
- **트리거 = 수동(A안 · 노션 DB 유지 · cron 폴링 없음)**: 사용자 "완료됨" 신호 → 자비스가 완료 카드 조회 → 검증·배포 → 상태 5 PATCH + 승인 요청.
- **★ 승인 자동 트리거(2026-07-30 추가)**: 사용자 "승인" 한 번으로 자비스가 아래 전부 자동 실행 — (1)커밋·푸시·CI배포 (2)상태 6·PR 닫기 (3)**노션 대시보드 갱신**(LIVE `6eeb39f4…` + %바 `3ad0b963…811c` + 타임라인 `3ad0b963…9454`) (4)다음 배치 카드 자동 큐잉. 사용자 신호 수 2회→1회.
- **⚠️ 조회/쓰기는 curl 사용(ntn CLI는 PATCH/query에서 hang). Notion-Version 2022-06-28에선 `POST /v1/databases/399f5e95-384f-40a0-965e-023baec84e68/query`(data_sources 아님!). 블록 PATCH도 curl `--max-time`.** 완료 필터: `{"filter":{"property":"상태","select":{"equals":"3·완료(GPT)→자비스"}}}`.
- Notion 새 DB 생성 시: create는 title만 생김 → select 속성은 `PATCH v1/data_sources/<id>`로 추가. 페이지 parent는 `data_source_id`.

**Notion 쓰기 팁**
- 블록 append: `ntn api v1/blocks/<parent>/children -X PATCH` + stdin JSON (`--data @file`는 hang 사례 있음, stdin 사용).
- 특정 위치 삽입: body에 `position: {type:"after_block", after_block:{id:"..."}}` (`after` 평면 키는 400).
- 표 셀 수정: `table_row.cells` 전체(모든 열) 제공해 PATCH.
