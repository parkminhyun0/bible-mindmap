import {
  CANONICAL_SHADOW_EVENT,
  getCanonicalKeywordBaselineIds,
  resolveCanonicalShadowRuntime,
  runCanonicalConceptShadowBridge,
} from '../src/search/canonicalConceptShadowBridge.js';

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

class TestCustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
}

function makeRuntime(config) {
  const events = [];
  return {
    __BIBLE_MINDMAP_HYBRID_PILOT__: config,
    location: { origin: 'https://example.test' },
    crypto: globalThis.crypto,
    performance: { now: () => 10 },
    CustomEvent: TestCustomEvent,
    dispatchEvent(event) { events.push(event); },
    events,
  };
}

const baseline = getCanonicalKeywordBaselineIds('성전');
assert(baseline.length > 0, 'keyword baseline must resolve approved canonical concepts');

const disabled = resolveCanonicalShadowRuntime(makeRuntime(undefined));
assert(disabled.enabled === false && disabled.reason === 'mode-off', 'bridge must default to disabled');

const spoofed = resolveCanonicalShadowRuntime(makeRuntime({
  mode: 'shadow',
  serverSessionVerified: false,
  actor: { isAdmin: true, pilotAllowed: true },
  endpoint: '/api/search/canonical-shadow',
}));
assert(spoofed.enabled === false && spoofed.reason === 'server-session-unverified', 'client-only admin flag must not enable shadow bridge');

const crossOrigin = resolveCanonicalShadowRuntime(makeRuntime({
  mode: 'shadow',
  serverSessionVerified: true,
  actor: { isAdmin: true, pilotAllowed: true },
  endpoint: 'https://other.example/search',
  timeoutMs: 200,
}));
assert(crossOrigin.enabled === false && crossOrigin.reason === 'endpoint-not-same-origin', 'bridge must reject cross-origin endpoints');

let request = null;
let clock = 0;
const runtime = makeRuntime({
  mode: 'shadow',
  serverSessionVerified: true,
  actor: { isAdmin: true, pilotAllowed: true },
  endpoint: '/api/search/canonical-shadow',
  timeoutMs: 200,
});
const fetchImpl = async (url, init) => {
  request = { url, init };
  return {
    ok: true,
    status: 200,
    async json() { return { candidateIds: ['temple', 'covenant', 'temple'] }; },
  };
};
const success = await runCanonicalConceptShadowBridge({
  query: '성전',
  runtime,
  fetchImpl,
  now: () => { clock += 5; return clock; },
});
assert(success.skipped === false, 'approved server session must execute shadow request');
assert(success.userVisibleIds.join('|') === baseline.join('|'), 'shadow bridge must preserve keyword-only visible results');
assert(success.candidateIds.length === 2, 'shadow bridge must deduplicate candidate IDs');
assert(success.telemetry.selected === 'keyword-only', 'shadow telemetry must keep keyword-only selected');
assert(success.telemetry.rawQueryLogged === false, 'shadow telemetry must not contain raw query text');
assert(success.telemetry.querySha256.length === 64, 'shadow telemetry must hash query with SHA-256');
assert(runtime.events.length === 1 && runtime.events[0].type === CANONICAL_SHADOW_EVENT, 'shadow telemetry event must be emitted once');
assert(request.url === 'https://example.test/api/search/canonical-shadow', 'shadow endpoint must resolve to same origin');
assert(request.init.credentials === 'same-origin', 'shadow request must use same-origin credentials');
assert(request.init.cache === 'no-store', 'shadow request must disable cache');
assert(!Object.keys(request.init.headers).some((name) => /authorization|api[-_]?key/i.test(name)), 'browser request must not contain NVIDIA credentials');
const body = JSON.parse(request.init.body);
assert(body.mode === 'shadow' && body.readOnly === true, 'shadow request must remain read-only');
assert(Array.isArray(body.baselineIds) && body.baselineIds.length === baseline.length, 'shadow request must include baseline IDs for comparison');

const failureRuntime = makeRuntime({
  mode: 'shadow',
  serverSessionVerified: true,
  actor: { isAdmin: true, pilotAllowed: true },
  endpoint: '/api/search/canonical-shadow',
  timeoutMs: 200,
});
const failure = await runCanonicalConceptShadowBridge({
  query: '언약',
  runtime: failureRuntime,
  fetchImpl: async () => { throw new Error('service-unavailable'); },
  now: () => 20,
});
assert(failure.userVisibleIds.length > 0, 'shadow failure must preserve keyword baseline');
assert(failure.candidateIds.length === 0, 'shadow failure must discard candidate results');
assert(failure.telemetry.status === 'fallback', 'shadow failure must be recorded as fallback');
assert(failure.telemetry.fallbackReason === 'service-unavailable', 'shadow failure reason mismatch');
assert(failure.telemetry.productionIndexWrite === false, 'shadow telemetry must preserve no-index-write boundary');

if (errors.length) {
  console.error(`✗ Canonical concept shadow bridge verification failed (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log('✓ Canonical concept shadow bridge verified · server-approved admin only · same-origin · keyword-visible · sanitized telemetry · fallback safe');
