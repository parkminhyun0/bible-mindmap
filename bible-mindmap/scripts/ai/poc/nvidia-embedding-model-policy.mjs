export const NVIDIA_EMBEDDING_MODEL_POLICIES = Object.freeze([
  Object.freeze({
    id: 'nvidia/llama-nemotron-embed-1b-v2',
    tier: 'primary-korean',
    supportsKorean: true,
    maxTokens: 8192,
    outputDimensions: Object.freeze([2048, 384]),
    requestDimensions: Object.freeze([2048, 384]),
    defaultRequestDimensions: 2048,
    recommendedDimensions: 2048,
    dimensionDecisionStatus: 'retain-full',
    dimensionDecisionRunId: 30842224158,
    dimensionDecisionEvidence: 'docs/evidence/nvidia-embedding-dimension-bakeoff-30842224158.json',
    source: 'https://build.nvidia.com/nvidia/llama-nemotron-embed-1b-v2/modelcard',
  }),
  Object.freeze({
    id: 'nvidia/nemotron-3-embed-1b',
    tier: 'latest-candidate',
    supportsKorean: null,
    maxTokens: null,
    outputDimensions: Object.freeze([]),
    requestDimensions: Object.freeze([]),
    defaultRequestDimensions: null,
    recommendedDimensions: null,
    dimensionDecisionStatus: 'not-evaluated',
    dimensionDecisionRunId: null,
    dimensionDecisionEvidence: null,
    source: 'https://build.nvidia.com/models?q=nemotron',
  }),
  Object.freeze({
    id: 'nvidia/nv-embedqa-e5-v5',
    tier: 'english-control',
    supportsKorean: false,
    maxTokens: 512,
    outputDimensions: Object.freeze([1024]),
    requestDimensions: Object.freeze([]),
    defaultRequestDimensions: null,
    recommendedDimensions: null,
    dimensionDecisionStatus: 'not-evaluated',
    dimensionDecisionRunId: null,
    dimensionDecisionEvidence: null,
    source: 'https://build.nvidia.com/nvidia/nv-embedqa-e5-v5/modelcard',
  }),
]);

export const DEFAULT_NVIDIA_EMBEDDING_MODEL_ID = 'nvidia/llama-nemotron-embed-1b-v2';

export function resolveNvidiaEmbeddingModelPolicy({ modelId, dimensions } = {}) {
  const normalizedModelId = (modelId || DEFAULT_NVIDIA_EMBEDDING_MODEL_ID).trim();
  const policy = NVIDIA_EMBEDDING_MODEL_POLICIES.find((item) => item.id === normalizedModelId);
  if (!policy) {
    const allowed = NVIDIA_EMBEDDING_MODEL_POLICIES.map((item) => item.id).join(', ');
    throw new Error(`NVIDIA embedding model is not approved for PoC: ${normalizedModelId}. Allowed: ${allowed}`);
  }

  const normalizedDimensions = dimensions == null || String(dimensions).trim() === '' || String(dimensions).trim() === 'auto'
    ? policy.defaultRequestDimensions
    : Number(dimensions);

  if (normalizedDimensions != null) {
    if (!Number.isInteger(normalizedDimensions) || normalizedDimensions < 1) {
      throw new Error('NVIDIA_EMBEDDING_DIMENSIONS must be a positive integer or auto');
    }
    if (!policy.requestDimensions.includes(normalizedDimensions)) {
      const supported = policy.requestDimensions.length ? policy.requestDimensions.join(', ') : 'none';
      throw new Error(`${policy.id} does not accept requested dimensions ${normalizedDimensions}; supported request dimensions: ${supported}`);
    }
  }

  return Object.freeze({
    ...policy,
    requestedDimensions: normalizedDimensions,
  });
}
