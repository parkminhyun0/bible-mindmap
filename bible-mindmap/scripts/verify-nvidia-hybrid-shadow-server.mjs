import {
  createCanonicalShadowEndpoint,
  resolveCanonicalShadowServerConfig,
} from '../server/hybrid-shadow/canonical-shadow-endpoint.mjs';

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const disabled = resolveCanonicalShadowServerConfig({});
assert(disabled.enabled === false, 'server must default disabled');
assert(disabled.killSwitch === true, 'kill switch must default active');
assert(disabled.readOnly === true, 'server must remain read-only');
assert(disabled.writesExistingDb === false, 'server must not write existing DB');
assert(disabled.productionIndexWrite === false, 'server must not write production index');
assert(disabled.logRawQuery === false, 'server must not log raw query');

const baseEnv = {
  BIBLE_MINDMAP_SHADOW_SERVER_ENABLED: 'true',
  BIBLE_MINDMAP_SHADOW_KILL_SWITCH: 'false',
  BIBLE_MINDMAP_SHADOW_ADMIN_IDS: 'admin-1',
  BIBLE_MINDMAP_SHADOW_RATE_LIMIT_PER_MINUTE: '12',
  BIBLE_MINDMAP_SHADOW_DAILY_REQUEST_LIMIT: '250',
  BIBLE_MINDMAP_SHADOW_TIMEOUT_MS: '200',
  NVIDIA_API_KEY: 'server-secret-only',
};

const vector = Array.from({ length: 2048 }, (_, index) => index === 0 ? 1 : 0);
const providerFetch = async (url, options) => {
  assert(String(url).startsWith('https://'), 'provider endpoint must use HTTPS');
  assert(options.headers.authorization === 'Bearer server-secret-only', 'server must inject NVIDIA secret');
  assert(!JSON.stringify(options.body).includes('server-secret-only'), 'secret must not appear in request body');
  return new Response(JSON.stringify({
    data: [{ embedding: vector }],
    usage: { prompt_tokens: 5, total_tokens: 5 },
  }), { status: 200, headers: { 'content-type': 'application/json' } });
};

const telemetry = [];
let rateAllowed = true;
let dailyAllowed = true;
const endpoint = createCanonicalShadowEndpoint({
  env: baseEnv,
  authenticate: async (request) => ({
    id: request.headers.get('x-test-actor'),
    serverSessionVerified: request.headers.get('x-test-session') === 'verified',
    isAdmin: true,
    pilotAllowed: true,
  }),
  rateLimiter: async () => rateAllowed,
  dailyBudget: async () => dailyAllowed,
  searchHybrid: async ({ queryVector, readOnly }) => {
    assert(queryVector.length === 2048, 'search adapter must receive 2048 dimensions');
    assert(readOnly === true, 'search adapter must remain read-only');
    return [{ id: 'covenant' }, { id: 'temple' }, { id: 'covenant' }];
  },
  telemetrySink: async (record) => telemetry.push(record),
  fetchImpl: providerFetch,
  now: (() => { let value = 100; return () => ++value; })(),
});

function request(body, headers = {}) {
  return new Request('https://example.test/api/search/canonical-shadow', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-test-actor': 'admin-1',
      'x-test-session': 'verified',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

const success = await endpoint(request({
  mode: 'shadow',
  query: '언약과 성전',
  baselineIds: ['covenant'],
  readOnly: true,
}));
const successBody = await success.json();
assert(success.status === 200, 'approved shadow request must succeed');
assert(successBody.candidateIds.join(',') === 'covenant,temple', 'candidate IDs must be unique and ordered');
assert(success.headers.get('cache-control') === 'no-store', 'response must disable cache');
assert(telemetry.length === 1, 'successful request must emit telemetry');
assert(telemetry[0].querySha256?.length === 64, 'telemetry must hash query');
assert(telemetry[0].actorSha256?.length === 64, 'telemetry must hash actor');
assert(telemetry[0].rawQueryLogged === false, 'telemetry must not log raw query');
assert(JSON.stringify(telemetry[0]).includes('언약과 성전') === false, 'telemetry must exclude raw query');
assert(telemetry[0].writesExistingDb === false, 'telemetry must preserve no-write boundary');

const forbidden = await endpoint(request({ mode: 'shadow', query: '언약', baselineIds: [], readOnly: true }, {
  'x-test-actor': 'not-allowed',
}));
assert(forbidden.status === 403, 'non-allowlisted actor must be forbidden');

rateAllowed = false;
const limited = await endpoint(request({ mode: 'shadow', query: '성전', baselineIds: [], readOnly: true }));
assert(limited.status === 429, 'minute rate limit must block request');
rateAllowed = true;

dailyAllowed = false;
const budget = await endpoint(request({ mode: 'shadow', query: '성전', baselineIds: [], readOnly: true }));
assert(budget.status === 429, 'daily budget must block request');
dailyAllowed = true;

const invalid = await endpoint(request({ mode: 'pilot', query: '성전', baselineIds: [], readOnly: true }));
assert(invalid.status === 400, 'endpoint must reject non-shadow mode');

const killed = createCanonicalShadowEndpoint({
  env: { ...baseEnv, BIBLE_MINDMAP_SHADOW_KILL_SWITCH: 'true' },
  authenticate: async () => ({ id: 'admin-1', serverSessionVerified: true, isAdmin: true, pilotAllowed: true }),
  rateLimiter: async () => true,
  dailyBudget: async () => true,
  searchHybrid: async () => [],
  fetchImpl: providerFetch,
});
const killedResponse = await killed(request({ mode: 'shadow', query: '성전', baselineIds: [], readOnly: true }));
assert(killedResponse.status === 503, 'kill switch must stop endpoint before provider call');

if (errors.length) {
  console.error(`✗ NVIDIA Hybrid shadow server verification failed (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log('✓ NVIDIA Hybrid shadow server verified · default OFF · kill switch · verified admin allowlist · rate/daily limits · server-only NVIDIA secret · sanitized telemetry · read-only');
