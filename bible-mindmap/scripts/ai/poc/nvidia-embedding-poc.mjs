import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createNvidiaEmbeddings } from '../providers/nvidia-embeddings.mjs';
import { buildHybridIndex, searchHybridIndex, validateSearchDocuments } from '../retrieval/hybrid-search.mjs';
import { assertRetrievalQuality, evaluateRetriever, validateEvaluationCases } from '../retrieval/retrieval-evaluation.mjs';
import { resolveNvidiaEmbeddingModelPolicy } from './nvidia-embedding-model-policy.mjs';
import {
  NVIDIA_POC_EVALUATION_REVISION,
  POC_CASES,
  POC_DOCUMENTS,
} from './nvidia-embedding-evaluation-fixture.mjs';

export { NVIDIA_POC_EVALUATION_REVISION, POC_CASES, POC_DOCUMENTS };

const K = 3;

function getModelPolicy(env) {
  return resolveNvidiaEmbeddingModelPolicy({
    modelId: env.NVIDIA_EMBEDDING_MODEL_ID,
    dimensions: env.NVIDIA_EMBEDDING_DIMENSIONS,
  });
}

function summarizeEvaluation(report) {
  return Object.freeze({
    recallAtK: report.recallAtK,
    mrr: report.mrr,
    ndcgAtK: report.ndcgAtK,
    hardNegativeRate: report.hardNegativeRate,
    failureRate: report.failureRate,
    latencyMs: report.latencyMs,
    segments: report.segments,
  });
}

function assertSegmentQuality(report) {
  const requirements = {
    direct: { minRecall: 0.8, minMrr: 0.75 },
    semantic: { minRecall: 0.75, minMrr: 0.65 },
    'multi-hop': { minRecall: 2 / 3, minMrr: 0.6 },
  };
  const errors = [];
  for (const [queryType, config] of Object.entries(requirements)) {
    const segment = report.segments?.[queryType];
    if (!segment) {
      errors.push(`missing ${queryType} evaluation segment`);
      continue;
    }
    if (segment.recallAtK < config.minRecall) errors.push(`${queryType} Recall@${K} ${segment.recallAtK.toFixed(4)} < ${config.minRecall}`);
    if (segment.mrr < config.minMrr) errors.push(`${queryType} MRR ${segment.mrr.toFixed(4)} < ${config.minMrr}`);
  }
  if (errors.length) throw new Error(`retrieval segment gate failed (${errors.length}): ${errors.join('; ')}`);
  return Object.freeze({ passed: true, requirements: Object.freeze(requirements) });
}

export function describeNvidiaEmbeddingPoc(env = process.env) {
  const documents = validateSearchDocuments(POC_DOCUMENTS);
  const cases = validateEvaluationCases(POC_CASES);
  const policy = getModelPolicy(env);
  return Object.freeze({
    mode: 'dry-run',
    provider: 'nvidia',
    model: policy.id,
    modelTier: policy.tier,
    supportsKorean: policy.supportsKorean,
    requestedDimensions: policy.requestedDimensions,
    endpoint: `${(env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '')}/embeddings`,
    evaluationRevision: NVIDIA_POC_EVALUATION_REVISION,
    documentCount: documents.length,
    queryCount: cases.length,
    hardNegativeCount: cases.reduce((sum, item) => sum + item.hardNegativeIds.length, 0),
    queryTypes: [...new Set(cases.map((item) => item.metadata.queryType))],
    documentIds: documents.map((item) => item.id),
    writesExistingDb: false,
    requiresExplicitExecute: true,
  });
}

