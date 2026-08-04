import { createNvidiaEmbeddings } from './ai/providers/nvidia-embeddings.mjs';
import { createNvidiaReranking } from './ai/providers/nvidia-reranker.mjs';
import {
  describeNvidiaRerankerPoc,
  runNvidiaRerankerPoc,
} from './ai/poc/nvidia-reranker-poc.mjs';
import { DEFAULT_NVIDIA_EMBEDDING_MODEL_ID } from './ai/poc/nvidia-embedding-model-policy.mjs';
import { DEFAULT_NVIDIA_RERANKER_MODEL_ID } from './ai/poc/nvidia-reranker-model-policy.mjs';

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const env = {
  NVIDIA_API_KEY: 'unit-test-placeholder',
  NVIDIA_BASE_URL: 'https://example.test/v1',
  NVIDIA_TIMEOUT_MS: '3000',
  NVIDIA_EMBEDDING_MODEL_ID: DEFAULT_NVIDIA_EMBEDDING_MODEL_ID,
  NVIDIA_EMBEDDING_DIMENSIONS: '2048',
  NVIDIA_RERANKER_MODEL_ID: DEFAULT_NVIDIA_RERANKER_MODEL_ID,
};

const topics = [
  [/아브라함|씨 약속|가문.*민족|후손/, 0],
  [/다윗|보좌|메시아 왕권|영원한 왕/, 1],
  [/성막|성전|장막|하나님의 임재|도성을 비추/, 2],
  [/출애굽|유월절|노예의 집|바다를 지나|십자가의 해방/, 3],
  [/새 언약|돌판|마음에 기록|죄 사함|죄를 씻고/, 4],
  [/제사|속죄|대제사장|어린양|단번/, 5],
  [/창조|아담|새 하늘|새 땅/, 6],
  [/포로|바벨론|남은 자|귀환/, 7],
  [/지혜|태초.*말씀|로고스/, 8],
  [/성령|새 영|생기|오순절|마른 뼈/, 9],
  [/부활|죽은 자|첫 열매/, 10],
  [/율법의 행위|믿음으로|의롭다|의의 열매/, 11],
];
const hardNegativeTopicRules = [
  [/씨 약속이 그리스도/, 6],
  [/한 사람의 가문/, 1],
  [/다윗의 보좌/, 0],
  [/구름이 장막/, 1],
  [/노예의 집/, 7],
  [/돌판이 아니라/, 1],
  [/반복 제사가 아니라/, 8],
  [/첫 아담의 실패/, 0],
  [/바벨론 포로/, 3],
  [/태초부터 하나님/, 1],
  [/마른 뼈/, 10],
  [/죽은 자 가운데서/, 6],
  [/율법의 행위가 아니라/, 4],
  [/영원한 왕이 동시에/, 2],
  [/새 언약에서 죄를 씻고/, 11],
  [/창조의 회복/, 7],
];
const topicSet = (text) => new Set(topics.filter(([pattern]) => pattern.test(text)).map(([, index]) => index));
const hardNegativeTopicFor = (query) => hardNegativeTopicRules.find(([pattern]) => pattern.test(query))?.[1] ?? null;
const vectorFor = (text) => {
  const vector = Array(2048).fill(0);
  for (const topic of topicSet(text)) vector[topic] = 1;
  if (!vector.some(Boolean)) vector[20] = 0.25;
  return vector;
};

