import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'

export const LUKE_G2_TRANSLATION_CONTRACT_VERSION = '2026.08.09-luke-g2-local.2'
export const LUKE_G2_PROMPT_VERSION = 'luke-tagnt-context-ko-v2'
export const COMPARISON_SLOTS = Object.freeze(['A', 'B'])
export const RISK_FLAGS = Object.freeze([
  'polysemy',
  'theological-sensitive',
  'proper-name',
  'morphology-sensitive',
  'context-sensitive',
  'reuse-conflict',
  'uncertain',
])

const REQUIRED_RISK_FLAGS = Object.freeze({
  G2316: Object.freeze(['theological-sensitive']),
  G932: Object.freeze(['polysemy', 'theological-sensitive']),
  G4151: Object.freeze(['polysemy', 'theological-sensitive']),
  G3137: Object.freeze(['proper-name']),
  G3686: Object.freeze(['polysemy']),
  G2: Object.freeze(['proper-name']),
})

const ALLOWED_LATIN_WORDS = new Set([
  'TAGNT', 'MorphGNT', 'SBLGNT', 'SBL', 'Strong', 'lemma', 'lexeme',
  'NA28', 'UBS5', 'LXX', 'TR', 'KJV', 'ESV', 'KRV', 'WEB',
  'nominative', 'genitive', 'dative', 'accusative', 'vocative',
  'singular', 'plural', 'masculine', 'feminine', 'neuter',
  'present', 'aorist', 'perfect', 'imperfect', 'future',
  'active', 'middle', 'passive', 'indicative', 'subjunctive',
  'imperative', 'infinitive', 'participle',
])

const sha256 = (value) => `sha256:${createHash('sha256').update(String(value), 'utf8').digest('hex')}`

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]))
  }
  return value
}

export const stableStringify = (value) => JSON.stringify(stableValue(value))

export function sourceFingerprint(packet) {
  return sha256(stableStringify({
    packetId: packet.packetId,
    strong: packet.strong,
    identity: packet.identity,
    usage: packet.usage,
    sourceEvidence: packet.sourceEvidence,
    reuse: packet.reuse,
    routing: packet.routing,
    theologyAudit: packet.theologyAudit,
    contexts: (packet.contexts || []).map((context) => ({
      contextId: context.contextId,
      tokenId: context.tokenId,
      reference: context.reference,
      target: context.target,
      verse: context.verse,
      localWindow: context.localWindow,
      morphgntCrossCheck: context.morphgntCrossCheck,
    })),
  }))
}

export const OUTPUT_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: [
    'strong',
    'sourceFingerprint',
    'transliterationKo',
    'primaryGlossKo',
    'alternateGlossesKo',
    'lexicalNotesKo',
    'contextDecisions',
    'reviewerFlags',
  ],
  properties: {
    strong: { type: 'string', pattern: '^G[1-9][0-9]*$' },
    sourceFingerprint: { type: 'string', pattern: '^sha256:[a-f0-9]{64}$' },
    transliterationKo: { type: 'string', minLength: 1, pattern: '[가-힣]' },
    primaryGlossKo: { type: 'string', minLength: 1, pattern: '[가-힣]' },
    alternateGlossesKo: {
      type: 'array',
      uniqueItems: true,
      items: { type: 'string', minLength: 1, pattern: '[가-힣]' },
    },
    lexicalNotesKo: { type: 'string' },
    contextDecisions: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['contextId', 'glossKo', 'rationaleKo', 'confidence', 'riskFlags'],
        properties: {
          contextId: { type: 'string', minLength: 1 },
          glossKo: { type: 'string', minLength: 1, pattern: '[가-힣]' },
          rationaleKo: { type: 'string', minLength: 1, pattern: '[가-힣]' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          riskFlags: {
            type: 'array',
            uniqueItems: true,
            items: { type: 'string', enum: [...RISK_FLAGS] },
          },
        },
      },
    },
    reviewerFlags: {
      type: 'array',
      uniqueItems: true,
      items: { type: 'string', minLength: 1 },
    },
  },
})

function assertReady(packet) {
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)) throw new TypeError('source packet must be an object')
  if (packet.sourcePacketStatus !== 'ready') throw new Error(`${packet.strong || 'unknown'} source packet is not ready`)
  if (!/^G[1-9]\d*$/u.test(packet.strong || '')) throw new Error('invalid Greek Strong id')
  if (!packet.identity?.primaryLemma) throw new Error(`${packet.strong} primary lemma missing`)
  if (!Array.isArray(packet.contexts) || packet.contexts.length < 1) throw new Error(`${packet.strong} representative contexts missing`)
}

