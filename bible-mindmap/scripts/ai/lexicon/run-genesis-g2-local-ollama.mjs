#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import {
  CONTRACT_VERSION,
  OUTPUT_SCHEMA,
  PROMPT_VERSION,
  createJobEnvelope,
  createProviderRequest,
  createStoredCandidate,
  parseJsonCandidate,
} from './genesis-g2-translation-contract.mjs'

export const ZERO_COST_LOCAL_RUNNER_VERSION = '2026.08.09-zc.2'
const DEFAULT_SOURCE = 'reports/genesis-g2-bdb-source-packets.json'
const DEFAULT_CANARY = 'reports/genesis-g2-canary-set.json'
const DEFAULT_OUTPUT_ROOT = 'reports/genesis-g2-zero-cost-execution'
const DEFAULT_BASE_URL = 'http://127.0.0.1:11434/api'
const DEFAULT_NUM_CTX = 8192
const DEFAULT_TEMPERATURE = 0

const SLOT_CONFIG = Object.freeze({
  a: Object.freeze({ slot: 'A', compatibilityProvider: 'nvidia' }),
  b: Object.freeze({ slot: 'B', compatibilityProvider: 'openai' }),
})

function parseArgs(argv) {
  const args = {
    slot: null,
    model: null,
    execute: false,
    source: DEFAULT_SOURCE,
    canary: DEFAULT_CANARY,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    baseUrl: DEFAULT_BASE_URL,
    strong: null,
    timeoutMs: 10 * 60_000,
    numCtx: DEFAULT_NUM_CTX,
    temperature: DEFAULT_TEMPERATURE,
    selfTest: false,
  }
  for (const arg of argv) {
    if (arg === '--execute') args.execute = true
    else if (arg === '--self-test') args.selfTest = true
    else if (arg.startsWith('--slot=')) args.slot = arg.slice('--slot='.length).toLowerCase()
    else if (arg.startsWith('--model=')) args.model = arg.slice('--model='.length)
    else if (arg.startsWith('--source=')) args.source = arg.slice('--source='.length)
    else if (arg.startsWith('--canary=')) args.canary = arg.slice('--canary='.length)
    else if (arg.startsWith('--output-root=')) args.outputRoot = arg.slice('--output-root='.length)
    else if (arg.startsWith('--base-url=')) args.baseUrl = arg.slice('--base-url='.length)
    else if (arg.startsWith('--strong=')) args.strong = arg.slice('--strong='.length).toUpperCase()
    else if (arg.startsWith('--timeout-ms=')) args.timeoutMs = Number(arg.slice('--timeout-ms='.length))
    else if (arg.startsWith('--num-ctx=')) args.numCtx = Number(arg.slice('--num-ctx='.length))
    else if (arg.startsWith('--temperature=')) args.temperature = Number(arg.slice('--temperature='.length))
    else throw new Error(`unknown argument: ${arg}`)
  }
  return args
}

export function validateLocalBaseUrl(value) {
  const url = new URL(value)
  const allowedHosts = new Set(['127.0.0.1', 'localhost', '[::1]'])
  if (url.protocol !== 'http:') throw new Error('zero-cost runner only allows local http Ollama')
  if (!allowedHosts.has(url.hostname)) throw new Error(`non-local Ollama host blocked: ${url.hostname}`)
  if (url.port && url.port !== '11434') throw new Error(`unexpected Ollama port: ${url.port}`)
  const pathname = url.pathname.replace(/\/$/, '')
  if (pathname !== '/api') throw new Error(`Ollama base path must be /api: ${pathname}`)
  return `${url.origin}/api`
}

function validateArgs(args) {
  if (args.selfTest) return
  if (!SLOT_CONFIG[args.slot]) throw new Error('--slot=a|b is required')
  if (!args.model?.trim()) throw new Error('--model=<installed-local-model> is required')
  if (args.strong && !/^H[1-9]\d*$/.test(args.strong)) throw new Error('--strong must be a normalized Hebrew Strong id')
  if (!Number.isInteger(args.timeoutMs) || args.timeoutMs < 10_000 || args.timeoutMs > 60 * 60_000) throw new Error('--timeout-ms must be 10000..3600000')
  if (!Number.isInteger(args.numCtx) || args.numCtx < 4096 || args.numCtx > 131072) throw new Error('--num-ctx must be 4096..131072')
  if (!Number.isFinite(args.temperature) || args.temperature < 0 || args.temperature > 1) throw new Error('--temperature must be 0..1')
  validateLocalBaseUrl(args.baseUrl)
}

