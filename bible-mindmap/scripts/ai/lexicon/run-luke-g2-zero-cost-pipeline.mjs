#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { runLukeG2LocalOllama, validateLocalBaseUrl } from './run-luke-g2-local-ollama.mjs'

const DEFAULT_SOURCE = 'data/lexicon/luke-g2-canary-preparation.json'
const DEFAULT_GATE = 'data/lexicon/luke-g2-execution-gate.json'
const DEFAULT_OUTPUT_ROOT = 'reports/luke-g2-zero-cost-execution'
const DEFAULT_REPORT = 'reports/luke-g2-zero-cost-pipeline.json'
const DEFAULT_BASE_URL = 'http://127.0.0.1:11434/api'

export function parseLukeG2PipelineArgs(argv) {
  const args = {
    execute: false,
    offlinePlan: false,
    confirmation: null,
    killSwitch: 'on',
    modelA: null,
    modelB: null,
    source: DEFAULT_SOURCE,
    gate: DEFAULT_GATE,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    report: DEFAULT_REPORT,
    baseUrl: DEFAULT_BASE_URL,
    timeoutMs: 10 * 60_000,
    numCtx: 8192,
    temperature: 0,
    selfTest: false,
  }
  for (const arg of argv) {
    if (arg === '--execute') args.execute = true
    else if (arg === '--offline-plan') args.offlinePlan = true
    else if (arg === '--self-test') args.selfTest = true
    else if (arg.startsWith('--confirmation=')) args.confirmation = arg.slice('--confirmation='.length)
    else if (arg.startsWith('--kill-switch=')) args.killSwitch = arg.slice('--kill-switch='.length).toLowerCase()
    else if (arg.startsWith('--model-a=')) args.modelA = arg.slice('--model-a='.length)
    else if (arg.startsWith('--model-b=')) args.modelB = arg.slice('--model-b='.length)
    else if (arg.startsWith('--source=')) args.source = arg.slice('--source='.length)
    else if (arg.startsWith('--gate=')) args.gate = arg.slice('--gate='.length)
    else if (arg.startsWith('--output-root=')) args.outputRoot = arg.slice('--output-root='.length)
    else if (arg.startsWith('--report=')) args.report = arg.slice('--report='.length)
    else if (arg.startsWith('--base-url=')) args.baseUrl = arg.slice('--base-url='.length)
    else if (arg.startsWith('--timeout-ms=')) args.timeoutMs = Number(arg.slice('--timeout-ms='.length))
    else if (arg.startsWith('--num-ctx=')) args.numCtx = Number(arg.slice('--num-ctx='.length))
    else if (arg.startsWith('--temperature=')) args.temperature = Number(arg.slice('--temperature='.length))
    else throw new Error(`unknown argument: ${arg}`)
  }
  return args
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), 'utf8'))
}

