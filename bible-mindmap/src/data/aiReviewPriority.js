const SCORE_MIN = 0;
const SCORE_MAX = 5;

const STATUS_URGENCY = Object.freeze({
  candidate: 5,
  generated: 5,
  verified: 3,
  reviewed: 1,
  approved: 0,
  rejected: 0,
});

const TYPE_IMPACT = Object.freeze({
  'canonical-concept': 5,
  'canonical-usage': 5,
  'context-arc': 5,
  'original-language': 5,
  'person-relation': 4,
  'place-relation': 4,
  'period-relation': 4,
  'curated-chapter': 3,
  'search-alias': 3,
});

function clamp(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, number));
}

function normalizeWeights(weights = {}) {
  return Object.freeze({
    impact: clamp(weights.impact ?? 0.35),
    uncertainty: clamp(weights.uncertainty ?? 0.3),
    frequency: clamp(weights.frequency ?? 0.15),
    regressionRisk: clamp(weights.regressionRisk ?? 0.2),
  });
}

function inferImpact(candidate) {
  return TYPE_IMPACT[candidate?.type] ?? 2;
}

function inferUncertainty(candidate) {
  const verification = candidate?.verification ?? {};
  const errors = Array.isArray(verification.errors) ? verification.errors.length : 0;
  const warnings = Array.isArray(verification.warnings) ? verification.warnings.length : 0;
  if (verification.passed === false && errors > 0) return 5;
  if (verification.passed === false) return 4;
  if (warnings >= 3) return 4;
  if (warnings > 0) return 3;
  return STATUS_URGENCY[candidate?.status] ?? 2;
}

function inferFrequency(candidate) {
  const value = candidate?.reviewSignals?.usageFrequency;
  return value == null ? 2 : clamp(value);
}

function inferRegressionRisk(candidate) {
  const explicit = candidate?.reviewSignals?.regressionRisk;
  if (explicit != null) return clamp(explicit);
  if (['canonical-concept', 'canonical-usage', 'context-arc', 'original-language'].includes(candidate?.type)) return 5;
  return 3;
}

export function scoreAiCandidateForHumanReview(candidate, options = {}) {
  if (!candidate || typeof candidate !== 'object') {
    throw new TypeError('candidate must be an object');
  }

  const weights = normalizeWeights(options.weights);
  const signals = Object.freeze({
    impact: clamp(candidate.reviewSignals?.impact ?? inferImpact(candidate)),
    uncertainty: clamp(candidate.reviewSignals?.uncertainty ?? inferUncertainty(candidate)),
    frequency: inferFrequency(candidate),
    regressionRisk: inferRegressionRisk(candidate),
  });

  const weightedTotal =
    signals.impact * weights.impact +
    signals.uncertainty * weights.uncertainty +
    signals.frequency * weights.frequency +
    signals.regressionRisk * weights.regressionRisk;

  const score = Math.round((weightedTotal / SCORE_MAX) * 100);
  const tier = score >= 80 ? 'P0' : score >= 60 ? 'P1' : score >= 40 ? 'P2' : 'P3';

  const reasons = [];
  if (signals.impact >= 4) reasons.push('정경·원어·관계 데이터에 미치는 영향이 큼');
  if (signals.uncertainty >= 4) reasons.push('검증 실패 또는 불확실성이 높음');
  if (signals.frequency >= 4) reasons.push('사용 빈도가 높은 기능에 노출됨');
  if (signals.regressionRisk >= 4) reasons.push('잘못 반영될 경우 회귀 위험이 큼');
  if (!reasons.length) reasons.push('일반 검토 순서에 따라 확인 가능');

  return Object.freeze({
    id: candidate.id,
    type: candidate.type,
    status: candidate.status,
    score,
    tier,
    signals,
    reasons: Object.freeze(reasons),
  });
}

export function prioritizeAiCandidatesForHumanReview(candidates, options = {}) {
  if (!Array.isArray(candidates)) throw new TypeError('candidates must be an array');
  return candidates
    .map((candidate) => scoreAiCandidateForHumanReview(candidate, options))
    .sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)));
}
