#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createJobEnvelope, validateCandidate } from './ai/lexicon/luke-g2-translation-contract.mjs'

const DEFAULT_SOURCE = 'data/lexicon/luke-g2-canary-preparation.json'
const DEFAULT_OUTPUT_ROOT = 'reports/luke-g2-zero-cost-execution'
const DEFAULT_REPORT = 'reports/luke-g2-zero-cost-comparison.json'

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
    if (a.comparisonSlot !== 'A' || b.comparisonSlot !== 'B') errors.push(`${packet.strong}: comparison slot mismatch`)
    if (a.blindGroupId !== b.blindGroupId) errors.push(`${packet.strong}: blindGroupId mismatch`)
    if (a.model === b.model) errors.push(`${packet.strong}: slot A/B must use different local models`)
    if (a.provenance?.actualExecutionBackend !== 'ollama-local' || b.provenance?.actualExecutionBackend !== 'ollama-local') {
      errors.push(`${packet.strong}: non-local execution backend detected`)
    }
    if (a.provenance?.externalPaidApiUsed !== false || b.provenance?.externalPaidApiUsed !== false) {
      errors.push(`${packet.strong}: external paid API evidence detected`)
    }
    const validationA = validateCandidate(a.payload, envelopeA)
    const validationB = validateCandidate(b.payload, envelopeB)
    if (!validationA.passed) errors.push(`${packet.strong}: slot A invalid: ${validationA.errors.join('; ')}`)
    if (!validationB.passed) errors.push(`${packet.strong}: slot B invalid: ${validationB.errors.join('; ')}`)
    items.push({
      strong: packet.strong,
      candidateA: a.candidateId,
      candidateB: b.candidateId,
      models: [a.model, b.model],
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
    identity: { primaryLemma: 'θεός' }, usage: { tokenCount: 1 },
    sourceEvidence: { englishGlosses: ['God'] }, reuse: {}, routing: {}, theologyAudit: {},
    contexts: [{ contextId: 'ctx-1', tokenId: 'Luke.1.6.7', reference: 'Luke 1:6', target: {}, verse: {}, localWindow: [], morphgntCrossCheck: {} }],
  }
  const payloadFor = (slot) => {
    const envelope = createJobEnvelope(packet, slot)
    return {
      schemaVersion: 1, candidateId: `${envelope.blindGroupId}:slot-${slot.toLowerCase()}`, blindGroupId: envelope.blindGroupId,
      comparisonSlot: slot, model: `ollama-local:model-${slot.toLowerCase()}`, strong: packet.strong,
      sourceFingerprint: envelope.sourceFingerprint, status: 'candidate',
      payload: {
        strong: packet.strong, sourceFingerprint: envelope.sourceFingerprint, transliterationKo: '테오스', primaryGlossKo: '하나님',
        alternateGlossesKo: ['신'], lexicalNotesKo: '',
        contextDecisions: [{ contextId: 'ctx-1', glossKo: '하나님', rationaleKo: '문맥상 유일하신 하나님을 가리킨다.', confidence: 0.98, riskFlags: ['theological-sensitive'] }],
        reviewerFlags: ['THEOLOGY_KEYWORD'],
      },
      provenance: { actualExecutionBackend: 'ollama-local', externalPaidApiUsed: false },
    }
  }
  return { preparation: { packets: [packet] }, candidateBySlot: { A: { G2316: payloadFor('A') }, B: { G2316: payloadFor('B') } } }
}

function runSelfTest() {
  const report = compareLukeG2Candidates(...Object.values(fixture()))
  assert.equal(report.pass, true)
  assert.equal(report.summary.compared, 1)
  assert.equal(report.governance.productionWriteAllowed, false)
  console.log('✓ Luke G2 local result verifier self-test passed')
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
