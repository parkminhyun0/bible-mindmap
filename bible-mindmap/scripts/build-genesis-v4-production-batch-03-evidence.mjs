#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = resolve(__dirname, '..')
const REPO_ROOT = resolve(APP_ROOT, '..')

const SELECTION_PATH = resolve(APP_ROOT, 'reports/genesis-v4-production-batch-03-selection-2026-08-12.json')
const TBESH_LOCK_PATH = resolve(APP_ROOT, 'reports/genesis-v4-production-batch-03-tbesh-source-node-lock-2026-08-12.json')
const REGISTRY_PATH = resolve(APP_ROOT, 'data/lexicon/source-registry.json')
const DEFAULT_OUTPUT = resolve(APP_ROOT, 'reports/genesis-v4-production-batch-03-evidence.json')
const CACHE_DIR = resolve(APP_ROOT, '.cache/openscriptures-hebrewlexicon-batch03')
const PRIMARY_SOURCE_ID = 'openscriptures-hebrewlexicon-bdb'
const REQUIRED_FILES = ['LexicalIndex.xml', 'BrownDriverBriggs.xml', 'BDBPartsOfSpeech.xml']
const WINDOW_RADIUS = 4
const MIN_SAMPLES = 3

function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function decodeXml(value = '') {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
}

function normalizeText(value = '') {
  return decodeXml(value).replace(/\s+/g, ' ').trim()
}

function parseAttributes(source = '') {
  const attributes = {}
  const pattern = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
  for (const match of String(source).matchAll(pattern)) {
    attributes[match[1]] = decodeXml(match[2] ?? match[3] ?? '')
  }
  return attributes
}

function stripTags(value = '') {
  return normalizeText(String(value).replace(/<[^>]+>/g, ' '))
}

