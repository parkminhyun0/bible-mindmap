#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { normalizeRegistry } from './lib/source-registry-adapter.mjs'

const DEFAULT_BATCH_PATH = 'reports/genesis-g2-calibration-batch.json'
const DEFAULT_REGISTRY_PATH = 'data/lexicon/source-registry.json'
const DEFAULT_CACHE_DIR = '.cache/openscriptures-hebrewlexicon'
const DEFAULT_OUTPUT_PATH = 'reports/genesis-g2-bdb-source-packets.json'
const PRIMARY_SOURCE_ID = 'openscriptures-hebrewlexicon-bdb'
const REQUIRED_FILES = ['LexicalIndex.xml', 'BrownDriverBriggs.xml', 'BDBPartsOfSpeech.xml']

function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

function decodeXml(value = '') {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function normalizeText(value = '') {
  return decodeXml(value).replace(/\s+/g, ' ').trim()
}

function parseAttributes(source = '') {
  const attributes = {}
  const pattern = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
  for (const match of source.matchAll(pattern)) {
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
  return {
    attributes: parseAttributes(match[1]),
    text: stripTags(match[2]),
    raw: match[0],
  }
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
    const strongNumbers = [...String(xref.strong || '').matchAll(/\d+/g)].map((item) => Number.parseInt(item[0], 10))
    if (!strongNumbers.length) continue
    const word = firstTag(body, 'w')
    const pos = firstTag(body, 'pos')
    const briefDef = firstTag(body, 'def')
    const etym = firstTag(body, 'etym')
    for (const number of strongNumbers) {
      if (!Number.isInteger(number) || number < 1) continue
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
    entries.set(attributes.id, {
      id: attributes.id,
      attributes,
      raw: match[0],
      body: match[2],
    })
  }
  return entries
}

function parseXmlFragment(fragment) {
  const root = { type: 'element', name: 'root', attributes: {}, children: [] }
  const stack = [root]
  const tokenPattern = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<\/[A-Za-z_][\w:.-]*\s*>|<[A-Za-z_][\w:.-]*(?:\s+(?:[^>"']|"[^"]*"|'[^']*')*)?\/?>|[^<]+/g
  for (const tokenMatch of fragment.matchAll(tokenPattern)) {
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
      const node = {
        type: 'element',
        name: open[1],
        attributes: parseAttributes(open[2]),
        children: [],
      }
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
    .map(([key, value]) => ` ${key}="${value}"`)
    .join('')
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

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

export function materializeGenesisBdbPackets({ batch, registry, lexicalXml, bdbXml, posXml, sourceDigests = null }) {
  if (batch?.batchId !== 'genesis-g2-calibration-100-v1' || !Array.isArray(batch.items)) {
    throw new Error('Genesis G2 calibration batch가 필요합니다.')
  }
  const primary = registry?.sources?.find((source) => source.id === PRIMARY_SOURCE_ID)
  if (!primary || primary.licenseStatus !== 'verified-public-or-permitted') {
    throw new Error('Open Scriptures BDB primary source Gate가 필요합니다.')
  }
  if (!primary.versionRef) throw new Error('Open Scriptures BDB versionRef가 필요합니다.')

  const lexicalByStrong = parseLexicalIndex(lexicalXml)
  const posMap = parsePartOfSpeech(posXml)
  const targetBdbIds = new Set()
  for (const item of batch.items) {
    for (const mapping of lexicalByStrong.get(item.strong) || []) {
      if (mapping.bdbId) targetBdbIds.add(mapping.bdbId)
    }
  }
  const bdbEntries = extractBdbEntries(bdbXml, targetBdbIds)

  const packets = batch.items.map((item) => {
    const lexicalMappings = (lexicalByStrong.get(item.strong) || []).map((mapping) => ({
      ...mapping,
      partOfSpeechLabel: mapping.partOfSpeechCode ? (posMap.get(mapping.partOfSpeechCode) || null) : null,
    }))
    const mappedEntries = unique(lexicalMappings.map((mapping) => mapping.bdbId))
      .map((id) => bdbEntries.get(id))
      .filter(Boolean)
    const sourceNodes = mappedEntries.flatMap(buildSourceNodes)
    const missingBdbIds = unique(lexicalMappings.map((mapping) => mapping.bdbId))
      .filter((id) => !bdbEntries.has(id))

    return {
      schemaVersion: 1,
      packetId: `genesis-g2-source:${item.strong}`,
      strong: item.strong,
      category: item.category,
      sourcePacketStatus: lexicalMappings.length > 0 && mappedEntries.length > 0 && missingBdbIds.length === 0
        ? 'ready'
        : 'blocked',
      identity: {
        lemmas: unique(lexicalMappings.map((mapping) => mapping.lemma)),
        transliterations: unique(lexicalMappings.map((mapping) => mapping.transliteration)),
        partOfSpeechCodes: unique(lexicalMappings.map((mapping) => mapping.partOfSpeechCode)),
        partOfSpeechLabels: unique(lexicalMappings.map((mapping) => mapping.partOfSpeechLabel)),
        briefDefinitions: unique(lexicalMappings.map((mapping) => mapping.briefDefinition)),
      },
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
        requestedBdbEntries: unique(lexicalMappings.map((mapping) => mapping.bdbId)).length,
        materializedBdbEntries: mappedEntries.length,
        sourceNodes: sourceNodes.length,
        missingBdbIds,
      },
      source: {
        sourceId: primary.id,
        versionRef: primary.versionRef,
        licenseStatus: primary.licenseStatus,
        attribution: primary.attribution,
      },
      modelBoundary: {
        translationStatus: 'not-started',
        nvidiaOutputVisibleToGptBeforeComparison: false,
        gptOutputVisibleToNvidiaBeforeComparison: false,
        productionWriteAllowed: false,
      },
      targetPayloadPath: item.payloadPath,
    }
  })

  const resolvedDigests = sourceDigests || {
    'LexicalIndex.xml': sha256(lexicalXml),
    'BrownDriverBriggs.xml': sha256(bdbXml),
    'BDBPartsOfSpeech.xml': sha256(posXml),
  }

  return {
    schemaVersion: 1,
    packetSetId: 'genesis-g2-calibration-bdb-source-packets-v1',
    batchId: batch.batchId,
    contractVersion: batch.contractVersion,
    sourcePolicyVersion: batch.sourcePolicyVersion,
    governance: {
      theologicalFramework: 'reformed-westminster-primary',
      sourceOnly: true,
      translationStarted: false,
      productionWriteAllowed: false,
      sourceNodeMutationAllowed: false,
    },
    source: {
      id: primary.id,
      repository: primary.repository,
      versionRef: primary.versionRef,
      licenseStatus: primary.licenseStatus,
      attribution: primary.attribution,
      files: REQUIRED_FILES.map((filename) => ({ filename, digest: resolvedDigests[filename] })),
    },
    counts: {
      requested: packets.length,
      ready: packets.filter((packet) => packet.sourcePacketStatus === 'ready').length,
      blocked: packets.filter((packet) => packet.sourcePacketStatus === 'blocked').length,
      lexicalMappings: packets.reduce((sum, packet) => sum + packet.lexicalMappings.length, 0),
      bdbEntries: packets.reduce((sum, packet) => sum + packet.bdbEntries.length, 0),
      sourceNodes: packets.reduce((sum, packet) => sum + packet.sourceNodes.length, 0),
    },
    packets,
  }
}

async function downloadSourceFiles(registry, cacheDir) {
  const primary = registry.sources.find((source) => source.id === PRIMARY_SOURCE_ID)
  if (!primary?.repository || !primary?.versionRef) {
    throw new Error('primary source repository/versionRef 누락')
  }
  mkdirSync(cacheDir, { recursive: true })
  const result = {}
  for (const filename of REQUIRED_FILES) {
    const destination = resolve(cacheDir, filename)
    let content
    if (existsSync(destination)) {
      content = readFileSync(destination, 'utf8')
    } else {
      const url = `https://raw.githubusercontent.com/${primary.repository}/${primary.versionRef}/${filename}`
      const response = await fetch(url, { headers: { 'User-Agent': 'bible-mindmap-lexicon-materializer' } })
      if (!response.ok) throw new Error(`${filename} 다운로드 실패: HTTP ${response.status}`)
      content = await response.text()
      if (!content.includes('<?xml')) throw new Error(`${filename} XML 형식 확인 실패`)
      writeFileSync(destination, content, 'utf8')
    }
    result[filename] = content
  }
  return result
}

function parseArgs(argv) {
  const args = {
    batch: DEFAULT_BATCH_PATH,
    registry: DEFAULT_REGISTRY_PATH,
    cacheDir: DEFAULT_CACHE_DIR,
    output: DEFAULT_OUTPUT_PATH,
    selfTest: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--self-test') args.selfTest = true
    else if (arg === '--batch') args.batch = argv[++index]
    else if (arg.startsWith('--batch=')) args.batch = arg.slice(8)
    else if (arg === '--registry') args.registry = argv[++index]
    else if (arg.startsWith('--registry=')) args.registry = arg.slice(11)
    else if (arg === '--cache-dir') args.cacheDir = argv[++index]
    else if (arg.startsWith('--cache-dir=')) args.cacheDir = arg.slice(12)
    else if (arg === '--output') args.output = argv[++index]
    else if (arg.startsWith('--output=')) args.output = arg.slice(9)
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return args
}

function fixture() {
  const batch = {
    batchId: 'genesis-g2-calibration-100-v1',
    contractVersion: 'fixture-contract',
    sourcePolicyVersion: 'fixture-policy',
    items: [
      { strong: 'H1', category: 'existing-control', payloadPath: 'candidate/H1.json' },
      { strong: 'H6', category: 'core-theology-context', payloadPath: 'candidate/H6.json' },
    ],
  }
  const registry = {
    sources: [{
      id: PRIMARY_SOURCE_ID,
      role: 'primary-source',
      repository: 'openscriptures/HebrewLexicon',
      versionRef: 'fixture',
      licenseStatus: 'verified-public-or-permitted',
      attribution: 'Open Scriptures Hebrew Bible Project',
    }],
  }
  const lexicalXml = `<?xml version="1.0"?><index><part>
    <entry id="aac"><w xlit="ab">אָב</w><pos>N</pos><def>father</def><xref bdb="a.ae.ab" strong="1" twot="4a"/></entry>
    <entry id="aaf"><w xlit="abad">אָבַד</w><pos>V</pos><def>perish</def><xref bdb="a.ac.aa" strong="6" twot="2"/></entry>
  </part></index>`
  const bdbXml = `<?xml version="1.0"?><lexicon><part><section>
    <entry id="a.ae.ab" cite="full"><w>אָב</w><pos>n.m.</pos><sense n="1"><def>father</def><sense n="a"><def>of an individual</def></sense></sense><status>done</status></entry>
    <entry id="a.ac.aa" type="root"><w>אָבַד</w><pos>vb</pos><def>perish</def><sense n="1"><def>die</def></sense></entry>
  </section></part></lexicon>`
  const posXml = `<?xml version="1.0"?><PartsOfSpeech><POS><Code>N</Code><Name>Noun</Name></POS><POS><Code>V</Code><Name>Verb</Name></POS></PartsOfSpeech>`
  return { batch, registry, lexicalXml, bdbXml, posXml }
}

function runSelfTest() {
  const input = fixture()
  const result = materializeGenesisBdbPackets(input)
  assert.equal(result.counts.requested, 2)
  assert.equal(result.counts.ready, 2)
  assert.equal(result.counts.blocked, 0)
  assert(result.packets[0].sourceNodes.length >= 3)
  assert.equal(result.packets[0].identity.partOfSpeechLabels[0], 'Noun')
  assert.equal(result.governance.translationStarted, false)
  console.log('✓ Genesis G2 BDB source packet materializer self-test passed')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) return runSelfTest()
  const batch = JSON.parse(readFileSync(resolve(process.cwd(), args.batch), 'utf8'))
  const registry = normalizeRegistry(JSON.parse(readFileSync(resolve(process.cwd(), args.registry), 'utf8')))
  const files = await downloadSourceFiles(registry, resolve(process.cwd(), args.cacheDir))
  const result = materializeGenesisBdbPackets({
    batch,
    registry,
    lexicalXml: files['LexicalIndex.xml'],
    bdbXml: files['BrownDriverBriggs.xml'],
    posXml: files['BDBPartsOfSpeech.xml'],
  })
  const outputPath = resolve(process.cwd(), args.output)
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  console.log('Genesis G2 BDB source packets')
  console.log(`  requested: ${result.counts.requested}`)
  console.log(`  ready: ${result.counts.ready}`)
  console.log(`  blocked: ${result.counts.blocked}`)
  console.log(`  lexical mappings: ${result.counts.lexicalMappings}`)
  console.log(`  BDB entries: ${result.counts.bdbEntries}`)
  console.log(`  source nodes: ${result.counts.sourceNodes}`)
  console.log(`  output: ${outputPath}`)
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isDirectRun) await main()
