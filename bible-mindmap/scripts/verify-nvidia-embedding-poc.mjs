import { createNvidiaEmbeddings } from './ai/providers/nvidia-embeddings.mjs';
import { describeNvidiaEmbeddingPoc, runNvidiaEmbeddingPoc } from './ai/poc/nvidia-embedding-poc.mjs';
import { DEFAULT_NVIDIA_EMBEDDING_MODEL_ID } from './ai/poc/nvidia-embedding-model-policy.mjs';

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const env = { NVIDIA_API_KEY: 'test-key', NVIDIA_BASE_URL: 'https://example.test/v1', NVIDIA_TIMEOUT_MS: '3000', NVIDIA_EMBEDDING_MODEL_ID: 'nvidia/nemotron-3-embed-1b' };
const requests = [];
const vectorFor = (text) => {
  const vector = Array(8).fill(0);
  if (/아브라함|후손|약속/.test(text)) vector[0] = 1;
  else if (/다윗|왕|보좌/.test(text)) vector[1] = 1;
  else if (/성막|성전|임재|예루살렘/.test(text)) vector[2] = 1;
  else if (/유월절|출애굽|구속/.test(text)) vector[3] = 1;
  else vector[7] = 1;
  return vector;
};
const fetchImpl = async (url, options) => {
  const body = JSON.parse(options.body);
  requests.push({ url, body, authorization: options.headers.authorization });
  return { ok: true, status: 200, text: async () => JSON.stringify({ id: `mock-${requests.length}`, data: body.input.map((text, index) => ({ index, embedding: vectorFor(text) })), usage: { prompt_tokens: body.input.length, total_tokens: body.input.length } }) };
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
assert(report.schemaVersion === 2, 'PoC report must use the model-policy-aware schema');
assert(report.embedding.model === env.NVIDIA_EMBEDDING_MODEL_ID && report.embedding.dimension === 8, 'report must preserve model and dimension');
assert(report.embedding.modelTier === 'latest-candidate' && report.embedding.supportsKorean === null, 'report must preserve model policy metadata');
assert(report.corpus.count === 4 && report.corpus.sourceRefs === 12, 'PoC corpus size and sources must be explicit');
assert(report.candidate.recallAtK === 1 && report.candidate.mrr === 1 && report.candidate.ndcgAtK === 1, 'mock PoC retrieval metrics must equal 1');
assert(report.gate.passed === true && report.existingDbModified === false, 'PoC must pass quality gate without DB mutation');
assert(dryRun.requiresExplicitExecute === true && dryRun.writesExistingDb === false, 'dry-run must be safe by default');
assert(defaultDryRun.model === DEFAULT_NVIDIA_EMBEDDING_MODEL_ID && defaultDryRun.supportsKorean === true, 'dry-run default must select the approved Korean model');
assert(!JSON.stringify(report).includes('test-key'), 'PoC report must never contain the API key');

if (errors.length) { console.error(`✗ NVIDIA Embedding PoC verifier failed (${errors.length})`); errors.forEach((error) => console.error(`  - ${error}`)); process.exit(1); }
console.log(`✓ NVIDIA Embedding PoC verified · requests ${requests.length} · model ${report.embedding.model} · Recall@3 ${report.candidate.recallAtK.toFixed(2)} · DB mutation none`);
