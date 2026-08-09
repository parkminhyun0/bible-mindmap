#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createNvidiaChatCompletion } from '../providers/nvidia.mjs'
import { createOpenAiStructuredResponse } from '../providers/openai.mjs'
import {
  PROVIDERS,
  createJobEnvelope,
  createProviderRequest,
  createStoredCandidate,
  parseJsonCandidate,
} from './genesis-g2-translation-contract.mjs'

const DEFAULT_SOURCE = 'reports/genesis-g2-bdb-source-packets.json'
const DEFAULT_OUTPUT_ROOT = 'reports/genesis-g2-blind-translation'

function parseArgs(argv) {
  const args = {
    provider: null,
    execute: false,
    retryFailed: false,
    source: DEFAULT_SOURCE,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    strong: null,
    limit: null,
    maxAttempts: 3,
    delayMs: 0,
  }
  for (const arg of argv) {
    if (arg === '--execute') args.execute = true
    else if (arg === '--retry-failed') args.retryFailed = true
    else if (arg.startsWith('--provider=')) args.provider = arg.split('=')[1]
    else if (arg.startsWith('--source=')) args.source = arg.slice('--source='.length)
    else if (arg.startsWith('--output-root=')) args.outputRoot = arg.slice('--output-root='.length)
    else if (arg.startsWith('--strong=')) args.strong = arg.slice('--strong='.length).toUpperCase()
    else if (arg.startsWith('--limit=')) args.limit = Number(arg.slice('--limit='.length))
    else if (arg.startsWith('--max-attempts=')) args.maxAttempts = Number(arg.slice('--max-attempts='.length))
    else if (arg.startsWith('--delay-ms=')) args.delayMs = Number(arg.slice('--delay-ms='.length))
    else if (arg === '--help') args.help = true
    else throw new Error(`unknown argument: ${arg}`)
  }
  return args
}

