import crypto from 'node:crypto';

const DEFAULT_MODEL = 'nvidia/llama-nemotron-embed-1b-v2';
const DEFAULT_URL = 'https://integrate.api.nvidia.com/v1/embeddings';
const MAX_QUERY_LENGTH = 240;
const MAX_BASELINE_IDS = 72;
const MAX_CANDIDATES = 10;

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...headers,
    },
  });
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function parseCsv(value) {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function safeInteger(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function resolveCanonicalShadowServerConfig(env = process.env) {
  const enabled = env.BIBLE_MINDMAP_SHADOW_SERVER_ENABLED === 'true';
  const killSwitch = env.BIBLE_MINDMAP_SHADOW_KILL_SWITCH !== 'false';
  const adminIds = new Set(parseCsv(env.BIBLE_MINDMAP_SHADOW_ADMIN_IDS));
  const rateLimitPerMinute = safeInteger(env.BIBLE_MINDMAP_SHADOW_RATE_LIMIT_PER_MINUTE, 12, 1, 60);
  const dailyRequestLimit = safeInteger(env.BIBLE_MINDMAP_SHADOW_DAILY_REQUEST_LIMIT, 250, 1, 5000);
  const timeoutMs = safeInteger(env.BIBLE_MINDMAP_SHADOW_TIMEOUT_MS, 220, 50, 250);
  const model = env.NVIDIA_EMBEDDING_MODEL || DEFAULT_MODEL;
  const endpoint = env.NVIDIA_EMBEDDING_URL || DEFAULT_URL;

  if (!endpoint.startsWith('https://')) throw new Error('NVIDIA embedding endpoint must use HTTPS');
  if (enabled && !killSwitch && adminIds.size === 0) throw new Error('enabled shadow endpoint requires an administrator allowlist');

  return Object.freeze({
    stage: 'P1-2d-c',
    enabled,
    killSwitch,
    adminIds,
    rateLimitPerMinute,
    dailyRequestLimit,
    timeoutMs,
    model,
    endpoint,
    readOnly: true,
    writesExistingDb: false,
    productionIndexWrite: false,
    logRawQuery: false,
  });
}

function validatePayload(payload) {
  if (!payload || payload.mode !== 'shadow' || payload.readOnly !== true) return 'invalid-shadow-contract';
  const query = String(payload.query || '').trim();
  if (query.length < 2 || query.length > MAX_QUERY_LENGTH) return 'invalid-query';
  if (!Array.isArray(payload.baselineIds) || payload.baselineIds.length > MAX_BASELINE_IDS) return 'invalid-baseline';
  if (payload.baselineIds.some((id) => typeof id !== 'string' || id.length > 120)) return 'invalid-baseline';
  return null;
}

async function readJson(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) throw new Error('unsupported-content-type');
  return request.json();
}

async function callNvidiaEmbedding({ query, apiKey, config, fetchImpl }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetchImpl(config.endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        input: [query],
        input_type: 'query',
        encoding_format: 'float',
        dimensions: 2048,
        truncate: 'NONE',
      }),
    });
    if (!response.ok) throw new Error(`nvidia-http-${response.status}`);
    const payload = await response.json();
    const vector = payload?.data?.[0]?.embedding;
    if (!Array.isArray(vector) || vector.length !== 2048 || vector.some((value) => !Number.isFinite(value))) {
      throw new Error('nvidia-invalid-vector');
    }
    return { vector, usage: payload?.usage || null };
  } finally {
    clearTimeout(timeout);
  }
}

export function createCanonicalShadowEndpoint({
  env = process.env,
  authenticate,
  rateLimiter,
  dailyBudget,
  searchHybrid,
  telemetrySink = async () => {},
  fetchImpl = fetch,
  now = () => Date.now(),
} = {}) {
  if (typeof authenticate !== 'function') throw new TypeError('authenticate adapter is required');
  if (typeof rateLimiter !== 'function') throw new TypeError('rateLimiter adapter is required');
  if (typeof dailyBudget !== 'function') throw new TypeError('dailyBudget adapter is required');
  if (typeof searchHybrid !== 'function') throw new TypeError('searchHybrid adapter is required');

  const config = resolveCanonicalShadowServerConfig(env);

  return async function canonicalShadowEndpoint(request) {
    const startedAt = now();
    const requestId = crypto.randomUUID();
    const responseHeaders = { 'x-request-id': requestId };

    if (request.method !== 'POST') return json({ error: 'method-not-allowed' }, 405, { ...responseHeaders, allow: 'POST' });
    if (!config.enabled || config.killSwitch) return json({ error: 'shadow-disabled' }, 503, responseHeaders);

    const actor = await authenticate(request);
    const actorId = String(actor?.id || '');
    if (!actor?.serverSessionVerified || !actor?.isAdmin || !actor?.pilotAllowed || !config.adminIds.has(actorId)) {
      return json({ error: 'forbidden' }, 403, responseHeaders);
    }

    const minuteAllowed = await rateLimiter({ actorHash: hash(actorId), limit: config.rateLimitPerMinute, windowSeconds: 60 });
    if (!minuteAllowed) return json({ error: 'rate-limited' }, 429, { ...responseHeaders, 'retry-after': '60' });
    const dailyAllowed = await dailyBudget({ actorHash: hash(actorId), limit: config.dailyRequestLimit });
    if (!dailyAllowed) return json({ error: 'daily-budget-exceeded' }, 429, responseHeaders);

    let payload;
    try {
      payload = await readJson(request);
    } catch (error) {
      return json({ error: error?.message || 'invalid-json' }, 400, responseHeaders);
    }
    const payloadError = validatePayload(payload);
    if (payloadError) return json({ error: payloadError }, 400, responseHeaders);

    const apiKey = env.NVIDIA_API_KEY;
    if (!apiKey) return json({ error: 'provider-unavailable' }, 503, responseHeaders);

    const query = String(payload.query).trim();
    let candidateIds = [];
    let providerUsage = null;
    let status = 'success';
    let fallbackReason = null;

    try {
      const embedding = await callNvidiaEmbedding({ query, apiKey, config, fetchImpl });
      providerUsage = embedding.usage;
      const results = await searchHybrid({ queryVector: embedding.vector, query, limit: MAX_CANDIDATES, readOnly: true });
      if (!Array.isArray(results)) throw new Error('invalid-search-results');
      candidateIds = [...new Set(results.map((item) => typeof item === 'string' ? item : item?.id).filter(Boolean))].slice(0, MAX_CANDIDATES);
    } catch (error) {
      status = 'fallback';
      fallbackReason = error?.name === 'AbortError' ? 'provider-timeout' : String(error?.message || 'shadow-error');
    }

    const telemetry = Object.freeze({
      schemaVersion: 1,
      stage: 'P1-2d-c',
      requestId,
      actorSha256: hash(actorId),
      querySha256: hash(query),
      rawQueryLogged: false,
      status,
      fallbackReason,
      baselineCount: payload.baselineIds.length,
      candidateCount: candidateIds.length,
      elapsedMs: Math.max(0, now() - startedAt),
      providerUsage,
      readOnly: true,
      writesExistingDb: false,
      productionIndexWrite: false,
    });

    await telemetrySink(telemetry);

    if (status !== 'success') return json({ candidateIds: [], status, fallbackReason }, 200, responseHeaders);
    return json({ candidateIds, status: 'success' }, 200, responseHeaders);
  };
}
