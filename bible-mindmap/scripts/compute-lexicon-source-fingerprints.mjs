#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_REGISTRY = path.join(ROOT, 'data', 'lexicon', 'source-registry.json');
const DEFAULT_OUTPUT = path.join(ROOT, 'reports', 'lexicon-source-fingerprints.json');
const FINGERPRINT_METHOD = 'sha256-path-content-manifest-v1';

function parseArgs(argv) {
  const args = {
    registry: DEFAULT_REGISTRY,
    output: DEFAULT_OUTPUT,
    write: false,
    selfTest: false,
  };
  for (const arg of argv) {
    if (arg === '--write') args.write = true;
    else if (arg.startsWith('--write=')) {
      args.write = true;
      args.output = path.resolve(process.cwd(), arg.slice('--write='.length));
    } else if (arg.startsWith('--registry=')) {
      args.registry = path.resolve(process.cwd(), arg.slice('--registry='.length));
    } else if (arg === '--self-test') args.selfTest = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function readJson(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function lexicalCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizeDatasetPath(value) {
  const normalized = String(value || '').replaceAll('\\', '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('\0')) throw new Error(`invalid dataset path: ${value}`);
  const segments = normalized.split('/').filter(Boolean);
  if (segments.some((segment) => segment === '..')) throw new Error(`path traversal blocked: ${value}`);
  return normalized;
}

function parseGitHubRepository(repositoryUrl) {
  const parsed = new URL(repositoryUrl);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com') {
    throw new Error(`only public github.com repositories are supported: ${repositoryUrl}`);
  }
  const parts = parsed.pathname.replace(/^\/+|\/+$/g, '').replace(/\.git$/, '').split('/');
  if (parts.length !== 2 || parts.some((part) => !part)) {
    throw new Error(`invalid GitHub repository URL: ${repositoryUrl}`);
  }
  return {
    owner: parts[0],
    repo: parts[1],
    cloneUrl: `https://github.com/${parts[0]}/${parts[1]}.git`,
  };
}

function runGit(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
    },
  }).trim();
}

function sparsePatterns(datasetPaths) {
  return datasetPaths.map((rawPath) => {
    const normalized = normalizeDatasetPath(rawPath);
    if (rawPath.endsWith('/')) return `/${normalized.replace(/\/$/, '')}/`;
    return `/${normalized}`;
  });
}

function checkoutPinnedSource(source, tempRoot) {
  const repositoryUrl = source.provenance?.repositoryUrl;
  const version = source.provenance?.version;
  const datasetPaths = source.provenance?.datasetPaths;
  if (!repositoryUrl || !/^[a-f0-9]{40}$/.test(String(version || ''))) {
    throw new Error(`${source.sourceId}: pinned Git commit is required`);
  }
  if (!Array.isArray(datasetPaths) || datasetPaths.length === 0) {
    throw new Error(`${source.sourceId}: datasetPaths are required`);
  }

  const repo = parseGitHubRepository(repositoryUrl);
  const checkoutDir = path.join(tempRoot, source.sourceId);
  fs.rmSync(checkoutDir, { recursive: true, force: true });
  fs.mkdirSync(checkoutDir, { recursive: true });
  runGit(['init', '--quiet'], checkoutDir);
  runGit(['remote', 'add', 'origin', repo.cloneUrl], checkoutDir);
  runGit(['config', 'core.sparseCheckout', 'true'], checkoutDir);
  runGit(['config', 'extensions.partialClone', 'origin'], checkoutDir);
  const infoDir = path.join(checkoutDir, '.git', 'info');
  fs.mkdirSync(infoDir, { recursive: true });
  fs.writeFileSync(path.join(infoDir, 'sparse-checkout'), `${sparsePatterns(datasetPaths).join('\n')}\n`);
  runGit(['fetch', '--quiet', '--depth=1', '--filter=blob:none', 'origin', version], checkoutDir);
  runGit(['checkout', '--quiet', '--detach', 'FETCH_HEAD'], checkoutDir);
  const resolved = runGit(['rev-parse', 'HEAD'], checkoutDir);
  if (resolved !== version) throw new Error(`${source.sourceId}: checkout mismatch ${resolved} != ${version}`);
  return checkoutDir;
}

function walkFiles(target, root, output) {
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink()) throw new Error(`symbolic link is not allowed: ${target}`);
  if (stat.isFile()) {
    const relativePath = path.relative(root, target).split(path.sep).join('/');
    if (relativePath.includes('\t') || relativePath.includes('\n')) {
      throw new Error(`unsupported control character in path: ${relativePath}`);
    }
    output.push({ absolutePath: target, relativePath, bytes: stat.size });
    return;
  }
  if (!stat.isDirectory()) throw new Error(`unsupported source node: ${target}`);
  for (const entry of fs.readdirSync(target).sort(lexicalCompare)) {
    walkFiles(path.join(target, entry), root, output);
  }
}

