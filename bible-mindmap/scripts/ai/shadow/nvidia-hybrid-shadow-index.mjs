import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { createNvidiaEmbeddings } from '../providers/nvidia-embeddings.mjs';
import { buildHybridIndex, searchHybridIndex } from '../retrieval/hybrid-search.mjs';
import { evaluateRetriever, validateEvaluationCases } from '../retrieval/retrieval-evaluation.mjs';
import { resolveNvidiaEmbeddingModelPolicy } from '../poc/nvidia-embedding-model-policy.mjs';
import {
  CANONICAL_SHADOW_CORPUS_REVISION,
  CANONICAL_SHADOW_DOCUMENTS,
} from './canonical-shadow-corpus.mjs';
import {
  NVIDIA_SHADOW_EVALUATION_REVISION,
  SHADOW_EVALUATION_CASES,
} from './nvidia-shadow-evaluation-fixture.mjs';
import {
  createShadowIndexManifest,
  validateShadowIndexManifest,
} from './shadow-index-contract.mjs';

const REQUIRED_DIMENSION = 2048;
const DOCUMENT_BATCH_SIZE = 12;
const QUERY_BATCH_SIZE = 12;
const TOP_K = 5;

function sumUsage(target, usage) {
  if (!usage || typeof usage !== 'object') return target;
  for (const [key, value] of Object.entries(usage)) {
    if (Number.isFinite(value)) target[key] = (target[key] || 0) + value;
  }
  return target;
}

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))];
}

function latencySummary(values) {
  return Object.freeze({
    requests: values.length,
    mean: values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1),
    p95: percentile(values, 0.95),
    max: values.length ? Math.max(...values) : 0,
  });
}

async function embedBatches({ texts, task, batchSize, embed, env }) {
  const vectors = [];
  const usage = {};
  const requestIds = [];
  const latencies = [];
  let identity = null;

  for (let offset = 0; offset < texts.length; offset += batchSize) {
    const batch = texts.slice(offset, offset + batchSize);
    const startedAt = performance.now();
    const result = await embed({ texts: batch, task, env });
    latencies.push(performance.now() - startedAt);
    if (!result || result.task !== task || !Array.isArray(result.vectors) || result.vectors.length !== batch.length) {
      throw new TypeError(`${task} embedding response is invalid at offset ${offset}`);
    }
    if (!Number.isInteger(result.dimension) || result.dimension !== REQUIRED_DIMENSION) {
      throw new TypeError(`${task} embedding dimension must be ${REQUIRED_DIMENSION}`);
    }
    result.vectors.forEach((vector, index) => {
      if (!Array.isArray(vector) || vector.length !== REQUIRED_DIMENSION || vector.some((value) => !Number.isFinite(value))) {
        throw new TypeError(`${task} embedding vector ${offset + index} is invalid`);
      }
    });
    if (identity && (
      identity.provider !== result.provider
      || identity.model !== result.model
      || identity.dimension !== result.dimension
    )) throw new TypeError(`${task} embedding identity changed between batches`);
    identity ||= { provider: result.provider, model: result.model, dimension: result.dimension };
    vectors.push(...result.vectors);
    sumUsage(usage, result.usage);
    if (result.requestId) requestIds.push(result.requestId);
  }

  return Object.freeze({
    ...identity,
    task,
    vectors: Object.freeze(vectors),
    usage: Object.freeze({ ...usage }),
    requestIds: Object.freeze(requestIds),
    latencyMs: latencySummary(latencies),
  });
}

