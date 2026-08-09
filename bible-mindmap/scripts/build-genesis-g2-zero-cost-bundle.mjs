#!/usr/bin/env node

import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { createJobEnvelope } from './ai/lexicon/genesis-g2-translation-contract.mjs'

export const ZERO_COST_BUNDLE_VERSION = '2026.08.09-zc.1'
const DEFAULT_SOURCE = 'reports/genesis-g2-bdb-source-packets.json'
const DEFAULT_CANARY = 'reports/genesis-g2-canary-set.json'
const DEFAULT_OUTPUT = 'reports/genesis-g2-zero-cost-bundle'

const SLOT_CONFIG = Object.freeze({
  a: Object.freeze({ slot: 'A', compatibilityProvider: 'nvidia', directory: 'slot-a' }),
  b: Object.freeze({ slot: 'B', compatibilityProvider: 'openai', directory: 'slot-b' }),
})

function parseArgs(argv) {
  const args = { source: DEFAULT_SOURCE, canary: DEFAULT_CANARY, output: DEFAULT_OUTPUT, selfTest: false }
  for (const arg of argv) {
    if (arg === '--self-test') args.selfTest = true
    else if (arg.startsWith('--source=')) args.source = arg.slice('--source='.length)
    else if (arg.startsWith('--canary=')) args.canary = arg.slice('--canary='.length)
    else if (arg.startsWith('--output=')) args.output = arg.slice('--output='.length)
    else throw new Error(`unknown argument: ${arg}`)
  }
  return args
}