export function createJobEnvelope(packet, slot) {
  assertReady(packet)
  const normalizedSlot = String(slot || '').toUpperCase()
  if (!COMPARISON_SLOTS.includes(normalizedSlot)) throw new Error(`unsupported comparison slot: ${slot}`)
  const fingerprint = sourceFingerprint(packet)
  return {
    schemaVersion: 1,
    contractVersion: LUKE_G2_TRANSLATION_CONTRACT_VERSION,
    promptVersion: LUKE_G2_PROMPT_VERSION,
    jobId: `luke-g2:${normalizedSlot}:${packet.strong}:${fingerprint.slice(-12)}`,
    blindGroupId: `luke-g2:${packet.strong}:${fingerprint.slice(-12)}`,
    comparisonSlot: normalizedSlot,
    strong: packet.strong,
    packetId: packet.packetId,
    sourceFingerprint: fingerprint,
    contextCount: packet.contexts.length,
    blindBoundary: {
      otherSlotOutputIncluded: false,
      crossSlotDirectoryReadAllowed: false,
      comparisonBeforeBothCandidatesComplete: false,
      productionWriteAllowed: false,
      automaticApprovalAllowed: false,
    },
    source: {
      identity: packet.identity,
      usage: packet.usage,
      sourceEvidence: packet.sourceEvidence,
      reuse: packet.reuse,
      routing: packet.routing,
      theologyAudit: packet.theologyAudit,
      contexts: packet.contexts.map((context) => ({
        contextId: context.contextId,
        tokenId: context.tokenId,
        reference: context.reference,
        target: context.target,
        verse: context.verse,
        localWindow: context.localWindow,
        morphgntCrossCheck: context.morphgntCrossCheck,
      })),
    },
    outputSchema: OUTPUT_SCHEMA,
  }
}

export function createModelRequest(envelope) {
  const requiredRiskFlags = REQUIRED_RISK_FLAGS[envelope.strong] || []
  const payload = {
    task: 'Create one blind Korean lexicon candidate for the supplied Luke Greek Strong packet.',
    strong: envelope.strong,
    sourceFingerprint: envelope.sourceFingerprint,
    identity: envelope.source.identity,
    sourceEvidence: envelope.source.sourceEvidence,
    existingKoreanControl: envelope.source.reuse,
    theologyAudit: envelope.source.theologyAudit,
    contexts: envelope.source.contexts,
    requiredRiskFlags,
    rules: [
      'Return JSON only and follow the supplied schema exactly.',
      'Preserve every contextId exactly once and in the original order.',
      'Translate the lexeme, not the whole verse; use the verse and local window only to distinguish contextual sense.',
      'transliterationKo must be a Korean Hangul pronunciation, not Latin scholarly transliteration.',
      'primaryGlossKo, alternateGlossesKo, lexicalNotesKo, glossKo, and rationaleKo must be Korean; do not leave English sentences or Chinese meta commentary.',
      'Keep lexical meaning distinct from theological conclusions and avoid illegitimate totality transfer.',
      'Use concise Korean suitable for historical-grammatical and Reformed biblical research.',
      'Do not treat an English gloss as infallible; weigh lemma, morphology, representative contexts, and cross-check evidence.',
      'Do not copy or infer another model result. This is an independent blind candidate.',
      'For proper names, give a stable Korean transliteration and do not invent etymological meaning.',
      'For theological-sensitive or polysemous terms, record uncertainty with calibrated confidence, riskFlags, and reviewerFlags.',
      'Do not assign confidence 1.0 to every context; reserve 1.0 for genuinely certain decisions.',
      requiredRiskFlags.length
        ? `Across the candidate, include these required riskFlags at least once each: ${requiredRiskFlags.join(', ')}.`
        : 'Use only riskFlags justified by the source and context.',
      'Existing Korean is a comparison control, not an automatic answer.',
    ],
  }
  const system = [
    'You are an expert Koine Greek lexicographer producing a Korean research candidate from pinned TAGNT context packets.',
    'Use historical-grammatical interpretation and Reformed Westminster theological safeguards without importing doctrine into lexical meaning.',
    'No output from the other comparison slot is available or permitted.',
    'All Korean fields must be natural Korean, and transliterationKo must use Hangul pronunciation.',
  ].join(' ')
  return {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(payload) },
    ],
    responseSchema: OUTPUT_SCHEMA,
  }
}

export function parseJsonCandidate(content) {
  if (typeof content !== 'string' || !content.trim()) throw new Error('model output is empty')
  const unfenced = content.trim().replace(/^```(?:json)?\s*/iu, '').replace(/\s*```$/u, '')
  try {
    return JSON.parse(unfenced)
  } catch (error) {
    throw new Error(`model output JSON parse failed: ${error.message}`)
  }
}

