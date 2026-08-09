#!/usr/bin/env node

import assert from 'node:assert/strict'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { KOREAN_GLOSS } from '../src/data/koreanGloss.js'
import { KOREAN_GLOSS_ACTIVE } from '../src/data/koreanGlossActive.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = resolve(__dirname, '..')
const REPO_ROOT = resolve(APP_ROOT, '..')
const EXPECTED_CHAPTERS = 50
const DEFAULT_REPORT_PATH = join(APP_ROOT, 'reports', 'genesis-strong-inventory.json')

function parseArgs(argv) {
  const args = {
    input: null,
    json: false,
    strict: false,
    selfTest: false,
    write: null,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--json') args.json = true
    else if (arg === '--strict') args.strict = true
    else if (arg === '--self-test') args.selfTest = true
    else if (arg === '--input') args.input = argv[++i]
    else if (arg.startsWith('--input=')) args.input = arg.slice('--input='.length)
    else if (arg === '--write') args.write = argv[i + 1]?.startsWith('--') ? DEFAULT_REPORT_PATH : (argv[++i] || DEFAULT_REPORT_PATH)
    else if (arg.startsWith('--write=')) args.write = arg.slice('--write='.length) || DEFAULT_REPORT_PATH
    else throw new Error(`Unknown argument: ${arg}`)
  }

  return args
}

function resolveInputPath(explicitPath) {
  if (explicitPath) return resolve(process.cwd(), explicitPath)

  const candidates = [
    join(REPO_ROOT, '.oshb-cache', 'Gen.xml'),
    join(APP_ROOT, '.oshb-cache', 'Gen.xml'),
  ]
  const found = candidates.find((candidate) => existsSync(candidate))
  if (!found) {
    throw new Error(
      `Genesis OSHB source not found. Checked: ${candidates.join(', ')}. ` +
      'Pass --input <path> when using a different cache location.',
    )
  }
  return found
}

function readAttribute(attributes, name) {
  const match = attributes.match(new RegExp(`\\b${name}=(['\"])(.*?)\\1`, 'i'))
  return match ? match[2] : ''
}

function normalizeStrong(raw) {
  const value = String(raw || '').trim()
  const match = value.match(/^H?0*(\d{1,5})(?:[a-z])?$/i)
  if (!match) return null
  const number = Number.parseInt(match[1], 10)
  return Number.isFinite(number) && number > 0 ? `H${number}` : null
}

function extractStrongIds(lemma) {
  const ids = new Set()
  for (const segment of String(lemma || '').split(/[\s/,;|]+/)) {
    const normalized = normalizeStrong(segment.replace(/^[^\w]+|[^\w]+$/g, ''))
    if (normalized) ids.add(normalized)
  }
  return [...ids].sort(compareStrong)
}

function compareStrong(a, b) {
  return Number.parseInt(a.slice(1), 10) - Number.parseInt(b.slice(1), 10)
}

function normalizeDictionaryKeys(dictionary) {
  const normalized = new Map()
  const collisions = []

  for (const [rawKey, entry] of Object.entries(dictionary)) {
    const strong = normalizeStrong(rawKey)
    if (!strong || !strong.startsWith('H')) continue
    if (normalized.has(strong) && normalized.get(strong).rawKey !== rawKey) {
      collisions.push({ strong, keys: [normalized.get(strong).rawKey, rawKey] })
      continue
    }
    normalized.set(strong, { rawKey, entry })
  }

  return { normalized, collisions }
}

