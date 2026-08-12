#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

const BDB_COMMIT = '21c9add13bc727d3a951361778e97e3ff7afd1ce'
const BDB_URL = `https://raw.githubusercontent.com/openscriptures/HebrewLexicon/${BDB_COMMIT}/BrownDriverBriggs.xml`
const EXPECTED = Object.freeze({
  H3068: { bdbId: 'e.az.ae', count: 6 },
  H1: { bdbId: 'a.ae.ab', count: 10 },
  H1121: { bdbId: 'b.ca.aa', count: 12 },
  H1961: { bdbId: 'e.bf.aa', count: 33 },
  H376: { bdbId: 'a.da.ab', count: 1 },
  H802: { bdbId: 'a.eq.ab', count: 5 },
  H559: { bdbId: 'a.ea.aa', count: 9 },
  H6213: { bdbId: 'p.fy.aa', count: 29 },
  H7200: { bdbId: 't.ab.aa', count: 28 },
})

function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`
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

export async function buildBatch02BdbSourceHashLock() {
  const response = await fetch(BDB_URL, { headers: { 'User-Agent': 'bible-mindmap-genesis-v4-batch02-hash-lock' } })
  assert.equal(response.ok, true, `BDB download failed: HTTP ${response.status}`)
  const xml = await response.text()
  assert.ok(xml.includes('<?xml'), 'BDB XML format check failed')

  const targetIds = new Set([
    ...Object.values(EXPECTED).map((item) => item.bdbId),
    'l.ab.aa',
    'b.ap.aa',
  ])
  const entries = extractBdbEntries(xml, targetIds)
  assert.equal(entries.size, targetIds.size, 'BDB target/fixture entry extraction incomplete')

  const h3808 = buildSourceNodes(entries.get('l.ab.aa'))
  assert.equal(h3808.length, 1, 'H3808 fixture node count drift')
  assert.equal(h3808[0].sourceHash, 'sha256:587f344a9039f24546edde83f33180f63c98680c02bf32b1732a5ff8f2cdb02e', 'H3808 historical root hash mismatch')

  const h935 = buildSourceNodes(entries.get('b.ap.aa'))
  assert.equal(h935[0].sourceHash, 'sha256:3dad0722970721273d068025436181f2c646a201df97b30c202fb6ca3b9998f8', 'H935 historical root hash mismatch')
  assert.equal(h935.find((node) => node.id === 'bdb:b.ap.aa:s1')?.sourceHash, 'sha256:fc85bf46f3225512719229cddb19cc98da6878191fad9bda20332718d196af30', 'H935 historical nested hash mismatch')

  const targets = []
  let totalNodes = 0
  for (const [strong, expected] of Object.entries(EXPECTED)) {
    const sourceNodes = buildSourceNodes(entries.get(expected.bdbId))
    assert.equal(sourceNodes.length, expected.count, `${strong}: source node count drift`)
    targets.push({ strong, bdbEntryId: expected.bdbId, sourceNodeCount: sourceNodes.length, sourceNodes })
    totalNodes += sourceNodes.length
  }
  assert.equal(totalNodes, 133, 'Batch 02 new-source-node total must remain 133')

  return {
    schemaVersion: 1,
    reportId: 'genesis-v4-production-batch-02-bdb-source-node-hash-lock-runtime',
    status: 'SOURCE_NODE_HASH_LOCK_COMPLETE_133_OF_133_RUNTIME_DIAGNOSTIC',
    source: {
      repository: 'openscriptures/HebrewLexicon',
      commit: BDB_COMMIT,
      path: 'BrownDriverBriggs.xml',
      contentHash: sha256(xml),
    },
    algorithm: {
      lineage: 'byte-and-parser-equivalent to build-genesis-v4-production-batch-03-evidence.mjs',
      entryRoot: 'sha256(exact <entry>...</entry> substring)',
      nestedSense: 'sha256(serializeNode(parsed <sense> fragment))',
      sourceNodeKey: 'bdb:<entryId> + recursive :s<ordinal.path>',
    },
    historicalFixtureValidation: {
      H3808Root: h3808[0].sourceHash,
      H935Root: h935[0].sourceHash,
      H935Sense1: h935.find((node) => node.id === 'bdb:b.ap.aa:s1')?.sourceHash,
      status: 'PASS_3_OF_3',
    },
    counts: { newTargets: targets.length, sourceNodes: totalNodes, sourceNodeCoverage: '133/133' },
    targets,
    governance: {
      diagnosticOnly: true,
      candidateMutation: false,
      approvalRegistryMutation: false,
      productionMutation: false,
      existingApprovedMeaningMutation: false,
      qualityGateWeakeningAllowed: false,
    },
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const report = await buildBatch02BdbSourceHashLock()
  console.log(JSON.stringify(report))
}
