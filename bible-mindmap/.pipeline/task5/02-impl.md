# task5 · 02-impl · 구현 요약

역할 수행자: 0-lead(Claude)가 `ROLES.md` 폴백 규칙 "Codex 부재: Claude가 0-lead 겸
1-run"에 따라 1-run을 겸했다. codex-cli가 사용량 한도에 걸려(해제 2026-08-21 14:34)
두 줄 수정과 임시 워크플로 삭제까지만 수행한 뒤 중단됐다.
검증(2-review)은 구현자가 아닌 agy가 수행한다.

## 최종 변경 (`origin/main` ce02c72f 대비 3개 파일)

| 파일 | 증감 |
|---|---|
| `bible-mindmap/src/components/NodeEditor.jsx` | +14 / -3 |
| `bible-mindmap/tests/nodeeditor-tab-sync-regression.spec.js` | +182 (신규) |
| `bible-mindmap/package.json` | +1 / -1 |

이전 실행기가 올렸던 `.github/workflows/task5-nodeeditor-tab-sync-runner.yml`(삭제)과
`validate-translation-switching.yml`(main 버전 복원) 정리를 마쳐 워크플로 변경은 0건이다.

## 수정 1 — 프로그램적 `setContent`가 저장을 유발하지 않게 한다

`NodeEditor.jsx` 102행·136행

```
- editor.commands.setContent('')
+ editor.commands.setContent('', { emitUpdate: false })

- editor.commands.setContent(html)
+ editor.commands.setContent(html, { emitUpdate: false })
```

Tiptap v3(3.28.0)에서는 프로그램적 `setContent`도 `update`를 발생시킨다. 그 이벤트를
받는 핸들러(142~166행)는 직전 렌더의 `editData`를 클로저로 붙잡고 있고, 125행
`setEditData(newData)`는 비동기라 136행 시점에 아직 반영되지 않았다. 결과적으로
`activeTab='krv'`인 옛 상태로 `onUpdateNode(..., translations: { krv: <새 탭 HTML> })`이
호출되어 탭 하이라이트가 고정되고 개역한글 슬롯이 덮였다.

## 수정 2 — 계획에 없던 추가 수정 (사유 기록)

`NodeEditor.jsx` 131~139행. 수정 1만 적용하고 검증하니 **노드 본문은 정상 복귀하는데
편집기 패널에는 직전 탭 내용이 남는** 현상이 나왔다.

측정 (`개역한글` → 타이핑 → `WEB` → `개역한글`):

```
시작(개역한글)   노드[14요한이 잡힌 후 …]   편집기[14요한이 잡힌 후 …]
타이핑 후        노드[14요한이 잡힌 후 …]   편집기[14요한이 잡힌 후 …]
→ WEB            노드[14Now after John …]   편집기[14Now after John …]
→ 개역한글 복귀  노드[14요한이 잡힌 후 …]   편집기[14Now after John …]   ← 어긋남
```

원인은 `lastLocalEditRef` 가드다. 저장 기록(`nodeId`·`tab`·`html`)만 비교하고 편집기가
실제로 그 html을 들고 있는지는 보지 않는다. 탭을 왕복하면 기록은 일치하지만 편집기에는
직전 탭 내용이 남아 있어 `setContent`를 건너뛰고 그대로 굳는다. 이 상태에서 사용자가
타이핑하면 **직전 탭 내용이 현재 탭 슬롯에 저장되어** 수정 1이 막으려던 손실이 다른
경로로 재발한다. 그래서 같은 결함의 잔여 경로로 보고 이번 범위에 포함했다.

가드 조건에 `editor.getHTML() === html`을 추가했다. 가드 본래 목적(매 keystroke마다
커서·선택이 리셋되는 것을 막는 것)은 그대로다 — 타이핑 중에는 편집기가 이미 그 html을
들고 있으므로 여전히 조기 반환한다.

수정 후 같은 절차에서 편집기가 `14요한이 잡힌 후 …`로 정상 복귀함을 확인했다.

## 수정 3 — 회귀 테스트를 CI에 등록

