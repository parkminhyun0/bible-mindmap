#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const FILES = {
  workflow: '.github/workflows/luke-lexicon-g2-zero-cost.yml',
  contract: 'bible-mindmap/scripts/ai/lexicon/luke-g2-translation-contract.mjs',
  builder: 'bible-mindmap/scripts/build-luke-g2-zero-cost-bundle.mjs',
  runner: 'bible-mindmap/scripts/ai/lexicon/run-luke-g2-local-ollama.mjs',
  verifier: 'bible-mindmap/scripts/verify-luke-g2-local-results.mjs',
  runbook: 'bible-mindmap/docs/luke-g2-zero-cost-runbook.md',
}

const read = (path) => readFileSync(resolve('..', path), 'utf8')
const workflow = read(FILES.workflow)
const contract = read(FILES.contract)
const builder = read(FILES.builder)
const runner = read(FILES.runner)
const verifier = read(FILES.verifier)
const runbook = read(FILES.runbook)
const runtime = [workflow, contract, builder, runner, verifier].join('\n')

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
assert.ok(!workflow.includes('--execute'), 'workflow must never execute local models')

for (const required of [
  'http://127.0.0.1:11434/api',
  'externalPaidApiAllowed: false',
  'cloudModelAllowed: false',
  'apiKeysRequired: false',
  'productionWriteAllowed: false',
  'RUN-LUKE-G2-CANARY',
]) {
  assert.ok([builder, runner, runbook].join('\n').includes(required), `zero-cost contract missing: ${required}`)
}

for (const required of [
  "new Set(['127.0.0.1', 'localhost', '[::1]'])",
  "url.protocol !== 'http:'",
  "gate.modes?.localTwoModel?.enabled !== true",
  "gate.executionAllowed !== true",
  "args.killSwitch !== 'off'",
  "actualExecutionBackend: 'ollama-local'",
  'externalPaidApiUsed: false',
]) {
  assert.ok(runner.includes(required), `local runner boundary missing: ${required}`)
}

for (const required of [
  'slot A/B must use different local models',
  "comparisonStatus: 'human-review-required'",
  'automaticApprovalAllowed: false',
  'productionWriteAllowed: false',
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
assert.ok(runbook.includes('Gate 활성화 커밋'), 'runbook must require a separate Gate activation commit')
assert.ok(builder.includes('executionAllowed: false'), 'bundle must remain blocked by default')

console.log('✓ Luke G2 zero-cost policy verifier passed · paid/cloud API blocked · secrets=0 · execution=blocked · human-review=required')
