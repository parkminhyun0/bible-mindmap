#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildGenesisUsageContextPackets } from './build-genesis-g3-usage-context-packets.mjs'
import { sourceFingerprint } from './ai/lexicon/genesis-g2-translation-contract.mjs'

const DEFAULT_INPUT = '../.oshb-cache/Gen.xml'
const DEFAULT_BATCH = 'reports/genesis-g2-calibration-batch.json'
const DEFAULT_SOURCE = 'reports/genesis-g2-bdb-source-packets.json'
const DEFAULT_PACKETS = 'reports/genesis-g3-usage-context-packets.json'

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
  return value
}

function parseArgs(argv) {
  const args = { input: DEFAULT_INPUT, batch: DEFAULT_BATCH, source: DEFAULT_SOURCE, packets: DEFAULT_PACKETS, strict: false, selfTest: false }
  for (const arg of argv) {
    if (arg === '--strict') args.strict = true
    else if (arg === '--self-test') args.selfTest = true
    else if (arg.startsWith('--input=')) args.input = arg.slice(8)
    else if (arg.startsWith('--batch=')) args.batch = arg.slice(8)
    else if (arg.startsWith('--source=')) args.source = arg.slice(9)
    else if (arg.startsWith('--packets=')) args.packets = arg.slice(10)
    else throw new Error(`unknown argument: ${arg}`)
  }
  return args
}

function sumRows(rows = []) {
  return rows.reduce((sum, row) => sum + Number(row.count || 0), 0)
}

function forbiddenKeys(value, path = '$', errors = []) {
  if (Array.isArray(value)) value.forEach((item, index) => forbiddenKeys(item, `${path}[${index}]`, errors))
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (['textKo', 'glossKo', 'drafts', 'adjudication', 'theologyAudit'].includes(key)) errors.push(`${path}.${key}: translation field not allowed in context packet`)
      forbiddenKeys(child, `${path}.${key}`, errors)
    }
  }
  return errors
}

