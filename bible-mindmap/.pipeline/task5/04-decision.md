# task5 · 04-decision · 최종 판정

**판정: PASS — 병합 대기 (Draft 유지)**

PR [#389](https://github.com/parkminhyun0/bible-mindmap/pull/389) ·
브랜치 `pipeline/task-nodeeditor-tab-sync` · HEAD `89a91fd4` · base `ce02c72f`

## 근거

### PR CI — 12개 체크 전부 PASS

| 체크 | 결과 |
|---|---|
| **CodeQL** | pass |
| Analyze (actions / javascript-typescript / python) | pass |
| **browser-smoke** | pass (2m35s) |
| verify-and-build | pass |
| verify ×2 | pass |
| security-audit | pass |
| verify-four-llm-evidence-contract | pass |
| verify-resume-checkpoint | pass |
| lexicon-human-approval | pass |

CodeQL은 이 저장소의 blocking 체크이며 로컬 검증으로는 잡히지 않는다. 이번에는
`browser-smoke`가 신규 회귀 테스트를 **실제로 실행한 상태**로 통과했다 —
`package.json`의 `test:smoke`에 등록했기 때문이다. 등록하지 않았다면 테스트가
저장소에 존재해도 CI에서 한 번도 돌지 않았을 것이다.

### 2-review (agy) 독립 검증 — PASS

구현을 0-lead가 겸했으므로(`ROLES.md` 폴백: "Codex 부재: Claude가 0-lead 겸 1-run")
"구현한 모델이 자기 구현을 검증하지 않는다"는 공통 원칙에 따라 agy가 검증했다.
회귀 테스트 1건, smoke 20건, lint 0 errors, prebuild, 프로덕션 빌드 전부 통과.
계획에 없던 가드 조건 추가에 대해서도 사유가 타당하다고 판정했다.
`03-review.md` 참조.

### 해결된 결함

노드를 선택한 상태에서 번역 탭을 바꾸면 개역한글 슬롯이 직전 탭 내용으로 덮여
본문이 사라지던 데이터 손실을 고쳤다. 노드 데이터는 저장되므로 사용자가 인지하지
못한 채 한글 본문을 잃는 상태였다.

부수적으로 원어 단어별 사전 조회(`renderOriginalWithLexicon`)가 복구된다. 이 기능은
`selected && activeTab === 'original'`을 요구하는데, 노드를 선택하면 `activeTab`이
krv로 되돌아가 조건이 성립하지 않았다.

## 범위 이탈 점검

계획서(`01-plan.md`)는 `setContent` 2행 수정을 명세했으나 실제로는 3건이 되었다.

1. `setContent` 2곳 — 계획대로
2. `lastLocalEditRef` 가드 조건 강화 — **계획에 없던 추가**
3. `package.json` `test:smoke` 등록 — **계획에 없던 추가**

2번은 1번만 적용한 뒤 검증에서 드러난 잔여 경로다. 노드 본문은 정상 복귀하는데
편집기 패널에 직전 탭 내용이 남고, 그 상태에서 타이핑하면 같은 손실이 다시
발생했다. 같은 결함의 다른 경로로 판단해 포함했다. 3번은 합격 기준(회귀 테스트가
CI에서 실행될 것)을 만족하기 위해 필수였다. 둘 다 `02-impl.md`에 사유를 기록했고
agy가 타당성을 확인했다.

본문 타이포그래피(크기·행간·자간), 노드 레이아웃, NodeEditor 상태 구조 리팩터링,
PR #388의 변경은 손대지 않았다.

## 실행기 전환 기록

당초 1-run을 챗 GPT에 위임했으나 해당 런타임에 `gh`와 `github.com` DNS가 없어
파일 수정이 불가능했다. 대신 CI가 소스를 패치하도록 워크플로를 주입한 상태로
PR #389가 만들어져 있었다.

- `.github/workflows/task5-nodeeditor-tab-sync-runner.yml` (신규 205행)
- `.github/workflows/validate-translation-switching.yml` (기존 CI, +175/-5)

후자는 `permissions: contents: read → write` 권한 상승, `if:`에 PR 번호 389
하드코딩, `node-version: 22 → 20` 다운그레이드, CI 스텝에서 소스 직접 패치를
포함했다. 이 저장소는 무승인 자동 병합 사고 이력이 있어 CI 쓰기 권한은 특히
위험하다고 판단해 둘 다 정리했다. 최종 diff의 워크플로 변경은 0건이다.

이후 로컬 `codex exec`으로 전환했으나 사용량 한도(해제 2026-08-21 14:34)로
중단되어, `ROLES.md` 폴백 규칙에 따라 0-lead가 1-run을 겸했다.

## 자동 병합 점검

```
draft = true · state = OPEN · mergedAt = null · mergedBy = null
```

의도치 않은 자동 병합 없음. Draft 상태를 유지하고 있다. **Ready 전환과 병합은
사용자가 수행한다.**

## 남은 일

- PR #389 병합 후 PR #388(히브리어 `/`·`\` 정규화 + Noto Serif Hebrew)을
  main 기준으로 rebase하고, 보류했던 "히브리어 단어 클릭 → Strong 어형 카드"
  검증을 정상 흐름으로 마무리한다.
- `editor.on('update')` 핸들러가 직전 렌더의 `editData`를 클로저로 붙잡는 구조는
  그대로 남아 있다. 별건으로 남긴다.
- 디자인 리뉴얼 본체(본문 13px 위계 역전, 원어·한글 타이포 규칙 미분리)는
  아직 착수하지 않았다. 시안 확인 후 진행한다.
