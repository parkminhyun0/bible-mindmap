#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  LEXICON_APPROVAL_LANE,
  ORDINARY_AUTO_LANE,
  SYSTEM_MANUAL_LANE,
  classifyDeliveryLane,
  exactHeadApprovedReviewCandidates,
  isLexiconApprovalSensitivePath,
  isSystemManualPath,
} from '../lib/delivery-lane-policy.mjs'

const ordinary = classifyDeliveryLane([
  'bible-mindmap/src/components/LexicalBridgeModalV2.jsx',
  'bible-mindmap/src/theme/contextBibleMobileFix.css',
])
assert.equal(ordinary.lane, ORDINARY_AUTO_LANE)
assert.deepEqual(ordinary.sensitiveFiles, [])

const candidateResearch = classifyDeliveryLane([
  'bible-mindmap/data/lexicon/candidates/genesis-sample.json',
  'bible-mindmap/reports/genesis-evidence.json',
])
assert.equal(candidateResearch.lane, ORDINARY_AUTO_LANE)

for (const filename of [
  'bible-mindmap/data/lexicon/approval-registry.json',
  'bible-mindmap/data/lexicon/schemas/ApprovalRegistry.schema.json',
  'bible-mindmap/data/lexicon/v4/golden-audit-contract.json',
  'docs/lexicon-workflow/TRACK_STATE.json',
  'bible-mindmap/scripts/verify-genesis-v4-batch-03-registry-promotion.mjs',
]) {
  assert.equal(isLexiconApprovalSensitivePath(filename), true, `${filename} must require lexicon approval`)
}

for (const filename of [
  'AGENTS.md',
  '.github/workflows/delivery-lane-gate.yml',
  'bible-mindmap/scripts/lib/delivery-lane-policy.mjs',
  'bible-mindmap/scripts/verify-workflow-security.mjs',
]) {
  assert.equal(isSystemManualPath(filename), true, `${filename} must be system-manual`)
  assert.equal(isLexiconApprovalSensitivePath(filename), false, `${filename} must not request lexicon reviewer by itself`)
}

const approval = classifyDeliveryLane([
  'bible-mindmap/src/components/LexiconPopup.jsx',
  'bible-mindmap/data/lexicon/approval-registry.json',
])
assert.equal(approval.lane, LEXICON_APPROVAL_LANE)
assert.deepEqual(approval.lexiconApprovalFiles, ['bible-mindmap/data/lexicon/approval-registry.json'])

const system = classifyDeliveryLane([
  '.github/workflows/ordinary-auto-merge.yml',
])
assert.equal(system.lane, SYSTEM_MANUAL_LANE)
assert.deepEqual(system.systemManualFiles, ['.github/workflows/ordinary-auto-merge.yml'])

const mixed = classifyDeliveryLane([
  '.github/workflows/ordinary-auto-merge.yml',
  'bible-mindmap/data/lexicon/approval-registry.json',
])
assert.equal(mixed.lane, LEXICON_APPROVAL_LANE, 'lexicon approval takes precedence for mixed sensitive PRs')

const reviews = [
  { user: { login: 'reviewer-a' }, state: 'APPROVED', commit_id: 'old', submitted_at: '2026-08-12T00:00:00Z' },
  { user: { login: 'reviewer-a' }, state: 'APPROVED', commit_id: 'head', submitted_at: '2026-08-12T01:00:00Z' },
  { user: { login: 'author' }, state: 'APPROVED', commit_id: 'head', submitted_at: '2026-08-12T02:00:00Z' },
]
const candidates = exactHeadApprovedReviewCandidates({ reviews, headSha: 'head', authorLogin: 'author' })
assert.deepEqual(candidates.map(({ login }) => login), ['reviewer-a'])

console.log('✓ delivery lane policy dry-run passed · ordinary-auto / lexicon-human-approval / system-manual')
