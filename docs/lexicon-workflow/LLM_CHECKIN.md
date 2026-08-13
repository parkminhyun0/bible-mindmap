# 원어 한글사전 트랙 · LLM 공통 체크인 계약

GPT, 자비스(Claude/OpenClaw), Claude, Gemini 및 다른 LLM이 원어 한글사전 작업을 시작·재개·인계할 때 사용하는 최소 계약이다. 정책 SSOT는 `v4-EVIDENCE_FIRST_AUTONOMOUS.md`다.

## 1. 시작/재개 순서

1. `AGENTS.md`
2. 최신 GitHub `main` + 관련 open PR + current exact head + diff + required CI/review/Pages 상태를 먼저 파생한다.
3. `docs/lexicon-workflow/TRACK_STATE.json`
4. `docs/lexicon-workflow/v4-EVIDENCE_FIRST_AUTONOMOUS.md`
5. `memory/RESUME.json`은 checkpoint/cache로만 읽고, GitHub-derived state와 충돌하면 현재 active PR에서 정합화한다.
6. `docs/lexicon-workflow/EXECUTOR_HANDOFF_STATE.json` (handoff/장기 작업 시 필수)
7. 필요한 경우에만 관련 Notion 관제/책·배치 카드

우선순위는 `GitHub code/state → CI/Pages → Notion → TRACK_STATE/RESUME checkpoint → chat history`다. `RESUME.json`은 volatile runtime authority가 아니다.

## 2. 체크인 보고 형식

```text
TRACK: lexicon-ko-66
MAIN: <full SHA>
PR: <number|none> @ <current head SHA>
STATE: <TRACK_STATE state/phase>
HANDOFF: <status> · <currentExecutor> · next=<nextStep>
TARGET: <book/batch/Strong/automation>
NEXT: <one executable action>
BLOCK: none | <exact blocker>
```

## 3. 충돌/중복 방지

- GitHub code/schema/state > CI/Pages > Notion > checkpoint/cache > chat history.
- 같은 active task/branch에 open PR이 이미 있으면 새 PR을 만들지 않는다.
- executor가 바뀌어도 같은 branch/PR/Evidence baseline을 유지한다.
- `completedSteps`는 재실행하지 않고 `nextStep`부터 이어간다.
- current head·diff·CI는 인계 때마다 GitHub에서 새로 조회한다.
- `TRACK_STATE.json`이나 `RESUME.json`이 실제 Registry/main 상태보다 뒤처지면 새 의미 생성이나 promotion을 시작하기 전에 state reconciliation을 먼저 한다.
- retrieval 실패, duplicate PR, head divergence, fingerprint drift는 fail-closed.

## 4. Evidence-First v4 진행 범위

정상 항목의 research/Evidence/candidate 단계는 v4 AND-gate를 모두 만족하면 사용자에게 매 단계 묻지 않고 진행할 수 있다.

- 공개/허용 출처와 license/fingerprint 검사
- 결정론적 parser와 Evidence Packet 생성
- schema/Strong/node/fingerprint/corpus/regression verifier
- GPT candidate, 독립 audit, 필요한 R3/dispute review
- tier routing, consensus gate, Golden Audit sampling
- GitHub 결과에 따른 state/Notion 동기화

승인 production surface는 별도다. Approval Registry, approved meaning, Golden/Gold Set, promotion verifier/approval policy, `TRACK_STATE.json` promotion gate 등 보호된 사전 승인 데이터를 건드리는 PR은 `lexicon-human-approval`로 분류하고 exact-head 비작성자 write/maintain/admin 승인을 요구한다. 일반 UI/UX·검색·원어 브릿지와 승인 데이터 비변경 research/Evidence 산출물은 `ordinary-auto`, delivery/security/workflow 신뢰경계는 `system-manual`이다.

## 5. Human Exception / External Audit Gate

사람에게 올리는 예외:
- license unknown/prohibited
- 기존 approved 의미/sense/source/fingerprint 변경
- 추가 연구 후에도 해소되지 않는 evidence 충돌
- theology policy 변경
- security/cost/permission
- Golden Audit halt/regression
- 보호된 승인 production surface의 exact-head approval

R4는 먼저 `EXTENDED_RESEARCH_REQUIRED`. 필요한 외부 독립 감사 결과가 실제로 요구되는데 없으면 `EXTERNAL_AUDIT_REQUIRED`로 멈추며 다른 모델이 대체 판정을 만들지 않는다.

## 6. Executor handoff

상태 SSOT: `EXECUTOR_HANDOFF_STATE.json` + `executor-handoff-contract.json`.

- 상태: `ACTIVE | EXECUTOR_HANDOFF_READY | EXTERNAL_AUDIT_REQUIRED | BLOCKED | COMPLETE`
- 사용량/세션/도구 한계가 예상되면 가능한 안전 지점에서 checkpoint commit/push 후 `EXECUTOR_HANDOFF_READY`로 전환한다.
- GPT↔Jarvis 모두 동일 규칙으로 인계 가능하다.
- `headSHA`는 checkpoint 직전 마지막 검증 head이며 현재 head로 가정하지 않는다. 인계자는 반드시 GitHub current head를 재조회한다.
- 자동 agent 호출은 repo 계약 밖이다. 외부 scheduler/agent trigger가 없으면 state는 인계 준비까지만 자동 판정할 수 있다.

## 7. 역할

### GPT
Evidence/candidate 생성, source fidelity/corpus self-check, 코드·state 작업을 수행하며 현재 EXECUTOR일 때 GitHub SSOT에서 직접 재개한다.

### Claude
독립 blind audit. GPT 결론을 그대로 승인하는 역할이 아니다.

### Gemini
R3/쟁점 검토에 필요한 실제 pinned Evidence만 판정한다. 데이터 없이 추정하지 않는다.

### 자비스
통합·검증·CI/PR/Pages와 checkpoint를 수행하며 현재 EXECUTOR일 때 같은 GitHub SSOT에서 직접 재개한다.

### 사용자
정상 Strong 개별 검토자가 아니라 정책·권한·보호된 승인 production surface·미해결 고위험 예외의 governance owner다.

## 8. 프로젝트 균형

이 트랙은 `<성경 마인드맵>` 전체의 한 부분이다. 원어 사전 때문에 긴급 버그·보안·배포 차단 등 전체 프로젝트 우선순위를 방치하지 않는다.
