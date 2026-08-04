#!/usr/bin/env node

import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'visitor-status-'));

try {
  await fs.mkdir(path.join(tempRoot, 'dist'), { recursive: true });
  await fs.mkdir(path.join(tempRoot, 'landing/partials'), { recursive: true });
  await fs.mkdir(path.join(tempRoot, 'scripts'), { recursive: true });
  await fs.copyFile(path.join(root, 'landing/index.html'), path.join(tempRoot, 'dist/index.html'));
  await fs.copyFile(path.join(root, 'landing/partials/visitor-status.html'), path.join(tempRoot, 'landing/partials/visitor-status.html'));
  await fs.copyFile(path.join(root, 'scripts/inject-landing-visitor-status.mjs'), path.join(tempRoot, 'scripts/inject-landing-visitor-status.mjs'));

  const run = spawnSync(process.execPath, ['scripts/inject-landing-visitor-status.mjs'], {
    cwd: tempRoot,
    encoding: 'utf8',
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);

  const output = await fs.readFile(path.join(tempRoot, 'dist/index.html'), 'utf8');
  for (const required of [
    'id="landing-visitor-status"',
    '접속자 현황',
    '투데이',
    '총 합계',
    'env(safe-area-inset-bottom)',
    'hits.seeyoufarm.com',
  ]) {
    assert.ok(output.includes(required), `landing visitor output missing: ${required}`);
  }

  const mobileDock = await fs.readFile(path.join(root, 'src/components/MobileWorkspaceDock.jsx'), 'utf8');
  for (const required of [
    '앱 접속자 현황',
    '투데이 / 총 합계',
    'VISITOR_BADGE_URL',
    "pointerEvents: 'none'",
    "pointerEvents: 'auto'",
  ]) {
    assert.ok(mobileDock.includes(required), `mobile visitor UI missing: ${required}`);
  }

  console.log('✓ landing and mobile app visitor status are present and responsive');
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
