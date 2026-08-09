#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import {
  LUKE_G2_PROMPT_VERSION,
  LUKE_G2_TRANSLATION_CONTRACT_VERSION,
  createJobEnvelope,
  validateCandidate,
} from './ai/lexicon/luke-g2-translation-contract.mjs'

const DEFAULT_SOURCE = 'data/lexicon/luke-g2-canary-preparation.json'
const DEFAULT_OUTPUT_ROOT = 'reports/luke-g2-zero-cost-execution'
const DEFAULT_REPORT = 'reports/luke-g2-zero-cost-comparison.json'
const ALLOWED_BACKENDS = new Set(['ollama-local', 'manual-independent-json'])

function parseArgs(argv) {
  const args = { source: DEFAULT_SOURCE, outputRoot: DEFAULT_OUTPUT_ROOT, report: DEFAULT_REPORT, strict: false, selfTest: false }
  for (const arg of argv) {
    if (arg === '--strict') args.strict = true
    else if (arg === '--self-test') args.selfTest = true
    else if (arg.startsWith('--source=')) args.source = arg.slice('--source='.length)
    else if (arg.startsWith('--output-root=')) args.outputRoot = arg.slice('--output-root='.length)
    else if (arg.startsWith('--report=')) args.report = arg.slice('--report='.length)
    else throw new Error(`unknown argument: ${arg}`)
  }
  return args
}

const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'))

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function validateStoredCandidate(candidate, packet, envelope, expectedSlot, errors) {
  if (candidate.comparisonSlot !== expectedSlot) errors.push(`${packet.strong}: slot ${expectedSlot} comparisonSlot mismatch`)
  if (candidate.contractVersion !== LUKE_G2_TRANSLATION_CONTRACT_VERSION) errors.push(`${packet.strong}: slot ${expectedSlot} stale contractVersion`)
  if (candidate.promptVersion !== LUKE_G2_PROMPT_VERSION) errors.push(`${packet.strong}: slot ${expectedSlot} stale promptVersion`)
  if (candidate.sourceFingerprint !== envelope.sourceFingerprint) errors.push(`${packet.strong}: slot ${expectedSlot} sourceFingerprint mismatch`)
  if (candidate.status !== 'candidate') errors.push(`${packet.strong}: slot ${expectedSlot} status must be candidate`)
  if (candidate.governance?.productionWriteAllowed !== false || candidate.governance?.humanReviewRequired !== true) {
    errors.push(`${packet.strong}: slot ${expectedSlot} governance boundary missing`)
  }
  const backend = candidate.provenance?.actualExecutionBackend
  if (!ALLOWED_BACKENDS.has(backend)) errors.push(`${packet.strong}: slot ${expectedSlot} unsupported execution backend: ${backend}`)
  if (candidate.provenance?.externalPaidApiUsed !== false) errors.push(`${packet.strong}: slot ${expectedSlot} external paid API evidence detected`)
  const validation = validateCandidate(candidate.payload, envelope)
  if (!validation.passed) errors.push(`${packet.strong}: slot ${expectedSlot} invalid: ${validation.errors.join('; ')}`)
  return backend
}

export function compareLukeG2Candidates(preparation, candidateBySlot) {
  const errors = []
  const items = []
  for (const packet of preparation.packets || []) {
    const envelopeA = createJobEnvelope(packet, 'A')
    const envelopeB = createJobEnvelope(packet, 'B')
    const a = candidateBySlot.A?.[packet.strong]
    const b = candidateBySlot.B?.[packet.strong]
    if (!a || !b) {
      errors.push(`${packet.strong}: both independent candidates are required`)
      continue
    }
    if (a.blindGroupId !== b.blindGroupId) errors.push(`${packet.strong}: blindGroupId mismatch`)
    if (a.model === b.model) errors.push(`${packet.strong}: slot A/B must use different local models or independent manual authors`)
    const backendA = validateStoredCandidate(a, packet, envelopeA, 'A', errors)
    const backendB = validateStoredCandidate(b, packet, envelopeB, 'B', errors)
    if (backendA !== backendB) errors.push(`${packet.strong}: slot A/B execution backends must match`)
    if (backendA === 'ollama-local') {
      const settingsA = a.provenance?.generationSettings
      const settingsB = b.provenance?.generationSettings
      if (!settingsA || !settingsB) errors.push(`${packet.strong}: local generation settings missing`)
      if (settingsA?.numCtx !== settingsB?.numCtx || settingsA?.temperature !== settingsB?.temperature) {
        errors.push(`${packet.strong}: slot A/B generation settings mismatch`)
      }
    }
    items.push({
      strong: packet.strong,
      candidateA: a.candidateId,
      candidateB: b.candidateId,
      models: [a.model, b.model],
      executionBackend: backendA,
      samePrimaryGloss: a.payload.primaryGlossKo === b.payload.primaryGlossKo,
      contextAgreementCount: a.payload.contextDecisions.reduce((count, decision, index) => (
        count + (decision.glossKo === b.payload.contextDecisions[index]?.glossKo ? 1 : 0)
      ), 0),
      contextCount: packet.contexts.length,
      comparisonStatus: 'human-review-required',
      automaticApprovalAllowed: false,
    })
  }
  return {
    schemaVersion: 1,
    stage: 'G2-independent-candidate-comparison',
    contractVersion: LUKE_G2_TRANSLATION_CONTRACT_VERSION,
    promptVersion: LUKE_G2_PROMPT_VERSION,
    pass: errors.length === 0 && items.length === (preparation.packets || []).length,
    summary: {
      selected: (preparation.packets || []).length,
      compared: items.length,
      errors: errors.length,
      productionWrites: 0,
      automaticApprovals: 0,
    },
    items,
    errors,
    governance: {
      candidateOnly: true,
      humanReviewRequired: true,
      productionWriteAllowed: false,
      automaticApprovalAllowed: false,
      r3r4AutomaticApprovalAllowed: false,
    },
  }
}

