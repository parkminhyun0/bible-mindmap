#!/usr/bin/env node

import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { normalizeRegistry } from './lib/source-registry-adapter.mjs'

const DEFAULT_MANIFEST_PATH = 'reports/genesis-lexicon-translation-manifest.json'
const DEFAULT_REGISTRY_PATH = 'data/lexicon/source-registry.json'
const DEFAULT_OUTPUT_PATH = 'reports/genesis-g2-calibration-batch.json'
const BATCH_SIZE = 100

const CATEGORY_QUOTAS = Object.freeze({
  'core-theology-context': 25,
  'existing-control': 10,
  'high-frequency-missing': 25,
  'medium-frequency-missing': 20,
  'low-frequency-missing': 20,
})

const CORE_STRONGS = Object.freeze([
  'H430', 'H776', 'H8064', 'H1254', 'H216', 'H2822', 'H3117', 'H4325', 'H7307',
  'H120', 'H127', 'H6754', 'H1823', 'H5315', 'H2416', 'H2896', 'H7451', 'H6086',
  'H2233', 'H1285', 'H2617', 'H6662', 'H6666', 'H539', 'H3068', 'H410', 'H8034',
  'H1818', 'H5117', 'H3519', 'H4191', 'H2421', 'H3205', 'H1121', 'H1', 'H802',
  'H376', 'H517', 'H3722', 'H7965', 'H571', 'H4941', 'H4150', 'H4397', 'H5030',
  'H3548', 'H3478', 'H3290', 'H85', 'H12',
])

function strongNumber(strong) {
  return Number.parseInt(String(strong).slice(1), 10)
}

function byStrong(left, right) {
  return strongNumber(left.strong) - strongNumber(right.strong)
}

function byFrequencyDesc(left, right) {
  return right.occurrences - left.occurrences || byStrong(left, right)
}

function byFrequencyAsc(left, right) {
  return left.occurrences - right.occurrences || byStrong(left, right)
}

function sourceGate(registry) {
  const primary = registry.sources.find((source) => source.id === 'openscriptures-hebrewlexicon-bdb')
  const korean = registry.sources.find((source) => source.id === 'korean-ot-nt-dictionary')
  return {
    primarySourceId: primary?.id || null,
    primarySourceReady: primary?.licenseStatus === 'verified-public-or-permitted',
    koreanControlSourceId: korean?.id || null,
    koreanControlReady: korean?.licenseStatus === 'verified-public-or-permitted',
    translationCandidateAllowed: primary?.licenseStatus === 'verified-public-or-permitted',
    finalApprovalAllowed: (
      primary?.licenseStatus === 'verified-public-or-permitted'
      && korean?.licenseStatus === 'verified-public-or-permitted'
    ),
  }
}

function selectCategory({ category, quota, preferred, all, selected }) {
  const chosen = []
  const add = (item) => {
    if (!item || selected.has(item.strong) || chosen.length >= quota) return
    selected.add(item.strong)
    chosen.push({ ...item, category })
  }
  for (const item of preferred) add(item)
  for (const item of all) add(item)
  if (chosen.length !== quota) {
    throw new Error(`${category}: ${quota}개를 선정하지 못함 (${chosen.length})`)
  }
  return chosen
}

export function buildGenesisCalibrationBatch(manifest, registryInput) {
  if (manifest?.manifestId !== 'genesis-lexicon-ko-g1' || !Array.isArray(manifest.items)) {
    throw new Error('G1 Genesis manifest가 필요합니다.')
  }
  if (registryInput?.schemaVersion !== 1 || !Array.isArray(registryInput.sources)) {
    throw new Error('source registry schemaVersion=1이 필요합니다.')
  }
  const registry = normalizeRegistry(registryInput)

  const all = [...manifest.items].sort(byStrong)
  const byId = new Map(all.map((item) => [item.strong, item]))
  const selected = new Set()
  const items = []

  const corePreferred = CORE_STRONGS.map((strong) => byId.get(strong)).filter(Boolean)
  items.push(...selectCategory({
    category: 'core-theology-context',
    quota: CATEGORY_QUOTAS['core-theology-context'],
    preferred: corePreferred,
    all: [...all].sort(byFrequencyDesc),
    selected,
  }))

  const existing = all.filter((item) => item.coverage !== 'missing').sort(byFrequencyDesc)
  items.push(...selectCategory({
    category: 'existing-control',
    quota: CATEGORY_QUOTAS['existing-control'],
    preferred: existing,
    all: existing,
    selected,
  }))

  const missingDesc = all.filter((item) => item.coverage === 'missing').sort(byFrequencyDesc)
  items.push(...selectCategory({
    category: 'high-frequency-missing',
    quota: CATEGORY_QUOTAS['high-frequency-missing'],
    preferred: missingDesc,
    all: missingDesc,
    selected,
  }))

  const missingAsc = all.filter((item) => item.coverage === 'missing').sort(byFrequencyAsc)
  items.push(...selectCategory({
    category: 'low-frequency-missing',
    quota: CATEGORY_QUOTAS['low-frequency-missing'],
    preferred: missingAsc,
    all: missingAsc,
    selected,
  }))

  const remainingMissing = all
    .filter((item) => item.coverage === 'missing' && !selected.has(item.strong))
    .sort(byFrequencyAsc)
  const center = Math.floor(remainingMissing.length / 2)
  const mediumPreferred = remainingMissing.slice(
    Math.max(0, center - CATEGORY_QUOTAS['medium-frequency-missing']),
    Math.min(remainingMissing.length, center + CATEGORY_QUOTAS['medium-frequency-missing']),
  )
  items.push(...selectCategory({
    category: 'medium-frequency-missing',
    quota: CATEGORY_QUOTAS['medium-frequency-missing'],
    preferred: mediumPreferred,
    all: remainingMissing,
    selected,
  }))

  const gate = sourceGate(registry)
  const normalizedItems = items.map((item, index) => ({
    order: index + 1,
    strong: item.strong,
    category: item.category,
    occurrences: item.occurrences,
    chapters: item.chapters,
    firstReference: item.firstReference,
    coverage: item.coverage,
    sourcePacketStatus: 'pending-bdb-materialization',
    modelPlan: {
      nvidia: 'blind-draft-a',
      gpt: 'blind-draft-b',
      crossVisibilityBeforeComparison: false,
    },
    payloadPath: item.payloadPath,
  }))

  return {
    schemaVersion: 1,
    batchId: 'genesis-g2-calibration-100-v1',
    contractVersion: manifest.contractVersion,
    sourcePolicyVersion: registry.policyVersion,
    book: manifest.book,
    governance: {
      theologicalFramework: 'reformed-westminster-primary',
      candidateOnly: true,
      productionWriteAllowed: false,
      blindModelRunsRequired: true,
      sourceNodeMutationAllowed: false,
      riskTierBeforeTranslation: 'unclassified',
    },
    sourceGate: gate,
    counts: {
      selected: normalizedItems.length,
      categories: Object.fromEntries(
        Object.keys(CATEGORY_QUOTAS).map((category) => [
          category,
          normalizedItems.filter((item) => item.category === category).length,
        ]),
      ),
      existingControls: normalizedItems.filter((item) => item.coverage !== 'missing').length,
      translationRequired: normalizedItems.filter((item) => item.coverage === 'missing').length,
    },
    sourceRefs: registry.sources.map((source) => ({
      id: source.id,
      role: source.role,
      licenseStatus: source.licenseStatus,
    })),
    items: normalizedItems,
  }
}

