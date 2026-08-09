#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { GENESIS_G2_CANARY_SPECS, buildCanarySet } from './build-genesis-g2-canary-set.mjs'
import { createJobEnvelope, validateCandidate } from './ai/lexicon/genesis-g2-translation-contract.mjs'

const DEFAULT_SOURCE = 'reports/genesis-g2-bdb-source-packets.json'
const DEFAULT_CANARY = 'reports/genesis-g2-canary-set.json'
const DEFAULT_OUTPUT_ROOT = 'reports/genesis-g2-canary-execution'
const PROVIDERS = ['nvidia', 'openai']
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

function parseArgs(argv) {
  const args = { requireCandidates: [], outputRoot: DEFAULT_OUTPUT_ROOT }
  for (const arg of argv) {
    if (arg.startsWith('--require-candidates=')) {
      args.requireCandidates = arg.slice('--require-candidates='.length).split(',').filter(Boolean)
    } else if (arg.startsWith('--output-root=')) args.outputRoot = arg.slice('--output-root='.length)
    else if (arg === '--self-test') args.selfTest = true
    else throw new Error(`unknown argument: ${arg}`)
  }
  return args
}

function fixtureSourceSet() {
  return {
    packetSetId: 'genesis-g2-calibration-bdb-source-packets-v1',
    contractVersion: 'fixture',
    packets: GENESIS_G2_CANARY_SPECS.map((spec) => ({
      packetId: `genesis-g2-source:${spec.strong}`,
      strong: spec.strong,
      category: 'fixture',
      sourcePacketStatus: 'ready',
      identity: { lemmas: [spec.strong], transliterations: [spec.strong] },
      lexicalMappings: [{ strong: spec.strong, bdbId: `fixture.${spec.strong}` }],
      bdbEntries: [{ id: `fixture.${spec.strong}`, sourceHash: `sha256:${'a'.repeat(64)}` }],
      sourceNodes: Array.from({ length: spec.expectedMinNodes }, (_, index) => ({
        id: `bdb:${spec.strong}:s${index + 1}`,
        parentId: index === 0 ? null : `bdb:${spec.strong}:s1`,
        nodeType: index === 0 ? 'entry' : 'sense',
        label: String(index + 1),
        text: `fixture ${index + 1}`,
        sourceHash: `sha256:${String((index % 9) + 1).repeat(64)}`,
      })),
      source: { sourceId: 'fixture', versionRef: 'fixture', licenseStatus: 'verified-public-or-permitted' },
    })),
  }
}

function selfTest() {
  const built = buildCanarySet(fixtureSourceSet())
  assert.equal(built.counts.selected, 5)
  assert.deepEqual(built.items.map((item) => item.strong), GENESIS_G2_CANARY_SPECS.map((item) => item.strong))
  assert.equal(built.governance.productionWriteAllowed, false)
  console.log('✓ Genesis G2 canary verifier self-test passed')
}

function verifySet(sourceSet, canarySet, errors) {
  const expected = GENESIS_G2_CANARY_SPECS.map((item) => item.strong)
  if (canarySet.canarySetId !== 'genesis-g2-canary-5-v1') errors.push('canarySetId mismatch')
  if (canarySet.sourcePacketSetId !== sourceSet.packetSetId) errors.push('sourcePacketSetId mismatch')
  if (canarySet.counts?.selected !== 5) errors.push(`selected count mismatch: ${canarySet.counts?.selected}`)
  if (canarySet.governance?.explicitManualDispatchRequired !== true) errors.push('manual dispatch gate missing')
  if (canarySet.governance?.productionWriteAllowed !== false) errors.push('production write must be false')
  if (canarySet.governance?.finalApprovalAllowed !== false) errors.push('final approval must be false')
  const actual = canarySet.items?.map((item) => item.strong) || []
  if (JSON.stringify(actual) !== JSON.stringify(expected)) errors.push(`Strong order mismatch: ${actual.join(',')}`)
  const sourceByStrong = new Map(sourceSet.packets.map((packet) => [packet.strong, packet]))
  canarySet.items?.forEach((item, index) => {
    const spec = GENESIS_G2_CANARY_SPECS[index]
    const packet = sourceByStrong.get(item.strong)
    if (!packet) { errors.push(`${item.strong}: source packet missing`); return }
    if (packet.sourcePacketStatus !== 'ready') errors.push(`${item.strong}: source packet not ready`)
    if (item.role !== spec.role) errors.push(`${item.strong}: role mismatch`)
    if (item.sourceNodeCount !== packet.sourceNodes.length) errors.push(`${item.strong}: node count mismatch`)
    if (item.sourceNodeCount < spec.expectedMinNodes) errors.push(`${item.strong}: insufficient source nodes`)
    const envelope = createJobEnvelope(packet, 'nvidia')
    if (item.sourceFingerprint !== envelope.sourceFingerprint) errors.push(`${item.strong}: source fingerprint mismatch`)
  })
}

function verifyCandidates(sourceSet, canarySet, provider, outputRoot, errors) {
  if (!PROVIDERS.includes(provider)) { errors.push(`unsupported candidate provider: ${provider}`); return }
  const sourceByStrong = new Map(sourceSet.packets.map((packet) => [packet.strong, packet]))
  for (const item of canarySet.items) {
    const path = resolve(outputRoot, 'candidates', provider, `${item.strong}.json`)
    if (!existsSync(path)) { errors.push(`${provider}/${item.strong}: candidate missing`); continue }
    const stored = readJson(path)
    const envelope = createJobEnvelope(sourceByStrong.get(item.strong), provider)
    if (stored.provider !== provider) errors.push(`${provider}/${item.strong}: provider mismatch`)
    if (stored.strong !== item.strong) errors.push(`${provider}/${item.strong}: Strong mismatch`)
    if (stored.sourceFingerprint !== item.sourceFingerprint) errors.push(`${provider}/${item.strong}: sourceFingerprint mismatch`)
    if (stored.governance?.blindCandidate !== true) errors.push(`${provider}/${item.strong}: blindCandidate missing`)
    if (stored.governance?.productionWriteAllowed !== false) errors.push(`${provider}/${item.strong}: production write not blocked`)
    if (stored.governance?.finalApprovalAllowed !== false) errors.push(`${provider}/${item.strong}: final approval not blocked`)
    const validation = validateCandidate(stored.payload, envelope)
    if (!validation.passed) errors.push(`${provider}/${item.strong}: ${validation.errors.join('; ')}`)
  }
}

const args = parseArgs(process.argv.slice(2))
selfTest()
if (args.selfTest) process.exit(0)

const sourcePath = resolve(process.env.GENESIS_G2_SOURCE || DEFAULT_SOURCE)
const canaryPath = resolve(process.env.GENESIS_G2_CANARY || DEFAULT_CANARY)
if (!existsSync(sourcePath) || !existsSync(canaryPath)) {
  console.log('✓ Genesis G2 canary reports absent — self-test only')
  process.exit(0)
}
const sourceSet = readJson(sourcePath)
const canarySet = readJson(canaryPath)
const errors = []
verifySet(sourceSet, canarySet, errors)
for (const provider of args.requireCandidates) verifyCandidates(sourceSet, canarySet, provider, resolve(args.outputRoot), errors)

if (errors.length) {
  console.error(`✗ Genesis G2 canary verification failed (${errors.length})`)
  errors.forEach((error) => console.error(`  - ${error}`))
  process.exit(1)
}
console.log(`✓ Genesis G2 canary verified · Strong=${canarySet.items.map((item) => item.strong).join(',')} · candidates=${args.requireCandidates.join(',') || 'not-required'}`)
