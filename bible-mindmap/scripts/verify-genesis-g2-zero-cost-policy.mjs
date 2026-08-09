#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const FILES = {
  workflow: '.github/workflows/genesis-g2-zero-cost.yml',
  builder: 'bible-mindmap/scripts/build-genesis-g2-zero-cost-bundle.mjs',
  runner: 'bible-mindmap/scripts/ai/lexicon/run-genesis-g2-local-ollama.mjs',
  runbook: 'bible-mindmap/docs/genesis-g2-zero-cost-runbook.md',
}

const read = (path) => readFileSync(resolve('..', path), 'utf8')
const workflow = read(FILES.workflow)
const builder = read(FILES.builder)
const runner = read(FILES.runner)
const runbook = read(FILES.runbook)
const runtime = [workflow, builder, runner].join('\n')
const all = [runtime, runbook].join('\n')

for (const forbidden of [
  'api.openai.com',
  'integrate.api.nvidia.com',
  'https://ollama.com/api',
  'secrets.NVIDIA_API_KEY',
  'secrets.OPENAI_API_KEY',
  'secrets.OLLAMA_API_KEY',
]) {
  assert.ok(!runtime.includes(forbidden), `zero-cost runtime contains forbidden external paid dependency: ${forbidden}`)
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
  "actualExecutionBackend: 'ollama-local'",
  'externalPaidApiUsed: false',
  'monetaryCostExpected: false',
]) {
  assert.ok(runner.includes(required), `local runner boundary missing: ${required}`)
}

assert.ok(runbook.includes('외부 유료 API 호출: 0'), 'runbook must state zero paid API calls')
assert.ok(runbook.includes('기존 NVIDIA·OpenAI 실행 경로는 선택형 보관'), 'runbook must separate optional paid path')
assert.ok(runbook.includes('api.openai.com'), 'runbook must name the blocked OpenAI endpoint family')
assert.ok(builder.includes("defaultMode: 'local-only'"), 'bundle default mode must be local-only')

console.log(`✓ Genesis G2 zero-cost policy verifier 통과 · runtime-files=3 · paid-api=blocked · secrets=0 · artifact=0`)
