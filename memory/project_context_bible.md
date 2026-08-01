---
name: project-context-bible
description: 문맥 성경 프로젝트 현황 — 66권 확장 아키텍처, 진행 상태, 핵심 규칙
metadata:
  type: project
---

# 문맥 성경 (bible-mindmap) 프로젝트

**Why:** 성경 마인드맵 앱에 원어(헬라어/히브리어) 기반 담화 분석 기능을 추가하는 프로젝트. 66권 전체 확장 목표.

**How to apply:** 새 권 추가 시 엔진 수정 없이 `bookContext.js`에 오브젝트만 추가. 핵심 규칙 반드시 준수.

## 🔗 노션 마스터 페이지 (최신 상세본)
- **Page ID**: `3a60b963-e600-801a-9c2b-e612d12d9d2b`
- **URL**: https://app.notion.com/p/3a60b963e600801a9c2be612d12d9d2b
- **접근**: `ntn pages get 3a60b963-e600-801a-9c2b-e612d12d9d2b`
- 이 파일은 요약, 노션은 상세본 (담화 규칙 라이브러리·구조 마커·확립된 원칙 전량). 세션 시작 시 사용자가 "노션 참조" 요청하면 즉시 위 명령으로 페이지 로드.

## 🔗 관주(Crossref) 팝업 시스템 (2026-07-24 도입 · GitHub push 완료 · 커밋 b381a05)

**목적**: 문맥 성경 각 절 옆 🔗 아이콘 → 인용·참조 구절 팝업 → 참조 본문 미리보기 다중 오픈. 관주 성경 UX 재현.

**데이터 소스**:
- `public/crossref/*.json` — 66권 전권 완비. `{from, to, votes}` 구조 · votes 높은 순 정렬.
- `src/api/crossrefApi.js` — `fetchCrossRefs(bookId, chapter, verse, limit)` 캐싱 적용.
- `src/api/bibleApi.js` — `fetchVerse(bookId, ch, vs, ve, 'krv')` — 참조 본문 fetch.

**컴포넌트 3종**:
- `src/utils/canon.js` — 성경 정경 카테고리 7종 (오경·역사·시가·예언·복음·서신·계시)
- `src/components/CrossrefPopup.jsx` — 관주 목록 팝업 (드래그 · 모바일 시트)
- `src/components/VersePreviewPopup.jsx` — 참조 본문 미리보기 팝업 (다중 · 드래그)

**정경 카테고리 dot 컬러 (7종)**:
- 🟡 오경 `#eab308` · 🟠 역사서 `#f97316` · 🟣 시가서 `#a855f7`
- 🔴 예언서 `#dc2626` · 🟢 복음서·행전 `#059669` · 🔵 서신 `#2563eb` · ⚫ 계시록 `#1e293b`

**UX 규격**:
- 각 절 좌측 컬럼 🔗 아이콘 (opacity .55 → hover 1.0)
- **관주 목록 팝업**: 상위 5개 (votes 정렬) · 카테고리 dot + tint 배경 · **헤더 드래그 이동** · 범례 리본
- **참조 항목 클릭** → "본문 ↗" → **미리보기 팝업 오픈** (이동 아님)
- **미리보기 팝업**: 다중 오픈 (각 팝업 unique id · z-index 자동 · 24px offset · 개별 닫기 · 드래그)
- **본문 렌더링**: bolls.life 다중 절 `<span>N</span>` 태그 파싱하여 우리 스타일로 재렌더
  - 첫 절 `장:절` · 이후 `절`만 (관주 성경 관례)
  - 절 번호 카테고리 컬러 tint sup 배지

**중요 매핑 주의**:
- crossref bookId = STEPBible 표준 (예: `Exod`, `Ps`, `Song`, `Mark`)
- bookContext key = 프로젝트 자체 (예: `Exo`, `Mark`)
- 반드시 `book.lexId` 필드로 매칭: `Object.values(BOOK_CONTEXTS).find(c => c.book.lexId === lexId)`

**해결된 버그**:
- 다중 절 crossref (예: 요한복음 1:1-3) 에서 HTML `<span style="...">1</span>` 태그 노출 이슈
  → `renderVerses()` 헬퍼로 파싱 · strip · React 재렌더로 근본 해결