export function buildGenesisInventory(xml, dictionaries = {}) {
  const baseDictionary = dictionaries.baseDictionary || KOREAN_GLOSS
  const activeDictionary = dictionaries.activeDictionary || KOREAN_GLOSS_ACTIVE
  const base = normalizeDictionaryKeys(baseDictionary)
  const active = normalizeDictionaryKeys(activeDictionary)

  const chapters = new Set()
  const verses = new Set()
  const strongStats = new Map()
  const unparsedLemma = []
  const wordsWithoutLemma = []
  const multiStrongWords = []
  let wordCount = 0
  let strongAssignmentCount = 0

  const chapterRe = /<chapter\b[^>]*\bosisID=(['"])Gen\.(\d+)\1[^>]*>/gi
  let chapterMatch
  while ((chapterMatch = chapterRe.exec(xml)) !== null) {
    chapters.add(Number.parseInt(chapterMatch[2], 10))
  }

  const verseRe = /<verse\b[^>]*\bosisID=(['"])Gen\.(\d+)\.(\d+)\1[^>]*\/?>([\s\S]*?)(?=<verse\b[^>]*\bosisID=|<\/chapter>)/gi
  let verseMatch
  while ((verseMatch = verseRe.exec(xml)) !== null) {
    const chapter = Number.parseInt(verseMatch[2], 10)
    const verse = Number.parseInt(verseMatch[3], 10)
    const body = verseMatch[4]
    const reference = `Gen.${chapter}.${verse}`
    chapters.add(chapter)
    verses.add(reference)

    const wordRe = /<w\b([^>]*)>([\s\S]*?)<\/w>/gi
    let wordMatch
    let wordIndex = 0
    while ((wordMatch = wordRe.exec(body)) !== null) {
      wordCount += 1
      wordIndex += 1
      const attributes = wordMatch[1]
      const lemma = readAttribute(attributes, 'lemma')
      const tokenId = readAttribute(attributes, 'id') || `${reference}#${wordIndex}`
      const surface = wordMatch[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

      if (!lemma) {
        wordsWithoutLemma.push({ reference, tokenId, surface })
        continue
      }

      const strongIds = extractStrongIds(lemma)
      if (strongIds.length === 0) {
        unparsedLemma.push({ reference, tokenId, lemma, surface })
        continue
      }
      if (strongIds.length > 1) {
        multiStrongWords.push({ reference, tokenId, lemma, strongIds, surface })
      }

      for (const strong of strongIds) {
        strongAssignmentCount += 1
        const current = strongStats.get(strong) || {
          strong,
          occurrences: 0,
          chapters: new Set(),
          firstReference: reference,
          sampleLemma: lemma,
          sampleSurface: surface,
        }
        current.occurrences += 1
        current.chapters.add(chapter)
        strongStats.set(strong, current)
      }
    }
  }

  const entries = [...strongStats.values()]
    .sort((a, b) => compareStrong(a.strong, b.strong))
    .map((item) => {
      const inBase = base.normalized.has(item.strong)
      const inActive = active.normalized.has(item.strong)
      return {
        strong: item.strong,
        occurrences: item.occurrences,
        chapters: [...item.chapters].sort((a, b) => a - b),
        firstReference: item.firstReference,
        sampleLemma: item.sampleLemma,
        sampleSurface: item.sampleSurface,
        coverage: inBase ? 'base' : inActive ? 'active-extension' : 'missing',
      }
    })

  const chapterList = [...chapters].filter(Number.isFinite).sort((a, b) => a - b)
  const missingChapters = Array.from({ length: EXPECTED_CHAPTERS }, (_, index) => index + 1)
    .filter((chapter) => !chapters.has(chapter))
  const coverage = {
    base: entries.filter((entry) => entry.coverage === 'base').length,
    activeExtension: entries.filter((entry) => entry.coverage === 'active-extension').length,
    activeTotal: entries.filter((entry) => entry.coverage !== 'missing').length,
    missing: entries.filter((entry) => entry.coverage === 'missing').length,
  }

  return {
    schemaVersion: 1,
    source: 'OSHB Gen.xml',
    expectedChapters: EXPECTED_CHAPTERS,
    chaptersFound: chapterList,
    missingChapters,
    verseCount: verses.size,
    wordCount,
    strongAssignmentCount,
    uniqueStrongCount: entries.length,
    coverage,
    diagnostics: {
      wordsWithoutLemma,
      unparsedLemma,
      multiStrongWords,
      dictionaryKeyCollisions: {
        base: base.collisions,
        active: active.collisions,
      },
    },
    entries,
  }
}

function validateStrict(inventory) {
  const errors = []
  if (inventory.chaptersFound.length !== EXPECTED_CHAPTERS || inventory.missingChapters.length > 0) {
    errors.push(`expected ${EXPECTED_CHAPTERS} chapters; missing: ${inventory.missingChapters.join(', ') || 'none'}`)
  }
  if (inventory.verseCount === 0) errors.push('no Genesis verses were parsed')
  if (inventory.wordCount === 0) errors.push('no OSHB word tokens were parsed')
  if (inventory.uniqueStrongCount === 0) errors.push('no Hebrew Strong IDs were parsed')
  if (inventory.diagnostics.unparsedLemma.length > 0) {
    errors.push(`${inventory.diagnostics.unparsedLemma.length} lemma values could not be mapped to Strong IDs`)
  }
  if (inventory.diagnostics.dictionaryKeyCollisions.base.length > 0) {
    errors.push('base dictionary contains normalized Strong key collisions')
  }
  if (inventory.diagnostics.dictionaryKeyCollisions.active.length > 0) {
    errors.push('active dictionary contains normalized Strong key collisions')
  }
  return errors
}

function formatSummary(inventory, inputPath) {
  const lines = [
    'Genesis Strong inventory',
    `  source: ${inputPath}`,
    `  chapters: ${inventory.chaptersFound.length}/${inventory.expectedChapters}`,
    `  verses: ${inventory.verseCount}`,
    `  OSHB words: ${inventory.wordCount}`,
    `  Strong assignments: ${inventory.strongAssignmentCount}`,
    `  unique Strong IDs: ${inventory.uniqueStrongCount}`,
    `  covered by base dictionary: ${inventory.coverage.base}`,
    `  covered by active extensions: ${inventory.coverage.activeExtension}`,
    `  covered active total: ${inventory.coverage.activeTotal}`,
    `  new translations required: ${inventory.coverage.missing}`,
    `  multi-Strong words: ${inventory.diagnostics.multiStrongWords.length}`,
    `  words without lemma: ${inventory.diagnostics.wordsWithoutLemma.length}`,
    `  unparsed lemma values: ${inventory.diagnostics.unparsedLemma.length}`,
  ]
  if (inventory.missingChapters.length > 0) {
    lines.push(`  missing chapters: ${inventory.missingChapters.join(', ')}`)
  }
  return lines.join('\n')
}

function runSelfTest() {
  const fixture = `
    <osis>
      <chapter osisID="Gen.1">
        <verse osisID="Gen.1.1"/>
        <w lemma="b/07225" id="w1">בְּרֵאשִׁית</w>
        <w lemma="0430" id="w2">אֱלֹהִים</w>
        <w lemma="c/0853/0776a" id="w3">אֵת הָאָרֶץ</w>
      </chapter>
      <chapter osisID="Gen.2">
        <verse osisID="Gen.2.1"/>
        <w lemma="0430" id="w4">אֱלֹהִים</w>
        <w lemma="prefix-only" id="w5">־</w>
      </chapter>
    </osis>`
  const inventory = buildGenesisInventory(fixture, {
    baseDictionary: { H430: { glossKo: '하나님' } },
    activeDictionary: { H430: { glossKo: '하나님' }, H776: { glossKo: '땅' } },
  })

  assert.equal(inventory.chaptersFound.length, 2)
  assert.equal(inventory.verseCount, 2)
  assert.equal(inventory.wordCount, 5)
  assert.equal(inventory.uniqueStrongCount, 4)
  assert.equal(inventory.coverage.base, 1)
  assert.equal(inventory.coverage.activeExtension, 1)
  assert.equal(inventory.coverage.missing, 2)
  assert.equal(inventory.entries.find((entry) => entry.strong === 'H430')?.occurrences, 2)
  assert.equal(inventory.diagnostics.multiStrongWords.length, 1)
  assert.equal(inventory.diagnostics.unparsedLemma.length, 1)
  console.log('✓ Genesis Strong inventory self-test passed')
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) {
    runSelfTest()
    return
  }

  const inputPath = resolveInputPath(args.input)
  const xml = readFileSync(inputPath, 'utf8')
  const inventory = buildGenesisInventory(xml)

  if (args.write) {
    const reportPath = resolve(process.cwd(), args.write)
    mkdirSync(dirname(reportPath), { recursive: true })
    writeFileSync(reportPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8')
    if (!args.json) console.log(`Report written: ${reportPath}`)
  }

  if (args.json) console.log(JSON.stringify(inventory, null, 2))
  else console.log(formatSummary(inventory, inputPath))

  if (args.strict) {
    const errors = validateStrict(inventory)
    if (errors.length > 0) {
      console.error('\nStrict validation failed:')
      for (const error of errors) console.error(`  - ${error}`)
      process.exitCode = 1
    } else {
      console.log('\n✓ Strict validation passed')
    }
  }
}

main()
