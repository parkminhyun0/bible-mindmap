#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createJobEnvelope, validateCandidate } from './ai/lexicon/genesis-g2-translation-contract.mjs'

const PROVIDERS = ['nvidia', 'openai']
const DEFAULT_SOURCE = 'reports/genesis-g2-bdb-source-packets.json'
const DEFAULT_ROOT = 'reports/genesis-g2-calibration-execution'

function parseArgs(argv) {
  const args = { source: DEFAULT_SOURCE, root: DEFAULT_ROOT, strict: false, selfTest: false }
  for (const arg of argv) {
    if (arg === '--strict') args.strict = true
    else if (arg === '--self-test') args.selfTest = true
    else if (arg.startsWith('--source=')) args.source = arg.slice('--source='.length)
    else if (arg.startsWith('--output-root=')) args.root = arg.slice('--output-root='.length)
    else throw new Error(`unknown argument: ${arg}`)
  }
  return args
}

const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'))
const candidatePath = (root, provider, strong) => resolve(root, 'candidates', provider, `${strong}.json`)

function validateStored(stored, packet, provider) {
  const errors = []
  const envelope = createJobEnvelope(packet, provider)
  if (stored?.provider !== provider) errors.push('provider mismatch')
  if (stored?.status !== 'candidate') errors.push('status must be candidate')
  if (stored?.strong !== packet.strong) errors.push('Strong mismatch')
  if (stored?.sourceFingerprint !== envelope.sourceFingerprint) errors.push('sourceFingerprint mismatch')
  if (stored?.blindGroupId !== envelope.blindGroupId) errors.push('blindGroupId mismatch')
  if (stored?.governance?.blindCandidate !== true) errors.push('blindCandidate governance missing')
  if (stored?.governance?.otherProviderOutputIncluded !== false) errors.push('cross-provider boundary violated')
  if (stored?.governance?.productionWriteAllowed !== false) errors.push('productionWriteAllowed must be false')
  if (stored?.governance?.finalApprovalAllowed !== false) errors.push('finalApprovalAllowed must be false')
  errors.push(...validateCandidate(stored?.payload, envelope).errors)
  return errors
}

export function verifyCalibrationCandidates({ sourceSet, root, exists = existsSync, read = readJson }) {
  const ready = sourceSet.packets.filter((packet) => packet.sourcePacketStatus === 'ready')
  const errors = []
  let candidates = 0
  for (const packet of ready) {
    for (const provider of PROVIDERS) {
      const path = candidatePath(root, provider, packet.strong)
      if (!exists(path)) {
        errors.push(`${packet.strong}:${provider} candidate missing`)
        continue
      }
      const providerErrors = validateStored(read(path), packet, provider)
      errors.push(...providerErrors.map((error) => `${packet.strong}:${provider} ${error}`))
      if (!providerErrors.length) candidates += 1
    }
  }
  return {
    schemaVersion: 1,
    expectedPackets: ready.length,
    expectedCandidates: ready.length * PROVIDERS.length,
    validCandidates: candidates,
    passed: ready.length === 100 && candidates === ready.length * PROVIDERS.length && errors.length === 0,
    errors,
    governance: { serviceWriteAllowed: false, finalApprovalAllowed: false },
  }
}

function selfTest() {
  const packet = {
    packetId: 'fixture:H776', strong: 'H776', sourcePacketStatus: 'ready',
    identity: {}, lexicalMappings: [], bdbEntries: [], source: {},
    sourceNodes: [{ id: 'n1', parentId: null, nodeType: 'entry', label: 'land', text: 'land', sourceHash: `sha256:${'a'.repeat(64)}` }],
  }
  const sourceSet = { packets: Array.from({ length: 100 }, (_, index) => ({ ...packet, packetId: `fixture:H${index + 1}`, strong: `H${index + 1}` })) }
  const store = new Map()
  for (const item of sourceSet.packets) {
    for (const provider of PROVIDERS) {
      const envelope = createJobEnvelope(item, provider)
      store.set(candidatePath('/fixture', provider, item.strong), {
        provider, status: 'candidate', strong: item.strong, sourceFingerprint: envelope.sourceFingerprint, blindGroupId: envelope.blindGroupId,
        payload: { strong: item.strong, sourceFingerprint: envelope.sourceFingerprint, transliterationKo: '음역', primaryGlossKo: '뜻', notesKo: '', nodes: [{ sourceNodeId: 'n1', textKo: '뜻', confidence: 0.9, riskFlags: [] }] },
        governance: { blindCandidate: true, otherProviderOutputIncluded: false, productionWriteAllowed: false, finalApprovalAllowed: false },
      })
    }
  }
  const report = verifyCalibrationCandidates({ sourceSet, root: '/fixture', exists: (path) => store.has(path), read: (path) => store.get(path) })
  if (!report.passed) throw new Error(`calibration candidate verifier self-test failed: ${report.errors.slice(0, 3).join('; ')}`)
  console.log('✓ Genesis G2 calibration candidate verifier self-test 통과')
}

const args = parseArgs(process.argv.slice(2))
if (args.selfTest) {
  selfTest()
  process.exit(0)
}
const report = verifyCalibrationCandidates({ sourceSet: readJson(args.source), root: resolve(args.root) })
console.log(`${report.passed ? '✓' : '✗'} Genesis G2 calibration candidates · ${report.validCandidates}/${report.expectedCandidates} · errors=${report.errors.length}`)
if (args.strict && !report.passed) process.exitCode = 2
