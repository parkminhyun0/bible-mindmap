#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const APP = resolve(HERE, '..')
const ROOT = resolve(HERE, '../..')
const policy = readFileSync(resolve(ROOT, 'docs/lexicon-workflow/LICENSE_SAFE_FULL_FIDELITY_66BOOKS.md'), 'utf8')
const matrix = JSON.parse(readFileSync(resolve(APP, 'data/lexicon/v4/tier-gate-matrix.json'), 'utf8'))

for (const token of ['GPT · 자비스 · Claude · Gemini','sourceUnitCount','koMappedUnitCount','HOLD/DISPUTE']) {
  assert.ok(policy.includes(token), `policy token missing: ${token}`)
}
assert.equal(matrix.schemaVersion, 2)
assert.equal(matrix.policyDoc, 'docs/lexicon-workflow/LICENSE_SAFE_FULL_FIDELITY_66BOOKS.md')
assert.equal(matrix.modelMajorityRuleProhibited, true)
assert.equal(matrix.threeOfThreeConsensusAuthorityProhibited, true)
assert.equal(matrix.perEntryUserSemanticApprovalRequired, false)
assert.equal(matrix.tiers.R4.perEntryHumanFinalWordingRequired, false)
for (const gate of ['rights-license','source-fidelity','source-completeness','qualifier-preservation','morphology','corpus-alignment','fixed-four-independent-evidence','gpt-public-evidence-adjudication','unresolved-zero']) {
  assert.ok(matrix.commonRequiredGates.includes(gate), `common gate missing: ${gate}`)
}
console.log('✓ unified 66-book License-Safe Full-Fidelity foundation PASS')
