#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = resolve(__dirname, '..')
const REPO_ROOT = resolve(APP_ROOT, '..')
const DEFAULT_OUTPUT = resolve(APP_ROOT, 'reports/genesis-v4-production-batch-02-contexts.json')
const WINDOW_RADIUS = 4
const MIN_SAMPLES = 3

const TARGETS = Object.freeze([
  { strong: 'H430', lemma: 'אֱלֹהִים', expectedOccurrences: 219, firstReference: 'Gen.1.1' },
  { strong: 'H3068', lemma: 'יְהֹוָה', expectedOccurrences: 163, firstReference: 'Gen.2.4' },
  { strong: 'H1', lemma: 'אָב', expectedOccurrences: 208, firstReference: 'Gen.2.24' },
  { strong: 'H1121', lemma: 'בֵּן', expectedOccurrences: 365, firstReference: 'Gen.3.16' },
  { strong: 'H1961', lemma: 'הָיָה', expectedOccurrences: 316, firstReference: 'Gen.1.2' },
  { strong: 'H376', lemma: 'אִישׁ', expectedOccurrences: 159, firstReference: 'Gen.2.23' },
  { strong: 'H802', lemma: 'אִשָּׁה', expectedOccurrences: 152, firstReference: 'Gen.2.22' },
  { strong: 'H559', lemma: 'אָמַר', expectedOccurrences: 606, firstReference: 'Gen.1.3' },
  { strong: 'H6213', lemma: 'עָשָׂה', expectedOccurrences: 153, firstReference: 'Gen.1.7' },
  { strong: 'H7200', lemma: 'רָאָה', expectedOccurrences: 141, firstReference: 'Gen.1.4' },
])

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
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
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
  return [...ids]
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
      const surface = decodeXml(wordMatch[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
      const lemma = readAttribute(attributes, 'lemma')
      const morph = readAttribute(attributes, 'morph') || null
      const tokenId = readAttribute(attributes, 'id') || `${reference}#${tokenIndex}`
      tokens.push({ tokenIndex, tokenId, surface, lemma, morph, strongIds: extractStrongIds(lemma) })
    }
    verses.push({ reference, chapter, verse, tokens, verseText: tokens.map((token) => token.surface).filter(Boolean).join(' ') })
  }
  return verses
}

function selectSamples(occurrences) {
  assert.ok(occurrences.length > 0)
  const selected = new Map()
  const add = (item) => item && selected.set(item.occurrenceId, item)
  add(occurrences[0])
  const morphSeen = new Set([occurrences[0].morph || '(none)'])
  for (const item of occurrences) {
    const key = item.morph || '(none)'
    if (!morphSeen.has(key)) {
      morphSeen.add(key)
      add(item)
    }
    if (selected.size >= MIN_SAMPLES) break
  }
  if (selected.size < MIN_SAMPLES) add(occurrences[Math.floor((occurrences.length - 1) / 2)])
  if (selected.size < MIN_SAMPLES) add(occurrences.at(-1))
  for (const item of occurrences) {
    if (selected.size >= MIN_SAMPLES) break
    add(item)
  }
  return [...selected.values()].sort((a, b) => a.sequence - b.sequence)
}

function main() {
  const outputArg = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6)
  const out = outputArg ? resolve(process.cwd(), outputArg) : DEFAULT_OUTPUT
  const xml = readFileSync(resolveGenesisXml(), 'utf8')
  const sourceDigest = `sha256:${createHash('sha256').update(xml).digest('hex')}`
  const verses = parseGenesisVerses(xml)
  assert.ok(verses.length > 0, 'Genesis verses missing')

  const targetMap = new Map(TARGETS.map((target) => [target.strong, target]))
  const found = new Map(TARGETS.map((target) => [target.strong, []]))
  let sequence = 0

  for (const verse of verses) {
    for (const token of verse.tokens) {
      for (const strong of token.strongIds) {
        const target = targetMap.get(strong)
        if (!target) continue
        sequence += 1
        const start = Math.max(0, token.tokenIndex - 1 - WINDOW_RADIUS)
        const end = Math.min(verse.tokens.length, token.tokenIndex + WINDOW_RADIUS)
        const contextTokens = verse.tokens.slice(start, end).map((entry) => ({
          tokenIndex: entry.tokenIndex,
          tokenId: entry.tokenId,
          surface: entry.surface,
          lemma: entry.lemma,
          morph: entry.morph,
          strongIds: entry.strongIds,
          focus: entry.tokenId === token.tokenId,
        }))
        found.get(strong).push({
          occurrenceId: `${token.tokenId}:${strong}`,
          sequence,
          reference: verse.reference,
          chapter: verse.chapter,
          verse: verse.verse,
          tokenIndex: token.tokenIndex,
          tokenId: token.tokenId,
          surface: token.surface,
          lemma: token.lemma,
          morph: token.morph,
          verseText: verse.verseText,
          contextTokens,
        })
      }
    }
  }

  const items = TARGETS.map((target) => {
    const occurrences = found.get(target.strong)
    assert.equal(occurrences.length, target.expectedOccurrences, `${target.strong}: occurrence count drift`)
    assert.equal(occurrences[0]?.reference, target.firstReference, `${target.strong}: first reference drift`)
    const sampleContexts = selectSamples(occurrences)
    assert.ok(sampleContexts.length >= MIN_SAMPLES, `${target.strong}: insufficient sample contexts`)
    return {
      strong: target.strong,
      lemma: target.lemma,
      totalOccurrences: occurrences.length,
      firstReference: occurrences[0].reference,
      sampledContexts: sampleContexts.length,
      distinctSampleMorphs: [...new Set(sampleContexts.map((item) => item.morph || '(none)'))],
      sampleContexts,
    }
  })

  const report = {
    schemaVersion: 1,
    track: 'genesis-lexicon-v4',
    reportId: 'genesis-v4-production-batch-02-contexts-v1',
    status: 'ACTUAL_CONTEXT_EXTRACTION_COMPLETE_CANDIDATE_PREP_NEXT',
    source: { id: 'openscriptures-hebrew-bible-genesis', file: '.oshb-cache/Gen.xml', digest: sourceDigest, windowRadius: WINDOW_RADIUS },
    rules: { minimumPerTarget: MIN_SAMPLES, firstAttestedRequired: true, morphologyDiversityPreferred: true, surfaceAndStrongIdentityPreserved: true },
    counts: { targets: items.length, totalOccurrences: items.reduce((sum, item) => sum + item.totalOccurrences, 0), sampledContexts: items.reduce((sum, item) => sum + item.sampledContexts, 0) },
    items,
    governance: { researchOnly: true, candidateMutation: false, approvalRegistryMutation: false, productionMutation: false, qualityGateWeakeningAllowed: false },
    nextGate: 'GENERATE_SOURCE_FAITHFUL_KOREAN_CANDIDATES_USING_PINNED_TBESH_BDB_PLUS_ACTUAL_CONTEXTS_THEN_INDEPENDENT_AUDIT_PREP',
  }

  assert.equal(report.counts.targets, 10)
  assert.equal(report.counts.totalOccurrences, 2482)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`✓ Genesis batch-02 contexts · targets=${report.counts.targets} · occurrences=${report.counts.totalOccurrences} · samples=${report.counts.sampledContexts}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
