#!/usr/bin/env node

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { arch, cpus, freemem, platform, totalmem } from 'node:os'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const ZERO_COST_PIPELINE_VERSION = '2026.08.09-zc.2'
const DEFAULT_BASE_URL = 'http://127.0.0.1:11434/api'
const DEFAULT_OUTPUT_ROOT = 'reports/genesis-g2-zero-cost-execution'
const DEFAULT_REPORT = 'reports/genesis-g2-zero-cost-pipeline.json'
const CONFIRMATION = 'RUN-GENESIS-G2-ZERO-COST-CANARY'

const PATHS = Object.freeze({
  source: 'reports/genesis-g2-bdb-source-packets.json',
  canary: 'reports/genesis-g2-canary-set.json',
  usage: 'reports/genesis-g3-usage-context-packets.json',
  bundle: 'reports/genesis-g2-zero-cost-bundle',
  evaluation: 'reports/genesis-g2-zero-cost-evaluation.json',
  promotion: 'reports/genesis-g2-zero-cost-promotion-review',
  context: 'reports/genesis-g3-zero-cost-context-review',
  theology: 'reports/genesis-g4-zero-cost-theology-audit',
})

function parseArgs(argv) {
  const args = {
    execute: false,
    selfTest: false,
    modelA: null,
    modelB: null,
    baseUrl: DEFAULT_BASE_URL,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    report: DEFAULT_REPORT,
    confirmation: '',
    timeoutMs: 10 * 60_000,
  }
  for (const arg of argv) {
    if (arg === '--execute') args.execute = true
    else if (arg === '--self-test') args.selfTest = true
    else if (arg.startsWith('--model-a=')) args.modelA = arg.slice('--model-a='.length)
    else if (arg.startsWith('--model-b=')) args.modelB = arg.slice('--model-b='.length)
    else if (arg.startsWith('--base-url=')) args.baseUrl = arg.slice('--base-url='.length)
    else if (arg.startsWith('--output-root=')) args.outputRoot = arg.slice('--output-root='.length)
    else if (arg.startsWith('--report=')) args.report = arg.slice('--report='.length)
    else if (arg.startsWith('--confirmation=')) args.confirmation = arg.slice('--confirmation='.length)
    else if (arg.startsWith('--timeout-ms=')) args.timeoutMs = Number(arg.slice('--timeout-ms='.length))
    else throw new Error(`unknown argument: ${arg}`)
  }
  return args
}

export function validateLocalBaseUrl(value) {
  const url = new URL(value)
  const allowedHosts = new Set(['127.0.0.1', 'localhost', '[::1]'])
  if (url.protocol !== 'http:') throw new Error('zero-cost pipeline only allows local http Ollama')
  if (!allowedHosts.has(url.hostname)) throw new Error(`non-local Ollama host blocked: ${url.hostname}`)
  if (url.port && url.port !== '11434') throw new Error(`unexpected Ollama port: ${url.port}`)
  const pathname = url.pathname.replace(/\/$/, '')
  if (pathname !== '/api') throw new Error(`Ollama base path must be /api: ${pathname}`)
  return `${url.origin}/api`
}

function writeJsonAtomic(path, value) {
  const output = resolve(path)
  mkdirSync(dirname(output), { recursive: true })
  const temp = `${output}.tmp-${process.pid}`
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  renameSync(temp, output)
}

function familyFromModel(model) {
  const declared = String(model?.details?.family || '').trim().toLowerCase()
  if (declared) return declared
  const name = String(model?.name || model?.model || '').toLowerCase()
  return name.split(/[:/_-]/).filter(Boolean)[0] || 'unknown'
}

export function normalizeInstalledModels(payload) {
  return (payload?.models || []).map((model) => ({
    name: String(model.name || model.model || '').trim(),
    model: String(model.model || model.name || '').trim(),
    digest: String(model.digest || '').trim() || null,
    size: Number(model.size || 0) || 0,
    family: familyFromModel(model),
    parameterSize: String(model?.details?.parameter_size || '').trim() || null,
    quantization: String(model?.details?.quantization_level || '').trim() || null,
    modifiedAt: model.modified_at || null,
  })).filter((model) => model.name)
}

