# Evidence-First Autonomous Lexicon v4 — Policy (GitHub SSOT)

**Status**: pinned policy. GitHub 이 문서가 SSOT. Notion 카드는 이 문서를 참조한다.
**Baseline**: main `c8320580d60108787e5c2ea888479f916e24e34b` · Genesis P5 R3 3-model consensus PASS 5/5.

## 0. Core principle

> **Human approves POLICY. Evidence approves each Strong.**

사람은 모든 Strong을 개별 승인하지 않는다. 대신 사람은 v4 policy와 exception 조건을 승인하고, 각 Strong entry는 **Evidence AND-Gate가 모두 PASS**이고 **unresolved exception이 0**일 때 자동 승격된다. 사람 개입은 오직 **v4에 명시된 예외**에 한한다.

## 1. Tier Router (R0–R4)

Candidate 생성 시 `risk.tier`가 결정된다. 각 tier는 자동 승격 자격을 얻으려면 아래 gate matrix를 만족해야 한다. matrix는 `bible-mindmap/data/lexicon/v4/tier-gate-matrix.json`.

| Tier | Auto-eligible when | Path |
|---|---|---|
| **R0** | source-fidelity + license + sense-boundary + morphology + regression AND | Batch fast-lane |
| **R1** | R0 gates + korean-naturalness | Batch fast-lane |
| **R2** | R1 gates + corpus-alignment + theological-overreach (soft) | Full audit |
| **R3** | R2 gates + **GPT · Claude · Gemini 3-of-3 PASS** + unresolved=0 | Full + Gemini dispute |
| **R4** | *not auto-eligible.* Routed to `EXTENDED_RESEARCH_REQUIRED` for public dict/scholarly/usage evidence collection before **any** human ask | Extended research → human final wording |

**AND-gate enforcement**: model consensus alone is NEVER sufficient. Every listed gate must PASS. Missing evidence file = FAIL.

Same-baseline invariance: consensus PASS 판정에 쓰인 후보의 `candidateFingerprint`, 참조된 `pinned evidence packet`의 fingerprint가 promotion 시점의 값과 **정확히 일치**해야 한다. 하나라도 drift하면 fail-closed.

## 2. Multi-model Consensus Gate

R3 이상에 대해 3 모델(GPT candidate generator, Claude independent auditor, Gemini dispute reviewer)의 evidence 파일 모두를 로드하여:

1. 세 모델 모두 동일 `candidateFingerprint`·동일 `manifest.bundleFingerprint`를 참조했는지 확인
2. 각 모델 verdict = PASS인지 확인
3. 상충 시(예: 하나라도 REVISE/DISPUTE) — Gemini interim 철회 이력이 있어도 최종 verdict만 인정하되, 최종에서라도 상충 남으면 fail-closed
4. `unresolved` 필드 (review threads, exceptions) = 0

**모델 다수결 금지**: 2-of-3은 PASS 아님. 반드시 3-of-3.

## 3. Universal Approval Registry Regression Protection

기존 H776 전용 보호를 모든 approved Strong으로 일반화. `verify-lexicon-registry-universal-regression.mjs`가 매 PR에서:

- 승인된 각 Strong의 immutable snapshot 저장 (첫 승인 시점의 evidence fingerprint)
- 매 PR에서 현재 registry와 snapshot 비교:
  - **삭제**: 승인된 Strong entry 제거 → fail
  - **축소**: `approvedSenseTree`의 sense count 감소 → fail
  - **변경**: 기존 sense의 `translationKo` 변경 → fail (별도 high-risk gate 필요)
  - **drift**: `sourceNodeId`, `identityFingerprint`, `evidencePacketFingerprint` 변화 → fail
  - **tree 구조 회귀**: parentId/depth/order 변화 → fail

기존 approved 의미를 실제로 변경하려면 `existing-approved-meaning-change` 라벨 + high-risk human gate + updated snapshot 필요. 기본은 fail-closed.

## 4. Independent Reviewer → Auto-Approve → Auto-Merge

정상 lexicon PR flow:

1. PR 열림 (base: main)
2. Foundation CI 실행: v4 required checks 전체 PASS
3. `bible-mindmap-review` reviewer 자동 요청
4. Reviewer가 exact head SHA에 대해 `APPROVED` submit
5. Auto-merge preconditions 검증:
   - 최신 review 상태 = APPROVED (CHANGES_REQUESTED 없음)
   - Review commit SHA == 현재 head SHA (drift 없음)
   - 모든 unresolved review thread == 0
   - CI 필수 체크 전체 PASS
   - fingerprint mismatch 없음
   - `existing-approved-meaning-change` 라벨 없거나 human high-risk gate 통과
