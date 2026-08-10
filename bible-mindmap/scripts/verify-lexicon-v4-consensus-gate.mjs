#!/usr/bin/env node
// Consensus Gate for Evidence-First Autonomous Lexicon v4.
// Given a set of R3+ candidate Strongs, verifies:
//   1. Every required gate for each Strong's tier PASSes (AND, no majority)
//   2. For R3+: GPT+Claude+Gemini all final verdict = PASS
//   3. All three model evidence files reference the same candidate fingerprint
//      and same manifest.bundleFingerprint (fingerprint-same-baseline)
//   4. unresolved dispute count = 0
// Supports --self-test which runs against Genesis P5 R3 consensus fixtures.
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..')
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))
const bibleMindmapPath = (p) => (process.env.TEST_ROOT ? resolve(process.env.TEST_ROOT, p) : resolve(REPO_ROOT, p))

const args = process.argv.slice(2)
const isSelfTest = args.includes('--self-test')
const matrix = readJson(bibleMindmapPath('data/lexicon/v4/tier-gate-matrix.json'))

function assertConsensus(strong, tier, evidence) {
  const requirements = matrix.tiers[tier]?.autoEligibilityRequires || []
  assert.ok(requirements.length > 0 || tier === 'R4', `${strong}: unknown or empty tier ${tier}`)

  if (tier === 'R4') {
    assert.equal(matrix.tiers.R4.autoApprovalProhibited, true, 'R4 auto-approval must be prohibited by matrix')
    return { strong, tier, verdict: 'AUTO_APPROVAL_PROHIBITED', reason: 'R4 routed to EXTENDED_RESEARCH_REQUIRED' }
  }

  // R3+: consensus checks
  if (tier === 'R3' || tier === 'R2') {
    assert.ok(evidence.claude, `${strong}: claude evidence required`)
    assert.equal(evidence.claude.verdict, 'PASS', `${strong}: Claude final verdict must be PASS (got ${evidence.claude.verdict})`)
  }
  if (tier === 'R3') {
    assert.ok(evidence.gpt, `${strong}: gpt evidence required for R3 consensus`)
    assert.ok(evidence.gemini, `${strong}: gemini evidence required for R3 consensus`)
    assert.equal(evidence.gpt.verdict, 'PASS', `${strong}: GPT verdict must be PASS`)
    assert.equal(evidence.gemini.verdict, 'PASS', `${strong}: Gemini final verdict must be PASS`)

    // fingerprint-same-baseline (all three refer to same candidate + bundle)
    const cands = [evidence.gpt.candidateFingerprint, evidence.claude.candidateFingerprint, evidence.gemini.candidateFingerprint]
    assert.equal(new Set(cands).size, 1, `${strong}: candidateFingerprint drift across models: ${JSON.stringify(cands)}`)
    const bundles = [evidence.gpt.bundleFingerprint, evidence.claude.bundleFingerprint, evidence.gemini.bundleFingerprint]
    assert.equal(new Set(bundles).size, 1, `${strong}: bundleFingerprint drift across models: ${JSON.stringify(bundles)}`)

    // unresolved-zero
    assert.equal(evidence.unresolvedThreads ?? 0, 0, `${strong}: unresolved review threads > 0`)
    assert.equal(evidence.disputeRequired ?? 0, 0, `${strong}: dispute-required entries > 0`)
  }

  // per-gate assertions must be provided in evidence.gates map
  for (const g of requirements) {
    if (g === 'consensus-3-of-3' || g === 'fingerprint-same-baseline' || g === 'unresolved-zero') continue
    const gateResult = evidence.gates?.[g]
    assert.ok(gateResult, `${strong}: gate ${g} evidence missing`)
    assert.equal(gateResult.verdict, 'PASS', `${strong}: gate ${g} must PASS (got ${gateResult.verdict})`)
  }

  return { strong, tier, verdict: 'AUTO_APPROVE_ELIGIBLE', gatesPassed: requirements }
}