function firstTag(fragment, name) {
  const pattern = new RegExp(`<${name}\\b([^>]*)>([\\s\\S]*?)<\\/${name}>`, 'i')
  const match = pattern.exec(fragment)
  if (!match) return null
  return { attributes: parseAttributes(match[1]), text: stripTags(match[2]), raw: match[0] }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function parseLexicalIndex(xml) {
  const byStrong = new Map()
  const pattern = /<entry\b([^>]*)>([\s\S]*?)<\/entry>/g
  for (const match of xml.matchAll(pattern)) {
    const entryAttrs = parseAttributes(match[1])
    const body = match[2]
    const xrefMatch = /<xref\b([^>]*?)(?:\/?>)/i.exec(body)
    if (!xrefMatch) continue
    const xref = parseAttributes(xrefMatch[1])
    const strongNumbers = [...String(xref.strong || '').matchAll(/\d+/g)]
      .map((item) => Number.parseInt(item[0], 10))
      .filter((value) => Number.isInteger(value) && value > 0)
    if (!strongNumbers.length) continue
    const word = firstTag(body, 'w')
    const pos = firstTag(body, 'pos')
    const briefDef = firstTag(body, 'def')
    const etym = firstTag(body, 'etym')
    for (const number of strongNumbers) {
      const strong = `H${number}`
      const mapping = {
        lexicalId: entryAttrs.id || null,
        strong,
        bdbId: xref.bdb || null,
        twot: xref.twot || null,
        lemma: word?.text || null,
        transliteration: word?.attributes?.xlit || null,
        partOfSpeechCode: pos?.text || null,
        briefDefinition: briefDef?.text || null,
        etymology: etym?.text || null,
        etymologyType: etym?.attributes?.type || null,
      }
      if (!byStrong.has(strong)) byStrong.set(strong, [])
      byStrong.get(strong).push(mapping)
    }
  }
  return byStrong
}

function parsePartOfSpeech(xml) {
  const map = new Map()
  const pattern = /<POS\b[^>]*>([\s\S]*?)<\/POS>/g
  for (const match of xml.matchAll(pattern)) {
    const code = firstTag(match[1], 'Code')?.text
    const name = firstTag(match[1], 'Name')?.text
    if (code && name && !map.has(code)) map.set(code, name)
  }
  return map
}

function extractBdbEntries(xml, targetIds) {
  const entries = new Map()
  const pattern = /<entry\b([^>]*\bid=(?:"[^"]+"|'[^']+')[^>]*)>([\s\S]*?)<\/entry>/g
  for (const match of xml.matchAll(pattern)) {
    const attributes = parseAttributes(match[1])
    if (!attributes.id || !targetIds.has(attributes.id)) continue
    entries.set(attributes.id, { id: attributes.id, attributes, raw: match[0], body: match[2] })
  }
  return entries
}

function parseXmlFragment(fragment) {
  const root = { type: 'element', name: 'root', attributes: {}, children: [] }
  const stack = [root]
  const tokenPattern = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<\/[A-Za-z_][\w:.-]*\s*>|<[A-Za-z_][\w:.-]*(?:\s+(?:[^>"']|"[^"]*"|'[^']*')*)?\/?>|[^<]+/g
  for (const tokenMatch of String(fragment).matchAll(tokenPattern)) {
    const token = tokenMatch[0]
    if (!token || token.startsWith('<!--') || token.startsWith('<?')) continue
    if (token.startsWith('<![CDATA[')) {
      stack.at(-1).children.push({ type: 'text', value: token.slice(9, -3) })
      continue
    }
    if (token.startsWith('</')) {
      if (stack.length > 1) stack.pop()
      continue
    }
    if (token.startsWith('<')) {
      const open = /^<([A-Za-z_][\w:.-]*)([\s\S]*?)\/?\s*>$/.exec(token)
      if (!open) continue
      const node = { type: 'element', name: open[1], attributes: parseAttributes(open[2]), children: [] }
      stack.at(-1).children.push(node)
      if (!/\/\s*>$/.test(token)) stack.push(node)
      continue
    }
    stack.at(-1).children.push({ type: 'text', value: token })
  }
  return root.children.find((child) => child.type === 'element') || root
}

function serializeNode(node) {
  if (node.type === 'text') return node.value
  const attrs = Object.entries(node.attributes || {})
    .map(([key, value]) => ` ${key}="${value}"`).join('')
  return `<${node.name}${attrs}>${(node.children || []).map(serializeNode).join('')}</${node.name}>`
}

function collectText(node, excludedNames = new Set()) {
  if (node.type === 'text') return node.value
  if (excludedNames.has(node.name)) return ''
  return (node.children || []).map((child) => collectText(child, excludedNames)).join(' ')
}

function directSemanticText(node) {
  return normalizeText(collectText(node, new Set(['sense', 'status'])))
}

function buildSourceNodes(entryRecord) {
  const root = parseXmlFragment(entryRecord.raw)
  const nodes = []
  const rootId = `bdb:${entryRecord.id}`
  const rootText = directSemanticText(root) || normalizeText(collectText(root, new Set(['status'])))
  nodes.push({
    id: rootId,
    parentId: null,
    nodeType: 'entry',
    label: entryRecord.attributes.type || 'entry',
    text: rootText,
    sourceHash: sha256(entryRecord.raw),
  })

  function visitSenses(parent, parentId, path = []) {
    let ordinal = 0
    for (const child of parent.children || []) {
      if (child.type !== 'element' || child.name !== 'sense') continue
      ordinal += 1
      const nextPath = [...path, ordinal]
      const nodeId = `${rootId}:s${nextPath.join('.')}`
      const text = directSemanticText(child) || normalizeText(collectText(child, new Set(['status'])))
      nodes.push({
        id: nodeId,
        parentId,
        nodeType: 'sense',
        label: child.attributes.n || String(ordinal),
        text,
        sourceHash: sha256(serializeNode(child)),
      })
      visitSenses(child, nodeId, nextPath)
    }
  }

  visitSenses(root, rootId)
  return nodes.filter((node) => node.text)
}

function resolveGenesisXml() {
  const candidates = [resolve(REPO_ROOT, '.oshb-cache/Gen.xml'), resolve(APP_ROOT, '.oshb-cache/Gen.xml')]
  const found = candidates.find(existsSync)
  if (!found) throw new Error(`Genesis OSHB source not found: ${candidates.join(', ')}`)
  return found
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

async function downloadPrimarySourceFiles(primary) {
  assert.equal(primary.license?.status, 'approved', 'primary BDB license must be approved')
  assert.equal(primary.license?.expression, 'CC-BY-4.0', 'primary BDB license drift')
  assert.equal(primary.license?.externalLlmInputAllowed, true, 'primary BDB external LLM input must remain allowed')
  assert.equal(primary.workflow?.status, 'approved-ready', 'primary BDB workflow must remain approved-ready')
  assert.equal(primary.workflow?.autoProcessingAllowed, true, 'primary BDB auto processing must remain allowed')

  const version = primary.provenance?.version
  const repositoryUrl = primary.provenance?.repositoryUrl
  if (!version || !repositoryUrl?.startsWith('https://github.com/')) throw new Error('primary source repository/version missing')
  const repository = repositoryUrl.slice('https://github.com/'.length).replace(/\.git$/, '').replace(/\/$/, '')
  mkdirSync(CACHE_DIR, { recursive: true })
  const files = {}
  for (const filename of REQUIRED_FILES) {
    const destination = resolve(CACHE_DIR, filename)
    let content
    if (existsSync(destination)) {
      content = readFileSync(destination, 'utf8')
    } else {
      const url = `https://raw.githubusercontent.com/${repository}/${version}/${filename}`
      const response = await fetch(url, { headers: { 'User-Agent': 'bible-mindmap-genesis-v4-batch03' } })
      if (!response.ok) throw new Error(`${filename} download failed: HTTP ${response.status}`)
      content = await response.text()
      if (!content.includes('<?xml')) throw new Error(`${filename}: XML format check failed`)
      writeFileSync(destination, content, 'utf8')
    }
    files[filename] = content
  }
  return { repository, version, files }
}

async function main() {
  const outputArg = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6)
  const out = outputArg ? resolve(process.cwd(), outputArg) : DEFAULT_OUTPUT

  const selectionRaw = readFileSync(SELECTION_PATH, 'utf8')
  const tbeshRaw = readFileSync(TBESH_LOCK_PATH, 'utf8')
  const registryRaw = readFileSync(REGISTRY_PATH, 'utf8')
  const selection = JSON.parse(selectionRaw)
  const tbesh = JSON.parse(tbeshRaw)
  const registry = JSON.parse(registryRaw)

  assert.equal(selection.reportId, 'genesis-v4-production-batch-03-selection-2026-08-12')
  assert.equal(selection.checks?.requested, 10)
  assert.equal(selection.checks?.found, 10)
  assert.equal(selection.checks?.totalOccurrences, 2529)
  assert.equal(tbesh.checks?.batchTargets, 10)
  assert.equal(tbesh.checks?.tbeshNodesPinned, 10)
  assert.equal(registry.policyVersion, '1.2')

  const tbeshByStrong = new Map((tbesh.targets || []).map((item) => [item.strong, item]))
  const targets = (selection.targets || []).map((item) => ({
    ...item,
    lemma: tbeshByStrong.get(item.strong)?.lemma || null,
  }))
  assert.equal(targets.length, 10)
  assert.ok(targets.every((item) => item.lemma), 'all target lemmas must be pinned by TBESH lock')

  const primary = (registry.sources || []).find((source) => source.sourceId === PRIMARY_SOURCE_ID)
  assert.ok(primary, 'primary OpenScriptures BDB source missing from machine registry')
  const downloaded = await downloadPrimarySourceFiles(primary)
  const lexicalXml = downloaded.files['LexicalIndex.xml']
  const bdbXml = downloaded.files['BrownDriverBriggs.xml']
  const posXml = downloaded.files['BDBPartsOfSpeech.xml']

  const lexicalByStrong = parseLexicalIndex(lexicalXml)
  const posMap = parsePartOfSpeech(posXml)
  const requestedBdbIds = new Set()
  for (const target of targets) {
    for (const mapping of lexicalByStrong.get(target.strong) || []) {
      if (mapping.bdbId) requestedBdbIds.add(mapping.bdbId)
    }
  }
  const bdbEntries = extractBdbEntries(bdbXml, requestedBdbIds)

  const genesisPath = resolveGenesisXml()
  const genesisXml = readFileSync(genesisPath, 'utf8')
  const verses = parseGenesisVerses(genesisXml)
  assert.ok(verses.length > 0, 'Genesis OSHB verses missing')

  const targetMap = new Map(targets.map((target) => [target.strong, target]))
  const occurrencesByStrong = new Map(targets.map((target) => [target.strong, []]))
  let sequence = 0

  for (const verse of verses) {
    for (const token of verse.tokens) {
      for (const strong of token.strongIds) {
        if (!targetMap.has(strong)) continue
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
        occurrencesByStrong.get(strong).push({
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

  const items = targets.map((target) => {
    const lexicalMappings = (lexicalByStrong.get(target.strong) || []).map((mapping) => ({
      ...mapping,
      partOfSpeechLabel: mapping.partOfSpeechCode ? (posMap.get(mapping.partOfSpeechCode) || null) : null,
    }))
    assert.ok(lexicalMappings.length > 0, `${target.strong}: LexicalIndex mapping missing`)
    const bdbIds = unique(lexicalMappings.map((mapping) => mapping.bdbId))
    assert.ok(bdbIds.length > 0, `${target.strong}: BDB id mapping missing`)
    const mappedEntries = bdbIds.map((id) => bdbEntries.get(id)).filter(Boolean)
    assert.equal(mappedEntries.length, bdbIds.length, `${target.strong}: mapped BDB entry missing`)
    const sourceNodes = mappedEntries.flatMap(buildSourceNodes)
    assert.ok(sourceNodes.length > 0, `${target.strong}: BDB source nodes missing`)

    const occurrences = occurrencesByStrong.get(target.strong)
    assert.equal(occurrences.length, target.occurrences, `${target.strong}: occurrence count drift`)
    assert.equal(occurrences[0]?.reference, target.firstReference, `${target.strong}: first reference drift`)
    const sampleContexts = selectSamples(occurrences)
    assert.ok(sampleContexts.length >= MIN_SAMPLES, `${target.strong}: insufficient representative contexts`)

    return {
      strong: target.strong,
      expectedLemma: target.lemma,
      riskHints: target.riskHints || [],
      lexicalMappings,
      bdbEntries: mappedEntries.map((entry) => ({
        id: entry.id,
        type: entry.attributes.type || null,
        cite: entry.attributes.cite || null,
        form: entry.attributes.form || null,
        sourceHash: sha256(entry.raw),
        rawLength: Buffer.byteLength(entry.raw, 'utf8'),
      })),
      sourceNodes,
      sourceCoverage: {
        lexicalMappings: lexicalMappings.length,
        requestedBdbEntries: bdbIds.length,
        materializedBdbEntries: mappedEntries.length,
        sourceNodes: sourceNodes.length,
        missingBdbIds: bdbIds.filter((id) => !bdbEntries.has(id)),
      },
      contextEvidence: {
        totalOccurrences: occurrences.length,
        firstReference: occurrences[0].reference,
        sampledContexts: sampleContexts.length,
        distinctSampleMorphs: unique(sampleContexts.map((item) => item.morph || '(none)')),
        sampleContexts,
      },
    }
  })

  const report = {
    schemaVersion: 1,
    track: 'genesis-lexicon-v4',
    reportId: 'genesis-v4-production-batch-03-evidence-v1',
    status: 'PRIMARY_BDB_AND_CONTEXT_MORPHOLOGY_MATERIALIZED_CANDIDATE_PREP_NEXT',
    generatedAt: new Date().toISOString(),
    researchBranch: 'chatgpt/genesis-v4-production-batch-03',
    derivedMain: process.env.DERIVED_MAIN || null,
    inputs: {
      selection: { path: 'reports/genesis-v4-production-batch-03-selection-2026-08-12.json', digest: sha256(selectionRaw) },
      tbeshSourceNodeLock: { path: 'reports/genesis-v4-production-batch-03-tbesh-source-node-lock-2026-08-12.json', digest: sha256(tbeshRaw) },
      sourceRegistry: { path: 'data/lexicon/source-registry.json', policyVersion: registry.policyVersion, digest: sha256(registryRaw) },
    },
    primarySource: {
      sourceId: primary.sourceId,
      repository: downloaded.repository,
      version: downloaded.version,
      registryContentHash: primary.provenance?.contentHash || null,
      licenseStatus: primary.license?.status || null,
      licenseExpression: primary.license?.expression || null,
      externalLlmInputAllowed: primary.license?.externalLlmInputAllowed === true,
      derivativeAllowed: primary.license?.derivativeAllowed === true,
      files: REQUIRED_FILES.map((filename) => ({ filename, digest: sha256(downloaded.files[filename]) })),
    },
    contextSource: {
      sourceId: 'openscriptures-hebrew-bible-genesis',
      file: genesisPath.endsWith('.oshb-cache/Gen.xml') ? '.oshb-cache/Gen.xml' : genesisPath,
      digest: sha256(genesisXml),
      windowRadius: WINDOW_RADIUS,
      minimumSamplesPerTarget: MIN_SAMPLES,
      morphologyDiversityPreferred: true,
    },
    counts: {
      targets: items.length,
      totalOccurrences: items.reduce((sum, item) => sum + item.contextEvidence.totalOccurrences, 0),
      sampledContexts: items.reduce((sum, item) => sum + item.contextEvidence.sampledContexts, 0),
      lexicalMappings: items.reduce((sum, item) => sum + item.sourceCoverage.lexicalMappings, 0),
      bdbEntries: items.reduce((sum, item) => sum + item.sourceCoverage.materializedBdbEntries, 0),
      sourceNodes: items.reduce((sum, item) => sum + item.sourceCoverage.sourceNodes, 0),
      targetsWithCompleteBdbCoverage: items.filter((item) => item.sourceCoverage.missingBdbIds.length === 0).length,
    },
    items,
    governance: {
      researchOnly: true,
      candidateMutation: false,
      approvalRegistryMutation: false,
      productionMutation: false,
      existingApprovedMeaningMutation: false,
      qualityGateWeakeningAllowed: false,
      selfApprovalAllowed: false,
      independentAuditRequiredBeforePromotion: true,
    },
    nextGate: 'GENERATE_SOURCE_FAITHFUL_KOREAN_CANDIDATES_FROM_PINNED_TBESH_PLUS_FULL_BDB_PLUS_ACTUAL_GENESIS_CONTEXT_MORPHOLOGY_THEN_FREEZE_EXACT_AUDIT_BASELINE',
  }

  assert.equal(report.counts.targets, 10)
  assert.equal(report.counts.totalOccurrences, 2529)
  assert.equal(report.counts.targetsWithCompleteBdbCoverage, 10)
  assert.ok(report.counts.sampledContexts >= 30)
  assert.ok(report.counts.bdbEntries >= 10)
  assert.ok(report.counts.sourceNodes >= report.counts.bdbEntries)

  report.reportFingerprint = sha256(JSON.stringify(report))
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`✓ Genesis batch-03 evidence · targets=${report.counts.targets} · occurrences=${report.counts.totalOccurrences} · samples=${report.counts.sampledContexts} · bdbEntries=${report.counts.bdbEntries} · sourceNodes=${report.counts.sourceNodes}`)
  console.log(`✓ fingerprint=${report.reportFingerprint}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
