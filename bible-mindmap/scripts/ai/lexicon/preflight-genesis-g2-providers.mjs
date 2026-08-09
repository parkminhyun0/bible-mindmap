#!/usr/bin/env node

import assert from 'node:assert/strict'
import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createNvidiaChatCompletion, loadNvidiaConfig } from '../providers/nvidia.mjs'
import { createOpenAiStructuredResponse, loadOpenAiConfig } from '../providers/openai.mjs'

const MARKER = 'GENESIS_PREFLIGHT_OK'
const PROVIDERS = ['nvidia', 'openai']
const DEFAULT_OUTPUT = 'reports/genesis-g2-provider-preflight.json'

function parseArgs(argv) {
  const args = { provider: 'both', execute: false, selfTest: false, output: DEFAULT_OUTPUT }
  for (const arg of argv) {
    if (arg === '--execute') args.execute = true
    else if (arg === '--self-test') args.selfTest = true
    else if (arg.startsWith('--provider=')) args.provider = arg.slice(11)
    else if (arg.startsWith('--output=')) args.output = arg.slice(9)
    else throw new Error(`unknown argument: ${arg}`)
  }
  if (!['both', ...PROVIDERS].includes(args.provider)) throw new Error('--provider=both|nvidia|openai required')
  return args
}

function selectedProviders(value) {
  return value === 'both' ? [...PROVIDERS] : [value]
}

function enabled(value) {
  return /^(1|true|on)$/i.test(String(value || ''))
}

function enforceBoundary(env) {
  if (!enabled(env.GENESIS_G2_PROVIDER_PREFLIGHT_ENABLED)) throw new Error('GENESIS_G2_PROVIDER_PREFLIGHT_ENABLED=1 is required')
  if (enabled(env.LEXICON_TRANSLATION_KILL_SWITCH)) throw new Error('LEXICON_TRANSLATION_KILL_SWITCH is active')
}

function safeMessage(error) {
  return String(error?.message || error)
    .replace(/(?:sk-|nvapi-)[A-Za-z0-9_-]{6,}/g, '[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .slice(0, 500)
}

function normalizeUsage(usage = {}) {
  const inputTokens = Number(usage.input_tokens ?? usage.prompt_tokens ?? 0) || 0
  const outputTokens = Number(usage.output_tokens ?? usage.completion_tokens ?? 0) || 0
  return {
    inputTokens,
    outputTokens,
    totalTokens: Number(usage.total_tokens ?? inputTokens + outputTokens) || 0,
  }
}

function writeJsonAtomic(path, value) {
  const output = resolve(path)
  mkdirSync(dirname(output), { recursive: true })
  const temp = `${output}.tmp-${process.pid}`
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  renameSync(temp, output)
}

async function runNvidia(env, fetchImpl) {
  const config = loadNvidiaConfig(env)
  const started = Date.now()
  const result = await createNvidiaChatCompletion({
    messages: [
      { role: 'system', content: `Connectivity check only. Return exactly ${MARKER}. Do not translate or explain.` },
      { role: 'user', content: `Return exactly ${MARKER}.` },
    ],
    temperature: 0,
    maxTokens: 32,
    requestId: `genesis-g2-preflight-nvidia-${Date.now()}`,
    fetchImpl,
    env,
  })
  const content = String(result.content || '').trim()
  if (!content.includes(MARKER)) throw new Error('NVIDIA preflight marker missing')
  return {
    provider: 'nvidia', status: 'passed', model: config.model,
    endpoint: `${new URL(config.baseUrl).origin}/v1/chat/completions`,
    requestId: result.requestId || null, latencyMs: Date.now() - started,
    markerValidated: true, usage: normalizeUsage(result.usage),
  }
}

async function runOpenAi(env, fetchImpl) {
  const config = loadOpenAiConfig(env)
  const started = Date.now()
  const schema = {
    type: 'object', additionalProperties: false,
    properties: { ok: { type: 'boolean' }, marker: { type: 'string', enum: [MARKER] } },
    required: ['ok', 'marker'],
  }
  const result = await createOpenAiStructuredResponse({
    input: [
      { role: 'system', content: [{ type: 'input_text', text: `Connectivity check only. Return JSON with ok=true and marker=${MARKER}. Do not translate.` }] },
      { role: 'user', content: [{ type: 'input_text', text: 'Run the connectivity check.' }] },
    ],
    schema,
    schemaName: 'genesis_g2_provider_preflight',
    maxOutputTokens: 64,
    requestId: `genesis-g2-preflight-openai-${Date.now()}`,
    fetchImpl,
    env,
  })
  let parsed
  try { parsed = JSON.parse(result.content) } catch { throw new Error('OpenAI preflight output was not valid JSON') }
  if (parsed?.ok !== true || parsed?.marker !== MARKER) throw new Error('OpenAI preflight marker missing')
  return {
    provider: 'openai', status: 'passed', model: config.model,
    endpoint: `${new URL(config.baseUrl).origin}/v1/responses`,
    requestId: result.requestId || null, latencyMs: Date.now() - started,
    markerValidated: true, usage: normalizeUsage(result.usage),
  }
}

export async function runGenesisProviderPreflight({ provider = 'both', execute = false, output = null } = {}, env = process.env, fetchByProvider = {}) {
  const providers = selectedProviders(provider)
  if (!execute) throw new Error('--execute is required; use --self-test for offline verification')
  enforceBoundary(env)
  const report = {
    schemaVersion: 1,
    preflightVersion: '2026.08.09-g2.preflight.1',
    startedAt: new Date().toISOString(), completedAt: null,
    requestedProviders: providers, status: 'running', results: [],
    gates: {
      translationCandidateCreated: false,
      serviceWriteAllowed: false,
      finalApprovalAllowed: false,
      canaryExecutionAutomaticallyStarted: false,
    },
  }
  for (const item of providers) {
    try {
      const result = item === 'nvidia'
        ? await runNvidia(env, fetchByProvider.nvidia || globalThis.fetch)
        : await runOpenAi(env, fetchByProvider.openai || globalThis.fetch)
      report.results.push(result)
    } catch (error) {
      report.results.push({ provider: item, status: 'failed', markerValidated: false, error: safeMessage(error) })
    }
  }
  report.completedAt = new Date().toISOString()
  report.status = report.results.every((item) => item.status === 'passed') ? 'passed' : 'failed'
  report.counts = {
    requested: providers.length,
    passed: report.results.filter((item) => item.status === 'passed').length,
    failed: report.results.filter((item) => item.status === 'failed').length,
  }
  if (output) writeJsonAtomic(output, report)
  return report
}

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, async text() { return JSON.stringify(body) } }
}

