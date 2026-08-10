#!/usr/bin/env node
// Contract dry-run for lexicon-v4-auto-merge workflow decision logic.
// Imports the SAME decision function used by .github/workflows/lexicon-v4-auto-merge.yml
// so this file is authoritative regression coverage for the workflow behavior.
import assert from 'node:assert/strict'
import {
  decideAutoMerge, diffApprovalRegistries, isLexiconScope,
  V4_REVIEWER, V4_LABEL, HIGH_RISK_LABEL, V4_REQUIRED_CHECKS,
} from '../lib/v4-auto-merge-decision.mjs'

// ── Helpers
const HEAD = 'sha-current-head'
const OLD_HEAD = 'sha-earlier-head'
const successCheck = () => ({ status: 'completed', conclusion: 'success' })
const pendingCheck = () => ({ status: 'in_progress', conclusion: null })
const failedCheck = () => ({ status: 'completed', conclusion: 'failure' })

function baselineFixture(overrides = {}) {
  const checks = new Map()
  for (const name of V4_REQUIRED_CHECKS) checks.set(name, successCheck())
  return {
    pr: {
      state: 'open', draft: false,
      head: { sha: HEAD, repo: { full_name: 'parkminhyun0/bible-mindmap' } },
      base: { sha: 'sha-base', repo: { full_name: 'parkminhyun0/bible-mindmap' } },
      labels: [{ name: V4_LABEL }],
    },
    currentHeadSha: HEAD,
    filenames: ['docs/lexicon-workflow/v4-EVIDENCE_FIRST_AUTONOMOUS.md'],
    reviewsAll: [{ user: { login: V4_REVIEWER }, state: 'APPROVED', commit_id: HEAD, submitted_at: '2026-08-11T02:00:00Z' }],
    reviewThreadsUnresolved: 0,
    requiredCheckStatuses: checks,
    registryDiff: null,
    mergeableState: 'clean',
    retrievalErrors: [],
    ...overrides,
  }
}

// Synthetic registries for diff fixtures
const baseRegistryH776 = {
  entries: [{
    identity: { canonicalStrong: 'H776', identityFingerprint: 'sha256:h776-id' },
    evidencePacketFingerprint: 'sha256:h776-ep',
    approvedSenseTree: [
      { id: '1', parentId: null, depth: 0, order: 1, translationKo: '땅, 대지' },
      { id: '1.1', parentId: '1', depth: 1, order: 2, translationKo: '지구·땅' },
    ],
  }],
}
const headRegistryNewH430 = {
  entries: [
    baseRegistryH776.entries[0],
    { identity: { canonicalStrong: 'H430', identityFingerprint: 'sha256:h430-id' },
      evidencePacketFingerprint: 'sha256:h430-ep',
      approvedSenseTree: [{ id: '1', parentId: null, depth: 0, order: 1, translationKo: '하나님, 신들' }] },
  ],
}
const headRegistryMutatedH776 = {
  entries: [{
    identity: { canonicalStrong: 'H776', identityFingerprint: 'sha256:h776-id' },
    evidencePacketFingerprint: 'sha256:h776-ep',
    approvedSenseTree: [
      { id: '1', parentId: null, depth: 0, order: 1, translationKo: '다른 뜻' },  // MUTATED
      { id: '1.1', parentId: '1', depth: 1, order: 2, translationKo: '지구·땅' },
    ],
  }],
}
const headRegistryDeletedSense = {
  entries: [{
    identity: { canonicalStrong: 'H776', identityFingerprint: 'sha256:h776-id' },
    evidencePacketFingerprint: 'sha256:h776-ep',
    approvedSenseTree: [
      { id: '1', parentId: null, depth: 0, order: 1, translationKo: '땅, 대지' },
      // 1.1 REMOVED (sense count reduction)
    ],
  }],
}
const headRegistryDriftFingerprint = {
  entries: [{
    identity: { canonicalStrong: 'H776', identityFingerprint: 'sha256:DIFFERENT-id' },  // DRIFT
    evidencePacketFingerprint: 'sha256:h776-ep',
    approvedSenseTree: baseRegistryH776.entries[0].approvedSenseTree,
  }],
}

