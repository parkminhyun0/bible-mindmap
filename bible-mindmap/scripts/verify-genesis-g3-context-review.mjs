#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildGenesisContextReview, CONTEXT_REVIEW_VERSION } from './build-genesis-g3-context-review.mjs'

const DEFAULT_EVALUATION = 'reports/genesis-g2-canary-evaluation.json'
const DEFAULT_PROMOTION = 'reports/genesis-g2-promotion-review/promotion-review.json'
const DEFAULT_USAGE = 'reports/genesis-g3-usage-context-packets.json'
const DEFAULT_SOURCE = 'reports/genesis-g2-bdb-source-packets.json'
const DEFAULT_REVIEW = 'reports/genesis-g3-context-review/context-review.json'
const sha256 = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`

function parseArgs(argv) {
  const args = { evaluation: DEFAULT_EVALUATION, promotion: DEFAULT_PROMOTION, usage: DEFAULT_USAGE, source: DEFAULT_SOURCE, review: DEFAULT_REVIEW, strict: false, selfTest: false }
  for (const arg of argv) {
    if (arg === '--strict') args.strict = true
    else if (arg === '--self-test') args.selfTest = true
    else if (arg.startsWith('--evaluation=')) args.evaluation = arg.slice(13)
    else if (arg.startsWith('--promotion=')) args.promotion = arg.slice(12)
    else if (arg.startsWith('--usage=')) args.usage = arg.slice(8)
    else if (arg.startsWith('--source=')) args.source = arg.slice(9)
    else if (arg.startsWith('--review=')) args.review = arg.slice(9)
    else throw new Error(`unknown argument: ${arg}`)
  }
  return args
}

function readRawJson(path) {
  const raw = readFileSync(resolve(path), 'utf8')
  return { raw, data: JSON.parse(raw) }
}

function hasForbiddenCompletedDecision(value, path = '$', errors = []) {
  if (Array.isArray(value)) value.forEach((item, index) => hasForbiddenCompletedDecision(item, `${path}[${index}]`, errors))
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}.${key}`
      if (key === 'contextDecision' && child?.status !== 'pending-human-review') errors.push(`${childPath}.status must remain pending-human-review`)
      if (['automaticContextApprovalAllowed', 'productionWriteAllowed', 'finalApprovalAllowed'].includes(key) && child !== false) errors.push(`${childPath} must be false`)
      hasForbiddenCompletedDecision(child, childPath, errors)
    }
  }
  return errors
}