**자동 적용 범위**: 현재 5권 + 향후 추가되는 모든 성경 (66권 crossref 데이터 완비).

## ✎ 비평장치(Apparatus) 시스템 (2026-07-24 도입 · SBLGNT 통합 완료)

**목적**: 문맥 성경 각 절에 사본 차이·번역 이본 표시. 신약은 SBLGNT 자동 처리, 구약은 수동 큐레이션.

**컴포넌트**:
- `src/data/textualVariants.js` — 비평장치 DB (bookId × ch × verse 인덱스 · Map/Set · lazy loading)
- `src/utils/variantTypes.js` — 유형 5종 컬러·라벨 매핑 + `metzgerColor(grade)` 등급 배지
- `src/components/VariantPopup.jsx` — 비평장치 팝업 (관주 팝업 스타일 재활용 · 드래그 · 모바일 시트)
- `scripts/parse-sblgnt.mjs` — SBLGNT Apparatus 파서 (CC BY 4.0, Faithlife/SBLGNT GitHub)

**SBLGNT 통합 현황** (신약 자동 처리):
- 마가복음: 929건 → `public/data/variants/Mark.json`
- 로마서: 229건 → `public/data/variants/Rom.json`
- Lazy loading: 책 열 때 fetch, 번들 비포함

**비평장치 유형 5종**:
- 🔵 omission (누락) `#2563eb`
- 🟡 addition (삽입) `#eab308`
- 🔴 substitution (대체) `#dc2626`
- 🟠 order (순서) `#f97316`
- 🟣 translation (번역) `#a855f7`

**Metzger 등급**: A(초록) · B(노랑) · C(오렌지) · D(빨강)

**UX**: 관주 🔗 옆에 **✎ 노란 배지** (비평장치 등록된 절만 노출) → 클릭 시 상세 팝업

## 🤖 자동 진행 규칙 · 비평장치(Apparatus) (2026-07-24 확립 · 2026-07-25 수정 · 필독)

**새 성경을 문맥 성경에 추가할 때마다 비평장치(Apparatus)도 반드시 함께 진행.**

**⚠️ 2026-07-25 발견 · 수정된 심각한 버그**:
- textualVariants.js VARIANTS 배열에 신약 하드코딩 항목이 있으면 `_loadedBooks.add(bookId)`가 실행되어 SBLGNT JSON fetch가 스킵됨
- 결과: Mark.json 929건이 있어도 하드코딩 6건만 표시되던 이슈
- **수정**: SBLGNT_BOOKS Set에 속한 신약 책은 `_loadedBooks`에 자동 등록하지 않음. 하드코딩 + SBLGNT 자동 둘 다 로드되도록 변경

**신약(NT) 절차** (엔진 수정 없이 즉시 적용):
1. `bookContext.js`에 새 NT 책 등록
2. `scripts/parse-sblgnt.mjs`의 `BOOKS_TO_PROCESS` 배열에 책 lexId 추가
3. `src/data/textualVariants.js`의 `SBLGNT_BOOKS` Set에 lexId **필수 추가** (누락 시 fetch 스킵)
4. `node scripts/parse-sblgnt.mjs` 실행 → `public/data/variants/{Book}.json` 자동 생성
5. 브라우저 강력 새로고침(Cmd+Shift+R) → 콘솔에 `[비평장치] ✅ {Book} 로드 완료` 로그 확인
6. 저작권: SBLGNT CC BY 4.0 (Faithlife/SBL) — 안전
7. **BHS/NA28 apparatus 직접 복사 금지** (저작권 문제)

**진단 도구**:
- 콘솔 로그 `[비평장치] ✅ Mark 로드 완료: 929건 · 506개 절 커버` = 성공
- 콘솔 로그 `[비평장치] ❌ Mark 로드 실패` = 실패 (에러 메시지 확인)
- 로그 아예 없음 = SBLGNT_BOOKS Set에 등록 안 됐거나 useEffect 미실행

