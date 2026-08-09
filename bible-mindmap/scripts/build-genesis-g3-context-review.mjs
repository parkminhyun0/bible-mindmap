#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const CONTEXT_REVIEW_VERSION = '2026.08.09-g3.1'
const DEFAULT_EVALUATION = 'reports/genesis-g2-canary-evaluation.json'
const DEFAULT_PROMOTION = 'reports/genesis-g2-promotion-review/promotion-review.json'
const DEFAULT_USAGE = 'reports/genesis-g3-usage-context-packets.json'
const DEFAULT_SOURCE = 'reports/genesis-g2-bdb-source-packets.json'
const DEFAULT_OUTPUT_DIR = 'reports/genesis-g3-context-review'

const sha256 = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`
const escapeCell = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')

function parseArgs(argv) {
  const args = {
    evaluation: DEFAULT_EVALUATION,
    promotion: DEFAULT_PROMOTION,
    usage: DEFAULT_USAGE,
    source: DEFAULT_SOURCE,
    outputDir: DEFAULT_OUTPUT_DIR,
    selfTest: false,
  }
  for (const arg of argv) {
    if (arg === '--self-test') args.selfTest = true
    else if (arg.startsWith('--evaluation=')) args.evaluation = arg.slice(13)
    else if (arg.startsWith('--promotion=')) args.promotion = arg.slice(12)
    else if (arg.startsWith('--usage=')) args.usage = arg.slice(8)
    else if (arg.startsWith('--source=')) args.source = arg.slice(9)
    else if (arg.startsWith('--output-dir=')) args.outputDir = arg.slice(13)
    else throw new Error(`unknown argument: ${arg}`)
  }
  return args
}

function topRows(rows = [], limit = 12) {
  return rows.slice(0, limit).map((row) => ({ ...row }))
}

function sampleContextRow(context) {
  return {
    occurrenceId: context.occurrenceId,
    reference: context.reference,
    tokenId: context.tokenId,
    surface: context.surface,
    lemma: context.lemma,
    morph: context.morph,
    verseText: context.verseText,
    contextTokens: context.contextTokens.map((token) => ({
      tokenId: token.tokenId,
      surface: token.surface,
      lemma: token.lemma,
      morph: token.morph,
      strongIds: token.strongIds,
      focus: token.focus,
    })),
  }
}

function reviewQuestions(strong, pair) {
  const questions = [
    '두 provider의 한국어 표제어가 BDB 의미 계층의 범위를 과도하게 축소하거나 확장하지 않는가?',
    '창세기 대표 문맥에서 표면형·형태론 차이가 별도 의미 구분을 요구하는가?',
    '저합의 source node가 실제 창세기 용례에서 중요한 의미를 담당하는가?',
    '본문에 없는 교리적 해석이나 설명이 번역 문장에 추가되지 않았는가?',
  ]
  if (pair?.riskCoverage?.expected?.includes('polysemy')) questions.push('다의어의 서로 다른 의미가 창세기 문맥별로 구분되어 있는가?')
  if (pair?.riskCoverage?.expected?.includes('theological-sensitive')) questions.push('신학 민감 의미가 원문·문맥·성경신학의 범위를 벗어나지 않는가?')
  return questions.map((question, index) => ({ id: `${strong}:context-check:${index + 1}`, question, status: 'pending', evidence: [], notes: '' }))
}

export function buildGenesisContextReview({ evaluation, promotionReview, usageSet, sourceSet, evidenceDigests }) {
  const promotionByStrong = new Map((promotionReview.items || []).map((item) => [item.strong, item]))
  const usageByStrong = new Map((usageSet.packets || []).map((packet) => [packet.strong, packet]))
  const sourceByStrong = new Map((sourceSet.packets || []).map((packet) => [packet.strong, packet]))
  const items = []
  const errors = []

  for (const pair of evaluation.pairs || []) {
    const promotion = promotionByStrong.get(pair.strong)
    const usage = usageByStrong.get(pair.strong)
    const source = sourceByStrong.get(pair.strong)
    if (!promotion) errors.push(`${pair.strong}: promotion review item missing`)
    if (!usage) errors.push(`${pair.strong}: usage packet missing`)
    if (!source) errors.push(`${pair.strong}: BDB source packet missing`)
    if (!promotion || !usage || !source) continue

    const lowAgreementNodeIds = new Set((promotion.disagreementNodes || []).filter((node) => Number(node.score) < 0.35).map((node) => node.sourceNodeId))
    items.push({
      strong: pair.strong,
      role: pair.role,
      candidateStatus: pair.status,
      usagePacketStatus: usage.usagePacketStatus,
      sourcePacketStatus: source.sourcePacketStatus,
      identity: {
        lemmas: source.identity?.lemmas || [],
        transliterations: source.identity?.transliterations || [],
        partOfSpeechCodes: source.identity?.partOfSpeechCodes || [],
        partOfSpeechLabels: source.identity?.partOfSpeechLabels || [],
      },
      providers: promotion.providers,
      candidateMetrics: {
        agreement: promotion.agreement,
        confidence: promotion.confidence,
        warnings: promotion.warnings,
        errors: promotion.errors,
        riskCoverage: promotion.riskCoverage,
      },
      lexicalEvidence: {
        packetId: source.packetId,
        sourceFingerprint: usage.lexicalSource?.sourceFingerprint,
        bdbEntryCount: source.bdbEntries?.length || 0,
        sourceNodeCount: source.sourceNodes?.length || 0,
        lowAgreementSourceNodeIds: [...lowAgreementNodeIds].sort(),
      },
      genesisUsageEvidence: {
        totalOccurrences: usage.totalOccurrences,
        chapters: usage.chapters,
        firstReference: usage.firstReference,
        lastReference: usage.lastReference,
        byChapter: usage.distribution?.byChapter || [],
        topSurfaceForms: topRows(usage.distribution?.surfaceForms),
        topLemmaForms: topRows(usage.distribution?.lemmaForms),
        topMorphCodes: topRows(usage.distribution?.morphCodes),
        sampleContextIds: usage.sampleContextIds,
        sampleContexts: usage.sampleContexts.map(sampleContextRow),
      },
      disagreements: promotion.disagreementNodes,
      contextReviewChecklist: reviewQuestions(pair.strong, pair),
      contextDecision: {
        status: 'pending-human-review',
        preferredGlossKo: null,
        senseNotesKo: '',
        usageEvidenceIds: [],
        reviewer: '',
        reviewedAt: null,
      },
      governance: {
        humanContextReviewRequired: true,
        automaticContextApprovalAllowed: false,
        productionWriteAllowed: false,
        finalApprovalAllowed: false,
      },
    })
  }

  const sourceEvidenceReady = errors.length === 0 && items.length === (evaluation.pairs || []).length
    && items.every((item) => item.usagePacketStatus === 'ready' && item.sourcePacketStatus === 'ready')
  const candidateEvidenceReady = evaluation.gates?.technicalGatePassed === true
    && promotionReview.evaluationDigest === evidenceDigests.evaluation
    && items.length > 0

  return {
    schemaVersion: 1,
    reviewVersion: CONTEXT_REVIEW_VERSION,
    target: 'genesis-g2-canary-context-review',
    generatedAt: new Date().toISOString(),
    evidenceDigests,
    status: sourceEvidenceReady && candidateEvidenceReady ? 'human-context-review-required' : 'blocked',
    counts: {
      expectedItems: (evaluation.pairs || []).length,
      reviewItems: items.length,
      sourceNodes: items.reduce((sum, item) => sum + item.lexicalEvidence.sourceNodeCount, 0),
      genesisOccurrences: items.reduce((sum, item) => sum + item.genesisUsageEvidence.totalOccurrences, 0),
      sampleContexts: items.reduce((sum, item) => sum + item.genesisUsageEvidence.sampleContexts.length, 0),
      checklistItems: items.reduce((sum, item) => sum + item.contextReviewChecklist.length, 0),
    },
    gates: {
      sourceEvidenceReady,
      candidateEvidenceReady,
      humanContextReviewRequired: true,
      automaticContextApprovalAllowed: false,
      serviceWriteAllowed: false,
      finalApprovalAllowed: false,
    },
    errors,
    items,
    governance: {
      stage: 'G3-context-review',
      candidateMutationAllowed: false,
      automaticAdjudicationAllowed: false,
      productionWriteAllowed: false,
      finalApprovalAllowed: false,
    },
  }
}

function renderFocusContext(context) {
  return context.contextTokens.map((token) => token.focus ? `**${token.surface}**` : token.surface).join(' ')
}

export function renderGenesisContextReviewMarkdown(review) {
  const lines = [
    '# 창세기 G3 · 원어 사전 후보–실제 용례 문맥 검토',
    '',
    `- 상태: **${review.status}**`,
    `- Strong: **${review.counts.reviewItems}/${review.counts.expectedItems}**`,
    `- BDB source node: **${review.counts.sourceNodes}개**`,
    `- 창세기 실제 출현: **${review.counts.genesisOccurrences.toLocaleString()}건**`,
    `- 대표 문맥: **${review.counts.sampleContexts}건**`,
    '- 자동 문맥 승인·서비스 쓰기·최종 승인: **금지**',
    '',
    '## 검토 요약',
    '',
    '| Strong | NVIDIA | OpenAI | 출현 | 장 | 표본 | 합의도 | 위험 누락 |',
    '|---|---|---|---:|---:|---:|---:|---|',
  ]
  for (const item of review.items) {
    lines.push(`| ${item.strong} | ${escapeCell(item.providers.nvidia.primaryGlossKo)} | ${escapeCell(item.providers.openai.primaryGlossKo)} | ${item.genesisUsageEvidence.totalOccurrences} | ${item.genesisUsageEvidence.chapters.length} | ${item.genesisUsageEvidence.sampleContexts.length} | ${item.candidateMetrics.agreement.nodeAverage} | ${escapeCell(item.candidateMetrics.riskCoverage.missing.join(', ') || '-')} |`)
  }
  for (const item of review.items) {
    lines.push('', `## ${item.strong} · ${escapeCell(item.identity.lemmas.join(', '))}`, '')
    lines.push(`- NVIDIA: **${escapeCell(item.providers.nvidia.primaryGlossKo)}** · ${escapeCell(item.providers.nvidia.transliterationKo)}`)
    lines.push(`- OpenAI: **${escapeCell(item.providers.openai.primaryGlossKo)}** · ${escapeCell(item.providers.openai.transliterationKo)}`)
    lines.push(`- 창세기: **${item.genesisUsageEvidence.totalOccurrences}회 · ${item.genesisUsageEvidence.chapters.length}장** · ${item.genesisUsageEvidence.firstReference} → ${item.genesisUsageEvidence.lastReference}`)
    lines.push(`- 주요 형태론: ${escapeCell(item.genesisUsageEvidence.topMorphCodes.map((row) => `${row.value}(${row.count})`).join(', '))}`)
    lines.push('', '### 대표 문맥', '')
    for (const context of item.genesisUsageEvidence.sampleContexts) {
      lines.push(`- **${context.reference}** · \`${escapeCell(context.morph || '(none)')}\` · ${renderFocusContext(context)}`)
    }
    lines.push('', '### 사람 검토 체크', '')
    for (const check of item.contextReviewChecklist) lines.push(`- [ ] ${check.question}`)
  }
  return `${lines.join('\n')}\n`
}

