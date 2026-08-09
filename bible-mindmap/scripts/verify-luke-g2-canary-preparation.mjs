#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  CANARY_SIZE,
  CONFIRMATION_PHRASE,
  LUKE_G2_CONTRACT_VERSION,
  MAX_CONTEXTS,
  buildExecutionGate,
} from './build-luke-g2-canary-preparation.mjs'

const DEFAULT_PACKETS = resolve(process.cwd(), 'data/lexicon/luke-g2-canary-preparation.json')
const DEFAULT_GATE = resolve(process.cwd(), 'data/lexicon/luke-g2-execution-gate.json')
const DEFAULT_REPORT = resolve(process.cwd(), 'data/lexicon/luke-g2-report.json')

const REQUIRED_SLOTS = [
  'theology-god',
  'theology-kingdom',
  'theology-salvation-verb',
  'theology-repentance',
  'polysemy-spirit',
  'high-frequency-verb',
  'adjective-control',
  'proper-name-control',
  'existing-reuse-control',
  'low-frequency-control',
]

function parseArgs(argv) {
  const args = { packets: DEFAULT_PACKETS, gate: DEFAULT_GATE, report: DEFAULT_REPORT, strict: false, selfTest: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--strict') args.strict = true
    else if (arg === '--self-test') args.selfTest = true
    else if (arg === '--packets') args.packets = resolve(process.cwd(), argv[++index])
    else if (arg === '--gate') args.gate = resolve(process.cwd(), argv[++index])
    else if (arg === '--report') args.report = resolve(process.cwd(), argv[++index])
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return args
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function scanForbiddenKeys(value, path = '$', errors = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForbiddenKeys(item, `${path}[${index}]`, errors))
    return errors
  }
  if (!isObject(value)) return errors
  for (const [key, child] of Object.entries(value)) {
    if (/^(apiKey|authorization|secret|rawCredential|tokenValue)$/iu.test(key)) errors.push(`${path}.${key}: 비밀값 저장 금지 필드`)
    scanForbiddenKeys(child, `${path}.${key}`, errors)
  }
  return errors
}

