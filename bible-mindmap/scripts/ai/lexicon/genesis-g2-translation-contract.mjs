import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'

export const CONTRACT_VERSION = '2026.08.09-g2.3'
export const PROMPT_VERSION = 'genesis-bdb-ko-v2'
export const PROVIDERS = Object.freeze(['nvidia', 'openai'])
export const RISK_FLAGS = Object.freeze(['polysemy', 'theological-sensitive', 'proper-name', 'uncertain-etymology', 'source-text-noisy'])

const REQUIRED_RISK_FLAGS = Object.freeze({
  H430: Object.freeze(['theological-sensitive']),
  H776: Object.freeze(['polysemy']),
  H7307: Object.freeze(['polysemy', 'theological-sensitive']),
})

const ALLOWED_LATIN_WORDS = new Set([
  'BDB', 'TWOT', 'Qal', 'Niphal', 'Piel', 'Pual', 'Hiphil', 'Hophal', 'Hithpael',
  'Niph', 'Hiph', 'Hithp', 'Aram', 'Arabic', 'Syriac', 'Akkadian', 'Hebrew',
])

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
    transliterationKo: { type: 'string', minLength: 1, pattern: '[가-힣]' },
    primaryGlossKo: { type: 'string', minLength: 1, pattern: '[가-힣]' },
    notesKo: { type: 'string' },
    nodes: {
      type: 'array', minItems: 1,
      items: {
        type: 'object', additionalProperties: false,
        required: ['sourceNodeId', 'textKo', 'confidence', 'riskFlags'],
        properties: {
          sourceNodeId: { type: 'string', minLength: 1 },
          textKo: { type: 'string', minLength: 1, pattern: '[가-힣]' },
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
  const requiredRiskFlags = REQUIRED_RISK_FLAGS[envelope.strong] || []
  const payload = {
    task: 'Translate the supplied BDB lexicon hierarchy into precise Korean research language.',
    strong: envelope.strong,
    sourceFingerprint: envelope.sourceFingerprint,
    identity: envelope.source.identity,
    lexicalMappings: envelope.source.lexicalMappings,
    nodes: envelope.source.nodes,
    requiredRiskFlags,
    rules: [
      'Return JSON only and follow the supplied schema exactly.',
      'Preserve every sourceNodeId exactly once and in the original order.',
      'Do not merge, split, add, or remove source nodes.',
      'transliterationKo must be a Korean Hangul pronunciation, not Latin scholarly transliteration.',
      'primaryGlossKo, notesKo, and every textKo must be Korean; do not leave English sentences or Chinese meta commentary.',
      'Translate semantic content while preserving Hebrew forms when needed for accuracy.',
      'Keep distinct BDB senses distinct even when Korean glosses overlap.',
      'Use concise Korean suitable for historical-grammatical and Reformed biblical research.',
      'Do not use another model result or quote an unapproved Korean dictionary.',
      'Mark uncertainty with calibrated confidence and riskFlags instead of silently harmonizing the source.',
      'Do not assign confidence 1.0 to every node; reserve 1.0 for genuinely certain nodes and express uncertainty honestly.',
      requiredRiskFlags.length
        ? `Across the candidate, include these required riskFlags at least once each: ${requiredRiskFlags.join(', ')}.`
        : 'Use only riskFlags justified by the source and context.',
    ],
  }
  const systemText = [
    'You are an expert Hebrew lexicographer producing a Korean research translation of public-domain BDB source nodes.',
    'The English source hierarchy is authoritative for this task. Preserve node identity and semantic distinctions.',
    'This is a blind candidate: no output from any other model is available or permitted.',
    'All Korean fields must be natural Korean. The transliterationKo field must use Hangul pronunciation.',
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
  if (!transliteration && unexpected.length >= 3) errors.push(`${label} contains untranslated Latin text: ${unexpected.slice(0, 5).join(',')}`)
}

export function validateCandidate(candidate, envelope) {
  const errors = []
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) errors.push('candidate root must be an object')
  if (candidate?.strong !== envelope.strong) errors.push(`strong mismatch: ${candidate?.strong}`)
  if (candidate?.sourceFingerprint !== envelope.sourceFingerprint) errors.push('sourceFingerprint mismatch')
  validateKoreanField(candidate?.transliterationKo, 'transliterationKo', errors, { transliteration: true })
  validateKoreanField(candidate?.primaryGlossKo, 'primaryGlossKo', errors)
  validateKoreanField(candidate?.notesKo, 'notesKo', errors, { allowEmpty: true })
  const expectedIds = envelope.source.nodes.map((node) => node.sourceNodeId)
  const nodes = Array.isArray(candidate?.nodes) ? candidate.nodes : []
  if (nodes.length !== expectedIds.length) errors.push(`node count mismatch: ${nodes.length}/${expectedIds.length}`)
  const seen = new Set()
  const allRiskFlags = new Set()
  nodes.forEach((node, index) => {
    if (!node || typeof node !== 'object') { errors.push(`nodes[${index}] invalid`); return }
    if (node.sourceNodeId !== expectedIds[index]) errors.push(`nodes[${index}] sourceNodeId/order mismatch`)
    if (seen.has(node.sourceNodeId)) errors.push(`duplicate sourceNodeId: ${node.sourceNodeId}`)
    seen.add(node.sourceNodeId)
    validateKoreanField(node.textKo, `${node.sourceNodeId}: textKo`, errors)
    if (typeof node.confidence !== 'number' || node.confidence < 0 || node.confidence > 1) errors.push(`${node.sourceNodeId}: confidence invalid`)
    if (!Array.isArray(node.riskFlags)) errors.push(`${node.sourceNodeId}: riskFlags must be an array`)
    else {
      const invalid = node.riskFlags.filter((flag) => !RISK_FLAGS.includes(flag))
      if (invalid.length) errors.push(`${node.sourceNodeId}: invalid riskFlags ${invalid.join(',')}`)
      if (new Set(node.riskFlags).size !== node.riskFlags.length) errors.push(`${node.sourceNodeId}: duplicate riskFlags`)
      node.riskFlags.forEach((flag) => allRiskFlags.add(flag))
    }
  })
  for (const expectedId of expectedIds) if (!seen.has(expectedId)) errors.push(`missing sourceNodeId: ${expectedId}`)
  if (nodes.length > 1 && nodes.every((node) => node?.confidence === 1)) errors.push('confidence calibration invalid: every node is 1.0')
  for (const requiredFlag of REQUIRED_RISK_FLAGS[envelope.strong] || []) {
    if (!allRiskFlags.has(requiredFlag)) errors.push(`required riskFlag missing for ${envelope.strong}: ${requiredFlag}`)
  }
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

function fixtureEnvelope(strong = 'H56') {
  return createJobEnvelope({
    packetId: `fixture:${strong}`,
    strong,
    sourcePacketStatus: 'ready',
    identity: { lemmas: ['אָבַל'], transliterations: ['abal'] },
    lexicalMappings: [],
    bdbEntries: [],
    sourceNodes: [
      { id: 'n1', parentId: null, nodeType: 'entry', label: 'entry', text: 'mourn', sourceHash: `sha256:${'a'.repeat(64)}` },
      { id: 'n2', parentId: 'n1', nodeType: 'sense', label: '1', text: 'to mourn', sourceHash: `sha256:${'b'.repeat(64)}` },
    ],
    source: { sourceId: 'fixture', versionRef: 'fixture' },
  }, 'nvidia')
}

function runSelfTest() {
  const envelope = fixtureEnvelope()
  const candidate = {
    strong: 'H56',
    sourceFingerprint: envelope.sourceFingerprint,
    transliterationKo: '아발',
    primaryGlossKo: '애도하다, 슬퍼하다',
    notesKo: '문맥에 따라 애도의 뜻으로 사용된다.',
    nodes: [
      { sourceNodeId: 'n1', textKo: '애도하다', confidence: 0.94, riskFlags: [] },
      { sourceNodeId: 'n2', textKo: '슬퍼하며 애도하다', confidence: 0.89, riskFlags: [] },
    ],
  }
  assert.equal(validateCandidate(candidate, envelope).passed, true)
  assert.match(validateCandidate({ ...candidate, transliterationKo: 'ʾābal' }, envelope).errors.join(';'), /Hangul|Latin/)
  assert.match(validateCandidate({ ...candidate, nodes: candidate.nodes.map((node) => ({ ...node, confidence: 1 })) }, envelope).errors.join(';'), /every node is 1.0/)
  assert.match(validateCandidate({ ...candidate, nodes: [{ ...candidate.nodes[0], textKo: '중국語 설명' }, candidate.nodes[1]] }, envelope).errors.join(';'), /Chinese Han/)

  const h430 = fixtureEnvelope('H430')
  const h430Candidate = { ...candidate, strong: 'H430', sourceFingerprint: h430.sourceFingerprint }
  assert.match(validateCandidate(h430Candidate, h430).errors.join(';'), /theological-sensitive/)
  console.log('✓ Genesis G2 translation contract self-test 통과 · Hangul/language/confidence/risk gates')
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isDirectRun && process.argv.includes('--self-test')) runSelfTest()