const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'))

function writeJsonAtomic(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  const temp = `${path}.tmp-${process.pid}`
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  renameSync(temp, path)
}

function toMessages(envelope) {
  const request = createProviderRequest(envelope)
  if (Array.isArray(request.messages)) return request.messages
  return (request.input || []).map((message) => ({
    role: message.role === 'developer' ? 'system' : message.role,
    content: (message.content || []).map((part) => part.text || '').join('\n'),
  }))
}

async function callLocalOllama({ envelope, model, baseUrl, timeoutMs, numCtx, temperature, fetchImpl = fetch }) {
  const started = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(`${validateLocalBaseUrl(baseUrl)}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: toMessages(envelope),
        stream: false,
        format: OUTPUT_SCHEMA,
        options: { temperature, num_ctx: numCtx },
      }),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`local Ollama HTTP ${response.status}: ${await response.text()}`)
    const data = await response.json()
    const content = data?.message?.content
    if (typeof content !== 'string' || !content.trim()) throw new Error('local Ollama response content missing')
    return {
      content,
      model: `ollama-local:${model}`,
      requestId: null,
      usage: {
        input_tokens: Number(data.prompt_eval_count || 0),
        output_tokens: Number(data.eval_count || 0),
        total_tokens: Number(data.prompt_eval_count || 0) + Number(data.eval_count || 0),
      },
      latencyMs: Date.now() - started,
    }
  } finally {
    clearTimeout(timer)
  }
}

function selectedPackets(sourceSet, canarySet, strong) {
  const allowed = new Set((canarySet.items || []).map((item) => item.strong))
  let packets = (sourceSet.packets || []).filter((packet) => allowed.has(packet.strong) && packet.sourcePacketStatus === 'ready')
  if (strong) packets = packets.filter((packet) => packet.strong === strong)
  if (!packets.length) throw new Error('no matching ready canary source packets')
  return packets
}

function candidateReusable(existing, envelope, args) {
  return existing?.sourceFingerprint === envelope.sourceFingerprint
    && existing?.status === 'candidate'
    && existing?.contractVersion === CONTRACT_VERSION
    && existing?.promptVersion === PROMPT_VERSION
    && existing?.provenance?.generationSettings?.numCtx === args.numCtx
    && existing?.provenance?.generationSettings?.temperature === args.temperature
}

export async function runLocalOllama(args, env = process.env, fetchImpl = fetch) {
  validateArgs(args)
  if (args.execute && (env.NVIDIA_API_KEY || env.OPENAI_API_KEY || env.OLLAMA_API_KEY)) {
    console.warn('주의: 외부 API 환경변수가 존재하지만 zero-cost runner는 이를 읽거나 전송하지 않습니다.')
  }
  const sourceSet = readJson(args.source)
  const canarySet = readJson(args.canary)
  const config = SLOT_CONFIG[args.slot]
  const packets = selectedPackets(sourceSet, canarySet, args.strong)
  const root = resolve(args.outputRoot)
  const summary = {
    schemaVersion: 1,
    runnerVersion: ZERO_COST_LOCAL_RUNNER_VERSION,
    contractVersion: CONTRACT_VERSION,
    promptVersion: PROMPT_VERSION,
    mode: args.execute ? 'local-execute' : 'dry-run',
    slot: config.slot,
    compatibilityProvider: config.compatibilityProvider,
    actualExecutionBackend: 'ollama-local',
    model: args.model,
    localBaseUrl: validateLocalBaseUrl(args.baseUrl),
    generationSettings: { temperature: args.temperature, numCtx: args.numCtx, timeoutMs: args.timeoutMs },
    requested: packets.length,
    envelopesWritten: 0,
    candidatesWritten: 0,
    skippedExisting: 0,
    failed: 0,
    monetaryCostExpected: false,
    externalPaidApiUsed: false,
    productionWriteAllowed: false,
    errors: [],
  }

  for (const packet of packets) {
    const envelope = createJobEnvelope(packet, config.compatibilityProvider)
    const envelopeWithProvenance = {
      ...envelope,
      zeroCost: {
        slot: config.slot,
        actualExecutionBackend: 'ollama-local',
        externalPaidApiAllowed: false,
        localBaseUrl: summary.localBaseUrl,
        generationSettings: summary.generationSettings,
      },
    }
    writeJsonAtomic(resolve(root, 'envelopes', config.compatibilityProvider, `${packet.strong}.json`), envelopeWithProvenance)
    summary.envelopesWritten += 1
    if (!args.execute) continue

    const outputPath = resolve(root, 'candidates', config.compatibilityProvider, `${packet.strong}.json`)
    if (existsSync(outputPath)) {
      const existing = readJson(outputPath)
      if (candidateReusable(existing, envelope, args)) {
        summary.skippedExisting += 1
        continue
      }
    }

    try {
      const providerResult = await callLocalOllama({
        envelope,
        model: args.model,
        baseUrl: args.baseUrl,
        timeoutMs: args.timeoutMs,
        numCtx: args.numCtx,
        temperature: args.temperature,
        fetchImpl,
      })
      const payload = parseJsonCandidate(providerResult.content)
      const generatedAt = new Date().toISOString()
      const stored = createStoredCandidate({ envelope, providerResult, candidate: payload, attempt: 1, generatedAt })
      stored.metrics = { latencyMs: providerResult.latencyMs }
      stored.provenance = {
        comparisonSlot: config.slot,
        compatibilityProvider: config.compatibilityProvider,
        actualExecutionBackend: 'ollama-local',
        localModel: args.model,
        localBaseUrl: summary.localBaseUrl,
        generationSettings: { temperature: args.temperature, numCtx: args.numCtx },
        externalPaidApiUsed: false,
        monetaryCostExpected: false,
        apiKeyUsed: false,
      }
      writeJsonAtomic(outputPath, stored)
      summary.candidatesWritten += 1
    } catch (error) {
      summary.failed += 1
      summary.errors.push({ strong: packet.strong, message: String(error?.message || error) })
    }
  }

  writeJsonAtomic(resolve(root, 'summaries', `local-slot-${args.slot}-${summary.mode}.json`), summary)
  return summary
}

async function runSelfTest() {
  assert.equal(validateLocalBaseUrl('http://127.0.0.1:11434/api'), 'http://127.0.0.1:11434/api')
  assert.equal(validateLocalBaseUrl('http://localhost:11434/api/'), 'http://localhost:11434/api')
  assert.throws(() => validateLocalBaseUrl('https://ollama.com/api'), /local http/)
  assert.throws(() => validateLocalBaseUrl('http://example.com:11434/api'), /non-local/)
  assert.equal(parseArgs(['--slot=a', '--model=test']).numCtx, 8192)
  assert.equal(parseArgs(['--slot=a', '--model=test']).temperature, 0)
  assert.equal(parseArgs(['--slot=a', '--model=test', '--num-ctx=16384']).numCtx, 16384)

  const envelope = {
    provider: 'nvidia',
    strong: 'H776',
    sourceFingerprint: `sha256:${'a'.repeat(64)}`,
    source: {
      identity: { lemmas: ['אֶרֶץ'] }, lexicalMappings: [],
      nodes: [{ sourceNodeId: 'node-1', sourceText: 'land' }],
    },
    outputSchema: OUTPUT_SCHEMA,
  }
  const messages = toMessages(envelope)
  assert.ok(messages.length >= 2)
  assert.ok(messages.every((message) => typeof message.content === 'string'))
  console.log('✓ Genesis G2 local Ollama runner self-test 통과 · temperature=0 · num_ctx=8192')
}

const args = parseArgs(process.argv.slice(2))
if (args.selfTest) await runSelfTest()
else {
  const summary = await runLocalOllama(args)
  console.log(`✓ Genesis G2 zero-cost local slot ${summary.slot} · mode=${summary.mode} · candidates=${summary.candidatesWritten} · failed=${summary.failed}`)
  if (args.execute && summary.failed > 0) process.exitCode = 2
}