function byName(models, requested) {
  if (!requested) return null
  const exact = models.find((model) => model.name === requested || model.model === requested)
  if (!exact) throw new Error(`installed local model not found: ${requested}`)
  return exact
}

function safeCandidates(models, memoryBytes) {
  const ceiling = Math.max(1, Math.floor(memoryBytes * 0.58))
  const withinMemory = models.filter((model) => !model.size || model.size <= ceiling)
  const pool = withinMemory.length >= 2 ? withinMemory : models
  return [...pool].sort((a, b) => {
    if (a.size !== b.size) return b.size - a.size
    return a.name.localeCompare(b.name)
  })
}

export function chooseModelPair(models, { modelA = null, modelB = null, memoryBytes = totalmem() } = {}) {
  if (models.length < 2) throw new Error('at least two installed local Ollama models are required')
  const pool = safeCandidates(models, memoryBytes)
  const selectedA = byName(models, modelA) || pool[0]
  const selectedB = byName(models, modelB)
    || pool.find((model) => model.name !== selectedA.name && model.digest !== selectedA.digest && model.family !== selectedA.family)
    || pool.find((model) => model.name !== selectedA.name && model.digest !== selectedA.digest)

  if (!selectedB) throw new Error('a second distinct local model could not be selected')
  if (selectedA.name === selectedB.name) throw new Error('slot A and B must use different model names')
  if (selectedA.digest && selectedB.digest && selectedA.digest === selectedB.digest) throw new Error('slot A and B resolve to the same model digest')

  return {
    a: selectedA,
    b: selectedB,
    distinctFamilies: selectedA.family !== selectedB.family,
    selectionMode: modelA || modelB ? 'explicit-or-assisted' : 'automatic-installed-model-selection',
  }
}

export async function inspectLocalOllama({ baseUrl = DEFAULT_BASE_URL, fetchImpl = fetch, memoryBytes = totalmem() } = {}) {
  const localBaseUrl = validateLocalBaseUrl(baseUrl)
  const started = Date.now()
  const response = await fetchImpl(`${localBaseUrl}/tags`, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(`local Ollama tags HTTP ${response.status}: ${await response.text()}`)
  const payload = await response.json()
  const models = normalizeInstalledModels(payload)
  return {
    localBaseUrl,
    latencyMs: Date.now() - started,
    installedModels: models,
    installedModelCount: models.length,
    hardware: {
      platform: platform(),
      arch: arch(),
      cpuCount: cpus().length,
      totalMemoryBytes: memoryBytes,
      freeMemoryBytes: freemem(),
    },
  }
}

function requiredFiles() {
  return [PATHS.source, PATHS.canary, PATHS.usage]
}

function assertPrerequisites() {
  const missing = requiredFiles().filter((path) => !existsSync(resolve(path)))
  if (missing.length) throw new Error(`required prepared reports missing: ${missing.join(', ')}`)
}

function runNode(script, args, stepName) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'inherit',
    env: {
      ...process.env,
      NVIDIA_API_KEY: '',
      OPENAI_API_KEY: '',
      GEMINI_API_KEY: '',
      GROQ_API_KEY: '',
      OPENROUTER_API_KEY: '',
      OLLAMA_API_KEY: '',
    },
  })
  if (result.error) throw new Error(`${stepName} failed to start: ${result.error.message}`)
  if (result.status !== 0) throw new Error(`${stepName} failed with exit code ${result.status}`)
}

