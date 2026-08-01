---
name: bible-agent-routing
description: 문맥 성경 66권 확장 자동화 시스템 명세 — 자비스 자동 참조 · 라우팅·5-Layer 검증·할루시네이션 3중 방어·저작권·승인 지점
metadata:
  type: reference
---

# 🏗️ 문맥 성경 · 자비스 자동화 라우팅 시스템

> **적용 시점**: 새 성경 등록 요청 접수 시 반드시 이 문서 참조 후 진행.
> **원본 명세**: Notion Master Config (`3a80b963e60081afb563f9987889fd10`)
> **실전 검증**: 누가복음(Luke) 등록부터 (2026-07-25)

## 🎯 시스템 목표

- **정확도 최상**: 학술 인용·verse·저작권 3중 검증
- **토큰 최소**: Opus 4.7 medium 단독 대비 NT 78% · OT 65% 절감
- **자동화**: Deterministic router · 5-Layer validation · 자동 롤백
- **재사용**: 66권 확장 시 동일 시스템 적용

## 📐 아키텍처

```
자비스 본체 (Sonnet 4.6 · reasoning off)
├─ Deterministic Router  (LLM 미개입, 규칙 매칭)
├─ Testament Dispatcher  (OT / NT 분기)
├─ Task Graph → Sub-agent 스폰
│   ├─ Opus (학술 desc · 크리티컬 · 필요시)
│   └─ Haiku (반복·기계 편집)
├─ 5-Layer Validation Pipeline
└─ Git Safety Layer  (커밋·stash·롤백)
```

## 🧠 모델 라우팅 매트릭스

| 작업 유형 | 모델 | reasoning | 이유 |
|---|---|---|---|
| structural rules `desc` (학술 인용) | Opus 4.7/4.8 | medium | 학자명·표준 개념 정확도 |
| macro pivots/arcs/sections | Sonnet 4.6 (본체) | off | 신학적 판단, 본체가 |
| chapter agenda 요약 | Haiku 4.5 | off | 정형 문장 |
| manualDiscourse 매핑 | Haiku 4.5 | off | 마커 이름 매핑 |
| disputedRanges (본문비평) | Opus 4.7 | medium | 사본 시글 정확도 |
| JSON Edit/Write | Haiku 4.5 | off | 기계적 |
| 노션 API·git | Haiku 4.5 | off | 저비용 반복 |
| 검증 스크립트 실행 | 본체 (Sonnet) | off | 결과 판단 |

**금지**: 로컬 LLM 7B급 위임 (Ollama qwen2.5:7b 실험 실패 · 2026-07-25).

## 🚦 5-Layer 검증 파이프라인

### Layer 1: Structural (실행 전)
- JSON 문법
- 필수 필드 완결성 (id · book · chapters · discourseRules · meta · macro)
- verse 상한 (`verse_counts.json` 대조)
- 마커 whitelist (discourseRules.id 집합)
- verse 넘버링 mismatch 자동 예외 (`verse_mismatch.json`)

### Layer 2: Content (학술 정확도 · Testament별)
- **NT**: 학자 whitelist + 그리스어 lemma + 사본 시글 (ℵ A B D W P75 등)
- **OT**: 학자 whitelist + 히브리어 lemma + 사본 시글 (MT · LXX · DSS · SP 등) + **refs 유의사항 필수**
- `[FLAG]` > 20% → Opus 재판정 escalation

### Layer 3: Cross-Verification (선택)
- **신규** structural desc · disputedRanges만 2-agent consensus
- 기존 재사용은 skip (토큰 절감)

### Layer 4: Build Validation
- Node import 테스트
- `scripts/validate-book-ctx.mjs` (핵심 검증)
- SBLGNT JSON serve 확인
- Vite dev 서버 상태

### Layer 5: Regression
- `scripts/regression-books.mjs` (BOOK_CONTEXTS 재import + 전체 검증)
- lex 데이터 존재 · variants JSON · id 일관성
- **Test 4b (신규)**: OT OSHB variants JSON 존재 · Ketiv/Qere 카운트