// Sanity: diffApprovalRegistries returns expected shapes
const dNew = diffApprovalRegistries(baseRegistryH776, headRegistryNewH430)
assert.deepEqual(dNew.additions, [{ strong: 'H430' }])
assert.deepEqual(dNew.mutations, [])
assert.deepEqual(dNew.deletions, [])
const dMut = diffApprovalRegistries(baseRegistryH776, headRegistryMutatedH776)
assert.deepEqual(dMut.mutations[0].strong, 'H776')
const dDel = diffApprovalRegistries(baseRegistryH776, headRegistryDeletedSense)
assert.equal(dDel.mutations[0].kind, 'sense-count-reduction')
const dDrift = diffApprovalRegistries(baseRegistryH776, headRegistryDriftFingerprint)
assert.equal(dDrift.drifts[0].kind, 'identity-fingerprint-drift')

// ── FIXTURES (18 total)
const results = []
function run(name, fixture, expected) {
  const v = decideAutoMerge(fixture)
  results.push({ name, verdict: v.verdict, reason: v.reason, expected })
  assert.equal(v.verdict, expected, `${name}: expected ${expected}, got ${v.verdict} · ${v.reason}`)
  return v
}

// 1. Foundation PR baseline — should AUTO_MERGE
run('01 foundation PR baseline', baselineFixture(), 'AUTO_MERGE')

// 2. Wrong reviewer → WAIT (no v4 review present)
run('02 wrong reviewer', baselineFixture({
  reviewsAll: [{ user: { login: 'someone-else' }, state: 'APPROVED', commit_id: HEAD, submitted_at: '2026-08-11T02:00:00Z' }],
}), 'WAIT')

// 3. SHA drift on APPROVED → WAIT (approval on old commit)
run('03 review SHA drift', baselineFixture({
  reviewsAll: [{ user: { login: V4_REVIEWER }, state: 'APPROVED', commit_id: OLD_HEAD, submitted_at: '2026-08-11T02:00:00Z' }],
}), 'WAIT')

// 4. Registry NEW entry only (H430 added, H776 unchanged) → AUTO_MERGE
run('04 registry new entry only', baselineFixture({
  filenames: ['bible-mindmap/data/lexicon/approval-registry.json', 'bible-mindmap/reports/x.json'],
  registryDiff: diffApprovalRegistries(baseRegistryH776, headRegistryNewH430),
}), 'AUTO_MERGE')

// 5. Existing sense MUTATION → HUMAN_EXCEPTION_REQUIRED (FAIL_CLOSED)
run('05 existing sense mutation', baselineFixture({
  filenames: ['bible-mindmap/data/lexicon/approval-registry.json'],
  registryDiff: diffApprovalRegistries(baseRegistryH776, headRegistryMutatedH776),
}), 'FAIL_CLOSED')

// 6. Existing sense DELETION → FAIL_CLOSED
run('06 existing sense deletion', baselineFixture({
  filenames: ['bible-mindmap/data/lexicon/approval-registry.json'],
  registryDiff: diffApprovalRegistries(baseRegistryH776, headRegistryDeletedSense),
}), 'FAIL_CLOSED')

// 7. Existing identity fingerprint DRIFT → FAIL_CLOSED
run('07 existing fingerprint drift', baselineFixture({
  filenames: ['bible-mindmap/data/lexicon/approval-registry.json'],
  registryDiff: diffApprovalRegistries(baseRegistryH776, headRegistryDriftFingerprint),
}), 'FAIL_CLOSED')

// 8. HIGH_RISK_LABEL + actual mutation → still FAIL_CLOSED (label never authorizes)
run('08 high-risk label + actual mutation', baselineFixture({
  pr: { ...baselineFixture().pr, labels: [{ name: V4_LABEL }, { name: HIGH_RISK_LABEL }] },
  filenames: ['bible-mindmap/data/lexicon/approval-registry.json'],
  registryDiff: diffApprovalRegistries(baseRegistryH776, headRegistryMutatedH776),
}), 'FAIL_CLOSED')

// 9. Unresolved thread → FAIL_CLOSED
run('09 unresolved thread', baselineFixture({ reviewThreadsUnresolved: 2 }), 'FAIL_CLOSED')

// 10. CHANGES_REQUESTED from another user → FAIL_CLOSED
run('10 CHANGES_REQUESTED present', baselineFixture({
  reviewsAll: [
    { user: { login: V4_REVIEWER }, state: 'APPROVED', commit_id: HEAD, submitted_at: '2026-08-11T02:00:00Z' },
    { user: { login: 'other-reviewer' }, state: 'CHANGES_REQUESTED', commit_id: HEAD, submitted_at: '2026-08-11T02:05:00Z' },
  ],
}), 'FAIL_CLOSED')

