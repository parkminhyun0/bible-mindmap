#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = resolve(__dirname, '..')

export const LUKE_G1_MANIFEST_VERSION = 1
export const LUKE_G1_CONTRACT_VERSION = '2026.08.09-luke-g1.1'
export const COMMON_PAYLOAD_CONTRACT_VERSION = '2026.08.09-g1.1'
export const DEFAULT_BATCH_SIZE = 100
export const DEFAULT_INVENTORY_PATH = resolve(APP_ROOT, 'data/lexicon/luke-g0-inventory.json')
export const DEFAULT_MANIFEST_PATH = resolve(APP_ROOT, 'data/lexicon/luke-g1-manifest.json')
export const DEFAULT_REPORT_PATH = resolve(APP_ROOT, 'data/lexicon/luke-g1-report.json')
export const DEFAULT_DOC_PATH = resolve(APP_ROOT, 'docs/luke-g1-contract.md')

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }
const RISK_SIGNALS = new Set([
  'THEOLOGY_KEYWORD',
  'MULTIPLE_LEMMAS',
  'MULTIPLE_TRANSLITERATIONS',
  'POLYSEMOUS_GLOSS_SET',
  'MORPHOLOGY_DIVERSE',
  'PROPER_NAME',
  'HIGH_FREQUENCY',
  'EXISTING_KOREAN_REUSE',
])

const THEOLOGY_TERMS = [
  'θεος', 'θεός', 'κυριος', 'κύριος', 'χριστος', 'χριστός', 'πνευμα', 'πνεῦμα',
  'αμαρτια', 'ἁμαρτία', 'πιστις', 'πίστις', 'δικαιοσυνη', 'δικαιοσύνη',
  'μετανοια', 'μετάνοια', 'σωτηρια', 'σωτηρία', 'βασιλεια', 'βασιλεία',
  'χαρις', 'χάρις', 'διαθηκη', 'διαθήκη', 'αιμα', 'αἷμα', 'εκκλησια', 'ἐκκλησία',
  'νομος', 'νόμος', 'ευαγγελ', 'εὐαγγελ', 'son of man', 'kingdom', 'salvation',
  'repent', 'faith', 'justify', 'righteous', 'holy spirit', 'grace', 'covenant',
]

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]))
  }
  return value
}

export function stableStringify(value) {
  return JSON.stringify(canonicalize(value))
}

export function sha256(value) {
  return `sha256:${createHash('sha256').update(String(value), 'utf8').digest('hex')}`
}

function strongNumber(strong) {
  return Number.parseInt(String(strong).replace(/^G/u, ''), 10)
}

function compareStrong(left, right) {
  return strongNumber(left) - strongNumber(right)
}

function cloneArray(value) {
  return Array.isArray(value) ? [...value] : []
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase('el')
}

function payloadPath(strong) {
  const number = strongNumber(strong)
  const start = Math.floor((number - 1) / 1000) * 1000 + 1
  const end = start + 998
  const range = `G${String(start).padStart(4, '0')}-G${String(end).padStart(4, '0')}`
  return `data/lexicon-candidates/greek/${range}/${strong}.json`
}

function contextPacketPath(strong) {
  return `data/lexicon-context/luke/${strong}.json`
}

function partOfSpeechFamilies(morphologies) {
  return [...new Set(cloneArray(morphologies)
    .map((code) => String(code).trim().split('-')[0])
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'en'))
}

function detectRiskSignals(entry) {
  const signals = []
  const lemmas = cloneArray(entry.lemmas)
  const transliterations = cloneArray(entry.transliterations)
  const glosses = cloneArray(entry.glosses)
  const morphologies = cloneArray(entry.morphologies)
  const searchText = normalizeSearchText([...lemmas, ...glosses].join(' '))

  if (THEOLOGY_TERMS.some((term) => searchText.includes(normalizeSearchText(term)))) signals.push('THEOLOGY_KEYWORD')
  if (lemmas.length > 1) signals.push('MULTIPLE_LEMMAS')
  if (transliterations.length > 1) signals.push('MULTIPLE_TRANSLITERATIONS')
  if (glosses.length > 3) signals.push('POLYSEMOUS_GLOSS_SET')
  if (morphologies.length > 8) signals.push('MORPHOLOGY_DIVERSE')
  if (morphologies.some((code) => /(?:^|-)P(?:-|$)/u.test(code))) signals.push('PROPER_NAME')
  if (entry.tokenCount >= 50) signals.push('HIGH_FREQUENCY')
  if (entry.existingKorean) signals.push('EXISTING_KOREAN_REUSE')

  return [...new Set(signals)].filter((signal) => RISK_SIGNALS.has(signal)).sort()
}