### 보조: OT 전용 검증
- `scripts/validate-ot.mjs` — OT 책만 대상. HEBREW_NARRATIVE_RULES 확인 · verse 넘버링 mismatch (창32·말4 등) · apparatus refs 표준 (NET Bible + BHS/BHQ/DSS 유의사항 · WLC 인용 명시) · witnesses 시글 whitelist · 히브리어 인용 저작권 리스크 스캔 · **Test 6 (신규)**: OSHB 커버리지
- 새 OT 책 등록 시 `regression-books.mjs` 통과 후 반드시 `validate-ot.mjs` 도 실행

## 🔧 OT Apparatus 하이브리드 시스템 v2 (Stage 3-A + 3-B · 2026-07-25 확립)

### Stage 3-B · SP-MT 자동 대조 (오경 전용 · v2 신규)

**정책**: Samaritan Pentateuch(SP) vs Masoretic Text(MT) 자음 텍스트 자동 대조 · 오경 5권 (창-신).

- **소스 SP**: DT-UCPH SP dataset (CC BY-NC 4.0 · MS Chester Beatty 751 + MS Garizim 1 · Schorch ed.)
- **소스 MT**: OSHB WLC XML (CC BY 4.0)
- **파이프라인**:
  1. `python3 scripts/extract-sp-verses.py` — text-fabric로 SP 텍스트 추출 → `scripts/data/sp-verses.json` (805KB · 커밋됨)
  2. `node scripts/parse-sp-mt.mjs [BookId]` — SP JSON + MT XML 자음 대조 · variants JSON 생성 · source='sp-mt'
- **필터**: matres lectionis 정규화 후 편집 거리 ≥ 8% (짧은 절 ≥ 15%) — 유의미한 텍스트 차이만
- **CI 통합**: deploy.yml에 parse-sp-mt.mjs 스텝 추가 (Python 불필요 · JSON 커밋됨)
- **UI 배지**: 🤖 자동 (SP-MT 대조) · 보라색 (`#7c3aed` · `#f3e8ff`)

**커버리지 실측 (2026-07-25)**:
- Gen: 217건 · Exod: 260건 · Lev: 89건 · Num: 153건 · Deut: 162건
- **총 SP-MT 자동 881건** (오경 · 1533+1203+859+1289+957 = 5,841절 스캔)
- 병합 후 오경 5권 총 apparatus: **~950건** (OSHB K/Q + SP-MT + curated)

**refs 표준 4줄** (SP-MT):
```javascript
refs: [
  'DT-UCPH SP (Text-Fabric 4.1.3 · CC BY-NC 4.0) · Højgaard, Naaijer, Schorch (2023)',
  'MS Chester Beatty Library 751 + MS Garizim 1 (Schorch critical editio maior)',
  'WLC (파블릭 도메인) · openscriptures/morphhb MT 대조',
  '⚠ 자동 감지 · Tal (1994) · Florentin (2005) · BHS SP 각주 학술 검증 권장'
]
```

## 🔧 OT Apparatus 하이브리드 시스템 (Stage 3-A · 2026-07-25 확립)

**정책**: OT 이문 = **OSHB 자동(Ketiv/Qere) + curated 수동(신학 결정적 지점)** 병기.

### 자동 · OSHB Ketiv/Qere
- 소스: openscriptures/morphhb WLC XML · **CC BY 4.0**
- 스크립트: `scripts/parse-oshb.mjs [BookId]` — XML 다운로드·파싱·JSON 생성
- 출력: `public/data/variants/{OTBook}.json` · `source: "oshb"` 필드
- 커버리지 (예상): 39권 총 ~1,050건 (오경 67·역사서 250·시가서 150·예언서 500)
- refs 표준: `OSHB (openscriptures/morphhb · CC BY 4.0)` + `WLC 파블릭 도메인 K/Q 자동 파싱` + `⚠ 학술 검증 권장`

### 수동 · Curated
- 신학·번역 결정적 지점 (권당 5-15건)
- `src/data/textualVariants.js` VARIANTS 배열에 하드코딩
- `source` 필드 없음 (또는 `source: "curated"`)
- refs 표준: `WLC` + `NET Bible 각주` + `⚠ BHS·BHQ·DSS 대조 권장` 3줄

