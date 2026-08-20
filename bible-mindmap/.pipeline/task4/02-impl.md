# Task 4 · 히브리어 원어 표시 정상화 구현

## 기준
- base: `ce02c72f1900df882030176176c9b224835f37d7` (`main`, #385)
- branch: `pipeline/task-hebrew-text-normalize`
- delivery: Draft PR only · Ready/merge 금지

## 구현
### 1. TAHOT 표시 정규화
공용 헬퍼: `src/utils/hebrewDisplay.js`

- 표시용 `w`에서 STEPBible 형태소 구분자 `/` 제거
- 표시용 `w`에서 STEPBible 결합 표시 `\\` 제거
- 정규화 뒤 U+05BE HEBREW MAQAF(`־`)로 끝나는 어절은 `displayJoinNext`를 부여해 다음 어절과 공백 없이 렌더링
- 원본 객체는 spread 복제하고 `w`/`displayJoinNext`만 표시용으로 변경하므로 `s`(Strong), `m`(형태론), `l`, `g` 등 조회 데이터는 보존
- `bibleApi.js`는 `hot` corpus의 비선택 노드 표시 문자열만 `joinHebrewDisplayWords()`를 사용
- `lexicon.js`는 `loadChapterLexicon()`에서 `lang === 'hot'`일 때만 chapter의 표시용 `w`를 정규화. `gnt`/`lxx` 데이터는 그대로 반환
- `VerseNode`는 loader가 계산한 `displayJoinNext`만 사용해 마케프 뒤 공백을 생략하며 자체 문자 정규화는 수행하지 않음

### 2. Noto Serif Hebrew 웹폰트
- `index.html`의 기존 Google Fonts 요청 한 개에 `Noto Serif Hebrew` 400/700을 추가. 별도 요청/로컬 폰트 파일 추가 없음
- 히브리어 전용 stack에서 설치형 SBL/Ezra 계열을 앞에 유지하고 `Noto Serif Hebrew`를 `serif` 전에 추가
- 적용 대상: VerseNode, SyntaxPanel, ArcingPanel, CanonicalConceptModal, ParallelView
- WordSearchModal은 base에서 이미 `Noto Serif Hebrew`가 히브리어 stack에 포함되어 있어 변경하지 않음
- Gentium Plus 기반 헬라어 stack은 변경하지 않음

## 원자료/표시 확인
`data-dist:data/lex/hot/Gen/1.json` 창 1:1-3 원자료는 27어절이며 `/` 12개, `\\` 6개를 포함한다.

정규화 예:
- `בְּ/רֵאשִׁ֖ית` → `בְּרֵאשִׁ֖ית`
- `הָ/אָֽרֶץ\\׃` → `הָאָֽרֶץ׃`
- `עַל\\־` + `פְּנֵ֣י` → `עַל־פְּנֵ֣י`

정규화는 `/`·`\\` 문자만 제거하므로 니쿳/테아밈 code point는 전후 동일하다. 최종 UI 실측의 결합부호 기준(요구값 110개)은 PR 검증 결과와 함께 아래에 기록한다.

## 같은 loader를 타는 다른 소비자
`loadVerseLexicon()`/`loadChapterLexicon()`을 사용하는 ParallelView, ArcingPanel, SyntaxPanel 및 lexicon 기반 팝업 계열은 동일하게 정규화된 표시용 `w`를 받는다. 이번 범위에서는 각 소비자에 별도 문자열 치환 로직을 추가하지 않았다.

## 검증
- 로컬 clone: 실행환경 DNS 제한으로 `git clone`이 불가하여 로컬 verifier/oxlint 직접 실행은 불가. 이 제한은 저장소/인증 실패와 구분한다.
- PR CI 및 browser-smoke: 최종 head 생성 후 결과 기록 예정
- 실제 페이지 흐름: 페이지 → 구약 본문 → 구절 추가 → 원어 → 렌더 텍스트 및 Strong 클릭 확인 결과 기록 예정
- CodeQL: 최종 PR check 결과에서 확인 가능한 경우 명시하고, connector에서 보이지 않으면 `확인 불가`, check 자체가 생성되지 않으면 `실행되지 않음`으로 구분한다.

## PR
- Draft PR #388
- 최종 CI: pending
