#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = resolve(__dirname, '..')
const REPO_ROOT = resolve(APP_ROOT, '..')
const DEFAULT_OUTPUT = resolve(APP_ROOT, 'reports/genesis-p5-r4-pinned-corpus-usage.json')
const WINDOW_RADIUS = 4
const SAMPLE_LIMIT = 12
const CANDIDATE_BUNDLE_FP = 'sha256:a9ebdc22e34659332b84ced41118597feae70f18a742e8a5234968e902c9d261'
const SOURCE_INPUT_BUNDLE_FP = 'sha256:adc1c48a14b111ed8c7046a9274478f70cbd9a17a27532eebc81d9c29fcbdf1c'

const TARGETS = Object.freeze([
  { baseStrong: 'H120', sourceStrong: 'H120', corpusStrong: 'H120', expectedOccurrences: 47, candidateFingerprint: 'sha256:7521aaf5b0f2992a23601a3a357262ced753e0932c7e7657a7045977edd92125' },
  { baseStrong: 'H6030', sourceStrong: 'H6030b', corpusStrong: 'H6030', expectedOccurrences: 19, candidateFingerprint: 'sha256:2f2014de76317122a4a605240ed5e2367c408d32583c0046a827af59707b5fbb' },
  { baseStrong: 'H7650', sourceStrong: 'H7650', corpusStrong: 'H7650', expectedOccurrences: 19, candidateFingerprint: 'sha256:c7ffb8646a26cd58e3ac239eb782faa171acb6ca7af215072fa97f13fd9013d2' },
  { baseStrong: 'H28', sourceStrong: 'H28', corpusStrong: 'H28', expectedOccurrences: 1, candidateFingerprint: 'sha256:0e14d5b1a36b874475ab4480012b4aaffc44e5af0a3f27d109ea799df58bd6a4' },
  { baseStrong: 'H39', sourceStrong: 'H39', corpusStrong: 'H39', expectedOccurrences: 1, candidateFingerprint: 'sha256:27bf6bf5e378efa24f39481ade6875f63c86c2f04533d7f3e106934d343a543d' },
])

const sha256Text = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

function resolveGenesisXml() {
  const paths = [resolve(REPO_ROOT, '.oshb-cache/Gen.xml'), resolve(APP_ROOT, '.oshb-cache/Gen.xml')]
  const found = paths.find(existsSync)
  if (!found) throw new Error(`Genesis OSHB source not found: ${paths.join(', ')}`)
  return found
}

