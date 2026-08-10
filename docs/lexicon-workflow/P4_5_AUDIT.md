# P4.5 · Claude Independent Infrastructure Audit

- 감사 기준선: `main` = `0c0b6800…` (PR #278 병합 커밋)
- 감사 목적: P4 Approval Registry / Lexicon Manifest / Lexicon Shard 인프라(스키마·빌더·검증기·CI)가 첫 승인 엔트리를 쓰기 전에 데이터 유출·자기 승격·계약 우회로부터 안전한지 독립적으로 반증한다.
- 감사 범위: P4 인프라 도입 시스템 경계 1회 계약 감사. 매 Strong 반복 감사가 아니다.
- 감사 규칙: 번역 후보 신규 생성 금지, 한국어 Golden 의미 변경 금지, Approval Registry 승격 금지, service/UI 쓰기 금지, 기존 품질 Gate/threshold 완화 금지, **첫 Approval Registry 엔트리 미기록 유지**.

## 1. 실제로 감사한 파일과 계약

- `bible-mindmap/data/lexicon/schemas/ApprovalRegistry.schema.json` (PR #278 신규)
- `bible-mindmap/data/lexicon/schemas/LexiconManifest.schema.json` (PR #278 신규)
- `bible-mindmap/data/lexicon/schemas/LexiconShard.schema.json` (PR #278 신규)
- `bible-mindmap/scripts/build-lexicon-approval-registry.mjs` (PR #278 신규)
- `bible-mindmap/scripts/build-lexicon-manifest.mjs` (PR #278 신규)
- `bible-mindmap/scripts/build-lexicon-shards.mjs` (PR #278 신규)
- `bible-mindmap/scripts/verify-lexicon-approval-registry.mjs` (PR #278 신규)
- `bible-mindmap/scripts/lib/lexicon-evidence-verifier.mjs` (P3.5 M2 반영본, `readPhaseGate`)
- `.github/workflows/lexicon-evidence-contract.yml` (P4 verify 단계 편입)
- `docs/lexicon-workflow/TRACK_STATE.json` (`state: P3_COMPLETE`, `activePhase: P4_REGISTRY_SHARD_REACT_INTEGRATION`)
- GitHub branch protection: `GET /repos/parkminhyun0/bible-mindmap/branches/main/protection`

## 2. 감사한 계약 축

| 축 | 근거 위치 | 상태 |
| --- | --- | --- |
| Approval Registry 스키마 폐쇄성 | `additionalProperties: false`, `required` 3필드, `approvedEntry.reviewerType` enum `["human"]` | PASS |
| Lexicon Manifest 스키마 폐쇄성 | `shardPath` 패턴 `^shards/…\.json$`, `strong` 패턴 강제 | PASS |
| Lexicon Shard 스키마 폐쇄성 | `scope.kind` oneOf 2종, `entries` = `approvedEntry` 재사용 | PASS |
| Empty-only Approval builder | `entries.length === 0` 강제 + `approvalRegistryPromotionAllowed=false` 강제 | PASS |
| stdout-only 빌더 | 3개 빌더 모두 `--out` 인자 fail-closed | PASS (L1 참고) |
| 결정론적 fingerprint | `sha256Canonical` + `fingerprintWithout` | PASS |
| 프로덕션 쓰기 경로 부재 | `data/lexicon/approval-registry.json`·`manifest.json`·`shards/` 미존재 | PASS |
| phase gate SSOT | `readPhaseGate(TRACK_STATE)` → caller override 무력화 | PASS |
| CI path glob 커버리지 | `bible-mindmap/data/lexicon/**`, `scripts/build-lexicon-**.mjs`, `scripts/verify-lexicon-**.mjs` | PASS |

## 3. 반증 시나리오와 실제 결과

로컬 실행: `main = 0c0b680`, node 24. 워크트리 격리(`/tmp/bmm-p45-audit`).

### 3.1 in-verifier self-test (PR #278 포함)
- 스키마 4 root 필드 계약 · phase gate 3필드 잠금 · deprecatedDefaultPaths 5개 유지 · 프로덕션 쓰기 경로 부재 · stdout-only builder fail-closed · empty deterministic build · shard descriptor 라우팅 3케이스 — 전부 `node scripts/verify-lexicon-approval-registry.mjs` 통과.

### 3.2 in-verifier test에 포함되지 않은 반증 (본 감사 추가)

| 시도 | 결과 |
| --- | --- |
| A1 · `build-lexicon-approval-registry.mjs --out /tmp/x.json` | 차단 · assertion fail-closed (exit 1) |
| A2 · `build-lexicon-manifest.mjs --out /tmp/x.json` | 차단 |
| A3 · `build-lexicon-shards.mjs --out /tmp/x.json` | 차단 |
| A5 · `buildLexiconApprovalRegistry([{}])` 임포트 호출 | 차단 · `must remain empty until P4.5 independent audit passes` |
| A6 · `data/lexicon/{approval-registry.json,manifest.json,shards/}` 존재 여부 | 3개 전부 부재 |
| A8 · `--out=/tmp/oops.json` 단일 토큰 형태 | **가드 통과 (exit 0)**. 파일 미생성 확인. L1 참고 |
| A9 · P4 스크립트 4개 안의 `writeFile\|createWriteStream\|openSync` 검색 | **0건** (`fs.write*` 호출이 코드에 아예 없음) |
| A10 · `verifyLexiconEvidencePacket({candidateGenerationAllowed:true})` caller override | 차단 · `caller-provided candidateGenerationAllowed=true disagrees with TRACK_STATE=false` |
| A11 · `buildLexiconManifest`/`buildLexiconShards` 에 조작된 non-empty registry 주입 | **통과** (fingerprint 정상 계산). 파일 쓰기 경로 부재로 실 유출 없음. M1 참고 |
| A12 · 실 TRACK_STATE phase gate 값 | `{candidateGenerationAllowed:false, approvalRegistryPromotionAllowed:false, serviceUiWriteAllowed:false}` |
| A13 · 두 번 호출 fingerprint 결정성 | `sha256:eaf741c591ae9eb798b55a703ddadfeec7c803b91b3199272a7ccd39e56160c1` 재현 |
| A15 · `readPhaseGate` 대상 파일 손상 시 | fail-closed 예외 |
| A16 · GitHub `main` branch protection · required status checks | `["security-audit", "verify-and-build"]` 만 필수. Lexicon Evidence Contract 계열 계약 잡 미포함. H1 참고 |
| A17 · branch protection · review/admin 잠금 | `required_approving_review_count: 0`, `enforce_admins: false`, `require_last_push_approval: false`. M2 참고 |

## 4. 발견 사항과 심각도

### Critical: 0

### High

- **H1 · `main` 브랜치 보호 필수 상태 체크에 Lexicon Evidence Contract 미포함.**
  A16에서 확인. 현재 필수 체크는 `security-audit`, `verify-and-build` 2개뿐. PR #278에서 추가된 `verify` (Lexicon Evidence Contract) 및 `verify-zero-cost-contract`, `Lexicon Parser`, `Lexicon Source Registry`, `Luke Lexicon G1 contract`, `contract` 잡은 required 아님. 첫 Approval Registry 엔트리 PR 이전에 required contexts에 `verify` (Lexicon Evidence Contract) 를 추가하지 않으면 계약 검증 실패에도 관리자 병합이 가능하다.

### Medium

- **M1 · `buildLexiconManifest` / `buildLexiconShards` 가 empty-invariant를 독립적으로 강제하지 않음.**
  A11에서 확인. `buildLexiconApprovalRegistry` 만 `entries.length === 0` 을 강제하고 두 하위 빌더는 임의 registry 입력을 그대로 처리한다. A9에서 확인한 대로 `fs.write*` 코드가 어디에도 없어 실제 파일 유출은 불가능하다. 그러나 방어심층 관점에서 두 빌더도 `readPhaseGate().approvalRegistryPromotionAllowed === false` 조건에서 `entries.length === 0` 을 어서션하는 것이 안전하다. 첫 엔트리 승인 전에 M1을 봉인하지 않으면 미래의 caller가 조작 registry로 매니페스트/샤드 산출물을 무심코 상류에 흘려보낼 여지가 남는다.

- **M2 · `main` 브랜치 보호 리뷰·관리자 잠금 부재.**
  A17에서 확인. `required_approving_review_count: 0`, `enforce_admins: false`. 인간 R3/R4 gate(첫 승인 등재)를 단일 actor 가 자기 병합할 수 있는 표면. P3.5 M3 지적이 부분 이행(protection 자체는 켜짐)에 그쳤다. Approval Registry 데이터 진입 전 리뷰 ≥ 1 및 enforce_admins ON 이 반드시 필요.

### Low

- **L1 · `process.argv.includes('--out')` 는 단일 토큰 `--out` 만 감지.**
  A8에서 확인. `--out=/tmp/x.json` 형태 및 `-o /tmp/x.json` 형태는 통과한다. 현재는 A9의 "빌더 코드에 `fs.write*` 자체가 없음"이 실질적 방어. 향후 누군가 write 경로를 추가하면 이 가드가 상보적으로 실패하도록 `process.argv.some(a => a === '--out' || a === '-o' || a.startsWith('--out=') || a.startsWith('-o='))` 로 확장 권장.

- **L2 · verifier의 stdout-only 프로브 범위.**
  `verify-lexicon-approval-registry.mjs::verifyStdoutOnlyBuilders` 가 `--out` 만 프로브. L1 과 동일 이유로 `-o`, `--output`, `--out=` 도 추가 프로브 필요.

## 5. 긍정적 확인(재사용 가능한 안전 자산)

- **파일 쓰기 코드 자체가 없음.** P4 스크립트 4개 어디에도 `fs.writeFile*`, `createWriteStream`, `openSync` 호출이 없다. `--out` 은 심볼릭 이중 잠금.
- **fingerprint 결정성.** `sha256Canonical(canonicalize(value))` 재귀 key 정렬 sha256 으로 재현 가능.
- **phase gate SSOT.** `readPhaseGate` 가 파일 읽기 실패 시 fail-closed. caller override 는 TRACK_STATE 와 불일치 시 즉시 예외.
- **shard descriptor 결정성.** 100단위 range 로 `H1..H100`, `H101..H200`, `G2301..G2400` 등 산출. 임의 라우팅 여지 없음.
- **CI path-glob 방어심층.** `bible-mindmap/data/lexicon/**`, `scripts/build-lexicon-**.mjs`, `scripts/verify-lexicon-**.mjs`, `src/data/lexicon**.js` 를 PR/main push 양쪽에 미러링.
- **TRACK_STATE 의 `deprecatedDefaultPaths` 5종(ollama_local_ab_translation 등) 유지.** M1 이 자동 프로덕션 쓰기 경로 봉인.

## 6. 수정 여부와 CI 결과

- 본 PR은 감사 결과 등재만 수행한다. Approval Registry 엔트리, 스키마, 빌더, verifier, 데이터, Golden 의미 무변경.
- H1 / M1 / M2 는 첫 Approval Registry 엔트리 PR 이전에 별도 조치 필수 (본 감사 결과에 명시).
- 로컬 재실행 결과 (worktree `/tmp/bmm-p45-audit`):
  - `verify-lexicon-source-registry.mjs`: PASS (P3.5 이월)
  - `verify-lexicon-generic-evidence.mjs`: PASS (P3.5 이월)
  - `verify-lexicon-approval-registry.mjs`: **PASS** · approval entries: 0 · manifest entries: 0 · shards: 0 · phase gates: 3개 모두 disabled
  - `verify-lexicon-evidence-contracts.mjs`: PASS (H776 회귀)
- 원격 CI는 본 PR에서 재트리거 예정.

## 7. 첫 Approval Registry 엔트리 진입 가능 여부

**P4.5_PASS → APPROVAL_ENTRY_READY (조건부).**

- Critical/High 각각 0/1. High(H1) 는 GitHub Settings 변경 1건으로 즉시 해소 가능.
- 다음 3개 조건이 첫 승인 엔트리 PR 이전에 반드시 반영되어야 함:
  1. `main` required status checks 에 `verify` (Lexicon Evidence Contract) 추가 (H1)
  2. `main` required reviews ≥ 1, `enforce_admins: true` (M2)
  3. `buildLexiconManifest` / `buildLexiconShards` empty-invariant 미러링 (M1)
- 위 3건 반영·CI 초록 확인 후에만 `p3_5_independentAudit.approvalRegistryPromotionAllowed`(SSOT) 를 별도 PR 로 `true` 전환. 그 후 첫 엔트리 착수.

## 8. 남은 위험

- H1 은 리포지토리 코드로는 해결 불가 (GitHub Settings 인간 작업).
- M2 도 동일.
- M1 은 코드로 해결 가능하나 본 PR 범위에서 제외 (감사 등재-only 원칙).
- 첫 승인 엔트리 자체의 의미 정합성은 사람 R3/R4 검수 의존 (구조 검증 밖).

## 9. 다음 단일 행동

본 PR 병합 → `state`는 `P3_COMPLETE` 유지, `activePhase`는 `P4_REGISTRY_SHARD_REACT_INTEGRATION` 유지, `p4_5_independentAudit.verdict = PASS_WITH_MANDATORY_PRE_FIRST_ENTRY_STEPS` 기록 → 다음 PR 순서는 (a) branch protection 조정 (인간), (b) M1 방어심층 봉인 (코드), (c) `approvalRegistryPromotionAllowed` 승격 (별도 PR), (d) 첫 엔트리.