async function runSelfTest() {
  const env = {
    GENESIS_G2_PROVIDER_PREFLIGHT_ENABLED: '1',
    LEXICON_TRANSLATION_KILL_SWITCH: '0',
    NVIDIA_API_KEY: 'nvapi-fixture-secret', NVIDIA_MODEL_ID: 'nvidia-fixture', NVIDIA_BASE_URL: 'https://nvidia.invalid/v1',
    OPENAI_API_KEY: 'sk-fixture-secret', OPENAI_MODEL_ID: 'openai-fixture', OPENAI_BASE_URL: 'https://openai.invalid/v1',
  }
  const report = await runGenesisProviderPreflight({ provider: 'both', execute: true }, env, {
    nvidia: async () => jsonResponse({ id: 'nv-req', choices: [{ message: { content: MARKER } }], usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 } }),
    openai: async () => jsonResponse({ id: 'oa-req', status: 'completed', output_text: JSON.stringify({ ok: true, marker: MARKER }), usage: { input_tokens: 5, output_tokens: 5, total_tokens: 10 } }),
  })
  assert.equal(report.status, 'passed')
  assert.equal(report.counts.passed, 2)
  assert.equal(report.gates.translationCandidateCreated, false)
  const serialized = JSON.stringify(report)
  assert(!serialized.includes('fixture-secret'))
  const failed = await runGenesisProviderPreflight({ provider: 'nvidia', execute: true }, env, {
    nvidia: async () => jsonResponse({ error: { message: 'bad credential nvapi-hidden-secret' } }, 401),
  })
  assert.equal(failed.status, 'failed')
  assert(!JSON.stringify(failed).includes('nvapi-hidden-secret'))
  console.log('✓ Genesis G2 provider preflight self-test passed')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) return runSelfTest()
  const report = await runGenesisProviderPreflight({ provider: args.provider, execute: args.execute, output: args.output })
  console.log(`Genesis G2 provider preflight · passed=${report.counts.passed}/${report.counts.requested} · status=${report.status}`)
  for (const result of report.results) console.log(`  - ${result.provider}: ${result.status}${result.error ? ` · ${result.error}` : ` · model=${result.model} · ${result.latencyMs}ms`}`)
  if (report.status !== 'passed') process.exitCode = 2
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()
