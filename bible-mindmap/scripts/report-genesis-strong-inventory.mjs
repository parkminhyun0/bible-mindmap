#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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
  const args = { input: null, json: false, strict: false, selfTest: false, write: null }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--json') args.json = true
    else if (arg === '--strict') args.strict = true
    else if (arg === '--self-test') args.selfTest = true
    else if (arg === '--input') args.input = argv[++index]
    else if (arg.startsWith('--input=')) args.input = arg.slice(8)
    else if (arg === '--write') {
      const candidate = argv[index + 1]
      args.write = candidate && !candidate.startsWith('--') ? argv[++index] : DEFAULT_REPORT_PATH
    } else if (arg.startsWith('--write=')) args.write = arg.slice(8) || DEFAULT_REPORT_PATH
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
  const found = candidates.find(existsSync)
  if (found) return found
  throw new Error(
    `Genesis OSHB source not found. Checked: ${candidates.join(', ')}. ` +
    'Pass --input <path> for a different cache location.',
  )
}

function readAttribute(attributes, name) {
  const match = attributes.match(new RegExp(`\\b${name}=(['\"])(.*?)\\1`, 'i'))
  return match?.[2] || ''
}

function normalizeStrong(raw) {
  const match = String(raw || '').trim().match(/^H?0*(\d{1,5})(?:\s+[a-z]|[a-z])?$/i)
  if (!match) return null
  const number = Number.parseInt(match[1], 10)
  return Number.isFinite(number) && number > 0 ? `H${number}` : null
}

function compareStrong(left, right) {
  return Number.parseInt(left.slice(1), 10) - Number.parseInt(right.slice(1), 10)
}

function extractStrongIds(lemma) {
  const ids = new Set()
  const normalizedLemma = String(lemma || '').replace(/\s+([a-z])(?=\/|$)/gi, '$1')
  for (const segment of normalizedLemma.split(/[\s/,;|]+/)) {
    const strong = normalizeStrong(segment)
    if (strong) ids.add(strong)
  }
  return [...ids].sort(compareStrong)
}

function normalizeDictionary(dictionary) {
  const entries = new Map()
  const collisions = []
  for (const [rawKey, value] of Object.entries(dictionary)) {
    if (!rawKey.startsWith('H')) continue
    const strong = normalizeStrong(rawKey)
    if (!strong) continue
    if (entries.has(strong) && entries.get(strong).rawKey !== rawKey) {
      collisions.push({ strong, keys: [entries.get(strong).rawKey, rawKey] })
      continue
    }
    entries.set(strong, { rawKey, value })
  }
  return { entries, collisions }
}

