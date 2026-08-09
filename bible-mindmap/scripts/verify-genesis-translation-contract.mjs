#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  GENESIS_LEXICON_MANIFEST_VERSION,
  LEXICON_TRANSLATION_CONTRACT_VERSION,
  buildGenesisTranslationManifest,
  stableStringify,
} from './build-genesis-translation-manifest.mjs'

const DEFAULT_INVENTORY_PATH = 'reports/genesis-strong-inventory.json'
const DEFAULT_MANIFEST_PATH = 'reports/genesis-lexicon-translation-manifest.json'
const DEFAULT_SCHEMA_PATH = 'schemas/lexicon-translation-payload.schema.json'

function parseArgs(argv) {
  const args = {
    inventory: DEFAULT_INVENTORY_PATH,
    manifest: DEFAULT_MANIFEST_PATH,
    schema: DEFAULT_SCHEMA_PATH,
    strict: false,
    selfTest: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--strict') args.strict = true
    else if (arg === '--self-test') args.selfTest = true
    else if (arg === '--inventory') args.inventory = argv[++index]
    else if (arg.startsWith('--inventory=')) args.inventory = arg.slice(12)
    else if (arg === '--manifest') args.manifest = argv[++index]
    else if (arg.startsWith('--manifest=')) args.manifest = arg.slice(11)
    else if (arg === '--schema') args.schema = argv[++index]
    else if (arg.startsWith('--schema=')) args.schema = arg.slice(9)
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return args
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function validatePayloadSchema(schema, errors) {
  const requiredRoot = [
    'schemaVersion', 'id', 'strong', 'language', 'identity', 'source', 'sourceNodes',
    'drafts', 'references', 'adjudication', 'theologyAudit', 'quality', 'status', 'versions',
  ]
  if (!isObject(schema) || schema.type !== 'object') errors.push('payload schema 루트가 object가 아님')
  if (schema.additionalProperties !== false) errors.push('payload schema는 additionalProperties=false가 필요함')
  if (!Array.isArray(schema.required)) errors.push('payload schema required 배열 누락')
  else for (const field of requiredRoot) {
    if (!schema.required.includes(field)) errors.push(`payload schema 필수 필드 누락: ${field}`)
  }
  if (schema.properties?.schemaVersion?.const !== 1) errors.push('payload schemaVersion const=1 필요')
  if (schema.properties?.versions?.properties?.contract?.const !== LEXICON_TRANSLATION_CONTRACT_VERSION) {
    errors.push('payload schema contractVersion 불일치')
  }
  if (schema.properties?.theologyAudit?.properties?.framework?.const !== 'reformed-westminster-primary') {
    errors.push('개혁주의 신학 프레임워크 상수 누락')
  }
  const statusEnum = schema.properties?.status?.enum
  for (const status of ['queued', 'nvidia-draft', 'gpt-blind-draft', 'machine-verified', 'review-required', 'approved', 'blocked']) {
    if (!statusEnum?.includes(status)) errors.push(`payload status 누락: ${status}`)
  }
}

export function validateGenesisTranslationManifest(inventory, manifest, schema) {
  const errors = []
  const warnings = []
  validatePayloadSchema(schema, errors)

  if (manifest.schemaVersion !== GENESIS_LEXICON_MANIFEST_VERSION) errors.push('manifest schemaVersion 불일치')
  if (manifest.contractVersion !== LEXICON_TRANSLATION_CONTRACT_VERSION) errors.push('manifest contractVersion 불일치')
  if (manifest.manifestId !== 'genesis-lexicon-ko-g1') errors.push('manifestId 불일치')
  if (manifest.book?.id !== 'Gen' || manifest.book?.sourceLanguage !== 'hebrew') errors.push('창세기/히브리어 식별자 불일치')
  if (manifest.governance?.theologicalFramework !== 'reformed-westminster-primary') errors.push('개혁주의 신학 기준 누락')
  if (manifest.governance?.candidateOnly !== true) errors.push('candidateOnly=true 필요')
  if (manifest.governance?.productionWriteAllowed !== false) errors.push('G1에서는 productionWriteAllowed=false 필요')
  if (manifest.governance?.sourceNodeMutationAllowed !== false) errors.push('sourceNodeMutationAllowed=false 필요')

  if (!Array.isArray(manifest.items)) {
    errors.push('manifest.items 배열 누락')
    return { errors, warnings }
  }

  const seenStrong = new Set()
  const seenBatch = new Set()
  const seenPayload = new Set()
  let occurrenceSum = 0
  let translateCount = 0
  let reuseCount = 0
  let previousNumber = 0

  for (const [index, item] of manifest.items.entries()) {
    const where = `items[${index}]`
    if (!/^H[1-9]\d*$/.test(item.strong || '')) errors.push(`${where}: Strong 형식 오류`)
    const number = Number.parseInt(String(item.strong).slice(1), 10)
    if (number < previousNumber) errors.push(`${where}: Strong 정렬 순서 오류`)
    previousNumber = number

    if (seenStrong.has(item.strong)) errors.push(`${where}: 중복 Strong ${item.strong}`)
    seenStrong.add(item.strong)
    if (seenBatch.has(item.batchKey)) errors.push(`${where}: 중복 batchKey ${item.batchKey}`)
    seenBatch.add(item.batchKey)
    if (seenPayload.has(item.payloadPath)) errors.push(`${where}: 중복 payloadPath ${item.payloadPath}`)
    seenPayload.add(item.payloadPath)

    if (!Number.isInteger(item.occurrences) || item.occurrences < 1) errors.push(`${where}: occurrences 오류`)
    else occurrenceSum += item.occurrences
    if (!Array.isArray(item.chapters) || item.chapters.length < 1) errors.push(`${where}: chapters 누락`)
    if (!/^Gen\.\d+\.\d+$/.test(item.firstReference || '')) errors.push(`${where}: firstReference 오류`)
    if (item.riskTier !== 'unclassified') errors.push(`${where}: G1 riskTier는 unclassified여야 함`)
    if (item.batchKey !== `genesis-${item.strong}`) errors.push(`${where}: batchKey 불일치`)
    if (!item.payloadPath?.endsWith(`/${item.strong}.json`)) errors.push(`${where}: payloadPath 불일치`)

    if (item.coverage === 'missing') {
      translateCount += 1
      if (item.action !== 'translate' || item.status !== 'queued') {
        errors.push(`${where}: missing 항목은 translate/queued 필요`)
      }
    } else {
      reuseCount += 1
      if (item.action !== 'reuse-existing' || item.status !== 'existing') {
        errors.push(`${where}: 기존 보유 항목은 reuse-existing/existing 필요`)
      }
    }
  }

  const expectedCounts = {
    chapters: inventory.chaptersFound.length,
    verses: inventory.verseCount,
    words: inventory.wordCount,
    strongAssignments: inventory.strongAssignmentCount,
    uniqueStrong: inventory.uniqueStrongCount,
    reuseExisting: inventory.coverage.activeTotal,
    translationRequired: inventory.coverage.missing,
  }
  for (const [key, expected] of Object.entries(expectedCounts)) {
    if (manifest.counts?.[key] !== expected) errors.push(`counts.${key}: ${manifest.counts?.[key]} != ${expected}`)
  }
  if (manifest.items.length !== inventory.uniqueStrongCount) errors.push('items 수와 uniqueStrongCount 불일치')
  if (occurrenceSum !== inventory.strongAssignmentCount) errors.push('occurrences 합과 Strong 출현 할당 수 불일치')
  if (translateCount !== inventory.coverage.missing) errors.push('translate 항목 수 불일치')
  if (reuseCount !== inventory.coverage.activeTotal) errors.push('reuse-existing 항목 수 불일치')

  const expected = buildGenesisTranslationManifest(inventory)
  if (stableStringify(manifest) !== stableStringify(expected)) {
    errors.push('manifest가 동일 inventory에서 결정적으로 재생성된 결과와 다름')
  }

  if (inventory.coverage.missing === 0) warnings.push('신규 번역 대상이 0개임')
  return { errors, warnings }
}

function runSelfTest() {
  const inventory = {
    schemaVersion: 1,
    source: 'fixture',
    expectedChapters: 50,
    chaptersFound: [1],
    verseCount: 1,
    wordCount: 2,
    strongAssignmentCount: 2,
    uniqueStrongCount: 2,
    coverage: { base: 1, activeExtension: 0, activeTotal: 1, missing: 1 },
    entries: [
      { strong: 'H430', occurrences: 1, chapters: [1], firstReference: 'Gen.1.1', sampleLemma: '0430', sampleSurface: 'אֱלֹהִים', coverage: 'base' },
      { strong: 'H1254', occurrences: 1, chapters: [1], firstReference: 'Gen.1.1', sampleLemma: '01254', sampleSurface: 'בָּרָא', coverage: 'missing' },
    ],
  }
  const schema = {
    type: 'object',
    additionalProperties: false,
    required: ['schemaVersion', 'id', 'strong', 'language', 'identity', 'source', 'sourceNodes', 'drafts', 'references', 'adjudication', 'theologyAudit', 'quality', 'status', 'versions'],
    properties: {
      schemaVersion: { const: 1 },
      versions: { properties: { contract: { const: LEXICON_TRANSLATION_CONTRACT_VERSION } } },
      theologyAudit: { properties: { framework: { const: 'reformed-westminster-primary' } } },
      status: { enum: ['queued', 'nvidia-draft', 'gpt-blind-draft', 'machine-verified', 'review-required', 'approved', 'blocked'] },
    },
  }
  const manifest = buildGenesisTranslationManifest(inventory)
  const valid = validateGenesisTranslationManifest(inventory, manifest, schema)
  assert.deepEqual(valid.errors, [])

  const invalid = structuredClone(manifest)
  invalid.items[1].status = 'existing'
  assert(validateGenesisTranslationManifest(inventory, invalid, schema).errors.length > 0)
  console.log('✓ Genesis translation contract verifier self-test passed')
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) return runSelfTest()

  const inventory = JSON.parse(readFileSync(resolve(process.cwd(), args.inventory), 'utf8'))
  const manifest = JSON.parse(readFileSync(resolve(process.cwd(), args.manifest), 'utf8'))
  const schema = JSON.parse(readFileSync(resolve(process.cwd(), args.schema), 'utf8'))
  const { errors, warnings } = validateGenesisTranslationManifest(inventory, manifest, schema)

  console.log('Genesis lexicon G1 contract verification')
  console.log(`  unique Strong: ${manifest.counts?.uniqueStrong}`)
  console.log(`  reuse existing: ${manifest.counts?.reuseExisting}`)
  console.log(`  translation required: ${manifest.counts?.translationRequired}`)
  console.log(`  warnings: ${warnings.length}`)
  for (const warning of warnings) console.log(`  - warning: ${warning}`)

  if (errors.length) {
    console.error(`✗ G1 contract verification failed (${errors.length})`)
    for (const error of errors) console.error(`  - ${error}`)
    if (args.strict) process.exitCode = 1
    return
  }
  console.log('✓ G1 contract verification passed')
}

main()
