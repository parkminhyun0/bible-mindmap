#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const FILES = {
  workflow: '.github/workflows/luke-lexicon-g2-zero-cost.yml',
  contract: 'bible-mindmap/scripts/ai/lexicon/luke-g2-translation-contract.mjs',
  builder: 'bible-mindmap/scripts/build-luke-g2-zero-cost-bundle.mjs',
  reviewBundle: 'bible-mindmap/scripts/build-luke-g2-human-review-bundle.mjs',
  runner: 'bible-mindmap/scripts/ai/lexicon/run-luke-g2-local-ollama.mjs',
  pipeline: 'bible-mindmap/scripts/ai/lexicon/run-luke-g2-zero-cost-pipeline.mjs',
  manualImporter: 'bible-mindmap/scripts/ai/lexicon/import-luke-g2-zero-cost-manual.mjs',
  verifier: 'bible-mindmap/scripts/verify-luke-g2-local-results.mjs',
  runbook: 'bible-mindmap/docs/luke-g2-zero-cost-runbook.md',
}

const read = (path) => readFileSync(resolve('..', path), 'utf8')
const workflow = read(FILES.workflow)
const contract = read(FILES.contract)
const builder = read(FILES.builder)
const reviewBundle = read(FILES.reviewBundle)
const runner = read(FILES.runner)
const pipeline = read(FILES.pipeline)
const manualImporter = read(FILES.manualImporter)
const verifier = read(FILES.verifier)
const runbook = read(FILES.runbook)
const runtime = [workflow, contract, builder, reviewBundle, runner, pipeline, manualImporter, verifier].join('\n')

for (const forbidden of [
  'api.openai.com',
  'integrate.api.nvidia.com',
  'generativelanguage.googleapis.com',
  'api.groq.com',
  'openrouter.ai/api',
  'secrets.NVIDIA_API_KEY',
  'secrets.OPENAI_API_KEY',
  'secrets.OLLAMA_API_KEY',
]) {
  assert.ok(!runtime.includes(forbidden), `zero-cost runtime contains forbidden external/cloud dependency: ${forbidden}`)
}

assert.ok(workflow.includes('runs-on: ubuntu-latest'), 'workflow must use a standard public runner')
assert.ok(!workflow.includes('secrets.'), 'workflow must not read GitHub secrets')
assert.ok(!workflow.includes('upload-artifact'), 'workflow must not retain artifacts')
assert.ok(workflow.includes('--self-test'), 'workflow must remain offline self-test and bundle verification only')
assert.ok(!workflow.includes('--execute'), 'workflow must never execute local models or import candidates')

for (const required of [
  'http://127.0.0.1:11434/api',
  'externalPaidApiAllowed: false',
  'cloudModelAllowed: false',
  'apiKeysRequired: false',
  'productionWriteAllowed: false',
  'RUN-LUKE-G2-CANARY',
]) {
  assert.ok([builder, runner, pipeline, runbook].join('\n').includes(required), `zero-cost contract missing: ${required}`)
}

for (const required of [
  "new Set(['127.0.0.1', 'localhost', '[::1]'])",
  "url.protocol !== 'http:'",
  "gate.modes?.localTwoModel?.enabled !== true",
  "gate.executionAllowed !== true",
  "args.killSwitch !== 'off'",
  "actualExecutionBackend: 'ollama-local'",
  'externalPaidApiUsed: false',
  'DEFAULT_NUM_CTX = 8192',
  'DEFAULT_TEMPERATURE = 0',
  'generationSettings',
]) {
  assert.ok(runner.includes(required), `local runner boundary missing: ${required}`)
}

for (const required of [
  'transliterationKo must be a Korean Hangul pronunciation',
  'must contain Hangul',
  'contains Chinese Han characters',
  'confidence calibration invalid: every context decision is 1.0',
  'required riskFlag missing',
  "G2316: Object.freeze(['theological-sensitive'])",
  "G932: Object.freeze(['polysemy', 'theological-sensitive'])",
  "G4151: Object.freeze(['polysemy', 'theological-sensitive'])",
  "G3137: Object.freeze(['proper-name'])",
  "G2: Object.freeze(['proper-name'])",
]) {
  assert.ok(contract.includes(required), `candidate quality gate missing: ${required}`)
}

for (const required of [
  'slot A/B must use different local models',
  'slot A/B must not use the same local model digest',
  'preflight-complete-execution-blocked',
  "report.status = 'human-review-required'",
  'productionWriteAllowed: false',
]) {
  assert.ok(pipeline.includes(required), `one-command pipeline boundary missing: ${required}`)
}

for (const required of [
  'manualIndependentJson mode is disabled in the committed Gate',
  "actualExecutionBackend: 'manual-independent-json'",
  'productionWriteAllowed: false',
  'humanReviewRequired: true',
]) {
  assert.ok(manualImporter.includes(required), `manual importer boundary missing: ${required}`)
}

for (const required of [
  'data/lexicon/luke-g2-canary-preparation.json',
  'reports/luke-g2-zero-cost-execution/candidates',
  'sourceContextPreparationIncluded: true',
  'humanReviewRequired: true',
  'finalApprovalAllowed: false',
]) {
  assert.ok(reviewBundle.includes(required), `human review bundle contract missing: ${required}`)
}

for (const required of [
  'slot A/B must use different local models or independent manual authors',
  "comparisonStatus: 'human-review-required'",
  'automaticApprovalAllowed: false',
  'productionWriteAllowed: false',
  'stale contractVersion',
]) {
  assert.ok(verifier.includes(required), `comparison verifier boundary missing: ${required}`)
}

for (const required of [
  'historical-grammatical',
  'Reformed Westminster',
  'illegitimate totality transfer',
  'proper names',
  'independent blind candidate',
]) {
  assert.ok(contract.includes(required), `translation contract safeguard missing: ${required}`)
}

assert.ok(runbook.includes('실제 후보 생성: 0건'), 'runbook must state no actual candidates generated')
assert.ok(runbook.includes('창세기 G2에서 확인된 오류'), 'runbook must document transferred Genesis lessons')
assert.ok(runbook.includes('run-luke-g2-zero-cost-pipeline.mjs'), 'runbook must document one-command preflight/pipeline')
assert.ok(runbook.includes('build-luke-g2-human-review-bundle.mjs'), 'runbook must document review bundle')
assert.ok(runbook.includes('temperature=0'), 'runbook must record stable temperature')
assert.ok(runbook.includes('num_ctx=8192'), 'runbook must record stable context window')
assert.ok(builder.includes('executionAllowed: false'), 'bundle must remain blocked by default')

console.log('✓ Luke G2 zero-cost policy verifier passed · paid/cloud API blocked · language/preflight/manual/review gates verified')
