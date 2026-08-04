import { SHADOW_EVALUATION_CASES } from './ai/shadow/nvidia-shadow-evaluation-fixture.mjs';
import {
  generateKoreanEvaluationCandidates,
  KOREAN_QUERY_STYLES,
} from './ai/evaluation/korean-query-candidates.mjs';

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const result = generateKoreanEvaluationCandidates();
const normalized = result.candidates.map((item) => item.normalizedQuery);
const sourceIds = new Set(SHADOW_EVALUATION_CASES.map((item) => item.id));

assert(result.sourceCaseCount === 24, 'source evaluation case count must remain 24');
assert(result.candidateCount >= 48, 'at least two unique Korean variants per source case are required');
assert(result.candidateCount <= SHADOW_EVALUATION_CASES.length * KOREAN_QUERY_STYLES.length, 'candidate count exceeds style expansion boundary');
assert(new Set(normalized).size === normalized.length, 'normalized Korean candidate queries must be unique');
assert(result.requiresHumanApproval === true, 'human approval must remain required');
assert(result.writesEvaluationFixture === false, 'generator must not mutate the approved evaluation fixture');
assert(result.productionSearchConnected === false, 'generator must not connect to production search');

for (const candidate of result.candidates) {
  assert(sourceIds.has(candidate.sourceCaseId), `${candidate.id}: unknown sourceCaseId`);
  assert(KOREAN_QUERY_STYLES.includes(candidate.style), `${candidate.id}: unsupported style`);
  assert(candidate.labelStatus === 'proposed', `${candidate.id}: label must remain proposed`);
  assert(candidate.reviewStatus === 'pending-human-review', `${candidate.id}: review status must remain pending`);
  assert(candidate.autoApproved === false, `${candidate.id}: auto approval is forbidden`);
  assert(Array.isArray(candidate.proposedRelevantIds) && candidate.proposedRelevantIds.length > 0, `${candidate.id}: proposed relevant labels required`);
  assert(/[가-힣]/.test(candidate.query), `${candidate.id}: query must contain Korean text`);
}

const badCases = [{
  id: 'duplicate',
  query: '같은 질문',
  relevantIds: ['canonical.seed'],
  hardNegativeIds: [],
  metadata: { queryType: 'direct' },
}];
const deduped = generateKoreanEvaluationCandidates({ cases: badCases, styles: ['short-search', 'question'] });
assert(deduped.candidateCount === 1, 'source-equivalent short query must be removed by deduplication');

if (errors.length) {
  console.error(`✗ Korean evaluation query candidate verification failed (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log(`✓ Korean evaluation query candidates verified · source ${result.sourceCaseCount} · candidates ${result.candidateCount} · human review required`);