export function buildGenesisInventory(xml, dictionaries = {}) {
  const base = normalizeDictionary(dictionaries.baseDictionary || KOREAN_GLOSS)
  const active = normalizeDictionary(dictionaries.activeDictionary || KOREAN_GLOSS_ACTIVE)
  const chapters = new Set()
  const verses = new Set()
  const stats = new Map()
  const nonStrongLemma = []
  const malformedLemma = []
  const wordsWithoutLemma = []
  const multiStrongWords = []
  let wordCount = 0
  let strongAssignmentCount = 0

  const chapterRe = /<chapter\b[^>]*\bosisID=(['"])Gen\.(\d+)\1[^>]*>/gi
  for (const match of xml.matchAll(chapterRe)) chapters.add(Number.parseInt(match[2], 10))

  const verseRe = /<verse\b[^>]*\bosisID=(['"])Gen\.(\d+)\.(\d+)\1[^>]*>([\s\S]*?)<\/verse>/gi
  for (const verseMatch of xml.matchAll(verseRe)) {
    const chapter = Number.parseInt(verseMatch[2], 10)
    const verse = Number.parseInt(verseMatch[3], 10)
    const reference = `Gen.${chapter}.${verse}`
    chapters.add(chapter)
    verses.add(reference)

    const wordRe = /<w\b([^>]*)>([\s\S]*?)<\/w>/gi
    let wordIndex = 0
    for (const wordMatch of verseMatch[4].matchAll(wordRe)) {
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
        const diagnostic = { reference, tokenId, lemma, surface }
        if (/\d/.test(lemma)) malformedLemma.push(diagnostic)
        else nonStrongLemma.push(diagnostic)
        continue
      }
      if (strongIds.length > 1) {
        multiStrongWords.push({ reference, tokenId, lemma, strongIds, surface })
      }

      for (const strong of strongIds) {
        strongAssignmentCount += 1
        const current = stats.get(strong) || {
          strong,
          occurrences: 0,
          chapters: new Set(),
          firstReference: reference,
          sampleLemma: lemma,
          sampleSurface: surface,
        }
        current.occurrences += 1
        current.chapters.add(chapter)
        stats.set(strong, current)
      }
    }
  }

  const entries = [...stats.values()]
    .sort((left, right) => compareStrong(left.strong, right.strong))
    .map((item) => {
      const coverage = base.entries.has(item.strong)
        ? 'base'
        : active.entries.has(item.strong)
          ? 'active-extension'
          : 'missing'
      return {
        strong: item.strong,
        occurrences: item.occurrences,
        chapters: [...item.chapters].sort((a, b) => a - b),
        firstReference: item.firstReference,
        sampleLemma: item.sampleLemma,
        sampleSurface: item.sampleSurface,
        coverage,
      }
    })

  const chaptersFound = [...chapters].filter(Number.isFinite).sort((a, b) => a - b)
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
    chaptersFound,
    missingChapters,
    verseCount: verses.size,
    wordCount,
    strongAssignmentCount,
    uniqueStrongCount: entries.length,
    coverage,
    diagnostics: {
      nonStrongLemma,
      malformedLemma,
      wordsWithoutLemma,
      multiStrongWords,
      dictionaryKeyCollisions: {
        base: base.collisions,
        active: active.collisions,
      },
    },
    entries,
  }
}

function strictErrors(inventory) {
  const errors = []
  if (inventory.chaptersFound.length !== EXPECTED_CHAPTERS || inventory.missingChapters.length) {
    errors.push(`expected ${EXPECTED_CHAPTERS} chapters; missing: ${inventory.missingChapters.join(', ') || 'none'}`)
  }
  if (!inventory.verseCount) errors.push('no Genesis verses were parsed')
  if (!inventory.wordCount) errors.push('no OSHB word tokens were parsed')
  if (!inventory.uniqueStrongCount) errors.push('no Hebrew Strong IDs were parsed')
  if (inventory.diagnostics.malformedLemma.length) {
    errors.push(`${inventory.diagnostics.malformedLemma.length} numeric lemma values could not be parsed`)
  }
  if (inventory.diagnostics.dictionaryKeyCollisions.base.length) {
    errors.push('base dictionary contains normalized Strong key collisions')
  }
  if (inventory.diagnostics.dictionaryKeyCollisions.active.length) {
    errors.push('active dictionary contains normalized Strong key collisions')
  }
  return errors
}

function formatSummary(inventory, inputPath) {
  return [
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
    `  valid non-Strong lemma tokens: ${inventory.diagnostics.nonStrongLemma.length}`,
    `  malformed numeric lemma values: ${inventory.diagnostics.malformedLemma.length}`,
    `  words without lemma: ${inventory.diagnostics.wordsWithoutLemma.length}`,
    `  multi-Strong words: ${inventory.diagnostics.multiStrongWords.length}`,
    inventory.missingChapters.length ? `  missing chapters: ${inventory.missingChapters.join(', ')}` : null,
  ].filter(Boolean).join('\n')
}

function runSelfTest() {
  const fixture = `<osis>
    <chapter osisID="Gen.1"><verse osisID="Gen.1.1">
      <w lemma="b/07225" id="w1">בְּרֵאשִׁית</w>
      <w lemma="0430" id="w2">אֱלֹהִים</w>
      <w lemma="c/0853/0776 a" id="w3">אֵת הָאָרֶץ</w>
    </verse></chapter>
    <chapter osisID="Gen.2"><verse osisID="Gen.2.1">
      <w lemma="0430" id="w4">אֱלֹהִים</w>
      <w lemma="l" id="w5">לּוֹ</w>
      <w lemma="12??" id="w6">?</w>
    </verse></chapter>
  </osis>`
  const inventory = buildGenesisInventory(fixture, {
    baseDictionary: { H430: { glossKo: '하나님' } },
    activeDictionary: { H430: { glossKo: '하나님' }, H776: { glossKo: '땅' } },
  })
  assert.equal(inventory.chaptersFound.length, 2)
  assert.equal(inventory.verseCount, 2)
  assert.equal(inventory.wordCount, 6)
  assert.equal(inventory.uniqueStrongCount, 4)
  assert.equal(inventory.coverage.base, 1)
  assert.equal(inventory.coverage.activeExtension, 1)
  assert.equal(inventory.coverage.missing, 2)
  assert.equal(inventory.entries.find((entry) => entry.strong === 'H430')?.occurrences, 2)
  assert.equal(inventory.diagnostics.nonStrongLemma.length, 1)
  assert.equal(inventory.diagnostics.malformedLemma.length, 1)
  assert.equal(inventory.diagnostics.multiStrongWords.length, 1)
  console.log('✓ Genesis Strong inventory self-test passed')
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) return runSelfTest()

  const inputPath = resolveInputPath(args.input)
  const inventory = buildGenesisInventory(readFileSync(inputPath, 'utf8'))

  if (args.write) {
    const reportPath = resolve(process.cwd(), args.write)
    mkdirSync(dirname(reportPath), { recursive: true })
    writeFileSync(reportPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8')
    if (!args.json) console.log(`Report written: ${reportPath}`)
  }
  console.log(args.json ? JSON.stringify(inventory, null, 2) : formatSummary(inventory, inputPath))

  if (args.strict) {
    const errors = strictErrors(inventory)
    if (errors.length) {
      console.error('\nStrict validation failed:')
      for (const error of errors) console.error(`  - ${error}`)
      process.exitCode = 1
    } else {
      console.log('\n✓ Strict validation passed')
    }
  }
}

main()
