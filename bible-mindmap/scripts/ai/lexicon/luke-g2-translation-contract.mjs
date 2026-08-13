import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

export const LUKE_G2_TRANSLATION_CONTRACT_VERSION = '2026.08.13-luke-g2-four-llm.1'
export const LUKE_G2_PROMPT_VERSION = 'luke-public-evidence-ko-v3'
export const REQUIRED_ACTORS = Object.freeze(['gpt', 'jarvis', 'claude', 'gemini'])
export const ACTOR_ROLES = Object.freeze({
  gpt: 'korean-candidate-and-final-public-evidence-adjudicator',
  jarvis: 'independent-source-context-and-governance-auditor',
  claude: 'independent-blind-lexical-auditor',
  gemini: 'independent-dispute-and-theology-boundary-auditor',
})
export const RISK_FLAGS = Object.freeze([
  'polysemy',
  'theological-sensitive',
  'proper-name',
  'morphology-sensitive',
  'context-sensitive',
  'reuse-conflict',
  'source-conflict',
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

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]))
  }
  return value
}

export const stableStringify = (value) => JSON.stringify(stableValue(value))
export const sha256 = (value) => `sha256:${createHash('sha256').update(String(value), 'utf8').digest('hex')}`

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

function assertReadyPacket(packet) {
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)) throw new TypeError('source packet must be an object')
  if (packet.sourcePacketStatus !== 'ready') throw new Error(`${packet.strong || 'unknown'} source packet is not ready`)
  if (!/^G[1-9]\d*$/u.test(packet.strong || '')) throw new Error('invalid Greek Strong id')
  if (!packet.identity?.primaryLemma) throw new Error(`${packet.strong} primary lemma missing`)
  if (!Array.isArray(packet.contexts) || packet.contexts.length < 1) throw new Error(`${packet.strong} representative contexts missing`)
}

export function createEvidenceJob(packet, actor) {
  assertReadyPacket(packet)
  const actorId = String(actor || '').toLowerCase()
  if (!REQUIRED_ACTORS.includes(actorId)) throw new Error(`unsupported actor: ${actor}`)
  const fingerprint = sourceFingerprint(packet)
  return {
    schemaVersion: 1,
    contractVersion: LUKE_G2_TRANSLATION_CONTRACT_VERSION,
    promptVersion: LUKE_G2_PROMPT_VERSION,
    jobId: `luke-g2:${actorId}:${packet.strong}:${fingerprint.slice(-12)}`,
    actor: actorId,
    actorRole: ACTOR_ROLES[actorId],
    strong: packet.strong,
    sourceFingerprint: fingerprint,
    independence: {
      otherActorOutputsVisibleBeforeSubmission: false,
      modelMajorityIsAuthority: false,
      sourceEvidenceIsAuthority: true,
    },
    source: {
      identity: packet.identity,
      usage: packet.usage,
      sourceEvidence: packet.sourceEvidence,
      reuse: packet.reuse,
      routing: packet.routing,
      theologyAudit: packet.theologyAudit,
      contexts: packet.contexts,
    },
    requirements: {
      koreanTransliteration: true,
      contextByContextDecision: true,
      evidenceClaimsRequired: true,
      publicEvidenceMayBeAddedOnlyWhenRightsPass: true,
      theologicalMeaningMustRemainSeparateFromLexicalMeaning: true,
      productionWriteAllowed: false,
    },
  }
}

function containsHangul(value) {
  return /[가-힣]/u.test(String(value || ''))
}

export function validateAgentResult(result, job) {
  const errors = []
  if (!result || typeof result !== 'object' || Array.isArray(result)) return { passed: false, errors: ['result root must be an object'] }
  if (result.actor !== job.actor) errors.push(`actor mismatch: ${result.actor}`)
  if (result.strong !== job.strong) errors.push(`strong mismatch: ${result.strong}`)
  if (result.sourceFingerprint !== job.sourceFingerprint) errors.push('sourceFingerprint mismatch')
  for (const field of ['transliterationKo', 'primaryGlossKo']) {
    if (!containsHangul(result[field])) errors.push(`${field} must contain Hangul`)
  }
  if (!Array.isArray(result.alternateGlossesKo)) errors.push('alternateGlossesKo must be an array')
  if (typeof result.lexicalNotesKo !== 'string') errors.push('lexicalNotesKo must be a string')
  if (!Array.isArray(result.contextDecisions) || result.contextDecisions.length !== job.source.contexts.length) {
    errors.push('contextDecisions count mismatch')
  } else {
    const expected = job.source.contexts.map((context) => context.contextId)
    result.contextDecisions.forEach((decision, index) => {
      if (decision?.contextId !== expected[index]) errors.push(`contextDecisions[${index}] contextId/order mismatch`)
      if (!containsHangul(decision?.glossKo)) errors.push(`${expected[index]} glossKo must contain Hangul`)
      if (!containsHangul(decision?.rationaleKo)) errors.push(`${expected[index]} rationaleKo must contain Hangul`)
      if (typeof decision?.confidence !== 'number' || decision.confidence < 0 || decision.confidence > 1) errors.push(`${expected[index]} confidence invalid`)
      if (!Array.isArray(decision?.riskFlags) || decision.riskFlags.some((flag) => !RISK_FLAGS.includes(flag))) errors.push(`${expected[index]} riskFlags invalid`)
    })
  }
  if (!Array.isArray(result.evidenceClaims) || result.evidenceClaims.length < 1) {
    errors.push('evidenceClaims must contain at least one source-grounded claim')
  } else {
    result.evidenceClaims.forEach((claim, index) => {
      if (!claim?.sourceId || !claim?.locator || !claim?.claimType) errors.push(`evidenceClaims[${index}] sourceId/locator/claimType required`)
      if (!['supports', 'qualifies', 'contradicts'].includes(claim?.relation)) errors.push(`evidenceClaims[${index}] relation invalid`)
    })
  }
  const allFlags = new Set((result.contextDecisions || []).flatMap((decision) => decision?.riskFlags || []))
  for (const flag of REQUIRED_RISK_FLAGS[job.strong] || []) if (!allFlags.has(flag)) errors.push(`required riskFlag missing: ${flag}`)
  return { passed: errors.length === 0, errors }
}