export function validateLukeG2Preparation(preparation, gate, report) {
  const errors = []
  const warnings = []

  if (preparation.schemaVersion !== 1) errors.push('preparation schemaVersion=1 필요')
  if (preparation.preparationId !== 'luke-g2-canary-preparation-v1') errors.push('preparationId 불일치')
  if (preparation.contractVersion !== LUKE_G2_CONTRACT_VERSION) errors.push('G2 contractVersion 불일치')
  if (preparation.book?.id !== 'Luke' || preparation.book?.sourceLanguage !== 'greek') errors.push('누가복음/헬라어 식별자 불일치')
  if (preparation.governance?.theologicalFramework !== 'reformed-westminster-primary') errors.push('개혁주의 신학 기준 누락')
  for (const [field, expected] of Object.entries({
    sourceAndContextOnly: true,
    translationStarted: false,
    providerCallsAllowed: false,
    localModelCallsAllowed: false,
    productionWriteAllowed: false,
    sourceNodeMutationAllowed: false,
    finalHumanApprovalRequired: true,
  })) {
    if (preparation.governance?.[field] !== expected) errors.push(`governance.${field}=${expected} 필요`)
  }

  if (!String(preparation.source?.tagnt?.license || '').includes('CC BY 4.0')) errors.push('TAGNT CC BY 4.0 출처 Gate 누락')
  if (!preparation.source?.tagnt?.blobSha || !preparation.source?.tagnt?.sha256) errors.push('TAGNT 고정 blob/digest 누락')
  if (!preparation.source?.morphgnt?.blobSha || !preparation.source?.morphgnt?.sha256) errors.push('MorphGNT 고정 blob/digest 누락')
  if (preparation.selectionContract?.size !== CANARY_SIZE) errors.push(`selection size=${CANARY_SIZE} 필요`)

  if (!Array.isArray(preparation.packets) || preparation.packets.length !== CANARY_SIZE) {
    errors.push(`packets는 정확히 ${CANARY_SIZE}개 필요`)
    return { errors, warnings }
  }
  const slots = preparation.packets.map((packet) => packet.slotId)
  const strongs = preparation.packets.map((packet) => packet.strong)
  if (new Set(slots).size !== CANARY_SIZE) errors.push('중복 slotId 존재')
  if (new Set(strongs).size !== CANARY_SIZE) errors.push('중복 Strong 존재')
  for (const slot of REQUIRED_SLOTS) if (!slots.includes(slot)) errors.push(`필수 slot 누락: ${slot}`)

  const allPos = new Set()
  const allBands = new Set()
  let reuseControls = 0
  let translations = 0
  let contextCount = 0
  for (const [index, packet] of preparation.packets.entries()) {
    const where = `packets[${index}]`
    if (packet.order !== index + 1) errors.push(`${where}: order 불일치`)
    if (!/^G[1-9]\d*$/u.test(packet.strong || '')) errors.push(`${where}: Greek Strong 형식 오류`)
    if (packet.packetId !== `luke-g2-source-context:${packet.strong}`) errors.push(`${where}: packetId 불일치`)
    if (packet.sourcePacketStatus !== 'ready') errors.push(`${where}: sourcePacketStatus=ready 필요`)
    if (!['high', 'medium', 'low'].includes(packet.frequencyBand)) errors.push(`${where}: frequencyBand 오류`)
    allBands.add(packet.frequencyBand)
    for (const family of packet.identity?.partOfSpeechFamilies || []) allPos.add(family)
    if (!packet.identity?.primaryLemma) errors.push(`${where}: primaryLemma 누락`)
    if (!Number.isInteger(packet.usage?.tokenCount) || packet.usage.tokenCount < 1) errors.push(`${where}: tokenCount 오류`)
    if (packet.contextCoverage?.totalOccurrences !== packet.usage?.tokenCount) errors.push(`${where}: 전체 출현 수와 manifest 불일치`)
    if (packet.contextCoverage?.expectedOccurrences !== packet.usage?.tokenCount) errors.push(`${where}: expectedOccurrences 불일치`)
    if (!Array.isArray(packet.contexts) || packet.contexts.length < 1 || packet.contexts.length > MAX_CONTEXTS) {
      errors.push(`${where}: 대표 문맥은 1~${MAX_CONTEXTS}건 필요`)
      continue
    }
    if (packet.contextCoverage?.representativeContexts !== packet.contexts.length) errors.push(`${where}: 대표 문맥 수 불일치`)
    contextCount += packet.contexts.length
    if (packet.routing?.originalAction === 'reuse-existing') reuseControls += 1
    else if (packet.routing?.originalAction === 'translate') translations += 1
    else errors.push(`${where}: originalAction 오류`)
    if (!packet.routing?.targetPayloadPath?.endsWith(`/${packet.strong}.json`)) errors.push(`${where}: targetPayloadPath 불일치`)

    for (const [contextIndex, context] of packet.contexts.entries()) {
      const contextWhere = `${where}.contexts[${contextIndex}]`
      if (context.target?.strong !== packet.strong) errors.push(`${contextWhere}: target Strong 불일치`)
      if (!context.tokenId || context.tokenId !== context.target?.tokenId && context.target?.tokenId) errors.push(`${contextWhere}: tokenId 오류`)
      if (!/^Luke \d+:\d+$/u.test(context.reference || '')) errors.push(`${contextWhere}: reference 형식 오류`)
      if (!context.target?.word || !context.target?.lemma) errors.push(`${contextWhere}: 원어 word/lemma 누락`)
      if (!context.verse?.text || !context.verse?.sourceHash) errors.push(`${contextWhere}: 허용 원천 문맥/해시 누락`)
      if (!Array.isArray(context.localWindow) || !context.localWindow.some((token) => token.tokenId === context.tokenId)) {
        errors.push(`${contextWhere}: localWindow에 대상 token 누락`)
      }
      if (typeof context.morphgntCrossCheck?.lemmaPresent !== 'boolean') errors.push(`${contextWhere}: MorphGNT lemma 교차검증 누락`)
    }
    if (packet.modelBoundary?.translationStatus !== 'not-started') errors.push(`${where}: 번역 미시작 상태 필요`)
    if (packet.modelBoundary?.independentDraftsRequired !== 2) errors.push(`${where}: 독립 초안 2개 필요`)
    if (packet.modelBoundary?.crossVisibilityBeforeComparison !== false) errors.push(`${where}: 비교 전 교차 노출 금지`)
    if (packet.modelBoundary?.productionWriteAllowed !== false) errors.push(`${where}: production write 금지`)
    if (packet.modelBoundary?.humanApprovalRequired !== true) errors.push(`${where}: 사람 승인 필수`)
  }

  for (const pos of ['N', 'V', 'A']) if (!allPos.has(pos)) errors.push(`필수 품사군 누락: ${pos}`)
  for (const band of ['high', 'medium', 'low']) if (!allBands.has(band)) errors.push(`필수 빈도 구간 누락: ${band}`)
  if (reuseControls < 1) errors.push('기존 한글 재사용 대조군 최소 1개 필요')
  if (translations < 1) errors.push('신규 번역 대상 최소 1개 필요')
  if (preparation.counts?.selected !== CANARY_SIZE) errors.push('counts.selected 불일치')
  if (preparation.counts?.ready !== CANARY_SIZE || preparation.counts?.blocked !== 0) errors.push('ready/blocked counts 불일치')
  if (preparation.counts?.reuseControls !== reuseControls) errors.push('reuseControls count 불일치')
  if (preparation.counts?.newTranslations !== translations) errors.push('newTranslations count 불일치')
  if (preparation.counts?.representativeContexts !== contextCount) errors.push('representativeContexts count 불일치')

  if (gate.schemaVersion !== 1 || gate.gateId !== 'luke-g2-canary-execute-v1') errors.push('execution Gate 식별자 오류')
  if (gate.contractVersion !== LUKE_G2_CONTRACT_VERSION) errors.push('execution Gate contractVersion 불일치')
  if (gate.confirmationRequired !== CONFIRMATION_PHRASE) errors.push('승인 문자열 불일치')
  if (gate.executionAllowed !== false) errors.push('명시 승인 전 executionAllowed=false 필요')
  if (gate.killSwitchDefault !== 'on') errors.push('kill switch 기본 on 필요')
  for (const mode of ['providerBoth', 'localTwoModel', 'manualIndependentJson']) {
    if (gate.modes?.[mode]?.enabled !== false) errors.push(`${mode}: 명시 승인 전 enabled=false 필요`)
    if (gate.modes?.[mode]?.minimumIndependentDrafts !== 2) errors.push(`${mode}: 독립 초안 2개 필요`)
  }
  if (gate.independence?.draftAVisibleToDraftBBeforeCompletion !== false
    || gate.independence?.draftBVisibleToDraftABeforeCompletion !== false
    || gate.independence?.comparisonOnlyAfterBothDraftsValidated !== true) {
    errors.push('독립 초안 경계 오류')
  }
  for (const [field, expected] of Object.entries({
    secretsMayBeLogged: false,
    rawCredentialsMayBeStored: false,
    sourceNodeMutationAllowed: false,
    productionWriteAllowed: false,
    candidateOnly: true,
    humanReviewRequired: true,
    automaticApprovalAllowed: false,
    r3r4AutomaticApprovalAllowed: false,
  })) {
    if (gate.safety?.[field] !== expected) errors.push(`gate.safety.${field}=${expected} 필요`)
  }
  for (const [field, expected] of Object.entries({ providerCalls: 0, localModelCalls: 0, manualCandidateImports: 0, productionWrites: 0 })) {
    if (gate.executionEvidence?.[field] !== expected) errors.push(`executionEvidence.${field}=0 필요`)
  }

  scanForbiddenKeys(preparation, '$.preparation', errors)
  scanForbiddenKeys(gate, '$.gate', errors)
  scanForbiddenKeys(report, '$.report', errors)

  if (report.schemaVersion !== 1 || report.stage !== 'G2-preparation') errors.push('report 식별자 오류')
  if (report.pass !== true) errors.push('report.pass=true 필요')
  if (report.summary?.selected !== preparation.counts.selected || report.summary?.ready !== preparation.counts.ready) errors.push('report summary 불일치')
  if (report.executionEvidence?.providerCalls !== 0 || report.executionEvidence?.localModelCalls !== 0 || report.executionEvidence?.productionWrites !== 0) {
    errors.push('report 실제 실행 증거는 모두 0이어야 함')
  }

  if (preparation.packets.some((packet) => packet.contexts.some((context) => context.morphgntCrossCheck.lemmaPresent === false))) {
    warnings.push('일부 대표 문맥에서 MorphGNT 동일 lemma가 직접 매칭되지 않음; G3에서 토큰화 차이를 검토해야 함')
  }
  return { errors, warnings }
}