export function validateGenesisUsageContextPackets({ xml, batch, sourceSet, packets }) {
  const errors = []
  const warnings = []
  if (packets?.schemaVersion !== 1) errors.push('schemaVersion must be 1')
  if (packets?.packetSetId !== 'genesis-g3-usage-context-100-v1') errors.push('packetSetId mismatch')
  if (packets?.batchId !== batch?.batchId) errors.push('batchId mismatch')
  if (packets?.sourcePacketSetId !== sourceSet?.packetSetId) errors.push('sourcePacketSetId mismatch')
  if (!Number.isInteger(packets?.source?.windowRadius) || packets.source.windowRadius < 1) errors.push('source.windowRadius invalid')
  if (!Number.isInteger(packets?.source?.sampleLimit) || packets.source.sampleLimit < 1) errors.push('source.sampleLimit invalid')
  if (packets?.governance?.contextEvidenceOnly !== true) errors.push('contextEvidenceOnly=true required')
  if (packets?.governance?.translationStarted !== false) errors.push('translationStarted=false required')
  if (packets?.governance?.productionWriteAllowed !== false) errors.push('productionWriteAllowed=false required')
  if (packets?.governance?.finalApprovalAllowed !== false) errors.push('finalApprovalAllowed=false required')
  forbiddenKeys(packets, '$', errors)

  if (!Array.isArray(packets?.packets)) return { errors: [...errors, 'packets array missing'], warnings }
  if (packets.packets.length !== batch.items.length) errors.push(`packet count mismatch: ${packets.packets.length}/${batch.items.length}`)
  const batchByStrong = new Map(batch.items.map((item) => [item.strong, item]))
  const sourceByStrong = new Map(sourceSet.packets.map((packet) => [packet.strong, packet]))
  const seenStrong = new Set()
  let ready = 0
  let blocked = 0
  let occurrences = 0
  let sampledContexts = 0

  for (const [index, packet] of packets.packets.entries()) {
    const where = `packets[${index}]`
    const batchItem = batchByStrong.get(packet.strong)
    const sourcePacket = sourceByStrong.get(packet.strong)
    if (!batchItem) errors.push(`${where}: Strong not in calibration batch`)
    if (!sourcePacket) errors.push(`${where}: BDB source packet missing`)
    if (seenStrong.has(packet.strong)) errors.push(`${where}: duplicate Strong ${packet.strong}`)
    seenStrong.add(packet.strong)
    if (packet.usagePacketId !== `genesis-g3-usage:${packet.strong}`) errors.push(`${where}: usagePacketId mismatch`)
    if (packet.category !== batchItem?.category) errors.push(`${where}: category mismatch`)
    if (packet.expectedOccurrences !== batchItem?.occurrences) errors.push(`${where}: expectedOccurrences mismatch`)
    if (packet.totalOccurrences !== packet.occurrences?.length) errors.push(`${where}: totalOccurrences mismatch`)
    if (packet.totalOccurrences !== batchItem?.occurrences) errors.push(`${where}: occurrence count ${packet.totalOccurrences}/${batchItem?.occurrences}`)
    if (packet.usagePacketStatus === 'ready') ready += 1
    else if (packet.usagePacketStatus === 'blocked') blocked += 1
    else errors.push(`${where}: invalid usagePacketStatus`)
    if (sourcePacket && packet.lexicalSource?.sourceFingerprint !== sourceFingerprint(sourcePacket)) errors.push(`${where}: sourceFingerprint mismatch`)
    if (packet.lexicalSource?.packetId !== sourcePacket?.packetId) errors.push(`${where}: source packet id mismatch`)
    if (packet.governance?.contextEvidenceOnly !== true) errors.push(`${where}: contextEvidenceOnly missing`)
    if (packet.governance?.translationCandidateIncluded !== false) errors.push(`${where}: translationCandidateIncluded must be false`)
    if (packet.governance?.productionWriteAllowed !== false) errors.push(`${where}: production write not blocked`)

    const occurrenceIds = new Set()
    for (const [occurrenceIndex, occurrence] of (packet.occurrences || []).entries()) {
      const occurrenceWhere = `${where}.occurrences[${occurrenceIndex}]`
      if (occurrenceIds.has(occurrence.occurrenceId)) errors.push(`${occurrenceWhere}: duplicate occurrenceId`)
      occurrenceIds.add(occurrence.occurrenceId)
      if (!/^Gen\.\d+\.\d+$/.test(occurrence.reference || '')) errors.push(`${occurrenceWhere}: reference invalid`)
      if (!occurrence.strongIds?.includes(packet.strong)) errors.push(`${occurrenceWhere}: target Strong missing from token`)
      if (!occurrence.tokenId || !occurrence.surface) errors.push(`${occurrenceWhere}: token identity missing`)
      const focus = (occurrence.contextTokens || []).filter((token) => token.focus)
      if (focus.length !== 1) errors.push(`${occurrenceWhere}: context must contain exactly one focus token`)
      else if (focus[0].tokenId !== occurrence.tokenId) errors.push(`${occurrenceWhere}: focus token mismatch`)
      if ((occurrence.contextTokens || []).length > packets.source.windowRadius * 2 + 1) errors.push(`${occurrenceWhere}: context window too large`)
    }
    const sampleIds = packet.sampleContextIds || []
    if (sampleIds.length !== packet.sampleContexts?.length) errors.push(`${where}: sample id/context count mismatch`)
    if (sampleIds.length > packets.source.sampleLimit) errors.push(`${where}: sample limit exceeded`)
    if (new Set(sampleIds).size !== sampleIds.length) errors.push(`${where}: duplicate sample ids`)
    for (const id of sampleIds) if (!occurrenceIds.has(id)) errors.push(`${where}: sample occurrence not found ${id}`)
    if (sumRows(packet.distribution?.byChapter) !== packet.totalOccurrences) errors.push(`${where}: chapter distribution sum mismatch`)
    if (sumRows(packet.distribution?.surfaceForms) !== packet.totalOccurrences) errors.push(`${where}: surface distribution sum mismatch`)
    if (sumRows(packet.distribution?.lemmaForms) !== packet.totalOccurrences) errors.push(`${where}: lemma distribution sum mismatch`)
    if (sumRows(packet.distribution?.morphCodes) !== packet.totalOccurrences) errors.push(`${where}: morph distribution sum mismatch`)
    const chapterSet = [...new Set((packet.occurrences || []).map((item) => item.chapter))].sort((a, b) => a - b)
    if (JSON.stringify(chapterSet) !== JSON.stringify(packet.chapters)) errors.push(`${where}: chapters mismatch`)
    occurrences += packet.totalOccurrences || 0
    sampledContexts += packet.sampleContexts?.length || 0
  }

  const expectedCounts = { requested: packets.packets.length, ready, blocked, occurrences, sampledContexts }
  for (const [key, value] of Object.entries(expectedCounts)) if (packets.counts?.[key] !== value) errors.push(`counts.${key}: ${packets.counts?.[key]} != ${value}`)
  if (packets.counts?.chapters !== new Set(packets.packets.flatMap((packet) => packet.chapters)).size) errors.push('counts.chapters mismatch')

  const expected = buildGenesisUsageContextPackets({
    xml,
    batch,
    sourceSet,
    windowRadius: packets.source.windowRadius,
    sampleLimit: packets.source.sampleLimit,
  })
  if (JSON.stringify(stable(expected)) !== JSON.stringify(stable(packets))) errors.push('deterministic rebuild mismatch')
  if (blocked) warnings.push(`${blocked} usage packets blocked`)
  return { errors, warnings }
}

