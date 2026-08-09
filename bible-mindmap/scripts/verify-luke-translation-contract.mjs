#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  COMMON_PAYLOAD_CONTRACT_VERSION,
  DEFAULT_INVENTORY_PATH,
  DEFAULT_MANIFEST_PATH,
  DEFAULT_REPORT_PATH,
  LUKE_G1_CONTRACT_VERSION,
  LUKE_G1_MANIFEST_VERSION,
  buildLukeG1Report,
  buildLukeTranslationManifest,
  stableStringify,
} from './build-luke-translation-manifest.mjs'

const DEFAULT_SCHEMA_PATH = resolve(process.cwd(), 'schemas/lexicon-translation-payload.schema.json')
const ALLOWED_RISK_SIGNALS = new Set([
  'THEOLOGY_KEYWORD',
  'MULTIPLE_LEMMAS',
  'MULTIPLE_TRANSLITERATIONS',
  'POLYSEMOUS_GLOSS_SET',
  'MORPHOLOGY_DIVERSE',
  'PROPER_NAME',
  'HIGH_FREQUENCY',
  'EXISTING_KOREAN_REUSE',
])
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

function parseArgs(argv) {
  const args = {
    inventory: DEFAULT_INVENTORY_PATH,
    manifest: DEFAULT_MANIFEST_PATH,
    report: DEFAULT_REPORT_PATH,
    schema: DEFAULT_SCHEMA_PATH,
    strict: false,
    selfTest: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--strict') args.strict = true
    else if (arg === '--self-test') args.selfTest = true
    else if (arg === '--inventory') args.inventory = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--inventory=')) args.inventory = resolve(process.cwd(), arg.slice(12))
    else if (arg === '--manifest') args.manifest = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--manifest=')) args.manifest = resolve(process.cwd(), arg.slice(11))
    else if (arg === '--report') args.report = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--report=')) args.report = resolve(process.cwd(), arg.slice(9))
    else if (arg === '--schema') args.schema = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--schema=')) args.schema = resolve(process.cwd(), arg.slice(9))
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return args
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function strongNumber(strong) {
  return Number.parseInt(String(strong).replace(/^G/u, ''), 10)
}

function validateCommonPayloadSchema(schema, errors) {
  const requiredRoot = [
    'schemaVersion', 'id', 'strong', 'language', 'identity', 'source', 'sourceNodes',
    'drafts', 'references', 'adjudication', 'theologyAudit', 'quality', 'status', 'versions',
  ]
  if (!isObject(schema) || schema.type !== 'object') errors.push('공통 payload schema 루트가 object가 아님')
  if (schema.additionalProperties !== false) errors.push('공통 payload schema는 additionalProperties=false 필요')
  if (!Array.isArray(schema.required)) errors.push('공통 payload schema required 배열 누락')
  else for (const field of requiredRoot) {
    if (!schema.required.includes(field)) errors.push(`공통 payload schema 필수 필드 누락: ${field}`)
  }
  if (schema.properties?.schemaVersion?.const !== 1) errors.push('공통 payload schemaVersion const=1 필요')
  if (schema.properties?.versions?.properties?.contract?.const !== COMMON_PAYLOAD_CONTRACT_VERSION) {
    errors.push('공통 payload contractVersion 불일치')
  }
  const languageEnum = schema.properties?.language?.enum || []
  if (!languageEnum.includes('greek')) errors.push('공통 payload language enum에 greek 누락')
  if (schema.properties?.theologyAudit?.properties?.framework?.const !== 'reformed-westminster-primary') {
    errors.push('공통 payload 개혁주의 신학 프레임워크 누락')
  }
}

function validateBatchOrder(manifest, errors) {
  const flattened = []
  let expectedBatchNumber = 1
  for (const [batchIndex, batch] of manifest.batches.entries()) {
    const where = `batches[${batchIndex}]`
    const expectedId = `luke-g1-b${String(expectedBatchNumber).padStart(3, '0')}`
    if (batch.batchId !== expectedId) errors.push(`${where}: batchId ${batch.batchId} != ${expectedId}`)
    expectedBatchNumber += 1
    if (!Number.isInteger(batch.itemCount) || batch.itemCount < 1 || batch.itemCount > manifest.counts.batchSize) {
      errors.push(`${where}: itemCount 범위 오류`)
    }
    if (!Array.isArray(batch.strongs) || batch.strongs.length !== batch.itemCount) {
      errors.push(`${where}: strongs 수와 itemCount 불일치`)
      continue
    }
    if (batch.providerExecutionAllowed !== false) errors.push(`${where}: G1 providerExecutionAllowed=false 필요`)
    if (batch.status !== 'planned') errors.push(`${where}: G1 batch status는 planned여야 함`)
    flattened.push(...batch.strongs)
  }

  const queued = manifest.items
    .filter((item) => item.routing.action === 'translate')
    .sort((left, right) => {
      const priorityDelta = PRIORITY_ORDER[left.routing.priority] - PRIORITY_ORDER[right.routing.priority]
      return priorityDelta || right.usage.tokenCount - left.usage.tokenCount || strongNumber(left.strong) - strongNumber(right.strong)
    })
    .map((item) => item.strong)
  if (stableStringify(flattened) !== stableStringify(queued)) {
    errors.push('배치 Strong 순서가 high→medium→low·빈도 내림차순·Strong 오름차순 계약과 다름')
  }
  if (new Set(flattened).size !== flattened.length) errors.push('배치 간 중복 Strong 존재')
}

export function validateLukeTranslationContract(inventory, manifest, report, schema) {
  const errors = []
  const warnings = []
  validateCommonPayloadSchema(schema, errors)

  if (manifest.schemaVersion !== LUKE_G1_MANIFEST_VERSION) errors.push('manifest schemaVersion 불일치')
  if (manifest.manifestId !== 'luke-lexicon-ko-g1') errors.push('manifestId 불일치')
  if (manifest.contractVersion !== LUKE_G1_CONTRACT_VERSION) errors.push('누가복음 G1 contractVersion 불일치')
  if (manifest.commonPayloadContractVersion !== COMMON_PAYLOAD_CONTRACT_VERSION) errors.push('공통 payload 계약 연결 불일치')
  if (manifest.book?.id !== 'Luke' || manifest.book?.sourceLanguage !== 'greek') errors.push('누가복음/헬라어 식별자 불일치')
  if (manifest.governance?.theologicalFramework !== 'reformed-westminster-primary') errors.push('개혁주의 신학 기준 누락')
  if (manifest.governance?.candidateOnly !== true) errors.push('candidateOnly=true 필요')
  if (manifest.governance?.productionWriteAllowed !== false) errors.push('G1 productionWriteAllowed=false 필요')
  if (manifest.governance?.providerCallsAllowed !== false) errors.push('G1 providerCallsAllowed=false 필요')
  if (manifest.governance?.sourceNodeMutationAllowed !== false) errors.push('sourceNodeMutationAllowed=false 필요')
  if (manifest.governance?.finalHumanApprovalRequired !== true) errors.push('finalHumanApprovalRequired=true 필요')

  if (manifest.payloadContract?.schemaPath !== 'schemas/lexicon-translation-payload.schema.json') {
    errors.push('공통 candidate payload schema 경로 불일치')
  }
  for (const field of ['identity.lemma', 'identity.transliteration', 'identity.transliterationKo', 'identity.partOfSpeech', 'sourceNodes', 'references.bibleUsage', 'theologyAudit.riskTier']) {
    if (!manifest.payloadContract?.requiredInputLayers?.includes(field)) errors.push(`payload requiredInputLayers 누락: ${field}`)
  }

  if (manifest.auditContract?.appendOnly !== true) errors.push('감사 로그 appendOnly=true 필요')
  if (manifest.auditContract?.sourceTextMutationAllowed !== false) errors.push('감사 계약 sourceTextMutationAllowed=false 필요')
  for (const field of ['eventId', 'strong', 'stage', 'actorType', 'action', 'inputHash', 'outputHash', 'decision', 'reasonCodes', 'createdAt']) {
    if (!manifest.auditContract?.requiredEventFields?.includes(field)) errors.push(`감사 이벤트 필드 누락: ${field}`)
  }
  if (manifest.reprocessingPolicy?.sameInputSameFailureAutomaticRetryAllowed !== false) {
    errors.push('동일 입력·동일 실패 자동 재시도 금지 필요')
  }
  if (!Number.isInteger(manifest.reprocessingPolicy?.maxAutomaticAttempts)
    || manifest.reprocessingPolicy.maxAutomaticAttempts < 1
    || manifest.reprocessingPolicy.maxAutomaticAttempts > 3) {
    errors.push('maxAutomaticAttempts는 1~3 필요')
  }
  for (const trigger of ['source-digest-changed', 'contract-version-changed', 'reviewer-requested-retranslation']) {
    if (!manifest.reprocessingPolicy?.allowedTriggers?.includes(trigger)) errors.push(`재처리 trigger 누락: ${trigger}`)
  }

  if (!Array.isArray(manifest.items)) {
    errors.push('manifest.items 배열 누락')
    return { errors, warnings }
  }
  if (!Array.isArray(manifest.batches)) errors.push('manifest.batches 배열 누락')

  const inventoryByStrong = new Map(inventory.strongs.map((entry) => [entry.strong, entry]))
  const queueByStrong = new Map(inventory.newTranslationQueue.map((entry) => [entry.strong, entry]))
  const seenStrong = new Set()
  const seenPayload = new Set()
  let previousStrongNumber = 0
  let tokenSum = 0
  let reuseCount = 0
  let translateCount = 0
  const priorityCounts = { high: 0, medium: 0, low: 0 }

  for (const [index, item] of manifest.items.entries()) {
    const where = `items[${index}]`
    if (!/^G[1-9]\d*$/u.test(item.strong || '')) errors.push(`${where}: Greek Strong 형식 오류`)
    const number = strongNumber(item.strong)
    if (number < previousStrongNumber) errors.push(`${where}: Strong 오름차순 오류`)
    previousStrongNumber = number
    if (seenStrong.has(item.strong)) errors.push(`${where}: 중복 Strong ${item.strong}`)
    seenStrong.add(item.strong)
    if (seenPayload.has(item.routing?.payloadPath)) errors.push(`${where}: 중복 payloadPath`)
    seenPayload.add(item.routing?.payloadPath)

    const source = inventoryByStrong.get(item.strong)
    if (!source) {
      errors.push(`${where}: G0 inventory에 없는 Strong`)
      continue
    }
    if (item.language !== 'greek') errors.push(`${where}: language=greek 필요`)
    if (item.usage?.tokenCount !== source.tokenCount) errors.push(`${where}: tokenCount 불일치`)
    if (item.usage?.verseCount !== source.verseCount) errors.push(`${where}: verseCount 불일치`)
    if (item.usage?.chapterCount !== source.chapterCount) errors.push(`${where}: chapterCount 불일치`)
    if (stableStringify(item.usage?.chapters) !== stableStringify(source.chapters)) errors.push(`${where}: chapters 불일치`)
    if (item.usage?.firstRef !== source.firstRef || item.usage?.firstTokenId !== source.firstTokenId) {
      errors.push(`${where}: 첫 문맥 포인터 불일치`)
    }
    tokenSum += item.usage?.tokenCount || 0

    if (!Array.isArray(item.identity?.lemmas) || item.identity.lemmas.length < 1) errors.push(`${where}: lemmas 누락`)
    if (!Array.isArray(item.sourceEvidence?.morphologyCodes) || item.sourceEvidence.morphologyCodes.length < 1) {
      errors.push(`${where}: morphologyCodes 누락`)
    }
    if (!item.sourceEvidence?.sourceFingerprint?.startsWith('sha256:')) errors.push(`${where}: sourceFingerprint 누락`)
    if (!item.contextPlan?.packetPath?.endsWith(`/${item.strong}.json`)) errors.push(`${where}: context packetPath 불일치`)
    if (item.contextPlan?.status !== 'not-generated') errors.push(`${where}: G1 context status는 not-generated 필요`)

    if (item.theologyAudit?.framework !== 'reformed-westminster-primary') errors.push(`${where}: 신학 감사 프레임 누락`)
    if (item.theologyAudit?.riskTier !== 'unclassified') errors.push(`${where}: G1 riskTier는 unclassified 필요`)
    if (item.theologyAudit?.finalHumanApprovalRequired !== true) errors.push(`${where}: 최종 사람 승인 Gate 누락`)
    for (const signal of item.theologyAudit?.signals || []) {
      if (!ALLOWED_RISK_SIGNALS.has(signal)) errors.push(`${where}: 허용되지 않은 risk signal ${signal}`)
    }
    if (item.audit?.contractVersion !== LUKE_G1_CONTRACT_VERSION) errors.push(`${where}: audit contractVersion 불일치`)
    if (item.audit?.retryCount !== 0) errors.push(`${where}: G1 retryCount=0 필요`)

    if (source.existingKorean) {
      reuseCount += 1
      if (item.routing?.action !== 'reuse-existing' || item.routing?.status !== 'existing') {
        errors.push(`${where}: 기존 한글 항목은 reuse-existing/existing 필요`)
      }
      if (item.routing?.priority !== 'reuse') errors.push(`${where}: 재사용 priority는 reuse 필요`)
      if (item.routing?.batchId !== null || item.routing?.batchOrdinal !== null) errors.push(`${where}: 재사용 항목은 신규 번역 배치 금지`)
      if (item.reuse?.eligible !== true || item.reuse?.source !== 'KOREAN_GLOSS_ACTIVE') errors.push(`${where}: 재사용 출처 계약 오류`)
    } else {
      translateCount += 1
      const queueEntry = queueByStrong.get(item.strong)
      if (!queueEntry) errors.push(`${where}: 신규 번역 큐 누락`)
      if (item.routing?.action !== 'translate' || item.routing?.status !== 'queued') {
        errors.push(`${where}: 신규 항목은 translate/queued 필요`)
      }
      if (item.routing?.priority !== queueEntry?.priority) errors.push(`${where}: G0 priority 불일치`)
      if (!item.routing?.batchId || !Number.isInteger(item.routing?.batchOrdinal)) errors.push(`${where}: 결정적 배치 할당 누락`)
      if (Object.hasOwn(priorityCounts, item.routing?.priority)) priorityCounts[item.routing.priority] += 1
      if (item.reuse?.eligible !== false || item.reuse?.source !== null) errors.push(`${where}: 신규 항목 reuse 계약 오류`)
    }
    if (!item.routing?.payloadPath?.endsWith(`/${item.strong}.json`)) errors.push(`${where}: payloadPath 불일치`)
  }

  const s = inventory.summary
  const expectedCounts = {
    chapters: s.chapters,
    verses: s.verses,
    tokens: s.tagntSblTokenCount,
    uniqueStrong: s.tagntUniqueStrongCount,
    uniqueLemma: s.tagntUniqueLemmaCount,
    reuseExisting: s.existingKoreanStrongCount,
    translationRequired: s.newTranslationStrongCount,
  }
  for (const [key, expected] of Object.entries(expectedCounts)) {
    if (manifest.counts?.[key] !== expected) errors.push(`counts.${key}: ${manifest.counts?.[key]} != ${expected}`)
  }
  if (manifest.items.length !== s.tagntUniqueStrongCount) errors.push('items 수와 고유 Strong 수 불일치')
  if (tokenSum !== s.tagntSblTokenCount) errors.push('item tokenCount 합과 TAGNT 토큰 수 불일치')
  if (reuseCount !== s.existingKoreanStrongCount) errors.push('재사용 항목 수 불일치')
  if (translateCount !== s.newTranslationStrongCount) errors.push('신규 번역 항목 수 불일치')
  if (stableStringify(priorityCounts) !== stableStringify(manifest.counts?.priorityCounts)) errors.push('priorityCounts 불일치')

  validateBatchOrder(manifest, errors)

  const expectedManifest = buildLukeTranslationManifest(inventory, { batchSize: manifest.counts?.batchSize })
  if (stableStringify(manifest) !== stableStringify(expectedManifest)) {
    errors.push('manifest가 동일 G0 inventory에서 결정적으로 재생성된 결과와 다름')
  }
  const expectedReport = buildLukeG1Report(inventory, expectedManifest)
  if (stableStringify(report) !== stableStringify(expectedReport)) errors.push('G1 report가 결정적 재생성 결과와 다름')
  if (report.pass !== true) errors.push('G1 report.pass=true 필요')
  if (report.summary?.providerCallCount !== 0 || report.summary?.productionWriteCount !== 0) {
    errors.push('G1 실제 provider 호출·production write는 0이어야 함')
  }
  if (report.diagnostics?.unbatchedTranslationCount !== 0) errors.push('미배치 신규 번역 항목 존재')
  if (report.diagnostics?.reuseWithBatchCount !== 0) errors.push('재사용 항목이 신규 번역 배치에 포함됨')

  if (manifest.counts.translationRequired === 0) warnings.push('신규 번역 대상이 0개임')
  return { errors, warnings }
}

function fixtureInventory() {
  return {
    schemaVersion: 1,
    book: 'Luke',
    generatedDate: '2026-08-09',
    sources: { tagnt: { id: 'tagnt' }, morphgnt: { id: 'morphgnt' }, koreanGloss: { id: 'ko' } },
    summary: {
      chapters: 24,
      verses: 2,
      tagntSblTokenCount: 8,
      tagntUniqueStrongCount: 3,
      tagntUniqueLemmaCount: 3,
      existingKoreanStrongCount: 1,
      newTranslationStrongCount: 2,
    },
    strongs: [
      {
        strong: 'G32', tokenCount: 2, verseCount: 1, chapterCount: 1, chapters: [1],
        lemmas: ['ἄγγελος'], transliterations: ['angelos'], glosses: ['angel'],
        morphologies: ['N-NSM-P'], firstRef: 'Luke 1:11', firstTokenId: 'Luke.1.11.4',
        existingKorean: false, existingKoreanGloss: null,
      },
      {
        strong: 'G932', tokenCount: 1, verseCount: 1, chapterCount: 1, chapters: [1],
        lemmas: ['βασιλεία'], transliterations: ['basileia'], glosses: ['kingdom'],
        morphologies: ['N-NSF'], firstRef: 'Luke 1:33', firstTokenId: 'Luke.1.33.9',
        existingKorean: true, existingKoreanGloss: { glossKo: '왕권, 나라', translitKo: '바실레이아', status: 'baseline' },
      },
      {
        strong: 'G3588', tokenCount: 5, verseCount: 2, chapterCount: 1, chapters: [1],
        lemmas: ['ὁ'], transliterations: ['ho'], glosses: ['the'],
        morphologies: ['T-GSM', 'T-NSM'], firstRef: 'Luke 1:1', firstTokenId: 'Luke.1.1.7',
        existingKorean: false, existingKoreanGloss: null,
      },
    ],
    newTranslationQueue: [
      { strong: 'G32', priority: 'low' },
      { strong: 'G3588', priority: 'low' },
    ],
  }
}

function fixtureSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'schemaVersion', 'id', 'strong', 'language', 'identity', 'source', 'sourceNodes',
      'drafts', 'references', 'adjudication', 'theologyAudit', 'quality', 'status', 'versions',
    ],
    properties: {
      schemaVersion: { const: 1 },
      language: { enum: ['hebrew', 'aramaic', 'greek'] },
      versions: { properties: { contract: { const: COMMON_PAYLOAD_CONTRACT_VERSION } } },
      theologyAudit: { properties: { framework: { const: 'reformed-westminster-primary' } } },
    },
  }
}