function priorityFor(entry, queueEntry) {
  if (entry.existingKorean) return 'reuse'
  if (queueEntry?.priority && Object.hasOwn(PRIORITY_ORDER, queueEntry.priority)) return queueEntry.priority
  if (entry.tokenCount >= 50) return 'high'
  if (entry.tokenCount >= 10) return 'medium'
  return 'low'
}

function sourceFingerprint(entry) {
  return sha256(stableStringify({
    strong: entry.strong,
    tokenCount: entry.tokenCount,
    verseCount: entry.verseCount,
    chapterCount: entry.chapterCount,
    chapters: cloneArray(entry.chapters),
    lemmas: cloneArray(entry.lemmas),
    transliterations: cloneArray(entry.transliterations),
    glosses: cloneArray(entry.glosses),
    morphologies: cloneArray(entry.morphologies),
    firstRef: entry.firstRef,
    firstTokenId: entry.firstTokenId,
  }))
}

function buildItem(entry, queueEntry) {
  const reuse = Boolean(entry.existingKorean)
  const signals = detectRiskSignals(entry)
  const specialReviewSignals = new Set([
    'THEOLOGY_KEYWORD', 'MULTIPLE_LEMMAS', 'POLYSEMOUS_GLOSS_SET', 'PROPER_NAME',
  ])

  return {
    strong: entry.strong,
    language: 'greek',
    usage: {
      tokenCount: entry.tokenCount,
      verseCount: entry.verseCount,
      chapterCount: entry.chapterCount,
      chapters: cloneArray(entry.chapters),
      firstRef: entry.firstRef,
      firstTokenId: entry.firstTokenId,
    },
    identity: {
      primaryLemma: entry.lemmas?.[0] || null,
      lemmas: cloneArray(entry.lemmas),
      primaryTransliteration: entry.transliterations?.[0] || null,
      transliterations: cloneArray(entry.transliterations),
      partOfSpeechFamilies: partOfSpeechFamilies(entry.morphologies),
    },
    sourceEvidence: {
      englishGlosses: cloneArray(entry.glosses),
      morphologyCodes: cloneArray(entry.morphologies),
      sourceFingerprint: sourceFingerprint(entry),
    },
    reuse: {
      eligible: reuse,
      source: reuse ? 'KOREAN_GLOSS_ACTIVE' : null,
      existingKorean: reuse ? structuredClone(entry.existingKoreanGloss) : null,
    },
    routing: {
      action: reuse ? 'reuse-existing' : 'translate',
      status: reuse ? 'existing' : 'queued',
      priority: priorityFor(entry, queueEntry),
      batchId: null,
      batchOrdinal: null,
      payloadPath: payloadPath(entry.strong),
    },
    contextPlan: {
      required: true,
      packetPath: contextPacketPath(entry.strong),
      sampleStrategy: 'first-reference-plus-chapter-spread-and-risk-context',
      maxRepresentativeContexts: 8,
      status: 'not-generated',
    },
    theologyAudit: {
      framework: 'reformed-westminster-primary',
      riskTier: 'unclassified',
      signals,
      reviewRoute: signals.some((signal) => specialReviewSignals.has(signal)) ? 'specialist' : 'standard',
      finalHumanApprovalRequired: true,
    },
    audit: {
      contractVersion: LUKE_G1_CONTRACT_VERSION,
      retryCount: 0,
      previousAttemptId: null,
      lastFailureCode: null,
      lastInputHash: null,
      lastOutputHash: null,
    },
  }
}

