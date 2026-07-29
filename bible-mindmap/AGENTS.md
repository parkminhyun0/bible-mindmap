# AGENTS.md — 성경 마인드맵 아키텍처 헌장

**모든 AI 에이전트(Claude·ChatGPT 등)는 이 저장소에서 작업하기 전에 이 파일을 반드시 읽고 준수합니다.** 관련 원칙 문서는 Notion 「🏗 시스템 아키텍처 / 📜 정책·규칙」에 동기화됩니다.

## 🚫 금지 안티패턴 (반복 사고 방지)

### 1. 빌드타임 소스 변형 금지
`predev`/`prebuild` 또는 빌드 체인의 어떤 스크립트도 **tracked 소스**(`src/`, `index.html`, `package.json`, `vite.config.js`)를 **in-place로 편집하지 않습니다.**

- **금지**: `ensure-*` / `patch-*` / `apply-*` 등이 컴포넌트 소스에 `fs.writeFileSync` 하는 방식.
- **재발 방지**: `scripts/guard-no-source-mutation.mjs`가 CI post-build 스텝에서 tracked 소스 변형을 감지하면 배포를 차단합니다.
- **정당한 편집이 필요하면**: 소스를 직접 편집해 커밋하고, 관련 patch 스크립트는 제거합니다.
- **과거 사고**: `ensure-mobile-syntax-scroll` ↔ `ensure-mobile-syntax-unified-scroll` 순차 변형이 anchor mismatch로 재실행 시 throw · `ensure-place-device-parity` anchor 인덴트 오류로 로컬 빌드 완전 실패.

### 2. Vite alias로 데이터 소스 은닉 금지
소스 파일이 실제 의존성을 숨긴 채 vite alias 문자열 정확일치로만 다른 모듈을 주입하는 방식은 취약합니다. **소스에서 실제 경로를 직접 import** 합니다. (`ContextBibleModal`이 `../data/contextRegistry`를 직접 import하는 이유)

### 3. 죽은 스크립트·중복 조합 로직 금지
어디서도 참조되지 않는 스크립트, 또는 이미 다른 모듈이 하는 일을 중복하는 조합 로직은 즉시 제거합니다.

## ✅ 권장 패턴

- **predev / prebuild = 읽기전용 verifier만** (`verify-expanded-contexts`·`verify-context-arc-system`·`audit-context-v2`).
- **데이터 생성물**은 `public/data/*` 또는 `dist/*`에 쓰기(빌드 아티팩트). tracked 소스는 결코 변형하지 않음.
- **UI/설계 변경은 소스 파일을 직접 편집**하고 원자 커밋. patch 스크립트로 우회하지 않음.

## 🔁 릴리스 워크플로우 (모든 작업 완료 시)

1. **로컬 검증**: `npm run build` (predev/prebuild verifier 통과 + guard 통과). 로마서 gold standard(pivots 12·arcs 8·chapterAgenda 16) 불변.
2. **커밋** — 원자 단위. 워크스페이스 홈 파일은 커밋 대상 아님.
3. **푸시** `git push origin main`.
4. **배포 검증**: 배포 = `.github/workflows/deploy.yml` (Pages `build_type=workflow`). `gh run watch <id> --exit-status` 성공 확인 후 `npm run verify:deploy`로 라이브 commit == 로컬 HEAD.
   - `npm run deploy`(gh-pages 브랜치 푸시)는 이 설정에서 **무의미**.
5. **Notion 업데이트**: 관련 설계 페이지(아키텍처 등) + 당일 수정 기록 페이지에 구현/검증/배포 구분 기록.
6. **★ 최상위 대시보드 LIVE 갱신** (반드시 마지막): 대시보드의 🔴 LIVE 콜아웃 + 🗺️ 기능 구조도 + 📂 로컬 파일 구조 코드 블록을 필요 시 함께 갱신.

## 🧭 데이터 소스 단일화

- 66권 지식: `src/data/contextRegistry.js` (단일 SoT). `ContextBibleModal`이 직접 import.
- 원어 신호어: `HEBREW_NARRATIVE_RULES`(OT) · `GNT_DISCOURSE_RULES`(NT) — 66권 전권 적용.
- 지명 색인: `curated(BIBLICAL_PLACE_PROFILES)` + `자동 색인(biblical-places-db.json, OpenBible CC-BY)` — `placesIndex.js`에서 병합. curated 우선, 동명이소 유지.
- 관주: `crossrefApi.hasCrossRef` 인덱스로 참조 있는 절에만 🔗 노출.

## 🔍 배포 반영 확인 장치

- 앱 [사용법] 타이틀바 `build <sha>` 배지 → 방문할 때마다 현재 빌드 육안 확인.
- `dist/version.json` (commit·빌드시각·캐시세대) — 라이브 상태 판독 엔드포인트.
- `npm run verify:deploy` — 라이브 commit ↔ 로컬 HEAD 대조. 일치=최신 반영, 불일치=exit 1.

## 📱 다양한 디바이스

- `hooks/useMobile` = `useDeviceProfile` (pointer/coarse/hover 힌트·iPad·maxTouchPoints 기반 desktop/tablet/mobile 분류). 태블릿은 mobile 레이아웃 폴백.
- `document.dataset.{device,layout,orientation}` 태깅으로 CSS 커스터마이즈.
- 모바일 사이드바에 인물·장소·시대 3탭 그리드 (`BACKGROUND_DEVICE_PARITY_V2`) · `touchAction:manipulation` · minHeight 44 접근성.

---

**변경 시 관련 Notion 페이지도 함께 갱신하세요** (자동화 규칙 · 대시보드는 매 릴리스 마지막에 필수).