export function validateGenesisContextReview({ evaluationRaw, evaluation, promotionRaw, promotionReview, usageRaw, usageSet, sourceRaw, sourceSet, review }) {
  const errors = []
  const warnings = []
  if (review?.schemaVersion !== 1) errors.push('schemaVersion must be 1')
  if (review?.reviewVersion !== CONTEXT_REVIEW_VERSION) errors.push('reviewVersion mismatch')
  if (review?.target !== 'genesis-g2-canary-context-review') errors.push('target mismatch')
  if (review?.status !== 'human-context-review-required') errors.push(`status must be human-context-review-required: ${review?.status}`)
  const expectedDigests = {
    evaluation: sha256(evaluationRaw),
    promotionReview: sha256(promotionRaw),
    usageContext: sha256(usageRaw),
    bdbSource: sha256(sourceRaw),
  }
  for (const [key, digest] of Object.entries(expectedDigests)) if (review.evidenceDigests?.[key] !== digest) errors.push(`evidenceDigests.${key} mismatch`)
  if (promotionReview.evaluationDigest !== expectedDigests.evaluation) errors.push('promotion review is not bound to evaluation digest')
  if (review.gates?.sourceEvidenceReady !== true) errors.push('sourceEvidenceReady=true required')
  if (review.gates?.candidateEvidenceReady !== true) errors.push('candidateEvidenceReady=true required')
  if (review.gates?.humanContextReviewRequired !== true) errors.push('humanContextReviewRequired=true required')
  if (review.governance?.stage !== 'G3-context-review') errors.push('governance stage mismatch')
  if (review.governance?.candidateMutationAllowed !== false) errors.push('candidateMutationAllowed must be false')
  if (review.governance?.automaticAdjudicationAllowed !== false) errors.push('automaticAdjudicationAllowed must be false')
  hasForbiddenCompletedDecision(review, '$', errors)

  const promotionByStrong = new Map((promotionReview.items || []).map((item) => [item.strong, item]))
  const usageByStrong = new Map((usageSet.packets || []).map((item) => [item.strong, item]))
  const sourceByStrong = new Map((sourceSet.packets || []).map((item) => [item.strong, item]))
  const evaluationByStrong = new Map((evaluation.pairs || []).map((item) => [item.strong, item]))
  const seen = new Set()
  let sourceNodes = 0
  let occurrences = 0
  let sampleContexts = 0
  let checklistItems = 0

  if (!Array.isArray(review?.items)) return { errors: [...errors, 'items array missing'], warnings }
  if (review.items.length !== evaluationByStrong.size) errors.push(`review item count ${review.items.length}/${evaluationByStrong.size}`)
  for (const [index, item] of review.items.entries()) {
    const where = `items[${index}]`
    if (seen.has(item.strong)) errors.push(`${where}: duplicate Strong`)
    seen.add(item.strong)
    const pair = evaluationByStrong.get(item.strong)
    const promotion = promotionByStrong.get(item.strong)
    const usage = usageByStrong.get(item.strong)
    const source = sourceByStrong.get(item.strong)
    if (!pair) errors.push(`${where}: evaluation pair missing`)
    if (!promotion) errors.push(`${where}: promotion item missing`)
    if (!usage) errors.push(`${where}: usage packet missing`)
    if (!source) errors.push(`${where}: source packet missing`)
    if (!pair || !promotion || !usage || !source) continue
    if (item.role !== pair.role) errors.push(`${where}: role mismatch`)
    if (item.candidateStatus !== pair.status) errors.push(`${where}: candidate status mismatch`)
    if (item.usagePacketStatus !== 'ready' || usage.usagePacketStatus !== 'ready') errors.push(`${where}: usage packet not ready`)
    if (item.sourcePacketStatus !== 'ready' || source.sourcePacketStatus !== 'ready') errors.push(`${where}: source packet not ready`)
    if (item.lexicalEvidence?.packetId !== source.packetId) errors.push(`${where}: source packet id mismatch`)
    if (item.lexicalEvidence?.sourceFingerprint !== usage.lexicalSource?.sourceFingerprint) errors.push(`${where}: source fingerprint mismatch`)
    if (item.lexicalEvidence?.sourceNodeCount !== (source.sourceNodes?.length || 0)) errors.push(`${where}: source node count mismatch`)
    if (item.genesisUsageEvidence?.totalOccurrences !== usage.totalOccurrences) errors.push(`${where}: occurrence count mismatch`)
    if (JSON.stringify(item.genesisUsageEvidence?.chapters) !== JSON.stringify(usage.chapters)) errors.push(`${where}: chapters mismatch`)
    if (JSON.stringify(item.genesisUsageEvidence?.sampleContextIds) !== JSON.stringify(usage.sampleContextIds)) errors.push(`${where}: sample ids mismatch`)
    if (item.genesisUsageEvidence?.sampleContexts?.length !== usage.sampleContexts?.length) errors.push(`${where}: sample context count mismatch`)
    if (item.providers?.nvidia?.primaryGlossKo !== promotion.providers?.nvidia?.primaryGlossKo) errors.push(`${where}: NVIDIA gloss mismatch`)
    if (item.providers?.openai?.primaryGlossKo !== promotion.providers?.openai?.primaryGlossKo) errors.push(`${where}: OpenAI gloss mismatch`)
    if (!Array.isArray(item.contextReviewChecklist) || item.contextReviewChecklist.length < 4) errors.push(`${where}: context checklist missing`)
    for (const check of item.contextReviewChecklist || []) {
      if (check.status !== 'pending') errors.push(`${where}: checklist status must remain pending`)
      if ((check.evidence || []).length) errors.push(`${where}: prefilled checklist evidence not allowed`)
    }
    if (item.contextDecision?.reviewer || item.contextDecision?.reviewedAt || item.contextDecision?.preferredGlossKo) errors.push(`${where}: human decision fields must be empty`)
    sourceNodes += item.lexicalEvidence.sourceNodeCount
    occurrences += item.genesisUsageEvidence.totalOccurrences
    sampleContexts += item.genesisUsageEvidence.sampleContexts.length
    checklistItems += item.contextReviewChecklist.length
  }

  const expectedCounts = { expectedItems: evaluationByStrong.size, reviewItems: review.items.length, sourceNodes, genesisOccurrences: occurrences, sampleContexts, checklistItems }
  for (const [key, value] of Object.entries(expectedCounts)) if (review.counts?.[key] !== value) errors.push(`counts.${key}: ${review.counts?.[key]} != ${value}`)
  if (review.errors?.length) warnings.push(...review.errors.map((error) => `builder: ${error}`))
  return { errors, warnings }
}