function fixture() {
  const xml = `<osis><chapter osisID="Gen.1"><verse osisID="Gen.1.1"><w lemma="0430" morph="HN" id="w1">אֱלֹהִים</w><w lemma="0776" morph="HN" id="w2">אֶרֶץ</w></verse><verse osisID="Gen.1.2"><w lemma="0430" morph="HN" id="w3">אֱלֹהִים</w><w lemma="0776" morph="HN" id="w4">הָאָרֶץ</w></verse></chapter></osis>`
  const sourcePacket = (strong) => ({ packetId: `genesis-g2-source:${strong}`, strong, sourcePacketStatus: 'ready', identity: { lemmas: [strong], transliterations: [strong], partOfSpeechCodes: ['N'], partOfSpeechLabels: ['Noun'] }, lexicalMappings: [], bdbEntries: [], sourceNodes: [{ id: `${strong}:n`, parentId: null, nodeType: 'entry', label: 'entry', text: strong, sourceHash: `sha256:${'a'.repeat(64)}` }], source: { sourceId: 'fixture', versionRef: 'fixture' } })
  const batch = { batchId: 'genesis-g2-calibration-100-v1', items: [{ strong: 'H430', category: 'core', occurrences: 2 }, { strong: 'H776', category: 'core', occurrences: 2 }] }
  const sourceSet = { packetSetId: 'genesis-g2-calibration-bdb-source-packets-v1', packets: [sourcePacket('H430'), sourcePacket('H776')] }
  const packets = buildGenesisUsageContextPackets({ xml, batch, sourceSet })
  return { xml, batch, sourceSet, packets }
}

function runSelfTest() {
  const input = fixture()
  const valid = validateGenesisUsageContextPackets(input)
  assert.deepEqual(valid.errors, [])
  const invalid = structuredClone(input.packets)
  invalid.packets[0].governance.productionWriteAllowed = true
  assert(validateGenesisUsageContextPackets({ ...input, packets: invalid }).errors.length > 0)
  console.log('✓ Genesis G3 usage context packet verifier self-test passed')
}

function main(args) {
  if (args.selfTest) return runSelfTest()
  const input = {
    xml: readFileSync(resolve(args.input), 'utf8'),
    batch: JSON.parse(readFileSync(resolve(args.batch), 'utf8')),
    sourceSet: JSON.parse(readFileSync(resolve(args.source), 'utf8')),
    packets: JSON.parse(readFileSync(resolve(args.packets), 'utf8')),
  }
  const { errors, warnings } = validateGenesisUsageContextPackets(input)
  console.log(`Genesis G3 usage context verification · ready=${input.packets.counts?.ready}/${input.packets.counts?.requested} · occurrences=${input.packets.counts?.occurrences}`)
  for (const warning of warnings) console.log(`  - warning: ${warning}`)
  if (args.strict && input.batch.items.length !== 100) errors.push(`strict calibration batch must contain 100 items: ${input.batch.items.length}`)
  if (args.strict && input.packets.counts?.ready !== 100) errors.push(`strict usage packets must be 100/100 ready: ${input.packets.counts?.ready}`)
  if (errors.length) {
    console.error(`✗ Genesis G3 usage context verification failed (${errors.length})`)
    errors.slice(0, 100).forEach((error) => console.error(`  - ${error}`))
    process.exitCode = 2
  } else console.log('✓ Genesis G3 usage context verification passed')
}

main(parseArgs(process.argv.slice(2)))