function batchTranslationItems(items, batchSize) {
  const queued = items
    .filter((item) => item.routing.action === 'translate')
    .sort((left, right) => {
      const priorityDelta = PRIORITY_ORDER[left.routing.priority] - PRIORITY_ORDER[right.routing.priority]
      return priorityDelta || right.usage.tokenCount - left.usage.tokenCount || compareStrong(left.strong, right.strong)
    })

  const batches = []
  for (let offset = 0; offset < queued.length; offset += batchSize) {
    const selected = queued.slice(offset, offset + batchSize)
    const batchId = `luke-g1-b${String(batches.length + 1).padStart(3, '0')}`
    selected.forEach((item, index) => {
      item.routing.batchId = batchId
      item.routing.batchOrdinal = index + 1
    })
    const priorityCounts = selected.reduce((counts, item) => {
      counts[item.routing.priority] += 1
      return counts
    }, { high: 0, medium: 0, low: 0 })
    batches.push({
      batchId,
      itemCount: selected.length,
      tokenCoverage: selected.reduce((sum, item) => sum + item.usage.tokenCount, 0),
      priorityCounts,
      strongs: selected.map((item) => item.strong),
      status: 'planned',
      providerExecutionAllowed: false,
    })
  }
  return batches
}

export function buildLukeTranslationManifest(inventory, options = {}) {
  const batchSize = Number(options.batchSize || DEFAULT_BATCH_SIZE)
  if (!inventory || inventory.schemaVersion !== 1 || inventory.book !== 'Luke') {
    throw new Error('누가복음 G0 schemaVersion=1 inventory가 필요합니다.')
  }
  if (!Array.isArray(inventory.strongs) || !Array.isArray(inventory.newTranslationQueue)) {
    throw new Error('inventory.strongs 및 newTranslationQueue 배열이 필요합니다.')
  }
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) {
    throw new Error('batchSize는 1~500 정수여야 합니다.')
  }

  const queueByStrong = new Map(inventory.newTranslationQueue.map((entry) => [entry.strong, entry]))
  const items = inventory.strongs
    .map((entry) => buildItem(entry, queueByStrong.get(entry.strong)))
    .sort((left, right) => compareStrong(left.strong, right.strong))
  const batches = batchTranslationItems(items, batchSize)

  const reuseExisting = items.filter((item) => item.routing.action === 'reuse-existing').length
  const translationRequired = items.filter((item) => item.routing.action === 'translate').length
  const priorityCounts = items.reduce((counts, item) => {
    if (Object.hasOwn(counts, item.routing.priority)) counts[item.routing.priority] += 1
    return counts
  }, { high: 0, medium: 0, low: 0 })
  const riskSignalCounts = items.reduce((counts, item) => {
    for (const signal of item.theologyAudit.signals) counts[signal] = (counts[signal] || 0) + 1
    return counts
  }, {})

  return {
    schemaVersion: LUKE_G1_MANIFEST_VERSION,
    manifestId: 'luke-lexicon-ko-g1',
    contractVersion: LUKE_G1_CONTRACT_VERSION,
    commonPayloadContractVersion: COMMON_PAYLOAD_CONTRACT_VERSION,
    generatedDate: inventory.generatedDate,
    book: {
      id: 'Luke',
      nameKo: '누가복음',
      testament: 'NT',
      sourceLanguage: 'greek',
    },
    governance: {
      theologicalFramework: 'reformed-westminster-primary',
      candidateOnly: true,
      productionWriteAllowed: false,
      providerCallsAllowed: false,
      sourceNodeMutationAllowed: false,
      finalHumanApprovalRequired: true,
      humanApprovalRequiredForRiskTiers: ['R3', 'R4'],
    },
    source: {
      inventoryPath: 'data/lexicon/luke-g0-inventory.json',
      inventorySchemaVersion: inventory.schemaVersion,
      inventoryDigest: sha256(stableStringify(inventory)),
      tagnt: structuredClone(inventory.sources?.tagnt || null),
      morphgnt: structuredClone(inventory.sources?.morphgnt || null),
      koreanGloss: structuredClone(inventory.sources?.koreanGloss || null),
    },
    payloadContract: {
      schemaPath: 'schemas/lexicon-translation-payload.schema.json',
      candidateLanguage: 'greek',
      requiredInputLayers: [
        'identity.lemma',
        'identity.transliteration',
        'identity.transliterationKo',
        'identity.partOfSpeech',
        'sourceNodes',
        'references.bibleUsage',
        'theologyAudit.riskTier',
      ],
      fieldMap: {
        lemma: 'item.identity.primaryLemma',
        transliteration: 'item.identity.primaryTransliteration',
        morphology: 'item.sourceEvidence.morphologyCodes',
        glossCandidates: 'item.sourceEvidence.englishGlosses',
        contextPacket: 'item.contextPlan.packetPath',
        riskSignals: 'item.theologyAudit.signals',
      },
    },
    auditContract: {
      schemaVersion: 1,
      appendOnly: true,
      requiredEventFields: [
        'eventId', 'strong', 'stage', 'actorType', 'action', 'inputHash', 'outputHash',
        'decision', 'reasonCodes', 'createdAt',
      ],
      allowedActorTypes: ['system', 'nvidia-build', 'openai', 'local-model', 'human-reviewer'],
      prohibitedFields: ['apiKey', 'authorization', 'secret', 'rawCredential'],
      sourceTextMutationAllowed: false,
    },
    reprocessingPolicy: {
      sameInputSameFailureAutomaticRetryAllowed: false,
      maxAutomaticAttempts: 2,
      allowedTriggers: [
        'source-digest-changed',
        'contract-version-changed',
        'prompt-version-changed',
        'model-id-changed',
        'reviewer-requested-retranslation',
        'previous-run-transient-failure',
      ],
      humanGateTriggers: [
        'R3', 'R4', 'THEOLOGY_KEYWORD', 'MULTIPLE_LEMMAS', 'POLYSEMOUS_GLOSS_SET',
        'SOURCE_LICENSE_UNKNOWN', 'SOURCE_CONFLICT', 'CONTEXT_MISMATCH',
      ],
      approvedPayloadOverwriteAllowed: false,
    },
    counts: {
      chapters: inventory.summary.chapters,
      verses: inventory.summary.verses,
      tokens: inventory.summary.tagntSblTokenCount,
      uniqueStrong: inventory.summary.tagntUniqueStrongCount,
      uniqueLemma: inventory.summary.tagntUniqueLemmaCount,
      reuseExisting,
      translationRequired,
      batchSize,
      batches: batches.length,
      priorityCounts,
      riskSignalCounts,
    },
    allowedStatuses: ['existing', 'queued', 'in-progress', 'blocked', 'candidate-ready', 'review-required', 'approved'],
    batches,
    items,
  }
}