export async function runNvidiaEmbeddingPoc({ embed = createNvidiaEmbeddings, env = process.env, now } = {}) {
  const documents = validateSearchDocuments(POC_DOCUMENTS);
  const cases = validateEvaluationCases(POC_CASES);
  const policy = getModelPolicy(env);
  const documentEmbedding = await embed({ texts: documents.map((item) => `${item.title}\n${item.text}`), task: 'document', env });
  const queryEmbedding = await embed({ texts: cases.map((item) => item.query), task: 'query', env });
  if (documentEmbedding.provider !== queryEmbedding.provider || documentEmbedding.model !== queryEmbedding.model || documentEmbedding.dimension !== queryEmbedding.dimension) {
    throw new Error('document and query embedding identity mismatch');
  }

  const index = buildHybridIndex({ documents, embeddingResult: documentEmbedding });
  const queryByCase = new Map(cases.map((item, position) => [item.id, {
    provider: queryEmbedding.provider,
    model: queryEmbedding.model,
    task: 'query',
    dimension: queryEmbedding.dimension,
    vectors: [queryEmbedding.vectors[position]],
  }]));
  const retrieve = ({ keywordWeight, vectorWeight }) => async ({ query, topK, caseId }) => searchHybridIndex({
    query,
    index,
    queryEmbedding: queryByCase.get(caseId),
    topK,
    keywordWeight,
    vectorWeight,
  });
  const options = now ? { now } : {};
  const baseline = await evaluateRetriever({
    name: 'keyword-baseline',
    cases,
    retrieve: retrieve({ keywordWeight: 1, vectorWeight: 0 }),
    k: K,
    ...options,
  });
  const vectorOnly = await evaluateRetriever({
    name: 'nvidia-vector-only',
    cases,
    retrieve: retrieve({ keywordWeight: 0, vectorWeight: 1 }),
    k: K,
    ...options,
  });
  const candidate = await evaluateRetriever({
    name: 'nvidia-hybrid',
    cases,
    retrieve: retrieve({ keywordWeight: 1, vectorWeight: 2 }),
    k: K,
    ...options,
  });
  const gate = assertRetrievalQuality({
    baseline,
    candidate,
    thresholds: {
      minRecallAtK: 0.75,
      minMrr: 0.7,
      minNdcgAtK: 0.75,
      maxHardNegativeRate: 0.5,
      maxFailureRate: 0,
      maxP95LatencyMs: 5_000,
      allowedRegression: 0.125,
    },
  });
  const segmentGate = assertSegmentQuality(candidate);
  const vectorSemanticRecall = vectorOnly.segments?.semantic?.recallAtK ?? 0;
  if (vectorSemanticRecall < 0.6) {
    throw new Error(`vector-only semantic Recall@${K} ${vectorSemanticRecall.toFixed(4)} < 0.6`);
  }

  return Object.freeze({
    schemaVersion: 3,
    evaluationRevision: NVIDIA_POC_EVALUATION_REVISION,
    retrievalConfig: Object.freeze({ topK: K, rrfK: 60, keywordWeight: 1, vectorWeight: 2 }),
    embedding: {
      provider: documentEmbedding.provider,
      model: documentEmbedding.model,
      modelTier: policy.tier,
      supportsKorean: policy.supportsKorean,
      requestedDimensions: policy.requestedDimensions,
      dimension: documentEmbedding.dimension,
      documentRequestId: documentEmbedding.requestId || null,
      queryRequestId: queryEmbedding.requestId || null,
      documentUsage: documentEmbedding.usage || null,
      queryUsage: queryEmbedding.usage || null,
    },
    corpus: {
      revision: NVIDIA_POC_EVALUATION_REVISION,
      count: documents.length,
      ids: documents.map((item) => item.id),
      sourceRefs: documents.reduce((sum, item) => sum + item.sourceRefs.length, 0),
      caseCount: cases.length,
      hardNegativeCount: cases.reduce((sum, item) => sum + item.hardNegativeIds.length, 0),
      queryTypes: [...new Set(cases.map((item) => item.metadata.queryType))],
    },
    baseline: summarizeEvaluation(baseline),
    vectorOnly: summarizeEvaluation(vectorOnly),
    candidate: summarizeEvaluation(candidate),
    gate: Object.freeze({ ...gate, segmentGate, vectorSemanticRecallAtK: vectorSemanticRecall }),
    existingDbModified: false,
    generatedAt: new Date().toISOString(),
  });
}

async function main() {
  const execute = process.argv.includes('--execute');
  const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
  const value = execute ? await runNvidiaEmbeddingPoc() : describeNvidiaEmbeddingPoc();
  const json = `${JSON.stringify(value, null, 2)}\n`;
  if (outputArg) {
    const outputPath = path.resolve(outputArg.slice(9));
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, json, 'utf8');
    console.log(`✓ NVIDIA Embedding PoC report written: ${outputPath}`);
  } else process.stdout.write(json);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`✗ NVIDIA Embedding PoC failed: ${error.message}`);
    process.exit(1);
  });
}
