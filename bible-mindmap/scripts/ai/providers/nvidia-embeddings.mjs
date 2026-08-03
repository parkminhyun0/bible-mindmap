import { loadNvidiaTransportConfig } from './nvidia.mjs';
import { normalizeEmbeddingResult, validateEmbeddingInput } from '../retrieval/embedding-contract.mjs';
import { resolveNvidiaEmbeddingModelPolicy } from '../poc/nvidia-embedding-model-policy.mjs';

export async function createNvidiaEmbeddings({ texts, task = 'document', requestId, fetchImpl = globalThis.fetch, env = process.env }) {
  if (typeof fetchImpl !== 'function') throw new Error('fetch is unavailable');
  const input = validateEmbeddingInput({ texts, task });
  const config = loadNvidiaTransportConfig(env);
  const policy = resolveNvidiaEmbeddingModelPolicy({
    modelId: env.NVIDIA_EMBEDDING_MODEL_ID,
    dimensions: env.NVIDIA_EMBEDDING_DIMENSIONS,
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const body = {
      model: policy.id,
      input: input.texts,
      input_type: input.task === 'query' ? 'query' : 'passage',
      modality: 'text',
      encoding_format: 'float',
      truncate: 'NONE',
      ...(policy.requestedDimensions ? { dimensions: policy.requestedDimensions } : {}),
    };
    const response = await fetchImpl(`${config.baseUrl}/embeddings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}`, ...(requestId ? { 'x-request-id': requestId } : {}) },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let responseBody;
    try { responseBody = text ? JSON.parse(text) : {}; } catch { throw new Error(`NVIDIA embedding response was not JSON (HTTP ${response.status})`); }
    if (!response.ok) throw new Error(`NVIDIA embedding request failed: ${responseBody?.error?.message || responseBody?.message || `HTTP ${response.status}`}`);
    const vectors = Array.isArray(responseBody?.data) ? [...responseBody.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map((item) => item.embedding) : null;
    if (!vectors || vectors.length !== input.texts.length) throw new Error('NVIDIA embedding response count did not match input count');
    return normalizeEmbeddingResult({ provider: 'nvidia', model: policy.id, task: input.task, vectors, requestId: responseBody?.id || requestId || null, usage: responseBody?.usage || null });
  } finally { clearTimeout(timer); }
}