function validateArgs(args) {
  if (args.help) return
  if (!PROVIDERS.includes(args.provider)) throw new Error('--provider=nvidia|openai is required')
  if (args.strong && !/^H[1-9]\d*$/.test(args.strong)) throw new Error('--strong must be a normalized Hebrew Strong id')
  if (args.limit !== null && (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 100)) throw new Error('--limit must be 1..100')
  if (!Number.isInteger(args.maxAttempts) || args.maxAttempts < 1 || args.maxAttempts > 10) throw new Error('--max-attempts must be 1..10')
  if (!Number.isInteger(args.delayMs) || args.delayMs < 0 || args.delayMs > 60_000) throw new Error('--delay-ms must be 0..60000')
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

function writeJsonAtomic(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  const temp = `${path}.tmp-${process.pid}`
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  renameSync(temp, path)
}

function enforceExecutionBoundary(env) {
  const enabled = /^(1|true|on)$/i.test(env.GENESIS_G2_TRANSLATION_EXECUTION_ENABLED || '')
  const killed = /^(1|true|on)$/i.test(env.LEXICON_TRANSLATION_KILL_SWITCH || '')
  if (killed) throw new Error('LEXICON_TRANSLATION_KILL_SWITCH is active')
  if (!enabled) throw new Error('GENESIS_G2_TRANSLATION_EXECUTION_ENABLED=1 is required for --execute')
}

function loadLedger(path, provider) {
  if (!existsSync(path)) return { schemaVersion: 1, provider, maxAttempts: 3, entries: {} }
  const ledger = readJson(path)
  if (ledger.provider !== provider || typeof ledger.entries !== 'object') throw new Error('ledger provider/schema mismatch')
  return ledger
}

function safeMessage(error) {
  return String(error?.message || error).replace(/(?:sk-|nvapi-)[A-Za-z0-9_-]{8,}/g, '[redacted]')
}

const candidatePath = (root, provider, strong) => resolve(root, 'candidates', provider, `${strong}.json`)
const envelopePath = (root, provider, strong) => resolve(root, 'envelopes', provider, `${strong}.json`)
const sleep = (ms) => (ms > 0 ? new Promise((done) => setTimeout(done, ms)) : Promise.resolve())

async function callProvider(envelope, env) {
  const request = createProviderRequest(envelope)
  if (envelope.provider === 'nvidia') {
    return createNvidiaChatCompletion({
      messages: request.messages,
      temperature: 0.1,
      maxTokens: Number(env.GENESIS_G2_NVIDIA_MAX_TOKENS || 8_000),
      requestId: envelope.jobId,
      env,
    })
  }
  return createOpenAiStructuredResponse({
    input: request.input,
    schema: request.responseSchema,
    maxOutputTokens: Number(env.GENESIS_G2_OPENAI_MAX_OUTPUT_TOKENS || 8_000),
    requestId: envelope.jobId,
    env,
  })
}

export async function runGenesisG2BlindTranslation(args, env = process.env) {
  validateArgs(args)
  const sourceSet = readJson(resolve(args.source))
  if (sourceSet.packetSetId !== 'genesis-g2-calibration-bdb-source-packets-v1') throw new Error('unexpected source packet set')
  let packets = sourceSet.packets.filter((packet) => packet.sourcePacketStatus === 'ready')
  if (args.strong) packets = packets.filter((packet) => packet.strong === args.strong)
  if (args.limit !== null) packets = packets.slice(0, args.limit)
  if (!packets.length) throw new Error('no matching ready source packets')
  if (args.execute) enforceExecutionBoundary(env)

  const root = resolve(args.outputRoot)
  const ledgerPath = resolve(root, 'ledgers', `${args.provider}.json`)
  const ledger = loadLedger(ledgerPath, args.provider)
  ledger.maxAttempts = args.maxAttempts
  const summary = {
    schemaVersion: 1,
    provider: args.provider,
    mode: args.execute ? 'execute' : 'dry-run',
    sourcePacketSetId: sourceSet.packetSetId,
    requested: packets.length,
    envelopesWritten: 0,
    candidatesWritten: 0,
    skippedSuccess: 0,
    skippedFailed: 0,
    failed: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
    productionWriteAllowed: false,
  }

  for (const packet of packets) {
    const envelope = createJobEnvelope(packet, args.provider)
    writeJsonAtomic(envelopePath(root, args.provider, packet.strong), envelope)
    summary.envelopesWritten += 1
    if (!args.execute) continue

    const outputPath = candidatePath(root, args.provider, packet.strong)
    if (existsSync(outputPath)) {
      const existing = readJson(outputPath)
      if (existing.sourceFingerprint === envelope.sourceFingerprint && existing.status === 'candidate') {
        summary.skippedSuccess += 1
        continue
      }
      rmSync(outputPath)
    }

    const previous = ledger.entries[packet.strong]
    if (previous?.status === 'failed' && !args.retryFailed) {
      summary.skippedFailed += 1
      continue
    }
    const attempt = Number(previous?.attempts || 0) + 1
    if (attempt > args.maxAttempts) {
      summary.skippedFailed += 1
      continue
    }

    ledger.entries[packet.strong] = {
      status: 'running',
      attempts: attempt,
      sourceFingerprint: envelope.sourceFingerprint,
      updatedAt: new Date().toISOString(),
      error: null,
    }
    writeJsonAtomic(ledgerPath, ledger)

    try {
      const providerResult = await callProvider(envelope, env)
      const parsed = parseJsonCandidate(providerResult.content)
      const generatedAt = new Date().toISOString()
      const stored = createStoredCandidate({ envelope, providerResult, candidate: parsed, attempt, generatedAt })
      writeJsonAtomic(outputPath, stored)
      ledger.entries[packet.strong] = {
        status: 'candidate',
        attempts: attempt,
        sourceFingerprint: envelope.sourceFingerprint,
        candidatePath: `candidates/${args.provider}/${packet.strong}.json`,
        requestId: providerResult.requestId || null,
        updatedAt: generatedAt,
        error: null,
      }
      summary.candidatesWritten += 1
    } catch (error) {
      ledger.entries[packet.strong] = {
        status: 'failed',
        attempts: attempt,
        sourceFingerprint: envelope.sourceFingerprint,
        updatedAt: new Date().toISOString(),
        error: { code: error?.name || 'Error', message: safeMessage(error) },
      }
      summary.failed += 1
    }
    writeJsonAtomic(ledgerPath, ledger)
    await sleep(args.delayMs)
  }

  summary.completedAt = new Date().toISOString()
  writeJsonAtomic(resolve(root, 'summaries', `${args.provider}-${summary.mode}.json`), summary)
  if (args.execute && summary.failed > 0) process.exitCode = 2
  return summary
}

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  console.log('Usage: node run-genesis-g2-blind-translation.mjs --provider=nvidia|openai [--execute] [--strong=H430] [--limit=10] [--retry-failed]')
} else {
  const summary = await runGenesisG2BlindTranslation(args)
  console.log(`✓ Genesis G2 blind ${summary.provider} ${summary.mode}: envelopes=${summary.envelopesWritten}, candidates=${summary.candidatesWritten}, failed=${summary.failed}`)
}
