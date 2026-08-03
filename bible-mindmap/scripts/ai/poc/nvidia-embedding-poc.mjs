import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createNvidiaEmbeddings } from '../providers/nvidia-embeddings.mjs';
import { buildHybridIndex, searchHybridIndex, validateSearchDocuments } from '../retrieval/hybrid-search.mjs';
import { assertRetrievalQuality, evaluateRetriever, validateEvaluationCases } from '../retrieval/retrieval-evaluation.mjs';

export const POC_DOCUMENTS = Object.freeze([
  Object.freeze({
    id: 'canonical.seed',
    title: '아브라함의 씨와 약속',
    text: '아브라함에게 주신 언약의 약속과 후손은 그리스도 안에서 성취된다.',
    sourceRefs: Object.freeze(['Gen 12:1-3', 'Gen 17:7', 'Gal 3:16']),
    metadata: Object.freeze({ type: 'canonical-concept', approvedForPoc: true }),
  }),
  Object.freeze({
    id: 'canonical.king',
    title: '다윗 언약과 메시아 왕권',
    text: '다윗의 보좌와 영원한 왕의 통치는 예수 그리스도의 왕권으로 완성된다.',
    sourceRefs: Object.freeze(['2Sam 7:12-16', 'Ps 2:6-12', 'Luke 1:32-33']),
    metadata: Object.freeze({ type: 'canonical-concept', approvedForPoc: true }),
  }),
  Object.freeze({
    id: 'canonical.temple',
    title: '성막과 성전에서 새 창조의 임재로',
    text: '성막과 성전에 거하신 하나님의 임재가 그리스도와 교회와 새 예루살렘에서 완성된다.',
    sourceRefs: Object.freeze(['Exod 40:34-38', 'John 1:14', 'Rev 21:22-23']),
    metadata: Object.freeze({ type: 'canonical-concept', approvedForPoc: true }),
  }),
  Object.freeze({
    id: 'canonical.exodus',
    title: '출애굽과 구속',
    text: '유월절과 바다를 통한 구원이 그리스도의 구속과 새 출애굽으로 발전한다.',
    sourceRefs: Object.freeze(['Exod 12:1-32', 'Luke 9:31', '1Cor 5:7']),
    metadata: Object.freeze({ type: 'canonical-concept', approvedForPoc: true }),
  }),
]);

export const POC_CASES = Object.freeze([
  Object.freeze({ id: 'seed', query: '아브라함의 약속과 후손이 그리스도에게 이어지는 흐름', relevantIds: Object.freeze(['canonical.seed']) }),
  Object.freeze({ id: 'king', query: '다윗의 보좌와 영원한 메시아 왕', relevantIds: Object.freeze(['canonical.king']) }),
  Object.freeze({ id: 'temple', query: '성막 성전 교회 새 예루살렘 하나님의 임재', relevantIds: Object.freeze(['canonical.temple']) }),
  Object.freeze({ id: 'exodus', query: '유월절과 새 출애굽의 구속', relevantIds: Object.freeze(['canonical.exodus']) }),
]);

export function describeNvidiaEmbeddingPoc(env = process.env) {
  const documents = validateSearchDocuments(POC_DOCUMENTS);
  const cases = validateEvaluationCases(POC_CASES);
  return Object.freeze({
    mode: 'dry-run',
    provider: 'nvidia',
    model: env.NVIDIA_EMBEDDING_MODEL_ID?.trim() || null,
    endpoint: `${(env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '')}/embeddings`,
    documentCount: documents.length,
    queryCount: cases.length,
    documentIds: Object.freeze(documents.map((item) => item.id)),
    writesExistingDb: false,
    requiresExplicitExecute: true,
  });
}

export async function runNvidiaEmbeddingPoc({
  embed = createNvidiaEmbeddings,
  env = process.env,
  now,
} = {}) {
  const documents = validateSearchDocuments(POC_DOCUMENTS);
  const cases = validateEvaluationCases(POC_CASES);
  const documentEmbedding = await embed({ texts: documents.map((item) => `${item.title}\n${item.text}`), task: 'document', env });
  const queryEmbedding = await embed({ texts: cases.map((item) => item.query), task: 'query', env });
  if (documentEmbedding.provider !== queryEmbedding.provider
    || documentEmbedding.model !== queryEmbedding.model
    || documentEmbedding.dimension !== queryEmbedding.dimension) {
    throw new Error('document and query embedding identity mismatch');
  }

  const index = buildHybridIndex({ documents, embeddingResult: documentEmbedding });
  const queryByCase = new Map(cases.map((item, indexPosition) => [item.id, {
    provider: queryEmbedding.provider,
    model: queryEmbedding.model,
    task: 'query',
    dimension: queryEmbedding.dimension,
    vectors: [queryEmbedding.vectors[indexPosition]],
  }]));
  const retrieve = (vectorWeight) => async ({ query, topK, caseId }) => searchHybridIndex({
    query,
    index,
    queryEmbedding: queryByCase.get(caseId),
    topK,
    keywordWeight: 1,
    vectorWeight,
  });

  const baseline = await evaluateRetriever({ name: 'keyword-baseline', cases, retrieve: retrieve(0), k: 3, ...(now ? { now } : {}) });
  const candidate = await evaluateRetriever({ name: 'nvidia-hybrid', cases, retrieve: retrieve(1), k: 3, ...(now ? { now } : {}) });
  const gate = assertRetrievalQuality({
    baseline,
    candidate,
    thresholds: {
      minRecallAtK: 0.75,
      minMrr: 0.75,
      minNdcgAtK: 0.75,
      maxFailureRate: 0,
      maxP95LatencyMs: 5_000,
      allowedRegression: 0,
    },
  });

  return Object.freeze({
    schemaVersion: 1,
    provider: candidate.name,
    embedding: Object.freeze({
      provider: documentEmbedding.provider,
      model: documentEmbedding.model,
      dimension: documentEmbedding.dimension,
      documentRequestId: documentEmbedding.requestId || null,
      queryRequestId: queryEmbedding.requestId || null,
      documentUsage: documentEmbedding.usage || null,
      queryUsage: queryEmbedding.usage || null,
    }),
    corpus: Object.freeze({ count: documents.length, ids: Object.freeze(documents.map((item) => item.id)), sourceRefs: documents.reduce((total, item) => total + item.sourceRefs.length, 0) }),
    baseline: Object.freeze({ recallAtK: baseline.recallAtK, mrr: baseline.mrr, ndcgAtK: baseline.ndcgAtK, failureRate: baseline.failureRate, latencyMs: baseline.latencyMs }),
    candidate: Object.freeze({ recallAtK: candidate.recallAtK, mrr: candidate.mrr, ndcgAtK: candidate.ndcgAtK, failureRate: candidate.failureRate, latencyMs: candidate.latencyMs }),
    gate,
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
    const outputPath = path.resolve(outputArg.slice('--output='.length));
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, json, 'utf8');
    console.log(`✓ NVIDIA Embedding PoC report written: ${outputPath}`);
  } else {
    process.stdout.write(json);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`✗ NVIDIA Embedding PoC failed: ${error.message}`);
    process.exit(1);
  });
}