`package.json`의 `test:smoke`에 `tests/nodeeditor-tab-sync-regression.spec.js`를 추가했다.
CI(`validate-pr.yml:203`)는 전체 스위트가 아니라 `npm run test:smoke`를 돌린다. 등록하지
않으면 테스트가 저장소에 있어도 **CI에서 한 번도 실행되지 않는다.**

## 회귀 테스트

이전 실행기가 작성한 spec을 유지하되 두 곳을 고쳤다. 판정 기준은 완화하지 않았다.

- **캐럿 위치** — `End`는 줄 끝까지만 가서 본문이 줄바꿈되면 마커가 중간에 박혔다.
  `ControlOrMeta+A` 후 `ArrowRight`로 바꿔봤으나 ProseMirror에서 선택이 접히지 않아
  **본문 전체를 덮어썼다.** DOM `Range.collapse(false)`로 문서 끝에 캐럿을 직접 두도록
  바꿨다.
- **어설션 추가** — 위 덮어쓰기를 통과시켜버린 원인이 마커 끝 검사(`/\[편집보존\]$/`)
  하나뿐이었기 때문이다(`" [편집보존]"`도 이 패턴을 만족한다). 원문 잔존 검사
  `toContain('요한이 잡힌 후')`를 함께 넣었다.

실행: `npx playwright test tests/nodeeditor-tab-sync-regression.spec.js --project=chromium`
→ **1 passed (2.8s)**

`TASK5_TRACE_JSON` snapshots:

| 단계 | 활성 탭 | 본문 언어 | 앞 40자 |
|---|---|---|---|
| 시작 | 개역한글 | 한글 | 요한이 잡힌 후 예수께서 갈릴리에 오셔서 15하나님의 복음을 전파하시며 |
| 원어 | 원어 | 헬라 | Μετὰ δὲ τὸ παραδοθῆναι τὸν Ἰωάννην ἦλθεν |
| WEB | WEB | 영어 | Now after John was arrested, Jesus came |
| 개역한글 복귀 | 개역한글 | 한글 | 요한이 잡힌 후 예수께서 갈릴리에 오셔서 15하나님의 복음을 전파하시며 |
| 직접편집 후 WEB | WEB | 영어 | Now after John was arrested, Jesus came |
| 직접편집 후 개역한글 복귀 | 개역한글 | 한글 | 요한이 잡힌 후 예수께서 갈릴리에 오셔서 15하나님의 복음을 전파하시며 |

`directEdit`: `persisted: true`, `boldPreserved: true`, `colorPreserved: true`.
`emitUpdate:false`가 실제 사용자 편집 저장까지 막지는 않음을 확인했다.

## 검증 결과

| 항목 | 결과 |
|---|---|
| `npm run lint` (oxlint) | 0 errors / 기존 warning만 (신규 warning 없음) |
| `npm run test:smoke` (CI가 돌리는 것) | **20 passed** (기존 19 + 신규 1) |
| `--project=webkit-iphone` lexical-bridge 2종 | **2 passed / 1 skipped** (skip은 데스크톱 전용 케이스) |
| `git diff origin/main --stat` | 3개 파일, 워크플로 변경 0건 |

## 로컬에서 확인하지 못한 것

- 전체 스위트(`npx playwright test`)는 `tests/lexicon-license-safe-provenance-contract.spec.js`와
  `tests/morphology-korean-ui-contract.spec.js`가 미설치 패키지 `@playwright/test`를 import 해
  수집 단계에서 실패한다. **main에서도 동일한 상태**이며(해당 파일 최종 변경 #137) CI는
  전체 스위트가 아니라 `test:smoke`를 돌리므로 이번 변경과 무관하다. 손대지 않았다.
- CodeQL 등 PR CI 최종 판정은 push 후 확인한다.

## 남아 있는 위험

`editor.on('update')` 핸들러가 직전 렌더의 `editData`를 클로저로 붙잡는 구조 자체는
그대로다. 이번 수정은 그 클로저를 부르는 **프로그램적 트리거를 끊고**, 편집기·노드가
어긋난 채 굳는 경로를 막은 것이다. 사용자 입력과 상태 갱신이 한 프레임 안에서 교차하는
다른 경로가 있다면 같은 종류의 오염이 재발할 수 있다. 상태 구조 리팩터링은 범위를
넘어서므로 하지 않았고, 별건으로 남긴다.
