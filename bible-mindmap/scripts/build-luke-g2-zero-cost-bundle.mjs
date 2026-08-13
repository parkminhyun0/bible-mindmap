#!/usr/bin/env node

import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { createJobEnvelope } from './ai/lexicon/luke-g2-translation-contract.mjs'

export const LUKE_G2_ZERO_COST_BUNDLE_VERSION = '2026.08.13-luke-zc.2'
const DEFAULT_SOURCE = 'data/lexicon/luke-g2-canary-preparation.json'
const DEFAULT_GATE = 'data/lexicon/luke-g2-execution-gate.json'
const DEFAULT_OUTPUT = 'reports/luke-g2-zero-cost-bundle'

const SLOT_CONFIG = Object.freeze({
  a: Object.freeze({ slot: 'A', directory: 'slot-a' }),
  b: Object.freeze({ slot: 'B', directory: 'slot-b' }),
})

function parseArgs(argv) {
  const args = { source: DEFAULT_SOURCE, gate: DEFAULT_GATE, output: DEFAULT_OUTPUT, selfTest: false }
  for (const arg of argv) {
    if (arg === '--self-test') args.selfTest = true
    else if (arg.startsWith('--source=')) args.source = arg.slice('--source='.length)
    else if (arg.startsWith('--gate=')) args.gate = arg.slice('--gate='.length)
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

function validatePreparation(preparation, gate) {
  if (preparation?.preparationId !== 'luke-g2-canary-preparation-v1') throw new Error('Luke G2 preparation required')
  if (!Array.isArray(preparation.packets) || preparation.packets.length !== 10) throw new Error('exactly 10 Luke G2 packets required')
  if (preparation.packets.some((packet) => packet.sourcePacketStatus !== 'ready')) throw new Error('all Luke G2 packets must be ready')
  if (gate?.gateId !== 'luke-g2-canary-execute-v1') throw new Error('Luke G2 execution gate required')
  if (gate.confirmationRequired !== 'RUN-LUKE-G2-CANARY') throw new Error('Luke G2 confirmation phrase mismatch')
  if (typeof gate.executionAllowed !== 'boolean') throw new Error('executionAllowed must be boolean')
  if (gate.killSwitchDefault !== 'on') throw new Error('bundle requires kill switch default on')
  if (gate.modes?.localTwoModel?.minimumIndependentDrafts !== 2) throw new Error('localTwoModel must require two independent drafts')
  if (gate.executionAllowed === true) {
    if (gate.modes?.localTwoModel?.enabled !== true) throw new Error('open Gate requires localTwoModel enabled')
    if (gate.modes?.providerBoth?.enabled !== false) throw new Error('open local Gate requires providerBoth disabled')
    if (gate.modes?.manualIndependentJson?.enabled !== false) throw new Error('open local Gate requires manualIndependentJson disabled')
    if (gate.safety?.candidateOnly !== true) throw new Error('open Gate requires candidateOnly=true')
    if (gate.safety?.productionWriteAllowed !== false) throw new Error('open Gate requires productionWriteAllowed=false')
    if (gate.safety?.sourceNodeMutationAllowed !== false) throw new Error('open Gate requires sourceNodeMutationAllowed=false')
    if (gate.safety?.humanReviewRequired !== true) throw new Error('open Gate requires humanReviewRequired=true')
    if (gate.safety?.automaticApprovalAllowed !== false) throw new Error('open Gate requires automaticApprovalAllowed=false')
    if (gate.safety?.r3r4AutomaticApprovalAllowed !== false) throw new Error('open Gate requires r3r4AutomaticApprovalAllowed=false')
  }
}

function manualTemplate(packet, config) {
  const envelope = createJobEnvelope(packet, config.slot)
  return {
    schemaVersion: 1,
    bundleVersion: LUKE_G2_ZERO_COST_BUNDLE_VERSION,
    mode: 'manual-or-ollama-local',
    comparisonSlot: config.slot,
    actualExecutionBackend: null,
    localModel: null,
    strong: packet.strong,
    packetId: packet.packetId,
    sourceFingerprint: envelope.sourceFingerprint,
    transliterationKo: '',
    primaryGlossKo: '',
    alternateGlossesKo: [],
    lexicalNotesKo: '',
    contextDecisions: envelope.source.contexts.map((context) => ({
      contextId: context.contextId,
      glossKo: '',
      rationaleKo: '',
      confidence: null,
      riskFlags: [],
    })),
    reviewerFlags: [],
    governance: {
      externalPaidApiAllowed: false,
      cloudModelAllowed: false,
      localExecutionOnly: true,
      blindFromOtherSlot: true,
      humanReviewRequired: true,
      productionWriteAllowed: false,
      finalApprovalAllowed: false,
    },
  }
}

function renderRunbook(manifest) {
  const committedPhase = manifest.execution.committedGateExecutionAllowed ? 'open' : 'closed'
  return `# 누가복음 G2 · 무과금 독립 후보 준비 번들\n\n` +
    `이 번들은 committed Gate가 ${committedPhase} 상태여도 항상 실행 불가(inert)인 준비 snapshot만 만듭니다. 실제 로컬 모델 호출 권한은 runner가 committed Gate, 승인 문자열, kill switch를 별도로 검증합니다.\n\n` +
    `## 대상\n\n` +
    `- Strong: ${manifest.strongs.join(' ')}\n` +
    `- 대표 Strong: ${manifest.counts.strongs}개\n` +
    `- 대표 문맥: ${manifest.counts.contexts}건\n` +
    `- 독립 템플릿: ${manifest.counts.manualTemplates}개\n\n` +
    `## 안전 경계\n\n` +
    `- bundle 자체 실행 허용: false\n` +
    `- committed Gate executionAllowed: ${manifest.execution.committedGateExecutionAllowed}\n` +
    `- 외부 유료 API 호출: 0\n` +
    `- API key 필요: 없음\n` +
    `- 허용 주소: http://127.0.0.1:11434/api 또는 http://localhost:11434/api\n` +
    `- 서비스 사전 쓰기: 금지\n` +
    `- 후보 A/B 상호 열람: 비교 완료 전 금지\n` +
    `- R3·R4 및 신학 민감어 자동 승인: 금지\n\n` +
    `## 실제 실행 전 필수 입력\n\n` +
    `1. committed Gate에서 executionAllowed=true · localTwoModel.enabled=true 확인\n` +
    `2. 서로 다른 로컬 모델 A/B 지정\n` +
    `3. 승인 문자열 RUN-LUKE-G2-CANARY 입력\n` +
    `4. kill switch를 off로 명시\n` +
    `5. 사람 검토 유지\n\n` +
    `이 준비 번들 생성 자체는 위 실행을 수행하지 않습니다.\n`
}

export function buildLukeG2ZeroCostBundle({ preparation, gate, outputDir }) {
  validatePreparation(preparation, gate)
  const root = resolve(outputDir)
  rmSync(root, { recursive: true, force: true })
  mkdirSync(root, { recursive: true })

  for (const config of Object.values(SLOT_CONFIG)) {
    for (const packet of preparation.packets) {
      writeJson(resolve(root, 'templates', config.directory, `${packet.strong}.json`), manualTemplate(packet, config))
    }
  }

  const manifest = {
    schemaVersion: 1,
    bundleVersion: LUKE_G2_ZERO_COST_BUNDLE_VERSION,
    target: 'luke-g2-canary-zero-cost',
    preparationId: preparation.preparationId,
    gateId: gate.gateId,
    strongs: preparation.packets.map((packet) => packet.strong),
    counts: {
      strongs: preparation.packets.length,
      contexts: preparation.packets.reduce((sum, packet) => sum + packet.contexts.length, 0),
      manualTemplates: preparation.packets.length * 2,
    },
    execution: {
      currentGateState: gate.state,
      committedGateExecutionAllowed: gate.executionAllowed === true,
      committedLocalTwoModelEnabled: gate.modes?.localTwoModel?.enabled === true,
      executionAllowed: false,
      localTwoModelEnabled: false,
      confirmationRequired: gate.confirmationRequired,
      killSwitchDefault: gate.killSwitchDefault,
      allowedLocalBaseUrls: ['http://127.0.0.1:11434/api', 'http://localhost:11434/api'],
      externalPaidApiAllowed: false,
      cloudModelAllowed: false,
      apiKeysRequired: false,
      automaticServiceWriteAllowed: false,
    },
    slots: Object.values(SLOT_CONFIG).map((config) => ({
      slot: config.slot,
      actualProvider: 'manual-or-ollama-local',
      blindFromOtherSlot: true,
    })),
  }
  writeJson(resolve(root, 'bundle-manifest.json'), manifest)
  writeFileSync(resolve(root, 'RUNBOOK.md'), renderRunbook(manifest), 'utf8')
  return manifest
}

function fixture() {
  const packet = {
    packetId: 'luke-g2-source-context:G2316',
    sourcePacketStatus: 'ready',
    strong: 'G2316',
    identity: { primaryLemma: 'θεός', primaryTransliteration: 'theos', partOfSpeechFamilies: ['N'] },
    usage: { tokenCount: 1 },
    sourceEvidence: { englishGlosses: ['God'], morphologyCodes: ['N-NSM'], sourceFingerprint: `sha256:${'a'.repeat(64)}` },
    reuse: { eligible: false, source: null, existingKorean: null },
    routing: { action: 'translate', originalAction: 'translate' },
    theologyAudit: { framework: 'reformed-westminster-primary', signals: ['THEOLOGY_KEYWORD'] },
    contexts: [{
      contextId: 'luke-g2-context:Luke.1.6.7', tokenId: 'Luke.1.6.7', reference: 'Luke 1:6',
      target: { word: 'θεοῦ', lemma: 'θεός', strong: 'G2316', morphology: 'N-GSM-T', englishGloss: 'God' },
      verse: { text: 'fixture', sourceHash: 'fixture' }, localWindow: [], morphgntCrossCheck: { lemmaPresent: true },
    }],
  }
  return {
    preparation: { preparationId: 'luke-g2-canary-preparation-v1', packets: Array.from({ length: 10 }, (_, index) => ({ ...structuredClone(packet), strong: `G${2316 + index}`, packetId: `luke-g2-source-context:G${2316 + index}` })) },
    gate: {
      gateId: 'luke-g2-canary-execute-v1', state: 'blocked-awaiting-explicit-approval',
      confirmationRequired: 'RUN-LUKE-G2-CANARY', executionAllowed: false, killSwitchDefault: 'on',
      modes: {
        providerBoth: { enabled: false },
        localTwoModel: { enabled: false, minimumIndependentDrafts: 2 },
        manualIndependentJson: { enabled: false },
      },
      safety: {
        sourceNodeMutationAllowed: false,
        productionWriteAllowed: false,
        candidateOnly: true,
        humanReviewRequired: true,
        automaticApprovalAllowed: false,
        r3r4AutomaticApprovalAllowed: false,
      },
    },
  }
}

function runSelfTest() {
  const root = resolve(tmpdir(), `luke-g2-zero-cost-bundle-${process.pid}`)
  const closed = fixture()
  const manifest = buildLukeG2ZeroCostBundle({ ...closed, outputDir: root })
  assert.equal(manifest.counts.strongs, 10)
  assert.equal(manifest.counts.contexts, 10)
  assert.equal(manifest.counts.manualTemplates, 20)
  assert.equal(manifest.execution.externalPaidApiAllowed, false)
  assert.equal(manifest.execution.executionAllowed, false)
  assert.equal(manifest.execution.committedGateExecutionAllowed, false)
  const template = JSON.parse(readFileSync(resolve(root, 'templates', 'slot-a', 'G2316.json'), 'utf8'))
  assert.equal(template.contextDecisions.length, 1)
  assert.equal(template.governance.productionWriteAllowed, false)

  const opened = fixture()
  opened.gate.executionAllowed = true
  opened.gate.modes.localTwoModel.enabled = true
  const openManifest = buildLukeG2ZeroCostBundle({ ...opened, outputDir: root })
  assert.equal(openManifest.execution.committedGateExecutionAllowed, true)
  assert.equal(openManifest.execution.committedLocalTwoModelEnabled, true)
  assert.equal(openManifest.execution.executionAllowed, false)
  assert.equal(openManifest.execution.localTwoModelEnabled, false)

  rmSync(root, { recursive: true, force: true })
  console.log('✓ Luke G2 zero-cost bundle self-test passed · closed/open Gate snapshots remain inert')
}

const args = parseArgs(process.argv.slice(2))
if (args.selfTest) runSelfTest()
else {
  const manifest = buildLukeG2ZeroCostBundle({
    preparation: readJson(args.source),
    gate: readJson(args.gate),
    outputDir: args.output,
  })
  console.log(`✓ Luke G2 zero-cost bundle · strongs=${manifest.counts.strongs} · contexts=${manifest.counts.contexts} · templates=${manifest.counts.manualTemplates} · committedGateOpen=${manifest.execution.committedGateExecutionAllowed}`)
}