function decodeXml(value = '') {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}
function readAttribute(attributes, name) {
  const match = String(attributes || '').match(new RegExp(`\\b${name}=(['\"])(.*?)\\1`, 'i'))
  return decodeXml(match?.[2] || '')
}
function normalizeStrong(raw) {
  const match = String(raw || '').trim().match(/^H?0*(\d{1,5})(?:\s*[a-z])?\+?$/i)
  if (!match) return null
  const number = Number.parseInt(match[1], 10)
  return Number.isFinite(number) && number > 0 ? `H${number}` : null
}
function extractStrongIds(lemma) {
  const ids = new Set()
  for (const segment of String(lemma || '').split(/[\s/,;|]+/)) {
    const strong = normalizeStrong(segment)
    if (strong) ids.add(strong)
  }
  return [...ids].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
}
function parseGenesisVerses(xml) {
  const verses = []
  const verseRe = /<verse\b[^>]*\bosisID=(['"])Gen\.(\d+)\.(\d+)\1[^>]*>([\s\S]*?)<\/verse>/gi
  for (const verseMatch of xml.matchAll(verseRe)) {
    const chapter = Number.parseInt(verseMatch[2], 10)
    const verse = Number.parseInt(verseMatch[3], 10)
    const reference = `Gen.${chapter}.${verse}`
    const tokens = []
    const wordRe = /<w\b([^>]*)>([\s\S]*?)<\/w>/gi
    let tokenIndex = 0
    for (const wordMatch of verseMatch[4].matchAll(wordRe)) {
      tokenIndex += 1
      const attributes = wordMatch[1]
      const lemma = readAttribute(attributes, 'lemma')
      const morph = readAttribute(attributes, 'morph')
      const tokenId = readAttribute(attributes, 'id') || `${reference}#${tokenIndex}`
      const surface = decodeXml(wordMatch[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
      tokens.push({ tokenIndex, tokenId, surface, lemma, morph, strongIds: extractStrongIds(lemma) })
    }
    verses.push({ chapter, verse, reference, tokens, verseText: tokens.map((token) => token.surface).filter(Boolean).join(' ') })
  }
  return verses
}
function frequencyRows(values) {
  const map = new Map()
  for (const value of values.filter(Boolean)) map.set(value, (map.get(value) || 0) + 1)
  return [...map.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}
function chapterRows(occurrences) {
  const map = new Map()
  for (const item of occurrences) map.set(item.chapter, (map.get(item.chapter) || 0) + 1)
  return [...map.entries()].map(([chapter, count]) => ({ chapter, count })).sort((a, b) => a.chapter - b.chapter)
}
function selectSamples(occurrences, limit) {
  if (occurrences.length <= limit) return [...occurrences]
  const selected = new Map()
  const add = (item) => { if (item && selected.size < limit) selected.set(item.occurrenceId, item) }
  add(occurrences[0]); add(occurrences.at(-1))
  const chapterSeen = new Set()
  for (const item of occurrences) if (!chapterSeen.has(item.chapter)) { chapterSeen.add(item.chapter); add(item) }
  const morphSeen = new Set()
  for (const item of occurrences) { const key = item.morph || '(none)'; if (!morphSeen.has(key)) { morphSeen.add(key); add(item) } }
  const step = (occurrences.length - 1) / Math.max(1, limit - 1)
  for (let index = 0; index < limit; index += 1) add(occurrences[Math.round(index * step)])
  for (const item of occurrences) add(item)
  return [...selected.values()].sort((a, b) => a.sequence - b.sequence)
}

function loadCandidateRecords() {
  const dir = resolve(APP_ROOT, 'data/lexicon/candidates/genesis-p5')
  const manifest = readJson(join(dir, 'manifest.json'))
  assert.equal(manifest.bundleFingerprint, CANDIDATE_BUNDLE_FP, 'candidate bundle fingerprint drift')
  const files = ['core-theology-context.json','high-frequency-general.json','medium-frequency-general.json','low-frequency-general.json']
  const candidates = files.flatMap((file) => readJson(join(dir, file)).candidates || [])
  const bySource = new Map(candidates.map((candidate) => [candidate.sourceStrong, candidate]))
  for (const target of TARGETS) {
    const candidate = bySource.get(target.sourceStrong)
    assert.ok(candidate, `${target.sourceStrong}: pinned candidate missing`)
    assert.equal(candidate.baseStrong, target.baseStrong, `${target.sourceStrong}: baseStrong drift`)
    assert.equal(candidate.sourceBundleFingerprint, SOURCE_INPUT_BUNDLE_FP, `${target.sourceStrong}: source bundle drift`)
    assert.equal(candidate.candidateFingerprint, target.candidateFingerprint, `${target.sourceStrong}: candidate fingerprint drift`)
    assert.equal(candidate.risk?.tier, 'R4', `${target.sourceStrong}: must remain R4`)
  }
  return bySource
}

export function buildGenesisP5R4UsageEvidence({ xml, candidateBySource = loadCandidateRecords() }) {
  const verses = parseGenesisVerses(xml)
  assert.equal(verses.length > 0, true, 'Genesis verses missing')
  const wanted = new Map(TARGETS.map((target) => [target.corpusStrong, target]))
  const occurrencesBySource = new Map(TARGETS.map((target) => [target.sourceStrong, []]))
  let sequence = 0
  for (const verse of verses) {
    for (const token of verse.tokens) {
      for (const corpusStrong of token.strongIds) {
        const target = wanted.get(corpusStrong)
        if (!target) continue
        sequence += 1
        const start = Math.max(0, token.tokenIndex - 1 - WINDOW_RADIUS)
        const end = Math.min(verse.tokens.length, token.tokenIndex + WINDOW_RADIUS)
        const contextTokens = verse.tokens.slice(start, end).map((entry) => ({
          tokenIndex: entry.tokenIndex, tokenId: entry.tokenId, surface: entry.surface,
          lemma: entry.lemma, morph: entry.morph || null, strongIds: entry.strongIds,
          focus: entry.tokenId === token.tokenId,
        }))
        occurrencesBySource.get(target.sourceStrong).push({
          occurrenceId: `${token.tokenId}:${target.sourceStrong}`,
          sequence, reference: verse.reference, chapter: verse.chapter, verse: verse.verse,
          tokenIndex: token.tokenIndex, tokenId: token.tokenId, surface: token.surface,
          lemma: token.lemma, morph: token.morph || null, corpusStrong,
          verseText: verse.verseText, contextTokens,
        })
      }
    }
  }
  const items = TARGETS.map((target) => {
    const candidate = candidateBySource.get(target.sourceStrong)
    const occurrences = occurrencesBySource.get(target.sourceStrong)
    assert.equal(occurrences.length, target.expectedOccurrences, `${target.sourceStrong}: Genesis occurrence count drift`)
    const samples = selectSamples(occurrences, SAMPLE_LIMIT)
    return {
      baseStrong: target.baseStrong,
      sourceStrong: target.sourceStrong,
      corpusStrong: target.corpusStrong,
      mapping: target.sourceStrong === target.corpusStrong ? 'direct' : 'extended-source-to-base-corpus',
      candidateFingerprint: target.candidateFingerprint,
      lemma: candidate.identity?.lemmaNormalized || candidate.identity?.lemma,
      transliterationKo: candidate.identity?.transliterationKo,
      risk: candidate.risk,
      expectedOccurrences: target.expectedOccurrences,
      totalOccurrences: occurrences.length,
      chapters: [...new Set(occurrences.map((entry) => entry.chapter))].sort((a, b) => a - b),
      firstReference: occurrences[0]?.reference || null,
      lastReference: occurrences.at(-1)?.reference || null,
      distribution: {
        byChapter: chapterRows(occurrences),
        surfaceForms: frequencyRows(occurrences.map((entry) => entry.surface)),
        lemmaForms: frequencyRows(occurrences.map((entry) => entry.lemma)),
        morphCodes: frequencyRows(occurrences.map((entry) => entry.morph || '(none)')),
      },
      sampleContextIds: samples.map((entry) => entry.occurrenceId),
      sampleContexts: samples,
      occurrences,
    }
  })
  return {
    schemaVersion: 1,
    reportId: 'genesis-p5-r4-pinned-corpus-usage-v1',
    book: 'GEN',
    status: 'PINNED_CORPUS_USAGE_COMPLETE',
    baseline: { candidateBundleFingerprint: CANDIDATE_BUNDLE_FP, sourceInputBundleFingerprint: SOURCE_INPUT_BUNDLE_FP },
    source: { id: 'openscriptures-hebrew-bible-genesis', file: '.oshb-cache/Gen.xml', digest: sha256Text(xml), windowRadius: WINDOW_RADIUS, sampleLimit: SAMPLE_LIMIT },
    governance: {
      evidenceCollectionOnly: true, candidateMutationAllowed: false, approvalRegistryWriteAllowed: false,
      serviceUiWriteAllowed: false, productionWriteAllowed: false, existingApprovedMeaningMutationAllowed: false,
      autoApprovalAllowed: false, humanFinalWordingAllowedAtThisStage: false,
    },
    counts: { items: items.length, occurrences: items.reduce((sum, item) => sum + item.totalOccurrences, 0), sampledContexts: items.reduce((sum, item) => sum + item.sampleContexts.length, 0) },
    items,
    nextGate: 'THREE_MODEL_REAUDIT_ON_EXACT_PINNED_BASELINE',
  }
}

function main() {
  const outputArg = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6)
  const out = outputArg ? resolve(process.cwd(), outputArg) : DEFAULT_OUTPUT
  const xml = readFileSync(resolveGenesisXml(), 'utf8')
  const result = buildGenesisP5R4UsageEvidence({ xml })
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  console.log(`✓ Genesis P5 R4 pinned corpus usage · items=${result.counts.items} · occurrences=${result.counts.occurrences} · samples=${result.counts.sampledContexts}`)
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