function runPipelineSteps(args, pair) {
  const commonRunnerArgs = [
    '--execute',
    `--base-url=${validateLocalBaseUrl(args.baseUrl)}`,
    `--output-root=${args.outputRoot}`,
    `--timeout-ms=${args.timeoutMs}`,
  ]

  const steps = [
    {
      name: 'build-zero-cost-bundle',
      run: () => runNode('scripts/build-genesis-g2-zero-cost-bundle.mjs', [
        `--source=${PATHS.source}`,
        `--canary=${PATHS.canary}`,
        `--output=${PATHS.bundle}`,
      ], 'build zero-cost bundle'),
    },
    {
      name: 'generate-slot-a',
      run: () => runNode('scripts/ai/lexicon/run-genesis-g2-local-ollama.mjs', [
        '--slot=a', `--model=${pair.a.name}`, ...commonRunnerArgs,
      ], 'generate slot A'),
    },
    {
      name: 'generate-slot-b',
      run: () => runNode('scripts/ai/lexicon/run-genesis-g2-local-ollama.mjs', [
        '--slot=b', `--model=${pair.b.name}`, ...commonRunnerArgs,
      ], 'generate slot B'),
    },
    {
      name: 'evaluate-candidates',
      run: () => runNode('scripts/evaluate-genesis-g2-canary-results.mjs', [
        '--strict', `--output-root=${args.outputRoot}`, `--output=${PATHS.evaluation}`,
      ], 'evaluate local candidates'),
    },
    {
      name: 'build-promotion-review',
      run: () => runNode('scripts/build-genesis-g2-promotion-review.mjs', [
        `--evaluation=${PATHS.evaluation}`,
        `--output-root=${args.outputRoot}`,
        `--output-dir=${PATHS.promotion}`,
      ], 'build promotion review'),
    },
    {
      name: 'build-context-review',
      run: () => runNode('scripts/build-genesis-g3-context-review.mjs', [
        `--evaluation=${PATHS.evaluation}`,
        `--promotion=${PATHS.promotion}/promotion-review.json`,
        `--usage=${PATHS.usage}`,
        `--source=${PATHS.source}`,
        `--output-dir=${PATHS.context}`,
      ], 'build Genesis context review'),
    },
    {
      name: 'build-theology-audit',
      run: () => runNode('scripts/build-genesis-g4-theology-audit.mjs', [
        `--context-review=${PATHS.context}/context-review.json`,
        `--output-dir=${PATHS.theology}`,
      ], 'build theology audit'),
    },
  ]

  const completed = []
  for (const step of steps) {
    step.run()
    completed.push(step.name)
  }
  return completed
}

function summarizeOutputs(report) {
  const read = (path) => existsSync(resolve(path)) ? JSON.parse(readFileSync(resolve(path), 'utf8')) : null
  const evaluation = read(PATHS.evaluation)
  const context = read(`${PATHS.context}/context-review.json`)
  const theology = read(`${PATHS.theology}/theology-audit.json`)
  report.outputs = {
    evaluation: evaluation ? {
      path: PATHS.evaluation,
      pairs: evaluation.counts?.pairs ?? evaluation.pairs?.length ?? 0,
      technicalGatePassed: evaluation.gates?.technicalGatePassed === true,
      promotionStatus: evaluation.promotion?.status || null,
    } : null,
    contextReview: context ? {
      path: `${PATHS.context}/context-review.json`,
      status: context.status,
      items: context.counts?.reviewItems || 0,
    } : null,
    theologyAudit: theology ? {
      path: `${PATHS.theology}/theology-audit.json`,
      status: theology.status,
      items: theology.counts?.auditItems || 0,
      riskCounts: theology.counts?.byRisk || {},
    } : null,
  }
}

function baseReport(args) {
  return {
    schemaVersion: 1,
    pipelineVersion: ZERO_COST_PIPELINE_VERSION,
    generatedAt: new Date().toISOString(),
    mode: args.execute ? 'execute' : 'preflight-only',
    status: 'starting',
    monetaryCostExpected: false,
    externalPaidApiUsed: false,
    cloudModelAllowed: false,
    apiKeyUsed: false,
    serviceWriteAllowed: false,
    finalApprovalAllowed: false,
    completedSteps: [],
    errors: [],
  }
}