function collectDatasetFiles(checkoutDir, datasetPaths) {
  const files = [];
  const seen = new Set();
  for (const rawPath of datasetPaths) {
    const normalized = normalizeDatasetPath(rawPath).replace(/\/$/, '');
    const target = path.resolve(checkoutDir, normalized);
    const relative = path.relative(checkoutDir, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`dataset path escaped checkout: ${rawPath}`);
    }
    if (!fs.existsSync(target)) throw new Error(`dataset path missing at pinned commit: ${rawPath}`);
    const collected = [];
    walkFiles(target, checkoutDir, collected);
    for (const file of collected) {
      if (seen.has(file.relativePath)) continue;
      seen.add(file.relativePath);
      files.push(file);
    }
  }
  files.sort((left, right) => lexicalCompare(left.relativePath, right.relativePath));
  if (files.length === 0) throw new Error('datasetPaths resolved to zero files');
  return files;
}

async function sha256File(filepath) {
  const hash = crypto.createHash('sha256');
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filepath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  return hash.digest('hex');
}

async function fingerprintFiles(files) {
  const records = [];
  for (const file of files) {
    records.push({
      path: file.relativePath,
      bytes: file.bytes,
      sha256: await sha256File(file.absolutePath),
    });
  }
  records.sort((left, right) => lexicalCompare(left.path, right.path));
  const canonicalManifest = records
    .map((record) => `${record.sha256}\t${record.bytes}\t${record.path}\n`)
    .join('');
  const aggregate = crypto.createHash('sha256').update(canonicalManifest, 'utf8').digest('hex');
  return {
    method: FINGERPRINT_METHOD,
    fileCount: records.length,
    totalBytes: records.reduce((sum, record) => sum + record.bytes, 0),
    contentHash: `sha256:${aggregate}`,
    records,
  };
}

function compareExpected(source, computed, errors) {
  if (source.workflow?.status !== 'approved-ready') return;
  const provenance = source.provenance || {};
  for (const [field, actual] of [
    ['fingerprintMethod', computed.method],
    ['fileCount', computed.fileCount],
    ['totalBytes', computed.totalBytes],
    ['contentHash', computed.contentHash],
  ]) {
    if (provenance[field] !== actual) {
      errors.push(`${source.sourceId}: ${field} mismatch expected=${provenance[field]} actual=${actual}`);
    }
  }
}

async function computeRegistryFingerprints(registry) {
  const targets = registry.sources.filter((source) => (
    source.license?.status === 'approved'
    && ['approved-pending-fingerprint', 'approved-ready'].includes(source.workflow?.status)
  ));
  const errors = [];
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lexicon-source-fingerprint-'));
  const results = [];
  try {
    for (const source of targets) {
      const checkoutDir = checkoutPinnedSource(source, tempRoot);
      const files = collectDatasetFiles(checkoutDir, source.provenance.datasetPaths);
      const computed = await fingerprintFiles(files);
      compareExpected(source, computed, errors);
      results.push({
        sourceId: source.sourceId,
        repositoryUrl: source.provenance.repositoryUrl,
        version: source.provenance.version,
        datasetPaths: source.provenance.datasetPaths,
        fingerprintMethod: computed.method,
        fileCount: computed.fileCount,
        totalBytes: computed.totalBytes,
        contentHash: computed.contentHash,
      });
      console.log(
        `FINGERPRINT ${source.sourceId} commit=${source.provenance.version} files=${computed.fileCount} bytes=${computed.totalBytes} ${computed.contentHash}`,
      );
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  return { results, errors };
}

async function runSelfTest() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lexicon-fingerprint-self-test-'));
  try {
    fs.mkdirSync(path.join(root, 'nested'));
    fs.writeFileSync(path.join(root, 'b.txt'), 'beta\n');
    fs.writeFileSync(path.join(root, 'nested', 'a.txt'), 'alpha\n');
    const files = collectDatasetFiles(root, ['nested/', 'b.txt']);
    const first = await fingerprintFiles(files);
    assert.equal(first.fileCount, 2);
    assert.equal(first.totalBytes, 11);
    const second = await fingerprintFiles([...files].reverse());
    assert.deepEqual(second, first, 'fingerprint must be independent of traversal order');
    fs.writeFileSync(path.join(root, 'nested', 'a.txt'), 'changed\n');
    const changed = await fingerprintFiles(collectDatasetFiles(root, ['nested/', 'b.txt']));
    assert.notEqual(changed.contentHash, first.contentHash, 'content mutation must change aggregate hash');
    console.log('✓ lexicon source fingerprint self-test passed');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) return runSelfTest();
  const registry = readJson(args.registry);
  const { results, errors } = await computeRegistryFingerprints(registry);
  const report = {
    schemaVersion: 1,
    method: FINGERPRINT_METHOD,
    generatedAt: new Date().toISOString(),
    sourceCount: results.length,
    sources: results,
  };
  if (args.write) {
    fs.mkdirSync(path.dirname(args.output), { recursive: true });
    fs.writeFileSync(args.output, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Report written: ${args.output}`);
  }
  if (errors.length) {
    console.error(`✗ lexicon source fingerprint verification failed (${errors.length})`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`✓ lexicon source fingerprints verified · sources=${results.length}`);
}

main().catch((error) => {
  console.error(`✗ lexicon source fingerprint error: ${error.stack || error.message}`);
  process.exitCode = 1;
});
