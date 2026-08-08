#!/usr/bin/env node

import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const REQUIRED_MARKERS_STATIC = [
  'id="landing-visitor-status"',
  'id="landing-visitor-today"',
  'id="landing-visitor-total"',
  '접속자 현황',
  '투데이',
  '총 합계',
  'env(safe-area-inset-bottom)',
  // hybrid: both providers must be referenced.
  'api.counterapi.dev/v2',
  'bible-maps-team-4958',
  "secondaryCounter = 'first-counter-4958'",
  "secondaryCounter}/up",
  "secondaryCounter}/stats",
  // primary URL slot (may resolve to empty string, but the primary code branch must exist).
  'primaryUrl',
  "timeZone: 'Asia/Seoul'",
  'bmm-visitor-today-counted-',
];

// Legacy/dead-service markers that must never appear in shipped code.
const FORBIDDEN_MARKERS = [
  'hits.seeyoufarm.com',
  'api.counterapi.dev/v1',
  '@upstash/redis',
  'Redis.fromEnv',
  'UPSTASH_REDIS_REST',
  'bible-mindmap.vercel.app',
  '__VISITOR_API_URL__',  // unreplaced placeholder in final output
  'bmm-counted-v1',
  'bmm-total-v2',
  'bmm-today-v2',
  'bmm-app-total',
  'bmm-app-today',
  'bmm-landing-total',
  'bmm-landing-today',
];

async function assertMarkersPresent(source, label, required) {
  for (const marker of required) {
    assert.ok(source.includes(marker), `${label} missing marker: ${marker}`);
  }
}

async function assertMarkersAbsent(source, label, forbidden = FORBIDDEN_MARKERS) {
  for (const marker of forbidden) {
    assert.ok(!source.includes(marker), `${label} must not contain legacy marker: ${marker}`);
  }
}

// 0) Partial itself keeps the placeholder (source of truth for injector).
const rawPartial = await fs.readFile(path.join(root, 'landing/partials/visitor-status.html'), 'utf8');
assert.ok(rawPartial.includes('__VISITOR_API_URL__'), 'landing partial must keep __VISITOR_API_URL__ placeholder');
assert.ok(rawPartial.includes('primaryFetch') && rawPartial.includes('secondaryStats'),
  'landing partial must implement primaryFetch + secondaryStats fallback chain');