**현재 등록된 신약 (NT) 책 · 절차 검증됨 (17권)**:
- 마태복음(Matt): SBLGNT 824건 · 561절 커버 · pivots 30 · arcs 14 (2026-07-25 추가)
- 마가복음(Mark): SBLGNT 929건 · 506절 커버 · pivots 22 · arcs 14
- 누가복음(Luke): SBLGNT 1140건 · pivots 30 · arcs 14 · manualDiscourse 67 · disputedRanges 5 (2026-07-25 추가)
- 요한복음(John): SBLGNT 773건 · pivots 31 · arcs 14 · manualDiscourse 65 · disputedRanges 4 · 신학 마커 15종 (2026-07-25 추가)
- 사도행전(Acts): SBLGNT 1084건 · pivots 28 · arcs 14 · manualDiscourse 57 · disputedRanges 4 · 신학 마커 13종 (2026-07-25 추가 · 성령·1:8 지리 프로그램·요약 진술 7개·케리그마 설교)
- 로마서(Rom): SBLGNT 229건 · 163절 커버
- 갈라디아서(Gal): SBLGNT 87건 · pivots 22 · arcs 14 · manualDiscourse 43 · 신학 마커 14종 (2026-07-25 추가 · 이신칭의·자유·성령 vs 육체·성령의 열매·아브라함 씨·양자·새 창조)
- 에베소서(Eph): SBLGNT 90건 · pivots 27 · arcs 14 · manualDiscourse 48 · 신학 마커 15종 (2026-07-25 추가 · 그리스도 안에서 34회·성령 인침·교회의 몸·이방 편입 3중 συν·전신갑주·5직·가정 규칙)
- 빌립보서(Phil): SBLGNT 46건 · pivots 21 · arcs 14 · manualDiscourse 34 · 신학 마커 13종 (2026-07-25 추가 · 기쁨 16회·그리스도 찬가 2:5-11·κένωσις·ὑπερύψωσεν·시민권·배설물·자족·매임 아이러니)
- 골로새서(Col): SBLGNT 72건 · pivots 22 · arcs 14 · manualDiscourse 37 · 신학 마커 15종 (2026-07-25 추가 · 그리스도 찬가 1:15-20·형상·먼저 나신 이·만유 창조 유지·πλήρωμα·골로새 이단·개선식·위의 것·감추어진 생명·에베소서 쌍둥이)
- 데살로니가전서(1Thess): SBLGNT 52건 · pivots 22 · arcs 14 · manualDiscourse 28 · 신학 마커 12종 (2026-07-25 추가 · 바울 최초 서신 AD 50-51·파루시아 4중 축·공중 만남·주의 날·빛의 아들·믿음·소망·사랑 3중·유모·아버지 목양)
- 데살로니가후서(2Thess): SBLGNT 30건 · pivots 19 · arcs 14 · manualDiscourse 25 · 신학 마커 12종 (2026-07-26 추가 · 재림 오해 정정·불법의 사람·저지자(κατέχον/κατέχων 신약 최대 난해구)·사탄 파루시아 거짓 표적·전통 굳게·게으름 훈계·친필 서명 위조 편지 대응·저자 논쟁 노트)
- 빌레몬서(Phlm): SBLGNT 17건 · pivots 14 · arcs 8 · manualDiscourse 15 · 신학 마커 8종 (2026-07-26 추가 · 신약 최단 서신·무익→유익 오네시모 어원 유희·종 이상 사랑받는 형제·σπλάγχνα 3중 축·자의로 억지 X·내게 돌리라 대속 축소판·매인 자 겸손·골로새서 짝)
- 디모데전서(1Tim): SBLGNT 46건 · pivots 20 · arcs 14 · manualDiscourse 24 · 신학 마커 12종 (2026-07-26 추가 · 목회서신·"미쁘다 이 말이여" 정형구 5회·감독·집사 자격·경건의 신비 6행 찬송·믿음의 선한 싸움·한 중보자 대속물·과부 명부·저자 논쟁)
- 디모데후서(2Tim): SBLGNT 39건 · pivots 19 · arcs 14 · manualDiscourse 24 · 신학 마커 12종 (2026-07-26 추가 · 바울 최후 유서·4:6-8 3중 정식·의의 면류관·성경 영감 θεόπνευστος·4세대 계승·군사·경기자·농부·3세대 믿음·말세 18악)
- 디도서(Titus): SBLGNT 24건 · pivots 15 · arcs 10 · manualDiscourse 23 · 신학 마커 9종 (2026-07-26 추가 · 그레데 파송·장로/감독·2:11-14 초림·재림 두 나타남·3:4-7 세례 성령 갱신·바른 교훈·Epimenides 역설·이단 훈계)
- 히브리서(Heb): SBLGNT 150건 (NT 서신 최대) · pivots 32 · arcs 14 · manualDiscourse 49 · 신학 마커 15종 (2026-07-26 추가 · 저자 미상·아들 우월성·κρείττων 13회·멜기세덱 반차·새 언약 렘 31·단번에 ἐφάπαξ·5대 경고·믿음장 11·창시자 완성자·시온산·진영 밖 예수)

