#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = process.env.TEST_ROOT || process.cwd()
const read = (p) => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8'))

const queue = read('data/lexicon/v4/genesis-p5-r4-extended-research-queue.json')
const evidence = read('reports/genesis-p5-r4-extended-evidence-intake.json')
const manifest = read('data/lexicon/candidates/genesis-p5/manifest.json')
const registry = read('data/lexicon/approval-registry.json')
const shards = manifest.shards.map((meta) => read(meta.path))
const candidates = shards.flatMap((shard) => shard.candidates)
const candidateByStrong = new Map(candidates.map((candidate) => [candidate.sourceStrong, candidate]))
const registryStrongs = new Set(registry.entries.map((entry) => entry.identity.canonicalStrong))

assert.equal(queue.schemaVersion, 1)
assert.equal(queue.queueId, 'genesis-p5-r4-extended-research-v1')
assert.equal(queue.book, 'GEN')
assert.equal(queue.sourceCandidateBundleFingerprint, manifest.bundleFingerprint)
assert.equal(queue.route, 'EXTENDED_RESEARCH_REQUIRED')
assert.equal(queue.items.length, 5)

const expected = ['H120', 'H6030b', 'H7650', 'H28', 'H39']
assert.deepEqual(queue.items.map((item) => item.strong), expected)
assert.equal(new Set(queue.items.map((item) => item.strong)).size, 5)

for (const item of queue.items) {
  const candidate = candidateByStrong.get(item.strong)
  assert.ok(candidate, `${item.strong}: candidate missing`)
  assert.equal(candidate.risk.tier, 'R4', `${item.strong}: candidate must remain R4`)
  assert.equal(item.tier, 'R4')
  assert.equal(item.status, 'EXTENDED_RESEARCH_REQUIRED')
  assert.deepEqual(item.reasons, candidate.risk.flags, `${item.strong}: queue reasons must exactly match pinned candidate risk flags`)
  assert.equal(registryStrongs.has(item.strong), false, `${item.strong}: R4 must not be in Approval Registry`)
  for (const key of ['finalApprovalAllowed', 'approvalRegistryWriteAllowed', 'serviceUiWriteAllowed', 'productionWriteAllowed', 'existingApprovedMeaningMutationAllowed']) {
    assert.equal(candidate.governance[key], false, `${item.strong}: candidate governance ${key} must remain false`)
  }
}

assert.deepEqual(queue.requiredEvidence, [
  'additional-public-lexicon-evidence',
  'biblical-usage-evidence',
  'scholarly-evidence-when-publicly-accessible',
  'three-model-reaudit-on-same-pinned-candidate-baseline',
])
for (const [key, value] of Object.entries(queue.governance)) assert.equal(value, false, `queue governance ${key} must remain false`)

assert.equal(evidence.schemaVersion, 1)
assert.equal(evidence.reportId, 'genesis-p5-r4-extended-evidence-intake-v1')
assert.equal(evidence.book, 'GEN')
assert.equal(evidence.status, 'EVIDENCE_INTAKE_IN_PROGRESS')
assert.equal(evidence.baseline.candidateBundleFingerprint, manifest.bundleFingerprint, 'evidence candidate bundle drift')
assert.equal(evidence.baseline.sourceInputBundleFingerprint, manifest.sourceInputBundleFingerprint, 'evidence source-input bundle drift')
assert.deepEqual(evidence.items.map((item) => item.strong), expected, 'evidence R4 item order/set drift')
assert.equal(new Set(evidence.items.map((item) => item.strong)).size, 5)
for (const item of evidence.items) {
  assert.ok(Array.isArray(item.publicEvidence) && item.publicEvidence.length > 0, `${item.strong}: public evidence missing`)
  assert.ok(Array.isArray(item.unresolved) && item.unresolved.length > 0, `${item.strong}: unresolved research state must be explicit`)
  assert.equal(registryStrongs.has(item.strong), false, `${item.strong}: evidence intake must not promote Registry state`)
}
for (const [key, value] of Object.entries(evidence.governance)) {
  if (key === 'evidenceCollectionOnly') assert.equal(value, true)
  else assert.equal(value, false, `evidence governance ${key} must remain false`)
}
assert.equal(evidence.summary.items, 5)
assert.equal(evidence.summary.readyForRegistry, 0)
assert.equal(evidence.summary.candidateMutations, 0)
assert.equal(evidence.summary.registryWrites, 0)
assert.equal(evidence.summary.meaningChanges, 0)
assert.equal(evidence.nextGate, 'COMPLETE_PINNED_CORPUS_USAGE_EXTRACTION_THEN_THREE_MODEL_REAUDIT')

console.log('✓ Genesis P5 R4 queue + evidence intake · 5/5 research-only · Registry writes=0 · candidate mutations=0')
