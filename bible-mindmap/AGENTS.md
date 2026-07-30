# AGENTS.md — 성경 마인드맵 아키텍처 헌장

**모든 AI 에이전트(Claude·ChatGPT 등)는 이 저장소에서 작업하기 전에 이 파일을 반드시 읽고 준수합니다.** 관련 원칙 문서는 Notion 「🏗 시스템 아키텍처 / 📜 정책·규칙」에 동기화됩니다.

## ✝️ 신학 기준 (최우선 · 절대 준수) — 장로교 개혁주의

**이 프로젝트의 모든 신학적 콘텐츠는 오직 장로교 개혁주의(Reformed/Presbyterian) 신학에 근거한다.**

- **표준 문서**: 웨스트민스터 신앙고백서(WCF) · 대·소요리문답을 1차 기준으로 하고, 개혁주의 신앙고백(하이델베르크·벨직·도르트 신조)과 조화되게 작성한다.
- **해석 원칙**: 오직 성경(sola scriptura) · 언약신학 · 그리스도 중심 구속사적 해석 · 삼위일체와 그리스도의 완전한 신성·인성(니케아·칼케돈 정통) · 이신칭의 · 하나님의 주권과 예정.
- **엄격 배제(이단·사이비)**: 여호와의 증인(반삼위일체·예수=미가엘·신세계역·영혼수면), 몰몬교(경외 경전·신격화), 신천지·통일교·JMS·안상홍(어머니 하나님)·구원파 등 한국 이단, 그 밖의 반정통 주장을 **절대 반영하지 않는다**. 개혁주의와 구별되는 전통(로마 가톨릭 특유 교리·세대주의 날짜 계산·극단적 은사주의 등)도 이 앱의 기준 콘텐츠로 삼지 않는다.
- **톤**: 교파 논쟁을 부추기기보다 본문에 충실하되, 신학적 판단이 필요한 지점은 개혁주의 정통의 관점을 기본값으로 한다. 학계 논쟁이 있는 본문은 개혁주의 정통 범위 안에서 "관찰·제시"하고 이단적 대안은 소개조차 하지 않는다.
- **강제**: `scripts/verify-doctrinal-safety.mjs`가 이단·사이비 고유 signature를 predev/prebuild(CI)에서 자동 차단한다(정상 성경 용어는 오탐하지 않는 정밀 signature). 이 tripwire를 통과해도 신학 판단은 사람(개혁주의 관점) 검토와 병행한다. Notion 「✝️ 신학 기준」과 동기화.

## 📌 어떻게 강제되는가

- **자동 읽기**: `AGENTS.md`는 OpenAI Codex·Cursor·Aider·Claude Code 등 최신 코딩 에이전트가 세션 시작 시 저장소 루트에서 **자동으로 읽는 표준 파일**입니다. 별도 명령 불필요.
- **자동 차단(하드 게이트)**: 위 원칙을 어긴 커밋이 push되면 CI post-build 스텝 `scripts/guard-no-source-mutation.mjs`가 감지해 **배포를 자동 차단**합니다. 문서를 읽지 않은 에이전트도 실질적으로 라이브 반영 불가.
- **PR 체크리스트**: `.github/PULL_REQUEST_TEMPLATE.md`가 모든 PR에 원칙 체크리스트를 자동 표시합니다.

## 🧷 사용자용 세션 시작 스니펫 (수동 리마인더가 필요할 때)

일반 ChatGPT 웹처럼 저장소를 자동 읽지 못하는 환경이면 세션 시작 시 아래 한 문장을 붙여넣으세요:

```
이 저장소에서 작업하기 전에 반드시 bible-mindmap/AGENTS.md를 먼저 읽고,
'빌드타임 소스 변형 금지'와 릴리스 워크플로우(로컬→커밋→푸시→CI→verify:deploy→
Notion→대시보드 LIVE 마지막 갱신)를 준수해. 위반 시 CI post-build
guard-no-source-mutation.mjs가 배포를 자동 차단해.
```

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