### UI 시각 구분 (VariantPopup)
- 🤖 자동 (OSHB K/Q): 청록 배지 (`#0f766e` · `#ccfbf1`)
- 🤖 자동 (SBLGNT): 파랑 배지 (`#0369a1` · `#e0f2fe`)
- ✍️ 큐레이션: 앰버 배지 (`#b45309` · `#fef3c7`)

### CI 통합 (`.github/workflows/deploy.yml`)
```yaml
- name: Build SBLGNT apparatus variants (NT 사본 이문 JSON)
  run: node scripts/parse-sblgnt.mjs
- name: Build OSHB Ketiv/Qere variants (OT 마소라 K/Q 자동 이문)
  run: node scripts/parse-oshb.mjs
```

### 신규 OT 책 등록 절차 확장
1. `bookContext.js` 등록 (기존)
2. `textualVariants.js` VARIANTS에 curated 이문 append (기존 · 표준 3줄 refs)
3. **신규**: 자동으로 OSHB Ketiv/Qere 로드됨 (parse-oshb.mjs가 39권 처리)
4. `validate-book-ctx.mjs {BookId}` (Layer 1·4)
5. `regression-books.mjs` (Layer 5 · Test 4b OSHB JSON 확인)
6. `validate-ot.mjs` (OT 전용 · Test 6 OSHB 커버리지 확인)

**어느 Layer든 FAIL → 자동 git stash → 롤백 → 사용자 알림**

## 🛡️ 할루시네이션 3중 방어

1. **Whitelist Gate** — 학자·시글·마커 이름은 사전 등록만
2. **2-Agent Consensus** — 크리티컬 항목만 독립 두 답변 diff
3. **Ground Truth 대조** — verse는 `bibleBooks.js` · SBLGNT · WLC · NET Bible

## 📚 저작권 준수 (필수)

### 한글 번역
- ✅ **개역한글(1961)** — 파블릭 도메인
- ❌ **개역개정(1998)** — 저작권, 금지

### NT 원문·비평장치
- ✅ SBLGNT (Faithlife/SBL, CC BY 4.0)
- refs: `"SBLGNT Apparatus (Faithlife/SBLGNT, CC BY 4.0)"`

### OT 원문·비평장치
- ✅ WLC (Westminster Leningrad Codex, 파블릭 도메인)
- ❌ BHS/BHQ (저작권, 무단 복사 금지)
- ✅ 수동 큐레이션 + NET Bible 대조
- refs: `["NET Bible 각주 기반 큐레이션 (netbible.org)", "⚠ 학술 검증: BHS·BHQ·DSS 1차 자료 대조 권장"]` **필수 표기**

## 📂 인프라 파일 구조

```
memory/
├─ bible_agent_routing.md         ← 본 문서
├─ project_context_bible.md       ← 프로젝트 지식 요약
└─ whitelists/
    ├─ verse_counts.json          ← ✅ 66권 chapter/verse 상한 (STEPBible 실측)
    ├─ verse_mismatch.json        ← ✅ chapter 경계·시편 표제·사본 논쟁절
    ├─ nt_scholars.json           ← 🚧 Stage 2
    ├─ ot_scholars.json           ← 🚧 Stage 2
    ├─ nt_sigla.json              ← 🚧 Stage 2
    ├─ ot_sigla.json              ← 🚧 Stage 2
    ├─ greek_lemma.json           ← 🚧 Stage 2
    └─ hebrew_lemma.json          ← 🚧 Stage 2

bible-mindmap/scripts/
├─ parse-sblgnt.mjs               ← 기존 (SBLGNT variants 파서)
├─ build-lexicon.mjs              ← 기존 (STEPBible lex 빌더)
├─ generate-verse-counts.mjs      ← ✅ Stage 1 · verse_counts.json 생성기
├─ validate-book-ctx.mjs          ← ✅ Stage 1 · Layer 1·4 (개별 책 검증)
├─ regression-books.mjs           ← ✅ Stage 1 · Layer 5 (전체 스모크)
├─ validate-ot.mjs                ← ✅ OT 전용 · HEBREW rules · verse mismatch · apparatus refs · 시글 · 저작권
├─ parse-wlc.mjs                  ← 🚧 Stage 3 (OT 원문 파서)
└─ verify-scholars.mjs            ← 🚧 Stage 2 (Layer 2)
```