function containsHangul(value) {
  return /[가-힣]/u.test(String(value || ''))
}

function containsHan(value) {
  return /\p{Script=Han}/u.test(String(value || ''))
}

function containsLatin(value) {
  return /\p{Script=Latin}/u.test(String(value || ''))
}

function unexpectedLatinWords(value) {
  return (String(value || '').match(/[\p{Script=Latin}\p{M}][\p{Script=Latin}\p{M}'-]{2,}/gu) || [])
    .filter((word) => !ALLOWED_LATIN_WORDS.has(word))
}

function validateKoreanField(value, label, errors, { allowEmpty = false, transliteration = false } = {}) {
  if (typeof value !== 'string') {
    errors.push(`${label} must be a string`)
    return
  }
  const text = value.trim()
  if (!text) {
    if (!allowEmpty) errors.push(`${label} missing`)
    return
  }
  if (!containsHangul(text)) errors.push(`${label} must contain Hangul`)
  if (containsHan(text)) errors.push(`${label} contains Chinese Han characters`)
  if (transliteration && containsLatin(text)) errors.push(`${label} must not contain Latin transliteration`)
  const unexpected = unexpectedLatinWords(text)
  if (!transliteration && unexpected.length >= 3) {
    errors.push(`${label} contains untranslated Latin text: ${unexpected.slice(0, 5).join(',')}`)
  }
}

export function validateCandidate(candidate, envelope) {
  const errors = []
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) errors.push('candidate root must be an object')
  if (candidate?.strong !== envelope.strong) errors.push(`strong mismatch: ${candidate?.strong}`)
  if (candidate?.sourceFingerprint !== envelope.sourceFingerprint) errors.push('sourceFingerprint mismatch')
  validateKoreanField(candidate?.transliterationKo, 'transliterationKo', errors, { transliteration: true })
  validateKoreanField(candidate?.primaryGlossKo, 'primaryGlossKo', errors)
  if (!Array.isArray(candidate?.alternateGlossesKo)) errors.push('alternateGlossesKo must be an array')
  else {
    candidate.alternateGlossesKo.forEach((value, index) => validateKoreanField(value, `alternateGlossesKo[${index}]`, errors))
    if (new Set(candidate.alternateGlossesKo).size !== candidate.alternateGlossesKo.length) errors.push('alternateGlossesKo contains duplicates')
  }
  validateKoreanField(candidate?.lexicalNotesKo, 'lexicalNotesKo', errors, { allowEmpty: true })
  if (!Array.isArray(candidate?.reviewerFlags)) errors.push('reviewerFlags must be an array')
  else {
    if (candidate.reviewerFlags.some((value) => typeof value !== 'string' || !value.trim())) errors.push('reviewerFlags contains an empty value')
    if (new Set(candidate.reviewerFlags).size !== candidate.reviewerFlags.length) errors.push('reviewerFlags contains duplicates')
  }

  const expectedIds = envelope.source.contexts.map((context) => context.contextId)
  const decisions = Array.isArray(candidate?.contextDecisions) ? candidate.contextDecisions : []
  if (decisions.length !== expectedIds.length) errors.push(`context decision count mismatch: ${decisions.length}/${expectedIds.length}`)
  const seen = new Set()
  const allRiskFlags = new Set()
  decisions.forEach((decision, index) => {
    if (!decision || typeof decision !== 'object') {
      errors.push(`contextDecisions[${index}] invalid`)
      return
    }
    if (decision.contextId !== expectedIds[index]) errors.push(`contextDecisions[${index}] contextId/order mismatch`)
    if (seen.has(decision.contextId)) errors.push(`duplicate contextId: ${decision.contextId}`)
    seen.add(decision.contextId)
    validateKoreanField(decision.glossKo, `${decision.contextId}: glossKo`, errors)
    validateKoreanField(decision.rationaleKo, `${decision.contextId}: rationaleKo`, errors)
    if (typeof decision.confidence !== 'number' || decision.confidence < 0 || decision.confidence > 1) errors.push(`${decision.contextId}: confidence invalid`)
    if (!Array.isArray(decision.riskFlags)) errors.push(`${decision.contextId}: riskFlags must be an array`)
    else {
      const invalid = decision.riskFlags.filter((flag) => !RISK_FLAGS.includes(flag))
      if (invalid.length) errors.push(`${decision.contextId}: invalid riskFlags ${invalid.join(',')}`)
      if (new Set(decision.riskFlags).size !== decision.riskFlags.length) errors.push(`${decision.contextId}: duplicate riskFlags`)
      decision.riskFlags.forEach((flag) => allRiskFlags.add(flag))
    }
  })
  for (const expectedId of expectedIds) if (!seen.has(expectedId)) errors.push(`missing contextId: ${expectedId}`)
  if (decisions.length > 1 && decisions.every((decision) => decision?.confidence === 1)) {
    errors.push('confidence calibration invalid: every context decision is 1.0')
  }
  for (const requiredFlag of REQUIRED_RISK_FLAGS[envelope.strong] || []) {
    if (!allRiskFlags.has(requiredFlag)) errors.push(`required riskFlag missing for ${envelope.strong}: ${requiredFlag}`)
  }
  return { passed: errors.length === 0, errors }
}

export function createStoredCandidate({ envelope, modelResult, candidate, generatedAt }) {
  const validation = validateCandidate(candidate, envelope)
  if (!validation.passed) throw new Error(validation.errors.join('; '))
  return {
    schemaVersion: 1,
    contractVersion: envelope.contractVersion,
    promptVersion: envelope.promptVersion,
    candidateId: `${envelope.blindGroupId}:slot-${envelope.comparisonSlot.toLowerCase()}`,
    blindGroupId: envelope.blindGroupId,
    comparisonSlot: envelope.comparisonSlot,
    strong: envelope.strong,
    packetId: envelope.packetId,
    sourceFingerprint: envelope.sourceFingerprint,
    contextCount: envelope.contextCount,
    status: 'candidate',
    generatedAt,
    model: modelResult.model,
    usage: modelResult.usage || null,
    metrics: modelResult.metrics || null,
    payload: candidate,
    validation,
    governance: {
      blindCandidate: true,
      otherSlotOutputIncluded: false,
      productionWriteAllowed: false,
      finalApprovalAllowed: false,
      humanReviewRequired: true,
    },
  }
}

function fixturePacket(strong = 'G2316') {
  return {
    packetId: `fixture:${strong}`,
    sourcePacketStatus: 'ready',
    strong,
    identity: { primaryLemma: 'θεός' },
    usage: { tokenCount: 2 },
    sourceEvidence: { englishGlosses: ['God'] },
    reuse: {},
    routing: {},
    theologyAudit: {},
    contexts: [
      { contextId: 'ctx-1', tokenId: 'Luke.1.6.1', reference: 'Luke 1:6', target: {}, verse: {}, localWindow: [], morphgntCrossCheck: {} },
      { contextId: 'ctx-2', tokenId: 'Luke.1.8.1', reference: 'Luke 1:8', target: {}, verse: {}, localWindow: [], morphgntCrossCheck: {} },
    ],
  }
}

function fixtureCandidate(envelope) {
  return {
    strong: envelope.strong,
    sourceFingerprint: envelope.sourceFingerprint,
    transliterationKo: '테오스',
    primaryGlossKo: '하나님',
    alternateGlossesKo: ['신'],
    lexicalNotesKo: '문맥과 형태론을 함께 검토해야 한다.',
    contextDecisions: [
      { contextId: 'ctx-1', glossKo: '하나님', rationaleKo: '문맥에서 유일하신 하나님을 가리킨다.', confidence: 0.97, riskFlags: ['theological-sensitive'] },
      { contextId: 'ctx-2', glossKo: '하나님', rationaleKo: '성전 섬김의 대상이 되는 하나님을 가리킨다.', confidence: 0.92, riskFlags: [] },
    ],
    reviewerFlags: ['THEOLOGY_KEYWORD'],
  }
}

function runSelfTest() {
  const envelope = createJobEnvelope(fixturePacket(), 'A')
  const candidate = fixtureCandidate(envelope)
  assert.equal(validateCandidate(candidate, envelope).passed, true)
  assert.match(validateCandidate({ ...candidate, transliterationKo: 'theos' }, envelope).errors.join(';'), /Hangul|Latin/u)
  assert.match(validateCandidate({ ...candidate, lexicalNotesKo: '中文 해설' }, envelope).errors.join(';'), /Chinese Han/u)
  assert.match(validateCandidate({
    ...candidate,
    contextDecisions: candidate.contextDecisions.map((decision) => ({ ...decision, confidence: 1 })),
  }, envelope).errors.join(';'), /every context decision is 1.0/u)
  assert.match(validateCandidate({
    ...candidate,
    contextDecisions: candidate.contextDecisions.map((decision) => ({ ...decision, riskFlags: [] })),
  }, envelope).errors.join(';'), /required riskFlag missing/u)
  console.log('✓ Luke G2 translation contract self-test passed · Hangul/language/confidence/risk gates')
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isDirectRun && process.argv.includes('--self-test')) runSelfTest()
