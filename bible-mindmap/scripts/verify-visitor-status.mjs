#!/usr/bin/env node

import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const REQUIRED_MARKERS = [
  'id="landing-visitor-status"',
  'id="landing-visitor-today"',
  'id="landing-visitor-total"',
  '접속자 현황',
  '투데이',
  '총 합계',
  'env(safe-area-inset-bottom)',
  '/api/visitor',
  "timeZone: 'Asia/Seoul'",
  'bmm-visitor-total-counted-v3',
  'bmm-visitor-today-counted-',
];

const FORBIDDEN_MARKERS = [
  'hits.seeyoufarm.com',
  'api.counterapi.dev',
  'counterapi.dev',
  'bmm-counted-v1',
  'bmm-total-v2',
  'bmm-today-v2',
  'bmm-app-total',
  'bmm-app-today',
  'bmm-landing-total',
  'bmm-landing-today',
];

async function assertMarkersPresent(source, label, required = REQUIRED_MARKERS) {
  for (const marker of required) {
    assert.ok(source.includes(marker), `${label} missing marker: ${marker}`);
  }
}

async function assertMarkersAbsent(source, label, forbidden = FORBIDDEN_MARKERS) {
  for (const marker of forbidden) {
    assert.ok(!source.includes(marker), `${label} must not contain legacy marker: ${marker}`);
  }
}

