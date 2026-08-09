#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { evaluateCanarySet, PROVIDER_ORDER } from './ai/lexicon/genesis-g2-canary-evaluation.mjs'

const DEFAULT_CANARY = 'reports/genesis-g2-canary-set.json'
const DEFAULT_SOURCE = 'reports/genesis-g2-bdb-source-packets.json'
const DEFAULT_ROOT = 'reports/genesis-g2-canary-execution'
const DEFAULT_OUTPUT = 'reports/genesis-g2-canary-evaluation.json'

function parseArgs(argv) {
  const args = { canary: DEFAULT_CANARY, source: DEFAULT_SOURCE, root: DEFAULT_ROOT, output: DEFAULT_OUTPUT, strict: false, selfTest: false }
  for (const arg of argv) {
    if (arg === '--strict') args.strict = true
    else if (arg === '--self-test') args.selfTest = true
    else if (arg.startsWith('--canary=')) args.canary = arg.slice('--canary='.length)
    else if (arg.startsWith('--source=')) args.source = arg.slice('--source='.length)
    else if (arg.startsWith('--output-root=')) args.root = arg.slice('--output-root='.length)
    else if (arg.startsWith('--output=')) args.output = arg.slice('--output='.length)
    else throw new Error(`unknown argument: ${arg}`)
  }
  return args
}

const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'))
const candidatePath = (root, provider, strong) => resolve(root, 'candidates', provider, `${strong}.json`)

function pricingFromEnv(env) {
  return {
    nvidia: {
      inputPerMillion: env.GENESIS_G2_NVIDIA_INPUT_USD_PER_MILLION,
      outputPerMillion: env.GENESIS_G2_NVIDIA_OUTPUT_USD_PER_MILLION,
    },
    openai: {
      inputPerMillion: env.GENESIS_G2_OPENAI_INPUT_USD_PER_MILLION,
      outputPerMillion: env.GENESIS_G2_OPENAI_OUTPUT_USD_PER_MILLION,
    },
  }
}

function loadCandidates(canarySet, root) {
  const result = {}
  for (const item of canarySet.items) {
    result[item.strong] = {}
    for (const provider of PROVIDER_ORDER) {
      const path = candidatePath(root, provider, item.strong)
      if (existsSync(path)) result[item.strong][provider] = readJson(path)
    }
  }
  return result
}

async function runSelfTest() {
  const { createJobEnvelope } = await import('./ai/lexicon/genesis-g2-translation-contract.mjs')
  const sourceNodes = [
    { id: 'node-1', parentId: null, nodeType: 'entry', label: 'land', text: 'land', sourceHash: 'sha256:' + 'a'.repeat(64) },
    { id: 'node-2', parentId: 'node-1', nodeType: 'sense', label: 'earth', text: 'earth', sourceHash: 'sha256:' + 'b'.repeat(64) },
  ]
  const packet = {
    packetId: 'fixture:H776',
    strong: 'H776',
    sourcePacketStatus: 'ready',
    contractVersion: 'fixture',
    identity: { lemmas: ['אֶרֶץ'], transliterations: ['erets'] },
    lexicalMappings: [],
    bdbEntries: [],
    sourceNodes,
    source: { repository: 'fixture', revision: 'fixture' },
  }
  const candidateByStrong = { H776: {} }
  for (const provider of PROVIDER_ORDER) {
    const envelope = createJobEnvelope(packet, provider)
    candidateByStrong.H776[provider] = {
      schemaVersion: 1,
      contractVersion: envelope.contractVersion,
      promptVersion: envelope.promptVersion,
      candidateId: `${envelope.blindGroupId}:${provider}`,
      blindGroupId: envelope.blindGroupId,
      provider,
      model: `${provider}-fixture`,
      requestId: `${provider}-request`,
      strong: 'H776',
      packetId: packet.packetId,
      sourceFingerprint: envelope.sourceFingerprint,
      sourceNodeCount: 2,
      status: 'candidate',
      attempt: 1,
      generatedAt: new Date().toISOString(),
      payload: {
        strong: 'H776',
        sourceFingerprint: envelope.sourceFingerprint,
        transliterationKo: '에레츠',
        primaryGlossKo: '땅',
        notesKo: '',
        nodes: [
          { sourceNodeId: 'node-1', textKo: provider === 'nvidia' ? '땅' : '땅, 토지', confidence: 0.94, riskFlags: ['polysemy'] },
          { sourceNodeId: 'node-2', textKo: '대지', confidence: 0.91, riskFlags: ['polysemy'] },
        ],
      },
      validation: { passed: true, errors: [] },
      usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
      metrics: { latencyMs: provider === 'nvidia' ? 900 : 1100 },
      governance: {
        blindCandidate: true,
        otherProviderOutputIncluded: false,
        productionWriteAllowed: false,
        finalApprovalAllowed: false,
      },
    }
  }
  const report = evaluateCanarySet({
    canarySet: {
      canarySetId: 'fixture',
      items: [{ strong: 'H776', role: 'fixture', sourceFingerprint: candidateByStrong.H776.nvidia.sourceFingerprint }],
    },
    sourceSet: { packets: [packet] },
    candidateByStrong,
    pricing: {
      nvidia: { inputPerMillion: 1, outputPerMillion: 2 },
      openai: { inputPerMillion: 1, outputPerMillion: 2 },
    },
  })
  if (!report.gates.technicalGatePassed) throw new Error('self-test technical gate failed')
  if (report.counts.presentCandidates !== 2) throw new Error('self-test candidate count failed')
  if (report.gates.automaticPromotionAllowed !== false) throw new Error('self-test auto-promotion boundary failed')
  if (report.metrics.usage.nvidia.estimatedUsd === null) throw new Error('self-test cost estimate missing')
  console.log('✓ Genesis G2 canary evaluation self-test 통과')
}

const args = parseArgs(process.argv.slice(2))
if (args.selfTest) {
  await runSelfTest()
  process.exit(0)
}

const canarySet = readJson(args.canary)
const sourceSet = readJson(args.source)
const candidateByStrong = loadCandidates(canarySet, args.root)
const report = evaluateCanarySet({ canarySet, sourceSet, candidateByStrong, pricing: pricingFromEnv(process.env) })
const output = resolve(args.output)
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(`✓ Genesis G2 canary evaluation · pairs=${report.counts.evaluatedPairs}/${report.counts.expectedPairs} · status=${report.promotion.status}`)
if (args.strict && !report.gates.technicalGatePassed) process.exitCode = 2