function loadCandidates(preparation, outputRoot) {
  const result = { A: {}, B: {} }
  for (const packet of preparation.packets || []) {
    for (const [slot, directory] of [['A', 'slot-a'], ['B', 'slot-b']]) {
      const path = resolve(outputRoot, 'candidates', directory, `${packet.strong}.json`)
      if (existsSync(path)) result[slot][packet.strong] = readJson(path)
    }
  }
  return result
}

function fixture() {
  const packet = {
    packetId: 'luke-g2-source-context:G2316', sourcePacketStatus: 'ready', strong: 'G2316',
    identity: { primaryLemma: 'θεός' }, usage: { tokenCount: 2 },
    sourceEvidence: { englishGlosses: ['God'] }, reuse: {}, routing: {}, theologyAudit: {},
    contexts: [
      { contextId: 'ctx-1', tokenId: 'Luke.1.6.7', reference: 'Luke 1:6', target: {}, verse: {}, localWindow: [], morphgntCrossCheck: {} },
      { contextId: 'ctx-2', tokenId: 'Luke.1.8.7', reference: 'Luke 1:8', target: {}, verse: {}, localWindow: [], morphgntCrossCheck: {} },
    ],
  }
  const payloadFor = (slot) => {
    const envelope = createJobEnvelope(packet, slot)
    return {
      schemaVersion: 1,
      contractVersion: LUKE_G2_TRANSLATION_CONTRACT_VERSION,
      promptVersion: LUKE_G2_PROMPT_VERSION,
      candidateId: `${envelope.blindGroupId}:slot-${slot.toLowerCase()}`,
      blindGroupId: envelope.blindGroupId,
      comparisonSlot: slot,
      model: `ollama-local:model-${slot.toLowerCase()}`,
      strong: packet.strong,
      sourceFingerprint: envelope.sourceFingerprint,
      status: 'candidate',
      payload: {
        strong: packet.strong,
        sourceFingerprint: envelope.sourceFingerprint,
        transliterationKo: '테오스',
        primaryGlossKo: '하나님',
        alternateGlossesKo: ['신'],
        lexicalNotesKo: '',
        contextDecisions: [
          { contextId: 'ctx-1', glossKo: '하나님', rationaleKo: '문맥상 유일하신 하나님을 가리킨다.', confidence: 0.98, riskFlags: ['theological-sensitive'] },
          { contextId: 'ctx-2', glossKo: '하나님', rationaleKo: '문맥상 하나님을 가리킨다.', confidence: 0.94, riskFlags: [] },
        ],
        reviewerFlags: ['THEOLOGY_KEYWORD'],
      },
      governance: { productionWriteAllowed: false, humanReviewRequired: true },
      provenance: {
        actualExecutionBackend: 'ollama-local',
        externalPaidApiUsed: false,
        generationSettings: { temperature: 0, numCtx: 8192 },
      },
    }
  }
  return { preparation: { packets: [packet] }, candidateBySlot: { A: { G2316: payloadFor('A') }, B: { G2316: payloadFor('B') } } }
}

function runSelfTest() {
  const { preparation, candidateBySlot } = fixture()
  const report = compareLukeG2Candidates(preparation, candidateBySlot)
  assert.equal(report.pass, true)
  assert.equal(report.summary.compared, 1)
  assert.equal(report.governance.productionWriteAllowed, false)
  const stale = structuredClone(candidateBySlot)
  stale.A.G2316.contractVersion = 'old'
  assert.match(compareLukeG2Candidates(preparation, stale).errors.join(';'), /stale contractVersion/u)
  console.log('✓ Luke G2 local result verifier self-test passed · current contract · backend/settings guards')
}

const args = parseArgs(process.argv.slice(2))
if (args.selfTest) runSelfTest()
else {
  const preparation = readJson(args.source)
  const report = compareLukeG2Candidates(preparation, loadCandidates(preparation, args.outputRoot))
  writeJson(args.report, report)
  console.log(`Luke G2 local candidate comparison · compared=${report.summary.compared}/${report.summary.selected} · errors=${report.summary.errors}`)
  if (args.strict && !report.pass) process.exitCode = 1
}
