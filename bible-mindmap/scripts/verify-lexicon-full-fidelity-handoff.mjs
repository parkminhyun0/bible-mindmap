#!/usr/bin/env node
// CLI wrapper around the Full-Fidelity handoff classifier.
// Usage:
//   node scripts/verify-lexicon-full-fidelity-handoff.mjs
//     Loads the current Genesis P5 candidate bundle and prints a per-candidate
//     classification tally. Exits non-zero only when a candidate advertises a
//     readiness class it does not objectively meet.
//   node scripts/verify-lexicon-full-fidelity-handoff.mjs --self-test
//     Runs the inline fixture suite from the classifier module.
//   node scripts/verify-lexicon-full-fidelity-handoff.mjs --json
//     Prints a machine-readable JSON report (same exit-code contract).

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  classifyCandidate,
  detectClaimedButIncomplete,
  runFullFidelityHandoffSelfTest,
} from './lib/lexicon-full-fidelity-handoff.mjs'

const ROOT = process.env.TEST_ROOT || process.cwd()
const args = new Set(process.argv.slice(2))

if (args.has('--self-test')) {
  runFullFidelityHandoffSelfTest()
  console.log('✓ Full-Fidelity handoff classifier self-tests pass')
  process.exit(0)
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(ROOT, relativePath), 'utf8'))
}

const manifest = readJson('data/lexicon/candidates/genesis-p5/manifest.json')
const candidates = []
for (const shard of manifest.shards) {
  const shardData = readJson(shard.path)
  candidates.push(...shardData.candidates)
}

const classifications = []
const claimViolations = []
const tally = { RESEARCH_IN_PROGRESS: 0, CORRECTION_CANDIDATE_INCOMPLETE: 0, HANDOFF_READY: 0, VERIFIER_READY: 0 }

for (const candidate of candidates) {
  const { classification, missingFields, reasons } = classifyCandidate(candidate)
  tally[classification] = (tally[classification] || 0) + 1
  classifications.push({
    strong: candidate.sourceStrong,
    baseStrong: candidate.baseStrong,
    lemma: candidate.identity?.lemma,
    classification,
    missingFields,
    reasons,
  })
  const claim = detectClaimedButIncomplete(candidate, classification)
  if (claim) claimViolations.push({ strong: candidate.sourceStrong, violation: claim })
}

const report = {
  bundleId: manifest.bundleId,
  bundleFingerprint: manifest.bundleFingerprint,
  goldenControlExcluded: manifest.goldenControlExcluded,
  totalCandidates: candidates.length,
  tally,
  claimViolations,
  candidates: classifications,
}

if (args.has('--json')) {
  console.log(JSON.stringify(report, null, 2))
  if (claimViolations.length > 0) process.exit(1)
  process.exit(0)
} else {
  console.log(`Bundle: ${report.bundleId} (${report.totalCandidates} candidates, Golden control excluded=${report.goldenControlExcluded || '(none)'})`)
  console.log('Tally:')
  for (const key of ['RESEARCH_IN_PROGRESS', 'CORRECTION_CANDIDATE_INCOMPLETE', 'HANDOFF_READY', 'VERIFIER_READY']) {
    console.log(`  ${String(tally[key] || 0).padStart(3, ' ')} ${key}`)
  }
  const focus = classifications.filter((entry) => ['H1254a', 'H430'].includes(entry.strong))
  if (focus.length > 0) {
    console.log('\nPriority focus:')
    for (const entry of focus) {
      console.log(`  ${entry.strong} ${entry.lemma}: ${entry.classification}`)
      if (entry.reasons.length > 0) console.log(`    reasons: ${entry.reasons.join(', ')}`)
    }
  }
  if (claimViolations.length > 0) {
    console.error('\n✗ Claim-vs-reality violations:')
    for (const violation of claimViolations) {
      console.error(`  ${violation.strong}: ${violation.violation}`)
    }
  }
}

if (claimViolations.length > 0) process.exit(1)
console.log(`\n✓ Full-Fidelity handoff classifier: no candidate advertises a readiness class it does not meet`)
