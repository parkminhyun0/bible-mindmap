# task5 · 선택된 구절 노드에서 번역 탭 전환이 개역한글 본문을 덮어쓰는 결함

## 판정 요약

`main`(ce02c72f)에 이미 존재하는 데이터 손실 결함이다. PR #388(히브리어 정규화)이
만든 문제가 아니며, 별도 PR(#389)로 처리한다.

## 재현 (배포 사이트 · 마가복음 1:14-15)

노드를 선택하지 **않은** 경우 — 정상.

| 조작 | 활성 탭 | 본문 언어 |
|---|---|---|
| 시작 | 개역한글 | 한글 |
| → 원어 | 원어 | 헬라 |
| → WEB | WEB | 영어 |
| → 개역한글 | 개역한글 | 한글 |

노드를 **선택한** 경우(NodeEditor 활성) — 깨진다.

| 조작 | 활성 탭 | 본문 언어 |
|---|---|---|
| 시작 | 개역한글 | 한글 |
| → 원어 | **개역한글** | 헬라 |
| → WEB | **개역한글** | 영어 |
| → 개역한글 | **개역한글** | **영어** ← 한글 본문 소실 |

마지막 행이 핵심이다. 개역한글 탭을 눌렀는데 영어가 남는다. 탭이 무반응인 것이
아니라 `translations.krv` 슬롯이 직전 탭의 HTML로 덮인 것이다. 노드 데이터는
저장되므로 사용자는 인지하지 못한 채 한글 본문을 잃는다.

### 파생 피해

단어별 사전 조회(`VerseNode.jsx` `renderOriginalWithLexicon`)는
`selected && activeTab === 'original' && lexEntries.length > 0` 일 때만 렌더된다.
노드를 선택하면 `activeTab`이 krv로 되돌아가므로 이 조건이 성립하지 않는다.
실제 추적에서도 chip 경로가 아니라 일반 본문 경로(`.rich-text-display`)가
렌더됐다. 즉 **원어 단어 클릭 → 어형·Strong 카드 기능이 현재 사용 불가**다.

## 원인

`bible-mindmap/src/components/NodeEditor.jsx`

- 136행 `editor.commands.setContent(html)` — Tiptap v3(3.28.0)에서는 프로그램적
  `setContent`도 `update` 이벤트를 발생시킨다. v2는 기본으로 발생시키지 않았고
  v3에서 기본값이 바뀌었다.
- 142~166행 `editor.on('update', handler)` — 이 핸들러는 직전 렌더의 `editData`를
  클로저로 붙잡는다. 125행 `setEditData(newData)`는 비동기라 136행 시점에는 아직
  반영 전이다. 따라서 핸들러가 `activeTab='krv'`인 옛 `editData`로
  `onUpdateNode(..., translations: { krv: <새 탭의 HTML> })`을 호출한다.
- 102행 `editor.commands.setContent('')`도 같은 부류다.

## 수정 방침

프로그램적 동기화를 사용자 편집으로 취급하지 않게 하는 **최소 수정**.

- 102행 → `editor.commands.setContent('', { emitUpdate: false })`
- 136행 → `editor.commands.setContent(html, { emitUpdate: false })`

Tiptap v3 시그니처는 `setContent(content, options)`이며 `options.emitUpdate`를 쓴다.
v2식 `setContent(html, false)`는 쓰지 않는다.

클로저가 오래된 `editData`를 잡는 구조 자체는 남는다. 이번 수정은 프로그램적
트리거를 끊는 데 한정하고, 상태 구조 리팩터링은 하지 않는다.

## 범위

**포함** — `NodeEditor.jsx` 2행, 회귀 테스트 spec, `02-impl.md`.

**제외** — PR #388의 변경(히브리어 정규화·폰트), 본문 타이포그래피(크기·행간·자간),
노드 레이아웃, NodeEditor 상태 구조 리팩터링, Tiptap 버전 변경, `memory/RESUME.json`.

## 브랜치에 이미 올라간 것의 처리

이전 실행기(챗 GPT)가 로컬 clone 불가(DNS·`gh` 부재)를 우회하려고 CI가 소스를
패치하도록 워크플로를 주입했다. 다음 두 파일은 되돌린다.

- `.github/workflows/task5-nodeeditor-tab-sync-runner.yml` — 삭제
- `.github/workflows/validate-translation-switching.yml` — `main` 버전으로 복원

복원 근거: `permissions: contents: read → write` 권한 상승, `if:`에 PR 번호 389
하드코딩, `node-version: 22 → 20` 다운그레이드, CI 스텝에서 소스 코드를 직접
패치. 이 저장소는 무승인 자동 병합 사고 이력이 있어 CI 쓰기 권한은 특히 위험하다.

`bible-mindmap/tests/nodeeditor-tab-sync-regression.spec.js`는 **유지**한다.
셀렉터를 배포 DOM에 대조해 전부 실재함을 확인했다.

| 셀렉터 | 실측 |
|---|---|
| `[role=tablist]` aria-label `성경 역본 선택` | 1개, 일치 |
| `[role=tab]` | 3개 (역본 탭은 `button`이 아니라 `role="tab"`) |
| `.at-canvas-node[data-selected="true"]` | 1개 |
| `[data-node-editor-toolbar="true"]` | 1개 |
| `.node-editor-tiptap .ProseMirror` | 1개 |
| `[title^="굵게"]` / `button[title="빨강"]` | 1개 / 2개(`.first()` 사용) |
| 픽스처 `**/data/lex/gnt/Mark/1.json` | `bibleBooks.js:45` `id: 'Mark'` 와 일치 |

## 합격 기준

1. 회귀 테스트가 **노드를 선택한 상태**에서 통과할 것. 이 결함은 미선택 시
   정상이라 기존 테스트가 전부 통과하면서 놓쳤다. 실패 시 테스트를 완화하지 말고
   코드를 고친다.
2. 탭 4단계 각각에서 활성 탭 하이라이트가 누른 탭에 있고, 본문 언어가 탭과 일치.
3. 개역한글 복귀 시 `요한이 잡힌 후`로 시작하는 한글.
4. 직접 타이핑·굵게·색상이 탭 왕복 후에도 보존될 것 (`emitUpdate:false`가 실제
   사용자 편집 저장까지 막지 않는지 확인).
5. 기존 테스트 전부 통과, verifier·oxlint PASS.
6. PR CI에서 CodeQL을 포함해 확인. CodeQL은 이 저장소의 blocking 체크다.

## 산출물

- `bible-mindmap/.pipeline/task5/02-impl.md` (1-run)
- `bible-mindmap/.pipeline/task5/03-review.md` (2-review)
- `bible-mindmap/.pipeline/task5/04-decision.md` (0-lead)

PR #389는 Draft를 유지한다. Ready 전환·병합은 사용자가 한다.
