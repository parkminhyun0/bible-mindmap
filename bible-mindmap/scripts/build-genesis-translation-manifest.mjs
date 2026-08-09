#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const GENESIS_LEXICON_MANIFEST_VERSION = 1
export const LEXICON_TRANSLATION_CONTRACT_VERSION = '2026.08.09-g1.1'
export const DEFAULT_INVENTORY_PATH = 'reports/genesis-strong-inventory.json'
export const DEFAULT_MANIFEST_PATH = 'reports/genesis-lexicon-translation-manifest.json'

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]))
  }
  return value
}

export function stableStringify(value) {
  return JSON.stringify(canonicalize(value))
}

export function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

function strongNumber(strong) {
  return Number.parseInt(String(strong).slice(1), 10)
}

function payloadPath(strong) {
  const bucket = Math.floor(strongNumber(strong) / 1000)
  return `data/lexicon-candidates/hebrew/H${bucket}000/${strong}.json`
}

export function buildGenesisTranslationManifest(inventory) {
  if (!inventory || inventory.schemaVersion !== 1 || !Array.isArray(inventory.entries)) {
    throw new Error('Genesis inventory schemaVersion=1 및 entries 배열이 필요합니다.')
  }

  const items = inventory.entries
    .map((entry) => {
      const reuseExisting = entry.coverage !== 'missing'
      return {
        strong: entry.strong,
        occurrences: entry.occurrences,
        chapters: [...entry.chapters],
        firstReference: entry.firstReference,
        sampleLemma: entry.sampleLemma,
        sampleSurface: entry.sampleSurface,
        coverage: entry.coverage,
        action: reuseExisting ? 'reuse-existing' : 'translate',
        status: reuseExisting ? 'existing' : 'queued',
        riskTier: 'unclassified',
        batchKey: `genesis-${entry.strong}`,
        payloadPath: payloadPath(entry.strong),
      }
    })
    .sort((left, right) => strongNumber(left.strong) - strongNumber(right.strong))

  const counts = {
    chapters: inventory.chaptersFound.length,
    verses: inventory.verseCount,
    words: inventory.wordCount,
    strongAssignments: inventory.strongAssignmentCount,
    uniqueStrong: inventory.uniqueStrongCount,
    reuseExisting: items.filter((item) => item.action === 'reuse-existing').length,
    translationRequired: items.filter((item) => item.action === 'translate').length,
  }

  return {
    schemaVersion: GENESIS_LEXICON_MANIFEST_VERSION,
    manifestId: 'genesis-lexicon-ko-g1',
    contractVersion: LEXICON_TRANSLATION_CONTRACT_VERSION,
    book: {
      id: 'Gen',
      nameKo: '창세기',
      testament: 'OT',
      sourceLanguage: 'hebrew',
    },
    governance: {
      theologicalFramework: 'reformed-westminster-primary',
      candidateOnly: true,
      productionWriteAllowed: false,
      humanApprovalRequiredForRiskTiers: ['R3', 'R4'],
      sourceNodeMutationAllowed: false,
    },
    source: {
      inventorySchemaVersion: inventory.schemaVersion,
      inventorySource: inventory.source,
      inventoryDigest: sha256(stableStringify(inventory)),
      expectedChapters: inventory.expectedChapters,
    },
    counts,
    allowedStatuses: ['existing', 'queued', 'in-progress', 'blocked', 'candidate-ready'],
    items,
  }
}

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INVENTORY_PATH,
    output: DEFAULT_MANIFEST_PATH,
    json: false,
    selfTest: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--self-test') args.selfTest = true
    else if (arg === '--json') args.json = true
    else if (arg === '--input') args.input = argv[++index]
    else if (arg.startsWith('--input=')) args.input = arg.slice(8)
    else if (arg === '--output') args.output = argv[++index]
    else if (arg.startsWith('--output=')) args.output = arg.slice(9)
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return args
}

function runSelfTest() {
  const inventory = {
    schemaVersion: 1,
    source: 'fixture',
    expectedChapters: 50,
    chaptersFound: [1, 2],
    verseCount: 2,
    wordCount: 4,
    strongAssignmentCount: 4,
    uniqueStrongCount: 3,
    entries: [
      { strong: 'H776', occurrences: 2, chapters: [1, 2], firstReference: 'Gen.1.1', sampleLemma: '0776', sampleSurface: 'הָאָרֶץ', coverage: 'active-extension' },
      { strong: 'H430', occurrences: 1, chapters: [1], firstReference: 'Gen.1.1', sampleLemma: '0430', sampleSurface: 'אֱלֹהִים', coverage: 'base' },
      { strong: 'H1254', occurrences: 1, chapters: [1], firstReference: 'Gen.1.1', sampleLemma: '01254', sampleSurface: 'בָּרָא', coverage: 'missing' },
    ],
  }
  const manifest = buildGenesisTranslationManifest(inventory)
  assert.equal(manifest.counts.uniqueStrong, 3)
  assert.equal(manifest.counts.reuseExisting, 2)
  assert.equal(manifest.counts.translationRequired, 1)
  assert.deepEqual(manifest.items.map((item) => item.strong), ['H430', 'H776', 'H1254'])
  assert.equal(manifest.items[2].status, 'queued')
  assert.equal(manifest.governance.productionWriteAllowed, false)
  assert.equal(buildGenesisTranslationManifest(inventory).source.inventoryDigest, manifest.source.inventoryDigest)
  console.log('✓ Genesis translation manifest self-test passed')
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) return runSelfTest()

  const inventoryPath = resolve(process.cwd(), args.input)
  const outputPath = resolve(process.cwd(), args.output)
  const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'))
  const manifest = buildGenesisTranslationManifest(inventory)

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  if (args.json) console.log(JSON.stringify(manifest, null, 2))
  else {
    console.log('Genesis lexicon translation manifest')
    console.log(`  inventory: ${inventoryPath}`)
    console.log(`  output: ${outputPath}`)
    console.log(`  contract: ${manifest.contractVersion}`)
    console.log(`  unique Strong: ${manifest.counts.uniqueStrong}`)
    console.log(`  reuse existing: ${manifest.counts.reuseExisting}`)
    console.log(`  translation required: ${manifest.counts.translationRequired}`)
    console.log('  production write allowed: false')
  }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isDirectRun) main()