## 🔁 릴리스 워크플로우 (모든 작업 완료 시 · 자동+수동 2계층)

**자동 계층 (CI가 강제 · 사람이 잊어도 동작)**: `main` push → `.github/workflows/deploy.yml`가
`build(+prebuild verifier·guard) → deploy → verify:deploy(8회 재시도) → pages-verify-deploy 커밋 상태 →
notion(🤖 CI 자동 배포 로그 갱신)` 순으로 자동 실행. Notion 자동 갱신은 `scripts/notion-live-update.mjs`가
`secrets.NOTION_API_TOKEN` 있을 때만 동작(없으면 skip, 배포는 계속). 갱신 대상은 대시보드 **🤖 CI 자동 배포 로그**
콜아웃뿐 — 사람이 큐레이팅하는 🔴 LIVE 콜아웃은 자동으로 덮어쓰지 않음.

**수동 계층 (에이전트가 매 작업 마지막에 수행)**:
1. **로컬 검증**: `npm run build` (predev/prebuild verifier 전부 통과 + guard 통과). 로마서 gold standard(pivots 12·arcs 8·chapterAgenda 16) 불변.
2. **커밋** — 원자 단위. 워크스페이스 홈 파일은 커밋 대상 아님.
3. **푸시** `git push origin main` → 위 자동 계층 트리거.
4. **배포 검증**: `gh run watch <id> --exit-status` 성공 확인 후 `npm run verify:deploy`로 라이브 commit == 로컬 HEAD. (`npm run deploy` gh-pages 방식은 무의미.)
5. **Notion 수동 업데이트**: 관련 설계 페이지 + 당일 수정 기록 페이지에 구현/검증/배포 기록.
6. **★ 최상위 대시보드 🔴 LIVE 콜아웃 갱신** (반드시 마지막 · 사람 큐레이팅 내러티브). 필요 시 🗺️ 기능 구조도·📂 파일 구조 코드 블록도 함께.

> CI에 Notion 자동 갱신을 활성화하려면: GitHub repo Settings → Secrets에 `NOTION_API_TOKEN`(Notion integration 토큰), 필요 시 Variables에 `NOTION_CI_LOG_BLOCK`(기본값은 스크립트 내장) 등록.

## 📱 모바일 안전 규칙 (필수 · 위반 시 CI 차단) — Notion 「📱 모바일 안전 규칙」과 동기화

1. **모달 언마운트 금지**: `App.jsx`는 `(!isMobile || mobileSidebarOpen) && <Sidebar/>`로 시트 열림 시에만 Sidebar를 마운트. **Sidebar 내부 모달(문맥 성경·병렬 연구)을 여는 버튼은 절대 `onMobileClose`로 시트를 닫지 말 것** — 시트를 닫으면 Sidebar 전체가 언마운트되어 모달이 열리자마자 사라진다(모바일 튕김 크래시). 모달은 시트를 열어둔 채 그 위에 겹쳐 띄운다.
2. **zIndex 계층**: 모바일 시트 `zIndex=1201`. portal로 body에 탈출하는 모달(`ParallelStudyModal`)은 루트 오버레이 `zIndex ≥ 1250`. 인라인 모달(`ContextBibleModal`)은 시트 내부 stacking 최상위.
3. **스크롤 방어**: 모바일 스크롤 컨테이너는 `overflowY:auto + overscrollBehavior:contain + WebkitOverflowScrolling:touch + touchAction:pan-y`. 큰 보조 UI(스캐폴딩 등)는 모바일 기본 접힘 + `maxHeight(45vh)` + 내부 스크롤 (뷰포트 초과로 본문 `flex:1` 크러시 방지).

> 강제: `scripts/verify-mobile-safety.mjs`가 predev/prebuild(CI)에서 위 규칙을 자동 검사. 위반 시 빌드 실패로 배포 차단.

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