export async function runZeroCostPipeline(args, { fetchImpl = fetch } = {}) {
  if (!Number.isInteger(args.timeoutMs) || args.timeoutMs < 10_000 || args.timeoutMs > 60 * 60_000) {
    throw new Error('--timeout-ms must be 10000..3600000')
  }
  const report = baseReport(args)
  try {
    const preflight = await inspectLocalOllama({ baseUrl: args.baseUrl, fetchImpl })
    report.preflight = preflight
    if (preflight.installedModelCount < 2) {
      report.status = 'blocked-insufficient-local-models'
      report.errors.push('Ollama에 서로 다른 로컬 모델 2개 이상이 필요합니다.')
      writeJsonAtomic(args.report, report)
      return report
    }

    const pair = chooseModelPair(preflight.installedModels, {
      modelA: args.modelA,
      modelB: args.modelB,
      memoryBytes: preflight.hardware.totalMemoryBytes,
    })
    report.modelPair = pair
    report.status = 'preflight-passed'

    if (!args.execute) {
      writeJsonAtomic(args.report, report)
      return report
    }
    if (args.confirmation !== CONFIRMATION) throw new Error(`--confirmation=${CONFIRMATION} is required`)
    assertPrerequisites()
    report.completedSteps = runPipelineSteps(args, pair)
    summarizeOutputs(report)
    report.status = report.outputs?.evaluation?.technicalGatePassed
      ? 'human-review-packets-ready'
      : 'candidate-evaluation-review-required'
    writeJsonAtomic(args.report, report)
    return report
  } catch (error) {
    report.status = 'failed'
    report.errors.push(String(error?.message || error))
    writeJsonAtomic(args.report, report)
    throw error
  }
}

function jsonResponse(value, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return value },
    async text() { return JSON.stringify(value) },
  }
}

async function runSelfTest() {
  assert.equal(validateLocalBaseUrl('http://127.0.0.1:11434/api'), 'http://127.0.0.1:11434/api')
  assert.equal(validateLocalBaseUrl('http://localhost:11434/api/'), 'http://localhost:11434/api')
  assert.throws(() => validateLocalBaseUrl('https://ollama.com/api'), /local http/)
  assert.throws(() => validateLocalBaseUrl('http://example.com:11434/api'), /non-local/)

  const fixture = {
    models: [
      { name: 'qwen-fixture:7b', digest: 'digest-a', size: 4_000_000_000, details: { family: 'qwen', parameter_size: '7B' } },
      { name: 'llama-fixture:8b', digest: 'digest-b', size: 5_000_000_000, details: { family: 'llama', parameter_size: '8B' } },
      { name: 'qwen-fixture:3b', digest: 'digest-c', size: 2_000_000_000, details: { family: 'qwen', parameter_size: '3B' } },
    ],
  }
  const preflight = await inspectLocalOllama({
    baseUrl: DEFAULT_BASE_URL,
    memoryBytes: 32_000_000_000,
    fetchImpl: async (url) => {
      assert.equal(url, 'http://127.0.0.1:11434/api/tags')
      return jsonResponse(fixture)
    },
  })
  assert.equal(preflight.installedModelCount, 3)
  const pair = chooseModelPair(preflight.installedModels, { memoryBytes: 32_000_000_000 })
  assert.notEqual(pair.a.digest, pair.b.digest)
  assert.equal(pair.distinctFamilies, true)
  assert.throws(() => chooseModelPair([preflight.installedModels[0]], {}), /at least two/)
  assert.throws(() => chooseModelPair(preflight.installedModels, { modelA: 'missing' }), /not found/)
  console.log('✓ Genesis G2 zero-cost one-command pipeline self-test 통과')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) return runSelfTest()
  const report = await runZeroCostPipeline(args)
  console.log(`✓ Genesis G2 zero-cost pipeline · status=${report.status} · models=${report.modelPair ? `${report.modelPair.a.name} / ${report.modelPair.b.name}` : 'not-selected'}`)
  if (report.status.startsWith('blocked') || report.status === 'failed') process.exitCode = 2
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()