// 11. Required check FAILED → FAIL_CLOSED
{
  const checks = new Map()
  for (const name of V4_REQUIRED_CHECKS) checks.set(name, successCheck())
  checks.set('verify-and-build', failedCheck())
  run('11 required check failed', baselineFixture({ requiredCheckStatuses: checks }), 'FAIL_CLOSED')
}

// 12. Required check MISSING → WAIT
{
  const checks = new Map()
  for (const name of V4_REQUIRED_CHECKS) checks.set(name, successCheck())
  checks.delete('fingerprint')
  run('12 required check missing', baselineFixture({ requiredCheckStatuses: checks }), 'WAIT')
}

// 13. Required check PENDING → WAIT
{
  const checks = new Map()
  for (const name of V4_REQUIRED_CHECKS) checks.set(name, successCheck())
  checks.set('v4 golden audit sample contract', pendingCheck())
  run('13 required check pending', baselineFixture({ requiredCheckStatuses: checks }), 'WAIT')
}

// 14. Draft PR → DECLINE
run('14 draft PR', baselineFixture({ pr: { ...baselineFixture().pr, draft: true } }), 'DECLINE')

// 15. Non-lexicon files + label present → FAIL_CLOSED (label alone insufficient)
run('15 non-lexicon + label alone', baselineFixture({
  filenames: ['bible-mindmap/src/components/SomeUI.jsx'],
}), 'FAIL_CLOSED')

// 16. Lexicon-only files + NO label → DECLINE (label AND scope required)
run('16 lexicon-only + no label', baselineFixture({
  pr: { ...baselineFixture().pr, labels: [] },
}), 'DECLINE')

// 17. Fork PR → FAIL_CLOSED
run('17 fork PR', baselineFixture({
  pr: { ...baselineFixture().pr,
    head: { sha: HEAD, repo: { full_name: 'fork/bible-mindmap' } },
    base: { sha: 'sha-base', repo: { full_name: 'parkminhyun0/bible-mindmap' } },
  },
}), 'FAIL_CLOSED')

// 18. TWO-STAGE: exact-head APPROVED + CI pending → WAIT, then CI complete → AUTO_MERGE
{
  const checksStageA = new Map()
  for (const name of V4_REQUIRED_CHECKS) checksStageA.set(name, successCheck())
  checksStageA.set('v4 auto-merge decision dry-run', pendingCheck())  // one pending
  run('18A two-stage: APPROVED + CI pending', baselineFixture({ requiredCheckStatuses: checksStageA }), 'WAIT')

  // Stage B: same head SHA, same APPROVED review (NOT re-submitted), CI now complete
  const checksStageB = new Map()
  for (const name of V4_REQUIRED_CHECKS) checksStageB.set(name, successCheck())
  run('18B two-stage: same APPROVED reused + CI complete', baselineFixture({ requiredCheckStatuses: checksStageB }), 'AUTO_MERGE')
}

// ── Additional retrieval-error safety
run('19 retrieval error → FAIL_CLOSED', baselineFixture({ retrievalErrors: ['getRegistryContent 404 at base'] }), 'FAIL_CLOSED')

// ── Additional review-thread state null → FAIL_CLOSED (never silently continue)
run('20 review-thread state unknown → FAIL_CLOSED', baselineFixture({ reviewThreadsUnresolved: null }), 'FAIL_CLOSED')

// ── Adversarial: reviewer approved OLD head, later CHANGES_REQUESTED on new head → FAIL_CLOSED
run('21 reviewer approved old head + later CR on new head', baselineFixture({
  reviewsAll: [
    { user: { login: V4_REVIEWER }, state: 'APPROVED', commit_id: OLD_HEAD, submitted_at: '2026-08-11T02:00:00Z' },
    { user: { login: V4_REVIEWER }, state: 'CHANGES_REQUESTED', commit_id: HEAD, submitted_at: '2026-08-11T02:10:00Z' },
  ],
}), 'FAIL_CLOSED')

// ── Adversarial: mergeable_state = dirty → WAIT
run('22 mergeable_state dirty', baselineFixture({ mergeableState: 'dirty' }), 'WAIT')

// ── Summary
const grouped = results.reduce((m, r) => { m[r.verdict] = (m[r.verdict] || 0) + 1; return m }, {})
console.log(`✓ v4 auto-merge decision dry-run · ${results.length} fixtures · ${JSON.stringify(grouped)}`)
console.log(`  fixture 01 (foundation PR) → ${results[0].verdict}`)
console.log(`  fixture 18A (APPROVED + CI pending) → WAIT · 18B (same APPROVED reused + CI complete) → AUTO_MERGE`)