## 🚦 사용자 승인 지점

| 시점 | 승인 필요? |
|---|---|
| 새 책 추가 요청 접수 | ❌ 자동 시작 |
| SBLGNT/WLC parse | ❌ 자동 |
| bookContext.js Edit | ❌ 자동 (Layer 4·5 PASS 시) |
| **[FLAG] 발생** | ✅ 필수 |
| **whitelist 확장** | ✅ 필수 |
| 노션 append (add-only) | ❌ 자동 |
| **git commit** | ✅ 필수 (책별 원자 커밋) |
| **git push** | ✅ 필수 (명시 요청 시만) |
| Layer 4·5 실패 rollback | ⚠️ 자동 실행 + 알림 |
| 대량 작업 (5권 이상) | ✅ 필수 (토큰 예산 확인) |

## 📝 Git 정책

- **커밋 단위**: 책별 원자 커밋 (bookContext.js + variants JSON + memory + 노션 로그 모두 포함)
- **커밋 메시지 표준**: `feat(context-bible): {책명}({id}) 등록 · SBLGNT {N}건 · pivots {P} · arcs {A}`
- **푸시**: 사용자 명시 요청 시에만 — [[feedback_github_push_policy]] 규칙 준수
- **롤백**: Layer 4·5 실패 시 git stash 자동

## 📖 신규 성경 등록 표준 절차 (누가복음 케이스 · Stage 4)

```bash
# ── 준비 (자동) ────────────────────────────────────
# ① lex 데이터 존재 확인 (public/data/lex/{gnt|hot}/{Book}/*.json)
# ② NT라면: parse-sblgnt.mjs BOOKS_TO_PROCESS에 추가 → variants JSON 생성
# ③ NT라면: textualVariants.js SBLGNT_BOOKS에 추가

# ── 컨텍스트 작성 (Opus + Haiku subagent) ─────────
# ④ MAT_CTX/MRK_CTX 패턴 참조 (템플릿)
# ⑤ Opus subagent: structural rules desc (학자 인용)
# ⑥ Haiku subagent × 2: chapterAgenda · manualDiscourse
# ⑦ 본체: macro sections/pivots/arcs (신학적 판단)
# ⑧ bookContext.js에 LUK_CTX append + BOOK_CONTEXTS 등록

# ── Layer 1·4 검증 (자동) ─────────────────────────
node scripts/validate-book-ctx.mjs Luke

# ── Layer 5 회귀 (자동) ────────────────────────────
node scripts/regression-books.mjs

# ── UI 검증 (수동 · 사용자) ────────────────────────
npm run dev
# → 브라우저 강력 새로고침 + 문맥 성경 모달 인터랙션 확인
# → apparatus 아이콘 · 관주 팝업 · 담화 마커

# ── 커밋·푸시 (사용자 승인) ───────────────────────
git add -- src/data/bookContext.js src/data/textualVariants.js scripts/parse-sblgnt.mjs public/data/variants/Luke.json
git commit -m "feat(context-bible): 누가복음(Luke) 등록 · SBLGNT N건 · pivots P · arcs A"
# git push origin main  ← 명시 승인 후에만
```

## 📊 자동 vs 수동 검증 스코프

| 검증 항목 | 자동 | 수동 |
|---|---|---|
| JSON 문법 · verse 유효성 · 학자·시글 whitelist · Node import · 데이터 무결성 · Vite 서버 | ✅ | |
| **브라우저 UI 렌더링 · 아이콘 표시 · 문맥 성경 모달 인터랙션** | ❌ | ✅ 필수 (Cmd+Shift+R + 콘솔 로그) |

## 🔖 UI 표시 규칙 · 사본 논쟁절 안내 (2026-07-25 확립 · 필수)

