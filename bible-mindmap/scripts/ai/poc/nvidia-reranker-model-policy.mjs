export const NVIDIA_RERANKER_MODEL_POLICIES = Object.freeze([
  Object.freeze({
    id: 'nvidia/llama-nemotron-rerank-1b-v2',
    tier: 'primary-text-reranker',
    modality: 'text',
    hostedEndpoint: 'https://ai.api.nvidia.com/v1/retrieval/nvidia/llama-nemotron-rerank-1b-v2/reranking',
    selfHostedEndpoint: '/ranking',
    maxPassagesPerRequest: 50,
    truncate: 'NONE',
    evaluationAllowed: true,
    productionEligible: false,
    source: 'https://build.nvidia.com/explore/retrieval',
    apiReference: 'https://docs.nvidia.com/nim/nemo-retriever/text-reranking/latest/use-the-api-openai.html',
    hostedApiReference: 'https://docs.nvidia.com/nemo/retriever/26.5.0/reference/retriever-cli-quickstart/',
  }),
]);

export const DEFAULT_NVIDIA_RERANKER_MODEL_ID = 'nvidia/llama-nemotron-rerank-1b-v2';

export const NVIDIA_RERANKER_EVALUATION_DECISION = Object.freeze({
  runId: 30865836689,
  status: 'hold-production',
  selectedPipeline: 'nvidia-hybrid-2048',
  evaluatedModel: DEFAULT_NVIDIA_RERANKER_MODEL_ID,
  evidencePath: 'docs/evidence/nvidia-reranker-poc-30865836689.json',
  productionRerankerActivated: false,
  requiresFutureReevaluationForActivation: true,
  reason: 'The real hosted reranker regressed recall, nDCG, hard-negative control, multi-hop retrieval, and latency versus the audited 2048-dimensional Hybrid baseline.',
});

export function resolveNvidiaRerankerModelPolicy({ modelId } = {}) {
  const normalizedModelId = (modelId || DEFAULT_NVIDIA_RERANKER_MODEL_ID).trim();
  const policy = NVIDIA_RERANKER_MODEL_POLICIES.find((item) => item.id === normalizedModelId);
  if (!policy) {
    const allowed = NVIDIA_RERANKER_MODEL_POLICIES.map((item) => item.id).join(', ');
    throw new Error(`NVIDIA reranker model is not approved: ${normalizedModelId}. Allowed: ${allowed}`);
  }
  return policy;
}

export function resolveNvidiaRerankerEndpoint({ modelId, env = process.env } = {}) {
  const policy = resolveNvidiaRerankerModelPolicy({ modelId });
  const configured = env.NVIDIA_RERANKER_URL?.trim() || policy.hostedEndpoint;
  let endpoint;
  try {
    endpoint = new URL(configured);
  } catch {
    throw new Error('NVIDIA_RERANKER_URL must be an absolute URL');
  }
  const loopbackHttp = endpoint.protocol === 'http:'
    && ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname);
  if (endpoint.protocol !== 'https:' && !loopbackHttp) {
    throw new Error('NVIDIA_RERANKER_URL must use HTTPS, except for loopback development');
  }
  if (endpoint.username || endpoint.password) {
    throw new Error('NVIDIA_RERANKER_URL must not contain credentials');
  }
  return endpoint.toString().replace(/\/$/, '');
}
