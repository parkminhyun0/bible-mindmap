#!/usr/bin/env node

import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createJobEnvelope, createStoredCandidate, validateCandidate } from './luke-g2-translation-contract.mjs'

const DEFAULT_SOURCE = 'data/lexicon/luke-g2-canary-preparation.json'
const DEFAULT_GATE = 'data/lexicon/luke-g2-execution-gate.json'
const DEFAULT_OUTPUT_ROOT = 'reports/luke-g2-zero-cost-execution'

function parseArgs(argv) {
  const args = {
    execute: false,
    slot: null,
    input: null,
    strong: null,
    modelId: null,
    source: DEFAULT_SOURCE,
    gate: DEFAULT_GATE,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    confirmation: null,
    killSwitch: 'on',
    selfTest: false,
  }
  for (const arg of argv) {
    if (arg === '--execute') args.execute = true
    else if (arg === '--self-test') args.selfTest = true
    else if (arg.startsWith('--slot=')) args.slot = arg.slice('--slot='.length).toLowerCase()
    else if (arg.startsWith('--input=')) args.input = arg.slice('--input='.length)
    else if (arg.startsWith('--strong=')) args.strong = arg.slice('--strong='.length).toUpperCase()
    else if (arg.startsWith('--model-id=')) args.modelId = arg.slice('--model-id='.length)
    else if (arg.startsWith('--source=')) args.source = arg.slice('--source='.length)
    else if (arg.startsWith('--gate=')) args.gate = arg.slice('--gate='.length)
    else if (arg.startsWith('--output-root=')) args.outputRoot = arg.slice('--output-root='.length)
    else if (arg.startsWith('--confirmation=')) args.confirmation = arg.slice('--confirmation='.length)
    else if (arg.startsWith('--kill-switch=')) args.killSwitch = arg.slice('--kill-switch='.length).toLowerCase()
    else throw new Error(`unknown argument: ${arg}`)
  }
  return args
}

const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'))

function writeJsonAtomic(path, value) {
  const target = resolve(path)
  mkdirSync(dirname(target), { recursive: true })
  const temp = `${target}.tmp-${process.pid}`
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  renameSync(temp, target)
}

function assertManualGate(gate, args) {
  if (!args.execute) return
  if (gate?.gateId !== 'luke-g2-canary-execute-v1') throw new Error('Luke G2 execution gate missing')
  if (gate.modes?.manualIndependentJson?.enabled !== true) throw new Error('manualIndependentJson mode is disabled in the committed Gate')
  if (gate.executionAllowed !== true) throw new Error('executionAllowed is false in the committed Gate')
  if (args.confirmation !== gate.confirmationRequired) throw new Error(`confirmation must equal ${gate.confirmationRequired}`)
  if (args.killSwitch !== 'off') throw new Error('kill switch must be explicitly off')
  if (gate.safety?.candidateOnly !== true || gate.safety?.productionWriteAllowed !== false) throw new Error('candidate-only safety boundary missing')
  if (gate.safety?.humanReviewRequired !== true || gate.safety?.automaticApprovalAllowed !== false) throw new Error('human review safety boundary missing')
}

export function importLukeG2ManualCandidate(args) {
  if (!['a', 'b'].includes(args.slot)) throw new Error('--slot=a|b is required')
  if (!args.input) throw new Error('--input=<candidate.json> is required')
  if (!args.modelId?.trim()) throw new Error('--model-id=<independent-author-or-model> is required')
  if (!['on', 'off'].includes(args.killSwitch)) throw new Error('--kill-switch=on|off is required')
  const gate = readJson(args.gate)
  assertManualGate(gate, args)
  const preparation = readJson(args.source)
  const candidate = readJson(args.input)
  const strong = args.strong || candidate.strong
  const packet = (preparation.packets || []).find((item) => item.strong === strong && item.sourcePacketStatus === 'ready')
  if (!packet) throw new Error(`ready Luke G2 packet not found: ${strong}`)
  const slot = args.slot.toUpperCase()
  const envelope = createJobEnvelope(packet, slot)
  const validation = validateCandidate(candidate, envelope)
  if (!validation.passed) throw new Error(validation.errors.join('; '))
  const preview = {
    schemaVersion: 1,
    mode: args.execute ? 'manual-import' : 'validation-only',
    strong,
    comparisonSlot: slot,
    modelId: args.modelId,
    sourceFingerprint: envelope.sourceFingerprint,
    validation,
    productionWriteAllowed: false,
    humanReviewRequired: true,
  }
  if (!args.execute) return preview

  const stored = createStoredCandidate({
    envelope,
    modelResult: { model: `manual-independent:${args.modelId}`, usage: null, metrics: null },
    candidate,
    generatedAt: new Date().toISOString(),
  })
  stored.provenance = {
    comparisonSlot: slot,
    actualExecutionBackend: 'manual-independent-json',
    manualModelOrAuthor: args.modelId,
    externalPaidApiUsed: false,
    monetaryCostExpected: false,
    apiKeyUsed: false,
  }
  const directory = args.slot === 'a' ? 'slot-a' : 'slot-b'
  writeJsonAtomic(resolve(args.outputRoot, 'candidates', directory, `${strong}.json`), stored)
  return { ...preview, storedCandidateId: stored.candidateId }
}

