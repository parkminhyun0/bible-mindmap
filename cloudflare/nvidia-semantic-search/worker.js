const ALLOWED_ORIGINS = new Set([
  'https://parkminhyun0.github.io',
]);

const NVIDIA_ENDPOINT = 'https://integrate.api.nvidia.com/v1/embeddings';
const NVIDIA_MODEL = 'nvidia/llama-nemotron-embed-1b-v2';
const MAX_CANDIDATES = 12;
const MAX_TEXT_LENGTH = 1800;

function corsHeaders(origin) {
  const allowedOrigin = ALLOWED_ORIGINS.has(origin)
    ? origin
    : 'https://parkminhyun0.github.io';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(origin),
  });
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) {
    return null;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const av = Number(a[index]);
    const bv = Number(b[index]);
    if (!Number.isFinite(av) || !Number.isFinite(bv)) return null;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (normA === 0 || normB === 0) return null;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function requestEmbeddings(apiKey, input, inputType) {
  const response = await fetch(NVIDIA_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      input,
      input_type: inputType,
      encoding_format: 'float',
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error('nvidia-request-failed');
    error.status = response.status;
    error.detail = payload?.detail || payload?.message || null;
    throw error;
  }

  const embeddings = Array.isArray(payload?.data)
    ? payload.data.map((item) => item?.embedding)
    : [];

  if (embeddings.length !== input.length || embeddings.some((vector) => !Array.isArray(vector))) {
    throw new Error('invalid-nvidia-response');
  }

  return { embeddings, model: payload.model || NVIDIA_MODEL };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/') {
      return json({
        ok: true,
        service: 'bible-mindmap-nvidia-search',
        provider: 'NVIDIA',
        model: NVIDIA_MODEL,
        endpoints: ['/compare'],
      }, 200, origin);
    }

    if (request.method !== 'POST' || url.pathname !== '/compare') {
      return json({ ok: false, reason: 'not-found' }, 404, origin);
    }

    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return json({ ok: false, reason: 'origin-not-allowed' }, 403, origin);
    }

    if (!env.NVIDIA_API_KEY) {
      return json({ ok: false, reason: 'missing-nvidia-api-key' }, 500, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, reason: 'invalid-json' }, 400, origin);
    }

    const query = String(body?.query || '').trim();
    const rawCandidates = Array.isArray(body?.candidates) ? body.candidates : [];
    const limit = Math.min(Math.max(Number(body?.limit) || 8, 1), MAX_CANDIDATES);

    if (query.length < 2 || query.length > 500) {
      return json({ ok: false, reason: 'invalid-query-length' }, 400, origin);
    }

    const candidates = rawCandidates
      .slice(0, MAX_CANDIDATES)
      .map((item) => ({
        id: String(item?.id || '').trim(),
        text: String(item?.text || '').trim().slice(0, MAX_TEXT_LENGTH),
      }))
      .filter((item) => item.id && item.text);

    if (candidates.length === 0) {
      return json({ ok: false, reason: 'missing-candidates' }, 400, origin);
    }

    const startedAt = Date.now();

    try {
      const [queryResult, passageResult] = await Promise.all([
        requestEmbeddings(env.NVIDIA_API_KEY, [query], 'query'),
        requestEmbeddings(env.NVIDIA_API_KEY, candidates.map((item) => item.text), 'passage'),
      ]);

      const queryVector = queryResult.embeddings[0];
      const ranked = candidates
        .map((candidate, index) => ({
          id: candidate.id,
          score: cosineSimilarity(queryVector, passageResult.embeddings[index]),
        }))
        .filter((item) => Number.isFinite(item.score))
        .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
        .slice(0, limit)
        .map((item, index) => ({
          ...item,
          rank: index + 1,
          score: Number(item.score.toFixed(6)),
        }));

      return json({
        ok: true,
        provider: 'NVIDIA',
        model: queryResult.model,
        dimensions: queryVector.length,
        latencyMs: Date.now() - startedAt,
        candidates: ranked,
      }, 200, origin);
    } catch (error) {
      return json({
        ok: false,
        reason: error?.message || 'worker-request-failed',
        status: error?.status || null,
        detail: error?.detail || null,
      }, error?.status ? 502 : 500, origin);
    }
  },
};