export function buildLukeG1Report(inventory, manifest) {
  const duplicateStrongCount = manifest.items.length - new Set(manifest.items.map((item) => item.strong)).size
  const duplicatePayloadPathCount = manifest.items.length - new Set(manifest.items.map((item) => item.routing.payloadPath)).size
  const queuedStrongCount = manifest.batches.reduce((sum, batch) => sum + batch.itemCount, 0)
  const pass = manifest.counts.uniqueStrong === inventory.summary.tagntUniqueStrongCount
    && manifest.counts.reuseExisting === inventory.summary.existingKoreanStrongCount
    && manifest.counts.translationRequired === inventory.summary.newTranslationStrongCount
    && queuedStrongCount === inventory.summary.newTranslationStrongCount
    && duplicateStrongCount === 0
    && duplicatePayloadPathCount === 0
    && manifest.governance.productionWriteAllowed === false
    && manifest.governance.providerCallsAllowed === false

  return {
    schemaVersion: 1,
    book: 'Luke',
    stage: 'G1',
    generatedDate: inventory.generatedDate,
    pass,
    contractVersion: manifest.contractVersion,
    summary: {
      uniqueStrong: manifest.counts.uniqueStrong,
      reuseExisting: manifest.counts.reuseExisting,
      translationRequired: manifest.counts.translationRequired,
      batchSize: manifest.counts.batchSize,
      batchCount: manifest.counts.batches,
      priorityCounts: manifest.counts.priorityCounts,
      specialistReviewCount: manifest.items.filter((item) => item.theologyAudit.reviewRoute === 'specialist').length,
      standardReviewCount: manifest.items.filter((item) => item.theologyAudit.reviewRoute === 'standard').length,
      providerCallCount: 0,
      productionWriteCount: 0,
    },
    diagnostics: {
      duplicateStrongCount,
      duplicatePayloadPathCount,
      queuedStrongCount,
      unbatchedTranslationCount: manifest.items.filter(
        (item) => item.routing.action === 'translate' && !item.routing.batchId,
      ).length,
      reuseWithBatchCount: manifest.items.filter(
        (item) => item.routing.action === 'reuse-existing' && item.routing.batchId,
      ).length,
    },
    nextGate: 'G2 candidate generation canary: provider/local execution Gate, independent drafts, comparison, and human review.',
  }
}