function evaluateShadowGate({ baseline, candidate }) {
  const errors = [];
  const minimums = Object.freeze({
    recallAtK: 0.8,
    mrr: 0.75,
    ndcgAtK: 0.78,
    maxHardNegativeRate: 0.35,
    maxFailureRate: 0,
    maxLocalP95LatencyMs: 100,
    maxAllowedRegression: 0.05,
  });
  if (candidate.recallAtK < minimums.recallAtK) errors.push(`Recall@${TOP_K} below ${minimums.recallAtK}`);
  if (candidate.mrr < minimums.mrr) errors.push(`MRR below ${minimums.mrr}`);
  if (candidate.ndcgAtK < minimums.ndcgAtK) errors.push(`nDCG@${TOP_K} below ${minimums.ndcgAtK}`);
  if (candidate.hardNegativeRate > minimums.maxHardNegativeRate) errors.push(`hard-negative rate above ${minimums.maxHardNegativeRate}`);
  if (candidate.failureRate > minimums.maxFailureRate) errors.push('Hybrid shadow retrieval failure detected');
  if (candidate.latencyMs.p95 > minimums.maxLocalP95LatencyMs) errors.push('local Hybrid p95 latency exceeded 100ms');

  const floor = (value) => value - minimums.maxAllowedRegression;
  if (candidate.recallAtK < floor(baseline.recallAtK)) errors.push('Hybrid Recall@K regressed beyond allowance');
  if (candidate.mrr < floor(baseline.mrr)) errors.push('Hybrid MRR regressed beyond allowance');
  if (candidate.ndcgAtK < floor(baseline.ndcgAtK)) errors.push('Hybrid nDCG regressed beyond allowance');
  if (candidate.hardNegativeRate > baseline.hardNegativeRate + 0.125) errors.push('Hybrid hard-negative rate regressed beyond allowance');

  const segmentMinimums = Object.freeze({
    direct: Object.freeze({ recallAtK: 0.875, ndcgAtK: 0.8 }),
    semantic: Object.freeze({ recallAtK: 0.75, ndcgAtK: 0.75 }),
    'multi-hop': Object.freeze({ recallAtK: 0.6875, ndcgAtK: 0.7 }),
  });
  for (const [queryType, config] of Object.entries(segmentMinimums)) {
    const segment = candidate.segments?.[queryType];
    if (!segment) {
      errors.push(`missing ${queryType} segment`);
      continue;
    }
    if (segment.recallAtK < config.recallAtK) errors.push(`${queryType} Recall@K below ${config.recallAtK}`);
    if (segment.ndcgAtK < config.ndcgAtK) errors.push(`${queryType} nDCG below ${config.ndcgAtK}`);
  }

  const semanticBefore = baseline.segments?.semantic;
  const semanticAfter = candidate.segments?.semantic;
  const multiBefore = baseline.segments?.['multi-hop'];
  const multiAfter = candidate.segments?.['multi-hop'];
  const vectorContribution = Boolean(
    (semanticBefore && semanticAfter && (
      semanticAfter.recallAtK > semanticBefore.recallAtK
      || semanticAfter.mrr > semanticBefore.mrr
      || semanticAfter.ndcgAtK > semanticBefore.ndcgAtK
    ))
    || (multiBefore && multiAfter && (
      multiAfter.recallAtK > multiBefore.recallAtK
      || multiAfter.mrr > multiBefore.mrr
      || multiAfter.ndcgAtK > multiBefore.ndcgAtK
    ))
    || candidate.hardNegativeRate < baseline.hardNegativeRate
  );
  if (!vectorContribution) errors.push('2048-dimensional vectors produced no measurable semantic, multi-hop, or hard-negative contribution');

  return Object.freeze({
    passed: errors.length === 0,
    errors: Object.freeze(errors),
    minimums,
    segmentMinimums,
    vectorContribution,
    shadowOnly: true,
    changesProductionIndex: false,
    requiresHumanApproval: true,
  });
}

export function describeNvidiaHybridShadowIndex(env = process.env) {
  const policy = resolveNvidiaEmbeddingModelPolicy({
    modelId: env.NVIDIA_EMBEDDING_MODEL_ID,
    dimensions: env.NVIDIA_EMBEDDING_DIMENSIONS || String(REQUIRED_DIMENSION),
  });
  return Object.freeze({
    mode: 'dry-run',
    stage: 'P1-2c',
    corpusRevision: CANONICAL_SHADOW_CORPUS_REVISION,
    evaluationRevision: NVIDIA_SHADOW_EVALUATION_REVISION,
    model: policy.id,
    dimension: policy.requestedDimensions,
    documentCount: CANONICAL_SHADOW_DOCUMENTS.length,
    queryCount: SHADOW_EVALUATION_CASES.length,
    topK: TOP_K,
    shadowOnly: true,
    productionActivated: false,
    liveSearchConnected: false,
    writesExistingDb: false,
    requiresExplicitExecute: true,
    requiresHumanApproval: true,
  });
}