**구약(OT) 절차**:
1. 새 책 `bookContext.js` 등록 시 → `src/data/textualVariants.js` VARIANTS 배열에 수동 append
2. **권당 5-15개** 학문적 유명 지점 (Metzger *Textual Commentary* · NET Bible notes 참조)
3. 필수 필드: `bookId, chapter, verse, type, title, summary, witnesses, metzger, translations, significance, refs`
4. refs 표준 3줄 (WLC + NET Bible + BHS/BHQ/DSS 유의사항) 필수 (validate-ot.mjs 검증)

**현재 등록된 구약 (OT) 책 (4권)**:
- 창세기(Gen): 이문 2건 (4:8·47:31)
- 출애굽기(Exod): 이문 1건 (20:13)
- 레위기(Lev): 이문 3건 (16:8 아사셀·17:11 피=생명·18:5 준행하면 살리라) · pivots 30 · arcs 14 · manualDiscourse 57 · 신학 마커 12종 (2026-07-25 추가)
- 룻기(Ruth): 이문 1건 (4:5)

**apparatus 총계**: 신약 5632건 (SBLGNT 자동 · 1Tim 46 + 2Tim 39 + Titus 24 + Heb 150 추가) + 구약 7건 (수동 큐레이션)

## 🔄 자동 노션 반영 규칙 (2026-07-24 확립 · 필수)
**새 성경 등록 시 노션 마스터 페이지도 반드시 함께 업데이트한다.**

**트리거**: 사용자가 "[XX] 추가/등록/작업" 요청 → `bookContext.js` 에 새 XX_CTX 등록 → 커밋/푸시 → **바로 노션 append**

**노션 업데이트 표준 절차**:
1. `ntn api "v1/blocks/3a60b963-e600-801a-9c2b-e612d12d9d2b/children" -X PATCH` 로 새 섹션 append
2. 필수 포함 정보:
   - Heading 3: `📘 {책이름} ({lexId} · N종)` (예: `📘 마가복음 (Mark · 10종)`)
   - 구조 마커 목록 (id · 아이콘 · role · 히/헬 원어)
   - Manual Discourse 지점 수
   - 커밋 해시
   - 완성 진행률 업데이트 (예: `5 / 66 (7.6%)`)
3. "📊 등록된 성경" 테이블도 새 행 추가 필요 (수동 · 노션 UI 로 편집)
4. 절대 잊지 말 것: **커밋 후 노션 반영이 default. 사용자가 별도로 요청하지 않아도 자동 수행.**

**규칙 근거**: 사용자가 매번 노션 업데이트 요청하지 않도록 자동화. 진행 이력을 노션에 실시간 반영하여 새 세션에서도 최신 상태 파악 가능.

---

## 진행 상태 (2026-07-25 저녁 기준)
- **완성**: 9 / 66권 (13.6%)
  - OT (4): 창(Gen) · 출(Exod) · **레(Lev)** · 룻(Ruth)
  - NT (5): 마(Matt) · 막(Mark) · 눅(Luke) · **요(John)** · 롬(Rom)
- **파이프라인**: GNT(NT 27권) + HOT(OT 39권) 원어 lex 완비 · Stage 1 자동 검증 인프라 완료 · 자동 pipeline 4회 실전 검증
- **자동화 시스템**: 5-Layer 검증 + OT 전용 보조 + 세션 재개 프로토콜
- **배포 URL**: https://parkminhyun0.github.io/bible-mindmap/

