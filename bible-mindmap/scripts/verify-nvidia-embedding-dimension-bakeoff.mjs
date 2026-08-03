import fs from 'node:fs';
import path from 'node:path';
import { compareNvidiaEmbeddingDimensions } from './ai/poc/compare-nvidia-embedding-dimensions.mjs';
import { NVIDIA_POC_EVALUATION_REVISION, POC_DOCUMENTS, POC_CASES } from './ai/poc/nvidia-embedding-evaluation-fixture.mjs';

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const makeReport = ({
  dimension,
  recallAtK = 1,
  mrr = 1,
  ndcgAtK = 1,
  hardNegativeRate = 0,
  failureRate = 0,
  p95 = 1,
} = {}) => ({
  schemaVersion: 3,
  evaluationRevision: NVIDIA_POC_EVALUATION_REVISION,
  embedding: {
    provider: 'nvidia',
    model: 'nvidia/llama-nemotron-embed-1b-v2',
    requestedDimensions: dimension,
    dimension,
    documentUsage: { total_tokens: 300 },
    queryUsage: { total_tokens: 180 },
  },
  corpus: {
    revision: NVIDIA_POC_EVALUATION_REVISION,
    count: POC_DOCUMENTS.length,
    ids: POC_DOCUMENTS.map((item) => item.id),
    sourceRefs: POC_DOCUMENTS.reduce((sum, item) => sum + item.sourceRefs.length, 0),
    caseCount: POC_CASES.length,
    hardNegativeCount: POC_CASES.reduce((sum, item) => sum + item.hardNegativeIds.length, 0),
    queryTypes: [...new Set(POC_CASES.map((item) => item.metadata.queryType))],
  },
  candidate: {
    recallAtK,
    mrr,
    ndcgAtK,
    hardNegativeRate,
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

assert(equalQuality.schemaVersion === 2, 'comparison must use hard-negative-aware schema');
assert(equalQuality.recommendation.selectedDimensions === 384, 'equal retrieval quality must prefer 384 dimensions');
assert(equalQuality.recommendation.requiresHumanApproval === true, 'dimension recommendation must require human approval');
assert(equalQuality.recommendation.changesProductionIndex === false, 'comparison must not mutate the production index');
assert(equalQuality.comparison.storageReductionPercent === 81.25, '384 dimensions must record 81.25% float32 storage reduction');
assert(equalQuality.results.find((item) => item.dimensions === 384)?.bytesPerVector === 1536, '384 vector byte estimate must use float32');
assert(equalQuality.results.find((item) => item.dimensions === 2048)?.bytesPerVector === 8192, '2048 vector byte estimate must use float32');
assert(equalQuality.results.every((item) => item.totalTokens === 480), 'token usage must be preserved per run');
assert(equalQuality.corpus.caseCount === 16 && equalQuality.corpus.hardNegativeCount === 16, 'comparison must preserve expanded evaluation identity');

const recallRegressed = compareNvidiaEmbeddingDimensions([
  makeReport({ dimension: 2048 }),
  makeReport({ dimension: 384, recallAtK: 0.75 }),
]);
assert(recallRegressed.recommendation.selectedDimensions === 2048, 'recall regression must retain 2048 dimensions');

const falsePositiveRegressed = compareNvidiaEmbeddingDimensions([
  makeReport({ dimension: 2048, hardNegativeRate: 0.1 }),
  makeReport({ dimension: 384, hardNegativeRate: 0.2 }),
]);
assert(falsePositiveRegressed.recommendation.selectedDimensions === 2048, 'hard-negative regression must retain 2048 dimensions');
assert(falsePositiveRegressed.comparison.compactMinusFull.hardNegativeRate === 0.1, 'hard-negative delta must be reported');

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
  compareNvidiaEmbeddingDimensions([
    makeReport({ dimension: 2048 }),
    { ...makeReport({ dimension: 384 }), corpus: { ...makeReport({ dimension: 384 }).corpus, revision: 'other-revision' } },
  ]);
  errors.push('mismatched evaluation revisions must be rejected');
} catch {
  // Expected.
}

try {
  compareNvidiaEmbeddingDimensions([makeReport({ dimension: 2048 })]);
  errors.push('missing dimension report must be rejected');
} catch {
  // Expected.
}

const workflowPath = path.resolve(process.cwd(), '..', '.github', 'workflows', 'nvidia-embedding-dimension-bakeoff.yml');
assert(fs.existsSync(workflowPath), 'dimension bake-off workflow is required');
if (fs.existsSync(workflowPath)) {
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  assert(/^\s*workflow_dispatch:/m.test(workflow), 'dimension bake-off must require manual workflow_dispatch');
  assert(!/^\s*(push|pull_request|schedule):/m.test(workflow), 'dimension bake-off must never call NVIDIA automatically');
  assert(workflow.includes('dimensions: [2048, 384]'), 'dimension bake-off must evaluate both 2048 and 384');
  assert(workflow.includes('secrets.NVIDIA_API_KEY'), 'dimension bake-off must use the GitHub Actions secret');
  assert(workflow.includes('actions/download-artifact@v4'), 'dimension bake-off must download both reports for comparison');
  assert(workflow.includes('compare-nvidia-embedding-dimensions.mjs'), 'dimension bake-off must generate an automatic comparison report');
  assert(workflow.includes('contents: read'), 'dimension bake-off permissions must remain read-only');
}

if (errors.length) {
  console.error(`✗ NVIDIA embedding dimension bake-off verification failed (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log(
  `✓ NVIDIA embedding dimension bake-off verified · docs ${POC_DOCUMENTS.length} · cases ${POC_CASES.length} · `
  + `selected ${equalQuality.recommendation.selectedDimensions} · storage reduction ${equalQuality.comparison.storageReductionPercent}% · hard-negative regression blocked`,
);
