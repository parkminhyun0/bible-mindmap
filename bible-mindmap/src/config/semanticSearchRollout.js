// M6 AI·의미 검색 production 승격 정책.
// 사용자 승인 이후에도 기존 검색을 기본 fallback으로 유지하며,
// 품질·지연·오류 게이트를 통과한 요청에만 NVIDIA Hybrid 후보를 사용한다.

export const SEMANTIC_SEARCH_ROLLOUT = Object.freeze({
  schemaVersion: 1,
  approved: true,
  approvedAt: '2026-08-04',
  mode: 'canary',
  candidatePipeline: 'nvidia-hybrid-2048',
  fallbackPipeline: 'keyword-existing',
  canaryPercent: 5,
  shadowComparisonEnabled: true,
  writeToProductionDb: false,
  browserApiKeyAllowed: false,
  requireServerSideProvider: true,
  requireHumanApprovalForCanonicalWrites: true,
  limits: Object.freeze({
    timeoutMs: 1800,
    maxP95LatencyMs: 1200,
    maxFailureRate: 0.02,
    minRecallAt3: 0.8,
    minMrr: 0.75,
    minNdcgAt3: 0.78,
    maxHardNegativeRate: 0.35,
  }),
  fallbackOn: Object.freeze([
    'provider-error',
    'timeout',
    'quality-gate-failed',
    'dimension-mismatch',
    'missing-server-credential',
  ]),
});

export function shouldUseSemanticCandidate({ bucket, health }) {
  if (!SEMANTIC_SEARCH_ROLLOUT.approved) return false;
  if (SEMANTIC_SEARCH_ROLLOUT.mode !== 'canary') return false;
  if (!Number.isInteger(bucket) || bucket < 0 || bucket > 99) return false;
  if (!health || health.ready !== true || health.qualityGatePassed !== true) return false;
  if (health.p95LatencyMs > SEMANTIC_SEARCH_ROLLOUT.limits.maxP95LatencyMs) return false;
  if (health.failureRate > SEMANTIC_SEARCH_ROLLOUT.limits.maxFailureRate) return false;
  return bucket < SEMANTIC_SEARCH_ROLLOUT.canaryPercent;
}
