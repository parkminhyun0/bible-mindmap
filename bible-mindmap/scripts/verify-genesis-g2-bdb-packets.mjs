#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { materializeGenesisBdbPackets } from './materialize-genesis-g2-bdb-packets.mjs'
import { normalizeRegistry } from './lib/source-registry-adapter.mjs'

const DEFAULT_BATCH_PATH = 'reports/genesis-g2-calibration-batch.json'
const DEFAULT_REGISTRY_PATH = 'data/lexicon/source-registry.json'
const DEFAULT_CACHE_DIR = '.cache/openscriptures-hebrewlexicon'
const DEFAULT_PACKETS_PATH = 'reports/genesis-g2-bdb-source-packets.json'
const PRIMARY_SOURCE_ID = 'openscriptures-hebrewlexicon-bdb'
const REQUIRED_FILES = ['LexicalIndex.xml', 'BrownDriverBriggs.xml', 'BDBPartsOfSpeech.xml']

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
  }
  return value
}

function parseArgs(argv) {
  const args = {
    batch: DEFAULT_BATCH_PATH,
    registry: DEFAULT_REGISTRY_PATH,
    cacheDir: DEFAULT_CACHE_DIR,
    packets: DEFAULT_PACKETS_PATH,
    strict: false,
    selfTest: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--strict') args.strict = true
    else if (arg === '--self-test') args.selfTest = true
    else if (arg === '--batch') args.batch = argv[++index]
    else if (arg.startsWith('--batch=')) args.batch = arg.slice(8)
    else if (arg === '--registry') args.registry = argv[++index]
    else if (arg.startsWith('--registry=')) args.registry = arg.slice(11)
    else if (arg === '--cache-dir') args.cacheDir = argv[++index]
    else if (arg.startsWith('--cache-dir=')) args.cacheDir = arg.slice(12)
    else if (arg === '--packets') args.packets = argv[++index]
    else if (arg.startsWith('--packets=')) args.packets = arg.slice(10)
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return args
}

export function validateGenesisBdbPackets({ batch, registry, packets, lexicalXml, bdbXml, posXml }) {
  const errors = []
  const warnings = []
  const primary = registry?.sources?.find((source) => source.id === PRIMARY_SOURCE_ID)

  if (!primary) errors.push('Open Scriptures BDB primary source registry 누락')
  else {
    if (primary.licenseStatus !== 'verified-public-or-permitted') errors.push('BDB primary source license Gate 미통과')
    if (!/^[a-f0-9]{40}$/.test(primary.versionRef || '')) errors.push('BDB primary source versionRef는 40자 commit SHA여야 함')
    if (primary.repository !== 'openscriptures/HebrewLexicon') errors.push('BDB primary source repository 불일치')
  }

  if (packets?.schemaVersion !== 1) errors.push('packet set schemaVersion=1 필요')
  if (packets?.packetSetId !== 'genesis-g2-calibration-bdb-source-packets-v1') errors.push('packetSetId 불일치')
  if (packets?.batchId !== batch?.batchId) errors.push('batchId 불일치')
  if (packets?.contractVersion !== batch?.contractVersion) errors.push('contractVersion 불일치')
  if (packets?.sourcePolicyVersion !== batch?.sourcePolicyVersion) errors.push('sourcePolicyVersion 불일치')
  if (packets?.source?.id !== PRIMARY_SOURCE_ID) errors.push('packet source id 불일치')
  if (packets?.source?.versionRef !== primary?.versionRef) errors.push('packet source versionRef 불일치')

  const governance = packets?.governance
  if (governance?.theologicalFramework !== 'reformed-westminster-primary') errors.push('개혁주의 신학 기준 누락')
  if (governance?.sourceOnly !== true) errors.push('sourceOnly=true 필요')
  if (governance?.translationStarted !== false) errors.push('source packet 단계에서 translationStarted=false 필요')
  if (governance?.productionWriteAllowed !== false) errors.push('source packet 단계에서 productionWriteAllowed=false 필요')
  if (governance?.sourceNodeMutationAllowed !== false) errors.push('sourceNodeMutationAllowed=false 필요')

  const digestByFile = new Map((packets?.source?.files || []).map((file) => [file.filename, file.digest]))
  for (const filename of REQUIRED_FILES) {
    if (!/^sha256:[a-f0-9]{64}$/.test(digestByFile.get(filename) || '')) errors.push(`${filename} digest 누락 또는 형식 오류`)
  }

  if (!Array.isArray(packets?.packets)) {
    errors.push('packets 배열 누락')
    return { errors, warnings }
  }
  if (packets.packets.length !== batch.items.length) errors.push('packet 수와 batch item 수 불일치')

  const batchByStrong = new Map(batch.items.map((item) => [item.strong, item]))
  const seenStrong = new Set()
  let ready = 0
  let blocked = 0
  let lexicalMappings = 0
  let bdbEntries = 0
  let sourceNodes = 0

  for (const [index, packet] of packets.packets.entries()) {
    const where = `packets[${index}]`
    const batchItem = batchByStrong.get(packet.strong)
    if (!batchItem) errors.push(`${where}: batch에 없는 Strong ${packet.strong}`)
    if (seenStrong.has(packet.strong)) errors.push(`${where}: 중복 Strong ${packet.strong}`)
    seenStrong.add(packet.strong)
    if (packet.packetId !== `genesis-g2-source:${packet.strong}`) errors.push(`${where}: packetId 불일치`)
    if (packet.category !== batchItem?.category) errors.push(`${where}: category 불일치`)
    if (packet.targetPayloadPath !== batchItem?.payloadPath) errors.push(`${where}: targetPayloadPath 불일치`)

    if (packet.sourcePacketStatus === 'ready') ready += 1
    else if (packet.sourcePacketStatus === 'blocked') blocked += 1
    else errors.push(`${where}: sourcePacketStatus 오류`)

    if (!Array.isArray(packet.lexicalMappings) || packet.lexicalMappings.length < 1) {
      errors.push(`${where}: LexicalIndex mapping 누락`)
    } else {
      lexicalMappings += packet.lexicalMappings.length
      for (const mapping of packet.lexicalMappings) {
        if (mapping.strong !== packet.strong) errors.push(`${where}: mapping Strong 불일치`)
        if (!mapping.bdbId) errors.push(`${where}: mapping bdbId 누락`)
        if (!mapping.lexicalId) errors.push(`${where}: mapping lexicalId 누락`)
      }
    }

    if (!Array.isArray(packet.bdbEntries) || packet.bdbEntries.length < 1) {
      errors.push(`${where}: BDB entry 누락`)
    } else {
      bdbEntries += packet.bdbEntries.length
      for (const entry of packet.bdbEntries) {
        if (!entry.id) errors.push(`${where}: BDB entry id 누락`)
        if (!/^sha256:[a-f0-9]{64}$/.test(entry.sourceHash || '')) errors.push(`${where}: BDB entry sourceHash 오류`)
        if (!Number.isInteger(entry.rawLength) || entry.rawLength < 1) errors.push(`${where}: BDB entry rawLength 오류`)
      }
    }

    if (!Array.isArray(packet.sourceNodes) || packet.sourceNodes.length < 1) {
      errors.push(`${where}: sourceNodes 누락`)
    } else {
      sourceNodes += packet.sourceNodes.length
      const nodeIds = new Set(packet.sourceNodes.map((node) => node.id))
      for (const node of packet.sourceNodes) {
        if (!node.id || !node.text) errors.push(`${where}: source node id/text 누락`)
        if (!['entry', 'sense'].includes(node.nodeType)) errors.push(`${where}: source node type 오류`)
        if (!/^sha256:[a-f0-9]{64}$/.test(node.sourceHash || '')) errors.push(`${where}: source node hash 오류`)
        if (node.parentId && !nodeIds.has(node.parentId)) errors.push(`${where}: 존재하지 않는 parentId ${node.parentId}`)
      }
      if (!packet.sourceNodes.some((node) => node.parentId === null && node.nodeType === 'entry')) {
        errors.push(`${where}: root entry node 누락`)
      }
    }

    if (packet.sourceCoverage?.missingBdbIds?.length) errors.push(`${where}: materialize되지 않은 BDB id 존재`)
    if (packet.sourceCoverage?.materializedBdbEntries !== packet.bdbEntries?.length) errors.push(`${where}: BDB coverage count 불일치`)
    if (packet.sourceCoverage?.sourceNodes !== packet.sourceNodes?.length) errors.push(`${where}: source node coverage count 불일치`)
    if (packet.identity?.lemmas?.length < 1) warnings.push(`${where}: lemma 없음`)

    if (packet.source?.versionRef !== primary?.versionRef) errors.push(`${where}: packet source versionRef 불일치`)
    if (packet.modelBoundary?.translationStatus !== 'not-started') errors.push(`${where}: translationStatus는 not-started여야 함`)
    if (packet.modelBoundary?.nvidiaOutputVisibleToGptBeforeComparison !== false) errors.push(`${where}: NVIDIA 결과 사전 공개 금지`)
    if (packet.modelBoundary?.gptOutputVisibleToNvidiaBeforeComparison !== false) errors.push(`${where}: GPT 결과 사전 공개 금지`)
    if (packet.modelBoundary?.productionWriteAllowed !== false) errors.push(`${where}: production write 차단 필요`)
  }

  const expectedCounts = { requested: packets.packets.length, ready, blocked, lexicalMappings, bdbEntries, sourceNodes }
  for (const [key, value] of Object.entries(expectedCounts)) {
    if (packets.counts?.[key] !== value) errors.push(`counts.${key}: ${packets.counts?.[key]} != ${value}`)
  }
  if (ready !== batch.items.length || blocked !== 0) errors.push(`100개 source packet 전수 ready 필요: ready=${ready}, blocked=${blocked}`)

  const expected = materializeGenesisBdbPackets({ batch, registry, lexicalXml, bdbXml, posXml })
  if (JSON.stringify(stable(expected)) !== JSON.stringify(stable(packets))) {
    errors.push('동일 XML·batch·registry로 결정적으로 재생성된 source packet과 다름')
  }

  return { errors, warnings }
}

function fixture() {
  const batch = {
    batchId: 'genesis-g2-calibration-100-v1',
    contractVersion: 'fixture-contract',
    sourcePolicyVersion: 'fixture-policy',
    items: [
      { strong: 'H1', category: 'existing-control', payloadPath: 'candidate/H1.json' },
      { strong: 'H6', category: 'core-theology-context', payloadPath: 'candidate/H6.json' },
    ],
  }
  const registry = {
    sources: [{
      id: PRIMARY_SOURCE_ID,
      role: 'primary-source',
      repository: 'openscriptures/HebrewLexicon',
      versionRef: '21c9add13bc727d3a951361778e97e3ff7afd1ce',
      licenseStatus: 'verified-public-or-permitted',
      attribution: 'Open Scriptures Hebrew Bible Project',
    }],
  }
  const lexicalXml = `<?xml version="1.0"?><index><part>
    <entry id="aac"><w xlit="ab">אָב</w><pos>N</pos><def>father</def><xref bdb="a.ae.ab" strong="1" twot="4a"/></entry>
    <entry id="aaf"><w xlit="abad">אָבַד</w><pos>V</pos><def>perish</def><xref bdb="a.ac.aa" strong="6" twot="2"/></entry>
  </part></index>`
  const bdbXml = `<?xml version="1.0"?><lexicon><part><section>
    <entry id="a.ae.ab" cite="full"><w>אָב</w><pos>n.m.</pos><sense n="1"><def>father</def><sense n="a"><def>of an individual</def></sense></sense><status>done</status></entry>
    <entry id="a.ac.aa" type="root"><w>אָבַד</w><pos>vb</pos><def>perish</def><sense n="1"><def>die</def></sense></entry>
  </section></part></lexicon>`
  const posXml = `<?xml version="1.0"?><PartsOfSpeech><POS><Code>N</Code><Name>Noun</Name></POS><POS><Code>V</Code><Name>Verb</Name></POS></PartsOfSpeech>`
  const packets = materializeGenesisBdbPackets({ batch, registry, lexicalXml, bdbXml, posXml })
  return { batch, registry, lexicalXml, bdbXml, posXml, packets }
}

function runSelfTest() {
  const input = fixture()
  const valid = validateGenesisBdbPackets(input)
  assert.deepEqual(valid.errors, [])
  const invalid = structuredClone(input.packets)
  invalid.packets[0].modelBoundary.productionWriteAllowed = true
  assert(validateGenesisBdbPackets({ ...input, packets: invalid }).errors.length > 0)
  console.log('✓ Genesis G2 BDB source packet verifier self-test passed')
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) return runSelfTest()
  const batch = JSON.parse(readFileSync(resolve(process.cwd(), args.batch), 'utf8'))
  const registry = normalizeRegistry(JSON.parse(readFileSync(resolve(process.cwd(), args.registry), 'utf8')))
  const packets = JSON.parse(readFileSync(resolve(process.cwd(), args.packets), 'utf8'))
  const cacheDir = resolve(process.cwd(), args.cacheDir)
  const lexicalXml = readFileSync(resolve(cacheDir, 'LexicalIndex.xml'), 'utf8')
  const bdbXml = readFileSync(resolve(cacheDir, 'BrownDriverBriggs.xml'), 'utf8')
  const posXml = readFileSync(resolve(cacheDir, 'BDBPartsOfSpeech.xml'), 'utf8')
  const { errors, warnings } = validateGenesisBdbPackets({ batch, registry, packets, lexicalXml, bdbXml, posXml })

  console.log('Genesis G2 BDB source packet verification')
  console.log(`  requested: ${packets.counts?.requested}`)
  console.log(`  ready: ${packets.counts?.ready}`)
  console.log(`  blocked: ${packets.counts?.blocked}`)
  console.log(`  BDB entries: ${packets.counts?.bdbEntries}`)
  console.log(`  source nodes: ${packets.counts?.sourceNodes}`)
  for (const warning of warnings) console.log(`  - warning: ${warning}`)
  if (errors.length) {
    console.error(`✗ BDB source packet verification failed (${errors.length})`)
    for (const error of errors) console.error(`  - ${error}`)
    if (args.strict) process.exitCode = 1
    return
  }
  console.log('✓ BDB source packet verification passed')
}

main()
