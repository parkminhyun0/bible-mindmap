#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { buildGenesisCalibrationBatch } from './build-genesis-g2-calibration-batch.mjs'
import { normalizeRegistry } from './lib/source-registry-adapter.mjs'

const DEFAULT_MANIFEST_PATH = 'reports/genesis-lexicon-translation-manifest.json'
const DEFAULT_REGISTRY_PATH = 'data/lexicon/source-registry.json'
const DEFAULT_BATCH_PATH = 'reports/genesis-g2-calibration-batch.json'
const EXPECTED_BATCH_SIZE = 100
const EXPECTED_QUOTAS = Object.freeze({
  'core-theology-context': 25,
  'existing-control': 10,
  'high-frequency-missing': 25,
  'medium-frequency-missing': 20,
  'low-frequency-missing': 20,
})

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
  }
  return value
}

function parseArgs(argv) {
  const args = {
    manifest: DEFAULT_MANIFEST_PATH,
    registry: DEFAULT_REGISTRY_PATH,
    batch: DEFAULT_BATCH_PATH,
    strict: false,
    selfTest: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--strict') args.strict = true
    else if (arg === '--self-test') args.selfTest = true
    else if (arg === '--manifest') args.manifest = argv[++index]
    else if (arg.startsWith('--manifest=')) args.manifest = arg.slice(11)
    else if (arg === '--registry') args.registry = argv[++index]
    else if (arg.startsWith('--registry=')) args.registry = arg.slice(11)
    else if (arg === '--batch') args.batch = argv[++index]
    else if (arg.startsWith('--batch=')) args.batch = arg.slice(8)
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return args
}

function validateRegistry(registry, errors) {
  if (registry?.schemaVersion !== 1) errors.push('source registry schemaVersion=1 필요')
  if (!registry?.policyVersion) errors.push('source registry policyVersion 누락')
  if (!Array.isArray(registry?.sources)) {
    errors.push('source registry sources 배열 누락')
    return
  }
  const ids = new Set()
  for (const [index, source] of registry.sources.entries()) {
    const where = `sources[${index}]`
    if (!source.id || ids.has(source.id)) errors.push(`${where}: source id 누락 또는 중복`)
    ids.add(source.id)
    if (!source.role) errors.push(`${where}: role 누락`)
    if (!['verified-public-or-permitted', 'internal-validation-only', 'unknown', 'prohibited'].includes(source.licenseStatus)) {
      errors.push(`${where}: licenseStatus 오류`)
    }
    if (!Array.isArray(source.allowedUses)) errors.push(`${where}: allowedUses 배열 누락`)
  }

  const primary = registry.sources.find((source) => source.id === 'openscriptures-hebrewlexicon-bdb')
  if (!primary) errors.push('Open Scriptures BDB primary source 누락')
  else {
    if (primary.role !== 'primary-source') errors.push('Open Scriptures BDB role은 primary-source여야 함')
    if (primary.licenseStatus !== 'verified-public-or-permitted') errors.push('Open Scriptures BDB 라이선스 Gate 미통과')
    for (const file of ['BrownDriverBriggs.xml', 'LexicalIndex.xml', 'BDBPartsOfSpeech.xml']) {
      if (!primary.files?.includes(file)) errors.push(`Open Scriptures BDB 필수 파일 누락: ${file}`)
    }
    for (const use of ['download', 'parse', 'ai-input', 'derived-translation']) {
      if (!primary.allowedUses.includes(use)) errors.push(`Open Scriptures BDB 허용 용도 누락: ${use}`)
    }
  }

  const korean = registry.sources.find((source) => source.id === 'korean-ot-nt-dictionary')
  if (!korean) errors.push('한국어 구약·신약사전 대조군 등록 누락')
  else if (korean.licenseStatus === 'unknown' && korean.allowedUses.length !== 0) {
    errors.push('라이선스 미확정 한국어 사전은 allowedUses가 비어 있어야 함')
  }
}

export function validateGenesisG2CalibrationBatch(manifest, registryInput, batch) {
  const errors = []
  const warnings = []
  const registry = normalizeRegistry(registryInput)
  validateRegistry(registry, errors)

  if (batch?.schemaVersion !== 1) errors.push('batch schemaVersion=1 필요')
  if (batch?.batchId !== 'genesis-g2-calibration-100-v1') errors.push('batchId 불일치')
  if (batch?.contractVersion !== manifest?.contractVersion) errors.push('G1 contractVersion 불일치')
  if (batch?.sourcePolicyVersion !== registry?.policyVersion) errors.push('sourcePolicyVersion 불일치')
  if (batch?.book?.id !== 'Gen' || batch?.book?.sourceLanguage !== 'hebrew') errors.push('창세기·히브리어 식별자 불일치')

  const governance = batch?.governance
  if (governance?.theologicalFramework !== 'reformed-westminster-primary') errors.push('개혁주의 신학 기준 누락')
  if (governance?.candidateOnly !== true) errors.push('candidateOnly=true 필요')
  if (governance?.productionWriteAllowed !== false) errors.push('G2 교정 배치는 productionWriteAllowed=false 필요')
  if (governance?.blindModelRunsRequired !== true) errors.push('blindModelRunsRequired=true 필요')
  if (governance?.sourceNodeMutationAllowed !== false) errors.push('sourceNodeMutationAllowed=false 필요')
  if (governance?.riskTierBeforeTranslation !== 'unclassified') errors.push('번역 전 riskTier는 unclassified여야 함')

  if (batch?.sourceGate?.primarySourceReady !== true) errors.push('BDB primary source Gate 미통과')
  if (batch?.sourceGate?.translationCandidateAllowed !== true) errors.push('translationCandidateAllowed=true 필요')
  if (batch?.sourceGate?.koreanControlReady !== false) errors.push('현재 한국어 사전 대조군은 미확정 상태여야 함')
  if (batch?.sourceGate?.finalApprovalAllowed !== false) errors.push('한국어 사전 라이선스 확정 전 finalApprovalAllowed=false 필요')

  if (!Array.isArray(batch?.items)) {
    errors.push('batch.items 배열 누락')
    return { errors, warnings }
  }
  if (batch.items.length !== EXPECTED_BATCH_SIZE) errors.push(`교정 배치 수량 ${batch.items.length} != ${EXPECTED_BATCH_SIZE}`)

  const manifestByStrong = new Map(manifest.items.map((item) => [item.strong, item]))
  const seenStrong = new Set()
  const seenPayloadPath = new Set()
  const categories = Object.fromEntries(Object.keys(EXPECTED_QUOTAS).map((category) => [category, 0]))
  let existingControls = 0
  let translationRequired = 0

  for (const [index, item] of batch.items.entries()) {
    const where = `items[${index}]`
    if (item.order !== index + 1) errors.push(`${where}: order 불일치`)
    if (!/^H[1-9]\d*$/.test(item.strong || '')) errors.push(`${where}: Strong 형식 오류`)
    if (seenStrong.has(item.strong)) errors.push(`${where}: 중복 Strong ${item.strong}`)
    seenStrong.add(item.strong)
    if (seenPayloadPath.has(item.payloadPath)) errors.push(`${where}: 중복 payloadPath ${item.payloadPath}`)
    seenPayloadPath.add(item.payloadPath)

    const sourceItem = manifestByStrong.get(item.strong)
    if (!sourceItem) {
      errors.push(`${where}: G1 manifest에 없는 Strong ${item.strong}`)
      continue
    }
    for (const field of ['occurrences', 'firstReference', 'coverage', 'payloadPath']) {
      if (item[field] !== sourceItem[field]) errors.push(`${where}: G1 manifest ${field} 불일치`)
    }
    if (JSON.stringify(item.chapters) !== JSON.stringify(sourceItem.chapters)) errors.push(`${where}: chapters 불일치`)

    if (!(item.category in categories)) errors.push(`${where}: 허용되지 않은 category ${item.category}`)
    else categories[item.category] += 1

    if (item.category === 'existing-control' && item.coverage === 'missing') {
      errors.push(`${where}: existing-control은 기존 번역 보유 항목이어야 함`)
    }
    if (['high-frequency-missing', 'medium-frequency-missing', 'low-frequency-missing'].includes(item.category)
      && item.coverage !== 'missing') {
      errors.push(`${where}: missing 빈도군은 신규 번역 대상이어야 함`)
    }

    if (item.coverage === 'missing') translationRequired += 1
    else existingControls += 1
    if (item.sourcePacketStatus !== 'pending-bdb-materialization') errors.push(`${where}: BDB materialization 전 상태 오류`)
    if (item.modelPlan?.nvidia !== 'blind-draft-a' || item.modelPlan?.gpt !== 'blind-draft-b') {
      errors.push(`${where}: NVIDIA/GPT 블라인드 역할 불일치`)
    }
    if (item.modelPlan?.crossVisibilityBeforeComparison !== false) {
      errors.push(`${where}: 모델 간 사전 결과 공개 금지`)
    }
  }

  for (const [category, expected] of Object.entries(EXPECTED_QUOTAS)) {
    if (categories[category] !== expected) errors.push(`category ${category}: ${categories[category]} != ${expected}`)
    if (batch.counts?.categories?.[category] !== expected) errors.push(`counts.categories.${category} 불일치`)
  }
  if (batch.counts?.selected !== EXPECTED_BATCH_SIZE) errors.push('counts.selected 불일치')
  if (batch.counts?.existingControls !== existingControls) errors.push('counts.existingControls 불일치')
  if (batch.counts?.translationRequired !== translationRequired) errors.push('counts.translationRequired 불일치')

  const expected = buildGenesisCalibrationBatch(manifest, registry)
  if (JSON.stringify(stable(batch)) !== JSON.stringify(stable(expected))) {
    errors.push('동일 G1 manifest와 source registry에서 결정적으로 재생성된 결과와 다름')
  }

  if (existingControls < EXPECTED_QUOTAS['existing-control']) warnings.push('핵심어군 외 기존 대조군 수가 적음')
  return { errors, warnings }
}

function fixture() {
  const items = Array.from({ length: 220 }, (_, index) => {
    const number = index + 1
    return {
      strong: `H${number}`,
      occurrences: 221 - number,
      chapters: [1 + (number % 50)],
      firstReference: `Gen.${1 + (number % 50)}.1`,
      coverage: number <= 80 ? 'base' : 'missing',
      payloadPath: `data/lexicon-candidates/hebrew/H0000/H${number}.json`,
    }
  })
  return {
    manifest: {
      manifestId: 'genesis-lexicon-ko-g1',
      contractVersion: '2026.08.09-g1.1',
      book: { id: 'Gen', nameKo: '창세기', testament: 'OT', sourceLanguage: 'hebrew' },
      items,
    },
    registry: {
      schemaVersion: 1,
      policyVersion: 'test-g2',
      sources: [
        {
          id: 'openscriptures-hebrewlexicon-bdb',
          role: 'primary-source',
          licenseStatus: 'verified-public-or-permitted',
          files: ['BrownDriverBriggs.xml', 'LexicalIndex.xml', 'BDBPartsOfSpeech.xml'],
          allowedUses: ['download', 'parse', 'ai-input', 'derived-translation'],
        },
        {
          id: 'korean-ot-nt-dictionary',
          role: 'internal-validation',
          licenseStatus: 'unknown',
          files: [],
          allowedUses: [],
        },
      ],
    },
  }
}

function runSelfTest() {
  const { manifest, registry } = fixture()
  const batch = buildGenesisCalibrationBatch(manifest, registry)
  const valid = validateGenesisG2CalibrationBatch(manifest, registry, batch)
  assert.deepEqual(valid.errors, [])

  const invalid = structuredClone(batch)
  invalid.governance.productionWriteAllowed = true
  assert(validateGenesisG2CalibrationBatch(manifest, registry, invalid).errors.length > 0)
  console.log('✓ Genesis G2 calibration verifier self-test passed')
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) return runSelfTest()

  const manifest = JSON.parse(readFileSync(resolve(process.cwd(), args.manifest), 'utf8'))
  const registry = JSON.parse(readFileSync(resolve(process.cwd(), args.registry), 'utf8'))
  const batch = JSON.parse(readFileSync(resolve(process.cwd(), args.batch), 'utf8'))
  const { errors, warnings } = validateGenesisG2CalibrationBatch(manifest, registry, batch)

  console.log('Genesis G2 calibration verification')
  console.log(`  selected: ${batch.counts?.selected}`)
  console.log(`  existing controls: ${batch.counts?.existingControls}`)
  console.log(`  translation required: ${batch.counts?.translationRequired}`)
  console.log(`  BDB primary source ready: ${batch.sourceGate?.primarySourceReady}`)
  console.log(`  Korean control source ready: ${batch.sourceGate?.koreanControlReady}`)
  console.log(`  final approval allowed: ${batch.sourceGate?.finalApprovalAllowed}`)
  for (const warning of warnings) console.log(`  - warning: ${warning}`)

  if (errors.length) {
    console.error(`✗ G2 calibration verification failed (${errors.length})`)
    for (const error of errors) console.error(`  - ${error}`)
    if (args.strict) process.exitCode = 1
    return
  }
  console.log('✓ G2 calibration verification passed')
}

main()
