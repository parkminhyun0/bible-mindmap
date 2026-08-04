import {
  hashPilotValue,
  resolveHybridProductionPilot,
  runHybridProductionPilot,
} from './ai/pilot/hybrid-production-pilot.mjs';

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const expectThrow = (fn, pattern, message) => {
  try {
    fn();
    errors.push(message);
  } catch (error) {
    if (pattern && !pattern.test(String(error?.message))) errors.push(`${message}: unexpected ${error?.message}`);
  }
};

const off = resolveHybridProductionPilot({});
assert(off.mode === 'off', 'pilot must default to off');
assert(off.enabled === false, 'pilot must default to disabled');
assert(off.adminOnly === true, 'pilot must remain admin-only');
assert(off.readOnly === true, 'pilot must remain read-only');
assert(off.fallback === 'keyword-only', 'pilot fallback must remain keyword-only');
assert(off.rolloutPercent === 0, 'pilot default rollout must equal 0');
assert(off.timeoutMs === 250, 'pilot default timeout must equal 250ms');
assert(off.logQueryText === false, 'pilot must not log raw query text');
assert(off.writesExistingDb === false, 'pilot must not write existing DB');
assert(off.productionIndexWrite === false, 'pilot must not write production index');
assert(off.immediateRollback === true, 'pilot must support immediate rollback');

expectThrow(
  () => resolveHybridProductionPilot({ BIBLE_MINDMAP_HYBRID_PILOT_MODE: 'pilot', BIBLE_MINDMAP_HYBRID_PILOT_PERCENT: '0' }),
  /positive rollout/,
  'pilot mode must reject zero rollout',
);
expectThrow(
  () => resolveHybridProductionPilot({ BIBLE_MINDMAP_HYBRID_PILOT_ADMIN_ONLY: 'false' }),
  /admin-only/,
  'pilot must reject non-admin configuration',
);
expectThrow(
  () => resolveHybridProductionPilot({ BIBLE_MINDMAP_HYBRID_PILOT_READ_ONLY: 'false' }),
  /read-only/,
  'pilot must reject write-enabled configuration',
);
expectThrow(
  () => resolveHybridProductionPilot({ BIBLE_MINDMAP_HYBRID_PILOT_LOG_QUERY_TEXT: 'true' }),
  /raw query text/,
  'pilot must reject raw query logging',
);
expectThrow(
  () => resolveHybridProductionPilot({ BIBLE_MINDMAP_HYBRID_PILOT_PERCENT: '6' }),
  /between 0 and 5 percent/,
  'pilot must reject rollout above 5 percent',
);
expectThrow(
  () => resolveHybridProductionPilot({ BIBLE_MINDMAP_HYBRID_PILOT_TIMEOUT_MS: '500' }),
  /between 50ms and 250ms/,
  'pilot must reject unsafe timeout',
);

const baseline = Object.freeze([{ id: 'keyword-result' }]);
const candidate = Object.freeze([{ id: 'hybrid-result' }]);
const keywordSearch = async () => baseline;
const hybridSearch = async () => candidate;
let clock = 0;
const now = () => { clock += 1; return clock; };

const offResult = await runHybridProductionPilot({
  query: '언약과 성전',
  config: off,
  keywordSearch,
  hybridSearch,
  now,
});
assert(offResult.results === baseline, 'off mode must return keyword results');
assert(offResult.telemetry.selected === 'keyword-only', 'off mode selection mismatch');
assert(offResult.telemetry.rawQueryLogged === false, 'telemetry must not log raw query');
assert(offResult.telemetry.querySha256 === hashPilotValue('언약과 성전'), 'query hash mismatch');

const shadow = resolveHybridProductionPilot({
  BIBLE_MINDMAP_HYBRID_PILOT_MODE: 'shadow',
  BIBLE_MINDMAP_HYBRID_PILOT_PERCENT: '0',
  BIBLE_MINDMAP_HYBRID_PILOT_TIMEOUT_MS: '200',
});
const shadowResult = await runHybridProductionPilot({
  query: '씨와 언약',
  actor: { isAdmin: true, pilotAllowed: true },
  config: shadow,
  keywordSearch,
  hybridSearch,
  now,
});
assert(shadowResult.results === baseline, 'shadow mode must return keyword results');
assert(shadowResult.comparison?.candidate === candidate, 'shadow mode must preserve comparison candidate');
assert(shadowResult.telemetry.selected === 'keyword-only', 'shadow mode must not select Hybrid results');

const pilot = resolveHybridProductionPilot({
  BIBLE_MINDMAP_HYBRID_PILOT_MODE: 'pilot',
  BIBLE_MINDMAP_HYBRID_PILOT_PERCENT: '1',
  BIBLE_MINDMAP_HYBRID_PILOT_TIMEOUT_MS: '200',
});
const blockedActor = await runHybridProductionPilot({
  query: '피와 속죄',
  actor: { isAdmin: false, pilotAllowed: true },
  config: pilot,
  keywordSearch,
  hybridSearch,
  now,
});
assert(blockedActor.results === baseline, 'non-admin actor must receive keyword fallback');
assert(blockedActor.telemetry.fallbackReason === 'actor-not-allowed', 'blocked actor reason mismatch');

const pilotResult = await runHybridProductionPilot({
  query: '왕적 제사장',
  actor: { isAdmin: true, pilotAllowed: true },
  config: pilot,
  keywordSearch,
  hybridSearch,
  now,
});
assert(pilotResult.results === candidate, 'approved pilot actor must receive Hybrid results');
assert(pilotResult.telemetry.selected === 'nvidia-hybrid-2048', 'pilot selection mismatch');

const failureResult = await runHybridProductionPilot({
  query: '실패 fallback',
  actor: { isAdmin: true, pilotAllowed: true },
  config: pilot,
  keywordSearch,
  hybridSearch: async () => { throw new Error('provider-unavailable'); },
  now,
});
assert(failureResult.results === baseline, 'Hybrid failure must return keyword fallback');
assert(failureResult.telemetry.fallbackReason === 'provider-unavailable', 'Hybrid failure reason mismatch');
assert(failureResult.telemetry.writesExistingDb === false, 'telemetry must preserve no-write boundary');

if (errors.length) {
  console.error(`✗ NVIDIA Hybrid production pilot verification failed (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log('✓ NVIDIA Hybrid production pilot verified · default OFF · admin-only · read-only · 0-5% · keyword fallback · sanitized telemetry');
