#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const APP_ROOT = process.cwd()
const REPO_ROOT = path.resolve(APP_ROOT, '..')
const read = (relative) => fs.readFileSync(path.resolve(REPO_ROOT, relative), 'utf8')

const policy = read('docs/lexicon-workflow/FOUR_LLM_ONLY_POLICY.md')
const master = read('docs/lexicon-workflow/MASTER_WORKFLOW.md')
const checkin = read('docs/lexicon-workflow/LLM_CHECKIN.md')
const gate = JSON.parse(fs.readFileSync(path.resolve(APP_ROOT, 'data/lexicon/luke-g2-execution-gate.json'), 'utf8'))
const pkg = JSON.parse(fs.readFileSync(path.resolve(APP_ROOT, 'package.json'), 'utf8'))

assert.deepEqual(gate.allowedActors, ['gpt', 'jarvis', 'claude', 'gemini'])
assert.equal(gate.executionPolicy?.localModelExecutionAllowed, false)
assert.equal(gate.executionPolicy?.unlistedLlmAllowed, false)
assert.equal(gate.executionPolicy?.adHocTieBreakerModelAllowed, false)
assert.equal(gate.adjudication?.perEntryUserSemanticApprovalRequired, false)
assert.equal(gate.adjudication?.finalAdjudicator, 'gpt')
assert.equal(gate.adjudication?.publicEvidenceRightsPassRequired, true)
assert.equal(gate.adjudication?.unresolvedMustBeZeroForAutomaticSemanticPromotion, true)

for (const text of [policy, master, checkin]) {
  assert.ok(text.includes('GPT'))
  assert.ok(text.includes('자비스'))
  assert.ok(text.includes('Claude'))
  assert.ok(text.includes('Gemini'))
}
assert.ok(policy.includes('추가 LLM'))
assert.ok(policy.includes('로컬 호스팅 모델'))
assert.ok(policy.includes('HOLD'))
assert.ok(policy.includes('DISPUTE'))

const removedOperationalPaths = [
  '.github/workflows/luke-lexicon-g2-zero-cost.yml',
  '.github/workflows/luke-lexicon-g2-canary-preparation.yml',
  '.github/workflows/genesis-g2-zero-cost.yml',
  'bible-mindmap/scripts/ai/lexicon/run-luke-g2-local-ollama.mjs',
  'bible-mindmap/scripts/ai/lexicon/run-luke-g2-zero-cost-pipeline.mjs',
  'bible-mindmap/scripts/ai/lexicon/import-luke-g2-zero-cost-manual.mjs',
  'bible-mindmap/scripts/build-luke-g2-zero-cost-bundle.mjs',
  'bible-mindmap/scripts/build-luke-g2-human-review-bundle.mjs',
  'bible-mindmap/scripts/verify-luke-g2-local-results.mjs',
  'bible-mindmap/scripts/verify-luke-g2-zero-cost-policy.mjs',
  'bible-mindmap/scripts/build-luke-g2-canary-preparation.mjs',
  'bible-mindmap/scripts/verify-luke-g2-canary-preparation.mjs',
  'bible-mindmap/scripts/materialize-luke-g2-canary-preparation.mjs',
  'bible-mindmap/scripts/ai/lexicon/run-genesis-g2-local-ollama.mjs',
  'bible-mindmap/scripts/ai/lexicon/run-genesis-g2-zero-cost-pipeline.mjs',
  'bible-mindmap/scripts/ai/lexicon/import-genesis-g2-zero-cost-manual.mjs',
  'bible-mindmap/scripts/build-genesis-g2-zero-cost-bundle.mjs',
  'bible-mindmap/scripts/verify-genesis-g2-zero-cost-policy.mjs',
  'bible-mindmap/docs/genesis-g2-zero-cost-runbook.md',
  'bible-mindmap/docs/genesis-g2-zero-cost-one-command.md',
  'bible-mindmap/docs/genesis-g2-human-review-hardening.md',
  'bible-mindmap/scripts/build-genesis-g2-human-review-bundle.mjs',
]
for (const relative of removedOperationalPaths) {
  assert.equal(fs.existsSync(path.resolve(REPO_ROOT, relative)), false, `deprecated local-model operational path reintroduced: ${relative}`)
}

for (const scriptName of Object.keys(pkg.scripts || {})) {
  assert.ok(!/genesis:g2:zero-cost|luke:g2:zero-cost|ollama|local-model/iu.test(scriptName), `deprecated local-model npm script reintroduced: ${scriptName}`)
}
for (const command of Object.values(pkg.scripts || {})) {
  assert.ok(!/run-(?:genesis|luke)-g2-local-ollama|g2-zero-cost/iu.test(String(command)), `deprecated local-model command reintroduced: ${command}`)
}

console.log('✓ lexicon fixed-four policy PASS · GPT/Jarvis/Claude/Gemini only · local-model operational paths absent')
