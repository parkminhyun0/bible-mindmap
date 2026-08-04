import {
  prioritizeAiCandidatesForHumanReview,
  scoreAiCandidateForHumanReview,
} from '../src/data/aiReviewPriority.js';

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const highRisk = {
  id: 'candidate:canonical-001',
  type: 'canonical-usage',
  status: 'candidate',
  verification: { passed: false, errors: ['missing source'], warnings: [] },
  reviewSignals: { usageFrequency: 5 },
};

const medium = {
  id: 'candidate:chapter-001',
  type: 'curated-chapter',
  status: 'verified',
  verification: { passed: true, errors: [], warnings: ['manual wording review'] },
  reviewSignals: { usageFrequency: 3, regressionRisk: 2 },
};

const low = {
  id: 'candidate:alias-001',
  type: 'search-alias',
  status: 'reviewed',
  verification: { passed: true, errors: [], warnings: [] },
  reviewSignals: { impact: 1, uncertainty: 1, usageFrequency: 1, regressionRisk: 1 },
};

const highResult = scoreAiCandidateForHumanReview(highRisk);
assert(highResult.tier === 'P0', 'high-risk canonical candidate must be P0');
assert(highResult.score >= 80, 'high-risk canonical candidate score must be >= 80');
assert(highResult.reasons.length >= 2, 'P0 candidate must expose human-readable reasons');

const ranked = prioritizeAiCandidatesForHumanReview([low, highRisk, medium]);
assert(ranked.length === 3, 'all candidates must be preserved');
assert(ranked[0].id === highRisk.id, 'highest-risk candidate must be first');
assert(ranked.at(-1).id === low.id, 'lowest-risk candidate must be last');
assert(ranked.every((item) => Number.isInteger(item.score) && item.score >= 0 && item.score <= 100), 'scores must be integer 0..100');
assert(ranked.every((item) => ['P0', 'P1', 'P2', 'P3'].includes(item.tier)), 'tiers must be valid');

let invalidRejected = false;
try { scoreAiCandidateForHumanReview(null); } catch { invalidRejected = true; }
assert(invalidRejected, 'invalid candidate input must throw');

if (errors.length) {
  console.error(`✗ AI human-review priority verification failed (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log(`✓ AI human-review priority verified · order ${ranked.map((item) => `${item.tier}:${item.id}`).join(' → ')}`);
