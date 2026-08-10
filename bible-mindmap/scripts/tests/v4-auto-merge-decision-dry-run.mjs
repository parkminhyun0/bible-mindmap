#!/usr/bin/env node
// Contract dry-run for lexicon-v4-auto-merge workflow decision logic.
// Simulates PR + review contexts and validates the workflow would either
// auto-merge OR fail-close as expected.
//
// This is a self-contained inlining of the JS from lexicon-v4-auto-merge.yml
// script step, so unit-tests can run without spinning up GitHub Actions.
import assert from 'node:assert/strict'

// ── Inlined decision function (mirrors lexicon-v4-auto-merge.yml)
function decideAutoMerge({ pr, review, reviews, filenames, workflowRuns, reviewThreads }) {
  const V4_REVIEWER = 'bible-mindmap-review'
  const V4_LABEL = 'lexicon-v4-auto-merge-eligible'
  const HIGH_RISK_LABEL = 'existing-approved-meaning-change'
  const labels = new Set(pr.labels.map((l) => l.name))
  const reasons = []
  const info = []

  if (review.user.login !== V4_REVIEWER) return { verdict: 'DECLINE', reason: `reviewer=${review.user.login} (only ${V4_REVIEWER})` }
  if (pr.state !== 'open' || pr.draft) return { verdict: 'DECLINE', reason: 'PR not open/ready' }
  if (pr.head.repo.full_name !== `${pr.base.repo.full_name}`) return { verdict: 'FAIL_CLOSED', reason: 'fork PR' }

  if (review.commit_id !== pr.head.sha) {
    return { verdict: 'FAIL_CLOSED', reason: `review commit ${review.commit_id} != head ${pr.head.sha}` }
  }

  const lexiconOnly = filenames.every((f) =>
    f.startsWith('bible-mindmap/data/lexicon/') ||
    f.startsWith('bible-mindmap/reports/') ||
    f.startsWith('docs/lexicon-workflow/') ||
    f.startsWith('bible-mindmap/scripts/verify-lexicon-') ||
    f.startsWith('bible-mindmap/scripts/verify-golden-audit-') ||
    f.startsWith('bible-mindmap/scripts/tests/v4-') ||
    f === 'memory/RESUME.json' ||
    f.startsWith('.github/workflows/lexicon-v4-')
  )
  if (!labels.has(V4_LABEL) && !lexiconOnly) return { verdict: 'DECLINE', reason: `PR outside lexicon scope, no ${V4_LABEL} label; files: ${filenames.filter(f => !lexiconOnly).slice(0,3)}` }

  const touchesRegistry = filenames.some((f) => f === 'bible-mindmap/data/lexicon/approval-registry.json')
  if (touchesRegistry && !labels.has(HIGH_RISK_LABEL)) return { verdict: 'FAIL_CLOSED', reason: `touches approval-registry.json without ${HIGH_RISK_LABEL} label` }

  if (reviews.some((r) => r.state === 'CHANGES_REQUESTED')) return { verdict: 'FAIL_CLOSED', reason: 'CHANGES_REQUESTED present' }

  const unresolved = reviewThreads.filter((t) => !t.isResolved && !t.isOutdated)
  if (unresolved.length > 0) return { verdict: 'FAIL_CLOSED', reason: `unresolved review threads: ${unresolved.length}` }

  const pending = workflowRuns.filter((r) => r.status !== 'completed')
  if (pending.length > 0) return { verdict: 'WAIT', reason: `${pending.length} workflow pending` }

  const failed = workflowRuns.filter((r) => !['success', 'skipped', 'neutral'].includes(r.conclusion))
  if (failed.length > 0) return { verdict: 'FAIL_CLOSED', reason: `failed workflows: ${failed.map((r) => r.name).join(', ')}` }

  if (pr.mergeable === false || ['dirty', 'blocked', 'behind'].includes(pr.mergeable_state)) {
    return { verdict: 'FAIL_CLOSED', reason: `not safely mergeable: ${pr.mergeable_state}` }
  }

  return { verdict: 'AUTO_MERGE', reason: 'all v4 gates passed' }
}

// ── Fixture: this PR (Automation Foundation), reviewed by bible-mindmap-review
const foundationPrFixture = {
  pr: {
    state: 'open', draft: false, mergeable: true, mergeable_state: 'clean',
    head: { sha: 'sha-foundation', repo: { full_name: 'parkminhyun0/bible-mindmap' } },
    base: { repo: { full_name: 'parkminhyun0/bible-mindmap' } },
    labels: [],
  },
  review: { user: { login: 'bible-mindmap-review' }, commit_id: 'sha-foundation', state: 'approved' },
  reviews: [{ state: 'APPROVED' }],
  reviewThreads: [],
  workflowRuns: [
    { name: 'Lexicon v4 Foundation / foundation-contract', status: 'completed', conclusion: 'success' },
    { name: 'Lexicon v4 Foundation / consensus-gate', status: 'completed', conclusion: 'success' },
    { name: 'Lexicon v4 Foundation / universal-regression', status: 'completed', conclusion: 'success' },
    { name: 'Lexicon v4 Foundation / golden-audit-contract', status: 'completed', conclusion: 'success' },
    { name: 'Validate pull request / verify-and-build', status: 'completed', conclusion: 'success' },
    { name: 'Validate pull request / security-audit', status: 'completed', conclusion: 'success' },
  ],
  filenames: [
    'docs/lexicon-workflow/TRACK_STATE.json',
    'docs/lexicon-workflow/v4-EVIDENCE_FIRST_AUTONOMOUS.md',
    'bible-mindmap/data/lexicon/v4/tier-gate-matrix.json',
    'bible-mindmap/data/lexicon/v4/human-exception-triggers.json',
    'bible-mindmap/data/lexicon/v4/golden-audit-contract.json',
    'bible-mindmap/data/lexicon/v4/registry-snapshot.json',
    'bible-mindmap/scripts/verify-lexicon-v4-foundation-contract.mjs',
    'bible-mindmap/scripts/verify-lexicon-v4-consensus-gate.mjs',
    'bible-mindmap/scripts/verify-lexicon-registry-universal-regression.mjs',
    'bible-mindmap/scripts/verify-golden-audit-sample-contract.mjs',
    '.github/workflows/lexicon-v4-foundation.yml',
    '.github/workflows/lexicon-v4-auto-merge.yml',
    'memory/RESUME.json',
    'bible-mindmap/scripts/tests/v4-auto-merge-decision-dry-run.mjs',
  ],
}