## 아키텍처 원칙
- 엔진(`ContextBibleModal.jsx`) 절대 수정 금지 — 새 책 = `bookContext.js` 오브젝트 하나만 추가
- 원어 절 번호 병기 자동 (히/헬 자동 판별)
- UI 라벨 wrap 방지: 동적 폭 계산 + `nowrap` 안전망 필수
- 책당 예상 작업 시간: 30-45분

## ⚡ 담화 들여쓰기 규칙 (전 권 필수 · 2026-07-24 확립 · 리팩터링 완료)
**구현 방식**: rule 정의 자체에 `indent: 1` 속성을 붙이고, 엔진은 그 속성만 참조.
엔진 (`buildIndentLevels()`) 은 어떤 id도 하드코딩하지 않음 → 신규 corpus/rule 추가 시 엔진 수정 불필요.

**엔진 코드** (`ContextBibleModal.jsx`):
```javascript
function buildIndentLevels(analyzed, qaPairs, krv) {
  const lv = {};
  for (const { verse } of krv) {
    const qa   = qaPairs[verse];
    const rule = analyzed[verse]?.discourse;
    lv[verse] = qa?.type === 'A' ? 1 : (rule?.indent || 0);
  }
  return lv;
}
```

**level 1 (들여쓰기 대상)** — 종속·이유·목적·부각절
- 공통: `qaPairs.type === 'A'` (Q&A 답변, rule과 별개 축)
- GNT: `reason` (γάρ), `purpose` (ἵνα) — rule 정의에 `indent: 1`
- HOT: `ki_reason` (כִּי), `hinneh` (הִנֵּה) — rule 정의에 `indent: 1`

**level 0 (기본)** — 주절·선언·전환·주요 구조 마커 (indent 속성 없음)

### 신규 rule 추가 절차 (엔진 수정 불필요)
1. `src/data/bookContext.js` 에서 rule 정의에 `indent: 1` 속성 붙이기만 하면 끝
2. 예: `{ id: 'new_rule', role: '...', ..., indent: 1, match: (s) => s.has('...') }`
3. 자동으로 `buildIndentLevels`에 반영됨. 엔진 파일 절대 손대지 말 것.

### 배포 후 반드시 확인
- 로컬 dev 서버 (`npm run dev`) 로 반드시 실 렌더링 확인 — esbuild 문법 통과 ≠ 런타임 정상
- GitHub Pages 반영 지연 이슈: 아래 [gh-pages-deploy] 참조

**이 규칙은 사용자가 로마서에서 제안·확정한 문맥 표현 원칙. 어기면 절이 세로 정렬되어 논증 구조를 시각적으로 잃음.**

## 🌐 GitHub Pages 배포 지연 이슈 (2026-07-24 발견)
**증상**: `npm run deploy` 성공(`Published` 로그), `origin/gh-pages` 브랜치에 최신 커밋도 push됨. 하지만 `https://parkminhyun0.github.io/bible-mindmap/` 는 계속 이전 배포본 서빙.

**진단 명령**:
```bash
curl -sI "https://parkminhyun0.github.io/bible-mindmap/app/index.html" | grep -iE "last-modified"
curl -s  "https://parkminhyun0.github.io/bible-mindmap/app/index.html" | grep -oE "index-[^\"]+\.js" | head -1
```
- `last-modified` 가 현재 시각과 심하게 벗어남 (예: 하루 전) → GitHub Pages 서비스가 새 배포를 pick up 못한 상태
- 서빙 파일명이 `origin/gh-pages` HEAD 파일명과 다르면 배포 지연 확정

**해결 시도 순서**:
1. `npx gh-pages -d dist --dotfiles --no-history -m "force redeploy"` — gh-pages 브랜치를 단일 커밋으로 재작성 (GitHub Pages가 확실히 새 배포로 인식)
2. 그래도 안 되면 `https://github.com/parkminhyun0/bible-mindmap/actions` 에서 `pages-build-deployment` workflow 상태 확인 (실패면 로그 진단)
3. Pages 설정 (`Settings › Pages`) 이 `gh-pages` branch/root 로 되어있는지 확인
4. GitHub Actions billing 정지·workflow disable 여부 확인
5. Fastly CDN 캐시 max-age=600 → 최대 10분 대기 필요