function runSelfTest() {
  const gate = buildExecutionGate()
  assert.equal(gate.executionAllowed, false)
  assert.equal(gate.killSwitchDefault, 'on')
  const forbidden = scanForbiddenKeys({ nested: { apiKey: 'x' } })
  assert.equal(forbidden.length, 1)
  console.log('✓ Luke G2 canary preparation verifier self-test passed')
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) return runSelfTest()
  const preparation = JSON.parse(readFileSync(args.packets, 'utf8'))
  const gate = JSON.parse(readFileSync(args.gate, 'utf8'))
  const report = JSON.parse(readFileSync(args.report, 'utf8'))
  const { errors, warnings } = validateLukeG2Preparation(preparation, gate, report)
  console.log('Luke G2 canary preparation verification')
  console.log(`  selected: ${preparation.counts?.selected}`)
  console.log(`  ready: ${preparation.counts?.ready}`)
  console.log(`  contexts: ${preparation.counts?.representativeContexts}`)
  console.log(`  warnings: ${warnings.length}`)
  for (const warning of warnings) console.log(`  - warning: ${warning}`)
  if (errors.length) {
    console.error(`✗ Luke G2 verification failed (${errors.length})`)
    for (const error of errors) console.error(`  - ${error}`)
    if (args.strict) process.exitCode = 1
    return
  }
  console.log('✓ Luke G2 canary preparation verification passed')
}

main()
