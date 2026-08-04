import { buildShadowQueryComparison, renderShadowQueryComparisonMarkdown } from './ai/shadow/build-shadow-query-report.mjs';

const makeRow = ({ id, recall, mrr, ndcg, hardNegativeRate = 0, latencyMs = 1 }) => ({
  caseId: id,
  query: `query ${id}`,
  metadata: { queryType: id === 'q1' ? 'semantic' : 'direct' },
  resultIds: [id],
  recall,
  reciprocalRank: mrr,
  ndcg,
  hardNegativeRate,
  latencyMs,
});

const artifact = {
  stage: 'P1-2c',
  generatedAt: '2026-08-04T00:00:00.000Z',
  productionIndexModified: false,
  liveSearchConnected: false,
  evaluation: {
    baseline: { rows: [
      makeRow({ id: 'q1', recall: 0.5, mrr: 0.5, ndcg: 0.5 }),
      makeRow({ id: 'q2', recall: 1, mrr: 1, ndcg: 1 }),
    ] },
    candidate: { rows: [
      makeRow({ id: 'q1', recall: 1, mrr: 1, ndcg: 1 }),
      makeRow({ id: 'q2', recall: 0.5, mrr: 0.5, ndcg: 0.5, hardNegativeRate: 0.5 }),
    ] },
  },
};

const report = buildShadowQueryComparison(artifact);
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

assert(report.shadowOnly === true, 'report must remain shadow-only');
assert(report.productionIndexModified === false, 'report must not modify production index');
assert(report.liveSearchConnected === false, 'report must not connect live search');
assert(report.queryCount === 2, 'query count mismatch');
assert(report.summary.improved === 1, 'improved count mismatch');
assert(report.summary.regressed === 1, 'regressed count mismatch');
assert(report.summary.requiresHumanReview === 1, 'human review count mismatch');
assert(report.rows[0].outcome === 'improved', 'q1 must improve');
assert(report.rows[1].outcome === 'regressed', 'q2 must regress');
assert(report.rows[1].requiresHumanReview === true, 'regression must require human review');
const markdown = renderShadowQueryComparisonMarkdown(report);
assert(markdown.includes('공개 검색 결과 변경: 없음'), 'markdown safety boundary missing');
assert(markdown.includes('query q2'), 'markdown query row missing');

try {
  buildShadowQueryComparison({ ...artifact, liveSearchConnected: true });
  errors.push('production-connected artifact must be rejected');
} catch (error) {
  assert(/refuses production-connected/.test(error.message), 'unexpected production boundary error');
}

if (errors.length) {
  console.error(`✗ Shadow query report verification failed (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log('✓ Shadow query report verified · per-query comparison · human review routing · no live activation');
