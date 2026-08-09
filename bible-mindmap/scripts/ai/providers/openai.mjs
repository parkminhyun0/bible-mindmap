// Node/server 전용 OpenAI provider adapter.
// 브라우저(src/)에서 import하거나 API 키를 VITE_* 변수로 노출하지 않는다.

const DEFAULT_BASE_URL = 'https://api.openai.com/v1'
const DEFAULT_TIMEOUT_MS = 45_000

export function loadOpenAiConfig(env = process.env) {
  const apiKey = env.OPENAI_API_KEY?.trim()
  const model = env.OPENAI_MODEL_ID?.trim()
  const baseUrl = (env.OPENAI_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '')
  const timeoutMs = Number(env.OPENAI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS)
  if (!apiKey) throw new Error('OPENAI_API_KEY is required in the server environment')
  if (!model) throw new Error('OPENAI_MODEL_ID is required in the server environment')
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 180_000) {
    throw new Error('OPENAI_TIMEOUT_MS must be between 1000 and 180000')
  }
  if (!baseUrl.startsWith('https://')) throw new Error('OPENAI_BASE_URL must use HTTPS')
  return { apiKey, model, baseUrl, timeoutMs }
}

function extractOutputText(body) {
  if (typeof body?.output_text === 'string' && body.output_text.trim()) return body.output_text
  const parts = []
  for (const item of body?.output || []) {
    if (item?.type !== 'message') continue
    for (const content of item.content || []) {
      if ((content?.type === 'output_text' || content?.type === 'text') && typeof content.text === 'string') parts.push(content.text)
    }
  }
  return parts.join('\n').trim()
}

export async function createOpenAiStructuredResponse({
  input,
  schema,
  schemaName = 'genesis_g2_lexicon_translation',
  maxOutputTokens = 8_000,
  requestId,
  fetchImpl = globalThis.fetch,
  env = process.env,
}) {
  if (!Array.isArray(input) || input.length === 0) throw new TypeError('input must be a non-empty array')
  if (!schema || typeof schema !== 'object') throw new TypeError('schema must be an object')
  if (typeof fetchImpl !== 'function') throw new Error('fetch is unavailable')
  const config = loadOpenAiConfig(env)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.timeoutMs)
  try {
    const response = await fetchImpl(`${config.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.apiKey}`,
        ...(requestId ? { 'x-client-request-id': requestId } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        input,
        text: { format: { type: 'json_schema', name: schemaName, schema, strict: true } },
        max_output_tokens: maxOutputTokens,
      }),
      signal: controller.signal,
    })
    const text = await response.text()
    let body
    try { body = text ? JSON.parse(text) : {} } catch { throw new Error(`OpenAI response was not JSON (HTTP ${response.status})`) }
    if (!response.ok) throw new Error(`OpenAI request failed: ${body?.error?.message || body?.message || `HTTP ${response.status}`}`)
    const content = extractOutputText(body)
    if (!content) throw new Error('OpenAI response did not contain output text')
    return {
      provider: 'openai',
      model: config.model,
      requestId: body?.id || requestId || null,
      content,
      usage: body?.usage || null,
      status: body?.status || null,
      raw: body,
    }
  } finally {
    clearTimeout(timer)
  }
}
