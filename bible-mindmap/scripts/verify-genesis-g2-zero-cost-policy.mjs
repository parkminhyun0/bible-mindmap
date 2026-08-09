#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const FILES = {
  workflow: '.github/workflows/genesis-g2-zero-cost.yml',
  builder: 'bible-mindmap/scripts/build-genesis-g2-zero-cost-bundle.mjs',
  runner: 'bible-mindmap/scripts/ai/lexicon/run-genesis-g2-local-ollama.mjs',
  pipeline: 'bible-mindmap/scripts/ai/lexicon/run-genesis-g2-zero-cost-pipeline.mjs',
  manualImporter: 'bible-mindmap/scripts/ai/lexicon/import-genesis-g2-zero-cost-manual.mjs',
  runbook: 'bible-mindmap/docs/genesis-g2-zero-cost-runbook.md',
  oneCommand: 'bible-mindmap/docs/genesis-g2-zero-cost-one-command.md',
}

const read = (path) => readFileSync(resolve('..', path), 'utf8')
const workflow = read(FILES.workflow)
const builder = read(FILES.builder)
const runner = read(FILES.runner)
const pipeline = read(FILES.pipeline)
const manualImporter = read(FILES.manualImporter)
const runbook = read(FILES.runbook)
const oneCommand = read(FILES.oneCommand)
const runtime = [workflow, builder, runner, pipeline, manualImporter].join('\n')
const all = [runtime, runbook, oneCommand].join('\n')

for (const forbidden of [
  'api.openai.com',
  'integrate.api.nvidia.com',
  'generativelanguage.googleapis.com',
  'api.groq.com',
  'openrouter.ai/api',
  'secrets.NVIDIA_API_KEY',
  'secrets.OPENAI_API_KEY',
  'secrets.GEMINI_API_KEY',
  'secrets.GROQ_API_KEY',
  'secrets.OPENROUTER_API_KEY',
  'secrets.OLLAMA_API_KEY',
]) {
  assert.ok(!runtime.includes(forbidden), `zero-cost runtime contains forbidden external paid/cloud dependency: ${forbidden}`)
}

assert.ok(workflow.includes('runs-on: ubuntu-latest'), 'zero-cost verification must use a standard public-repository runner')
assert.ok(!workflow.includes('secrets.'), 'zero-cost workflow must not read GitHub secrets')
assert.ok(!workflow.includes('upload-artifact'), 'zero-cost workflow must not retain artifacts')
assert.ok(workflow.includes('--self-test'), 'zero-cost workflow must remain offline self-test only')

for (const required of [
  'http://127.0.0.1:11434/api',
  'externalPaidApiAllowed: false',
  'cloudModelAllowed: false',
  'apiKeysRequired: false',
  'productionWriteAllowed: false',
]) {
  assert.ok(all.includes(required), `zero-cost contract missing: ${required}`)
}

for (const required of [
  "new Set(['127.0.0.1', 'localhost', '[::1]'])",
  "url.protocol !== 'http:'",
  "assert.throws(() => validateLocalBaseUrl('https://ollama.com/api')",
  "actualExecutionBackend: 'ollama-local'",
  'externalPaidApiUsed: false',
  'monetaryCostExpected: false',
]) {
  assert.ok(runner.includes(required), `local runner boundary missing: ${required}`)
  assert.ok(pipeline.includes(required) || required === "actualExecutionBackend: 'ollama-local'", `pipeline boundary missing: ${required}`)
}

for (const required of [
  'RUN-GENESIS-G2-ZERO-COST-CANARY',
  '/tags',
  'at least two installed local Ollama models are required',
  'same model digest',
  'NVIDIA_API_KEY: \'\'',
  'OPENAI_API_KEY: \'\'',
  'build-genesis-g3-context-review.mjs',
  'build-genesis-g4-theology-audit.mjs',
  'serviceWriteAllowed: false',
  'finalApprovalAllowed: false',
]) {
  assert.ok(pipeline.includes(required), `one-command pipeline contract missing: ${required}`)
}

for (const required of [
  "actualExecutionBackend: 'manual-human'",
  'createStoredCandidate',
  'sourceFingerprint mismatch',
  'cloudModelUsed: false',
  'productionWriteAllowed: false',
  'finalApprovalAllowed: false',
]) {
  assert.ok(manualImporter.includes(required), `manual importer contract missing: ${required}`)
}

assert.ok(runbook.includes('외부 유료 API 호출: 0'), 'runbook must state zero paid API calls')
assert.ok(runbook.includes('기존 NVIDIA·OpenAI 실행 경로는 선택형 보관'), 'runbook must separate optional paid path')
assert.ok(runbook.includes('api.openai.com'), 'runbook must name the blocked OpenAI endpoint family')
assert.ok(oneCommand.includes('RUN-GENESIS-G2-ZERO-COST-CANARY'), 'one-command guide must state explicit local execution confirmation')
assert.ok(oneCommand.includes('수동 JSON'), 'one-command guide must document the no-model manual route')
assert.ok(builder.includes("defaultMode: 'local-only'"), 'bundle default mode must be local-only')

console.log('✓ Genesis G2 zero-cost policy verifier 통과 · runtime-files=5 · paid/cloud-api=blocked · secrets=0 · artifact=0 · local/manual=verified')
