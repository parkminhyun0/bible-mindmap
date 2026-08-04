import crypto from 'node:crypto';

const ALLOWED_MODES = new Set(['off', 'shadow', 'pilot']);
const ALLOWED_FALLBACKS = new Set(['keyword-only']);

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw new TypeError(`invalid boolean value: ${value}`);
}

function parseNumber(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new TypeError(`invalid number value: ${value}`);
  return parsed;
}

export function hashPilotValue(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

export function resolveHybridProductionPilot(env = process.env) {
  const mode = env.BIBLE_MINDMAP_HYBRID_PILOT_MODE || 'off';
  if (!ALLOWED_MODES.has(mode)) throw new TypeError(`unsupported Hybrid pilot mode: ${mode}`);

  const config = Object.freeze({
    stage: 'P1-2d',
    mode,
    enabled: mode !== 'off',
    adminOnly: parseBoolean(env.BIBLE_MINDMAP_HYBRID_PILOT_ADMIN_ONLY, true),
    readOnly: parseBoolean(env.BIBLE_MINDMAP_HYBRID_PILOT_READ_ONLY, true),
    fallback: env.BIBLE_MINDMAP_HYBRID_PILOT_FALLBACK || 'keyword-only',
    rolloutPercent: parseNumber(env.BIBLE_MINDMAP_HYBRID_PILOT_PERCENT, 0),
    timeoutMs: parseNumber(env.BIBLE_MINDMAP_HYBRID_PILOT_TIMEOUT_MS, 250),
    logQueryText: parseBoolean(env.BIBLE_MINDMAP_HYBRID_PILOT_LOG_QUERY_TEXT, false),
    writesExistingDb: false,
    mutatesUserData: false,
    productionIndexWrite: false,
    immediateRollback: true,
    requiresHumanApproval: true,
  });

  if (!ALLOWED_FALLBACKS.has(config.fallback)) throw new Error('Hybrid pilot fallback must remain keyword-only');
  if (!config.adminOnly) throw new Error('Hybrid pilot must remain admin-only during P1-2d');
  if (!config.readOnly) throw new Error('Hybrid pilot must remain read-only during P1-2d');
  if (config.logQueryText) throw new Error('Hybrid pilot must not log raw query text');
  if (config.rolloutPercent < 0 || config.rolloutPercent > 5) throw new Error('Hybrid pilot rollout must remain between 0 and 5 percent');
  if (config.timeoutMs < 50 || config.timeoutMs > 250) throw new Error('Hybrid pilot timeout must remain between 50ms and 250ms');
  if (mode === 'pilot' && config.rolloutPercent <= 0) throw new Error('pilot mode requires a positive rollout percentage');
  return config;
}

function timeoutAfter(timeoutMs) {
  return new Promise((_, reject) => {
    const timer = setTimeout(() => reject(new Error('hybrid-pilot-timeout')), timeoutMs);
    timer.unref?.();
  });
}

function sanitizedTelemetry({ query, mode, selected, fallbackReason, baselineCount, candidateCount, elapsedMs }) {
  return Object.freeze({
    schemaVersion: 1,
    stage: 'P1-2d',
    mode,
    querySha256: hashPilotValue(query),
    selected,
    fallbackReason: fallbackReason || null,
    baselineCount,
    candidateCount,
    elapsedMs,
    rawQueryLogged: false,
    writesExistingDb: false,
    mutatesUserData: false,
  });
}

export async function runHybridProductionPilot({
  query,
  actor = {},
  config = resolveHybridProductionPilot(),
  keywordSearch,
  hybridSearch,
  now = () => performance.now(),
}) {
  if (typeof keywordSearch !== 'function' || typeof hybridSearch !== 'function') {
    throw new TypeError('keywordSearch and hybridSearch functions are required');
  }
  const startedAt = now();
  const baseline = await keywordSearch(query);
  if (config.mode === 'off') {
    return Object.freeze({
      results: baseline,
      telemetry: sanitizedTelemetry({ query, mode: 'off', selected: 'keyword-only', baselineCount: baseline.length, candidateCount: 0, elapsedMs: now() - startedAt }),
    });
  }

  const actorAllowed = actor.isAdmin === true && actor.pilotAllowed === true;
  if (!actorAllowed) {
    return Object.freeze({
      results: baseline,
      telemetry: sanitizedTelemetry({ query, mode: config.mode, selected: 'keyword-only', fallbackReason: 'actor-not-allowed', baselineCount: baseline.length, candidateCount: 0, elapsedMs: now() - startedAt }),
    });
  }

  let candidate = [];
  try {
    candidate = await Promise.race([hybridSearch(query), timeoutAfter(config.timeoutMs)]);
    if (!Array.isArray(candidate)) throw new TypeError('Hybrid pilot results must be an array');
  } catch (error) {
    return Object.freeze({
      results: baseline,
      telemetry: sanitizedTelemetry({ query, mode: config.mode, selected: 'keyword-only', fallbackReason: error?.message || 'hybrid-error', baselineCount: baseline.length, candidateCount: 0, elapsedMs: now() - startedAt }),
    });
  }

  const selectCandidate = config.mode === 'pilot';
  return Object.freeze({
    results: selectCandidate ? candidate : baseline,
    comparison: Object.freeze({ baseline, candidate }),
    telemetry: sanitizedTelemetry({
      query,
      mode: config.mode,
      selected: selectCandidate ? 'nvidia-hybrid-2048' : 'keyword-only',
      baselineCount: baseline.length,
      candidateCount: candidate.length,
      elapsedMs: now() - startedAt,
    }),
  });
}