브라우저 캐시 무효화(Cmd+Shift+R, Clear site data) 로 해결 안 되는 문제는 100% 서버(GitHub) 쪽 지연.

## 📛 UI 문자열 하드코딩 금지 규칙 (2026-07-24 확립)
성경명·챕터명 등 활성 책에 따라 달라지는 문자열은 절대 하드코딩 금지. 반드시 `ee.ko` (활성 책 한글명) 또는 `activeBook.ko` 로 동적 참조.

**과거 위반 사례** (모두 수정 완료):
- 신학어 칩 tooltip "로마서 전체 추적 →"
- thread 스캔 로딩 "로마서 전체 스캔 중…"
- thread 결과 헤더 "로마서 전체 N절에서 등장"
- thread 뷰 "← 로마서로 돌아가기"
- 모바일 목차 시트 "로마서 목차"

**작업 시 체크**: 새 UI 문자열 추가 전 `grep -n "로마서\|창세기\|룻기" src/components/ContextBibleModal.jsx` 로 하드코딩 여부 사전 확인.

## 🚨 변수명 참조 규칙 (2026-07-24 확립 · 재발 방지)
**절대 미니파이된 번들(`dist/assets/*.js`, `origin/gh-pages`)의 변수명을 원본 소스에 그대로 사용하지 말 것.**

**Why:** 하드코딩 수정 시 원본 변수명이 `BOOK`인데 배포 번들의 minified 이름 `ee`를 보고 `ee.ko`로 참조 → 원본 소스에는 `ee`가 존재하지 않아 `ReferenceError` 발생 → 모달 크래시 · 화면 하얘짐 (white screen).

**How to apply:**
1. 변수·함수명 확인은 반드시 **원본 소스**(`src/**/*.jsx`, `src/**/*.js`)에서 `grep` 실행
2. 배포 번들(`app/assets/index-*.js` 등) 은 반영 여부 확인 용도로만 사용, 코드 작성 참고 금지
3. 원본 소스 변수 확인 순서:
   - `grep -n "const \|let " src/components/ContextBibleModal.jsx | grep <키워드>`
   - 미니파이 이름(`ee`, `U`, `H`, `t`, `n` 등 1-2자) 은 100% 번들 산물 — 원본 아님
4. 수정 후 반드시 `npx esbuild <파일> --bundle=false` 문법 체크 (문법 통과해도 런타임 참조 오류는 못 잡음 → 로컬 dev 서버에서 실 실행 확인 필수)

## 핵심 파일 위치
- `src/data/bookContext.js` — 컨텍스트 레지스트리 (새 책 추가 위치)
- `src/components/ContextBibleModal.jsx` — 렌더링 엔진 (수정 금지)
- `scripts/build-lexicon.mjs` — STEPBible 파서
- `landing/index.html` — 랜딩 정적 부분
- `landing/data/content.json` — 랜딩 CMS 데이터
- `landing/guide.html` — 사용자 가이드
- `src/components/ManualModal.jsx` — 앱 매뉴얼
- `public/data/lex/gnt/` · `hot/` — 원어 lex (66권)

## 자주 실수하는 규칙 (필독)
1. **이미지 경로**: 매뉴얼(`ManualModal.jsx`) → `/images/...` (leading slash 필수) / 랜딩(`landing/`) → `images/...` (상대경로, leading slash 없음)
2. **CMS 금지**: `data-cms-list` 속성 있는 곳은 절대 하드코딩 금지 → `landing/data/content.json`에서 편집
3. **git add 금지**: `git add .` 금지 → 파일 명시적으로 지정

## 🚀 배포 방식 (2026-07-24 정정 · 필독)
**모든 배포 요청 = [로컬 dev + GitHub Pages 웹 + 모바일 반응형 웹] 3중 반영이 기본.**
사용자가 배포 요청하면 세 환경 모두 정상 동작 확인이 완료 상태의 기준.

### 🥇 적용 우선순위 (필독 · 절대 순서)
1. **최우선 = 로컬 dev 서버** — 모든 코드 수정은 로컬에서 먼저 실제 렌더링·동작 검증. `npm run dev` 로 실 화면 확인 후에만 다음 단계로. 로컬에서 안 되면 배포 절대 금지.
2. **두 번째 = GitHub 배포 (웹 + 모바일)** — 로컬 검증 완료 후 `git push origin main` → Actions workflow → 데스크톱 웹과 모바일 반응형 웹 동시 반영.

