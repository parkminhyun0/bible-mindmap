import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_NVIDIA_EMBEDDING_MODEL_ID,
  NVIDIA_EMBEDDING_MODEL_POLICIES,
  resolveNvidiaEmbeddingModelPolicy,
} from './ai/poc/nvidia-embedding-model-policy.mjs';

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const ids = NVIDIA_EMBEDDING_MODEL_POLICIES.map((item) => item.id);
assert(new Set(ids).size === ids.length, 'embedding model policy IDs must be unique');
assert(NVIDIA_EMBEDDING_MODEL_POLICIES.length >= 2, 'model comparison requires at least two approved policies');

const primary = NVIDIA_EMBEDDING_MODEL_POLICIES.find((item) => item.id === DEFAULT_NVIDIA_EMBEDDING_MODEL_ID);
assert(primary?.tier === 'primary-korean', 'default model must be the primary Korean retrieval model');
assert(primary?.supportsKorean === true, 'default model must explicitly support Korean');
assert(primary?.maxTokens === 8192, 'primary model token limit must be recorded');
assert(primary?.requestDimensions.includes(2048) && primary?.requestDimensions.includes(384), 'primary model dynamic dimensions must include 2048 and 384');

for (const policy of NVIDIA_EMBEDDING_MODEL_POLICIES) {
  assert(policy.id.startsWith('nvidia/'), `${policy.id} must use an NVIDIA model namespace`);
  assert(policy.source.startsWith('https://build.nvidia.com/'), `${policy.id} must cite an official NVIDIA source`);
  assert(policy.maxTokens == null || Number.isInteger(policy.maxTokens), `${policy.id} maxTokens must be an integer or null`);
}

try {
  const resolved = resolveNvidiaEmbeddingModelPolicy({ modelId: DEFAULT_NVIDIA_EMBEDDING_MODEL_ID, dimensions: '384' });
  assert(resolved.requestedDimensions === 384, 'approved dynamic dimensions must resolve');
} catch (error) {
  errors.push(`approved model resolution failed: ${error.message}`);
}

try {
  resolveNvidiaEmbeddingModelPolicy({ modelId: 'unapproved/model' });
  errors.push('unapproved model must be rejected');
} catch {
  // Expected.
}

try {
  resolveNvidiaEmbeddingModelPolicy({ modelId: 'nvidia/nv-embedqa-e5-v5', dimensions: '384' });
  errors.push('fixed-dimension English control must reject dynamic dimensions');
} catch {
  // Expected.
}

const workflowPath = path.resolve(process.cwd(), '..', '.github', 'workflows', 'nvidia-embedding-poc.yml');
assert(fs.existsSync(workflowPath), 'manual NVIDIA Embedding PoC workflow is required');
if (fs.existsSync(workflowPath)) {
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  assert(/^\s*workflow_dispatch:/m.test(workflow), 'PoC workflow must require workflow_dispatch');
  assert(!/^\s*(push|pull_request|schedule):/m.test(workflow), 'PoC workflow must not run automatically');
  assert(workflow.includes('secrets.NVIDIA_API_KEY'), 'PoC workflow must read NVIDIA_API_KEY from GitHub Actions secrets');
  assert(workflow.includes('actions/upload-artifact@v4'), 'PoC workflow must preserve the JSON report as an artifact');
  assert(workflow.includes('poc:nvidia-embedding:execute'), 'PoC workflow must explicitly execute the limited runner');
  assert(workflow.includes('contents: read'), 'PoC workflow permissions must remain read-only');
  for (const id of ids) assert(workflow.includes(id), `PoC workflow model choices must include ${id}`);
}

if (errors.length) {
  console.error(`✗ NVIDIA Embedding model policy verification failed (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log(`✓ NVIDIA Embedding model policy verified · models ${ids.length} · default ${DEFAULT_NVIDIA_EMBEDDING_MODEL_ID} · manual workflow only`);
