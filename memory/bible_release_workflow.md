---
name: bible-release-workflow
description: 성경 마인드맵 작업 완료 시 표준 릴리스 절차 — 로컬→커밋→푸시→배포→노션, 마지막에 최상위 대시보드 LIVE 현황 갱신
metadata:
  type: feedback
---

성경 마인드맵(bible-mindmap) 프로젝트에서 **모든 작업(기능 추가·수정·리팩터 등)이 끝나면** 아래 순서를 표준으로 실행한다.

**Why:** 사용자가 대시보드에서 "지금 어디까지 진행됐는지"를 실시간으로 확인하려 함. 배포가 워크플로우 실패로 조용히 누락됐던 사고 이후, 반영 검증과 대시보드 동기화를 릴리스의 필수 단계로 고정.

**How to apply (순서 고정):**
1. **로컬 적용 + 검증**: 편집 → `npm run build` (predev/prebuild verifier 통과) → 필요 시 로컬 dev 확인. 로마서 gold standard 불변 확인.
2. **커밋**: 논리 단위로 원자 커밋. 워크스페이스 홈 파일은 커밋 대상 아님.
3. **푸시**: `git push origin main` (사용자 승인 정책 준수 — 이 자동화는 명시 승인으로 간주).
4. **배포 검증**: 배포는 GitHub Actions `deploy.yml`(Pages build_type=workflow)가 담당. `gh run watch <id> --exit-status`로 CI 성공 확인 후 `npm run verify:deploy`로 라이브 commit==HEAD 대조. ([[bible-deploy-mechanism]] 참조: `npm run deploy`의 gh-pages 브랜치 푸시는 무의미)
5. **노션 업데이트**: 관련 설계 페이지(아키텍처 등) + 당일 수정 기록(`3ab0b963-e600-8162-8609-e6ea0c43140d`)에 구현/검증/배포 구분 기록.
6. **★ 마지막 단계 — 최상위 대시보드 갱신**: 대시보드(`3a10b963-e600-801e-9ba8-f449df24685b`)에서
   - **🔴 LIVE 현황 콜아웃** 갱신 — 라이브 커밋 SHA, 배포 상태(✓/진행중), 진행 지표, "지금 진행 중/다음" 한 줄.
   - **기능이 추가/변경됐다면 🗺️ 기능 구조도 + 📂 로컬 파일 구조 코드 블록도 같은 형식으로 갱신** (신규 기능은 반드시 구조도에 반영). 블록 id·주의사항은 [[bible-notion-map]].

**핵심 규칙:** 6번(대시보드 LIVE 갱신)은 반드시 **가장 마지막**에. 구현/검증/배포가 실제로 끝난 사실만 반영(추정 금지). 관련: [[bible-deploy-mechanism]] [[bible-notion-map]]

## 데이터 릴리스 절차 (A안 · 대용량 데이터 변경 시) · 확정 2026-08-07
코드가 아니라 **대용량 정적 데이터(lex·strongs·variants·places DB 등)를 바꿀 때**는 위 앱 릴리스와 별개로 아래를 따른다. 배경·구조는 [[bible-deploy-mechanism]] "데이터 전달 표준 = A안".
1. **데이터 갱신 후 새 버전 tag 발행**: 기존 `data-v1`을 덮지 말고 `data-v2`처럼 **새 불변 tag**로 발행(jsDelivr 영구 캐싱 특성상 tag 재사용 금지 — 스테일 방지).
2. **빌드 env 갱신**: `VITE_DATA_BASE_URL`을 새 tag로 지정해 앱 재빌드·배포. 필요 시 `VITE_DATA_BASE_URL_MIRROR`도 동일 tag로.
3. **미러 확인**: 1차(jsDelivr) 외 Statically·GitHub raw가 새 tag를 서빙하는지 확인(폴백 유효성). 미러는 자동 유도되므로 tag만 맞으면 됨.
4. **라이브 검증**: 앱에서 데이터 로딩 정상 + 1차 차단 상황 폴백 동작 확인. 이후 대시보드 LIVE 갱신(6번).

**핵심:** 데이터는 tag로 버전 관리, 앱은 env로 tag를 가리킨다. tag 재사용 금지, 폴백은 항상 다른 CDN 미러(동일출처 폴백은 최종 안전망일 뿐 Pages 재적재 금지 — 59MB 문제 재발).
