import { createHash } from 'node:crypto'

export const CONTRACT_VERSION = '2026.08.09-g2.2'
export const PROMPT_VERSION = 'genesis-bdb-ko-v1'
export const PROVIDERS = Object.freeze(['nvidia', 'openai'])
export const RISK_FLAGS = Object.freeze(['polysemy', 'theological-sensitive', 'proper-name', 'uncertain-etymology', 'source-text-noisy'])

const sha256 = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]))
  return value
}

export const stableStringify = (value) => JSON.stringify(stableValue(value))

export function sourceFingerprint(packet) {
  return sha256(stableStringify({
    packetId: packet.packetId,
    strong: packet.strong,
    source: packet.source,
    bdbEntries: packet.bdbEntries,
    sourceNodes: packet.sourceNodes.map(({ id, parentId, nodeType, label, sourceHash }) => ({ id, parentId, nodeType, label, sourceHash })),
  }))
}

export const OUTPUT_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['strong', 'sourceFingerprint', 'transliterationKo', 'primaryGlossKo', 'notesKo', 'nodes'],
  properties: {
    strong: { type: 'string', pattern: '^H[1-9][0-9]*$' },
    sourceFingerprint: { type: 'string', pattern: '^sha256:[a-f0-9]{64}$' },
    transliterationKo: { type: 'string', minLength: 1 },
    primaryGlossKo: { type: 'string', minLength: 1 },
    notesKo: { type: 'string' },
    nodes: {
      type: 'array', minItems: 1,
      items: {
        type: 'object', additionalProperties: false,
        required: ['sourceNodeId', 'textKo', 'confidence', 'riskFlags'],
        properties: {
          sourceNodeId: { type: 'string', minLength: 1 },
          textKo: { type: 'string', minLength: 1 },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          riskFlags: { type: 'array', uniqueItems: true, items: { type: 'string', enum: [...RISK_FLAGS] } },
        },
      },
    },
  },
})

function assertReady(packet) {
  if (!packet || typeof packet !== 'object') throw new TypeError('source packet must be an object')
  if (packet.sourcePacketStatus !== 'ready') throw new Error(`${packet.strong || 'unknown'} source packet is not ready`)
  if (!/^H[1-9]\d*$/.test(packet.strong || '')) throw new Error('invalid Strong id')
  if (!Array.isArray(packet.sourceNodes) || packet.sourceNodes.length === 0) throw new Error(`${packet.strong} source nodes missing`)
}

export function createJobEnvelope(packet, provider) {
  assertReady(packet)
  if (!PROVIDERS.includes(provider)) throw new Error(`unsupported provider: ${provider}`)
  const fingerprint = sourceFingerprint(packet)
  return {
    schemaVersion: 1,
    contractVersion: CONTRACT_VERSION,
    promptVersion: PROMPT_VERSION,
    jobId: `genesis-g2:${provider}:${packet.strong}:${fingerprint.slice(-12)}`,
    blindGroupId: `genesis-g2:${packet.strong}:${fingerprint.slice(-12)}`,
    provider,
    strong: packet.strong,
    packetId: packet.packetId,
    sourceFingerprint: fingerprint,
    sourceNodeCount: packet.sourceNodes.length,
    blindBoundary: {
      otherProviderOutputIncluded: false,
      crossProviderDirectoryReadAllowed: false,
      comparisonBeforeBothCandidatesComplete: false,
      productionWriteAllowed: false,
    },
    source: {
      identity: packet.identity,
      lexicalMappings: packet.lexicalMappings,
      bdbEntries: packet.bdbEntries,
      nodes: packet.sourceNodes.map((node) => ({
        sourceNodeId: node.id,
        parentId: node.parentId,
        nodeType: node.nodeType,
        label: node.label,
        sourceText: node.text,
        sourceHash: node.sourceHash,
      })),
      sourceMeta: packet.source,
    },
    outputSchema: OUTPUT_SCHEMA,
  }
}

