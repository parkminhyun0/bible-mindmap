// Node/server 전용 NVIDIA provider adapter.
// 브라우저(src/)에서 import하거나 API 키를 VITE_* 변수로 노출하지 않는다.

const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_TIMEOUT_MS = 30_000;

export function loadNvidiaConfig(env = process.env) {
  const apiKey = env.NVIDIA_API_KEY?.trim();
  const model = env.NVIDIA_MODEL_ID?.trim();
  const baseUrl = (env.NVIDIA_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
  const timeoutMs = Number(env.NVIDIA_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

  if (!apiKey) throw new Error('NVIDIA_API_KEY is required in the server environment');
  if (!model) throw new Error('NVIDIA_MODEL_ID is required in the server environment');
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000) {
    throw new Error('NVIDIA_TIMEOUT_MS must be between 1000 and 120000');
  }
  if (!baseUrl.startsWith('https://')) throw new Error('NVIDIA_BASE_URL must use HTTPS');

  return { apiKey, model, baseUrl, timeoutMs };
}

export async function createNvidiaChatCompletion({
  messages,
  temperature = 0.1,
  maxTokens = 1200,
  requestId,
  fetchImpl = globalThis.fetch,
  env = process.env,
}) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new TypeError('messages must be a non-empty array');
  }
  if (typeof fetchImpl !== 'function') throw new Error('fetch is unavailable');

  const config = loadNvidiaConfig(env);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.apiKey}`,
        ...(requestId ? { 'x-request-id': requestId } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: controller.signal,
    });

    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`NVIDIA response was not JSON (HTTP ${response.status})`);
    }

    if (!response.ok) {
      const detail = body?.error?.message || body?.message || `HTTP ${response.status}`;
      throw new Error(`NVIDIA request failed: ${detail}`);
    }

    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('NVIDIA response did not contain message content');
    }

    return {
      provider: 'nvidia',
      model: config.model,
      requestId: body?.id || requestId || null,
      content,
      usage: body?.usage || null,
      raw: body,
    };
  } finally {
    clearTimeout(timer);
  }
}
