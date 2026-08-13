#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const gate = JSON.parse(readFileSync('data/lexicon/luke-g2-execution-gate.json', 'utf8'))
const contract = readFileSync('scripts/ai/lexicon/luke-g2-translation-contract.mjs', 'utf8')
const runbook = readFileSync('docs/luke-g2-four-llm-evidence-runbook.md', 'utf8')
const sharedPolicy = readFileSync('../docs/lexicon-workflow/FOUR_LLM_ONLY_POLICY.md', 'utf8')

assert.equal(gate.schemaVersion, 2)
assert.equal(gate.gateId, 'luke-g2-four-llm-evidence-v2')
assert.deepEqual(gate.allowedActors, ['gpt', 'jarvis', 'claude', 'gemini'])
assert.equal(gate.actorIndependence.allFourResultsRequiredBeforeFinalAdjudication, true)
assert.equal(gate.actorIndependence.modelMajorityIsAuthority, false)
assert.equal(gate.executionPolicy.repositoryDoesNotInvokeModels, true)
assert.equal(gate.executionPolicy.localModelExecutionAllowed, false)
assert.equal(gate.executionPolicy.unlistedLlmAllowed, false)
assert.equal(gate.executionPolicy.adHocTieBreakerModelAllowed, false)
assert.equal(gate.adjudication.finalAdjudicator, 'gpt')
assert.equal(gate.adjudication.mode, 'public-evidence-first')
assert.equal(gate.adjudication.publicEvidenceRightsPassRequired, true)
assert.equal(gate.adjudication.deterministicVerifierPassRequired, true)
assert.equal(gate.adjudication.unresolvedMustBeZeroForAutomaticSemanticPromotion, true)
assert.equal(gate.adjudication.perEntryUserSemanticApprovalRequired, false)
assert.equal(gate.safety.productionWriteAllowed, false)

for (const actor of ['gpt', 'jarvis', 'claude', 'gemini']) {
  assert.ok(contract.includes(`'${actor}'`), `contract missing actor ${actor}`)
}
assert.ok(runbook.includes('Rights-PASS 공개 Greek lexicon'))
assert.ok(runbook.includes('사용자는 정상 Strong의 의미를 일일이 검수하지 않는다'))
assert.ok(sharedPolicy.includes('GPT · 자비스 · Claude · Gemini'))
assert.ok(sharedPolicy.includes('HOLD'))
assert.ok(sharedPolicy.includes('DISPUTE'))
console.log('✓ Luke G2 fixed-four/public-evidence policy verifier passed')
