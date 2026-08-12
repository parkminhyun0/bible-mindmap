#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { buildBatch02BdbSourceHashLock } from './build-genesis-v4-production-batch-02-bdb-source-hash-lock.mjs'
import { fingerprintWithout, sha256Canonical } from './lib/lexicon-evidence-verifier.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const CURRENT_MAIN = '005a64c3534917aeb625ecc0128c5c80a603e6ee'
const BDB_COMMIT = '21c9add13bc727d3a951361778e97e3ff7afd1ce'
const TARGETS = ['H3068','H1','H1121','H1961','H376','H802','H559','H6213','H7200']
const EXPECTED_NODE_SET_FINGERPRINT = 'sha256:1bd258aaee2f2f70df564540ebfbd0acd610c3865e0282176dface27785b9799'
const POLICY_REVIEWER = { reviewerId: 'lexicon-v4-evidence-and-gate', reviewerType: 'evidence-policy' }
const POS = {
  N: { labelEn: 'noun', labelKo: '명사' },
  Np: { labelEn: 'proper noun', labelKo: '고유명사' },
  V: { labelEn: 'verb', labelKo: '동사' },
}

const PATHS = {
  projection: resolve(ROOT, 'reports/genesis-v4-production-batch-02-bdb-source-node-projection-005a64c3.json'),
  hashLock: resolve(ROOT, 'reports/genesis-v4-production-batch-02-bdb-source-node-hash-lock-005a64c3.json'),
  candidate: resolve(ROOT, 'reports/genesis-v4-production-batch-02-source-candidate-prep-2026-08-12.json'),
  contexts: resolve(ROOT, 'reports/genesis-v4-production-batch-02-contexts.json'),
  publicResearch: resolve(ROOT, 'reports/genesis-v4-production-batch-02-public-research-synthesis-005a64c3.json'),
}

function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')) }

function decodeXml(value = '') {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
}

function normalizeText(value = '') { return decodeXml(value).replace(/\s+/g, ' ').trim() }
function stripTags(value = '') { return normalizeText(String(value).replace(/<[^>]+>/g, ' ')) }

function parseAttributes(source = '') {
  const attributes = {}
  const pattern = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
  for (const match of String(source).matchAll(pattern)) attributes[match[1]] = decodeXml(match[2] ?? match[3] ?? '')
  return attributes
}

function firstTag(fragment, name) {
  const pattern = new RegExp(`<${name}\\b([^>]*)>([\\s\\S]*?)<\\/${name}>`, 'i')
  const match = pattern.exec(fragment)
  if (!match) return null
  return { attributes: parseAttributes(match[1]), text: stripTags(match[2]), raw: match[0] }
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
      const list = byStrong.get(strong) || []
      list.push(mapping)
      byStrong.set(strong, list)
    }
  }
  return byStrong
}

async function downloadText(url, label) {
  const response = await fetch(url, { headers: { 'User-Agent': 'bible-mindmap-genesis-v4-batch02-promotion-prep' } })
  assert.equal(response.ok, true, `${label} download failed: HTTP ${response.status}`)
  return response.text()
}

function buildIdentity(strong, candidateItem, lexicalMappings) {
  const primary = lexicalMappings.find((mapping) => mapping.bdbId === candidateItem.bdbEntryId)
  assert.ok(primary, `${strong}: expected BDB lexical mapping ${candidateItem.bdbEntryId} missing`)
  assert.equal(primary.lemma?.normalize('NFC'), candidateItem.lemma.normalize('NFC'), `${strong}: LexicalIndex lemma drift`)
  assert.ok(primary.transliteration, `${strong}: scientific transliteration missing`)
  const labels = POS[primary.partOfSpeechCode]
  assert.ok(labels, `${strong}: unsupported POS ${primary.partOfSpeechCode}`)
  const identity = {
    schemaVersion: 1,
    identityId: strong,
    sourceForms: [strong],
    canonicalStrong: strong,
    baseStrong: strong,
    disambiguationSuffix: null,
    namespace: 'strong',
    testament: 'old-testament',
    language: 'hebrew',
    lemma: candidateItem.lemma,
    lemmaNormalized: candidateItem.lemma.normalize('NFC'),
    transliteration: { scientific: primary.transliteration, korean: candidateItem.transliteration },
    partOfSpeech: { code: primary.partOfSpeechCode, ...labels },
    sourceRefs: [{ sourceId: 'openscriptures-hebrewlexicon-bdb', locator: `BrownDriverBriggs.xml:${candidateItem.bdbEntryId}` }],
  }
  identity.identityFingerprint = fingerprintWithout(identity, 'identityFingerprint')
  return identity
}

