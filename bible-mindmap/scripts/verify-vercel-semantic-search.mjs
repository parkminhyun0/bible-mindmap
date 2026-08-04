import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../api/semantic-search.js', import.meta.url), 'utf8');

for (const required of [
  "NVIDIA_SEMANTIC_SEARCH_ENABLED",
  "NVIDIA_API_KEY",
  "missing-server-credential",
  "kill-switch-off",
  "rate-limit",
  "timeout",
  "dimension-mismatch",
  "writeToProductionDb: false",
  "rerankerEnabled: false",
  "rawQueryStored: false",
  "productionWrite: false",
  "rerankerUsed: false",
  "cache-control",
  "no-store",
]) {
  assert.ok(source.includes(required), `semantic search boundary missing: ${required}`);
}

assert.ok(!source.includes('VITE_NVIDIA'), 'NVIDIA credential must never use a browser-exposed VITE_ variable');
assert.ok(!source.includes('process.env.NEXT_PUBLIC'), 'NVIDIA credential must never use a public environment variable');
assert.ok(source.includes("req.method === 'GET'"), 'health/config inspection route is required');
assert.ok(source.includes("req.method !== 'POST'"), 'search route must reject unsupported methods');
assert.ok(/\b\w+Vector\.length\s*!==\s*2048\b/.test(source), 'approved embedding dimension must be enforced');

console.log('✓ Vercel Hobby semantic search server boundary verified');