function fixture() {
  const evaluation = { gates: { technicalGatePassed: true }, pairs: [{ strong: 'H776', role: 'polysemy', status: 'manual-review-required', riskCoverage: { expected: ['polysemy'] } }] }
  const evaluationRaw = `${JSON.stringify(evaluation)}\n`
  const promotionReview = { evaluationDigest: sha256(evaluationRaw), items: [{ strong: 'H776', providers: { nvidia: { primaryGlossKo: '땅', transliterationKo: '에레츠' }, openai: { primaryGlossKo: '토지', transliterationKo: '에레츠' } }, agreement: { nodeAverage: 0.7 }, confidence: { average: 0.9 }, warnings: [], errors: [], riskCoverage: { missing: [] }, disagreementNodes: [] }] }
  const promotionRaw = `${JSON.stringify(promotionReview)}\n`
  const usageSet = { packets: [{ strong: 'H776', usagePacketStatus: 'ready', lexicalSource: { sourceFingerprint: 'sha256:x' }, totalOccurrences: 2, chapters: [1], firstReference: 'Gen.1.1', lastReference: 'Gen.1.2', distribution: { byChapter: [], surfaceForms: [], lemmaForms: [], morphCodes: [] }, sampleContextIds: ['o1'], sampleContexts: [{ occurrenceId: 'o1', reference: 'Gen.1.1', tokenId: 'w1', surface: 'אֶרֶץ', lemma: '0776', morph: 'HN', verseText: 'אֶרֶץ', contextTokens: [{ tokenId: 'w1', surface: 'אֶרֶץ', lemma: '0776', morph: 'HN', strongIds: ['H776'], focus: true }] }] }] }
  const usageRaw = `${JSON.stringify(usageSet)}\n`
  const sourceSet = { packets: [{ strong: 'H776', packetId: 'source:H776', sourcePacketStatus: 'ready', identity: { lemmas: ['אֶרֶץ'], transliterations: ['erets'], partOfSpeechCodes: ['N'], partOfSpeechLabels: ['Noun'] }, bdbEntries: [{}], sourceNodes: [{ id: 'n1' }] }] }
  const sourceRaw = `${JSON.stringify(sourceSet)}\n`
  const evidenceDigests = { evaluation: sha256(evaluationRaw), promotionReview: sha256(promotionRaw), usageContext: sha256(usageRaw), bdbSource: sha256(sourceRaw) }
  const review = buildGenesisContextReview({ evaluation, promotionReview, usageSet, sourceSet, evidenceDigests })
  return { evaluationRaw, evaluation, promotionRaw, promotionReview, usageRaw, usageSet, sourceRaw, sourceSet, review }
}

function runSelfTest() {
  const input = fixture()
  assert.deepEqual(validateGenesisContextReview(input).errors, [])
  const invalid = structuredClone(input.review)
  invalid.items[0].contextDecision.status = 'approved'
  assert(validateGenesisContextReview({ ...input, review: invalid }).errors.length > 0)
  console.log('✓ Genesis G3 context review verifier self-test passed')
}

function main(args) {
  if (args.selfTest) return runSelfTest()
  const evaluation = readRawJson(args.evaluation)
  const promotion = readRawJson(args.promotion)
  const usage = readRawJson(args.usage)
  const source = readRawJson(args.source)
  const review = readRawJson(args.review)
  const result = validateGenesisContextReview({
    evaluationRaw: evaluation.raw, evaluation: evaluation.data,
    promotionRaw: promotion.raw, promotionReview: promotion.data,
    usageRaw: usage.raw, usageSet: usage.data,
    sourceRaw: source.raw, sourceSet: source.data,
    review: review.data,
  })
  console.log(`Genesis G3 context review verification · items=${review.data.counts?.reviewItems}/${review.data.counts?.expectedItems} · occurrences=${review.data.counts?.genesisOccurrences}`)
  for (const warning of result.warnings) console.log(`  - warning: ${warning}`)
  if (args.strict && review.data.counts?.expectedItems !== 5) result.errors.push(`strict canary review requires 5 items: ${review.data.counts?.expectedItems}`)
  if (args.strict && review.data.status !== 'human-context-review-required') result.errors.push(`strict status mismatch: ${review.data.status}`)
  if (result.errors.length) {
    console.error(`✗ Genesis G3 context review verification failed (${result.errors.length})`)
    result.errors.slice(0, 100).forEach((error) => console.error(`  - ${error}`))
    process.exitCode = 2
  } else console.log('✓ Genesis G3 context review verification passed')
}

main(parseArgs(process.argv.slice(2)))