**규칙**: `disputedRanges` 절은 UI에서 **대괄호 `[ ]` + 빨간색** 로 표시. 사용자 이해를 돕기 위해 반드시 **범례·툴팁·설명** 3중 안내 병기.

### 표시 방식
- 대괄호 `[` `]` — Times New Roman · fontWeight 900 · 색 `#dc2626`
- 절 본문 자체도 `color: #dc2626, fontWeight: 700`
- 각 대괄호에 `title=` 툴팁 (사본 논쟁 설명 + disputed.label)
- 문맥 성경 모달 상단 범례에 `[ ] 사본 논쟁절` 칩 노출 (title에 정의·예시·이용법)

### 안내 문구 표준 (범례 툴팁)
```
⚠ 사본 논쟁절: 대괄호 [ ]와 빨간색은 고대 사본들 사이에서 원문 여부가 논쟁되는 본문임을 표시합니다.
예: 마 6:13 주기도문 송영·요 5:4 천사·요 7:53-8:11 간음한 여인·눅 22:43-44 겟세마네 피땀.
자세한 사본 정보는 옆의 ✎ 아이콘을 눌러 확인하세요.
```

### 각 대괄호 개별 툴팁 (verse 단위)
- 시작 대괄호 `[`: `⚠ 사본 논쟁절 · {disputed.label} — 대괄호 [ ]와 빨간색은 고대 사본들 사이에서 원문 여부가 논쟁 되는 본문임을 표시합니다. 자세한 이문은 옆의 ✎ 아이콘을 눌러 확인하세요.`
- 끝 대괄호 `]`: `⚠ 사본 논쟁절 끝 · {disputed.label}`

### 위치
- `src/components/ContextBibleModal.jsx` (렌더링 · 범례 legend row + [ ] span)
- 신규 책 등록 시 `disputedRanges` 필드에 등록만 하면 자동으로 UI 반영됨

### 근거
사용자 피드백 (2026-07-25): "왜 [ ]와 빨간색으로 표시했는지 설명이 없어 의문이 생김". 접근성·이해도 향상 위해 규칙 고정.

---

## 📋 meta 배경 작성 표준 (2026-07-29 확립 · 로마서 스타일)

**핵심**: 모든 책의 `meta` 6개 note 필드는 **로마서 스타일** 준수. 학자 논쟁·연대 논쟁·저자 논쟁 배제 · 일반 독자 친화.

### 규칙 (각 note 필드)
1. **길이**: 한 줄 · 15-25자 · 두 줄 넘기지 말 것
2. **학자 이름 금지**: Bruce·Malherbe·Attridge 등 학자 인용 배제 (structural desc에만 유지)
3. **논쟁 표현 배제**: "친서설 vs 학파설" · "전통 vs 비평" 등 배제 · 대표 견해만 명시
4. **verse 인용 최소**: "행 17:5-10 참조" 같은 참조 나열 배제
5. **원어**: theme·themeNote에만 최소 (예: πλήρωμα · κένωσις)
6. **인용문 최소**: "각하 데오빌로" 등 결정적 인용만
7. **필드**: genre·genreNote·year·yearNote·place·placeNote·author·authorNote·audience·audienceNote·theme·themeNote

### 표준 예시 (Rom · 준수)
```javascript
genre: '신약 서신서 · 바울서신',
genreNote: '교리적 논문에 가까운 조직신학 · 순회 서신',
year: 'AD 57년경',
yearNote: '3차 전도여행 말미, 예루살렘행 직전',
place: '고린도 (겐그레아 항구 인근)',
placeNote: '가이오의 집 (롬 16:23) · 뵈뵈 집사가 편지 전달',
author: '사도 바울',
authorNote: '더디오가 대필 (롬 16:22)',
audience: '로마 교회 성도들',
audienceNote: '유대인·이방인 혼합, 대부분 미방문',
theme: '하나님의 의 (δικαιοσύνη θεοῦ)',
themeNote: '이신칭의 복음 — 유대인·이방인 모두에게',
```

### 지양 예시 (❌ · 이전 Eph)
```javascript
year: 'AD 60-62 (로마 감금기 · 전통) 또는 AD 80-100 (후기 저작설)',
authorNote: '바울 친서 지지: Bruce·O\'Brien·Hoehner·Thielman·Arnold. 학파설: Lincoln·Best·Käsemann·Barth · 문체 이례성·긴 문장·교회론 발전',
```

