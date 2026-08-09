#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  createJobEnvelope,
  createStoredCandidate,
} from './genesis-g2-translation-contract.mjs'

export const ZERO_COST_MANUAL_IMPORT_VERSION = '2026.08.09-zc.manual.1'
const DEFAULT_SOURCE = 'reports/genesis-g2-bdb-source-packets.json'
const DEFAULT_CANARY = 'reports/genesis-g2-canary-set.json'
const DEFAULT_TEMPLATE_ROOT = 'reports/genesis-g2-zero-cost-bundle/templates'
const DEFAULT_OUTPUT_ROOT = 'reports/genesis-g2-zero-cost-execution'

const SLOT_CONFIG = Object.freeze({
  a: Object.freeze({ slot: 'A', directory: 'slot-a', compatibilityProvider: 'nvidia' }),
  b: Object.freeze({ slot: 'B', directory: 'slot-b', compatibilityProvider: 'openai' }),
})

function parseArgs(argv) {
  const args = {
    slot: null,
    execute: false,
    selfTest: false,
    source: DEFAULT_SOURCE,
    canary: DEFAULT_CANARY,
    templateRoot: DEFAULT_TEMPLATE_ROOT,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    translatorId: 'manual-reviewer',
  }
  for (const arg of argv) {
    if (arg === '--execute') args.execute = true
    else if (arg === '--self-test') args.selfTest = true
    else if (arg.startsWith('--slot=')) args.slot = arg.slice('--slot='.length).toLowerCase()
    else if (arg.startsWith('--source=')) args.source = arg.slice('--source='.length)
    else if (arg.startsWith('--canary=')) args.canary = arg.slice('--canary='.length)
    else if (arg.startsWith('--template-root=')) args.templateRoot = arg.slice('--template-root='.length)
    else if (arg.startsWith('--output-root=')) args.outputRoot = arg.slice('--output-root='.length)
    else if (arg.startsWith('--translator-id=')) args.translatorId = arg.slice('--translator-id='.length)
    else throw new Error(`unknown argument: ${arg}`)
  }
  return args
}

const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'))

function writeJsonAtomic(path, value) {
  const output = resolve(path)
  mkdirSync(dirname(output), { recursive: true })
  const temp = `${output}.tmp-${process.pid}`
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  renameSync(temp, output)
}

function validateArgs(args) {
  if (args.selfTest) return
  if (!SLOT_CONFIG[args.slot]) throw new Error('--slot=a|b is required')
  if (!args.translatorId?.trim()) throw new Error('--translator-id must not be empty')
  if (/[/\\\s]/.test(args.translatorId)) throw new Error('--translator-id must be a compact non-secret identifier')
}

function selectedPackets(sourceSet, canarySet) {
  const allowed = new Set((canarySet.items || []).map((item) => item.strong))
  const packets = (sourceSet.packets || []).filter((packet) => allowed.has(packet.strong) && packet.sourcePacketStatus === 'ready')
  if (!packets.length) throw new Error('no ready canary source packets found')
  if (packets.length !== allowed.size) throw new Error(`ready source packet count mismatch: ${packets.length}/${allowed.size}`)
  return packets
}

function templatePath(root, config, strong) {
  return resolve(root, config.directory, `${strong}.json`)
}

function toCandidate(template, envelope) {
  return {
    strong: envelope.strong,
    sourceFingerprint: envelope.sourceFingerprint,
    transliterationKo: String(template.transliterationKo || '').trim(),
    primaryGlossKo: String(template.primaryGlossKo || '').trim(),
    notesKo: typeof template.notesKo === 'string' ? template.notesKo : '',
    nodes: Array.isArray(template.nodes) ? template.nodes.map((node) => ({
      sourceNodeId: node.sourceNodeId,
      textKo: String(node.textKo || '').trim(),
      confidence: node.confidence,
      riskFlags: Array.isArray(node.riskFlags) ? node.riskFlags : [],
    })) : [],
  }
}

function validateTemplateEnvelope(template, envelope, config) {
  const errors = []
  if (template.strong !== envelope.strong) errors.push(`strong mismatch: ${template.strong}`)
  if (template.sourceFingerprint !== envelope.sourceFingerprint) errors.push('sourceFingerprint mismatch')
  if (template.slot !== config.slot) errors.push(`slot mismatch: ${template.slot}`)
  if (template.compatibilityProvider !== config.compatibilityProvider) errors.push(`compatibilityProvider mismatch: ${template.compatibilityProvider}`)
  if (template.governance?.externalPaidApiAllowed !== false) errors.push('externalPaidApiAllowed must remain false')
  if (template.governance?.cloudModelAllowed !== false) errors.push('cloudModelAllowed must remain false')
  if (template.governance?.productionWriteAllowed !== false) errors.push('productionWriteAllowed must remain false')
  if (template.governance?.finalApprovalAllowed !== false) errors.push('finalApprovalAllowed must remain false')
  return errors
}