// 1) Partial + injector: temp-dir round-trip in TWO configurations.
async function runInjectorInTemp(envOverrides) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'visitor-status-'));
  try {
    await fs.mkdir(path.join(tempRoot, 'dist'), { recursive: true });
    await fs.mkdir(path.join(tempRoot, 'landing/partials'), { recursive: true });
    await fs.mkdir(path.join(tempRoot, 'scripts'), { recursive: true });
    await fs.copyFile(path.join(root, 'landing/index.html'), path.join(tempRoot, 'dist/index.html'));
    await fs.copyFile(path.join(root, 'landing/guide.html'), path.join(tempRoot, 'dist/guide.html'));
    await fs.copyFile(path.join(root, 'landing/partials/visitor-status.html'), path.join(tempRoot, 'landing/partials/visitor-status.html'));
    await fs.copyFile(path.join(root, 'scripts/inject-landing-visitor-status.mjs'), path.join(tempRoot, 'scripts/inject-landing-visitor-status.mjs'));

    const env = { ...process.env, ...envOverrides };
    if (envOverrides.__unset) {
      for (const key of envOverrides.__unset) delete env[key];
    }
    const run = spawnSync(process.execPath, ['scripts/inject-landing-visitor-status.mjs'], {
      cwd: tempRoot, encoding: 'utf8', env,
    });
    assert.equal(run.status, 0, `injector failed:\nSTDOUT:${run.stdout}\nSTDERR:${run.stderr}`);
    return {
      landing: await fs.readFile(path.join(tempRoot, 'dist/index.html'), 'utf8'),
      guide: await fs.readFile(path.join(tempRoot, 'dist/guide.html'), 'utf8'),
      stdout: run.stdout,
    };
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

// 1a) Configuration A: primary URL set → fallback chain baked in.
const FIXTURE_URL = 'https://visitor-test.example.workers.dev';
const withUrl = await runInjectorInTemp({ VITE_VISITOR_API_URL: FIXTURE_URL });
await assertMarkersPresent(withUrl.landing, 'landing (with primary URL)', [...REQUIRED_MARKERS_STATIC, FIXTURE_URL]);
await assertMarkersAbsent(withUrl.landing, 'landing (with primary URL)');
await assertMarkersPresent(withUrl.guide, 'guide (with primary URL)', [...REQUIRED_MARKERS_STATIC, FIXTURE_URL]);
await assertMarkersAbsent(withUrl.guide, 'guide (with primary URL)');
assert.match(withUrl.stdout, /primary backend \(Cloudflare\)/, 'injector must log primary backend when URL is set');

// 1b) Configuration B: primary URL empty → CounterAPI v2 becomes sole source, no crash.
const withoutUrl = await runInjectorInTemp({ __unset: ['VITE_VISITOR_API_URL'] });
await assertMarkersPresent(withoutUrl.landing, 'landing (secondary only)', REQUIRED_MARKERS_STATIC);
await assertMarkersAbsent(withoutUrl.landing, 'landing (secondary only)');
await assertMarkersPresent(withoutUrl.guide, 'guide (secondary only)', REQUIRED_MARKERS_STATIC);
await assertMarkersAbsent(withoutUrl.guide, 'guide (secondary only)');
assert.match(withoutUrl.stdout, /primary backend not configured/, 'injector must log when primary URL is empty');
assert.match(withoutUrl.stdout, /sole source/, 'injector must clarify CounterAPI v2 is sole source when empty');

// 2) Real dist/ output — only checked when dist/ exists (populated by predeploy).
for (const [rel, label] of [['dist/index.html', 'real dist/index.html'], ['dist/guide.html', 'real dist/guide.html']]) {
  try {
    const html = await fs.readFile(path.join(root, rel), 'utf8');
    await assertMarkersPresent(html, label, REQUIRED_MARKERS_STATIC);
    await assertMarkersAbsent(html, label);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    console.log(`· ${label} not present yet — skipped (run predeploy to populate)`);
  }
}

// 3) React app: unified hook must implement the same fallback chain.
const hookSource = await fs.readFile(path.join(root, 'src/hooks/useUnifiedVisitorCount.js'), 'utf8');
for (const required of [
  'import.meta.env.VITE_VISITOR_API_URL',
  'primaryFetch',
  'secondaryUp',
  'secondaryStats',
  'api.counterapi.dev/v2',
  'bible-maps-team-4958',
  "SECONDARY_COUNTER = 'first-counter-4958'",
  "SECONDARY_COUNTER}/up",
  "SECONDARY_COUNTER}/stats",
  'bmm-visitor-today-counted-',
  "timeZone: 'Asia/Seoul'",
  "cache: 'no-store'",
  'up_count',
]) {
  assert.ok(hookSource.includes(required), `useUnifiedVisitorCount missing: ${required}`);
}
for (const forbidden of FORBIDDEN_MARKERS) {
  assert.ok(!hookSource.includes(forbidden), `useUnifiedVisitorCount must not contain legacy: ${forbidden}`);
}

const savePanel = await fs.readFile(path.join(root, 'src/components/SavePanel.jsx'), 'utf8');
for (const required of ['useUnifiedVisitorCount', '접속자 현황', '투데이', '총 합계']) {
  assert.ok(savePanel.includes(required), `SavePanel missing: ${required}`);
}
for (const forbidden of ['useAppVisitorCount', ...FORBIDDEN_MARKERS]) {
  assert.ok(!savePanel.includes(forbidden), `SavePanel must not contain legacy: ${forbidden}`);
}

const mobileDock = await fs.readFile(path.join(root, 'src/components/MobileWorkspaceDock.jsx'), 'utf8');
for (const required of [
  'useUnifiedVisitorCount', '접속자 현황', '투데이', '총 합계',
  "pointerEvents: 'none'", "pointerEvents: 'auto'",
]) {
  assert.ok(mobileDock.includes(required), `MobileWorkspaceDock missing: ${required}`);
}
for (const forbidden of ['useMobileVisitorCounts', 'app-visits', ...FORBIDDEN_MARKERS]) {
  assert.ok(!mobileDock.includes(forbidden), `MobileWorkspaceDock must not contain legacy: ${forbidden}`);
}

// 4) Legacy artifacts must not resurrect.
for (const legacy of ['src/utils/visitorCounterRepair.js', 'api/visitor.mjs']) {
  try {
    await fs.access(path.join(root, legacy));
    throw new Error(`legacy ${legacy} still present — must be removed`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

const mainJsx = await fs.readFile(path.join(root, 'src/main.jsx'), 'utf8');
assert.ok(!mainJsx.includes('visitorCounterRepair'), 'main.jsx must not import visitorCounterRepair');

// 5) Cloudflare Worker (primary backend) contract.
const workerSource = await fs.readFile(path.join(root, 'workers/visitor.js'), 'utf8');
for (const required of [
  'env.VISITOR_KV',
  "timeZone: 'Asia/Seoul'",
  'access-control-allow-origin',
  'parkminhyun0.github.io',
  '.workers.dev',
  "scope === 'today'",
  "action === 'up'",
  'expirationTtl',
  'kv.put',
  'kv.get',
]) {
  assert.ok(workerSource.includes(required), `workers/visitor.js missing: ${required}`);
}
for (const forbidden of ['counterapi.dev', 'nvapi-', '@upstash/redis', 'UPSTASH_REDIS', 'YOUR_API_KEY']) {
  assert.ok(!workerSource.includes(forbidden), `workers/visitor.js must not contain: ${forbidden}`);
}

// 6) wrangler.toml contract.
const wranglerToml = await fs.readFile(path.join(root, 'workers/wrangler.toml'), 'utf8');
for (const required of ['name = "bible-mindmap-visitor"', 'main = "visitor.js"', 'binding = "VISITOR_KV"']) {
  assert.ok(wranglerToml.includes(required), `wrangler.toml missing: ${required}`);
}

// 7) Predeploy pipeline must chain inject + verify.
const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
const predeploy = pkg.scripts?.predeploy ?? '';
assert.ok(predeploy.includes('inject:visitor-status'), 'package.json predeploy must run inject:visitor-status');
assert.ok(predeploy.includes('verify:visitor-status'), 'package.json predeploy must run verify:visitor-status');
assert.ok(
  predeploy.indexOf('cp -r landing/') < predeploy.indexOf('inject:visitor-status'),
  'inject:visitor-status must run after cp -r landing/ (otherwise landing/index.html overwrites the injection)',
);
assert.ok(!pkg.dependencies?.['@upstash/redis'], 'package.json must not depend on @upstash/redis');

// 8) Env docs must document optional primary URL.
const envExample = await fs.readFile(path.join(root, '.env.example'), 'utf8');
assert.ok(envExample.includes('VITE_VISITOR_API_URL'), '.env.example must document VITE_VISITOR_API_URL');
for (const forbidden of ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']) {
  assert.ok(!envExample.includes(forbidden), `.env.example must not mention removed backend key ${forbidden}`);
}

console.log('✓ hybrid visitor status: primary Cloudflare Worker + KV (optional) with CounterAPI v2 fallback — partial, injector, hook, SavePanel, MobileDock, Worker, wrangler.toml, predeploy, env docs all in sync');
