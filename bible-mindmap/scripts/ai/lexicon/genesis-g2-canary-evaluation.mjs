import { createJobEnvelope, validateCandidate } from './genesis-g2-translation-contract.mjs'

export const CANARY_EVALUATION_VERSION = '2026.08.09-g2.4'
export const PROVIDER_ORDER = Object.freeze(['nvidia', 'openai'])
export const EXPECTED_RISK_FLAGS = Object.freeze({
  H430: ['theological-sensitive'],
  H776: ['polysemy'],
  H7307: ['polysemy', 'theological-sensitive'],
  H559: [],
  H56: [],
})

const round = (value, digits = 4) => Number(Number(value || 0).toFixed(digits))
const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
const clamp01 = (value) => Math.max(0, Math.min(1, value))

export function normalizeKorean(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(value) {
  const normalized = normalizeKorean(value)
  return normalized ? normalized.split(' ') : []
}

function ngrams(value, size = 2) {
  const normalized = normalizeKorean(value).replace(/\s+/g, '')
  if (!normalized) return []
  if (normalized.length <= size) return [normalized]
  const result = []
  for (let index = 0; index <= normalized.length - size; index += 1) result.push(normalized.slice(index, index + size))
  return result
}

function jaccard(left, right) {
  const a = new Set(left)
  const b = new Set(right)
  if (!a.size && !b.size) return 1
  const intersection = [...a].filter((item) => b.has(item)).length
  const union = new Set([...a, ...b]).size
  return union ? intersection / union : 0
}

function dice(left, right) {
  if (!left.length && !right.length) return 1
  const counts = new Map()
  for (const item of left) counts.set(item, (counts.get(item) || 0) + 1)
  let overlap = 0
  for (const item of right) {
    const count = counts.get(item) || 0
    if (count > 0) {
      overlap += 1
      counts.set(item, count - 1)
    }
  }
  return (2 * overlap) / Math.max(1, left.length + right.length)
}

export function lexicalAgreement(left, right) {
  const leftNormalized = normalizeKorean(left)
  const rightNormalized = normalizeKorean(right)
  if (leftNormalized === rightNormalized) return 1
  if (!leftNormalized || !rightNormalized) return 0
  const tokenScore = jaccard(tokens(leftNormalized), tokens(rightNormalized))
  const bigramScore = dice(ngrams(leftNormalized), ngrams(rightNormalized))
  const lengthScore = Math.min(leftNormalized.length, rightNormalized.length) / Math.max(leftNormalized.length, rightNormalized.length)
  return round(clamp01(tokenScore * 0.35 + bigramScore * 0.45 + lengthScore * 0.2))
}

function numberFrom(source, keys) {
  for (const key of keys) {
    const value = Number(source?.[key])
    if (Number.isFinite(value) && value >= 0) return value
  }
  return 0
}

export function normalizeUsage(candidate) {
  const usage = candidate?.usage || {}
  const inputTokens = numberFrom(usage, ['input_tokens', 'prompt_tokens', 'inputTokens', 'promptTokens'])
  const outputTokens = numberFrom(usage, ['output_tokens', 'completion_tokens', 'outputTokens', 'completionTokens'])
  const totalTokens = numberFrom(usage, ['total_tokens', 'totalTokens']) || inputTokens + outputTokens
  return {
    inputTokens,
    outputTokens,
    totalTokens,
    latencyMs: numberFrom(candidate?.metrics, ['latencyMs']),
  }
}

function priceFor(provider, pricing = {}) {
  const value = pricing?.[provider] || {}
  const inputPerMillion = Number(value.inputPerMillion)
  const outputPerMillion = Number(value.outputPerMillion)
  if (!Number.isFinite(inputPerMillion) || inputPerMillion < 0 || !Number.isFinite(outputPerMillion) || outputPerMillion < 0) {
    return null
  }
  return { inputPerMillion, outputPerMillion }
}

export function estimateCandidateCost(candidate, pricing = {}) {
  const normalized = normalizeUsage(candidate)
  const price = priceFor(candidate?.provider, pricing)
  if (!price) return { ...normalized, estimatedUsd: null, pricingConfigured: false }
  const estimatedUsd = (normalized.inputTokens / 1_000_000) * price.inputPerMillion
    + (normalized.outputTokens / 1_000_000) * price.outputPerMillion
  return { ...normalized, estimatedUsd: round(estimatedUsd, 6), pricingConfigured: true }
}

function storedCandidateErrors(stored, envelope, provider) {
  const errors = []
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return ['stored candidate missing or invalid']
  if (stored.provider !== provider) errors.push(`stored provider mismatch: ${stored.provider}`)
  if (stored.status !== 'candidate') errors.push(`stored status must be candidate: ${stored.status}`)
  if (stored.strong !== envelope.strong) errors.push(`stored Strong mismatch: ${stored.strong}`)
  if (stored.sourceFingerprint !== envelope.sourceFingerprint) errors.push('stored sourceFingerprint mismatch')
  if (stored.blindGroupId !== envelope.blindGroupId) errors.push('stored blindGroupId mismatch')
  if (stored.governance?.blindCandidate !== true) errors.push('blindCandidate governance missing')
  if (stored.governance?.otherProviderOutputIncluded !== false) errors.push('cross-provider input boundary violated')
  if (stored.governance?.productionWriteAllowed !== false) errors.push('productionWriteAllowed must remain false')
  if (stored.governance?.finalApprovalAllowed !== false) errors.push('finalApprovalAllowed must remain false')
  const payloadValidation = validateCandidate(stored.payload, envelope)
  errors.push(...payloadValidation.errors)
  return errors
}

function riskFlags(candidate) {
  return new Set((candidate?.payload?.nodes || []).flatMap((node) => Array.isArray(node.riskFlags) ? node.riskFlags : []))
}

function evaluateRiskCoverage(strong, candidates) {
  const expected = EXPECTED_RISK_FLAGS[strong] || []
  const byProvider = Object.fromEntries(PROVIDER_ORDER.map((provider) => [provider, [...riskFlags(candidates[provider])].sort()]))
  const combined = new Set(Object.values(byProvider).flat())
  const missing = expected.filter((flag) => !combined.has(flag))
  return { expected, byProvider, combined: [...combined].sort(), missing }
}

function confidenceMetrics(candidates) {
  const byProvider = {}
  const all = []
  for (const provider of PROVIDER_ORDER) {
    const values = (candidates[provider]?.payload?.nodes || []).map((node) => Number(node.confidence)).filter(Number.isFinite)
    all.push(...values)
    byProvider[provider] = {
      average: round(average(values)),
      minimum: values.length ? round(Math.min(...values)) : 0,
      lowCount: values.filter((value) => value < 0.65).length,
      nodeCount: values.length,
    }
  }
  return {
    byProvider,
    average: round(average(all)),
    minimum: all.length ? round(Math.min(...all)) : 0,
    lowCount: all.filter((value) => value < 0.65).length,
    nodeCount: all.length,
    lowRate: all.length ? round(all.filter((value) => value < 0.65).length / all.length) : 1,
  }
}

function agreementMetrics(candidates) {
  const nvidia = candidates.nvidia?.payload
  const openai = candidates.openai?.payload
  const nodes = []
  const nodeCount = Math.min(nvidia?.nodes?.length || 0, openai?.nodes?.length || 0)
  for (let index = 0; index < nodeCount; index += 1) {
    const left = nvidia.nodes[index]
    const right = openai.nodes[index]
    nodes.push({
      sourceNodeId: left.sourceNodeId,
      score: lexicalAgreement(left.textKo, right.textKo),
      exact: normalizeKorean(left.textKo) === normalizeKorean(right.textKo),
    })
  }
  const scores = nodes.map((node) => node.score)
  return {
    primaryGloss: lexicalAgreement(nvidia?.primaryGlossKo, openai?.primaryGlossKo),
    transliteration: lexicalAgreement(nvidia?.transliterationKo, openai?.transliterationKo),
    nodeAverage: round(average(scores)),
    nodeMinimum: scores.length ? round(Math.min(...scores)) : 0,
    exactNodeCount: nodes.filter((node) => node.exact).length,
    comparedNodeCount: nodes.length,
    lowAgreementNodeCount: nodes.filter((node) => node.score < 0.25).length,
    nodes,
    interpretation: 'lexical-form heuristic only; semantic agreement still requires human review',
  }
}

export function evaluateCanaryPair({ canaryItem, sourcePacket, candidates, pricing = {} }) {
  const errors = []
  const structural = {}
  for (const provider of PROVIDER_ORDER) {
    const envelope = createJobEnvelope(sourcePacket, provider)
    const providerErrors = storedCandidateErrors(candidates[provider], envelope, provider)
    structural[provider] = { passed: providerErrors.length === 0, errors: providerErrors }
    errors.push(...providerErrors.map((error) => `${provider}: ${error}`))
  }
  const agreement = agreementMetrics(candidates)
  const confidence = confidenceMetrics(candidates)
  const riskCoverage = evaluateRiskCoverage(canaryItem.strong, candidates)
  const usage = Object.fromEntries(PROVIDER_ORDER.map((provider) => [provider, estimateCandidateCost(candidates[provider], pricing)]))
  const warnings = []
  if (agreement.nodeAverage < 0.35) warnings.push('provider lexical agreement below 0.35')
  if (agreement.lowAgreementNodeCount > Math.max(1, Math.floor(agreement.comparedNodeCount * 0.25))) warnings.push('too many low-agreement nodes')
  if (confidence.average < 0.7) warnings.push('average confidence below 0.70')
  if (confidence.lowRate > 0.25) warnings.push('low-confidence node rate above 25%')
  if (riskCoverage.missing.length) warnings.push(`expected risk flags missing: ${riskCoverage.missing.join(', ')}`)

  let status = 'technical-pass'
  if (errors.length) status = 'blocked'
  else if (warnings.length) status = 'manual-review-high'
  else status = 'manual-review-required'

  return {
    strong: canaryItem.strong,
    role: canaryItem.role,
    sourceNodeCount: sourcePacket.sourceNodes.length,
    sourceFingerprint: canaryItem.sourceFingerprint,
    status,
    structural,
    agreement,
    confidence,
    riskCoverage,
    usage,
    errors,
    warnings,
    governance: {
      automaticApprovalAllowed: false,
      productionWriteAllowed: false,
      theologicalReviewRequired: ['H430', 'H7307'].includes(canaryItem.strong),
    },
  }
}

function aggregateUsage(pairReports) {
  const byProvider = {}
  for (const provider of PROVIDER_ORDER) {
    const entries = pairReports.map((report) => report.usage[provider])
    const configuredCosts = entries.map((entry) => entry.estimatedUsd).filter((value) => value !== null)
    byProvider[provider] = {
      inputTokens: entries.reduce((sum, entry) => sum + entry.inputTokens, 0),
      outputTokens: entries.reduce((sum, entry) => sum + entry.outputTokens, 0),
      totalTokens: entries.reduce((sum, entry) => sum + entry.totalTokens, 0),
      averageLatencyMs: round(average(entries.map((entry) => entry.latencyMs).filter((value) => value > 0)), 2),
      estimatedUsd: configuredCosts.length === entries.length ? round(configuredCosts.reduce((sum, value) => sum + value, 0), 6) : null,
      pricingConfigured: configuredCosts.length === entries.length,
    }
  }
  return byProvider
}

export function evaluateCanarySet({ canarySet, sourceSet, candidateByStrong, pricing = {} }) {
  const packets = new Map(sourceSet.packets.map((packet) => [packet.strong, packet]))
  const pairReports = []
  const missingCandidates = []
  for (const item of canarySet.items) {
    const sourcePacket = packets.get(item.strong)
    if (!sourcePacket) throw new Error(`${item.strong} source packet missing`)
    const candidates = candidateByStrong[item.strong] || {}
    for (const provider of PROVIDER_ORDER) if (!candidates[provider]) missingCandidates.push(`${item.strong}:${provider}`)
    if (PROVIDER_ORDER.some((provider) => !candidates[provider])) continue
    pairReports.push(evaluateCanaryPair({ canaryItem: item, sourcePacket, candidates, pricing }))
  }

  const blocked = pairReports.filter((report) => report.status === 'blocked')
  const warningCount = pairReports.reduce((sum, report) => sum + report.warnings.length, 0)
  const allPairsPresent = missingCandidates.length === 0 && pairReports.length === canarySet.items.length
  const technicalGatePassed = allPairsPresent && blocked.length === 0
  const averageAgreement = round(average(pairReports.map((report) => report.agreement.nodeAverage)))
  const averageConfidence = round(average(pairReports.map((report) => report.confidence.average)))
  const missingRiskFlags = pairReports.flatMap((report) => report.riskCoverage.missing.map((flag) => `${report.strong}:${flag}`))
  const qualityThresholdPassed = technicalGatePassed
    && averageAgreement >= 0.35
    && averageConfidence >= 0.7
    && pairReports.every((report) => report.confidence.lowRate <= 0.25)
    && missingRiskFlags.length === 0

  let status = 'blocked'
  if (qualityThresholdPassed) status = 'eligible-for-human-promotion-review'
  else if (technicalGatePassed) status = 'manual-canary-review-required'

  return {
    schemaVersion: 1,
    evaluationVersion: CANARY_EVALUATION_VERSION,
    canarySetId: canarySet.canarySetId,
    evaluatedAt: new Date().toISOString(),
    counts: {
      expectedPairs: canarySet.items.length,
      evaluatedPairs: pairReports.length,
      expectedCandidates: canarySet.items.length * PROVIDER_ORDER.length,
      presentCandidates: pairReports.length * PROVIDER_ORDER.length,
      blockedPairs: blocked.length,
      warnings: warningCount,
    },
    metrics: {
      averageLexicalAgreement: averageAgreement,
      averageConfidence,
      missingRiskFlags,
      usage: aggregateUsage(pairReports),
    },
    gates: {
      allPairsPresent,
      technicalGatePassed,
      qualityThresholdPassed,
      humanApprovalRequired: true,
      automaticPromotionAllowed: false,
      serviceWriteAllowed: false,
      finalApprovalAllowed: false,
    },
    promotion: {
      status,
      target: 'genesis-g2-calibration-100',
      reasons: [
        ...missingCandidates.map((item) => `missing candidate: ${item}`),
        ...blocked.map((report) => `${report.strong}: structural gate blocked`),
        ...(averageAgreement < 0.35 ? [`average lexical agreement ${averageAgreement} < 0.35`] : []),
        ...(averageConfidence < 0.7 ? [`average confidence ${averageConfidence} < 0.70`] : []),
        ...missingRiskFlags.map((item) => `missing expected risk flag: ${item}`),
        'human review and explicit promotion approval are always required',
      ],
    },
    missingCandidates,
    pairs: pairReports,
  }
}