export function importManualCandidates(args) {
  validateArgs(args)
  const config = SLOT_CONFIG[args.slot]
  const sourceSet = readJson(args.source)
  const canarySet = readJson(args.canary)
  const packets = selectedPackets(sourceSet, canarySet)
  const summary = {
    schemaVersion: 1,
    importerVersion: ZERO_COST_MANUAL_IMPORT_VERSION,
    mode: args.execute ? 'manual-import' : 'validation-only',
    slot: config.slot,
    compatibilityProvider: config.compatibilityProvider,
    actualExecutionBackend: 'manual-human',
    translatorId: args.translatorId,
    requested: packets.length,
    validated: 0,
    written: 0,
    skippedExisting: 0,
    failed: 0,
    monetaryCostExpected: false,
    externalPaidApiUsed: false,
    cloudModelUsed: false,
    apiKeyUsed: false,
    productionWriteAllowed: false,
    finalApprovalAllowed: false,
    errors: [],
  }

  for (const packet of packets) {
    const envelope = createJobEnvelope(packet, config.compatibilityProvider)
    const path = templatePath(args.templateRoot, config, packet.strong)
    if (!existsSync(path)) {
      summary.failed += 1
      summary.errors.push({ strong: packet.strong, message: `manual template missing: ${path}` })
      continue
    }

    try {
      const template = readJson(path)
      const boundaryErrors = validateTemplateEnvelope(template, envelope, config)
      if (boundaryErrors.length) throw new Error(boundaryErrors.join('; '))
      const candidate = toCandidate(template, envelope)
      const generatedAt = new Date().toISOString()
      const stored = createStoredCandidate({
        envelope,
        providerResult: {
          model: `manual-human:${args.translatorId}`,
          requestId: null,
          usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
        },
        candidate,
        attempt: 1,
        generatedAt,
      })
      stored.provenance = {
        comparisonSlot: config.slot,
        compatibilityProvider: config.compatibilityProvider,
        actualExecutionBackend: 'manual-human',
        translatorId: args.translatorId,
        externalPaidApiUsed: false,
        cloudModelUsed: false,
        monetaryCostExpected: false,
        apiKeyUsed: false,
      }
      summary.validated += 1
      if (!args.execute) continue

      const outputPath = resolve(args.outputRoot, 'candidates', config.compatibilityProvider, `${packet.strong}.json`)
      if (existsSync(outputPath)) {
        const existing = readJson(outputPath)
        if (existing.sourceFingerprint === envelope.sourceFingerprint && existing.status === 'candidate') {
          summary.skippedExisting += 1
          continue
        }
      }
      writeJsonAtomic(outputPath, stored)
      summary.written += 1
    } catch (error) {
      summary.failed += 1
      summary.errors.push({ strong: packet.strong, message: String(error?.message || error) })
    }
  }

  writeJsonAtomic(resolve(args.outputRoot, 'summaries', `manual-slot-${args.slot}-${summary.mode}.json`), summary)
  return summary
}

function fixturePacket() {
  return {
    packetId: 'fixture:H776',
    strong: 'H776',
    sourcePacketStatus: 'ready',
    identity: { lemmas: ['אֶרֶץ'], transliterations: ['erets'] },
    lexicalMappings: [],
    bdbEntries: [],
    sourceNodes: [
      { id: 'node-1', parentId: null, nodeType: 'entry', label: 'land', text: 'land', sourceHash: `sha256:${'a'.repeat(64)}` },
      { id: 'node-2', parentId: 'node-1', nodeType: 'sense', label: 'earth', text: 'earth', sourceHash: `sha256:${'b'.repeat(64)}` },
    ],
    source: { repository: 'fixture', revision: 'fixture' },
  }
}

function completedTemplate(packet, config) {
  const envelope = createJobEnvelope(packet, config.compatibilityProvider)
  return {
    schemaVersion: 1,
    slot: config.slot,
    compatibilityProvider: config.compatibilityProvider,
    strong: packet.strong,
    sourceFingerprint: envelope.sourceFingerprint,
    transliterationKo: '에레츠',
    primaryGlossKo: '땅, 지역',
    notesKo: '수동 검토 예시',
    nodes: envelope.source.nodes.map((node) => ({
      sourceNodeId: node.sourceNodeId,
      sourceText: node.sourceText,
      textKo: node.sourceNodeId === 'node-1' ? '땅' : '대지',
      confidence: 0.9,
      riskFlags: ['polysemy'],
    })),
    governance: {
      externalPaidApiAllowed: false,
      cloudModelAllowed: false,
      localExecutionOnly: true,
      humanReviewRequired: true,
      productionWriteAllowed: false,
      finalApprovalAllowed: false,
    },
  }
}

function runSelfTest() {
  const root = resolve(tmpdir(), `genesis-g2-manual-import-${process.pid}`)
  const packet = fixturePacket()
  const source = resolve(root, 'source.json')
  const canary = resolve(root, 'canary.json')
  const templates = resolve(root, 'templates')
  const output = resolve(root, 'execution')
  mkdirSync(root, { recursive: true })
  writeJsonAtomic(source, { packets: [packet] })
  writeJsonAtomic(canary, { items: [{ strong: 'H776' }] })
  for (const config of Object.values(SLOT_CONFIG)) {
    writeJsonAtomic(templatePath(templates, config, packet.strong), completedTemplate(packet, config))
  }

  const summaryA = importManualCandidates({
    slot: 'a', execute: true, selfTest: false,
    source, canary, templateRoot: templates, outputRoot: output, translatorId: 'fixture-a',
  })
  const summaryB = importManualCandidates({
    slot: 'b', execute: true, selfTest: false,
    source, canary, templateRoot: templates, outputRoot: output, translatorId: 'fixture-b',
  })
  assert.equal(summaryA.written, 1)
  assert.equal(summaryB.written, 1)
  const storedA = readJson(resolve(output, 'candidates', 'nvidia', 'H776.json'))
  const storedB = readJson(resolve(output, 'candidates', 'openai', 'H776.json'))
  assert.equal(storedA.provenance.actualExecutionBackend, 'manual-human')
  assert.equal(storedB.governance.productionWriteAllowed, false)
  rmSync(root, { recursive: true, force: true })
  console.log('✓ Genesis G2 zero-cost manual candidate importer self-test 통과')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) return runSelfTest()
  const summary = importManualCandidates(args)
  console.log(`✓ Genesis G2 manual slot ${summary.slot} · mode=${summary.mode} · validated=${summary.validated} · written=${summary.written} · failed=${summary.failed}`)
  if (summary.failed > 0) process.exitCode = 2
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()
