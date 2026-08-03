import { buildHybridIndex, searchHybridIndex } from './ai/retrieval/hybrid-search.mjs';
import { assertRetrievalQuality, evaluateRetriever, scoreRanking } from './ai/retrieval/retrieval-evaluation.mjs';

const errors = [];
const assert = (condition, message) => {
  if (!condition) errors.push(message);
};
const expectThrow = (fn, pattern, message) => {
  try {
    fn();
    errors.push(message);
  } catch (error) {
    if (pattern && !pattern.test(String(error?.message))) errors.push(`${message}: unexpected error ${error?.message}`);
  }
};

const documents = [
  {
    id: 'canonical.seed',
    title: '아브라함의 씨와 약속',
    text: '아브라함에게 주신 언약의 약속과 후손은 그리스도 안에서 성취된다.',
    sourceRefs: ['Gen 12:1-3', 'Gen 17:7', 'Gal 3:16'],
  },
  {
    id: 'canonical.king',
    title: '다윗 언약과 메시아 왕권',
    text: '다윗의 보좌와 영원한 왕의 통치는 예수 그리스도의 왕권으로 완성된다.',
    sourceRefs: ['2Sam 7:12-16', 'Ps 2:6-12', 'Luke 1:32-33'],
  },
  {
    id: 'canonical.temple',
    title: '성막과 성전에서 새 창조의 임재로',
    text: '성막과 성전에 거하신 하나님의 임재가 그리스도와 교회와 새 예루살렘에서 완성된다.',
    sourceRefs: ['Exod 40:34-38', 'John 1:14', 'Rev 21:22-23'],
  },
  {
    id: 'canonical.exodus',
    title: '출애굽과 구속',
    text: '유월절과 바다를 통한 구원이 그리스도의 구속과 새 출애굽으로 발전한다.',
    sourceRefs: ['Exod 12:1-32', 'Luke 9:31', '1Cor 5:7'],
  },
];

const documentVectors = [
  [1, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0, 0],
];
const queryVectors = {
  seed: [1, 0, 0, 0, 0, 0, 0, 0],
  king: [0, 1, 0, 0, 0, 0, 0, 0],
  temple: [0, 0, 1, 0, 0, 0, 0, 0],
  exodus: [0, 0, 0, 1, 0, 0, 0, 0],
};
const cases = [
  { id: 'seed', query: '아브라함의 약속과 후손이 그리스도에게 이어지는 흐름', relevantIds: ['canonical.seed'] },
  { id: 'king', query: '다윗의 보좌와 영원한 메시아 왕', relevantIds: ['canonical.king'] },
  { id: 'temple', query: '성막 성전 교회 새 예루살렘 하나님의 임재', relevantIds: ['canonical.temple'] },
  { id: 'exodus', query: '유월절과 새 출애굽의 구속', relevantIds: ['canonical.exodus'] },
];

const index = buildHybridIndex({
  documents,
  embeddingResult: {
    provider: 'fixture',
    model: 'fixture-v1',
    task: 'document',
    dimension: 8,
    vectors: documentVectors,
  },
});

const queryEmbedding = (caseId) => ({
  provider: 'fixture',
  model: 'fixture-v1',
  task: 'query',
  dimension: 8,
  vectors: [queryVectors[caseId]],
});

let clock = 0;
const now = () => {
  clock += 2;
  return clock;
};
const retrieve = (vectorWeight) => async ({ query, topK, caseId }) => searchHybridIndex({
  query,
  index,
  queryEmbedding: queryEmbedding(caseId),
  topK,
  keywordWeight: 1,
  vectorWeight,
});

const baseline = await evaluateRetriever({ name: 'keyword-baseline', cases, retrieve: retrieve(0), k: 3, now });
const candidate = await evaluateRetriever({ name: 'hybrid-rrf', cases, retrieve: retrieve(1), k: 3, now });
const gate = assertRetrievalQuality({
  baseline,
  candidate,
  thresholds: {
    minRecallAtK: 1,
    minMrr: 1,
    minNdcgAtK: 1,
    maxFailureRate: 0,
    maxP95LatencyMs: 10,
    allowedRegression: 0,
  },
});

assert(gate.passed === true, 'quality gate must pass the approved fixture');
assert(candidate.caseCount === 4, 'all evaluation cases must be included');
assert(candidate.recallAtK === 1, 'fixture Recall@3 must equal 1');
assert(candidate.mrr === 1, 'fixture MRR must equal 1');
assert(candidate.ndcgAtK === 1, 'fixture nDCG@3 must equal 1');
assert(candidate.failureRate === 0, 'fixture failure rate must equal 0');
assert(candidate.rows.every((row) => row.relevantIds.includes(row.resultIds[0])), 'each relevant document must rank first');

const multiRelevant = scoreRanking(['a', 'x', 'b'], ['a', 'b'], 3);
assert(multiRelevant.recall === 1, 'multi-relevant Recall@K must count all relevant documents');
assert(multiRelevant.reciprocalRank === 1, 'reciprocal rank must use the first relevant result');
assert(multiRelevant.ndcg > 0 && multiRelevant.ndcg <= 1, 'nDCG must stay in the 0..1 interval');

expectThrow(
  () => assertRetrievalQuality({
    baseline: candidate,
    candidate: { ...candidate, recallAtK: 0.5 },
    thresholds: { minRecallAtK: 0.5, minMrr: 0, minNdcgAtK: 0, maxFailureRate: 1, maxP95LatencyMs: 100, allowedRegression: 0 },
  }),
  /regressed below baseline/,
  'quality gate must reject a regression below baseline',
);

if (errors.length) {
  console.error(`✗ retrieval evaluation verifier failed (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log(
  `✓ retrieval evaluation baseline verified · cases ${candidate.caseCount} · Recall@3 ${candidate.recallAtK.toFixed(2)} · MRR ${candidate.mrr.toFixed(2)} · nDCG@3 ${candidate.ndcgAtK.toFixed(2)} · failure ${(candidate.failureRate * 100).toFixed(0)}%`,
);