export function buildLukeG1Markdown(manifest, report) {
  const s = report.summary
  return `# 누가복음 G1 · 번역 계약과 결정적 배치 manifest\n\n## 판정\n\n- 상태: **${report.pass ? 'PASS' : 'FAIL'}**\n- 계약: \`${manifest.contractVersion}\`\n- 실제 NVIDIA·OpenAI 호출: **0건**\n- 서비스 사전 쓰기: **0건**\n- 다음 단계: **G2 대표 canary 후보 생성 Gate**\n\n## 확정된 모집단\n\n| 항목 | 값 |\n|---|---:|\n| 고유 Greek Strong | ${s.uniqueStrong} |\n| 기존 한글 사전 재사용 | ${s.reuseExisting} |\n| 신규 번역 필요 | ${s.translationRequired} |\n| 결정적 배치 크기 | ${s.batchSize} |\n| 배치 수 | ${s.batchCount} |\n| high / medium / low | ${s.priorityCounts.high} / ${s.priorityCounts.medium} / ${s.priorityCounts.low} |\n| 전문 검토 경로 | ${s.specialistReviewCount} |\n| 일반 검토 경로 | ${s.standardReviewCount} |\n\n## 데이터 계약\n\n- 공통 candidate payload schema는 \`schemas/lexicon-translation-payload.schema.json\`을 사용합니다.\n- 헬라어 입력에는 lemma·음역·품사군·형태론 코드·영어 gloss 후보·본문 문맥 packet 경로·신학 위험 신호를 보존합니다.\n- 모든 항목은 후보 계층이며 최종 사람 승인 전 서비스 사전에 기록하지 않습니다.\n- 원문·Strong·형태론·기존 성경 본문과 사용자 저장 데이터는 수정하지 않습니다.\n\n## 감사·재처리 규칙\n\n- 감사 이벤트는 append-only이며 입력·출력 hash와 판단 근거를 남깁니다.\n- 같은 입력과 같은 실패 조건은 그대로 반복 실행하지 않습니다.\n- 원천·계약·prompt·model 변경 또는 사람 재번역 요청이 있을 때만 재처리합니다.\n- R3·R4, 신학 핵심어, 다중 lemma, 다의어, 출처 충돌은 사람 Gate를 통과해야 합니다.\n\n## 배치 순서\n\n- 신규 1,979개는 high → medium → low, 같은 우선순위에서는 출현 빈도 내림차순 → Strong 번호 오름차순으로 고정합니다.\n- 배치는 \`luke-g1-b001\`부터 순번을 부여하며 한 배치 최대 ${s.batchSize}개입니다.\n- 기존 52개는 재사용 검증 대상으로 유지하고 신규 번역 배치에는 포함하지 않습니다.\n`
}

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INVENTORY_PATH,
    output: DEFAULT_MANIFEST_PATH,
    report: DEFAULT_REPORT_PATH,
    doc: DEFAULT_DOC_PATH,
    batchSize: DEFAULT_BATCH_SIZE,
    selfTest: false,
    json: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--self-test') args.selfTest = true
    else if (arg === '--json') args.json = true
    else if (arg === '--input') args.input = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--input=')) args.input = resolve(process.cwd(), arg.slice(8))
    else if (arg === '--output') args.output = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--output=')) args.output = resolve(process.cwd(), arg.slice(9))
    else if (arg === '--report') args.report = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--report=')) args.report = resolve(process.cwd(), arg.slice(9))
    else if (arg === '--doc') args.doc = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--doc=')) args.doc = resolve(process.cwd(), arg.slice(6))
    else if (arg === '--batch-size') args.batchSize = Number(argv[++index])
    else if (arg.startsWith('--batch-size=')) args.batchSize = Number(arg.slice(13))
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return args
}