export function validatePublicEvidenceSet(publicEvidence) {
  const errors = []
  if (!Array.isArray(publicEvidence) || publicEvidence.length < 1) return { passed: false, errors: ['publicEvidence must not be empty'] }
  for (const [index, evidence] of publicEvidence.entries()) {
    if (!evidence?.sourceId || !evidence?.sourceLocator || !evidence?.contentFingerprint) errors.push(`publicEvidence[${index}] identity/fingerprint missing`)
    if (evidence?.rightsVerdict !== 'PASS') errors.push(`publicEvidence[${index}] rightsVerdict must be PASS`)
    if (evidence?.verified !== true) errors.push(`publicEvidence[${index}] verified=true required`)
    if (!['greek-lexicon', 'theological-lexical-reference', 'morphology', 'book-context'].includes(evidence?.evidenceClass)) errors.push(`publicEvidence[${index}] evidenceClass invalid`)
  }
  return { passed: errors.length === 0, errors }
}

export function createFinalAdjudicationJob({ packet, agentResults, publicEvidence }) {
  assertReadyPacket(packet)
  const jobs = new Map(REQUIRED_ACTORS.map((actor) => [actor, createEvidenceJob(packet, actor)]))
  const resultByActor = new Map((agentResults || []).map((result) => [result.actor, result]))
  const errors = []
  for (const actor of REQUIRED_ACTORS) {
    const result = resultByActor.get(actor)
    if (!result) errors.push(`missing independent result: ${actor}`)
    else errors.push(...validateAgentResult(result, jobs.get(actor)).errors.map((error) => `${actor}: ${error}`))
  }
  errors.push(...validatePublicEvidenceSet(publicEvidence).errors)
  if (errors.length) throw new Error(`final adjudication preconditions failed: ${errors.join(' | ')}`)
  return {
    schemaVersion: 1,
    adjudicator: 'gpt',
    adjudicationMode: 'public-evidence-first',
    strong: packet.strong,
    sourceFingerprint: sourceFingerprint(packet),
    requiredActors: [...REQUIRED_ACTORS],
    modelMajorityIsAuthority: false,
    publicEvidence,
    independentResults: REQUIRED_ACTORS.map((actor) => resultByActor.get(actor)),
    rules: [
      'Pinned original-language/context/morphology and Rights-PASS public lexical evidence outrank model agreement.',
      'Use public theological/lexical references to test boundaries, not to import doctrine into lexical meaning.',
      'Resolve only when evidence supports a wording with no material unresolved conflict.',
      'If material evidence remains unresolved, output HOLD or DISPUTE instead of asking the user to adjudicate each Strong.',
      'Do not use any unlisted LLM or any locally hosted model as a tie-breaker.',
      'User semantic approval is not required per Strong; protected Registry merge governance remains separate.',
    ],
  }
}

function selfTest() {
  const packet = {
    packetId: 'luke-g2-source-context:G2316',
    strong: 'G2316',
    sourcePacketStatus: 'ready',
    identity: { primaryLemma: 'θεός' },
    usage: { tokenCount: 1 },
    sourceEvidence: { englishGlosses: ['God'] },
    reuse: {}, routing: {}, theologyAudit: {},
    contexts: [{ contextId: 'c1', reference: 'Luke 1:1', target: { strong: 'G2316' }, verse: { text: 'x' } }],
  }
  const job = createEvidenceJob(packet, 'gpt')
  assert.equal(job.actor, 'gpt')
  assert.equal(job.independence.modelMajorityIsAuthority, false)
  assert.throws(() => createEvidenceJob(packet, 'unlisted'))
  const evidence = [{ sourceId: 'open-lex', sourceLocator: 'pinned:test', contentFingerprint: 'sha256:test', rightsVerdict: 'PASS', verified: true, evidenceClass: 'greek-lexicon' }]
  assert.equal(validatePublicEvidenceSet(evidence).passed, true)
  console.log('✓ Luke G2 four-LLM translation/evidence contract self-test passed')
}

if (process.argv.includes('--self-test')) selfTest()