// Case 1: Foundation PR itself — should AUTO_MERGE (all gates pass)
const c1 = decideAutoMerge(foundationPrFixture)
assert.equal(c1.verdict, 'AUTO_MERGE', `foundation PR must auto-merge; got ${c1.verdict}: ${c1.reason}`)

// Case 2: Reviewer identity wrong
const c2 = decideAutoMerge({ ...foundationPrFixture, review: { ...foundationPrFixture.review, user: { login: 'other-user' } } })
assert.equal(c2.verdict, 'DECLINE', 'wrong reviewer must DECLINE')

// Case 3: Review SHA drift
const c3 = decideAutoMerge({ ...foundationPrFixture, review: { ...foundationPrFixture.review, commit_id: 'sha-different' } })
assert.equal(c3.verdict, 'FAIL_CLOSED', 'SHA drift must FAIL_CLOSED')

// Case 4: Touches approval-registry.json without high-risk label
const c4 = decideAutoMerge({
  ...foundationPrFixture,
  filenames: [...foundationPrFixture.filenames, 'bible-mindmap/data/lexicon/approval-registry.json'],
})
assert.equal(c4.verdict, 'FAIL_CLOSED', 'registry touch without high-risk label must FAIL_CLOSED')
assert.ok(c4.reason.includes('existing-approved-meaning-change'), 'reason must reference required label')

// Case 5: Touches registry WITH high-risk label
const c5 = decideAutoMerge({
  ...foundationPrFixture,
  pr: { ...foundationPrFixture.pr, labels: [{ name: 'existing-approved-meaning-change' }] },
  filenames: [...foundationPrFixture.filenames, 'bible-mindmap/data/lexicon/approval-registry.json'],
})
assert.equal(c5.verdict, 'AUTO_MERGE', 'registry touch with high-risk label must AUTO_MERGE')

// Case 6: Unresolved review thread
const c6 = decideAutoMerge({ ...foundationPrFixture, reviewThreads: [{ isResolved: false, isOutdated: false }] })
assert.equal(c6.verdict, 'FAIL_CLOSED', 'unresolved thread must FAIL_CLOSED')

// Case 7: CHANGES_REQUESTED from another reviewer
const c7 = decideAutoMerge({ ...foundationPrFixture, reviews: [{ state: 'APPROVED' }, { state: 'CHANGES_REQUESTED' }] })
assert.equal(c7.verdict, 'FAIL_CLOSED', 'CHANGES_REQUESTED must FAIL_CLOSED')

// Case 8: One workflow failed
const c8 = decideAutoMerge({
  ...foundationPrFixture,
  workflowRuns: [...foundationPrFixture.workflowRuns.slice(0, -1), { name: 'browser-smoke', status: 'completed', conclusion: 'failure' }],
})
assert.equal(c8.verdict, 'FAIL_CLOSED', 'failed workflow must FAIL_CLOSED')

// Case 9: Workflow still pending
const c9 = decideAutoMerge({
  ...foundationPrFixture,
  workflowRuns: [...foundationPrFixture.workflowRuns.slice(0, -1), { name: 'browser-smoke', status: 'in_progress', conclusion: null }],
})
assert.equal(c9.verdict, 'WAIT', 'pending workflow must WAIT (not fail)')

// Case 10: PR outside lexicon scope, no label
const c10 = decideAutoMerge({
  ...foundationPrFixture,
  filenames: ['bible-mindmap/src/components/SomeUI.jsx'],
})
assert.equal(c10.verdict, 'DECLINE', 'non-lexicon PR without eligibility label must DECLINE')

// Case 11: PR outside lexicon scope WITH label
const c11 = decideAutoMerge({
  ...foundationPrFixture,
  pr: { ...foundationPrFixture.pr, labels: [{ name: 'lexicon-v4-auto-merge-eligible' }] },
  filenames: ['bible-mindmap/src/components/SomeUI.jsx'],
})
assert.equal(c11.verdict, 'AUTO_MERGE', 'non-lexicon PR WITH label must AUTO_MERGE')

// Case 12: Draft PR
const c12 = decideAutoMerge({ ...foundationPrFixture, pr: { ...foundationPrFixture.pr, draft: true } })
assert.equal(c12.verdict, 'DECLINE', 'draft PR must DECLINE')

console.log(`✓ v4 auto-merge decision dry-run · 12 fixtures · AUTO_MERGE·DECLINE·FAIL_CLOSED·WAIT all correct`)
console.log(`  foundation PR under review → verdict = ${c1.verdict}`)
