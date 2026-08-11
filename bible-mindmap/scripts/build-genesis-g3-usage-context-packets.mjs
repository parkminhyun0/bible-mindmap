#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { sourceFingerprint } from './ai/lexicon/genesis-g2-translation-contract.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = resolve(__dirname, '..')
const REPO_ROOT = resolve(APP_ROOT, '..')
const DEFAULT_BATCH = 'reports/genesis-g2-calibration-batch.json'
const DEFAULT_SOURCE = 'reports/genesis-g2-bdb-source-packets.json'
const DEFAULT_OUTPUT = 'reports/genesis-g3-usage-context-packets.json'
const DEFAULT_WINDOW_RADIUS = 4
const DEFAULT_SAMPLE_LIMIT = 12

const sha256 = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`

function parseArgs(argv) {
  const args = {
    input: null,
    batch: DEFAULT_BATCH,
    source: DEFAULT_SOURCE,
    output: DEFAULT_OUTPUT,
    windowRadius: DEFAULT_WINDOW_RADIUS,
    sampleLimit: DEFAULT_SAMPLE_LIMIT,
    selfTest: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--self-test') args.selfTest = true
    else if (arg === '--input') args.input = argv[++index]
    else if (arg.startsWith('--input=')) args.input = arg.slice(8)
    else if (arg === '--batch') args.batch = argv[++index]
    else if (arg.startsWith('--batch=')) args.batch = arg.slice(8)
    else if (arg === '--source') args.source = argv[++index]
    else if (arg.startsWith('--source=')) args.source = arg.slice(9)
    else if (arg === '--output') args.output = argv[++index]
    else if (arg.startsWith('--output=')) args.output = arg.slice(9)
    else if (arg.startsWith('--window-radius=')) args.windowRadius = Number(arg.slice(16))
    else if (arg.startsWith('--sample-limit=')) args.sampleLimit = Number(arg.slice(15))
    else throw new Error(`unknown argument: ${arg}`)
  }
  if (!Number.isInteger(args.windowRadius) || args.windowRadius < 1 || args.windowRadius > 12) throw new Error('--window-radius must be 1..12')
  if (!Number.isInteger(args.sampleLimit) || args.sampleLimit < 1 || args.sampleLimit > 50) throw new Error('--sample-limit must be 1..50')
  return args
}

function resolveInputPath(explicitPath) {
  if (explicitPath) return resolve(process.cwd(), explicitPath)
  const candidates = [join(REPO_ROOT, '.oshb-cache', 'Gen.xml'), join(APP_ROOT, '.oshb-cache', 'Gen.xml')]
  const found = candidates.find(existsSync)
  if (!found) throw new Error(`Genesis OSHB source not found: ${candidates.join(', ')}`)
  return found
}

function decodeXml(value = '') {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
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
  return [...map.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}

function chapterRows(occurrences) {
  const map = new Map()
  for (const occurrence of occurrences) map.set(occurrence.chapter, (map.get(occurrence.chapter) || 0) + 1)
  return [...map.entries()].map(([chapter, count]) => ({ chapter, count })).sort((a, b) => a.chapter - b.chapter)
}

function selectSampleOccurrences(occurrences, limit) {
  if (occurrences.length <= limit) return [...occurrences]
  const selected = new Map()
  const add = (item) => {
    if (item && selected.size < limit) selected.set(item.occurrenceId, item)
  }
  add(occurrences[0])
  add(occurrences.at(-1))
  const chapterSeen = new Set()
  for (const occurrence of occurrences) {
    if (!chapterSeen.has(occurrence.chapter)) {
      chapterSeen.add(occurrence.chapter)
      add(occurrence)
    }
  }
  const morphSeen = new Set()
  for (const occurrence of occurrences) {
    const key = occurrence.morph || '(none)'
    if (!morphSeen.has(key)) {
      morphSeen.add(key)
      add(occurrence)
    }
  }
  if (selected.size < limit) {
    const step = (occurrences.length - 1) / Math.max(1, limit - 1)
    for (let index = 0; index < limit; index += 1) add(occurrences[Math.round(index * step)])
  }
  for (const occurrence of occurrences) add(occurrence)
  return [...selected.values()].sort((a, b) => a.sequence - b.sequence)
}

export function buildGenesisUsageContextPackets({ xml, batch, sourceSet, windowRadius = DEFAULT_WINDOW_RADIUS, sampleLimit = DEFAULT_SAMPLE_LIMIT }) {
  if (batch?.batchId !== 'genesis-g2-calibration-100-v1' || !Array.isArray(batch.items)) throw new Error('Genesis G2 calibration batch required')
  if (sourceSet?.packetSetId !== 'genesis-g2-calibration-bdb-source-packets-v1' || !Array.isArray(sourceSet.packets)) throw new Error('Genesis G2 BDB source packet set required')
  const verses = parseGenesisVerses(xml)
  const targetStrongs = new Set(batch.items.map((item) => item.strong))
  const sourceByStrong = new Map(sourceSet.packets.map((packet) => [packet.strong, packet]))
  const occurrenceMap = new Map(batch.items.map((item) => [item.strong, []]))
  let sequence = 0

  for (const verse of verses) {
    for (const token of verse.tokens) {
      for (const strong of token.strongIds) {
        if (!targetStrongs.has(strong)) continue
        sequence += 1
        const start = Math.max(0, token.tokenIndex - 1 - windowRadius)
        const end = Math.min(verse.tokens.length, token.tokenIndex + windowRadius)
        const contextTokens = verse.tokens.slice(start, end).map((item) => ({
          tokenIndex: item.tokenIndex,
          tokenId: item.tokenId,
          surface: item.surface,
          lemma: item.lemma,
          morph: item.morph || null,
          strongIds: item.strongIds,
          focus: item.tokenId === token.tokenId,
        }))
        occurrenceMap.get(strong).push({
          occurrenceId: `${token.tokenId}:${strong}`,
          sequence,
          reference: verse.reference,
          chapter: verse.chapter,
          verse: verse.verse,
          tokenIndex: token.tokenIndex,
          tokenId: token.tokenId,
          surface: token.surface,
          lemma: token.lemma,
          morph: token.morph || null,
          strongIds: token.strongIds,
          verseText: verse.verseText,
          contextTokens,
        })
      }
    }
  }

  const sourceDigest = sha256(xml)
  const packets = batch.items.map((item) => {
    const sourcePacket = sourceByStrong.get(item.strong)
    const occurrences = occurrenceMap.get(item.strong) || []
    const samples = selectSampleOccurrences(occurrences, sampleLimit)
    const ready = sourcePacket?.sourcePacketStatus === 'ready' && occurrences.length === item.occurrences
    return {
      schemaVersion: 1,
      usagePacketId: `genesis-g3-usage:${item.strong}`,
      strong: item.strong,
      category: item.category,
      usagePacketStatus: ready ? 'ready' : 'blocked',
      expectedOccurrences: item.occurrences,
      totalOccurrences: occurrences.length,
      chapters: [...new Set(occurrences.map((entry) => entry.chapter))].sort((a, b) => a - b),
      firstReference: occurrences[0]?.reference || null,
      lastReference: occurrences.at(-1)?.reference || null,
      identity: {
        lemmas: sourcePacket?.identity?.lemmas || [],
        transliterations: sourcePacket?.identity?.transliterations || [],
        partOfSpeechCodes: sourcePacket?.identity?.partOfSpeechCodes || [],
        partOfSpeechLabels: sourcePacket?.identity?.partOfSpeechLabels || [],
      },
      lexicalSource: {
        packetId: sourcePacket?.packetId || null,
        sourceFingerprint: sourcePacket ? sourceFingerprint(sourcePacket) : null,
        sourcePacketStatus: sourcePacket?.sourcePacketStatus || 'missing',
      },
      distribution: {
        byChapter: chapterRows(occurrences),
        surfaceForms: frequencyRows(occurrences.map((entry) => entry.surface)),
        lemmaForms: frequencyRows(occurrences.map((entry) => entry.lemma)),
        morphCodes: frequencyRows(occurrences.map((entry) => entry.morph || '(none)')),
      },
      sampleContextIds: samples.map((entry) => entry.occurrenceId),
      sampleContexts: samples,
      occurrences,
      governance: {
        contextEvidenceOnly: true,
        translationCandidateIncluded: false,
        productionWriteAllowed: false,
        finalApprovalAllowed: false,
      },
    }
  })

  return {
    schemaVersion: 1,
    packetSetId: 'genesis-g3-usage-context-100-v1',
    batchId: batch.batchId,
    sourcePacketSetId: sourceSet.packetSetId,
    source: {
      id: 'openscriptures-hebrew-bible-genesis',
      book: 'Gen',
      language: 'hebrew',
      sourceDigest,
      windowRadius,
      sampleLimit,
    },
    governance: {
      stage: 'G3-context-preparation',
      contextEvidenceOnly: true,
      translationStarted: false,
      productionWriteAllowed: false,
      finalApprovalAllowed: false,
    },
    counts: {
      requested: packets.length,
      ready: packets.filter((packet) => packet.usagePacketStatus === 'ready').length,
      blocked: packets.filter((packet) => packet.usagePacketStatus === 'blocked').length,
      occurrences: packets.reduce((sum, packet) => sum + packet.totalOccurrences, 0),
      sampledContexts: packets.reduce((sum, packet) => sum + packet.sampleContexts.length, 0),
      chapters: new Set(packets.flatMap((packet) => packet.chapters)).size,
    },
    packets,
  }
}

function fixture() {
  const xml = `<osis>
    <chapter osisID="Gen.1"><verse osisID="Gen.1.1">
      <w lemma="0430" morph="HNcmpa" id="w1">אֱלֹהִים</w><w lemma="01254" morph="HVqp3ms" id="w2">בָּרָא</w><w lemma="0853/0776" morph="HTo/HNcfsa" id="w3">אֵת הָאָרֶץ</w>
    </verse><verse osisID="Gen.1.2"><w lemma="0776" morph="HNcfsa" id="w4">הָאָרֶץ</w><w lemma="0430" morph="HNcmpa" id="w5">אֱלֹהִים</w></verse></chapter>
  </osis>`
  const packet = (strong, lemma) => ({
    packetId: `genesis-g2-source:${strong}`,
    strong,
    sourcePacketStatus: 'ready',
    identity: { lemmas: [lemma], transliterations: [strong], partOfSpeechCodes: ['N'], partOfSpeechLabels: ['Noun'] },
    lexicalMappings: [], bdbEntries: [],
    sourceNodes: [{ id: `${strong}:n1`, parentId: null, nodeType: 'entry', label: 'entry', text: lemma, sourceHash: `sha256:${'a'.repeat(64)}` }],
    source: { sourceId: 'fixture', versionRef: 'fixture' },
  })
  return {
    xml,
    batch: { batchId: 'genesis-g2-calibration-100-v1', items: [
      { strong: 'H430', category: 'core-theology-context', occurrences: 2 },
      { strong: 'H776', category: 'core-theology-context', occurrences: 2 },
    ] },
    sourceSet: { packetSetId: 'genesis-g2-calibration-bdb-source-packets-v1', packets: [packet('H430', 'אֱלֹהִים'), packet('H776', 'אֶרֶץ')] },
  }
}

function runSelfTest() {
  const result = buildGenesisUsageContextPackets(fixture())
  assert.equal(result.counts.requested, 2)
  assert.equal(result.counts.ready, 2)
  assert.equal(result.counts.occurrences, 4)
  assert.equal(result.packets[0].occurrences[0].contextTokens.filter((token) => token.focus).length, 1)
  assert.equal(result.packets[1].distribution.byChapter[0].count, 2)
  assert.equal(result.governance.productionWriteAllowed, false)
  console.log('✓ Genesis G3 usage context packet builder self-test passed')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) return runSelfTest()
  const inputPath = resolveInputPath(args.input)
  const result = buildGenesisUsageContextPackets({
    xml: readFileSync(inputPath, 'utf8'),
    batch: JSON.parse(readFileSync(resolve(args.batch), 'utf8')),
    sourceSet: JSON.parse(readFileSync(resolve(args.source), 'utf8')),
    windowRadius: args.windowRadius,
    sampleLimit: args.sampleLimit,
  })
  const output = resolve(args.output)
  mkdirSync(dirname(output), { recursive: true })
  writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  console.log(`✓ Genesis G3 usage context packets · ready=${result.counts.ready}/${result.counts.requested} · occurrences=${result.counts.occurrences}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()
