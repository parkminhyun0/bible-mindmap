#!/usr/bin/env node
// Golden Audit Sample Contract verifier for Lexicon v4.
// Enforces:
//   - contract file loads and satisfies schema
//   - sampling percentages within bounds
//   - blinding rules enforced
//   - deterministic seeded selection given (batchId, mergeCommit)
//   - halt thresholds present and non-lenient
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..')
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))
const bibleMindmapPath = (p) => (process.env.TEST_ROOT ? resolve(process.env.TEST_ROOT, p) : resolve(REPO_ROOT, p))

const contractPath = bibleMindmapPath('data/lexicon/v4/golden-audit-contract.json')
const contract = readJson(contractPath)

assert.equal(contract.schemaVersion, 1)
assert.ok(contract.sampling.perBookMinPercent >= 1 && contract.sampling.perBookMinPercent <= contract.sampling.perBookMaxPercent, 'per-book sample percent bounds invalid')
assert.ok(contract.sampling.perBookMaxPercent <= 10, 'per-book sample percent cap must remain <= 10 (contract-hardening)')
assert.ok(contract.sampling.perBatchMinPerFiveHundred >= 20, 'per-batch min sample must be at least 20 per 500')
assert.equal(contract.sampling.selectionAlgorithm, 'seeded-shuffle-take')
assert.ok(contract.sampling.selectionSeedRule.includes('sha256'), 'seed rule must reference sha256 for determinism')

// Blinding
assert.equal(contract.blindingRules.originalVerdictHidden, true)
assert.equal(contract.blindingRules.originalReviewerHidden, true)
assert.equal(contract.blindingRules.candidateOnlyPresented, true)
assert.equal(contract.blindingRules.sourcePacketPresented, true)
assert.ok(contract.blindingRules.modelReReviewers.includes('GPT'))
assert.ok(contract.blindingRules.modelReReviewers.includes('Claude'))

// Thresholds
assert.ok(contract.thresholds.perBookDiscrepancyRatePercentHalt >= 1)
assert.ok(contract.thresholds.perBookDiscrepancyRatePercentHalt <= 10, 'book halt threshold must not be lenient (<= 10%)')
assert.ok(contract.thresholds.perBatchDiscrepancyRatePercentHalt >= 1)
assert.ok(contract.thresholds.perBatchDiscrepancyRatePercentHalt <= 20, 'batch halt threshold must not be lenient (<= 20%)')
assert.equal(contract.thresholds.haltAction, 'auto-halt-batch-promotion')
assert.equal(contract.thresholds.haltUnblockRoute, 'human-golden-audit-review')

// Governance
assert.equal(contract.governance.approvalRegistryWriteAllowed, false)
assert.equal(contract.governance.serviceUiWriteAllowed, false)
assert.equal(contract.governance.productionWriteAllowed, false)

// Deterministic sample selection self-test
function selectSample(seedRule, batchId, mergeCommit, population, targetSize) {
  const seedSource = seedRule.replace('batchId', batchId).replace('mergeCommit', mergeCommit)
  const seed = createHash('sha256').update(seedSource + '/golden-audit').digest()
  // Fisher-Yates with sha256-derived pseudo-random
  const arr = [...population]
  let bIndex = 0
  const nextByte = () => {
    if (bIndex >= seed.length) {
      const rehash = createHash('sha256').update(seed).update(String(bIndex)).digest()
      seed[0] = rehash[0]
      bIndex = 0
    }
    return seed[bIndex++]
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = nextByte() % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, targetSize)
}
const sample1 = selectSample(contract.sampling.selectionSeedRule, 'batch-x', 'commit-y', Array.from({ length: 100 }, (_, i) => `H${i + 1}`), 20)
const sample2 = selectSample(contract.sampling.selectionSeedRule, 'batch-x', 'commit-y', Array.from({ length: 100 }, (_, i) => `H${i + 1}`), 20)
assert.deepEqual(sample1, sample2, 'seeded selection must be deterministic across runs with same (batchId, mergeCommit)')
const sample3 = selectSample(contract.sampling.selectionSeedRule, 'batch-x', 'commit-DIFFERENT', Array.from({ length: 100 }, (_, i) => `H${i + 1}`), 20)
assert.notDeepEqual(sample1, sample3, 'different mergeCommit must yield different sample')

console.log(`✓ v4 golden audit sample contract · sampling=${contract.sampling.perBookMinPercent}-${contract.sampling.perBookMaxPercent}% per book · blinding=strict · halt thresholds=${contract.thresholds.perBookDiscrepancyRatePercentHalt}%/${contract.thresholds.perBatchDiscrepancyRatePercentHalt}% · deterministic selection verified`)
