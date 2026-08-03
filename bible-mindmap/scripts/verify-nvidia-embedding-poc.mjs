import { createNvidiaEmbeddings } from './ai/providers/nvidia-embeddings.mjs';
import {
  describeNvidiaEmbeddingPoc,
  NVIDIA_POC_EVALUATION_REVISION,
  runNvidiaEmbeddingPoc,
} from './ai/poc/nvidia-embedding-poc.mjs';
import { DEFAULT_NVIDIA_EMBEDDING_MODEL_ID } from './ai/poc/nvidia-embedding-model-policy.mjs';

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const env = {
  NVIDIA_API_KEY: 'test-key',
  NVIDIA_BASE_URL: 'https://example.test/v1',
  NVIDIA_TIMEOUT_MS: '3000',
  NVIDIA_EMBEDDING_MODEL_ID: 'nvidia/nemotron-3-embed-1b',
};
const requests = [];
const semanticPatterns = [
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
const vectorFor = (text) => {
  const vector = Array(12).fill(0);
  semanticPatterns.forEach(([pattern, index]) => {
    if (pattern.test(text)) vector[index] = 1;
  });
  if (!vector.some(Boolean)) vector[11] = 0.25;
  return vector;
};
const fetchImpl = async (url, options) => {
  const body = JSON.parse(options.body);
  requests.push({ url, body, authorization: options.headers.authorization });
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify({
      id: `mock-${requests.length}`,
      data: body.input.map((text, index) => ({ index, embedding: vectorFor(text) })),
      usage: { prompt_tokens: body.input.length, total_tokens: body.input.length },
    }),
  };
};
const embed = (input) => createNvidiaEmbeddings({ ...input, env, fetchImpl });
let clock = 0;
const report = await runNvidiaEmbeddingPoc({ embed, env, now: () => { clock += 2; return clock; } });
const dryRun = describeNvidiaEmbeddingPoc(env);
const defaultDryRun = describeNvidiaEmbeddingPoc({});

assert(requests.length === 2, 'PoC must use one document batch and one query batch');
assert(requests[0]?.url === 'https://example.test/v1/embeddings', 'PoC must call only the configured embeddings endpoint');
assert(requests[0]?.body?.input_type === 'passage', 'document embeddings must use passage input_type');
assert(requests[1]?.body?.input_type === 'query', 'query embeddings must use query input_type');
assert(requests.every((request) => request.body.modality === 'text'), 'PoC must identify all inputs as text');
assert(requests.every((request) => request.body.encoding_format === 'float'), 'PoC must request float embeddings');
assert(requests.every((request) => request.body.truncate === 'NONE'), 'PoC must reject silent truncation');
assert(requests.every((request) => request.authorization === 'Bearer test-key'), 'PoC must use server bearer authentication');
assert(requests.every((request) => !('dimensions' in request.body)), 'latest candidate must use its server default dimensions');
assert(!('NVIDIA_MODEL_ID' in env), 'embedding PoC must not require a chat model id');
assert(report.schemaVersion === 3, 'PoC report must use the expanded quality-audit schema');
assert(report.evaluationRevision === NVIDIA_POC_EVALUATION_REVISION, 'report must preserve evaluation revision');
assert(report.embedding.model === env.NVIDIA_EMBEDDING_MODEL_ID && report.embedding.dimension === 12, 'report must preserve model and dimension');
assert(report.embedding.modelTier === 'latest-candidate' && report.embedding.supportsKorean === null, 'report must preserve model policy metadata');
assert(report.corpus.count === 12 && report.corpus.sourceRefs === 36, 'PoC corpus size and sources must be explicit');
assert(report.corpus.caseCount === 16 && report.corpus.hardNegativeCount === 16, 'expanded cases and hard negatives must be explicit');
assert(report.corpus.queryTypes.join(',') === 'direct,semantic,multi-hop', 'all query types must be recorded');
assert(report.vectorOnly.segments.semantic.recallAtK >= 0.6, 'vector-only retrieval must prove semantic contribution');
assert(report.candidate.recallAtK >= 0.75 && report.candidate.mrr >= 0.7 && report.candidate.ndcgAtK >= 0.75, 'expanded mock retrieval must pass quality floors');
assert(report.candidate.hardNegativeRate <= 0.5, 'expanded mock retrieval must control hard-negative errors');
assert(report.gate.passed === true && report.gate.segmentGate.passed === true, 'PoC must pass global and segment gates');
assert(report.existingDbModified === false, 'PoC must not mutate the existing DB');
assert(dryRun.documentCount === 12 && dryRun.queryCount === 16 && dryRun.hardNegativeCount === 16, 'dry-run must expose expanded audit size');
assert(dryRun.requiresExplicitExecute === true && dryRun.writesExistingDb === false, 'dry-run must be safe by default');
assert(defaultDryRun.model === DEFAULT_NVIDIA_EMBEDDING_MODEL_ID && defaultDryRun.supportsKorean === true, 'dry-run default must select the approved Korean model');
assert(!JSON.stringify(report).includes('test-key'), 'PoC report must never contain the API key');

if (errors.length) {
  console.error(`✗ NVIDIA Embedding PoC verifier failed (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}
console.log(
  `✓ NVIDIA Embedding PoC verified · docs ${report.corpus.count} · cases ${report.corpus.caseCount} · `
  + `semantic vector Recall@3 ${report.vectorOnly.segments.semantic.recallAtK.toFixed(2)} · `
  + `hybrid Recall@3 ${report.candidate.recallAtK.toFixed(2)} · hard negative ${(report.candidate.hardNegativeRate * 100).toFixed(1)}%`,
);
