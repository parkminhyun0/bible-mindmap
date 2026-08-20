# task5 · 2-review 검증 보고서

- 검증자: 2-review (Antigravity)
- 일시: 2026-08-20
- 대상 브랜치: `pipeline/task-nodeeditor-tab-sync` (PR #389)
- 기준 커밋: `9721d4fc52fdff672ddd3f227acc56f71bee34d0`
- 최종 판정: **PASS**

---

## 1. 검증 명령 실행 결과 요약

| 검증 항목 | 실행 명령 | 결과 | 상세 요약 |
|---|---|---|---|
| 1. 신규 회귀 테스트 | `npx playwright test tests/nodeeditor-tab-sync-regression.spec.js --project=chromium` | **PASS** | 1 passed (3.5s), `TASK5_TRACE_JSON` 6단계 스냅샷 및 서식 보존 검증 완료 |
| 2. Smoke 테스트 스위트 | `npm run test:smoke` | **PASS** | 20 passed (35.3s, 기존 19건 + 신규 회귀 1건) |
| 3. Lint 검사 | `npm run lint` | **PASS** | 0 errors (신규 경고 없음, 기존 warning만 존재) |
| 4. 사전 빌드 정적 검증 | `npm run prebuild` | **PASS** | 모바일 안전성, 정경 추적, 관찰 카드, 임베딩 등 전수 검증 통과 |
| 5. 프로덕션 빌드 | `npm run build` | **PASS** | Vite 빌드 및 PWA 번들 생성 완료 (1.20s) |
| 6. 변경 파일 범위 | `git diff origin/main --stat` | **PASS** | 5개 파일 (구현 1, 테스트 1, 설정 1, 문서 2), 워크플로 변경 0건 |

---

## 2. 세부 검증 항목별 독립 분석

### 2.1 `NodeEditor.jsx` 변경 사항과 `01-plan.md` 명세 대조 및 가드 추가 사유 평가

1. **`setContent` 호출부 `emitUpdate: false` 옵션 적용 (102행, 147행)**
   - **102행**: `editor.commands.setContent('', { emitUpdate: false });`
   - **147행** (계획 시 136행): `editor.commands.setContent(html, { emitUpdate: false });`
   - **대조 결과**: `01-plan.md` 57~58행의 Tiptap v3 `setContent(content, { emitUpdate: false })` 명세와 100% 일치합니다. 프로그램적 동기화 시 Tiptap `update` 이벤트가 불필요하게 트리거되는 것을 정확히 차단했습니다.

2. **`lastLocalEditRef` 가드 조건 강화 (131~145행, 계획 외 추가)**
   ```javascript
   const last = lastLocalEditRef.current;
   if (
     last.nodeId === selectedNode.id
     && last.tab === activeTab
     && last.html === html
     && isEditorUsable(editor)
     && editor.getHTML() === html
   ) {
     return;
   }
   ```
   - **02-impl 사유의 타당성 판단**: **매우 타당함 (필수 방어 로직)**
     - 사용자가 `krv` 탭에서 직접 타이핑하면 `lastLocalEditRef.current`에 `{ nodeId, tab: 'krv', html: 'krv_text' }`가 기록됩니다.
     - 이후 `web` 탭으로 전환하면 `setContent(web_text, { emitUpdate: false })`로 인해 편집기 DOM은 `web_text`로 바뀌지만, `lastLocalEditRef.current`는 `emitUpdate: false`로 인해 여전히 이전 `krv` 기록을 유지합니다.
     - 다시 `krv` 탭으로 복귀할 때, `editor.getHTML() === html` 가드가 없다면 `last.nodeId`, `last.tab`, `last.html`이 모두 일치하여 `return` 해버립니다. 이 경우 편집기는 여전히 `web_text`를 들고 있는 상태로 굳어버리고, 사용자가 한 글자라도 입력하는 순간 `update` 핸들러가 `web_text`를 `krv` 슬롯에 덮어써 본문이 소실됩니다.
     - `&& isEditorUsable(editor) && editor.getHTML() === html` 조건을 추가함으로써 **편집기가 실제로 대상 HTML을 보유하고 있을 때만** `setContent`를 건너뛰도록 보장했습니다.

---

### 2.2 회귀 테스트(`tests/nodeeditor-tab-sync-regression.spec.js`) 판정 기준 검토

구현자가 초기 테스트 커밋 대비 수정한 두 가지 사항을 정밀 검토했습니다:

1. **캐럿 위치 설정 방식 개선 (`page.keyboard.press('End')` → DOM `Range.collapse(false)`)**
   - 기존 `End` 키는 단일 줄 끝으로만 이동하거나 환경에 따라 동작이 달라 본문 중간에 텍스트가 삽입되는 문제가 있었습니다.
   - 또한 `Control+A` 후 `ArrowRight`를 시도할 경우 ProseMirror 내부 선택이 접히지 않아 후속 타이핑 시 본문 전체를 덮어쓰는 문제가 있었습니다.
   - 이를 DOM `Range` API를 사용하여 본문 컨테이너 끝으로 캐럿을 명시적으로 접음으로써 교차 플랫폼에서 안정적인 텍스트 덧붙이기를 보장했습니다.

2. **어설션 강화 (`toContain('요한이 잡힌 후')` 추가)**
   - 기존 검사는 정규식 `/\[편집보존\]$/` 하나만 확인했기 때문에, 만약 캐럿 오류로 본문 전체가 날아가고 ` [편집보존]`만 남더라도 테스트가 통과(False Positive)할 취약점이 있었습니다.
   - `expect((await editor.innerText()).replace(/\s+/gu, ' ')).toContain('요한이 잡힌 후');`를 추가하여 **기존 본문이 온전히 보존된 상태에서 편집 마커가 추가되었는지**를 엄격히 검증하도록 강화되었습니다.

3. **단축키 크로스 플랫폼 지원 (`Control+A` → `ControlOrMeta+A`)**
   - macOS 환경에서도 정상적으로 전체 선택 및 서식 토글(굵게, 색상)이 실행되도록 보장했습니다.

- **결론**: 테스트 판정을 완화한 것이 아니라, **거짓 통과(False Positive)를 원천 차단하고 결함을 명확히 드러내도록 어설션을 강화**했습니다.

---

### 2.3 `git diff origin/main --stat` 범위 및 워크플로 오염 여부 검증

- **`git diff origin/main --stat` 결과**:
  ```
   bible-mindmap/.pipeline/task5/01-plan.md           | 116 +++++++++++++
   bible-mindmap/.pipeline/task5/02-impl.md           | 121 ++++++++++++++
   bible-mindmap/package.json                         |   2 +-
   bible-mindmap/src/components/NodeEditor.jsx        |  17 +-
   bible-mindmap/tests/nodeeditor-tab-sync-regression.spec.js | 182 +++++++++++++++++++++
   5 files changed, 434 insertions(+), 4 deletions(-)
  ```
- **워크플로 파일 검증**:
  - `git diff origin/main -- .github/` 실행 결과 변경 사항 **0건**.
  - 이전 실행기가 임시 주입했던 runner 워크플로 삭제 및 `validate-translation-switching.yml`의 `main` 원상 복원이 확인되었습니다.
- 모든 변경이 허용된 범위 내에 정확히 머물러 있습니다.

---

### 2.4 미발견 결함 및 부작용 자체 분석

1. **`emitUpdate: false`로 인한 사용자 편집 저장 누락 가능성**:
   - `emitUpdate: false`는 `useEffect`의 프로그램적 `setContent` 호출에만 적용됩니다.
   - 사용자의 실제 키보드 타이핑, 툴바 서식 버튼 클릭(굵게, 기울임, 밑줄, 정렬, 글자색 등)은 Tiptap의 트랜잭션 명령(`runEditorCommand`)으로 실행되어 정상적으로 `update` 이벤트를 발생시키며 `onUpdateNode`를 통해 저장됩니다.
   - 회귀 테스트의 `directEdit` 스냅샷(`persisted: true`, `boldPreserved: true`, `colorPreserved: true`)을 통해 실제 저장이 완벽히 동작함을 확인했습니다.

2. **가드 강화로 인한 커서 / 선택 리셋 회귀 여부**:
   - 사용자가 타이핑하는 동안에는 `lastLocalEditRef.current`의 `html`과 `editor.getHTML()`이 동일하므로 가드 조건이 `true`가 되어 `return`합니다.
   - 따라서 매 타이핑마다 `setContent`가 재호출되지 않으며, 커서 위치 및 텍스트 선택이 리셋되는 회귀는 발생하지 않습니다.

3. **병렬 뷰 저장(`handleParallelSave`)과의 연계**:
   - 병렬 뷰에서 3열 역본을 편집하고 저장할 때 `lastLocalEditRef.current`가 갱신되며, `editor.getHTML() === html` 검사를 통해 필요한 경우에만 에디터 본문을 안전하게 갱신합니다.

---

## 3. 최종 결론

- `01-plan.md`의 목표와 수정 방침을 완벽히 충족하며, 구현 과정에서 발견된 가드 누락 버그(`02-impl.md`)까지 안전하게 보강되었습니다.
- 모든 테스트(`test:smoke`, 회귀 테스트, `lint`, `prebuild`, `build`)가 100% 통과했습니다.
- 워크플로 임시 변경이 완전히 정리되어 `origin/main` 대비 워크플로 변경 0건을 달성했습니다.
- **최종 판정: PASS**
- 후속 절차: `0-lead`의 최종 결정(`04-decision.md`) 및 사용자 확인 후 PR #389 처리 진행을 권장합니다. (코드 수정, 커밋, push, PR 병합, Ready 전환은 수행하지 않음)