export function createProviderRequest(envelope) {
  const payload = {
    task: 'Translate the supplied BDB lexicon hierarchy into precise Korean research language.',
    strong: envelope.strong,
    sourceFingerprint: envelope.sourceFingerprint,
    identity: envelope.source.identity,
    lexicalMappings: envelope.source.lexicalMappings,
    nodes: envelope.source.nodes,
    rules: [
      'Return JSON only and follow the supplied schema exactly.',
      'Preserve every sourceNodeId exactly once and in the original order.',
      'Do not merge, split, add, or remove source nodes.',
      'Translate semantic content while preserving Hebrew forms when needed for accuracy.',
      'Keep distinct BDB senses distinct even when Korean glosses overlap.',
      'Use concise Korean suitable for historical-grammatical and Reformed biblical research.',
      'Do not use another model result or quote an unapproved Korean dictionary.',
      'Mark uncertainty with confidence and riskFlags instead of silently harmonizing the source.',
    ],
  }
  const systemText = [
    'You are an expert Hebrew lexicographer producing a Korean research translation of public-domain BDB source nodes.',
    'The English source hierarchy is authoritative for this task. Preserve node identity and semantic distinctions.',
    'This is a blind candidate: no output from any other model is available or permitted.',
  ].join(' ')
  const userText = JSON.stringify(payload)
  if (envelope.provider === 'nvidia') {
    return { messages: [{ role: 'system', content: systemText }, { role: 'user', content: userText }], responseSchema: OUTPUT_SCHEMA }
  }
  return {
    input: [
      { role: 'developer', content: [{ type: 'input_text', text: systemText }] },
      { role: 'user', content: [{ type: 'input_text', text: userText }] },
    ],
    responseSchema: OUTPUT_SCHEMA,
  }
}

export function parseJsonCandidate(content) {
  if (typeof content !== 'string' || !content.trim()) throw new Error('provider output is empty')
  const unfenced = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try { return JSON.parse(unfenced) } catch (error) { throw new Error(`provider output JSON parse failed: ${error.message}`) }
}

export function validateCandidate(candidate, envelope) {
  const errors = []
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) errors.push('candidate root must be an object')
  if (candidate?.strong !== envelope.strong) errors.push(`strong mismatch: ${candidate?.strong}`)
  if (candidate?.sourceFingerprint !== envelope.sourceFingerprint) errors.push('sourceFingerprint mismatch')
  if (typeof candidate?.transliterationKo !== 'string' || !candidate.transliterationKo.trim()) errors.push('transliterationKo missing')
  if (typeof candidate?.primaryGlossKo !== 'string' || !candidate.primaryGlossKo.trim()) errors.push('primaryGlossKo missing')
  if (typeof candidate?.notesKo !== 'string') errors.push('notesKo must be a string')
  const expectedIds = envelope.source.nodes.map((node) => node.sourceNodeId)
  const nodes = Array.isArray(candidate?.nodes) ? candidate.nodes : []
  if (nodes.length !== expectedIds.length) errors.push(`node count mismatch: ${nodes.length}/${expectedIds.length}`)
  const seen = new Set()
  nodes.forEach((node, index) => {
    if (!node || typeof node !== 'object') { errors.push(`nodes[${index}] invalid`); return }
    if (node.sourceNodeId !== expectedIds[index]) errors.push(`nodes[${index}] sourceNodeId/order mismatch`)
    if (seen.has(node.sourceNodeId)) errors.push(`duplicate sourceNodeId: ${node.sourceNodeId}`)
    seen.add(node.sourceNodeId)
    if (typeof node.textKo !== 'string' || !node.textKo.trim()) errors.push(`${node.sourceNodeId}: textKo missing`)
    if (typeof node.confidence !== 'number' || node.confidence < 0 || node.confidence > 1) errors.push(`${node.sourceNodeId}: confidence invalid`)
    if (!Array.isArray(node.riskFlags)) errors.push(`${node.sourceNodeId}: riskFlags must be an array`)
    else {
      const invalid = node.riskFlags.filter((flag) => !RISK_FLAGS.includes(flag))
      if (invalid.length) errors.push(`${node.sourceNodeId}: invalid riskFlags ${invalid.join(',')}`)
      if (new Set(node.riskFlags).size !== node.riskFlags.length) errors.push(`${node.sourceNodeId}: duplicate riskFlags`)
    }
  })
  for (const expectedId of expectedIds) if (!seen.has(expectedId)) errors.push(`missing sourceNodeId: ${expectedId}`)
  return { passed: errors.length === 0, errors }
}

export function createStoredCandidate({ envelope, providerResult, candidate, attempt, generatedAt }) {
  const validation = validateCandidate(candidate, envelope)
  if (!validation.passed) throw new Error(validation.errors.join('; '))
  return {
    schemaVersion: 1,
    contractVersion: envelope.contractVersion,
    promptVersion: envelope.promptVersion,
    candidateId: `${envelope.blindGroupId}:${envelope.provider}`,
    blindGroupId: envelope.blindGroupId,
    provider: envelope.provider,
    model: providerResult.model,
    requestId: providerResult.requestId || null,
    strong: envelope.strong,
    packetId: envelope.packetId,
    sourceFingerprint: envelope.sourceFingerprint,
    sourceNodeCount: envelope.sourceNodeCount,
    status: 'candidate',
    attempt,
    generatedAt,
    payload: candidate,
    validation,
    usage: providerResult.usage || null,
    governance: {
      blindCandidate: true,
      otherProviderOutputIncluded: false,
      productionWriteAllowed: false,
      finalApprovalAllowed: false,
    },
  }
}
