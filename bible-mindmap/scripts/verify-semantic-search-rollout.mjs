import { SEMANTIC_SEARCH_ROLLOUT, shouldUseSemanticCandidate } from '../src/config/semanticSearchRollout.js';

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

assert(SEMANTIC_SEARCH_ROLLOUT.approved === true, 'rollout approval must be explicit');
assert(SEMANTIC_SEARCH_ROLLOUT.mode === 'canary', 'initial rollout must remain canary');
assert(SEMANTIC_SEARCH_ROLLOUT.candidatePipeline === 'nvidia-hybrid-2048', 'approved candidate pipeline changed');
assert(SEMANTIC_SEARCH_ROLLOUT.fallbackPipeline === 'keyword-existing', 'existing keyword fallback is required');
assert(SEMANTIC_SEARCH_ROLLOUT.canaryPercent > 0 && SEMANTIC_SEARCH_ROLLOUT.canaryPercent <= 5, 'initial canary must not exceed 5%');
assert(SEMANTIC_SEARCH_ROLLOUT.writeToProductionDb === false, 'search rollout must not write to production DB');
assert(SEMANTIC_SEARCH_ROLLOUT.browserApiKeyAllowed === false, 'browser API key exposure is forbidden');
assert(SEMANTIC_SEARCH_ROLLOUT.requireServerSideProvider === true, 'server-side provider boundary is required');
assert(SEMANTIC_SEARCH_ROLLOUT.requireHumanApprovalForCanonicalWrites === true, 'canonical writes require human approval');
assert(SEMANTIC_SEARCH_ROLLOUT.limits.maxP95LatencyMs <= 1200, 'p95 latency ceiling must be 1200ms or less');
assert(SEMANTIC_SEARCH_ROLLOUT.limits.maxFailureRate <= 0.02, 'failure-rate ceiling must be 2% or less');
assert(SEMANTIC_SEARCH_ROLLOUT.fallbackOn.includes('provider-error'), 'provider error fallback required');
assert(SEMANTIC_SEARCH_ROLLOUT.fallbackOn.includes('timeout'), 'timeout fallback required');
assert(SEMANTIC_SEARCH_ROLLOUT.fallbackOn.includes('quality-gate-failed'), 'quality fallback required');

const healthy = { ready: true, qualityGatePassed: true, p95LatencyMs: 700, failureRate: 0 };
assert(shouldUseSemanticCandidate({ bucket: 0, health: healthy }) === true, 'healthy canary bucket must use candidate');
assert(shouldUseSemanticCandidate({ bucket: 5, health: healthy }) === false, 'non-canary bucket must use fallback');
assert(shouldUseSemanticCandidate({ bucket: 0, health: { ...healthy, qualityGatePassed: false } }) === false, 'failed quality gate must use fallback');
assert(shouldUseSemanticCandidate({ bucket: 0, health: { ...healthy, p95LatencyMs: 1300 } }) === false, 'latency breach must use fallback');
assert(shouldUseSemanticCandidate({ bucket: 0, health: { ...healthy, failureRate: 0.03 } }) === false, 'failure-rate breach must use fallback');

if (errors.length) {
  console.error(`✗ semantic search rollout verification failed (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log(`✓ semantic search rollout verified · mode ${SEMANTIC_SEARCH_ROLLOUT.mode} · canary ${SEMANTIC_SEARCH_ROLLOUT.canaryPercent}% · fallback ${SEMANTIC_SEARCH_ROLLOUT.fallbackPipeline}`);
