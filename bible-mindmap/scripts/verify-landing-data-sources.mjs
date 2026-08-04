#!/usr/bin/env node

import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'landing-sources-'));
const tempDist = path.join(tempRoot, 'dist');

try {
  await fs.mkdir(tempDist, { recursive: true });
  await fs.copyFile(path.join(root, 'landing/index.html'), path.join(tempDist, 'index.html'));
  await fs.cp(path.join(root, 'landing/partials'), path.join(tempRoot, 'landing/partials'), { recursive: true });
  await fs.mkdir(path.join(tempRoot, 'scripts'), { recursive: true });
  await Promise.all([
    fs.copyFile(
      path.join(root, 'scripts/inject-landing-data-sources.mjs'),
      path.join(tempRoot, 'scripts/inject-landing-data-sources.mjs'),
    ),
    fs.copyFile(
      path.join(root, 'scripts/inject-landing-visitor-status.mjs'),
      path.join(tempRoot, 'scripts/inject-landing-visitor-status.mjs'),
    ),
  ]);

  const result = spawnSync(process.execPath, ['scripts/inject-landing-data-sources.mjs'], {
    cwd: tempRoot,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const output = await fs.readFile(path.join(tempDist, 'index.html'), 'utf8');
  for (const required of [
    'id="data-sources"',
    'STEPBible Data',
    'CC BY 4.0',
    'OpenScriptures Strong’s Dictionaries',
    'Bolls.life API',
    'OpenBible.info Cross References',
    'OpenBible.info Bible Geocoding Data',
    'Wikidata',
    '프로젝트 큐레이션 데이터',
    'AI·NVIDIA 사용 경계',
    'href="#data-sources"',
  ]) {
    assert.match(output, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  const second = spawnSync(process.execPath, ['scripts/inject-landing-data-sources.mjs'], {
    cwd: tempRoot,
    encoding: 'utf8',
  });
  assert.equal(second.status, 0, second.stderr || second.stdout);
  const repeated = await fs.readFile(path.join(tempDist, 'index.html'), 'utf8');
  assert.equal((repeated.match(/id="data-sources"/g) || []).length, 1, 'source section must be idempotent');

  console.log('✓ landing data source attribution verified');
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
