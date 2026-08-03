import { loadNvidiaTransportConfig } from './nvidia.mjs';
import { normalizeEmbeddingResult, validateEmbeddingInput } from '../retrieval/embedding-contract.mjs';

export async function createNvidiaEmbeddings({ texts, task = 'document', requestId, fetchImpl = globalThis.fetch, env = process.env }) {
  if (typeof fetchImpl !== 'function') throw new Error('fetch is unavailable');
  const input = validateEmbeddingInput({ texts, task });
  const config = loadNvidiaTransportConfig(env);
  const model = env.NVIDIA_EMBEDDING_MODEL_ID?.trim();
  if (!model) throw new Error('NVIDIA_EMBEDDING_MODEL_ID is required in the server environment');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetchImpl(`${config.baseUrl}/embeddings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}`, ...(requestId ? { 'x-request-id': requestId } : {}) },
      body: JSON.stringify({ model, input: input.texts, input_type: input.task === 'query' ? 'query' : 'passage', encoding_format: 'float', truncate: 'NONE' }),
      signal: controller.signal,
    });
    const text = await response.text();
    let body;
    try { body = text ? JSON.parse(text) : {}; } catch { throw new Error(`NVIDIA embedding response was not JSON (HTTP ${response.status})`); }
    if (!response.ok) throw new Error(`NVIDIA embedding request failed: ${body?.error?.message || body?.message || `HTTP ${response.status}`}`);
    const vectors = Array.isArray(body?.data) ? [...body.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map((item) => item.embedding) : null;
    if (!vectors || vectors.length !== input.texts.length) throw new Error('NVIDIA embedding response count did not match input count');
    return normalizeEmbeddingResult({ provider: 'nvidia', model, task: input.task, vectors, requestId: body?.id || requestId || null, usage: body?.usage || null });
  } finally { clearTimeout(timer); }
}
