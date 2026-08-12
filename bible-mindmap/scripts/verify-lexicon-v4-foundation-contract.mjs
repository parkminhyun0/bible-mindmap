#!/usr/bin/env node
// Verifies that Evidence-First Autonomous Lexicon v4 foundation files exist,
// parse, and cross-reference each other correctly.
// This is a self-consistency contract for v4 policy/config/verifier surface.
import assert from 'node:assert/strict'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..')
const WORKSPACE_ROOT = resolve(HERE, '../..')
const TEST_ROOT = process.env.TEST_ROOT ? resolve(process.env.TEST_ROOT) : REPO_ROOT

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))
const workspacePath = (p) => (process.env.TEST_ROOT ? resolve(process.env.TEST_ROOT, p) : resolve(WORKSPACE_ROOT, p))
const bibleMindmapPath = (p) => (process.env.TEST_ROOT ? resolve(process.env.TEST_ROOT, p) : resolve(REPO_ROOT, p))

// ── 1. Policy doc exists and pins the expected sections
const policyDocPath = workspacePath('docs/lexicon-workflow/v4-EVIDENCE_FIRST_AUTONOMOUS.md')
assert.ok(existsSync(policyDocPath), `v4 policy doc missing: ${policyDocPath}`)
const policyText = readFileSync(policyDocPath, 'utf8')
for (const section of [
  '# Evidence-First Autonomous Lexicon v4',
  '## 0. Core principle',
  '## 1. Tier Router',
  '## 2. Multi-model Consensus Gate',
  '## 3. Universal Approval Registry Regression Protection',
  '## 4. Independent Reviewer → Auto-Approve → Auto-Merge',
  '## 5. Human Exception Gate',
  '## 6. R4 EXTENDED_RESEARCH_REQUIRED',
  '## 7. Golden Audit Sample Contract',
  '## 8. Fail-closed Rulebook',
]) {
  assert.ok(policyText.includes(section), `v4 policy doc missing section: ${section}`)
}

// ── 2. Tier-Gate matrix loads and satisfies invariants
const matrixPath = bibleMindmapPath('data/lexicon/v4/tier-gate-matrix.json')
const matrix = readJson(matrixPath)
assert.equal(matrix.schemaVersion, 1)
assert.equal(matrix.matrixId, 'lexicon-v4-tier-gate-matrix-v1')
assert.equal(matrix.modelMajorityRuleProhibited, true, 'v4 must forbid model majority rule')
assert.equal(matrix.governance.verifierRelaxationAllowed, false, 'verifier relaxation must remain forbidden')
for (const tier of ['R0', 'R1', 'R2', 'R3', 'R4']) {
  assert.ok(matrix.tiers[tier], `matrix missing tier ${tier}`)
}
for (const requiredGate of ['consensus-3-of-3', 'unresolved-zero', 'fingerprint-same-baseline', 'source-fidelity', 'license', 'sense-boundary', 'morphology', 'regression', 'korean-naturalness', 'corpus-alignment', 'theological-overreach']) {
  assert.ok(matrix.tiers.R3.autoEligibilityRequires.includes(requiredGate), `R3 missing required gate: ${requiredGate}`)
}
assert.equal(matrix.tiers.R4.autoEligibilityRequires.length, 0, 'R4 must have empty auto-eligibility (never auto)')
assert.equal(matrix.tiers.R4.autoApprovalProhibited, true, 'R4 autoApprovalProhibited must be true')
for (const g of matrix.tiers.R2.autoEligibilityRequires) {
  assert.ok(matrix.tiers.R3.autoEligibilityRequires.includes(g), `R3 must be superset of R2 (missing: ${g})`)
}
for (const g of matrix.tiers.R1.autoEligibilityRequires) {
  assert.ok(matrix.tiers.R2.autoEligibilityRequires.includes(g), `R2 must be superset of R1 (missing: ${g})`)
}
for (const g of matrix.tiers.R0.autoEligibilityRequires) {
  assert.ok(matrix.tiers.R1.autoEligibilityRequires.includes(g), `R1 must be superset of R0 (missing: ${g})`)
}
for (const [tier, cfg] of Object.entries(matrix.tiers)) {
  for (const g of cfg.autoEligibilityRequires) {
    assert.ok(matrix.gates[g], `${tier} references undefined gate: ${g}`)
  }
}

// ── 3. Human exception triggers
const triggersPath = bibleMindmapPath('data/lexicon/v4/human-exception-triggers.json')
const triggers = readJson(triggersPath)
assert.equal(triggers.schemaVersion, 1)
const expectedTriggers = new Set([
  'license-unknown-or-prohibited',
  'existing-approved-meaning-change',
  'unresolvable-source-model-conflict',
  'theology-policy-change',
  'security-cost-permission',
  'golden-audit-regression',
])
const gotTriggers = new Set(triggers.triggers.map((t) => t.id))
for (const id of expectedTriggers) assert.ok(gotTriggers.has(id), `human trigger missing: ${id}`)
for (const t of triggers.triggers) assert.equal(t.failClosed, true, `trigger ${t.id} must be failClosed`)

