const MAX_QUERY_LENGTH = 300;
const DEFAULT_TIMEOUT_MS = 1800;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 30;
const buckets = new Map();

function json(res, status, body) {
  res.status(status).setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  return res.end(JSON.stringify(body));
}

function clientKey(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

function allowed(req) {
  const now = Date.now();
  const key = clientKey(req);
  const current = buckets.get(key);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    buckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= RATE_LIMIT;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return json(res, 200, {
      ok: true,
      enabled: process.env.NVIDIA_SEMANTIC_SEARCH_ENABLED === 'true',
      providerConfigured: Boolean(process.env.NVIDIA_API_KEY),
      mode: 'shadow',
      writeToProductionDb: false,
      rerankerEnabled: false,
    });
  }

  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method-not-allowed' });
  if (!allowed(req)) return json(res, 429, { ok: false, fallback: true, reason: 'rate-limit' });
  if (process.env.NVIDIA_SEMANTIC_SEARCH_ENABLED !== 'true') {
    return json(res, 503, { ok: false, fallback: true, reason: 'kill-switch-off' });
  }
  if (!process.env.NVIDIA_API_KEY) {
    return json(res, 503, { ok: false, fallback: true, reason: 'missing-server-credential' });
  }

  const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
  if (!query || query.length > MAX_QUERY_LENGTH) {
    return json(res, 400, { ok: false, fallback: true, reason: 'invalid-query' });
  }

  const endpoint = process.env.NVIDIA_EMBEDDING_ENDPOINT || 'https://integrate.api.nvidia.com/v1/embeddings';
  const model = process.env.NVIDIA_EMBEDDING_MODEL || 'nvidia/llama-nemotron-embed-1b-v2';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.NVIDIA_TIMEOUT_MS || DEFAULT_TIMEOUT_MS));
  const startedAt = Date.now();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model, input: [query], encoding_format: 'float' }),
      signal: controller.signal,
    });
    if (!response.ok) return json(res, 502, { ok: false, fallback: true, reason: 'provider-error', status: response.status });
    const payload = await response.json();
    const vector = payload?.data?.[0]?.embedding;
    if (!Array.isArray(vector) || vector.length !== 2048) {
      return json(res, 502, { ok: false, fallback: true, reason: 'dimension-mismatch' });
    }
    return json(res, 200, {
      ok: true,
      mode: 'shadow',
      model,
      dimension: vector.length,
      latencyMs: Date.now() - startedAt,
      embedding: vector,
      telemetry: { rawQueryStored: false, productionWrite: false, rerankerUsed: false },
    });
  } catch (error) {
    const reason = error?.name === 'AbortError' ? 'timeout' : 'provider-error';
    return json(res, 504, { ok: false, fallback: true, reason });
  } finally {
    clearTimeout(timeout);
  }
}