function writeJson(path, value) {
  const target = resolve(path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function validatePipelineArgs(args) {
  validateLocalBaseUrl(args.baseUrl)
  if (args.modelA && args.modelB && args.modelA === args.modelB) throw new Error('slot A/B must use different local models')
  if (args.execute && (!args.modelA || !args.modelB)) throw new Error('--model-a and --model-b are required for execution')
  if (!['on', 'off'].includes(args.killSwitch)) throw new Error('--kill-switch=on|off is required')
  if (!Number.isInteger(args.numCtx) || args.numCtx < 4096 || args.numCtx > 131072) throw new Error('--num-ctx must be 4096..131072')
  if (!Number.isFinite(args.temperature) || args.temperature < 0 || args.temperature > 1) throw new Error('--temperature must be 0..1')
}

export async function probeOllamaModels(baseUrl, modelA, modelB, fetchImpl = fetch) {
  const response = await fetchImpl(`${validateLocalBaseUrl(baseUrl)}/tags`)
  if (!response.ok) throw new Error(`Ollama preflight HTTP ${response.status}: ${await response.text()}`)
  const data = await response.json()
  const models = Array.isArray(data?.models) ? data.models : []
  const byName = new Map(models.flatMap((model) => {
    const names = [model.name, model.model].filter(Boolean)
    return names.map((name) => [name, model])
  }))
  const selectedA = modelA ? byName.get(modelA) : null
  const selectedB = modelB ? byName.get(modelB) : null
  if (modelA && !selectedA) throw new Error(`local model A is not installed: ${modelA}`)
  if (modelB && !selectedB) throw new Error(`local model B is not installed: ${modelB}`)
  if (selectedA && selectedB) {
    if (modelA === modelB) throw new Error('slot A/B must use different local models')
    if (selectedA.digest && selectedB.digest && selectedA.digest === selectedB.digest) {
      throw new Error('slot A/B must not use the same local model digest')
    }
  }
  return {
    installed: models.map((model) => ({ name: model.name || model.model, digest: model.digest || null, size: model.size || null })),
    selected: {
      A: selectedA ? { name: modelA, digest: selectedA.digest || null } : null,
      B: selectedB ? { name: modelB, digest: selectedB.digest || null } : null,
    },
  }
}

function runComparison(args) {
  const command = [
    'scripts/verify-luke-g2-local-results.mjs',
    '--strict',
    `--source=${args.source}`,
    `--output-root=${args.outputRoot}`,
  ]
  const result = spawnSync(process.execPath, command, { cwd: process.cwd(), encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`Luke G2 comparison failed: ${result.stderr || result.stdout}`)
  return { status: 'passed', stdout: result.stdout.trim() }
}

export async function runLukeG2ZeroCostPipeline(
  args,
  env = process.env,
  fetchImpl = fetch,
  runnerImpl = runLukeG2LocalOllama,
  comparisonImpl = runComparison,
) {
  validatePipelineArgs(args)
  const gate = readJson(args.gate)
  const preparation = readJson(args.source)
  const readyPackets = (preparation.packets || []).filter((packet) => packet.sourcePacketStatus === 'ready')
  const report = {
    schemaVersion: 1,
    pipelineVersion: '2026.08.09-luke-zc-pipeline.1',
    mode: args.execute ? 'local-execute' : 'preflight',
    status: 'preflight-pending',
    sourcePacketCount: readyPackets.length,
    requestedModels: { A: args.modelA, B: args.modelB },
    localBaseUrl: validateLocalBaseUrl(args.baseUrl),
    generationSettings: { temperature: args.temperature, numCtx: args.numCtx, timeoutMs: args.timeoutMs },
    gate: {
      state: gate.state,
      executionAllowed: gate.executionAllowed === true,
      localTwoModelEnabled: gate.modes?.localTwoModel?.enabled === true,
      killSwitch: args.killSwitch,
      confirmationMatched: args.confirmation === gate.confirmationRequired,
    },
    preflight: null,
    slotA: null,
    slotB: null,
    comparison: null,
    governance: {
      externalPaidApiUsed: false,
      apiKeysRequired: false,
      productionWriteAllowed: false,
      automaticApprovalAllowed: false,
      humanReviewRequired: true,
    },
  }

  if (!args.offlinePlan) {
    report.preflight = await probeOllamaModels(args.baseUrl, args.modelA, args.modelB, fetchImpl)
  } else {
    report.preflight = { skipped: true, reason: 'offline-plan' }
  }

  if (!args.execute) {
    report.status = 'preflight-complete-execution-blocked'
    writeJson(args.report, report)
    return report
  }

  if (gate.modes?.localTwoModel?.enabled !== true) throw new Error('localTwoModel mode is disabled in the committed Gate')
  if (gate.executionAllowed !== true) throw new Error('executionAllowed is false in the committed Gate')
  if (args.confirmation !== gate.confirmationRequired) throw new Error(`confirmation must equal ${gate.confirmationRequired}`)
  if (args.killSwitch !== 'off') throw new Error('kill switch must be explicitly off')
  if (gate.safety?.candidateOnly !== true || gate.safety?.productionWriteAllowed !== false) throw new Error('candidate-only safety boundary missing')
  if (gate.safety?.humanReviewRequired !== true || gate.safety?.automaticApprovalAllowed !== false) throw new Error('human review safety boundary missing')

  const common = {
    execute: true,
    source: args.source,
    gate: args.gate,
    outputRoot: args.outputRoot,
    baseUrl: args.baseUrl,
    timeoutMs: args.timeoutMs,
    numCtx: args.numCtx,
    temperature: args.temperature,
    confirmation: args.confirmation,
    killSwitch: args.killSwitch,
    strong: null,
    selfTest: false,
  }
  report.slotA = await runnerImpl({ ...common, slot: 'a', model: args.modelA }, env, fetchImpl)
  if (report.slotA.failed > 0) throw new Error(`slot A failed: ${report.slotA.failed}`)
  report.slotB = await runnerImpl({ ...common, slot: 'b', model: args.modelB }, env, fetchImpl)
  if (report.slotB.failed > 0) throw new Error(`slot B failed: ${report.slotB.failed}`)
  report.comparison = comparisonImpl(args)
  report.status = 'human-review-required'
  writeJson(args.report, report)
  return report
}

async function runSelfTest() {
  const root = resolve('.tmp-luke-g2-pipeline-self-test')
  const source = `${root}/source.json`
  const gate = `${root}/gate.json`
  writeJson(source, { packets: [{ sourcePacketStatus: 'ready', strong: 'G2316' }] })
  writeJson(gate, {
    gateId: 'luke-g2-canary-execute-v1',
    state: 'blocked-awaiting-explicit-approval',
    confirmationRequired: 'RUN-LUKE-G2-CANARY',
    executionAllowed: false,
    modes: { localTwoModel: { enabled: false } },
    safety: { candidateOnly: true, productionWriteAllowed: false, humanReviewRequired: true, automaticApprovalAllowed: false },
  })
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      models: [
        { name: 'model-a:latest', digest: 'sha-a', size: 1 },
        { name: 'model-b:latest', digest: 'sha-b', size: 1 },
      ],
    }),
  })
  const args = {
    execute: false,
    offlinePlan: false,
    confirmation: null,
    killSwitch: 'on',
    modelA: 'model-a:latest',
    modelB: 'model-b:latest',
    source,
    gate,
    outputRoot: `${root}/out`,
    report: `${root}/report.json`,
    baseUrl: DEFAULT_BASE_URL,
    timeoutMs: 600000,
    numCtx: 8192,
    temperature: 0,
    selfTest: false,
  }
  const report = await runLukeG2ZeroCostPipeline(args, {}, fetchImpl)
  assert.equal(report.status, 'preflight-complete-execution-blocked')
  assert.equal(report.preflight.selected.A.digest, 'sha-a')
  assert.equal(report.governance.productionWriteAllowed, false)
  await assert.rejects(
    () => probeOllamaModels(DEFAULT_BASE_URL, 'model-a:latest', 'model-a:latest', fetchImpl),
    /different local models/u,
  )
  console.log('✓ Luke G2 zero-cost pipeline self-test passed · local preflight · A/B digest guard · execution blocked')
}

const args = parseLukeG2PipelineArgs(process.argv.slice(2))
if (args.selfTest) await runSelfTest()
else {
  const report = await runLukeG2ZeroCostPipeline(args)
  console.log(`✓ Luke G2 zero-cost pipeline · mode=${report.mode} · status=${report.status} · packets=${report.sourcePacketCount}`)
}