function buildNodeSetFingerprint(hashReport) {
  const pairs = []
  for (const target of hashReport.targets) {
    for (const node of target.sourceNodes) pairs.push({ strong: target.strong, sourceNodeKey: node.id, sourceHash: node.sourceHash })
  }
  return `sha256:${createHash('sha256').update(JSON.stringify(pairs)).digest('hex')}`
}

export async function buildBatch02PromotionPrep() {
  const projection = readJson(PATHS.projection)
  const hashLock = readJson(PATHS.hashLock)
  const candidate = readJson(PATHS.candidate)
  const contexts = readJson(PATHS.contexts)
  const publicResearch = readJson(PATHS.publicResearch)

  assert.equal(projection.currentMain, CURRENT_MAIN, 'projection current-main drift')
  assert.equal(hashLock.currentMain, CURRENT_MAIN, 'hash lock current-main drift')
  assert.equal(hashLock.status, 'SOURCE_NODE_HASH_LOCK_COMPLETE_133_OF_133', 'hash lock incomplete')
  assert.equal(hashLock.sourceNodeSetFingerprint, EXPECTED_NODE_SET_FINGERPRINT, 'committed source-node-set fingerprint drift')
  assert.equal(publicResearch.baseline.currentMain, CURRENT_MAIN, 'public research current-main drift')
  assert.equal(publicResearch.summary.passWithBoundary, 10, 'public research must pass 10/10 with boundary')
  assert.equal(publicResearch.summary.hold, 0, 'public research HOLD must remain zero')
  assert.equal(publicResearch.summary.dispute, 0, 'public research DISPUTE must remain zero')

  const runtimeHash = await buildBatch02BdbSourceHashLock()
  assert.equal(runtimeHash.historicalFixtureValidation.status, 'PASS_3_OF_3', 'historical hash fixtures must pass')
  assert.equal(runtimeHash.counts.sourceNodes, 133, 'runtime source-node count drift')
  assert.equal(buildNodeSetFingerprint(runtimeHash), EXPECTED_NODE_SET_FINGERPRINT, 'runtime 133-node fingerprint does not match committed lock')
  assert.equal(runtimeHash.source.contentHash, hashLock.source.contentHash, 'pinned BDB content hash drift')

  const lexicalXml = await downloadText(`https://raw.githubusercontent.com/openscriptures/HebrewLexicon/${BDB_COMMIT}/LexicalIndex.xml`, 'LexicalIndex')
  const lexicalByStrong = parseLexicalIndex(lexicalXml)
  const registry = JSON.parse(await downloadText(`https://raw.githubusercontent.com/parkminhyun0/bible-mindmap/${CURRENT_MAIN}/bible-mindmap/data/lexicon/approval-registry.json`, 'current-main Approval Registry'))
  assert.equal(registry.registryFingerprint, 'sha256:950afbb902ce696528b2200b2ac560ca9680b9c48d3735388e962703be15bdc1', 'current-main Approval Registry fingerprint drift')

  const registryByStrong = new Map(registry.entries.map((entry) => [entry.identity.canonicalStrong, entry]))
  const existingResearchTargets = ['H430', ...TARGETS].filter((strong) => registryByStrong.has(strong))
  assert.deepEqual(existingResearchTargets, ['H430'], `Batch 02 collision set must be H430 only: ${existingResearchTargets.join(',')}`)
  const h430 = registryByStrong.get('H430')
  assert.equal(h430.approvedSenseTree.length, 13, 'H430 approved tree must remain 13 nodes')
  assert.equal(h430.identity.identityFingerprint, 'sha256:138208e4b4393d8d0492da9fdb73f284fbd516a0eaa3233a2bc3615e1d81abbc', 'H430 identity fingerprint drift')
  assert.equal(h430.evidencePacketFingerprint, 'sha256:13121be18dd2b5e68bfabdaa38a89b3c755d07a9e948189a6ce4138b8cff374a', 'H430 evidence packet drift')
  const h776 = registryByStrong.get('H776')
  assert.ok(h776, 'H776 golden control missing')
  assert.equal(h776.approvedSenseTree.length, 26, 'H776 golden tree must remain 26/26')
  assert.equal(h776.reviewer?.reviewerId, 'parkminhyun0', 'H776 human reviewer drift')
  assert.equal(h776.reviewer?.reviewerType, 'human', 'H776 reviewer type drift')

  const candidateByStrong = new Map(candidate.items.map((item) => [item.strong, item]))
  const contextByStrong = new Map(contexts.items.map((item) => [item.strong, item]))
  const projectionByStrong = new Map(projection.entries.map((entry) => [entry.strong, entry]))
  const runtimeHashByStrong = new Map(runtimeHash.targets.map((entry) => [entry.strong, entry]))
  assert.deepEqual([...projectionByStrong.keys()], TARGETS, 'projection target order/drift')

  const entries = []
  for (const strong of TARGETS) {
    const candidateItem = candidateByStrong.get(strong)
    const contextItem = contextByStrong.get(strong)
    const projected = projectionByStrong.get(strong)
    const hashTarget = runtimeHashByStrong.get(strong)
    assert.ok(candidateItem && contextItem && projected && hashTarget, `${strong}: promotion input missing`)
    assert.equal(projected.nodes.length, hashTarget.sourceNodes.length, `${strong}: projection/hash count drift`)

    const hashByKey = new Map(hashTarget.sourceNodes.map((node) => [node.id, node.sourceHash]))
    const approvedSenseTreeProposal = projected.nodes.map((node, index) => {
      assert.equal(node.order, index + 1, `${strong}:${node.approvedSenseId} order drift`)
      const sourceHash = hashByKey.get(node.sourceNodeKey)
      assert.ok(sourceHash, `${strong}:${node.sourceNodeKey} exact source hash missing`)
      return {
        id: node.approvedSenseId,
        parentId: node.parentApprovedSenseId,
        depth: node.depth,
        order: node.order,
        translationKo: node.translationKo,
        evidenceSupport: node.evidenceSupport,
      }
    })
    const sourceNodeProjection = projected.nodes.map((node) => ({
      approvedSenseId: node.approvedSenseId,
      sourceNodeKey: node.sourceNodeKey,
      sourceHash: hashByKey.get(node.sourceNodeKey),
    }))

    const lexicalMappings = (lexicalByStrong.get(strong) || []).filter((mapping) => mapping.bdbId === candidateItem.bdbEntryId)
    assert.equal(lexicalMappings.length, 1, `${strong}: exact primary BDB LexicalIndex mapping must be one`)
    const identity = buildIdentity(strong, candidateItem, lexicalMappings)
    const senseTreeFingerprint = sha256Canonical(approvedSenseTreeProposal)
    const evidence = {
      schemaVersion: 1,
      strong,
      identityFingerprint: identity.identityFingerprint,
      senseTreeFingerprint,
      sourceNodeCount: sourceNodeProjection.length,
      sourceNodeCoverage: `${sourceNodeProjection.length}/${sourceNodeProjection.length}`,
      totalGenesisOccurrences: contextItem.totalOccurrences,
      representativeContexts: contextItem.sampleContexts.map((sample) => ({ reference: sample.reference, morph: sample.morph })),
      sourceIds: ['openscriptures-hebrewlexicon-bdb','stepbible-tbesh','openscriptures-hebrew-bible-genesis'],
      bdbCommit: BDB_COMMIT,
      bdbContentHash: runtimeHash.source.contentHash,
      publicResearchStatus: 'PASS_WITH_BOUNDARY',
      hold: 0,
      dispute: 0,
      h430RegressionControl: 'UNCHANGED_13_OF_13',
      h776GoldenControl: 'UNCHANGED_26_OF_26_HUMAN_REVIEWER_PRESERVED',
    }
    evidence.evidencePacketFingerprint = fingerprintWithout(evidence, 'evidencePacketFingerprint')

    entries.push({
      strong,
      identity,
      candidateHeadKo: candidateItem.candidateHeadKo,
      approvedSenseTreeProposal,
      sourceNodeProjection,
      senseTreeFingerprint,
      evidence,
      promotionProvenance: {
        reviewer: POLICY_REVIEWER,
        approvedAt: null,
        independentExactHeadReviewRequired: true,
        effectiveOnlyAfterIndependentReviewAndMerge: true,
      },
    })
  }

  const report = {
    schemaVersion: 1,
    track: 'genesis-lexicon-v4',
    reportId: 'genesis-v4-production-batch-02-promotion-prep-005a64c3',
    status: 'PROMOTION_PREP_READY_9_NEW_ENTRIES_REGISTRY_WRITE_NOT_PERFORMED',
    currentMain: CURRENT_MAIN,
    currentRegistryFingerprint: registry.registryFingerprint,
    researchTargets: ['H430', ...TARGETS],
    existingApprovedControls: ['H430'],
    newPromotionTargets: TARGETS,
    counts: {
      researchTargets: 10,
      existingApprovedControls: 1,
      newPromotionTargets: entries.length,
      sourceNodes: entries.reduce((sum, entry) => sum + entry.sourceNodeProjection.length, 0),
      koreanSenseNodes: entries.reduce((sum, entry) => sum + entry.approvedSenseTreeProposal.length, 0),
      totalGenesisOccurrencesNewTargets: entries.reduce((sum, entry) => sum + entry.evidence.totalGenesisOccurrences, 0),
      hold: 0,
      dispute: 0,
      currentRegistryMutations: 0,
    },
    sourceNodeSetFingerprint: EXPECTED_NODE_SET_FINGERPRINT,
    controls: {
      H430: { approvedSenseNodes: 13, identityFingerprint: h430.identity.identityFingerprint, evidencePacketFingerprint: h430.evidencePacketFingerprint, mutationAllowed: false },
      H776: { approvedSenseNodes: 26, reviewer: h776.reviewer, approvedAt: h776.approvedAt, evidencePacketFingerprint: h776.evidencePacketFingerprint, mutationAllowed: false },
    },
    entries,
    governance: {
      prepOnly: true,
      approvalRegistryWritePerformed: false,
      productionWritePerformed: false,
      existingApprovedMeaningMutationPerformed: false,
      serviceUiWriteAllowed: false,
      qualityGateWeakeningAllowed: false,
      selfApprovalAllowed: false,
      independentExactHeadReviewRequired: true,
    },
    nextGate: 'FREEZE_COMPACT_PROMOTION_PREP_FINGERPRINTS_THEN_MATERIALIZE_9_ADDITIVE_REGISTRY_ENTRIES_ON_CURRENT_MAIN_WITH_EXACT_HEAD_CI_AND_INDEPENDENT_REVIEW_BEFORE_MERGE',
  }
  report.promotionPrepFingerprint = fingerprintWithout(report, 'promotionPrepFingerprint')
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = await buildBatch02PromotionPrep()
  console.log(JSON.stringify(report))
}
