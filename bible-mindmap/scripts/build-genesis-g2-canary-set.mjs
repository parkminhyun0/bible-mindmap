#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { sourceFingerprint } from './ai/lexicon/genesis-g2-translation-contract.mjs'

const DEFAULT_SOURCE = 'reports/genesis-g2-bdb-source-packets.json'
const DEFAULT_OUTPUT = 'reports/genesis-g2-canary-set.json'

export const GENESIS_G2_CANARY_SPECS = Object.freeze([
  {
    strong: 'H430',
    role: 'theological-divine-title',
    rationale: '하나님 호칭과 복수 형태의 의미 층위를 점검하는 신학 민감 핵심어',
    expectedMinNodes: 10,
  },
  {
    strong: 'H776',
    role: 'complex-existing-pilot',
    rationale: '기존 H776 파일럿과 대조 가능한 다층 BDB 의미 구조',
    expectedMinNodes: 20,
  },
  {
    strong: 'H7307',
    role: 'polysemy-spirit-wind-breath',
    rationale: '영·바람·호흡의 다의성과 문맥 분기를 점검하는 핵심어',
    expectedMinNodes: 8,
  },
  {
    strong: 'H559',
    role: 'high-frequency-common-verb-control',
    rationale: '고빈도 일반 동사와 기존 한글 대조군의 안정성을 측정',
    expectedMinNodes: 5,
  },
  {
    strong: 'H56',
    role: 'low-frequency-common-verb',
    rationale: '저빈도 일반 동사에서 과잉 해석 없이 간결하게 번역되는지 점검',
    expectedMinNodes: 3,
  },
])

function parseArgs(argv) {
  const args = { source: DEFAULT_SOURCE, output: DEFAULT_OUTPUT, printStrongs: false }
  for (const arg of argv) {
    if (arg.startsWith('--source=')) args.source = arg.slice('--source='.length)
    else if (arg.startsWith('--output=')) args.output = arg.slice('--output='.length)
    else if (arg === '--print-strongs') args.printStrongs = true
    else throw new Error(`unknown argument: ${arg}`)
  }
  return args
}

export function buildCanarySet(sourceSet) {
  if (sourceSet?.packetSetId !== 'genesis-g2-calibration-bdb-source-packets-v1') throw new Error('unexpected Genesis G2 source packet set')
  const byStrong = new Map(sourceSet.packets.map((packet) => [packet.strong, packet]))
  const items = GENESIS_G2_CANARY_SPECS.map((spec, index) => {
    const packet = byStrong.get(spec.strong)
    if (!packet) throw new Error(`${spec.strong} source packet missing`)
    if (packet.sourcePacketStatus !== 'ready') throw new Error(`${spec.strong} source packet blocked`)
    return {
      order: index + 1,
      ...spec,
      category: packet.category,
      lemma: packet.identity?.lemmas?.[0] || null,
      transliteration: packet.identity?.transliterations?.[0] || null,
      sourceNodeCount: packet.sourceNodes.length,
      sourceFingerprint: sourceFingerprint(packet),
      packetId: packet.packetId,
      productionWriteAllowed: false,
      finalApprovalAllowed: false,
    }
  })
  return {
    schemaVersion: 1,
    canarySetId: 'genesis-g2-canary-5-v1',
    sourcePacketSetId: sourceSet.packetSetId,
    contractVersion: sourceSet.contractVersion,
    governance: {
      explicitManualDispatchRequired: true,
      providerSecretsServerOnly: true,
      blindProviderIsolationRequired: true,
      executionGateRequired: true,
      killSwitchRequired: true,
      productionWriteAllowed: false,
      finalApprovalAllowed: false,
    },
    counts: {
      selected: items.length,
      theologicalSensitive: items.filter((item) => ['H430', 'H7307'].includes(item.strong)).length,
      existingControls: items.filter((item) => ['H776', 'H559'].includes(item.strong)).length,
      lowFrequency: items.filter((item) => item.strong === 'H56').length,
      sourceNodes: items.reduce((sum, item) => sum + item.sourceNodeCount, 0),
    },
    items,
  }
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv)
  const sourceSet = JSON.parse(readFileSync(resolve(args.source), 'utf8'))
  const result = buildCanarySet(sourceSet)
  if (args.printStrongs) {
    console.log(result.items.map((item) => item.strong).join(' '))
    return
  }
  const output = resolve(args.output)
  mkdirSync(dirname(output), { recursive: true })
  writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  console.log(`✓ Genesis G2 canary set built · ${result.items.map((item) => item.strong).join(', ')} · nodes=${result.counts.sourceNodes}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()