### 지향 예시 (✅ · 수정 후 Eph)
```javascript
year: 'AD 60-62년경',
authorNote: '옥중서신 그룹',
```

### 등록자 책임
- 신규 책 등록 시 이 스타일 준수 필수
- 학술 정확도는 structural rules `desc` 필드로 이동 (거기는 학자 인용 OK)
- meta는 일반 독자용 · desc는 학술용 분리 원칙

## 📋 chapterAgenda 작성 표준 (2026-07-29 확립 · 로마서 스타일)

**핵심**: 각 장 요약은 **로마서(ROM_CTX) 스타일** 준수. 짧고 함축적 · 핵심 주제만.

### 규칙
1. **길이**: 각 장 5-25자 · 명사구 · "~하고" 형태 금지
2. **verse 번호 최소**: `(3:16)` 처럼 특정 verse 강조 필요 시만 · 대량 나열 금지
3. **인용문 최소**: `"사는 것이 그리스도"` 등 결정적 절만 · 나머지 배제
4. **원어**: 학술 필수 어휘만 (κένωσις·πλήρωμα·ἀγάπη·מנחה 등)
5. **구분자**: `·` (middle dot) 3-5개 이내로 주제 나열
6. **부연 괄호**: `(사도적 정통 계승)` 등 부연 최소화 · 핵심에 흡수

### 표준 예시 (Rom · 이미 준수)
```javascript
1:  '인사·복음의 능력·이방인의 죄',
2:  '유대인의 죄·율법의 무능',
3:  '모든 인류의 죄·이신칭의 선언 (3:21-26)',
4:  '아브라함의 믿음 — 이신칭의의 원형',
8:  '성령 안의 삶·하나님의 사랑 (절정)',
```

### 지양 예시 (❌)
```javascript
// 너무 길고 verse 번호 대량 · 인용문 나열
1: '인사(바울·디모데)·감사(1:3-11 첫날부터 교제)·바울 매임 = 복음 진보(1:12-26 시위대·가이사 집·살든지 죽든지 그리스도 존귀·1:21 "사는 것이 그리스도")·복음 합당한 생활(1:27 시민권 동사)',
```

### 지향 예시 (✅)
```javascript
1: '인사·감사·바울 매임 = 복음 진보·사는 것이 그리스도·시민권 동사',
```

### 등록자 책임
- 신규 책 등록 시 반드시 이 스타일 준수
- Layer 1·4 (validate-book-ctx.mjs) 는 스타일 검증 X · 사람 검토 필요
- 이미 등록된 21권 리팩터 완료 (커밋 예정)

## 🌉 Arc UX 자동 상속 계약 (2026-07-26 확립 · 시스템 규칙)

**핵심**: `bookContext.js` 의 `macro.arcs` 를 표준 스키마대로 작성하면 **모든 UX 자동 활성화**. 신규 등록·색상 추가·arc 개수 변동 어느 것도 별도 UI 코드 수정 불필요.

### 데이터 요건 (필수)
```javascript
arcs: [
  { id: 'aN', from: 'pM', to: 'pK', color: '#7c3aed', label: '축 설명' },
  // from/to 는 반드시 같은 책 pivots.id 값 참조
  // Layer 1·4 검증(validate-book-ctx.mjs)이 자동 fail 처리
]
```

### 자동 활성화되는 UX (2026-07-26 · commit 예정)
| 액션 | 자동 반영 결과 |
|---|---|
| **Arc hover** | Arc 곡선 강조 + **두 endpoint pivot dot 모두 halo·확대** + tooltip에 **"장:절 ↔ 장:절"** endpoint 명시 |
| **Pivot hover** | Pivot halo + **그 pivot을 endpoint로 하는 모든 arc 자동 강조** (opacity 0.85 · strokeWidth 1.6) |

