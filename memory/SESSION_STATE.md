---
name: session-state
description: 🔄 현재 진행 중 · 새 세션 재개용 · 반드시 최우선 로드 (< 300 토큰) · 항상 최신 상태 유지
metadata:
  type: reference
---

# 🔄 세션 재개 파일 · 최신 상태만 저장

> **새 세션이면**: 이 파일부터 읽고 → 아래 「즉시 다음 스텝」 실행 → 필요 시에만 다른 파일 참조.

---

## 📅 마지막 업데이트 (세션 6 · 2026-08-01)
- **LIVE**: `66cc6f5` — 소예언서 관찰카드 67장 배포됨(배치5d · PR #50 통합).
- **★★ 마일스톤**: 구약 39권 관찰카드 전권 완성(오경5·역사12·시가5·대예언5·소예언12).
- **★ 워크플로우 v2 확립 (2026-08-01)**: 페이지 분리 대신 **단일 큐 DB + 다중 뷰 + 공통 기준 1곳** 채택. 이유: 심화 영역 계속 추가 시 페이지/DB 분리는 큐 선택 모호성·기준 드리프트·git 직렬통합 문제를 못 풀고 관리비만 늘림. "물리적으로 나누지 말고 필터로 나눠라. 큐·기준은 항상 하나."
  - DB에 속성 추가: **영역**(콘텐츠·성경데이터/기능-정경추적/기능-원어용례/기능-기타심화/코드·UI/인프라·자동화/문서·검수) + **우선순위**(P0/P1/P2). 유형(DB·데이터생성/코드·기능/문서·검수)=명령문 템플릿 결정자.
  - 프로토콜 카드 전면 재작성 → **「📌 공통 기준·워크플로우 v2」** (id `3ad0b963-e600-81c9-bf13-e5bd220c2fa3`): 상태흐름·역할분담·큐운영원칙·유형별 명령문 템플릿 3종(A데이터/B코드UI/C문서)·신학기준·자비스 완료 사이클 9단계 체크리스트·권장 뷰 4종.
  - 대시보드 **🎯 현재 작업 큐 단일 포인터** callout 신설 (id `3ae0b963-e600-817c-ab71-e8e4c09c55e3`) — LIVE 콜아웃 바로 아래. 자비스가 매 사이클 갱신. GPT는 이 포인터 카드 1개만 집음.
  - **수동 1회 필요**: 노션 UI에서 뷰 4종 생성(🎯다음작업/🔧처리대기/📋영역별보드/✅완료로그). API가 뷰 생성 미지원.
- **⏸ 관찰카드 일시중단**: 구약 39권 완성(66cc6f5) 후 잠시 멈춤. 재개 지점 = **배치6 신약 27권**(신규 카드 생성부터). 대시보드 🎯 포인터에 명시.
- **✅ 정경추적 진행 (2026-08-01 세션7)**: 파일럿 6 + **Tier1 6(kingdom·exodus·priest·lamb·king·shepherd) LIVE** `a292bb8`. canonicalConceptsT1.js(GPT A방식 전달)→canonicalConcepts.js에 import+spread. 개념 12/12·arc 77·verifier·신학·빌드·verify:deploy 통과. 대시보드 정경추적 섹션 12/12 갱신. **다음 = Tier2**(뱀·산·신부·땅·빛·생수 등 후보).
- **✅ 정경추적 탐색 UX + 스키마 자동화 (2026-08-01 세션7, LIVE `105ffe5`+`78c5fc0`)**: 개념 수 확장 대비. 스키마에 **category(6테마 enum: redemption/kingship/presence/creation/revelation/conflict)+emoji** 추가, `CONCEPT_CATEGORIES` export. 모달=검색창+테마별 인덱스그리드(이모지카드)+브라우즈↔상세 2단, 심화=정경 타임라인(언약시대별 개념 교차색인). Playwright 라이브 검증 완료(canon-index/timeline). 기존 12개 백필.
  - **★ 스키마 3중 자동화 완료**: ① verifier(predev/prebuild 하드게이트, 누락 시 빌드실패·반려) ② PIPELINE_GUIDE.md 「정경추적 개념 카드 스키마」 섹션(GPT 픽업 시 참조) ③ Notion 📌공통기준v2 카드 스키마 콜아웃. → 잘못된 형식 배포 원천차단 + GPT 사전 규격 인지. creation/revelation/conflict 카테고리는 빈 상태→Tier2가 채움.
- **▶ 동시 진행 Track B (대기)**: **[관찰카드] 배치6a 신약 마가 16장** — 1·대기(GPT픽업). Notion 카드 생성됨. 신약 첫 배치·헬라어 마커(lex/gnt 대조). "픽업 관찰카드"로 착수. NT 0/260, 이후 6b마태·6c누가·6d요한·6e행전.
- **파이프라인 지침 v2.1 (2026-08-01)**: GPT측 git/gh/push/PR/fetch 전면 금지 → 파일 텍스트 A방식 전달만. PIPELINE_GUIDE.md + Notion 📌공통기준v2 카드 갱신. gh 중단 이슈 근본 해결.
- **★ 관찰카드 실제 현황(검증됨)**: 구약 39권 929/929 100% 완성(시편 권4·5는 Ps3.js 팩토리라 regex 미검출 주의). 대선지 183/183·소선지 67/67 LIVE. 대시보드 낡은 수치(63%/752) → 78%/929로 정정 완료.
- **(구) 정경추적 파일럿 카드**: Notion `3ae0b963-e600-8198-bb2b-fd72eaa96a18` (6·승인완료). Tier1 카드 `3af0b963-e600-811d-b154-f5777978dd06`(6·승인완료).
  - 산출물: `src/data/canonicalConcepts.js` · export `CANONICAL_CONCEPTS` · 개념 6(seed/temple/covenant/blood/rest/glory)
  - 스키마 확정(카드에 명문): labelKo/He/Gr · strong{he,gr} · canonicalArc[5~7]{stage,ref,summary,covenantLink,connectionType} · theologicalNote · reformedAnchors
  - covenantLink enum(adamic/noahic/abrahamic/mosaic/davidic/new/none) · connectionType A~E(근거강도)
  - **자비스 후속 TODO(GPT PR 오면)**: ① `scripts/verify-canonical-concepts.mjs` 신규(스키마·ref유효·enum·strong형식) ② doctrinal 재사용 ③ `CanonicalConceptModal.jsx` 4탭 UI(정경흐름/용례지도/원문분석/신학해설, LexiconPopup 재활용) ④ 핵심어 칩 진입점 연동 ⑤ 통합·배포·노션.

## 📅 이전 세션 (세션 5 · 2026-07-30)
- ~~미푸시 ESV→WEB `b3cc672`~~ — origin 로그에 없음. 세션5 SESSION_STATE만의 표기였을 가능성, 재확인 필요 시 별도 처리.
- **세션5-A (창세기 장별 심화)**: GPT PR #29 통합 · 본문정합성 verifier 신규 · 오경 3/5 — `bf3ad3d`
- **세션5-B (신학 가드)**: `verify-doctrinal-safety.mjs`(이단 signature 57종) + AGENTS.md 「✝️ 신학 기준」 + Notion 전용 검증 페이지 `3ad0b963-e600-818c-aae4-fff59e649b3e`(대시보드 top ✝️ 콜아웃 `3ad0b963-…-8116`에서 page mention 링크).
- **세션5-C (Notion 자동 로그 강화)**: `notion-live-update.mjs`가 SHA·시각·URL + **최신 커밋 subject + 최근 5커밋 이력** 자동 기록(에이전트 상태 즉시 파악). deploy.yml notion job `fetch-depth:0` — `2c18c06`
- **세션5-D (배경 스크롤 버그 fix)**: 문맥 성경 모달 body row + 좌우 컬럼 `minHeight:0` 누락 → flex 자식 콘텐츠 초과 clip으로 PC 스크롤 중간 멈춤. Playwright로 verse-mode 배경패널 end-to-end 스크롤 검증 — `65c061f`
- **세션5-E (저작권 안전화 · 중요)**: 표시 본문 소스 하드닝. **헬라어=로컬 STEPBible TAGNT(CC BY 4.0, public/data/lex/gnt) 재구성**(bolls NTGT 제거) `98e4f40` · **영어=ESV→WEB(World English Bible·PD)** 전면 교체(내부 id esv→web, LEGACY 별칭) `b3cc672`. 검증: 부팅 에러 0·번들 ESV/NTGT 제거.
- **세션5-F (LXX 칠십인역 역본 추가)**: 로컬 `public/lxx`(Rahlfs 1935·PD, eliranwong/LXX-Rahlfs-1935) 재구성. bibleApi fetchOriginalLxx + fetchAllTranslations lxx(OT만). **구약 전용** 역본 탭/열 — VerseNode·NodeEditor(OT-aware tabsForBook)·ParallelView(columns 필터+상태 동적화). 저작권: Rahlfs 1935 사망→2006 PD. `63806cb`+`5084671`(푸시됨).
- **세션5-G (LXX 사전 팝업 연동 · A안)**: LXX 단어→헬라어 사전 팝업(원어 탭과 동일 UX). parseLXX.cjs가 eliranwong word-aligned CSV(lexemes·StrongNumber·translit)로 `public/lxx-lex/{book}/{ch}.json`(tracked, 931파일·30MB, Strong 93.6% 태깅) 생성. lexicon.js langOverride='lxx' · VerseNode LXX 탭 chip 렌더+LexiconPopup. Strong보유 단어 100% 사전 해결. 배포됨 `281dae7`. 병렬 뷰(ParallelView) LXX 열도 Cmd/Ctrl+클릭 사전 팝업 연동 `403c057`(LIVE). **B안(LXX 고유어 6.4% 전용 사전)=Notion 심화로드맵 to-do 등록**(gwl2AsLookups/09a_LXX_lexicon 후보).
- **📑 표시 본문 저작권 지도**: 헬라어=TAGNT(로컬,CCBY ✅) · 히브리어=WLC(bolls,PD ✅) · 영어=WEB(bolls,PD ✅) · **LXX=Rahlfs1935(로컬,PD ✅, 구약전용)** · **한글=KRV(bolls, KBS 저작권 미해결 ⚠️ — 유일한 잔여 리스크)**. keyVerse label verbatim 여부도 점검 대상. LXX 미적용 잔여 화면: RelatedPassagePopup·ParallelStudyModal(3역본 · 필요시 확장).
- **참고(구 세션4)**: 2026-07-29 세션 4 — 병렬연구 학습 스캐폴딩 완전 통합 (LIVE `5ed01bd`)
- **작업 1**: ⇄ 병렬 연구 버튼을 플로팅→Sidebar 📖 문맥성경 아래(3곳 인라인) — `b017530`
- **작업 2**: ParallelStudyModal 셸을 ContextBibleModal 속성으로 통일 — 드래그+리사이즈+ESC 닫기 — `fadaf43`
- **작업 3**: 데이터 시드 6종 PR #27 병합(GPT 담당, 1318줄) — 렌즈 8·코스 12·온보딩 3단계·용어 30·공관 카드 11·인용 카드 32 — `8308a98`
- **작업 4**: UI 스캐폴딩 통합 — `ParallelStudyScaffolding.jsx` 신규, ParallelStudyModal에 코스 캐러셀·활성 코스 패널·렌즈 피커·렌즈 상세·공관 카드·인용 카드·온보딩 오버레이·용어 툴팁 삽입, verifier 스키마+마커 검증 확장 — `5ed01bd`
- **작업 5**: 사용자 매뉴얼에 병렬 연구 섹션 추가 — 문맥 성경 다음 위치, 110줄, 코스·렌즈·카드·워크플로우 예시·주의사항 포함 — `4af114d`
- **작업 6**: 📖 문맥 성경에 학습 스캐폴딩 완전 통합 — PR #28 병합(GPT 948줄 시드 5파일) + UI 통합. ParallelStudyScaffolding 범용화(props 주입 · LS 키 분리) · `ContextBibleScaffolding.jsx` 신규(코스Bar · 활성장카드 · 온보딩) · ContextBibleModal에 접이식 스트립·스텝별 자동 scrollTo·온보딩 오버레이 삽입 · verify-context-scaffolding.mjs 신규(predev/prebuild 등록) · 매뉴얼 확장. 문맥 성경 코스 12·렌즈 8·챕터카드 35·용어 20(병렬 30과 통합 50) — `e36c068`
- **작업 7**: 온보딩 안내 재실행 버튼 — 병렬 연구·문맥 성경 모두. useOnboarding에 `reopen()` 추가(dismiss LS 유지, visible만 true). 병렬 모달 헤더 닫기 × 왼쪽 🎓 안내, 문맥 스캐폴딩 스트립 우측 🎓 안내. 사용자가 언제든 3단계 코치마크 재실행 가능 — `14f8a17`
- **작업 8 (버그 fix)**: 모바일 병렬 연구 버튼이 안 눌리는 문제. 원인=Sidebar 모바일 시트 zIndex 1201 stacking context 안에서 ParallelStudyModal의 createPortal→body 탈출로 zIndex 1200이 시트 뒤에 렌더. 수정=모달 zIndex 1250 상향 + Launcher에 onBeforeOpen prop, Sidebar 모바일에서 onMobileClose 연결(버튼 탭 시 시트 자동 닫힘). 문맥 성경은 인라인 렌더라 영향 없음 — `b8cf095`
- **작업 9 (모바일 스크롤 fix)**: 문맥 성경·병렬 연구 모바일/패드 스크롤 갇힘 종합 수정. 원인 1=스캐폴딩 바 720px+ 콘텐츠가 모바일 뷰포트 초과, 본문 flex:1 크러시. 원인 2=병렬 연구 pad에서 momentum·overscroll 방어 부재. 수정=문맥 스캐폴딩 바 모바일 기본 접힘 + maxHeight(45/55vh) + 내부 overflowY:auto + overscroll:contain + WebkitOverflowScrolling:touch + touchAction:pan-y로 본문 최소 55vh 확보. 병렬 본문 스크롤에 동일 iOS momentum·overscroll 방어 3종 추가. Sidebar 모바일 문맥 성경 버튼도 onMobileClose 자동 호출 — `48aad4c`
- **작업 10 (모바일 튕김 크래시 근본 fix)**: 크롬 모바일에서 문맥/병렬 버튼이 열리자마자 메인으로 튕김. 원인=App.jsx `(!isMobile || mobileSidebarOpen) && <Sidebar>` 조건부 마운트 + 작업8/9에서 버튼에 붙인 onMobileClose → 시트 닫힘→Sidebar 언마운트→모달 파괴. 수정=버튼 onMobileClose/onBeforeOpen 제거(시트 열어둔 채 모달 겹침). 재발방지=`verify-mobile-safety.mjs` 신규(predev/prebuild) + AGENTS.md 📱 규칙 + Notion 📱 콜아웃 — `411d3b5`
- **작업 11 (자동 릴리스 파이프라인)**: deploy.yml에 notion job 추가(build→deploy→verify→notion). `scripts/notion-live-update.mjs`가 🤖 CI 자동 배포 로그 콜아웃 갱신(secret NOTION_API_TOKEN 있을 때만, 🔴 LIVE 미터치). AGENTS.md 릴리스 워크플로우 자동/수동 2계층 재정리 — `4ee7143`
- **작업 12 (자동 갱신 활성화 완료)**: GitHub Secret `NOTION_API_TOKEN` 등록(`gh secret set`, 로컬 자비스 봇 토큰 재사용). 빈 커밋 `57300a7`로 검증 → CI notion job이 🤖 블록을 `57300a7`로 자동 갱신 확인. 이제 매 push마다 자동 동작. **더 이상 CI 자동 로그는 수동 개입 불필요**.
- **Notion 블록 id**: 📱 모바일 안전 규칙 `3ac0b963-e600-812d-b3a1-f39e07b0622a` · 🤖 CI 자동 배포 로그(CI 자동 갱신) `3ac0b963-e600-81da-85b4-ea15fee06408` · 🔴 LIVE(수동 큐레이팅 · **최상단으로 이동, 새 id**) `3ad0b963-e600-812b-8318-f392a1d1d951` (구 `4ee107ae…` 삭제됨) · 📊 진행률 대시보드: heading `3ad0b963-e600-81d4-a0e5-f87d8f092bd7` · 3열 그리드 column_list `3ad0b963-e600-8105-8bcf-f5e45170c04b` · %바 code `3ad0b963-e600-811c-8935-c59539810110` · 🗺️ 기능 구조도 code `3ac0b963-e600-810c-9621-dbd52e5fd1dc` · H1 제목 `8d6d4719-f769-4e5f-8c29-871f51fa76f8`
- **작업 13 (Notion 대시보드 IA 개편)**: (1) H1 제목 위에 떠 있던 장소 DB 9블록 → 접이식 토글로 이동(제목이 실제 최상단). (2) H1 직후 "🧭 프로젝트 한눈에" 개요 신설 — 진행 8단계 타임라인 · 아키텍처 4계층 · 기능 지도 · 현재 상태·읽는 순서. (3) 낡은 기능 구조도 code 갱신(스캐폴딩·모바일안전·notion job·런처 Sidebar mount 반영). (4) 낡은 커밋 목록 헤딩을 "과거 스냅샷"으로 명시. Notion API `after`는 ntn CLI 불가 → curl(Notion-Version 2022-06-28) 사용. code rich_text 2000자 상한 → 청크 분할.
- **분업 원칙 확립**: GPT=콘텐츠/시드/큐레이션, Claude=스키마/UI/verifier/배포/노션, 사용자=승인 게이트.
- **다음 후보**: CITATIONS 시드 32→100+ 확장(GPT), SYNOPTIC 11→30+ 확장(GPT), researchAnnotations 저장 연동(Claude), 세션 종료 요약 카드(Claude+GPT).
- **중요**: 프로젝트가 ChatGPT 주도로 **Context Bible v2 단일 계약**으로 재구축됨. 이전 "21/66 NT 서신 등록" 서사는 낡음.

## 🏛️ 실제 아키텍처 (v2, GitHub = SoT)
- 66/66권 registry 등록. 품질 3단계: **curated(장별 고유)** > coarse(구간제목 복제) > fallback(0).
- 데이터 흐름: book/meta → chapters(agenda/structureNodes/keyVerses) → macro(pivots/arcs) → UI.
- **macro Arc는 curated 상세에서 자동 파생**(contextRegistry.js `mergeCuratedChapterArc`). 수동 Arc 작성 불필요.
- curated 소스: `src/data/curatedChapterDetails.js` (+ `curatedChapterDetailsOTCore.js`). D(agenda, verse, label) 헬퍼.
- 검증: `node scripts/audit-context-v2.mjs` · `verify-context-arc-system.mjs` · `verify-expanded-contexts.mjs` · `npm run build`.

## ✝️ 신학 기준 (고정 · 절대) — 장로교 개혁주의
- 모든 신학 콘텐츠는 **장로교 개혁주의(WCF·대소요리문답·언약신학·구속사적 해석)** 기준. 이단(여호와의증인·몰몬·신천지·통일교·JMS·안상홍 등) 절대 배제.
- 강제: `scripts/verify-doctrinal-safety.mjs`(이단 signature 57종 자동 차단, predev/prebuild 등록). AGENTS.md 「✝️ 신학 기준」 + Notion ✝️ 콜아웃 `3ad0b963-e600-8116-9eba-ca1506c3ac57` 동기화.
- **향후 모든 GPT 위임 브리프에 이 신학 기준 조항 반드시 포함**.

## 🧪 장별 심화 검증 (2026-07-30 신규)
- `scripts/verify-curated-chapters.mjs`: 앱 lex 데이터(public/data/lex/hot|gnt) 대조 → 장 완전성·절 범위(히브리↔KRV +1 오프셋 경고)·구조·복제 자동 검증. predev/prebuild 등록.
- 창세기 50장 반영(`curatedChapterDetailsGen.js` · GPT PR #29 통합 `bf3ad3d`). 오경 장별 심화 3/5(민·신·창), 출·레 남음.

## ★ 마일스톤: 66권 장별 심화 완성 (2026-07-30 · LIVE `42a156d`)
- 남은 52권 curated = GPT PR #30(7 코퍼스 파일: curatedTorahHistory/Wisdom/MajorProphets/MinorProphets/GospelsActs/Paul/GeneralRev) → 자비스가 **데이터만 추출**(PR은 stale base라 병합 X, 닫음)해 현재 main에 적용·spread 연결.
- 검증 통과: 66권 완전성·절범위·스키마·신학(개혁주의) · 민감장 스팟체크(롬9 주권적긍휼·계20 도식강요X·마24 날짜계산X·단9·사53 대속) 정합. **coarse 챕터 0**.
- 다음 확장: ② 전문화 책 context 21/66 → 66.
- 파이프라인 참고: 이번 건은 DB 카드 없이 GPT가 직접 PR. 향후 「🔁 작업 파이프라인」 DB(수동 C안) 경유 예정.

## ✅ 문맥 성경 3층 품질 (2026-07-30 소스 확인 · ③은 위 마일스톤으로 66/66 갱신됨)
- **① 등록·기본**: 66/66 (100%) — 원어 담화 마커·거시 Arc·배경 meta 전권 작동. fallback(빈) 0권.
- **② 전문화 책 context** (bookContext.js `_CTX`): 21/66 — Gen·Exod·Lev·Ruth + 신약 17권(Rom·Mark·Matt·Luke·John·Acts·Gal·Eph·Phil·Col·1Th·2Th·Phlm·1Tim·2Tim·Titus·Heb).
- **③ 장별 심화 curated** (curatedChapterDetails): 13권 — Num·Deut·Josh·Judg·1Sam·2Sam·1Kgs·2Kgs·1Chr·2Chr·Ezra·Neh·Esth (OT 역사서 위주).
- coarse 장 보유 책 28권. **주의: ②전문화와 ③장별심화는 서로 다른 집합**(Gen/Exod/Lev는 전문화지만 장별은 coarse).

## 📍 즉시 다음 스텝
1. **ESV→WEB 커밋 `b3cc672` push 승인 대기** → 푸시 시 CI 자동배포 + 🤖 노션 로그 자동 갱신.
2. **GPT 작업 중**: 남은 52권 장별 심화 curated 일괄(브랜치 `chatgpt/all-remaining-books-curated`, 7 코퍼스 파일). PR 오면 본문정합성+신학 verifier→spread 연결→빌드→배포→노션 한 번에.
3. **한글 KRV 저작권** — 유일 잔여 리스크. 옵션: KBS 사용허락 / bolls 유지+리스크 / PD 한글본 대체. 사용자 결정 대기.


## 🆕 2026-07-29 세션 3 (커밋·푸시·배포 완료)
- **원어 신호어 66권 적용**: contextRegistry OT base rule을 HEBREW_NARRATIVE_RULES로 교체 (이전 빈 배열 → OT 39/39 신호어). `af9c9d4`
- **관주 🔗 조건부 노출**: hasCrossRef 인덱스로 참조 있는 절만. `cf4e85d`
- **아키텍처 하드닝**: ContextBibleModal→contextRegistry 직접 import(alias 삭제), ensure-* 9개 materialize 후 삭제, 빌드 소스 무변형화. `9927d98`
- **디바이스 갱신**: PWA 캐시 v4/v3 bump + 기존 BUILD_ID 리로드.
- origin/main = af9c9d4, gh-pages 27c2d4b, Pages built. Notion 수정기록 동기화 완료.




## 🤖 릴리스 자동화 (2026-07-29 확립)
- 작업 완료 시 표준 순서: 로컬→커밋→푸시→배포검증(verify:deploy)→노션→**대시보드 LIVE 갱신(마지막)**. [[bible-release-workflow]]
- 대시보드 LIVE 콜아웃 id `3ac0b963-e600-81ae-afc4-dbfc21279dce` 갱신이 마지막 단계. [[bible-notion-map]]
- 스킬 제안 `bible-mindmap-release-20260729-71a23e23a4` (pending · 승인 대기).

## 🔎 배포 반영 확인 장치 (2026-07-29 신규)
- `npm run verify:deploy` → 라이브 version.json commit vs 로컬 HEAD 대조. 일치=최신 반영. **매 배포 후 실행**.
- 앱 [사용법] 타이틀바 `build <sha>` 배지로 현재 빌드 육안 확인.
- 캐시 세대는 vite.config `HTML_CACHE`/`CHUNK_CACHE` 단일 상수 — bump 시 여기만 수정.
- 현재 라이브 = `fc1fa65` (v4/v3).

## 🚨 배포 메커니즘 (반드시 숙지)
- **실제 배포 = GitHub Actions `.github/workflows/deploy.yml`** (Pages build_type=workflow). `main` push 시 트리거.
- **`npm run deploy`(gh-pages 브랜치 푸시)는 이 설정에선 무의미** — 착각 금지. push→워크플로우 성공 여부로만 배포 판단.
- CI는 `npm ci`로 clean install → vite.config/앱이 import하는 패키지는 **반드시 package.json에 선언**돼야 함(로컬만 되고 CI 실패하는 함정). 2026-07-29 @vitejs/plugin-react 미선언으로 하루종일 배포 실패했음(`d01dfcc`로 복구).
- 배포 확인: `gh run watch <id> --exit-status` + 라이브 sw.js 캐시세대 curl 확인. (`pages/builds/latest` API는 workflow 방식에서 옛 날짜 표시하니 신뢰 X)

## ⚠️ 주의사항
1. **로컬 HEAD가 origin보다 84커밋 뒤처져 있었음** → fetch/ff 필수. 재개 시 항상 `git fetch` 먼저.
2. **build-time ensure-* 패치가 소스 변형** (ArgumentMapPanel·ContextBibleModal·ManualModal·SyntaxPanel). 커밋 전 `git checkout HEAD -- <이 4파일>`로 build 산출물 제외. 순서 의존적이라 dirty 상태 재빌드 시 실패 가능.
3. **case-collision 주의**: research/ 파일명 대소문자 충돌 이슈 수정함(`67fd829`). basename 대소문자만 다른 파일 금지.
4. **git repo root = 워크스페이스 루트** (bible-mindmap는 하위 tracked 디렉토리). 홈 파일(AGENTS.md 등)은 커밋 대상 아님.
5. push는 사용자 명시 승인 시만.

## 🔗 Notion (v3)
대시보드 `3a10b963e600801e9ba8f449df24685b` · 책별현황 `3a80b963-e600-81af-a3ae-df5483e517b4` · 아키텍처 `3a80b963-e600-81a7-a360-fbf8313c2fe2` · 2026-07-29 수정기록 `3ab0b963-e600-8162-8609-e6ea0c43140d` · 심화로드맵 `3ac0b963-e600-812e-90d7-c48b88782e52`
