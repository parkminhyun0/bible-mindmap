import { CANONICAL_CONCEPTS, CONCEPT_CATEGORIES } from '../data/canonicalConcepts.js';

export const CANONICAL_SHADOW_EVENT = 'bible-mindmap:canonical-shadow-telemetry';
const SEARCH_PLACEHOLDER = '개념 검색';
const MIN_QUERY_LENGTH = 2;
const MIN_TIMEOUT_MS = 50;
const MAX_TIMEOUT_MS = 250;

function normalizeQuery(value) {
  return String(value || '').trim();
}

function getRuntimeOrigin(runtime) {
  return runtime?.location?.origin || 'https://local.invalid';
}

function isSameOriginEndpoint(endpoint, runtime) {
  try {
    const url = new URL(endpoint, getRuntimeOrigin(runtime));
    return url.origin === getRuntimeOrigin(runtime) && url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getCanonicalKeywordBaselineIds(query) {
  const normalized = normalizeQuery(query).toLowerCase();
  if (!normalized) return Object.keys(CANONICAL_CONCEPTS);
  return Object.entries(CANONICAL_CONCEPTS)
    .filter(([, concept]) => {
      const haystack = [
        concept.labelKo,
        concept.labelHe,
        concept.labelGr,
        CONCEPT_CATEGORIES[concept.category]?.ko,
      ].join(' ').toLowerCase();
      return haystack.includes(normalized);
    })
    .map(([id]) => id);
}

export function resolveCanonicalShadowRuntime(runtime = globalThis) {
  const raw = runtime?.__BIBLE_MINDMAP_HYBRID_PILOT__;
  if (!raw || raw.mode !== 'shadow') return Object.freeze({ enabled: false, reason: 'mode-off' });
  if (raw.serverSessionVerified !== true) return Object.freeze({ enabled: false, reason: 'server-session-unverified' });
  if (raw.actor?.isAdmin !== true || raw.actor?.pilotAllowed !== true) {
    return Object.freeze({ enabled: false, reason: 'actor-not-allowed' });
  }
  const timeoutMs = Number(raw.timeoutMs ?? 200);
  if (!Number.isFinite(timeoutMs) || timeoutMs < MIN_TIMEOUT_MS || timeoutMs > MAX_TIMEOUT_MS) {
    return Object.freeze({ enabled: false, reason: 'unsafe-timeout' });
  }
  const endpoint = String(raw.endpoint || '/api/search/canonical-shadow');
  if (!isSameOriginEndpoint(endpoint, runtime)) {
    return Object.freeze({ enabled: false, reason: 'endpoint-not-same-origin' });
  }
  return Object.freeze({
    enabled: true,
    mode: 'shadow',
    endpoint: new URL(endpoint, getRuntimeOrigin(runtime)).toString(),
    timeoutMs,
    readOnly: true,
    userVisiblePipeline: 'keyword-only',
  });
}

async function sha256(value, runtime = globalThis) {
  const bytes = new TextEncoder().encode(String(value || ''));
  const digest = await runtime.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function dispatchTelemetry(runtime, telemetry) {
  if (typeof runtime?.dispatchEvent !== 'function' || typeof runtime?.CustomEvent !== 'function') return;
  runtime.dispatchEvent(new runtime.CustomEvent(CANONICAL_SHADOW_EVENT, { detail: telemetry }));
}

function makeTelemetry({ querySha256, baselineIds, candidateIds, status, fallbackReason, elapsedMs }) {
  const baselineSet = new Set(baselineIds);
  const overlapCount = candidateIds.filter((id) => baselineSet.has(id)).length;
  return Object.freeze({
    schemaVersion: 1,
    stage: 'P1-2d-b',
    mode: 'shadow',
    selected: 'keyword-only',
    status,
    fallbackReason: fallbackReason || null,
    querySha256,
    rawQueryLogged: false,
    baselineCount: baselineIds.length,
    candidateCount: candidateIds.length,
    overlapCount,
    elapsedMs,
    readOnly: true,
    productionIndexWrite: false,
    mutatesUserData: false,
  });
}

export async function runCanonicalConceptShadowBridge({
  query,
  runtime = globalThis,
  fetchImpl = runtime.fetch?.bind(runtime),
  now = () => runtime.performance?.now?.() ?? Date.now(),
} = {}) {
  const normalized = normalizeQuery(query);
  const baselineIds = getCanonicalKeywordBaselineIds(normalized);
  const config = resolveCanonicalShadowRuntime(runtime);
  if (!config.enabled || normalized.length < MIN_QUERY_LENGTH || typeof fetchImpl !== 'function') {
    return Object.freeze({
      userVisibleIds: baselineIds,
      candidateIds: [],
      telemetry: null,
      skipped: true,
      reason: config.enabled ? 'query-too-short-or-fetch-unavailable' : config.reason,
    });
  }

  const startedAt = now();
  const querySha256 = await sha256(normalized, runtime);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('canonical-shadow-timeout'), config.timeoutMs);
  let candidateIds = [];
  let status = 'success';
  let fallbackReason = null;

  try {
    const response = await fetchImpl(config.endpoint, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'bible-mindmap-shadow',
      },
      body: JSON.stringify({
        mode: 'shadow',
        query: normalized,
        baselineIds,
        readOnly: true,
      }),
    });
    if (!response?.ok) throw new Error(`shadow-http-${response?.status || 'unknown'}`);
    const payload = await response.json();
    if (!Array.isArray(payload?.candidateIds) || payload.candidateIds.some((id) => typeof id !== 'string')) {
      throw new TypeError('shadow-invalid-response');
    }
    candidateIds = [...new Set(payload.candidateIds)];
  } catch (error) {
    status = 'fallback';
    fallbackReason = error?.name === 'AbortError' ? 'timeout' : String(error?.message || 'shadow-error');
    candidateIds = [];
  } finally {
    clearTimeout(timeout);
  }

  const telemetry = makeTelemetry({
    querySha256,
    baselineIds,
    candidateIds,
    status,
    fallbackReason,
    elapsedMs: Math.max(0, now() - startedAt),
  });
  dispatchTelemetry(runtime, telemetry);

  return Object.freeze({
    userVisibleIds: baselineIds,
    candidateIds,
    telemetry,
    skipped: false,
    reason: null,
  });
}

export function isCanonicalConceptSearchInput(target) {
  return target?.tagName === 'INPUT' && String(target.placeholder || '').startsWith(SEARCH_PLACEHOLDER);
}