6. Auto-squash-merge → deploy workflow_dispatch → Pages verify → Live SHA 확인 → TRACK_STATE + RESUME + Notion 동기화

**Fail-closed 조건**: 위 6 단계 중 하나라도 실패하면 auto-merge stop, PR에 fail 사유 comment.

## 5. Human Exception Gate

사람에게 올릴 트리거는 오직 아래 조건. R4는 즉시 사람 아님(§6 참조).

- License 불명·금지 (i.e., new source, deprecated license clarification)
- **기존** approved sense 의미 변경 (label: `existing-approved-meaning-change`)
- 해소 불가능한 사전·용례 충돌 (3 모델 상충 최종 유지 또는 evidence 간 충돌)
- 신학 policy 변경 (WCF/대소요리 개정, 신조 추가 등)
- 보안·비용·권한 (secret/token, cost quota, external API auth)
- Golden Audit 회귀 임계 초과 (§6 참조)

명시적 트리거 목록: `bible-mindmap/data/lexicon/v4/human-exception-triggers.json`.

## 6. R4 EXTENDED_RESEARCH_REQUIRED

R4 (uncertain-etymology, proper-name, wholly dubious BDB entries, etc.)는 자동 승격 대상 아님. 그러나 즉시 사람에게 묻지 않는다:

1. `EXTENDED_RESEARCH_REQUIRED` 큐로 이동
2. 공개 사전(HALOT, DCH), 학술 논문, 성경 내 용례 evidence 수집
3. 수집된 evidence로 3 모델 재감사
4. 그래도 상충·불확정이면 human final-wording gate

이 flow는 자비스가 자동으로 수행 (Gemini/Gemma CLI 제외 — `memory/feedback_gemini_cli_use.md`).

## 7. Golden Audit Sample Contract

**목적**: 자동 승격이 시스템 전반의 품질을 훼손하지 않는지 상시 감시.

- **샘플 규모**: 책·batch당 3–5%, 최소 500 Strong당 20건
- **방식**: blind 재검증 (모델·사람 둘 다). 원 판정 미공개.
- **임계**: 불일치율 > 5% (per book) 또는 > 10% (per batch) → 해당 batch의 **모든 pending promotion 자동 중지** + human high-risk gate
- **주기**: batch merge 직후 자동 트리거
- **상태 파일**: `bible-mindmap/data/lexicon/v4/golden-audit-contract.json` (spec) + 각 감사 실행마다 `bible-mindmap/reports/golden-audit-<batch>.json` 생성

## 8. Fail-closed Rulebook

아래 중 하나라도 발생하면 **즉시 fail-closed**. Retry 대신 human review로 이동:

- `candidateFingerprint` / `shardFingerprint` / `manifest.bundleFingerprint` drift
- `sourceInputBundleFingerprint` drift
- 3-model consensus 미달 (any tier ≥ R3)
- unresolved review thread > 0
- reviewer가 APPROVED 아님, 또는 head SHA drift
- 기존 approved 의미 mutation 감지 (high-risk gate 미통과)
- H776 sense tree byte-level drift (레거시 golden fixture 회귀)
- License unknown/prohibited
- Golden Audit 불일치율 임계 초과
- CI 필수 체크 fail
- verifier 완화(script 삭제·조건 완화·gate bypass) 감지

## 9. 자비스 실행 규칙

- **Gemini/Gemma CLI 직접 호출 금지** (memory: `feedback_gemini_cli_use.md`)
- 후보 의미 및 fingerprint 재계산 없이 v4 foundation 설치만 수행 (인프라 PR)
- 기존 verifier/gate 완화 금지
- 새 verifier는 반드시 기존 verifier와 AND (덜 엄격한 조합 금지)
- Approval Registry / UI / production write 이 문서 pin PR에서 발생 금지

## 10. 관련 파일 (SSOT 상호참조)

- 정책 SSOT: 이 문서 (`docs/lexicon-workflow/v4-EVIDENCE_FIRST_AUTONOMOUS.md`)
- Tier-Gate matrix: `bible-mindmap/data/lexicon/v4/tier-gate-matrix.json`
- Human exception triggers: `bible-mindmap/data/lexicon/v4/human-exception-triggers.json`
- Golden Audit contract: `bible-mindmap/data/lexicon/v4/golden-audit-contract.json`
- 상태 SSOT: `docs/lexicon-workflow/TRACK_STATE.json` — key `automationFoundationV4`
- 이력 문서: `docs/lexicon-workflow/MASTER_WORKFLOW.md` (v3 이전 흐름 참조)
- 이 정책의 시작점: PR #298 (Genesis P5 R3 Gemini dispute COMPLETE)
