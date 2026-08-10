# P3.5 · Claude Independent Contract Audit

- 감사 기준선: `main` = `75936df360d11b042c6209266299055f412f313e` (PR #275 병합 커밋, Pages #576)
- 감사 목적: P3 범용 Evidence·license verifier 및 회귀 CI가 P4 Approval Registry·shard·React 통합으로 넘어가도 안전한지 독립적으로 반증한다.
- 감사 범위: P3 → P4 시스템 경계 1회 계약 감사. 매 Strong 반복 번역 감사가 아니다.
- 감사 규칙: 번역 후보 신규 생성 금지, 한국어 Golden 의미 변경 금지, Approval Registry 승격 금지, service/UI 쓰기 금지, 기존 품질 Gate/threshold 완화 금지.

## 1. 실제로 감사한 파일과 계약

- `bible-mindmap/scripts/lib/lexicon-evidence-verifier.mjs` (260 라인, PR #275 신규)
- `bible-mindmap/scripts/verify-lexicon-generic-evidence.mjs` (152 라인, PR #275 신규)
- `bible-mindmap/scripts/verify-lexicon-evidence-contracts.mjs` (H776 특화 회귀)
- `bible-mindmap/data/lexicon/source-registry.json` (`policyVersion: 1.2`, sources 7건)
- `bible-mindmap/data/lexicon/fixtures/GEN-1-1-H776.evidence-packet.v2.json` (Golden)
- `.github/workflows/lexicon-evidence-contract.yml` (P3에서 새 verifier를 회귀 앞 단계로 배치)
- `docs/lexicon-workflow/TRACK_STATE.json` (`state: P3_COMPLETE`, `activePhase: P4_REGISTRY_SHARD_REACT_INTEGRATION`)
- `docs/lexicon-workflow/MASTER_WORKFLOW.md`, `LLM_CHECKIN.md`, `AGENTS.md`, `memory/RESUME.json`

## 2. 감사한 계약 축

| 축 | 근거 위치 | 상태 |
| --- | --- | --- |
| Strong identity 정규화·식별 | `normalizeStrong` + `STRONG_PATTERN` + `verifyIdentity` | PASS |
| Source Registry 연결 | `registryById` + `sourceRegistryPolicyVersion` 일치 강제 | PASS |
| License gate + source fingerprint | `automaticSourceReady` (workflow status + 4 boolean 라이선스 필드 + sha256 fingerprint) | PASS |
| Evidence provenance tree | `verifySenseTree` (id 패턴, 부모 선행, depth 불변, 순환 불가) | PASS |
| Cluster/context source declaration | `clusterId.startsWith(canonicalStrong-S)` + context lemma NFC 일치 | PASS |
| Packet fingerprint | `fingerprintWithout` + sha256Canonical 재계산 대조 | PASS |
| H776 Golden 회귀 | `verify-lexicon-evidence-contracts.mjs` (fixture ↔ pilot ↔ reconciliation 3중 교차) | PASS |
| H1254 generic probe | in-memory contract probe, 디스크 fixture 미기록 | PASS |
| candidate generation / Approval Registry / service·UI write 차단 | `licenseSummary.newGenerationAllowed` 재계산 + caller policy freeze(`false`) | PASS (M2 참고) |

## 3. 반증 시나리오와 실제 결과

로컬 실행: `main = 75936df`, node 24.

### 3.1 in-file self-test (PR #275 포함)
- `identityDrift` — `lemma` 변조 후 fingerprint 재계산 → `lemmaNormalized|identityFingerprint` 오류로 차단
- `fingerprintDrift` — `sourceFingerprint` 위조 → `source fingerprint drift`
- `undeclaredProvenance` — `sourceRefs`에 미등록 sourceId 삽입 → `undeclared sourceRef`
- `generationEscape` — packet이 `newGenerationAllowed=true` 자기 선언 → `current phase + license gate`
- `legacyInGeneration` — legacy-only 노드를 generation 패킷에 삽입 → `legacy-only is regression-only`
- `packetFingerprintDrift` — 최종 fingerprint 위조 → `packetFingerprint drift`

전부 CI에서 실제 통과 확인 (`node scripts/verify-lexicon-generic-evidence.mjs`).

### 3.2 in-file test에 포함되지 않은 반증 (본 감사 추가)
| 시도 | 결과 |
| --- | --- |
| ATTACK-A: H776 fixture의 identity만 H1254로 스왑 (senseNodes·cluster·context는 H776 유지) | 차단 · `cluster H776-S1 must use packet Strong` |
| ATTACK-B: identity를 H9999로 위조하고 나머지 tree 유지 | 차단 · `cluster H776-S1 must use packet Strong` |
| ATTACK-C1: 정상 P3 caller(`candidateGenerationAllowed=false`)에게 self-declared 생성 패킷 제출 | 차단 · `newGenerationAllowed must obey current phase + license gate` |
| ATTACK-C2: caller가 `candidateGenerationAllowed=true`로 verifier 호출 | **PASS** (verifier가 caller 정책을 신뢰) — 아래 M2 참고 |
| ATTACK-C3: honest 패킷 + false 정책 | 정상 통과 |

## 4. 발견 사항과 심각도

### Critical: 0
### High: 0

### Medium

- **M1 · CI 경로 스코프가 P4 데이터 경로를 포함하지 않음.**
  `lexicon-evidence-contract.yml`의 path 필터는 지정된 named 경로에만 반응한다. P4가 도입할
  `data/lexicon/approval-registry.json`, `data/lexicon/manifest/**`, `data/lexicon/shards/**`,
  새 `verify-lexicon-*.mjs`, React lazy loader 등은 현재 트리거되지 않는다.
  **본 PR에서 방어적 glob(`bible-mindmap/data/lexicon/**`, `scripts/lib/lexicon-**.mjs`,
  `scripts/verify-lexicon-**.mjs`, `scripts/build-lexicon-**.mjs`, `src/data/lexicon**.js`)을
  추가하여 선제 봉인함.**

- **M2 · verifier가 `candidateGenerationAllowed`를 caller에게 위임.**
  ATTACK-C2에서 확인됨. 현재 유일 호출자 `verify-lexicon-generic-evidence.mjs`가
  `Object.freeze({ candidateGenerationAllowed: false })`로 하드코딩하여 실 CI에서는
  우회 불가. 하지만 P4에서 새 caller가 `true`를 넘기면 검증이 통과된다.
  권장(P4 첫 작업): verifier가 `TRACK_STATE.json`의 phase gate를 직접 읽어
  caller override를 무력화하도록 리팩터.

- **M3 · `main` 브랜치 보호 미설정.**
  `GET /repos/.../branches/main/protection` = 404 (Branch not protected).
  현재 CI는 advisory. P4가 실서비스 데이터(Approval Registry)를 쓰기 시작하면
  운영 리스크로 전환된다. 권장: Approval Registry 파일 경로 도입 이전에
  required status check(`Lexicon Evidence Contract / verify`)를 활성화.

- **M4 · 페이즈 전환 게이트가 단일 PR 안에서 자기 승격.**
  PR #275가 P3 구현과 함께 `state: P3_COMPLETE`·`activePhase: P4_...`를 동일 커밋에서
  전환했다. 독립 감사 게이트가 없었다. 본 P3.5가 그 공백을 사후에 메운다.
  권장: 향후 phase 전환은 별도 `p{N}_5_independent_audit` 블록 통과 이후에만.

### Low

- **L1 · `representativeContexts.reference` 정규식 `^[A-Z0-9]{3}\.\d+\.\d+$`.**
  OSIS-like 코드 이외의 3자 대문자 조합(예: `XYZ.1.1`)이 문법상 통과. 오타 조용히 지나감.
- **L2 · senseNodes가 packet의 Strong에 의미적으로 속함을 구조 레벨에서 강제하지 않음.**
  cluster prefix와 identity lemma 일치 검사가 실질 방어(ATTACK-A/B에서 검증됨). 다만
  Golden 신설 시에는 사람 승인이 유일 안전망.

## 5. 긍정적 확인(재사용 가능한 안전 자산)

- Strong 식별: leading zero 제거, Extended Strong 단문자 접미, `H0` 차단, testament↔prefix, language↔testament 일관성.
- License gate: workflow status + 4 boolean 라이선스 필드 + sha256 fingerprint. 단일 필드 위조로는 자동 처리 불가.
- `licenseSummary.newGenerationAllowed`가 packet 데이터가 아니라 verifier 재계산 결과와 대조 → 자기 선언 불가.
- legacy-only 이중 잠금: `packetType === 'golden-reference'` AND `processingMode === 'regression-only'`.
- Golden vs generation 상호 배타: 각 모드에서 필수/금지 필드가 다르며 verifier가 강제.
- 결정론적 canonicalization: 재귀 key 정렬 sha256.
- 트리 순환 불가: string-prefix parent ID + 부모 선행 배치.
- H1254 probe: in-memory 전용, 디스크 fixture 미기록.
- CI 순서: generic verifier → H776 회귀 → fail-fast.
- H776 특화 회귀가 fixture ↔ pilot ↔ reconciliation을 교차 대조.
- `push: main` 트리거로 브랜치 보호 없이도 병합 시점 회귀 실행.

## 6. 수정 여부와 CI 결과

- 본 PR에서 M1을 즉시 봉인 (workflow 경로 glob 확장). verifier 코드, 데이터, Golden 의미는 무변경.
- M2/M3/M4는 P4 첫 단계에서 정식 조치 (본 감사 결과에 명시).
- 기존 P3 CI 3층 로컬 재실행 결과 (branch `claude/p3-5-independent-audit`):
  - `verify-lexicon-source-registry.mjs`: sources=7, ready=4 · PASS
  - `verify-lexicon-generic-evidence.mjs`: H776 26 nodes + H1254 probe · PASS · `candidateGenerationAllowed=false`
  - `verify-lexicon-evidence-contracts.mjs`: H776 26/26 Korean preserved · fingerprint 일치 · PASS
- 원격 CI는 본 PR에서 재트리거 예정.

## 7. P4 진입 가능 여부

**P3.5_PASS → P4_READY (조건부).**

- Critical/High 없음.
- 다음 3개 조건이 P4 첫 PR에서 반드시 반영되어야 함:
  1. verifier가 `TRACK_STATE.json` phase gate를 직접 읽도록 리팩터 (M2)
  2. Approval Registry 파일 경로 도입 이전에 branch protection 활성화 (M3)
  3. 다음 phase 전환은 phase-내 자기 승격 금지, 별도 audit 블록 필수 (M4)

## 8. 남은 위험

- verifier가 caller 정책을 신뢰하는 지점 (M2). P3.5 PR로는 봉인 불가 (코드 변경 범위 초과).
- branch protection 미설정 (M3). 코드 변경으로 해결 불가.
- Golden 신설 시 senseNodes 의미 정합성은 사람 승인 의존 (L2).
- 라이선스가 clarified/unknown인 3개 소스(`unfoldingword-bdb-enhanced`, `openscriptures-strongs`, `korean-ot-nt-dictionary`)는 automatic 처리에서 정상 배제 중. P4에서 이 배제 상태가 유지되는지 재확인 필요.

## 9. 다음 단일 행동

본 PR 병합 → `state`는 `P3_COMPLETE` 유지, `activePhase`는 `P4_REGISTRY_SHARD_REACT_INTEGRATION` 유지, `p3_5_independentAudit.verdict = PASS_WITH_MANDATORY_P4_FIRST_STEPS` 기록 → P4 첫 PR은 M2 리팩터부터.
