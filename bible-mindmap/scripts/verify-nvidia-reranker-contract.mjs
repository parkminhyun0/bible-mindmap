import { buildHybridIndex } from './ai/retrieval/hybrid-search.mjs';
import {
  createProductionIndexManifest,
  PRODUCTION_INDEX_CONTRACT,
  validateProductionIndexManifest,
} from './ai/retrieval/production-index-contract.mjs';
import {
  normalizeRerankerResult,
  rerankHybridResults,
  RERANKER_CONTRACT_LIMITS,
} from './ai/retrieval/reranker-contract.mjs';
import { createNvidiaReranking } from './ai/providers/nvidia-reranker.mjs';
import {
  DEFAULT_NVIDIA_RERANKER_MODEL_ID,
  resolveNvidiaRerankerModelPolicy,
} from './ai/poc/nvidia-reranker-model-policy.mjs';

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const candidates = [
  {
    id: 'doc-a', title: '언약', text: '아브라함 언약과 약속의 후손', sourceRefs: ['Gen:12'],
    metadata: { approved: true }, rank: 1, score: { hybrid: 0.05, keyword: 0.8, vector: 0.7 },
  },
  {
    id: 'doc-b', title: '성전', text: '성막에서 성전과 새 창조로 이어지는 임재', sourceRefs: ['Exod:25', 'Rev:21'],
    metadata: { approved: true }, rank: 2, score: { hybrid: 0.04, keyword: 0.5, vector: 0.9 },
  },
  {
    id: 'doc-c', title: '왕권', text: '다윗 언약과 메시아 왕권', sourceRefs: ['2Sam:7'],
    metadata: { approved: true }, rank: 3, score: { hybrid: 0.03, keyword: 0.4, vector: 0.6 },
  },
];

const reranked = await rerankHybridResults({
  query: '하나님의 임재가 성막에서 새 창조까지 어떻게 이어지는가',
  candidates,
  topK: 2,
  rerank: async () => ({
    provider: 'nvidia',
    model: DEFAULT_NVIDIA_RERANKER_MODEL_ID,
    rankings: [
      { index: 1, logit: 4.5 },
      { index: 0, logit: 1.2 },
      { index: 2, logit: -0.4 },
    ],
    usage: { prompt_tokens: 120, total_tokens: 120 },
  }),
});
assert(reranked.results.length === 2, 'reranker must respect topK');
assert(reranked.results[0]?.id === 'doc-b', 'reranker must promote the highest relevance passage');
assert(reranked.results[0]?.reranker?.originalHybridRank === 2, 'reranker must preserve the original hybrid rank');
assert(reranked.results[0]?.sourceRefs?.length === 2, 'reranker must preserve source references');
assert(reranked.results[0]?.score?.hybrid === 0.04, 'reranker must preserve hybrid scores');
assert(reranked.changesProductionIndex === false, 'reranking must not mutate the production index');

try {
  normalizeRerankerResult({
    provider: 'nvidia', model: DEFAULT_NVIDIA_RERANKER_MODEL_ID,
    rankings: [{ index: 0, logit: 1 }, { index: 0, logit: 0 }],
  }, 2);
  errors.push('duplicate reranker indexes must be rejected');
} catch {
  // Expected.
}

const vectorA = Array.from({ length: PRODUCTION_INDEX_CONTRACT.dimension }, (_, index) => (index === 0 ? 1 : 0));
const vectorB = Array.from({ length: PRODUCTION_INDEX_CONTRACT.dimension }, (_, index) => (index === 1 ? 1 : 0));
const index = buildHybridIndex({
  documents: candidates.slice(0, 2).map(({ id, title, text, sourceRefs, metadata }) => ({ id, title, text, sourceRefs, metadata })),
  embeddingResult: {
    provider: 'nvidia',
    model: PRODUCTION_INDEX_CONTRACT.model,
    task: 'document',
    dimension: PRODUCTION_INDEX_CONTRACT.dimension,
    vectors: [vectorA, vectorB],
  },
});
const manifest = createProductionIndexManifest({
  index,
  corpusRevision: 'approved-canonical-v1',
  sourceCommit: '38dd57b02f3e296f3ff9c5077757945f086ddbd7',
  approvedDocumentIds: ['doc-a', 'doc-b'],
  generatedAt: '2026-08-04T00:00:00.000Z',
});
validateProductionIndexManifest(manifest);
assert(manifest.dimension === 2048, 'production manifest must retain the audited 2048 dimension');
assert(manifest.vectorBytesEstimate === 2 * 2048 * 4, 'production manifest vector size estimate mismatch');
assert(manifest.approvedOnly === true, 'production manifest must be approved-only');
assert(manifest.productionActivated === false, 'P1-2a must remain design-only');

try {
  createProductionIndexManifest({
    index: { ...index, dimension: 384 },
    corpusRevision: 'invalid',
    sourceCommit: '38dd57b02f3e296f3ff9c5077757945f086ddbd7',
    approvedDocumentIds: ['doc-a', 'doc-b'],
  });
  errors.push('384-dimensional production manifest must be rejected after the audited decision');
} catch {
  // Expected.
}

const policy = resolveNvidiaRerankerModelPolicy();
assert(policy.id === DEFAULT_NVIDIA_RERANKER_MODEL_ID, 'default reranker model mismatch');
assert(policy.endpoint === '/ranking', 'reranker endpoint must be /ranking');
assert(policy.truncate === 'NONE', 'verified corpus reranking must fail rather than silently truncate');
assert(policy.maxPassagesPerRequest === RERANKER_CONTRACT_LIMITS.maxCandidates, 'provider and contract passage limits must match');

let capturedUrl = '';
let capturedBody = null;
const providerResult = await createNvidiaReranking({
  query: '성전과 임재',
  passages: candidates.slice(0, 2).map((item) => ({ id: item.id, text: item.text })),
  requestId: 'rerank-self-test',
  env: {
    NVIDIA_API_KEY: 'unit-test-placeholder',
    NVIDIA_BASE_URL: 'https://example.invalid/v1',
    NVIDIA_RERANKER_MODEL_ID: DEFAULT_NVIDIA_RERANKER_MODEL_ID,
    NVIDIA_TIMEOUT_MS: '30000',
  },
  fetchImpl: async (url, options) => {
    capturedUrl = url;
    capturedBody = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        rankings: [{ index: 1, logit: 2.5 }, { index: 0, logit: 0.5 }],
        usage: { prompt_tokens: 42, total_tokens: 42 },
      }),
    };
  },
});
assert(capturedUrl === 'https://example.invalid/v1/ranking', 'provider must call the ranking endpoint');
assert(capturedBody?.model === DEFAULT_NVIDIA_RERANKER_MODEL_ID, 'provider request model mismatch');
assert(capturedBody?.query?.text === '성전과 임재', 'provider request query shape mismatch');
assert(capturedBody?.passages?.length === 2, 'provider request passage count mismatch');
assert(capturedBody?.truncate === 'NONE', 'provider must preserve fail-closed truncation');
assert(providerResult.rankings[0]?.index === 1, 'provider response rankings must be normalized');

if (errors.length) {
  console.error(`✗ NVIDIA reranker contract verification failed (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log(
  `✓ NVIDIA reranker contract verified · model ${DEFAULT_NVIDIA_RERANKER_MODEL_ID} · `
  + `shortlist ${RERANKER_CONTRACT_LIMITS.maxCandidates} · production dimension ${PRODUCTION_INDEX_CONTRACT.dimension} · no activation`,
);