function selfTest() {
  // Fixture: Genesis P5 R3 consensus (post-#298).
  const bundleFp = 'sha256:a9ebdc22e34659332b84ced41118597feae70f18a742e8a5234968e902c9d261'
  const commonGates = Object.fromEntries(
    ['source-fidelity', 'license', 'sense-boundary', 'morphology', 'regression', 'korean-naturalness', 'corpus-alignment', 'theological-overreach']
      .map((g) => [g, { verdict: 'PASS', evidence: `Genesis P5 evidence chain (PR #296/#297/#298)` }])
  )
  const genesisP5R3 = [
    { strong: 'H430',   tier: 'R3', cf: 'sha256:02664e787a8128b60111e81b254d01362cd4230e98cf9897de54d365accad89e' },
    { strong: 'H1254a', tier: 'R3', cf: 'sha256:b99fc8722919cbf124b378ff2d5aeb926ba16a67d7c8b1f47059c0e475bb8b60' },
    { strong: 'H3117',  tier: 'R3', cf: 'sha256:170972a3fc2c7f5bd70f470f0259a935b13a0c0eeaf81367f3a9fedb0876048e' },
    { strong: 'H7307',  tier: 'R3', cf: 'sha256:130f24812189ee7e39277c43418ffd163b5d3a99369a4e2e27f0350e4281be1e' },
    { strong: 'H46',    tier: 'R3', cf: 'sha256:0daf06ea55f8b46b98c89f4e0e1bd77d5cb2eaeb2a14d23c5b12741b8d15de6e' },
  ]
  const results = genesisP5R3.map(({ strong, tier, cf }) => assertConsensus(strong, tier, {
    gpt:    { verdict: 'PASS', candidateFingerprint: cf, bundleFingerprint: bundleFp },
    claude: { verdict: 'PASS', candidateFingerprint: cf, bundleFingerprint: bundleFp },
    gemini: { verdict: 'PASS', candidateFingerprint: cf, bundleFingerprint: bundleFp },
    unresolvedThreads: 0,
    disputeRequired: 0,
    gates: commonGates,
  }))
  // R4 negative test
  const r4Result = assertConsensus('H120', 'R4', {})
  assert.equal(r4Result.verdict, 'AUTO_APPROVAL_PROHIBITED')

  // Adversarial: 2-of-3 (gemini DISPUTE) must fail
  let refused = false
  try {
    assertConsensus('H430', 'R3', {
      gpt:    { verdict: 'PASS', candidateFingerprint: 'x', bundleFingerprint: 'y' },
      claude: { verdict: 'PASS', candidateFingerprint: 'x', bundleFingerprint: 'y' },
      gemini: { verdict: 'DISPUTE', candidateFingerprint: 'x', bundleFingerprint: 'y' },
      gates: commonGates,
    })
  } catch (_e) { refused = true }
  assert.ok(refused, 'consensus gate MUST refuse 2-of-3; found it accepted 2-of-3')

  // Adversarial: fingerprint drift must fail
  refused = false
  try {
    assertConsensus('H430', 'R3', {
      gpt:    { verdict: 'PASS', candidateFingerprint: 'x', bundleFingerprint: 'y' },
      claude: { verdict: 'PASS', candidateFingerprint: 'DRIFT', bundleFingerprint: 'y' },
      gemini: { verdict: 'PASS', candidateFingerprint: 'x', bundleFingerprint: 'y' },
      gates: commonGates,
    })
  } catch (_e) { refused = true }
  assert.ok(refused, 'consensus gate MUST refuse candidateFingerprint drift')

  // Adversarial: missing gate must fail
  refused = false
  try {
    const missingGates = { ...commonGates }
    delete missingGates['theological-overreach']
    assertConsensus('H430', 'R3', {
      gpt:    { verdict: 'PASS', candidateFingerprint: 'x', bundleFingerprint: 'y' },
      claude: { verdict: 'PASS', candidateFingerprint: 'x', bundleFingerprint: 'y' },
      gemini: { verdict: 'PASS', candidateFingerprint: 'x', bundleFingerprint: 'y' },
      gates: missingGates,
    })
  } catch (_e) { refused = true }
  assert.ok(refused, 'consensus gate MUST refuse missing gate evidence')

  console.log(`✓ v4 consensus gate self-test · ${results.length} R3 PASS · R4 auto-prohibited · 3 adversarial refusals confirmed`)
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`
if (isMainModule) {
  if (isSelfTest || !process.env.CONSENSUS_INPUT) {
    selfTest()
  } else {
    const input = readJson(resolve(process.env.CONSENSUS_INPUT))
    const results = input.candidates.map((c) => assertConsensus(c.strong, c.tier, c.evidence))
    const eligible = results.filter((r) => r.verdict === 'AUTO_APPROVE_ELIGIBLE')
    console.log(`✓ v4 consensus gate · ${eligible.length}/${results.length} auto-approve eligible`)
  }
}

export { assertConsensus }