const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'))

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function manualTemplate(packet, slotConfig) {
  const envelope = createJobEnvelope(packet, slotConfig.compatibilityProvider)
  return {
    schemaVersion: 1,
    bundleVersion: ZERO_COST_BUNDLE_VERSION,
    mode: 'manual-or-local-model',
    slot: slotConfig.slot,
    compatibilityProvider: slotConfig.compatibilityProvider,
    actualExecutionBackend: null,
    localModel: null,
    strong: packet.strong,
    packetId: packet.packetId,
    sourceFingerprint: envelope.sourceFingerprint,
    transliterationKo: '',
    primaryGlossKo: '',
    notesKo: '',
    nodes: envelope.source.nodes.map((node) => ({
      sourceNodeId: node.sourceNodeId,
      sourceText: node.sourceText,
      textKo: '',
      confidence: null,
      riskFlags: [],
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

function renderRunbook(manifest) {
  const strongs = manifest.strongs.join(' ')
  return `# 창세기 G2 · 무과금 번역 실행 번들\n\n` +
    `이 번들은 OpenAI·NVIDIA·Ollama Cloud 등 외부 유료 API를 호출하지 않습니다.\n\n` +
    `## 기본 원칙\n\n` +
    `- BDB 공개 원자료와 창세기 용례 패킷을 사용합니다.\n` +
    `- 후보 A와 후보 B는 서로의 결과를 읽지 않습니다.\n` +
    `- 실행 주소는 로컬 Ollama API(127.0.0.1 또는 localhost)만 허용합니다.\n` +
    `- 로컬 모델을 사용하지 않으면 templates 폴더의 JSON을 사람이 직접 작성할 수 있습니다.\n` +
    `- 어느 경로든 사람 문맥 검토·신학 감사 전에는 서비스 데이터로 승격하지 않습니다.\n\n` +
    `## 준비 대상\n\n` +
    `- Strong: ${strongs}\n` +
    `- 항목: ${manifest.counts.strongs}개\n` +
    `- source node: ${manifest.counts.sourceNodes}개\n\n` +
    `## 로컬 모델 실행\n\n` +
    `\`npm run genesis:g2:zero-cost:local -- --slot=a --model=<로컬모델A> --execute\`\n\n` +
    `\`npm run genesis:g2:zero-cost:local -- --slot=b --model=<로컬모델B> --execute\`\n\n` +
    `두 슬롯에는 가능한 한 서로 다른 로컬 모델을 사용합니다. 모델 이름은 설치된 로컬 모델명으로 입력합니다.\n\n` +
    `## 후속 검증\n\n` +
    `\`node scripts/evaluate-genesis-g2-canary-results.mjs --strict --output-root=reports/genesis-g2-zero-cost-execution --output=reports/genesis-g2-zero-cost-evaluation.json\`\n\n` +
    `내부 호환성을 위해 결과 디렉터리는 기존 비교 슬롯명을 사용하지만, 각 후보의 provenance에는 실제 실행 백엔드가 ollama-local로 기록됩니다.\n`
}

export function buildZeroCostBundle({ sourceSet, canarySet, outputDir }) {
  const packetByStrong = new Map((sourceSet.packets || []).map((packet) => [packet.strong, packet]))
  const selected = []
  for (const item of canarySet.items || []) {
    const packet = packetByStrong.get(item.strong)
    if (!packet) throw new Error(`${item.strong} source packet missing`)
    if (packet.sourcePacketStatus !== 'ready') throw new Error(`${item.strong} source packet not ready`)
    selected.push(packet)
  }
  if (!selected.length) throw new Error('zero-cost bundle has no selected packets')

  const root = resolve(outputDir)
  rmSync(root, { recursive: true, force: true })
  mkdirSync(root, { recursive: true })

  for (const config of Object.values(SLOT_CONFIG)) {
    for (const packet of selected) {
      writeJson(resolve(root, 'templates', config.directory, `${packet.strong}.json`), manualTemplate(packet, config))
    }
  }

  const manifest = {
    schemaVersion: 1,
    bundleVersion: ZERO_COST_BUNDLE_VERSION,
    target: 'genesis-g2-canary-zero-cost',
    sourcePacketSetId: sourceSet.packetSetId,
    canarySetId: canarySet.canarySetId,
    strongs: selected.map((packet) => packet.strong),
    counts: {
      strongs: selected.length,
      sourceNodes: selected.reduce((sum, packet) => sum + packet.sourceNodes.length, 0),
      manualTemplates: selected.length * 2,
    },
    execution: {
      defaultMode: 'local-only',
      allowedLocalBaseUrls: ['http://127.0.0.1:11434/api', 'http://localhost:11434/api'],
      externalPaidApiAllowed: false,
      cloudModelAllowed: false,
      apiKeysRequired: false,
      automaticServiceWriteAllowed: false,
    },
    slots: Object.values(SLOT_CONFIG).map((config) => ({
      slot: config.slot,
      compatibilityProvider: config.compatibilityProvider,
      actualProvider: 'manual-or-ollama-local',
      blindFromOtherSlot: true,
    })),
  }
  writeJson(resolve(root, 'bundle-manifest.json'), manifest)
  writeFileSync(resolve(root, 'RUNBOOK.md'), renderRunbook(manifest), 'utf8')
  return manifest
}

function fixture() {
  const sourceNodes = [
    { id: 'node-1', parentId: null, nodeType: 'entry', label: 'land', text: 'land', sourceHash: `sha256:${'a'.repeat(64)}` },
    { id: 'node-2', parentId: 'node-1', nodeType: 'sense', label: 'earth', text: 'earth', sourceHash: `sha256:${'b'.repeat(64)}` },
  ]
  return {
    sourceSet: {
      packetSetId: 'genesis-g2-calibration-bdb-source-packets-v1',
      packets: [{
        packetId: 'fixture:H776', strong: 'H776', sourcePacketStatus: 'ready',
        identity: { lemmas: ['אֶרֶץ'], transliterations: ['erets'] },
        lexicalMappings: [], bdbEntries: [], sourceNodes,
        source: { repository: 'fixture', revision: 'fixture' },
      }],
    },
    canarySet: { canarySetId: 'fixture-canary', items: [{ strong: 'H776' }] },
  }
}

function runSelfTest() {
  const root = resolve(tmpdir(), `genesis-g2-zero-cost-bundle-${process.pid}`)
  const data = fixture()
  const manifest = buildZeroCostBundle({ ...data, outputDir: root })
  assert.equal(manifest.counts.strongs, 1)
  assert.equal(manifest.counts.sourceNodes, 2)
  assert.equal(manifest.counts.manualTemplates, 2)
  assert.equal(manifest.execution.externalPaidApiAllowed, false)
  assert.equal(manifest.execution.apiKeysRequired, false)
  const template = JSON.parse(readFileSync(resolve(root, 'templates', 'slot-a', 'H776.json'), 'utf8'))
  assert.equal(template.nodes.length, 2)
  assert.equal(template.governance.localExecutionOnly, true)
  assert.equal(template.governance.productionWriteAllowed, false)
  rmSync(root, { recursive: true, force: true })
  console.log('✓ Genesis G2 zero-cost bundle self-test 통과')
}

const args = parseArgs(process.argv.slice(2))
if (args.selfTest) runSelfTest()
else {
  const manifest = buildZeroCostBundle({
    sourceSet: readJson(args.source),
    canarySet: readJson(args.canary),
    outputDir: args.output,
  })
  console.log(`✓ Genesis G2 zero-cost bundle · strongs=${manifest.counts.strongs} · nodes=${manifest.counts.sourceNodes} · templates=${manifest.counts.manualTemplates}`)
}
