import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createNvidiaEmbeddings } from '../providers/nvidia-embeddings.mjs';
import { createNvidiaReranking } from '../providers/nvidia-reranker.mjs';
import { buildHybridIndex, searchHybridIndex, validateSearchDocuments } from '../retrieval/hybrid-search.mjs';
import { evaluateRetriever, validateEvaluationCases } from '../retrieval/retrieval-evaluation.mjs';
import { rerankHybridResults } from '../retrieval/reranker-contract.mjs';
import { resolveNvidiaEmbeddingModelPolicy } from './nvidia-embedding-model-policy.mjs';
import { resolveNvidiaRerankerModelPolicy } from './nvidia-reranker-model-policy.mjs';
import {
  NVIDIA_POC_EVALUATION_REVISION,
  POC_CASES,
  POC_DOCUMENTS,
} from './nvidia-embedding-evaluation-fixture.mjs';

const FINAL_K = 3;
const SHORTLIST_K = 12;
const REQUIRED_DIMENSION = 2048;

function sumUsage(target, usage) {
  if (!usage || typeof usage !== 'object') return target;
  for (const [key, value] of Object.entries(usage)) {
    if (Number.isFinite(value)) target[key] = (target[key] || 0) + value;
  }
  return target;
}

function evaluateGate({ baseline, candidate }) {
  const errors = [];
  const minimums = {
    recallAtK: 0.75,
    mrr: 0.7,
    ndcgAtK: 0.75,
    maxHardNegativeRate: 0.5,
    maxFailureRate: 0,
    maxP95LatencyMs: 30_000,
  };
  if (candidate.recallAtK < minimums.recallAtK) errors.push(`Recall@${FINAL_K} below ${minimums.recallAtK}`);
  if (candidate.mrr < minimums.mrr) errors.push(`MRR below ${minimums.mrr}`);
  if (candidate.ndcgAtK < minimums.ndcgAtK) errors.push(`nDCG@${FINAL_K} below ${minimums.ndcgAtK}`);
  if (candidate.hardNegativeRate > minimums.maxHardNegativeRate) errors.push(`hard-negative rate above ${minimums.maxHardNegativeRate}`);
  if (candidate.failureRate > minimums.maxFailureRate) errors.push('reranker request failure detected');
  if (candidate.latencyMs.p95 > minimums.maxP95LatencyMs) errors.push(`p95 latency above ${minimums.maxP95LatencyMs}ms`);

  const regressionChecks = [
    ['Recall@K', candidate.recallAtK, baseline.recallAtK, 'higher'],
    ['MRR', candidate.mrr, baseline.mrr, 'higher'],
    ['nDCG@K', candidate.ndcgAtK, baseline.ndcgAtK, 'higher'],
    ['hard-negative rate', candidate.hardNegativeRate, baseline.hardNegativeRate, 'lower'],
    ['failure rate', candidate.failureRate, baseline.failureRate, 'lower'],
  ];
  for (const [label, value, reference, direction] of regressionChecks) {
    if (direction === 'higher' && value < reference) errors.push(`${label} regressed below Hybrid baseline`);
    if (direction === 'lower' && value > reference) errors.push(`${label} regressed above Hybrid baseline`);
  }

  for (const queryType of ['direct', 'semantic', 'multi-hop']) {
    const before = baseline.segments?.[queryType];
    const after = candidate.segments?.[queryType];
    if (!before || !after) {
      errors.push(`missing ${queryType} segment`);
      continue;
    }
    if (after.recallAtK < before.recallAtK) errors.push(`${queryType} Recall@K regressed`);
    if (after.mrr < before.mrr) errors.push(`${queryType} MRR regressed`);
    if (after.ndcgAtK < before.ndcgAtK) errors.push(`${queryType} nDCG regressed`);
    if (after.hardNegativeRate > before.hardNegativeRate) errors.push(`${queryType} hard-negative rate regressed`);
  }

  const improvements = Object.freeze({
    mrr: candidate.mrr > baseline.mrr,
    ndcgAtK: candidate.ndcgAtK > baseline.ndcgAtK,
    hardNegativeRate: candidate.hardNegativeRate < baseline.hardNegativeRate,
  });
  if (!Object.values(improvements).some(Boolean)) errors.push('reranker produced no ranking or hard-negative improvement');

  return Object.freeze({
    passed: errors.length === 0,
    errors: Object.freeze(errors),
    minimums: Object.freeze(minimums),
    improvements,
    requiresHumanApproval: true,
    changesProductionIndex: false,
  });
}

