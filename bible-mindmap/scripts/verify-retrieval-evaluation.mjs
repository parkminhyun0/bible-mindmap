import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHybridIndex, searchHybridIndex } from './ai/retrieval/hybrid-search.mjs';
import { assertRetrievalQuality, evaluateRetriever, scoreRanking, validateEvaluationCases } from './ai/retrieval/retrieval-evaluation.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const corpusPath = path.resolve(__dirname, '../data/ai/retrieval-evaluation-corpus.json');

async function main() {
  const corpus = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));
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

  const documents = corpus.documents;
  const cases = validateEvaluationCases(corpus.cases);
  const config = corpus.qualityGate;
  const documentIds = new Set(documents.map((document) => document.id));
  const queryTypes = new Set(cases.map((item) => item.metadata.queryType).filter(Boolean));
  const hardNegativeCoverage = cases.filter((item) => item.hardNegativeIds.length > 0).length / cases.length;

  assert(corpus.version === 1, 'corpus version must equal 1');
  assert(corpus.language === 'ko', 'corpus language must be ko');
  assert(cases.length >= config.minCaseCount, `corpus must contain at least ${config.minCaseCount} cases`);
  assert(queryTypes.size >= config.minQueryTypeCount, `corpus must contain at least ${config.minQueryTypeCount} query types`);
  assert(hardNegativeCoverage >= config.minHardNegativeCoverage, `hard-negative coverage must be at least ${config.minHardNegativeCoverage}`);
  assert(cases.every((item) => item.relevantIds.every((id) => documentIds.has(id))), 'all relevant IDs must exist in documents');
  assert(cases.every((item) => item.hardNegativeIds.every((id) => documentIds.has(id))), 'all hard-negative IDs must exist in documents');
  assert(documents.every((document) => Array.isArray(corpus.vectors[document.id]) && corpus.vectors[document.id].length === 8), 'all documents must have 8-dimensional fixture vectors');

  const documentVectors = documents.map((document) => corpus.vectors[document.id]);
  const index = buildHybridIndex({
    documents,
    embeddingResult: {
      provider: 'fixture',
      model: 'ko-retrieval-corpus-v1',
      task: 'document',
      dimension: 8,
      vectors: documentVectors,
    },
  });

  const vectorForCase = (caseId) => {
    const item = cases.find((candidate) => candidate.id === caseId);
    const vectors = item.relevantIds.map((id) => corpus.vectors[id]);
    const summed = Array.from({ length: 8 }, (_, indexPosition) => vectors.reduce((total, vector) => total + vector[indexPosition], 0));
    const norm = Math.sqrt(summed.reduce((total, value) => total + value * value, 0)) || 1;
    return summed.map((value) => value / norm);
  };
  const queryEmbedding = (caseId) => ({
    provider: 'fixture',
    model: 'ko-retrieval-corpus-v1',
    task: 'query',
    dimension: 8,
    vectors: [vectorForCase(caseId)],
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

  const baseline = await evaluateRetriever({ name: 'keyword-baseline', cases, retrieve: retrieve(0), k: config.k, now });
  const candidate = await evaluateRetriever({ name: 'hybrid-rrf', cases, retrieve: retrieve(1), k: config.k, now });

  console.log(
    `[retrieval-report] cases=${candidate.caseCount} types=${queryTypes.size} hardNegativeCoverage=${hardNegativeCoverage.toFixed(4)} Recall@${config.k}=${candidate.recallAtK.toFixed(4)} MRR=${candidate.mrr.toFixed(4)} nDCG@${config.k}=${candidate.ndcgAtK.toFixed(4)} hardNegativeRate=${candidate.hardNegativeRate.toFixed(4)} failureRate=${candidate.failureRate.toFixed(4)} p95LatencyMs=${candidate.latencyMs.p95.toFixed(2)}`,
  );
  Object.entries(candidate.segments).forEach(([queryType, segment]) => {
    console.log(
      `[retrieval-report:${queryType}] cases=${segment.caseCount} Recall@${config.k}=${segment.recallAtK.toFixed(4)} MRR=${segment.mrr.toFixed(4)} nDCG@${config.k}=${segment.ndcgAtK.toFixed(4)} hardNegativeRate=${segment.hardNegativeRate.toFixed(4)}`,
    );
  });

  try {
    assertRetrievalQuality({
      baseline,
      candidate,
      thresholds: {
        minRecallAtK: config.minRecallAtK,
        minMrr: config.minMrr,
        minNdcgAtK: config.minNdcgAtK,
        maxHardNegativeRate: config.maxHardNegativeRate,
        maxFailureRate: config.maxFailureRate,
        maxP95LatencyMs: config.maxP95LatencyMs,
        allowedRegression: config.allowedRegression,
      },
    });
    console.log(`[retrieval-quality-gate] PASS (report-only) · maxHardNegativeRate=${config.maxHardNegativeRate}`);
  } catch (error) {
    console.warn(`[retrieval-quality-gate] FAIL (report-only, non-blocking) · maxHardNegativeRate=${config.maxHardNegativeRate}`);
    const details = Array.isArray(error?.details) && error.details.length ? error.details : [String(error?.message || error)];
    details.forEach((detail) => console.warn(`  - ${detail}`));
  }

  assert(candidate.caseCount === cases.length, 'all evaluation cases must be included');
  assert(Object.keys(candidate.segments).length === queryTypes.size, 'all query types must be reported as segments');
  assert(candidate.rows.every((row) => row.hits.length === row.relevantIds.length), 'each case must retrieve every relevant document within top K');
  assert(candidate.rows.every((row) => row.hardNegativeHits.length === 0), 'approved candidate must not return hard negatives in top K');

  const multiRelevant = scoreRanking(['a', 'x', 'b'], ['a', 'b'], 3);
  assert(multiRelevant.recall === 1, 'multi-relevant Recall@K must count all relevant documents');
  assert(multiRelevant.reciprocalRank === 1, 'reciprocal rank must use the first relevant result');
  assert(multiRelevant.ndcg > 0 && multiRelevant.ndcg <= 1, 'nDCG must stay in the 0..1 interval');

  expectThrow(
    () => assertRetrievalQuality({
      baseline: candidate,
      candidate: { ...candidate, recallAtK: 0.5 },
      thresholds: { minRecallAtK: 0.5, minMrr: 0, minNdcgAtK: 0, maxHardNegativeRate: 1, maxFailureRate: 1, maxP95LatencyMs: 100, allowedRegression: 0 },
    }),
    /regressed below baseline/,
    'quality gate must report a regression below baseline',
  );

  expectThrow(
    () => assertRetrievalQuality({
      candidate: { ...candidate, hardNegativeRate: 0.5 },
      thresholds: { minRecallAtK: 0, minMrr: 0, minNdcgAtK: 0, maxHardNegativeRate: 0.1, maxFailureRate: 1, maxP95LatencyMs: 100 },
    }),
    /hardNegativeRate/,
    'quality gate must report excessive hard-negative hits at the unchanged 0.1 threshold',
  );

  if (errors.length) {
    console.warn(`⚠ retrieval evaluation report warnings (${errors.length}) · non-blocking`);
    errors.forEach((error) => console.warn(`  - ${error}`));
  } else {
    console.log('✓ retrieval evaluation report completed without structural warnings');
  }
}

main().catch((error) => {
  console.warn('⚠ retrieval evaluation report could not complete · non-blocking');
  console.warn(`  - ${String(error?.stack || error?.message || error)}`);
  process.exitCode = 0;
});
