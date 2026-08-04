import { loadNvidiaTransportConfig } from './nvidia.mjs';
import { normalizeRerankerResult } from '../retrieval/reranker-contract.mjs';
import {
  resolveNvidiaRerankerEndpoint,
  resolveNvidiaRerankerModelPolicy,
} from '../poc/nvidia-reranker-model-policy.mjs';

function validateRequest({ query, passages }, maxPassages) {
  if (typeof query !== 'string' || !query.trim()) throw new TypeError('reranker query must be non-empty');
  if (!Array.isArray(passages) || passages.length === 0) throw new TypeError('reranker passages must be a non-empty array');
  if (passages.length > maxPassages) throw new RangeError(`reranker passages may contain at most ${maxPassages} items`);
  return {
    query: query.trim(),
    passages: passages.map((passage, index) => {
      if (!passage || typeof passage !== 'object') throw new TypeError(`passages[${index}] must be an object`);
      const text = String(passage.text || '').trim();
      if (!text) throw new TypeError(`passages[${index}].text is required`);
      return Object.freeze({ id: String(passage.id || index), text });
    }),
  };
}

export async function createNvidiaReranking({
  query,
  passages,
  requestId,
  fetchImpl = globalThis.fetch,
  env = process.env,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('fetch is unavailable');
  const transport = loadNvidiaTransportConfig(env);
  const policy = resolveNvidiaRerankerModelPolicy({ modelId: env.NVIDIA_RERANKER_MODEL_ID });
  const endpoint = resolveNvidiaRerankerEndpoint({ modelId: policy.id, env });
  const input = validateRequest({ query, passages }, policy.maxPassagesPerRequest);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), transport.timeoutMs);
  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${transport.apiKey}`,
        ...(requestId ? { 'x-request-id': requestId } : {}),
      },
      body: JSON.stringify({
        model: policy.id,
        query: { text: input.query },
        passages: input.passages.map((passage) => ({ text: passage.text })),
        truncate: policy.truncate,
      }),
      signal: controller.signal,
    });
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`NVIDIA reranker response was not JSON (HTTP ${response.status})`);
    }
    if (!response.ok) {
      throw new Error(`NVIDIA reranker request failed: ${body?.error?.message || body?.message || `HTTP ${response.status}`}`);
    }
    return normalizeRerankerResult({
      provider: 'nvidia',
      model: policy.id,
      rankings: body?.rankings,
      requestId: body?.id || requestId || null,
      usage: body?.usage || null,
    }, input.passages.length);
  } finally {
    clearTimeout(timer);
  }
}