// 1) Partial + injector: temp-dir round-trip against both landing and guide targets.
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'visitor-status-'));
try {
  await fs.mkdir(path.join(tempRoot, 'dist'), { recursive: true });
  await fs.mkdir(path.join(tempRoot, 'landing/partials'), { recursive: true });
  await fs.mkdir(path.join(tempRoot, 'scripts'), { recursive: true });
  await fs.copyFile(path.join(root, 'landing/index.html'), path.join(tempRoot, 'dist/index.html'));
  await fs.copyFile(path.join(root, 'landing/guide.html'), path.join(tempRoot, 'dist/guide.html'));
  await fs.copyFile(path.join(root, 'landing/partials/visitor-status.html'), path.join(tempRoot, 'landing/partials/visitor-status.html'));
  await fs.copyFile(path.join(root, 'scripts/inject-landing-visitor-status.mjs'), path.join(tempRoot, 'scripts/inject-landing-visitor-status.mjs'));

  const run = spawnSync(process.execPath, ['scripts/inject-landing-visitor-status.mjs'], {
    cwd: tempRoot,
    encoding: 'utf8',
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);

  const landingOut = await fs.readFile(path.join(tempRoot, 'dist/index.html'), 'utf8');
  await assertMarkersPresent(landingOut, 'landing dist/index.html (temp)');
  await assertMarkersAbsent(landingOut, 'landing dist/index.html (temp)');

  const guideOut = await fs.readFile(path.join(tempRoot, 'dist/guide.html'), 'utf8');
  await assertMarkersPresent(guideOut, 'guide dist/guide.html (temp)');
  await assertMarkersAbsent(guideOut, 'guide dist/guide.html (temp)');
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}

// 2) Real dist/ output (only checked when dist/ exists — predeploy calls this after inject).
const realLanding = path.join(root, 'dist/index.html');
const realGuide = path.join(root, 'dist/guide.html');
try {
  const landingHtml = await fs.readFile(realLanding, 'utf8');
  await assertMarkersPresent(landingHtml, 'real dist/index.html');
  await assertMarkersAbsent(landingHtml, 'real dist/index.html');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  console.log('· real dist/index.html not present yet — skipped (run predeploy to populate)');
}
try {
  const guideHtml = await fs.readFile(realGuide, 'utf8');
  await assertMarkersPresent(guideHtml, 'real dist/guide.html');
  await assertMarkersAbsent(guideHtml, 'real dist/guide.html');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  console.log('· real dist/guide.html not present yet — skipped (run predeploy to populate)');
}

// 3) React app: unified hook + consumers must call the new /api/visitor endpoint.
const hookSource = await fs.readFile(path.join(root, 'src/hooks/useUnifiedVisitorCount.js'), 'utf8');
for (const required of [
  '/api/visitor',
  'VITE_VISITOR_API_URL',
  'bmm-visitor-total-counted-v3',
  'bmm-visitor-today-counted-',
  "timeZone: 'Asia/Seoul'",
  "cache: 'no-store'",
]) {
  assert.ok(hookSource.includes(required), `useUnifiedVisitorCount missing: ${required}`);
}
for (const forbidden of FORBIDDEN_MARKERS) {
  assert.ok(!hookSource.includes(forbidden), `useUnifiedVisitorCount must not contain legacy: ${forbidden}`);
}

const savePanel = await fs.readFile(path.join(root, 'src/components/SavePanel.jsx'), 'utf8');
for (const required of [
  'useUnifiedVisitorCount',
  '접속자 현황',
  '투데이',
  '총 합계',
]) {
  assert.ok(savePanel.includes(required), `SavePanel missing: ${required}`);
}
for (const forbidden of ['useAppVisitorCount', 'api.counterapi.dev', ...FORBIDDEN_MARKERS]) {
  assert.ok(!savePanel.includes(forbidden), `SavePanel must not contain legacy: ${forbidden}`);
}

const mobileDock = await fs.readFile(path.join(root, 'src/components/MobileWorkspaceDock.jsx'), 'utf8');
for (const required of [
  'useUnifiedVisitorCount',
  '접속자 현황',
  '투데이',
  '총 합계',
  "pointerEvents: 'none'",
  "pointerEvents: 'auto'",
]) {
  assert.ok(mobileDock.includes(required), `MobileWorkspaceDock missing: ${required}`);
}
for (const forbidden of ['useMobileVisitorCounts', 'app-visits', 'api.counterapi.dev', ...FORBIDDEN_MARKERS]) {
  assert.ok(!mobileDock.includes(forbidden), `MobileWorkspaceDock must not contain legacy: ${forbidden}`);
}

// 4) Legacy repair util must not resurrect.
try {
  await fs.access(path.join(root, 'src/utils/visitorCounterRepair.js'));
  throw new Error('legacy src/utils/visitorCounterRepair.js still present — must be removed');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const mainJsx = await fs.readFile(path.join(root, 'src/main.jsx'), 'utf8');
assert.ok(!mainJsx.includes('visitorCounterRepair'), 'main.jsx must not import visitorCounterRepair');

// 5) Backend function contract: api/visitor.mjs uses Upstash Redis via env, CORS, KST date, scope/action guards.
const apiSource = await fs.readFile(path.join(root, 'api/visitor.mjs'), 'utf8');
for (const required of [
  "from '@upstash/redis'",
  'Redis.fromEnv()',
  "timeZone: 'Asia/Seoul'",
  'access-control-allow-origin',
  'parkminhyun0.github.io',
  '.vercel.app',
  "scope === 'today'",
  "action === 'up'",
  'redis.incr',
  'redis.expire',
]) {
  assert.ok(apiSource.includes(required), `api/visitor.mjs missing: ${required}`);
}
// The API must NOT hardcode secrets or reference counterapi.dev.
for (const forbidden of ['counterapi.dev', 'YOUR_API_KEY', 'nvapi-']) {
  assert.ok(!apiSource.includes(forbidden), `api/visitor.mjs must not contain: ${forbidden}`);
}

// 6) Predeploy pipeline must chain inject + verify.
const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
const predeploy = pkg.scripts?.predeploy ?? '';
assert.ok(predeploy.includes('inject:visitor-status'), 'package.json predeploy must run inject:visitor-status');
assert.ok(predeploy.includes('verify:visitor-status'), 'package.json predeploy must run verify:visitor-status');
assert.ok(
  predeploy.indexOf('cp -r landing/') < predeploy.indexOf('inject:visitor-status'),
  'inject:visitor-status must run after cp -r landing/ (otherwise landing/index.html overwrites the injection)',
);
assert.ok(pkg.dependencies?.['@upstash/redis'], 'package.json must depend on @upstash/redis');

// 7) Env docs mention required vars.
const envExample = await fs.readFile(path.join(root, '.env.example'), 'utf8');
for (const key of ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'VITE_VISITOR_API_URL']) {
  assert.ok(envExample.includes(key), `.env.example missing required key: ${key}`);
}

console.log('✓ unified visitor status backed by /api/visitor + Upstash Redis: partial, injector, React hook, SavePanel, MobileDock, API function, predeploy, env docs all in sync');