**Why:** 로컬에서 안 되는 코드를 GitHub 에 올리면 사용자 실사용 환경(웹·모바일)에 오류 노출. 로컬은 안전한 실험장, GitHub 은 사용자 접점. 순서를 지켜야 사용자가 항상 정상 작동하는 버전만 만남.

**How to apply:**
- 코드 편집 → 문법 체크(`npx esbuild`) → **로컬 dev 실 렌더링 확인 (필수)** → git commit → git push origin main → Actions 완료 대기 → 웹·모바일 확인
- 로컬만 확인하고 push 하지 말 것. 반대로 로컬 확인 없이 push 하는 것도 금지.
- 사용자가 "적용해줘" 하면 이 순서 그대로 따를 것.

**실제 배포 경로**: `git push origin main` → GitHub Actions `Deploy to GitHub Pages` workflow → GitHub Pages 반영

### 📱 모바일 반응형 웹 캐시 정책 (2026-07-24 확립)
- `index.html`, `landing/index.html`, `landing/guide.html` 세 파일에 캐시 방지 meta 3종 필수:
  ```html
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="Expires" content="0" />
  ```
- **Why:** 모바일 사파리·크롬이 index.html 을 강력 캐시 → 오래된 번들 해시 참조 → 이전 버그 번들 로드 → white screen 발생 이력 있음. SNS in-app browser 는 캐시 없이 새 요청.
- 번들 파일(`index-*.js`)은 vite hash 로 캐시 안전 → **index.html 만 no-cache**
- `viewport` meta 에 `viewport-fit=cover` 필수 (아이폰 노치 대응)
- 새 HTML 파일 추가 시 반드시 위 3종 meta 포함 확인

**Pages 설정** (Settings › Pages):
- Source: **"GitHub Actions"** (NOT "Deploy from a branch")
- 즉 `gh-pages` 브랜치는 참조하지 않음. `npm run deploy` (gh-pages 브랜치 push) 는 **완전 무의미**.

**❌ 폐지된 명령**:
- `npm run deploy` — gh-pages 브랜치만 갱신, 실제 사이트에 아무 영향 없음. 절대 실행하지 말 것.
- `gh-pages -d dist --dotfiles` — 동일

**✅ 올바른 배포 순서**:
```
① 코드 편집
② 문법 체크: npx esbuild <파일> --bundle=false --platform=browser
③ 로컬 dev 서버 (npm run dev) 로 실 렌더링 확인 (필수 — 런타임 오류 검출)
④ CMS 렌더링 지점 확인 · 이미지 경로 확인
⑤ git add <파일 명시>
⑥ git commit -m "..."
⑦ git push origin main   ← 이것이 배포 트리거
⑧ GitHub Actions 대기 (~1분 build + deploy)
⑨ 서빙 확인: curl -sI "https://parkminhyun0.github.io/bible-mindmap/app/index.html" | grep last-modified
```

**배포 진행 상태 확인**:
- Actions 페이지: https://github.com/parkminhyun0/bible-mindmap/actions
- workflow name: `Deploy to GitHub Pages` (트리거: main 브랜치 push)
- 소요 시간: 약 45~60초 (build 30-40s + deploy 5-10s)

**과거 삽질 요약 (2026-07-23~24)**:
어제부터 4번 `npm run deploy` 했지만 GitHub Pages는 어제 아침 첫 배포본을 계속 서빙. 브라우저 캐시 문제로 오해하고 강력 새로고침·Clear site data·gh-pages --no-history 등 시도했으나 모두 무효. 실제 원인은 Pages source가 "GitHub Actions"였고 로컬 commit이 main에 push 안 됐음. `git push origin main` 한 순간 workflow #60이 트리거되어 51초 만에 완벽 반영.

## 다음 확장 후보
- NT: 사복음서(마·막·눅·요), 바울서신(갈·엡·빌·골), 일반서신(히·약·벧전), 계시록
- OT: 오경(출·레·민·신), 역사서, 시가서(시·잠·전·아), 예언서(사·렘·겔·단)