const embeddingRequests = [];
const rerankerRequests = [];
const embeddingFetch = async (url, options) => {
  const body = JSON.parse(options.body);
  embeddingRequests.push({ url, body, authorization: options.headers.authorization });
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify({
      id: `embedding-mock-${embeddingRequests.length}`,
      data: body.input.map((text, index) => ({ index, embedding: vectorFor(text) })),
      usage: { prompt_tokens: body.input.length, total_tokens: body.input.length },
    }),
  };
};
const rerankerFetch = async (url, options) => {
  const body = JSON.parse(options.body);
  rerankerRequests.push({ url, body, authorization: options.headers.authorization });
  const queryTopics = topicSet(body.query.text);
  const hardNegativeTopic = hardNegativeTopicFor(body.query.text);
  const rankings = body.passages.map((passage, index) => {
    const passageTopics = topicSet(passage.text);
    const overlap = [...queryTopics].filter((topic) => passageTopics.has(topic)).length;
    const hardNegativePenalty = hardNegativeTopic != null && passageTopics.has(hardNegativeTopic) ? 20 : 0;
    return { index, logit: overlap * 10 - hardNegativePenalty - index * 0.001 };
  });
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify({
      id: `reranker-mock-${rerankerRequests.length}`,
      rankings,
      usage: { prompt_tokens: body.passages.length + 1, total_tokens: body.passages.length + 1 },
    }),
  };
};
const embed = (input) => createNvidiaEmbeddings({ ...input, env, fetchImpl: embeddingFetch });
const rerank = (input) => createNvidiaReranking({ ...input, env, fetchImpl: rerankerFetch });
let clock = 0;
const report = await runNvidiaRerankerPoc({
  embed,
  rerank,
  env,
  now: () => { clock += 3; return clock; },
});
const dryRun = describeNvidiaRerankerPoc(env);

assert(embeddingRequests.length === 2, 'PoC must make one document and one query embedding request');
assert(rerankerRequests.length === 16, 'PoC must make one reranker request per evaluation case');
assert(embeddingRequests.every((request) => request.url === 'https://example.test/v1/embeddings'), 'embedding endpoint mismatch');
assert(rerankerRequests.every((request) => request.url === 'https://example.test/v1/ranking'), 'reranker endpoint mismatch');
assert(rerankerRequests.every((request) => request.body.model === DEFAULT_NVIDIA_RERANKER_MODEL_ID), 'reranker model mismatch');
assert(rerankerRequests.every((request) => request.body.truncate === 'NONE'), 'reranker must reject silent truncation');
assert(rerankerRequests.every((request) => request.body.passages.length === 12), 'all 12 approved PoC documents must be reranked');
assert(report.schemaVersion === 1 && report.stage === 'P1-2b', 'report identity mismatch');
assert(report.embedding.dimension === 2048, 'PoC must use the audited 2048 dimensions');
assert(report.reranker.model === DEFAULT_NVIDIA_RERANKER_MODEL_ID, 'report reranker model mismatch');
assert(report.reranker.requestCount === 16, 'report reranker request count mismatch');
assert(report.corpus.documentCount === 12 && report.corpus.sourceRefCount === 36, 'report corpus evidence mismatch');
assert(report.corpus.queryCount === 16 && report.corpus.hardNegativeCount === 16, 'report evaluation evidence mismatch');
assert(report.candidate.recallAtK >= report.baseline.recallAtK, 'reranker Recall@3 must not regress');
assert(report.candidate.mrr >= report.baseline.mrr, 'reranker MRR must not regress');
assert(report.candidate.ndcgAtK >= report.baseline.ndcgAtK, 'reranker nDCG must not regress');
assert(report.candidate.hardNegativeRate <= report.baseline.hardNegativeRate, 'reranker hard-negative rate must not regress');
assert(report.gate.passed === true, `mock quality gate must pass: ${report.gate.errors.join('; ')}`);
assert(report.gate.improvements.ndcgAtK || report.gate.improvements.hardNegativeRate, 'mock reranker must prove a measurable improvement');
assert(report.existingDbModified === false && report.productionIndexModified === false, 'PoC must not mutate DB or production index');
assert(dryRun.requiresExplicitExecute === true && dryRun.requiresHumanApproval === true, 'dry-run safety boundaries missing');
assert(dryRun.embeddingDimension === 2048 && dryRun.shortlistK === 12 && dryRun.finalK === 3, 'dry-run retrieval configuration mismatch');
assert(!JSON.stringify(report).includes(env.NVIDIA_API_KEY), 'report must never contain the API key');

if (errors.length) {
  console.error(`✗ NVIDIA Reranker PoC verification failed (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}
console.log(
  `✓ NVIDIA Reranker PoC verified · Hybrid nDCG@3 ${report.baseline.ndcgAtK.toFixed(4)} → `
  + `${report.candidate.ndcgAtK.toFixed(4)} · hard negative ${(report.baseline.hardNegativeRate * 100).toFixed(1)}% → `
  + `${(report.candidate.hardNegativeRate * 100).toFixed(1)}% · requests ${report.reranker.requestCount}`,
);
