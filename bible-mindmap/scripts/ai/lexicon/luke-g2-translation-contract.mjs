import { createHash } from 'node:crypto'

export const LUKE_G2_TRANSLATION_CONTRACT_VERSION = '2026.08.09-luke-g2-local.1'
export const LUKE_G2_PROMPT_VERSION = 'luke-tagnt-context-ko-v1'
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
    transliterationKo: { type: 'string', minLength: 1 },
    primaryGlossKo: { type: 'string', minLength: 1 },
    alternateGlossesKo: {
      type: 'array',
      uniqueItems: true,
      items: { type: 'string', minLength: 1 },
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
          glossKo: { type: 'string', minLength: 1 },
          rationaleKo: { type: 'string', minLength: 1 },
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
  const payload = {
    task: 'Create one blind Korean lexicon candidate for the supplied Luke Greek Strong packet.',
    strong: envelope.strong,
    sourceFingerprint: envelope.sourceFingerprint,
    identity: envelope.source.identity,
    sourceEvidence: envelope.source.sourceEvidence,
    existingKoreanControl: envelope.source.reuse,
    theologyAudit: envelope.source.theologyAudit,
    contexts: envelope.source.contexts,
    rules: [
      'Return JSON only and follow the supplied schema exactly.',
      'Preserve every contextId exactly once and in the original order.',
      'Translate the lexeme, not the whole verse; use the verse and local window only to distinguish contextual sense.',
      'Keep lexical meaning distinct from theological conclusions and avoid illegitimate totality transfer.',
      'Use concise Korean suitable for historical-grammatical and Reformed biblical research.',
      'Do not treat an English gloss as infallible; weigh lemma, morphology, representative contexts, and cross-check evidence.',
      'Do not copy or infer another model result. This is an independent blind candidate.',
      'For proper names, give a stable Korean transliteration and do not invent etymological meaning.',
      'For theological-sensitive or polysemous terms, record uncertainty with confidence, riskFlags, and reviewerFlags.',
      'Existing Korean is a comparison control, not an automatic answer.',
    ],
  }
  const system = [
    'You are an expert Koine Greek lexicographer producing a Korean research candidate from pinned TAGNT context packets.',
    'Use historical-grammatical interpretation and Reformed Westminster theological safeguards without importing doctrine into lexical meaning.',
    'No output from the other comparison slot is available or permitted.',
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

export function validateCandidate(candidate, envelope) {
  const errors = []
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) errors.push('candidate root must be an object')
  if (candidate?.strong !== envelope.strong) errors.push(`strong mismatch: ${candidate?.strong}`)
  if (candidate?.sourceFingerprint !== envelope.sourceFingerprint) errors.push('sourceFingerprint mismatch')
  if (typeof candidate?.transliterationKo !== 'string' || !candidate.transliterationKo.trim()) errors.push('transliterationKo missing')
  if (typeof candidate?.primaryGlossKo !== 'string' || !candidate.primaryGlossKo.trim()) errors.push('primaryGlossKo missing')
  if (!Array.isArray(candidate?.alternateGlossesKo)) errors.push('alternateGlossesKo must be an array')
  else if (candidate.alternateGlossesKo.some((value) => typeof value !== 'string' || !value.trim())) errors.push('alternateGlossesKo contains an empty value')
  if (typeof candidate?.lexicalNotesKo !== 'string') errors.push('lexicalNotesKo must be a string')
  if (!Array.isArray(candidate?.reviewerFlags)) errors.push('reviewerFlags must be an array')

  const expectedIds = envelope.source.contexts.map((context) => context.contextId)
  const decisions = Array.isArray(candidate?.contextDecisions) ? candidate.contextDecisions : []
  if (decisions.length !== expectedIds.length) errors.push(`context decision count mismatch: ${decisions.length}/${expectedIds.length}`)
  const seen = new Set()
  decisions.forEach((decision, index) => {
    if (!decision || typeof decision !== 'object') {
      errors.push(`contextDecisions[${index}] invalid`)
      return
    }
    if (decision.contextId !== expectedIds[index]) errors.push(`contextDecisions[${index}] contextId/order mismatch`)
    if (seen.has(decision.contextId)) errors.push(`duplicate contextId: ${decision.contextId}`)
    seen.add(decision.contextId)
    if (typeof decision.glossKo !== 'string' || !decision.glossKo.trim()) errors.push(`${decision.contextId}: glossKo missing`)
    if (typeof decision.rationaleKo !== 'string' || !decision.rationaleKo.trim()) errors.push(`${decision.contextId}: rationaleKo missing`)
    if (typeof decision.confidence !== 'number' || decision.confidence < 0 || decision.confidence > 1) errors.push(`${decision.contextId}: confidence invalid`)
    if (!Array.isArray(decision.riskFlags)) errors.push(`${decision.contextId}: riskFlags must be an array`)
    else {
      const invalid = decision.riskFlags.filter((flag) => !RISK_FLAGS.includes(flag))
      if (invalid.length) errors.push(`${decision.contextId}: invalid riskFlags ${invalid.join(',')}`)
      if (new Set(decision.riskFlags).size !== decision.riskFlags.length) errors.push(`${decision.contextId}: duplicate riskFlags`)
    }
  })
  for (const expectedId of expectedIds) if (!seen.has(expectedId)) errors.push(`missing contextId: ${expectedId}`)
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