function runSelfTest() {
  const inventory = fixtureInventory()
  const manifest = buildLukeTranslationManifest(inventory, { batchSize: 1 })
  const report = buildLukeG1Report(inventory, manifest)
  const valid = validateLukeTranslationContract(inventory, manifest, report, fixtureSchema())
  assert.deepEqual(valid.errors, [])

  const invalid = structuredClone(manifest)
  invalid.items.find((item) => item.routing.action === 'translate').routing.status = 'existing'
  const invalidReport = buildLukeG1Report(inventory, invalid)
  assert(validateLukeTranslationContract(inventory, invalid, invalidReport, fixtureSchema()).errors.length > 0)
  console.log('✓ Luke G1 translation contract verifier self-test passed')
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) return runSelfTest()

  const inventory = JSON.parse(readFileSync(args.inventory, 'utf8'))
  const manifest = JSON.parse(readFileSync(args.manifest, 'utf8'))
  const report = JSON.parse(readFileSync(args.report, 'utf8'))
  const schema = JSON.parse(readFileSync(args.schema, 'utf8'))
  const { errors, warnings } = validateLukeTranslationContract(inventory, manifest, report, schema)

  console.log('Luke lexicon G1 contract verification')
  console.log(`  unique Strong: ${manifest.counts?.uniqueStrong}`)
  console.log(`  reuse existing: ${manifest.counts?.reuseExisting}`)
  console.log(`  translation required: ${manifest.counts?.translationRequired}`)
  console.log(`  batches: ${manifest.counts?.batches}`)
  console.log(`  warnings: ${warnings.length}`)
  for (const warning of warnings) console.log(`  - warning: ${warning}`)

  if (errors.length) {
    console.error(`✗ Luke G1 contract verification failed (${errors.length})`)
    for (const error of errors) console.error(`  - ${error}`)
    if (args.strict) process.exitCode = 1
    return
  }
  console.log('✓ Luke G1 contract verification passed')
}

main()