// ── 4. Golden Audit contract
const gaPath = bibleMindmapPath('data/lexicon/v4/golden-audit-contract.json')
const ga = readJson(gaPath)
assert.equal(ga.schemaVersion, 1)
assert.ok(ga.sampling.perBookMinPercent <= ga.sampling.perBookMaxPercent, 'golden audit sample percent bounds inverted')
assert.ok(ga.sampling.perBatchMinPerFiveHundred >= 20, 'golden audit sample per 500 must be >= 20')
assert.equal(ga.blindingRules.originalVerdictHidden, true, 'blind audit must hide original verdict')
assert.equal(ga.blindingRules.candidateOnlyPresented, true)
assert.ok(ga.thresholds.perBookDiscrepancyRatePercentHalt >= 1)
assert.equal(ga.thresholds.haltAction, 'auto-halt-batch-promotion')
assert.equal(ga.governance.approvalRegistryWriteAllowed, false)

// ── 5. TRACK_STATE cross-reference + installed foundation truth
const trackStatePath = workspacePath('docs/lexicon-workflow/TRACK_STATE.json')
const trackState = readJson(trackStatePath)
assert.ok(trackState.automationFoundationV4, 'TRACK_STATE missing automationFoundationV4 block')
const v4 = trackState.automationFoundationV4
assert.equal(v4.policyDoc, 'docs/lexicon-workflow/v4-EVIDENCE_FIRST_AUTONOMOUS.md')
assert.equal(v4.config.tierGateMatrix, 'bible-mindmap/data/lexicon/v4/tier-gate-matrix.json')
assert.equal(v4.config.humanExceptionTriggers, 'bible-mindmap/data/lexicon/v4/human-exception-triggers.json')
assert.equal(v4.config.goldenAuditContract, 'bible-mindmap/data/lexicon/v4/golden-audit-contract.json')
assert.ok(Array.isArray(v4.failClosedConditions) && v4.failClosedConditions.length >= 10, 'v4 failClosedConditions incomplete')
assert.equal(v4.status, 'INSTALLED', 'v4 foundation must reflect merged installation truth')
assert.equal(v4.installedByPr, 299)
assert.equal(v4.installedByMergeCommit, 'f07a847317a052148c08de316cea922dc90e61cf')
for (const [key, readiness] of Object.entries(v4.automationReadiness)) {
  assert.equal(readiness, 'READY', `v4 automation readiness must be READY: ${key}`)
}

// ── 6. Verifier scripts referenced must all exist and be executable
for (const [key, relPath] of Object.entries(v4.verifiers)) {
  const p = bibleMindmapPath(relPath.replace(/^bible-mindmap\//, ''))
  assert.ok(existsSync(p), `v4 verifier missing: ${key} → ${relPath}`)
  const st = statSync(p)
  assert.ok(st.size > 0, `v4 verifier empty: ${relPath}`)
}

// ── 7. Post-P5 R3/R4 state must reflect current v4 governance.
//     Original `status` remains for backward compatibility with the approval-registry checkpoint,
//     but the current progression is expressed through postAuditStatus + R4 extended-research queue.
const p5 = trackState.p5GenesisCandidateGeneration
assert.equal(p5.status, 'CANDIDATES_GENERATED_AWAITING_CLAUDE_AUDIT', 'status must remain backward-compat value')
assert.equal(p5.postAuditStatus, 'R3_CONSENSUS_COMPLETE_R4_EXTENDED_RESEARCH_REQUIRED', 'postAuditStatus must reflect v4 R4 routing')
assert.equal(p5.candidateManifestFingerprint, 'sha256:a9ebdc22e34659332b84ced41118597feae70f18a742e8a5234968e902c9d261')
assert.deepEqual(p5.auditChain.threeModelConsensusPass, ['H430', 'H1254a', 'H3117', 'H7307', 'H46'])
assert.deepEqual(p5.auditChain.r4ExtendedResearchRequired, ['H120', 'H6030b', 'H7650', 'H28', 'H39'])
assert.equal(Object.hasOwn(p5.auditChain, 'r4HumanFinalWordingPending'), false, 'legacy R4 human-wording queue must not remain authoritative')
assert.equal(p5.auditChain.geminiDisputeReview.pr, 298)
assert.deepEqual(p5.auditChain.geminiDisputeReview.verdictCounts, { PASS: 5, REVISE: 0, DISPUTE: 0 })

// ── 8. Governance closed-write invariants preserved
assert.equal(p5.finalApprovalAllowed, false)
assert.equal(p5.approvalRegistryWriteAllowed, false)
assert.equal(p5.serviceUiWriteAllowed, false)
assert.equal(p5.productionWriteAllowed, false)
assert.equal(p5.existingApprovedMeaningMutationAllowed, false)
assert.equal(trackState.humanGates.includes('R3_or_R4_final_wording'), false, 'blanket R3/R4 human wording gate is obsolete under v4')
assert.ok(trackState.humanGates.includes('unresolved_source_or_model_conflict_after_extended_research'))

console.log('✓ Lexicon v4 foundation contract · foundation=installed(#299) · policy=pinned · matrix=AND-strict · R4=EXTENDED_RESEARCH_REQUIRED · human-exceptions=fail-closed')