function runSelfTest() {
  const root = resolve('.tmp-luke-g2-manual-self-test')
  const source = `${root}/source.json`
  const gate = `${root}/gate.json`
  const input = `${root}/input.json`
  const packet = {
    packetId: 'fixture:G2316', sourcePacketStatus: 'ready', strong: 'G2316',
    identity: { primaryLemma: 'θεός' }, usage: {}, sourceEvidence: {}, reuse: {}, routing: {}, theologyAudit: {},
    contexts: [
      { contextId: 'ctx-1', tokenId: 'Luke.1.1.1', reference: 'Luke 1:1', target: {}, verse: {}, localWindow: [], morphgntCrossCheck: {} },
      { contextId: 'ctx-2', tokenId: 'Luke.1.2.1', reference: 'Luke 1:2', target: {}, verse: {}, localWindow: [], morphgntCrossCheck: {} },
    ],
  }
  writeJsonAtomic(source, { packets: [packet] })
  writeJsonAtomic(gate, {
    gateId: 'luke-g2-canary-execute-v1',
    confirmationRequired: 'RUN-LUKE-G2-CANARY',
    executionAllowed: false,
    modes: { manualIndependentJson: { enabled: false } },
    safety: { candidateOnly: true, productionWriteAllowed: false, humanReviewRequired: true, automaticApprovalAllowed: false },
  })
  const envelope = createJobEnvelope(packet, 'A')
  writeJsonAtomic(input, {
    strong: 'G2316',
    sourceFingerprint: envelope.sourceFingerprint,
    transliterationKo: '테오스',
    primaryGlossKo: '하나님',
    alternateGlossesKo: ['신'],
    lexicalNotesKo: '',
    contextDecisions: [
      { contextId: 'ctx-1', glossKo: '하나님', rationaleKo: '문맥상 하나님을 가리킨다.', confidence: 0.96, riskFlags: ['theological-sensitive'] },
      { contextId: 'ctx-2', glossKo: '하나님', rationaleKo: '문맥상 하나님을 가리킨다.', confidence: 0.91, riskFlags: [] },
    ],
    reviewerFlags: ['THEOLOGY_KEYWORD'],
  })
  const preview = importLukeG2ManualCandidate({
    execute: false, slot: 'a', input, strong: null, modelId: 'fixture-a',
    source, gate, outputRoot: `${root}/out`, confirmation: null, killSwitch: 'on', selfTest: false,
  })
  assert.equal(preview.validation.passed, true)
  assert.equal(preview.productionWriteAllowed, false)
  assert.throws(() => importLukeG2ManualCandidate({
    execute: true, slot: 'a', input, strong: null, modelId: 'fixture-a',
    source, gate, outputRoot: `${root}/out`, confirmation: 'RUN-LUKE-G2-CANARY', killSwitch: 'off', selfTest: false,
  }), /disabled/u)
  console.log('✓ Luke G2 manual independent JSON importer self-test passed · Gate blocked')
}

const args = parseArgs(process.argv.slice(2))
if (args.selfTest) runSelfTest()
else {
  const result = importLukeG2ManualCandidate(args)
  console.log(`✓ Luke G2 manual candidate · mode=${result.mode} · slot=${result.comparisonSlot} · strong=${result.strong}`)
}
