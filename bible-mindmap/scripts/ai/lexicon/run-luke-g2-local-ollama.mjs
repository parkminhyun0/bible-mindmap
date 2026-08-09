#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import {
  OUTPUT_SCHEMA,
  createJobEnvelope,
  createModelRequest,
  createStoredCandidate,
  parseJsonCandidate,
} from './luke-g2-translation-contract.mjs'

export const LUKE_G2_LOCAL_RUNNER_VERSION = '2026.08.09-luke-zc.1'
const DEFAULT_SOURCE = 'data/lexicon/luke-g2-canary-preparation.json'
const DEFAULT_GATE = 'data/lexicon/luke-g2-execution-gate.json'
const DEFAULT_OUTPUT_ROOT = 'reports/luke-g2-zero-cost-execution'
const DEFAULT_BASE_URL = 'http://127.0.0.1:11434/api'

const SLOT_CONFIG = Object.freeze({
  a: Object.freeze({ slot: 'A', directory: 'slot-a' }),
  b: Object.freeze({ slot: 'B', directory: 'slot-b' }),
})

function parseArgs(argv) {
  const args = {
    slot: null,
    model: null,
    execute: false,
    source: DEFAULT_SOURCE,
    gate: DEFAULT_GATE,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    baseUrl: DEFAULT_BASE_URL,
    strong: null,
    timeoutMs: 10 * 60_000,
    confirmation: null,
    killSwitch: 'on',
    selfTest: false,
  }
  for (const arg of argv) {
    if (arg === '--execute') args.execute = true
    else if (arg === '--self-test') args.selfTest = true
    else if (arg.startsWith('--slot=')) args.slot = arg.slice('--slot='.length).toLowerCase()
    else if (arg.startsWith('--model=')) args.model = arg.slice('--model='.length)
    else if (arg.startsWith('--source=')) args.source = arg.slice('--source='.length)
    else if (arg.startsWith('--gate=')) args.gate = arg.slice('--gate='.length)
    else if (arg.startsWith('--output-root=')) args.outputRoot = arg.slice('--output-root='.length)
    else if (arg.startsWith('--base-url=')) args.baseUrl = arg.slice('--base-url='.length)
    else if (arg.startsWith('--strong=')) args.strong = arg.slice('--strong='.length).toUpperCase()
    else if (arg.startsWith('--timeout-ms=')) args.timeoutMs = Number(arg.slice('--timeout-ms='.length))
    else if (arg.startsWith('--confirmation=')) args.confirmation = arg.slice('--confirmation='.length)
    else if (arg.startsWith('--kill-switch=')) args.killSwitch = arg.slice('--kill-switch='.length).toLowerCase()
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
  const pathname = url.pathname.replace(/\/$/u, '')
  if (pathname !== '/api') throw new Error(`Ollama base path must be /api: ${pathname}`)
  return `${url.origin}/api`
}

function validateArgs(args) {
  if (args.selfTest) return
  if (!SLOT_CONFIG[args.slot]) throw new Error('--slot=a|b is required')
  if (!args.model?.trim()) throw new Error('--model=<installed-local-model> is required')
  if (args.strong && !/^G[1-9]\d*$/u.test(args.strong)) throw new Error('--strong must be a normalized Greek Strong id')
  if (!Number.isInteger(args.timeoutMs) || args.timeoutMs < 10_000 || args.timeoutMs > 60 * 60_000) throw new Error('--timeout-ms must be 10000..3600000')
  if (!['on', 'off'].includes(args.killSwitch)) throw new Error('--kill-switch=on|off is required')
  validateLocalBaseUrl(args.baseUrl)
}

const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'))

function writeJsonAtomic(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  const temp = `${path}.tmp-${process.pid}`
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  renameSync(temp, path)
}

export function assertExecutionGate(gate, args) {
  if (gate?.gateId !== 'luke-g2-canary-execute-v1') throw new Error('Luke G2 execution gate missing')
  if (!args.execute) return
  if (gate.modes?.localTwoModel?.enabled !== true) throw new Error('localTwoModel mode is disabled in the committed Gate')
  if (gate.executionAllowed !== true) throw new Error('executionAllowed is false in the committed Gate')
  if (args.confirmation !== gate.confirmationRequired) throw new Error(`confirmation must equal ${gate.confirmationRequired}`)
  if (args.killSwitch !== 'off') throw new Error('kill switch must be explicitly off')
  if (gate.safety?.candidateOnly !== true || gate.safety?.productionWriteAllowed !== false) throw new Error('candidate-only safety boundary missing')
  if (gate.safety?.humanReviewRequired !== true || gate.safety?.automaticApprovalAllowed !== false) throw new Error('human review safety boundary missing')
}

function selectedPackets(preparation, strong) {
  let packets = (preparation.packets || []).filter((packet) => packet.sourcePacketStatus === 'ready')
  if (strong) packets = packets.filter((packet) => packet.strong === strong)
  if (!packets.length) throw new Error('no matching ready Luke G2 packets')
  return packets
}

async function callLocalOllama({ envelope, model, baseUrl, timeoutMs, fetchImpl = fetch }) {
  const request = createModelRequest(envelope)
  const started = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(`${validateLocalBaseUrl(baseUrl)}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: request.messages,
        stream: false,
        format: OUTPUT_SCHEMA,
        options: { temperature: 0.1 },
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
      usage: {
        input_tokens: Number(data.prompt_eval_count || 0),
        output_tokens: Number(data.eval_count || 0),
        total_tokens: Number(data.prompt_eval_count || 0) + Number(data.eval_count || 0),
      },
      metrics: { latencyMs: Date.now() - started },
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function runLukeG2LocalOllama(args, env = process.env, fetchImpl = fetch) {
  validateArgs(args)
  const gate = readJson(args.gate)
  assertExecutionGate(gate, args)
  if (args.execute && (env.NVIDIA_API_KEY || env.OPENAI_API_KEY || env.OLLAMA_API_KEY)) {
    console.warn('External API environment variables exist, but the Luke zero-cost runner does not read or transmit them.')
  }
  const preparation = readJson(args.source)
  const config = SLOT_CONFIG[args.slot]
  const packets = selectedPackets(preparation, args.strong)
  const root = resolve(args.outputRoot)
  const summary = {
    schemaVersion: 1,
    runnerVersion: LUKE_G2_LOCAL_RUNNER_VERSION,
    mode: args.execute ? 'local-execute' : 'dry-run',
    comparisonSlot: config.slot,
    actualExecutionBackend: 'ollama-local',
    model: args.model,
    localBaseUrl: validateLocalBaseUrl(args.baseUrl),
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
    const envelope = createJobEnvelope(packet, config.slot)
    writeJsonAtomic(resolve(root, 'envelopes', config.directory, `${packet.strong}.json`), {
      ...envelope,
      zeroCost: {
        actualExecutionBackend: 'ollama-local',
        localBaseUrl: summary.localBaseUrl,
        externalPaidApiAllowed: false,
      },
    })
    summary.envelopesWritten += 1
    if (!args.execute) continue

    const outputPath = resolve(root, 'candidates', config.directory, `${packet.strong}.json`)
    if (existsSync(outputPath)) {
      const existing = readJson(outputPath)
      if (existing.sourceFingerprint === envelope.sourceFingerprint && existing.status === 'candidate') {
        summary.skippedExisting += 1
        continue
      }
    }

    try {
      const modelResult = await callLocalOllama({ envelope, model: args.model, baseUrl: args.baseUrl, timeoutMs: args.timeoutMs, fetchImpl })
      const candidate = parseJsonCandidate(modelResult.content)
      const stored = createStoredCandidate({ envelope, modelResult, candidate, generatedAt: new Date().toISOString() })
      stored.provenance = {
        comparisonSlot: config.slot,
        actualExecutionBackend: 'ollama-local',
        localModel: args.model,
        localBaseUrl: summary.localBaseUrl,
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
  assert.throws(() => validateLocalBaseUrl('https://ollama.com/api'), /local http/u)
  assert.throws(() => validateLocalBaseUrl('http://example.com:11434/api'), /non-local/u)
  const gate = {
    gateId: 'luke-g2-canary-execute-v1', confirmationRequired: 'RUN-LUKE-G2-CANARY', executionAllowed: false,
    modes: { localTwoModel: { enabled: false } }, safety: { candidateOnly: true, productionWriteAllowed: false, humanReviewRequired: true, automaticApprovalAllowed: false },
  }
  assert.doesNotThrow(() => assertExecutionGate(gate, { execute: false }))
  assert.throws(() => assertExecutionGate(gate, { execute: true, confirmation: 'RUN-LUKE-G2-CANARY', killSwitch: 'off' }), /disabled/u)
  console.log('✓ Luke G2 local Ollama runner self-test passed')
}

const args = parseArgs(process.argv.slice(2))
if (args.selfTest) await runSelfTest()
else {
  const summary = await runLukeG2LocalOllama(args)
  console.log(`✓ Luke G2 local slot ${summary.comparisonSlot} · mode=${summary.mode} · candidates=${summary.candidatesWritten} · failed=${summary.failed}`)
  if (args.execute && summary.failed > 0) process.exitCode = 2
}