### 시스템 계약 조항
1. **컬러 무관**: `macroLayout.arcs.map(a => …)` 순회 · 색상별 분기 없음
2. **책별 무관**: `ContextBibleModal.jsx` 단일 소스 · 21권 전체 + 미래 등록 자동 상속
3. **등록자 책임**: `arc.label` 명확성 + `pivots[i].{ch,verse,label}` 정확성만 관리
4. **UI 코드 손대지 말 것**: `ContextBibleModal.jsx` 는 UX 계약 소스 · 신규 책 등록으로 인해 수정 필요 없음

### 관련 문서
- Notion 🔧 UX·모바일 이력 · `#🌉-arc-양방향-시각화-v2`
- Notion 🏗 시스템 아키텍처 · bookContext.js 스키마 · Arc UX 자동 상속 계약
- 관련 컴포넌트: `src/components/ContextBibleModal.jsx` (line ~1475 arc map · ~1502 pivot map · ~1537 tooltip)

## 🗺️ verse 넘버링 mismatch 대응

`verse_mismatch.json` 자동 대조:
- 시편 표제 offset · 창세기 32장 · 말라기 4장 · 요엘 3장 (chapter 경계)
- Rom 16:24 · Mark 16:9-20 · John 7:53-8:11 등 (사본 논쟁절 → verse 상한 초과 허용)

## 🔄 롤백·재시도 정책

- **자동 롤백**: Layer 1-5 어느 단계든 REJECT
- **재시도**: attempt 1 (기본) → 2 (실패 원인 명시 + Opus) → 3 (본체 직접) → 사용자 중단 알림
- **git 안전**: 편집 전 자동 stash · 실패 시 pop

## 💰 토큰 회계 (예상)

### NT 책 1권 (누가복음 예시)
- SBLGNT parse: 0
- Opus × 1 (structural desc): ~10K
- Haiku × 2 병렬 (agenda·manualDiscourse): ~6K
- 본체 (macro pivots/arcs): ~5K
- 통합·검증·노션·리포트: ~9K
- **Total: ~33K** (Opus 단독 ~150K 대비 **78% 절감**)

### OT 책 1권
- **Total: ~50K** (**65% 절감**)

## 🔄 세션 재개 시스템 (v2 신규)

**새 세션 부팅 시 표준 절차**:
1. `MEMORY.md` 최상단 · [[SESSION_STATE]] 링크 확인
2. `memory/SESSION_STATE.md` 읽기 (< 300 토큰) — 현재 작업·다음 스텝·미커밋·주의사항
3. 「즉시 다음 스텝」 실행 가능 여부 판단 · `git status`로 실제 상태 대조
4. 사용자에게 상태 요약 (2-3줄) + 다음 스텝 확인 요청
5. 필요 시에만 상세 파일/Notion 참조 (컨텍스트 절감)

**의무 업데이트 시점** (현재 세션이 SESSION_STATE 갱신해야 하는 시점):
- ✅ 사용자에게 완료 보고 직전
- ✅ 새 책 등록·정책 변경·인프라 파일 추가 후
- ✅ 커밋·푸시 실행 후
- ✅ 사용자가 "저장·기억·기록" 요청 시

**크기 규칙**: SESSION_STATE.md ≤ 2KB · 오래된 결정사항은 [[project_context_bible]] 로 마이그레이션.

## ⚡ 즉시 참조 트리거

이 문서는 다음 상황에서 반드시 로드:
- "새 성경 추가/등록" · "누가·마태·요한 등 새 책 이름"
- "문맥 성경 확장" · "66권 로드맵"
- "비평장치·apparatus" · "SBLGNT/WLC 파싱"
- "검증 실패/롤백"
- 관련 메모리: [[project_context_bible]] · [[feedback_github_push_policy]]

## 📖 상태 (2026-07-25)

- **등록 6/66권**: Gen · Exod · Rom · Ruth · Matt · Mark
- **Stage 1 완료**: verse_counts · verse_mismatch · validate-book-ctx · regression-books · 본 문서
- **Stage 2 대기**: whitelists (scholars · sigla · lemma) + verify-scholars.mjs
- **Stage 3 대기**: parse-wlc.mjs (OT 원문)
- **Stage 4 대기**: 누가복음 실전 검증