export async function runNvidiaHybridShadowIndex({
  embed = createNvidiaEmbeddings,
  env = process.env,
  now,
} = {}) {
  const policy = resolveNvidiaEmbeddingModelPolicy({
    modelId: env.NVIDIA_EMBEDDING_MODEL_ID,
    dimensions: env.NVIDIA_EMBEDDING_DIMENSIONS || String(REQUIRED_DIMENSION),
  });
  if (policy.requestedDimensions !== REQUIRED_DIMENSION) {
    throw new Error(`shadow index requires ${REQUIRED_DIMENSION}-dimension embeddings`);
  }
  if (!/^[0-9a-f]{40}$/.test(env.GITHUB_SHA || '')) throw new Error('GITHUB_SHA must be a full commit SHA');

  const documents = CANONICAL_SHADOW_DOCUMENTS;
  const cases = validateEvaluationCases(SHADOW_EVALUATION_CASES);
  const documentEmbedding = await embedBatches({
    texts: documents.map((document) => `${document.title}\n${document.text}`),
    task: 'document',
    batchSize: DOCUMENT_BATCH_SIZE,
    embed,
    env,
  });
  const queryEmbedding = await embedBatches({
    texts: cases.map((item) => item.query),
    task: 'query',
    batchSize: QUERY_BATCH_SIZE,
    embed,
    env,
  });
  if (
    documentEmbedding.provider !== queryEmbedding.provider
    || documentEmbedding.model !== queryEmbedding.model
    || documentEmbedding.dimension !== queryEmbedding.dimension
  ) throw new Error('document and query embedding identity mismatch');

  const index = buildHybridIndex({ documents, embeddingResult: documentEmbedding });
  const queryByCase = new Map(cases.map((item, position) => [item.id, {
    provider: queryEmbedding.provider,
    model: queryEmbedding.model,
    task: 'query',
    dimension: queryEmbedding.dimension,
    vectors: [queryEmbedding.vectors[position]],
  }]));
  const retrieve = (vectorWeight) => async ({ query, topK, caseId }) => searchHybridIndex({
    query,
    index,
    queryEmbedding: queryByCase.get(caseId),
    topK,
    keywordWeight: 1,
    vectorWeight,
  });

  const baseline = await evaluateRetriever({
    name: 'keyword-only-shadow-baseline',
    cases,
    k: TOP_K,
    ...(now ? { now } : {}),
    retrieve: retrieve(0),
  });
  const candidate = await evaluateRetriever({
    name: 'nvidia-hybrid-2048-shadow',
    cases,
    k: TOP_K,
    ...(now ? { now } : {}),
    retrieve: retrieve(2),
  });
  const gate = evaluateShadowGate({ baseline, candidate });
  const generatedAt = new Date().toISOString();
  const manifest = createShadowIndexManifest({
    index,
    sourceCommit: env.GITHUB_SHA,
    approvedDocumentIds: documents.map((document) => document.id),
    generatedAt,
  });
  validateShadowIndexManifest(manifest);

  return Object.freeze({
    schemaVersion: 1,
    stage: 'P1-2c',
    generatedAt,
    corpus: Object.freeze({
      revision: CANONICAL_SHADOW_CORPUS_REVISION,
      documentCount: documents.length,
      sourceRefCount: documents.reduce((sum, document) => sum + document.sourceRefs.length, 0),
    }),
    evaluation: Object.freeze({
      revision: NVIDIA_SHADOW_EVALUATION_REVISION,
      queryCount: cases.length,
      hardNegativeCount: cases.reduce((sum, item) => sum + item.hardNegativeIds.length, 0),
      topK: TOP_K,
      baseline,
      candidate,
      gate,
    }),
    embedding: Object.freeze({
      provider: documentEmbedding.provider,
      model: documentEmbedding.model,
      dimension: documentEmbedding.dimension,
      documentUsage: documentEmbedding.usage,
      queryUsage: queryEmbedding.usage,
      documentRequestIds: documentEmbedding.requestIds,
      queryRequestIds: queryEmbedding.requestIds,
      documentLatencyMs: documentEmbedding.latencyMs,
      queryLatencyMs: queryEmbedding.latencyMs,
    }),
    manifest,
    index,
    existingDbModified: false,
    productionIndexModified: false,
    liveSearchConnected: false,
  });
}

function writeArtifacts(result, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const indexPayload = {
    schemaVersion: 1,
    stage: result.stage,
    manifest: result.manifest,
    index: result.index,
  };
  const evaluationPayload = {
    schemaVersion: 1,
    stage: result.stage,
    corpus: result.corpus,
    evaluation: result.evaluation,
    embedding: result.embedding,
    existingDbModified: result.existingDbModified,
    productionIndexModified: result.productionIndexModified,
    liveSearchConnected: result.liveSearchConnected,
    generatedAt: result.generatedAt,
  };
  const summaryPayload = {
    schemaVersion: 1,
    stage: result.stage,
    manifest: result.manifest,
    baseline: result.evaluation.baseline,
    candidate: result.evaluation.candidate,
    gate: result.evaluation.gate,
    embedding: result.embedding,
    existingDbModified: false,
    productionIndexModified: false,
    liveSearchConnected: false,
    generatedAt: result.generatedAt,
  };
  fs.writeFileSync(path.join(outputDir, 'shadow-index.json'), `${JSON.stringify(indexPayload)}\n`, 'utf8');
  fs.writeFileSync(path.join(outputDir, 'manifest.json'), `${JSON.stringify(result.manifest, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outputDir, 'evaluation.json'), `${JSON.stringify(evaluationPayload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outputDir, 'summary.json'), `${JSON.stringify(summaryPayload, null, 2)}\n`, 'utf8');
}

async function main() {
  const execute = process.argv.includes('--execute');
  const requirePass = process.argv.includes('--require-pass');
  const outputArg = process.argv.find((arg) => arg.startsWith('--output-dir='));
  const value = execute ? await runNvidiaHybridShadowIndex() : describeNvidiaHybridShadowIndex();
  if (outputArg && execute) {
    const outputDir = path.resolve(outputArg.slice('--output-dir='.length));
    writeArtifacts(value, outputDir);
    console.log(`✓ NVIDIA Hybrid shadow artifacts written: ${outputDir}`);
  } else process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  if (execute && requirePass && value.evaluation?.gate?.passed !== true) {
    console.error(`✗ NVIDIA Hybrid shadow quality gate failed: ${(value.evaluation?.gate?.errors || []).join('; ')}`);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`✗ NVIDIA Hybrid shadow index failed: ${error.message}`);
    process.exit(1);
  });
}