function runSelfTest() {
  const inventory = {
    schemaVersion: 1,
    book: 'Luke',
    generatedDate: '2026-08-09',
    sources: { tagnt: { id: 'tagnt' }, morphgnt: { id: 'morphgnt' }, koreanGloss: { id: 'ko' } },
    summary: {
      chapters: 24,
      verses: 2,
      tagntSblTokenCount: 8,
      tagntUniqueStrongCount: 3,
      tagntUniqueLemmaCount: 3,
      existingKoreanStrongCount: 1,
      newTranslationStrongCount: 2,
    },
    strongs: [
      {
        strong: 'G32', tokenCount: 2, verseCount: 1, chapterCount: 1, chapters: [1],
        lemmas: ['ἄγγελος'], transliterations: ['angelos'], glosses: ['angel'],
        morphologies: ['N-NSM-P'], firstRef: 'Luke 1:11', firstTokenId: 'Luke.1.11.4',
        existingKorean: false, existingKoreanGloss: null,
      },
      {
        strong: 'G932', tokenCount: 1, verseCount: 1, chapterCount: 1, chapters: [1],
        lemmas: ['βασιλεία'], transliterations: ['basileia'], glosses: ['kingdom'],
        morphologies: ['N-NSF'], firstRef: 'Luke 1:33', firstTokenId: 'Luke.1.33.9',
        existingKorean: true, existingKoreanGloss: { glossKo: '왕권, 나라', translitKo: '바실레이아', status: 'baseline' },
      },
      {
        strong: 'G3588', tokenCount: 5, verseCount: 2, chapterCount: 1, chapters: [1],
        lemmas: ['ὁ'], transliterations: ['ho'], glosses: ['the'],
        morphologies: ['T-GSM', 'T-NSM'], firstRef: 'Luke 1:1', firstTokenId: 'Luke.1.1.7',
        existingKorean: false, existingKoreanGloss: null,
      },
    ],
    newTranslationQueue: [
      { strong: 'G32', priority: 'low' },
      { strong: 'G3588', priority: 'low' },
    ],
  }
  const manifest = buildLukeTranslationManifest(inventory, { batchSize: 1 })
  assert.equal(manifest.counts.uniqueStrong, 3)
  assert.equal(manifest.counts.reuseExisting, 1)
  assert.equal(manifest.counts.translationRequired, 2)
  assert.equal(manifest.batches.length, 2)
  assert.deepEqual(manifest.items.map((item) => item.strong), ['G32', 'G932', 'G3588'])
  assert.equal(manifest.items.find((item) => item.strong === 'G932').routing.action, 'reuse-existing')
  assert(manifest.items.find((item) => item.strong === 'G932').theologyAudit.signals.includes('THEOLOGY_KEYWORD'))
  assert.equal(buildLukeTranslationManifest(inventory, { batchSize: 1 }).source.inventoryDigest, manifest.source.inventoryDigest)
  const report = buildLukeG1Report(inventory, manifest)
  assert.equal(report.pass, true)
  console.log('✓ Luke G1 translation manifest self-test passed')
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) return runSelfTest()

  const inventory = JSON.parse(readFileSync(args.input, 'utf8'))
  const manifest = buildLukeTranslationManifest(inventory, { batchSize: args.batchSize })
  const report = buildLukeG1Report(inventory, manifest)
  const markdown = buildLukeG1Markdown(manifest, report)

  for (const outputPath of [args.output, args.report, args.doc]) mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(args.output, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  writeFileSync(args.report, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  writeFileSync(args.doc, markdown, 'utf8')

  if (args.json) console.log(JSON.stringify({ manifest, report }, null, 2))
  else {
    console.log('Luke lexicon G1 translation contract')
    console.log(`  inventory: ${args.input}`)
    console.log(`  manifest: ${args.output}`)
    console.log(`  contract: ${manifest.contractVersion}`)
    console.log(`  unique Strong: ${manifest.counts.uniqueStrong}`)
    console.log(`  reuse existing: ${manifest.counts.reuseExisting}`)
    console.log(`  translation required: ${manifest.counts.translationRequired}`)
    console.log(`  batches: ${manifest.counts.batches}`)
    console.log(`  pass: ${report.pass}`)
    console.log('  provider calls: 0')
    console.log('  production writes: 0')
  }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isDirectRun) main()