export function describeNvidiaRerankerPoc(env = process.env) {
  const embeddingPolicy = resolveNvidiaEmbeddingModelPolicy({
    modelId: env.NVIDIA_EMBEDDING_MODEL_ID,
    dimensions: env.NVIDIA_EMBEDDING_DIMENSIONS || String(REQUIRED_DIMENSION),
  });
  const rerankerPolicy = resolveNvidiaRerankerModelPolicy({ modelId: env.NVIDIA_RERANKER_MODEL_ID });
  return Object.freeze({
    mode: 'dry-run',
    evaluationRevision: NVIDIA_POC_EVALUATION_REVISION,
    embeddingModel: embeddingPolicy.id,
    embeddingDimension: embeddingPolicy.requestedDimensions,
    rerankerModel: rerankerPolicy.id,
    documentCount: POC_DOCUMENTS.length,
    queryCount: POC_CASES.length,
    shortlistK: SHORTLIST_K,
    finalK: FINAL_K,
    endpoint: `${(env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '')}${rerankerPolicy.endpoint}`,
    writesExistingDb: false,
    changesProductionIndex: false,
    requiresExplicitExecute: true,
    requiresHumanApproval: true,
  });
}

export async function runNvidiaRerankerPoc({
  embed = createNvidiaEmbeddings,
  rerank = createNvidiaReranking,
  env = process.env,
  now,
} = {}) {
  const documents = validateSearchDocuments(POC_DOCUMENTS);
  const cases = validateEvaluationCases(POC_CASES);
  const embeddingPolicy = resolveNvidiaEmbeddingModelPolicy({
    modelId: env.NVIDIA_EMBEDDING_MODEL_ID,
    dimensions: env.NVIDIA_EMBEDDING_DIMENSIONS || String(REQUIRED_DIMENSION),
  });
  if (embeddingPolicy.requestedDimensions !== REQUIRED_DIMENSION) {
    throw new Error(`Reranker PoC requires the audited ${REQUIRED_DIMENSION}-dimension embedding policy`);
  }
  const rerankerPolicy = resolveNvidiaRerankerModelPolicy({ modelId: env.NVIDIA_RERANKER_MODEL_ID });

  const documentEmbedding = await embed({
    texts: documents.map((item) => `${item.title}\n${item.text}`),
    task: 'document',
    env,
  });
  const queryEmbedding = await embed({ texts: cases.map((item) => item.query), task: 'query', env });
  if (
    documentEmbedding.provider !== queryEmbedding.provider
    || documentEmbedding.model !== queryEmbedding.model
    || documentEmbedding.dimension !== queryEmbedding.dimension
  ) throw new Error('document and query embedding identity mismatch');
  if (documentEmbedding.dimension !== REQUIRED_DIMENSION) {
    throw new Error(`actual embedding dimension ${documentEmbedding.dimension} does not match ${REQUIRED_DIMENSION}`);
  }

  const index = buildHybridIndex({ documents, embeddingResult: documentEmbedding });
  const queryByCase = new Map(cases.map((item, position) => [item.id, {
    provider: queryEmbedding.provider,
    model: queryEmbedding.model,
    task: 'query',
    dimension: queryEmbedding.dimension,
    vectors: [queryEmbedding.vectors[position]],
  }]));

  const baseline = await evaluateRetriever({
    name: 'nvidia-hybrid-2048',
    cases,
    k: FINAL_K,
    ...(now ? { now } : {}),
    retrieve: async ({ query, topK, caseId }) => searchHybridIndex({
      query,
      index,
      queryEmbedding: queryByCase.get(caseId),
      topK,
      keywordWeight: 1,
      vectorWeight: 2,
    }),
  });

  const rerankerUsage = {};
  const rerankerRequests = [];
  const candidate = await evaluateRetriever({
    name: 'nvidia-hybrid-2048-plus-reranker',
    cases,
    k: FINAL_K,
    ...(now ? { now } : {}),
    retrieve: async ({ query, topK, caseId }) => {
      const shortlist = searchHybridIndex({
        query,
        index,
        queryEmbedding: queryByCase.get(caseId),
        topK: Math.min(SHORTLIST_K, index.count),
        keywordWeight: 1,
        vectorWeight: 2,
      });
      const reranked = await rerankHybridResults({
        query,
        candidates: shortlist,
        topK,
        rerank: async ({ query: rerankQuery, passages }) => rerank({
          query: rerankQuery,
          passages,
          requestId: `reranker-poc-${caseId}`,
          env,
        }),
      });
      sumUsage(rerankerUsage, reranked.usage);
      rerankerRequests.push(Object.freeze({
        caseId,
        requestId: reranked.requestId,
        candidateCount: reranked.candidateCount,
      }));
      return reranked.results;
    },
  });

  const gate = evaluateGate({ baseline, candidate });
  return Object.freeze({
    schemaVersion: 1,
    stage: 'P1-2b',
    evaluationRevision: NVIDIA_POC_EVALUATION_REVISION,
    retrievalConfig: Object.freeze({
      embeddingDimension: REQUIRED_DIMENSION,
      hybridRrfK: 60,
      keywordWeight: 1,
      vectorWeight: 2,
      shortlistK: SHORTLIST_K,
      finalK: FINAL_K,
    }),
    embedding: Object.freeze({
      provider: documentEmbedding.provider,
      model: documentEmbedding.model,
      dimension: documentEmbedding.dimension,
      documentRequestId: documentEmbedding.requestId || null,
      queryRequestId: queryEmbedding.requestId || null,
      documentUsage: documentEmbedding.usage || null,
      queryUsage: queryEmbedding.usage || null,
    }),
    reranker: Object.freeze({
      provider: 'nvidia',
      model: rerankerPolicy.id,
      requestCount: rerankerRequests.length,
      requests: Object.freeze(rerankerRequests),
      usage: Object.freeze({ ...rerankerUsage }),
    }),
    corpus: Object.freeze({
      documentCount: documents.length,
      sourceRefCount: documents.reduce((sum, item) => sum + item.sourceRefs.length, 0),
      queryCount: cases.length,
      hardNegativeCount: cases.reduce((sum, item) => sum + item.hardNegativeIds.length, 0),
    }),
    baseline,
    candidate,
    gate,
    existingDbModified: false,
    productionIndexModified: false,
    generatedAt: new Date().toISOString(),
  });
}

async function main() {
  const execute = process.argv.includes('--execute');
  const requirePass = process.argv.includes('--require-pass');
  const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
  const value = execute ? await runNvidiaRerankerPoc() : describeNvidiaRerankerPoc();
  const json = `${JSON.stringify(value, null, 2)}\n`;
  if (outputArg) {
    const outputPath = path.resolve(outputArg.slice(9));
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, json, 'utf8');
    console.log(`✓ NVIDIA Reranker PoC report written: ${outputPath}`);
  } else process.stdout.write(json);
  if (execute && requirePass && value.gate?.passed !== true) {
    console.error(`✗ NVIDIA Reranker quality gate failed: ${(value.gate?.errors || []).join('; ')}`);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`✗ NVIDIA Reranker PoC failed: ${error.message}`);
    process.exit(1);
  });
}
