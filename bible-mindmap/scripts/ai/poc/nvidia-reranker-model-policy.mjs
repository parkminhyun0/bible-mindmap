export const NVIDIA_RERANKER_MODEL_POLICIES = Object.freeze([
  Object.freeze({
    id: 'nvidia/llama-nemotron-rerank-1b-v2',
    tier: 'primary-text-reranker',
    modality: 'text',
    endpoint: '/ranking',
    maxPassagesPerRequest: 50,
    truncate: 'NONE',
    source: 'https://build.nvidia.com/explore/retrieval',
    apiReference: 'https://docs.nvidia.com/nim/nemo-retriever/text-reranking/latest/use-the-api-openai.html',
  }),
]);

export const DEFAULT_NVIDIA_RERANKER_MODEL_ID = 'nvidia/llama-nemotron-rerank-1b-v2';

export function resolveNvidiaRerankerModelPolicy({ modelId } = {}) {
  const normalizedModelId = (modelId || DEFAULT_NVIDIA_RERANKER_MODEL_ID).trim();
  const policy = NVIDIA_RERANKER_MODEL_POLICIES.find((item) => item.id === normalizedModelId);
  if (!policy) {
    const allowed = NVIDIA_RERANKER_MODEL_POLICIES.map((item) => item.id).join(', ');
    throw new Error(`NVIDIA reranker model is not approved: ${normalizedModelId}. Allowed: ${allowed}`);
  }
  return policy;
}