function parseArgs(argv) {
  const args = {
    manifest: DEFAULT_MANIFEST_PATH,
    registry: DEFAULT_REGISTRY_PATH,
    output: DEFAULT_OUTPUT_PATH,
    selfTest: false,
    json: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--self-test') args.selfTest = true
    else if (arg === '--json') args.json = true
    else if (arg === '--manifest') args.manifest = argv[++index]
    else if (arg.startsWith('--manifest=')) args.manifest = arg.slice(11)
    else if (arg === '--registry') args.registry = argv[++index]
    else if (arg.startsWith('--registry=')) args.registry = arg.slice(11)
    else if (arg === '--output') args.output = argv[++index]
    else if (arg.startsWith('--output=')) args.output = arg.slice(9)
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return args
}

function fixtureManifest() {
  const items = Array.from({ length: 180 }, (_, index) => {
    const number = index + 1
    return {
      strong: `H${number}`,
      occurrences: 181 - number,
      chapters: [1 + (number % 50)],
      firstReference: `Gen.${1 + (number % 50)}.1`,
      coverage: number <= 80 ? 'base' : 'missing',
      payloadPath: `data/lexicon-candidates/hebrew/H0000/H${number}.json`,
    }
  })
  return {
    manifestId: 'genesis-lexicon-ko-g1',
    contractVersion: '2026.08.09-g1.1',
    book: { id: 'Gen', nameKo: '창세기', testament: 'OT', sourceLanguage: 'hebrew' },
    items,
  }
}

function fixtureRegistry() {
  return {
    schemaVersion: 1,
    policyVersion: 'test',
    sources: [
      { id: 'openscriptures-hebrewlexicon-bdb', role: 'primary-source', licenseStatus: 'verified-public-or-permitted' },
      { id: 'korean-ot-nt-dictionary', role: 'internal-validation', licenseStatus: 'unknown' },
    ],
  }
}

function runSelfTest() {
  const batch = buildGenesisCalibrationBatch(fixtureManifest(), fixtureRegistry())
  assert.equal(batch.counts.selected, BATCH_SIZE)
  assert.equal(new Set(batch.items.map((item) => item.strong)).size, BATCH_SIZE)
  assert.deepEqual(batch.counts.categories, CATEGORY_QUOTAS)
  assert.equal(batch.sourceGate.translationCandidateAllowed, true)
  assert.equal(batch.sourceGate.finalApprovalAllowed, false)
  assert.equal(batch.governance.productionWriteAllowed, false)
  console.log('✓ Genesis G2 calibration batch self-test passed')
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) return runSelfTest()

  const manifest = JSON.parse(readFileSync(resolve(process.cwd(), args.manifest), 'utf8'))
  const registry = normalizeRegistry(JSON.parse(readFileSync(resolve(process.cwd(), args.registry), 'utf8')))
  const batch = buildGenesisCalibrationBatch(manifest, registry)
  const outputPath = resolve(process.cwd(), args.output)
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(batch, null, 2)}\n`, 'utf8')

  if (args.json) console.log(JSON.stringify(batch, null, 2))
  else {
    console.log('Genesis G2 calibration batch')
    console.log(`  selected: ${batch.counts.selected}`)
    for (const [category, count] of Object.entries(batch.counts.categories)) {
      console.log(`  ${category}: ${count}`)
    }
    console.log(`  existing controls: ${batch.counts.existingControls}`)
    console.log(`  translation required: ${batch.counts.translationRequired}`)
    console.log(`  BDB primary source ready: ${batch.sourceGate.primarySourceReady}`)
    console.log(`  Korean control source ready: ${batch.sourceGate.koreanControlReady}`)
    console.log(`  final approval allowed: ${batch.sourceGate.finalApprovalAllowed}`)
  }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isDirectRun) main()