function readRawJson(path) {
  const raw = readFileSync(resolve(path), 'utf8')
  return { raw, data: JSON.parse(raw) }
}

function writePackage(args) {
  const evaluation = readRawJson(args.evaluation)
  const promotion = readRawJson(args.promotion)
  const usage = readRawJson(args.usage)
  const source = readRawJson(args.source)
  const review = buildGenesisContextReview({
    evaluation: evaluation.data,
    promotionReview: promotion.data,
    usageSet: usage.data,
    sourceSet: source.data,
    evidenceDigests: {
      evaluation: sha256(evaluation.raw),
      promotionReview: sha256(promotion.raw),
      usageContext: sha256(usage.raw),
      bdbSource: sha256(source.raw),
    },
  })
  const outputDir = resolve(args.outputDir)
  mkdirSync(outputDir, { recursive: true })
  writeFileSync(resolve(outputDir, 'context-review.json'), `${JSON.stringify(review, null, 2)}\n`, 'utf8')
  writeFileSync(resolve(outputDir, 'context-review.md'), renderGenesisContextReviewMarkdown(review), 'utf8')
  return review
}

function fixture() {
  const strong = 'H776'
  const evaluationRaw = JSON.stringify({ gates: { technicalGatePassed: true }, pairs: [{ strong, role: 'polysemy', status: 'manual-review-required', riskCoverage: { expected: ['polysemy'] } }] })
  const evaluationDigest = sha256(evaluationRaw)
  return {
    evaluation: JSON.parse(evaluationRaw),
    promotionReview: {
      evaluationDigest,
      items: [{
        strong,
        providers: {
          nvidia: { model: 'n', transliterationKo: '에레츠', primaryGlossKo: '땅', notesKo: '' },
          openai: { model: 'o', transliterationKo: '에레츠', primaryGlossKo: '땅, 토지', notesKo: '' },
        },
        agreement: { nodeAverage: 0.7 }, confidence: { average: 0.9 }, warnings: [], errors: [],
        riskCoverage: { expected: ['polysemy'], missing: [] },
        disagreementNodes: [{ sourceNodeId: 'n1', score: 0.7, nvidiaTextKo: '땅', openaiTextKo: '토지', nvidiaConfidence: 0.9, openaiConfidence: 0.9, riskFlags: ['polysemy'] }],
      }],
    },
    usageSet: { packets: [{ strong, usagePacketStatus: 'ready', lexicalSource: { sourceFingerprint: 'sha256:x' }, totalOccurrences: 2, chapters: [1], firstReference: 'Gen.1.1', lastReference: 'Gen.1.2', distribution: { byChapter: [{ chapter: 1, count: 2 }], surfaceForms: [{ value: 'הָאָרֶץ', count: 2 }], lemmaForms: [{ value: '0776', count: 2 }], morphCodes: [{ value: 'HNcfsa', count: 2 }] }, sampleContextIds: ['w1:H776'], sampleContexts: [{ occurrenceId: 'w1:H776', reference: 'Gen.1.1', tokenId: 'w1', surface: 'הָאָרֶץ', lemma: '0776', morph: 'HNcfsa', verseText: 'בְּרֵאשִׁית הָאָרֶץ', contextTokens: [{ tokenId: 'w0', surface: 'בְּרֵאשִׁית', lemma: '07225', morph: 'HN', strongIds: ['H7225'], focus: false }, { tokenId: 'w1', surface: 'הָאָרֶץ', lemma: '0776', morph: 'HNcfsa', strongIds: ['H776'], focus: true }] }] }] },
    sourceSet: { packets: [{ strong, packetId: 'source:H776', sourcePacketStatus: 'ready', identity: { lemmas: ['אֶרֶץ'], transliterations: ['erets'], partOfSpeechCodes: ['N'], partOfSpeechLabels: ['Noun'] }, bdbEntries: [{}], sourceNodes: [{ id: 'n1' }, { id: 'n2' }] }] },
    evidenceDigests: { evaluation: evaluationDigest, promotionReview: 'sha256:p', usageContext: 'sha256:u', bdbSource: 'sha256:s' },
  }
}

function runSelfTest() {
  const review = buildGenesisContextReview(fixture())
  assert.equal(review.status, 'human-context-review-required')
  assert.equal(review.counts.genesisOccurrences, 2)
  assert.equal(review.items[0].contextDecision.status, 'pending-human-review')
  assert.equal(review.gates.automaticContextApprovalAllowed, false)
  assert(renderGenesisContextReviewMarkdown(review).includes('Gen.1.1'))
  console.log('✓ Genesis G3 context review builder self-test passed')
}

const args = parseArgs(process.argv.slice(2))
if (args.selfTest) runSelfTest()
else {
  const review = writePackage(args)
  console.log(`✓ Genesis G3 context review · items=${review.counts.reviewItems}/${review.counts.expectedItems} · occurrences=${review.counts.genesisOccurrences} · status=${review.status}`)
}
