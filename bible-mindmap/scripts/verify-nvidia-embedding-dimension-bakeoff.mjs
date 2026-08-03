import { compareNvidiaEmbeddingDimensions } from './ai/poc/compare-nvidia-embedding-dimensions.mjs';

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const makeReport = ({ dimension, recallAtK = 1, mrr = 1, ndcgAtK = 1, failureRate = 0, p95 = 1 }) => ({
  schemaVersion: 2,
  embedding: {
    provider: 'nvidia',
    model: 'nvidia/llama-nemotron-embed-1b-v2',
    requestedDimensions: dimension,
    dimension,
    documentUsage: { total_tokens: 167 },
    queryUsage: { total_tokens: 72 },
  },
  corpus: {
    count: 4,
    ids: ['canonical.seed', 'canonical.king', 'canonical.temple', 'canonical.exodus'],
    sourceRefs: 12,
  },
  candidate: {
    recallAtK,
    mrr,
    ndcgAtK,
    failureRate,
    latencyMs: { p95 },
  },
  gate: { passed: true },
  existingDbModified: false,
});

const equalQuality = compareNvidiaEmbeddingDimensions([
  makeReport({ dimension: 2048, p95: 1.2 }),
  makeReport({ dimension: 384, p95: 1.5 }),
], { generatedAt: '2026-08-03T00:00:00.000Z' });

assert(equalQuality.recommendation.selectedDimensions === 384, 'equal retrieval quality must prefer 384 dimensions');
assert(equalQuality.recommendation.requiresHumanApproval === true, 'dimension recommendation must require human approval');
assert(equalQuality.recommendation.changesProductionIndex === false, 'comparison must not mutate the production index');
assert(equalQuality.comparison.storageReductionPercent === 81.25, '384 dimensions must record 81.25% float32 storage reduction');
assert(equalQuality.results.find((item) => item.dimensions === 384)?.bytesPerVector === 1536, '384 vector byte estimate must use float32');
assert(equalQuality.results.find((item) => item.dimensions === 2048)?.bytesPerVector === 8192, '2048 vector byte estimate must use float32');
assert(equalQuality.results.every((item) => item.totalTokens === 239), 'token usage must be preserved per run');

const regressed = compareNvidiaEmbeddingDimensions([
  makeReport({ dimension: 2048 }),
  makeReport({ dimension: 384, recallAtK: 0.75 }),
]);
assert(regressed.recommendation.selectedDimensions === 2048, 'quality regression must retain 2048 dimensions');
assert(regressed.recommendation.status === 'retain-full', 'quality regression status must be retain-full');

try {
  compareNvidiaEmbeddingDimensions([
    makeReport({ dimension: 2048 }),
    { ...makeReport({ dimension: 384 }), embedding: { ...makeReport({ dimension: 384 }).embedding, model: 'nvidia/other-model' } },
  ]);
  errors.push('mismatched models must be rejected');
} catch {
  // Expected.
}

try {
  compareNvidiaEmbeddingDimensions([makeReport({ dimension: 2048 })]);
  errors.push('missing dimension report must be rejected');
} catch {
  // Expected.
}

if (errors.length) {
  console.error(`✗ NVIDIA embedding dimension bake-off verification failed (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log(`✓ NVIDIA embedding dimension bake-off verified · selected ${equalQuality.recommendation.selectedDimensions} · storage reduction ${equalQuality.comparison.storageReductionPercent}%`);
