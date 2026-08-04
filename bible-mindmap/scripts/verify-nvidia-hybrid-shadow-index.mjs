import fs from 'node:fs';
import path from 'node:path';
import {
  CANONICAL_SHADOW_DOCUMENTS,
  EXPECTED_CANONICAL_SHADOW_DOCUMENTS,
} from './ai/shadow/canonical-shadow-corpus.mjs';
import {
  SHADOW_EVALUATION_CASES,
} from './ai/shadow/nvidia-shadow-evaluation-fixture.mjs';
import {
  describeNvidiaHybridShadowIndex,
  runNvidiaHybridShadowIndex,
} from './ai/shadow/nvidia-hybrid-shadow-index.mjs';
import {
  SHADOW_INDEX_CONTRACT,
  validateShadowIndexManifest,
} from './ai/shadow/shadow-index-contract.mjs';
import { DEFAULT_NVIDIA_EMBEDDING_MODEL_ID } from './ai/poc/nvidia-embedding-model-policy.mjs';

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const expectThrow = (fn, pattern, message) => {
  try {
    fn();
    errors.push(message);
  } catch (error) {
    if (pattern && !pattern.test(String(error?.message))) errors.push(`${message}: unexpected error ${error?.message}`);
  }
};

assert(CANONICAL_SHADOW_DOCUMENTS.length === 72, 'shadow corpus must contain 72 canonical concepts');
assert(EXPECTED_CANONICAL_SHADOW_DOCUMENTS === 72, 'expected shadow corpus count must remain 72');
assert(SHADOW_EVALUATION_CASES.length === 24, 'shadow evaluation must contain 24 cases');
for (const queryType of ['direct', 'semantic', 'multi-hop']) {
  assert(
    SHADOW_EVALUATION_CASES.filter((item) => item.metadata.queryType === queryType).length === 8,
    `${queryType} evaluation segment must contain 8 cases`,
  );
}

const documentPosition = new Map(CANONICAL_SHADOW_DOCUMENTS.map((document, index) => [document.id, index]));
const referencedIds = new Set(SHADOW_EVALUATION_CASES.flatMap((item) => [
  ...item.relevantIds,
  ...item.hardNegativeIds,
]));
const unknownReferencedIds = [...referencedIds].filter((id) => !documentPosition.has(id));
assert(
  unknownReferencedIds.length === 0,
  `shadow evaluation references unknown canonical documents: ${unknownReferencedIds.join(', ')}`,
);

const documentTextPosition = new Map(CANONICAL_SHADOW_DOCUMENTS.map((document, index) => [
  `${document.title}\n${document.text}`,
  index,
]));
const queryCase = new Map(SHADOW_EVALUATION_CASES.map((item) => [item.query, item]));
const dimension = 2048;
const makeVector = (positions) => {
  const vector = Array.from({ length: dimension }, () => 0);
  const weight = 1 / Math.sqrt(positions.length);
  positions.forEach((position) => { vector[position] = weight; });
  return vector;
};

let requestCounter = 0;
const embed = async ({ texts, task }) => {
  requestCounter += 1;
  const vectors = texts.map((text) => {
    if (task === 'document') {
      const position = documentTextPosition.get(text);
      if (!Number.isInteger(position)) throw new Error('mock document text is not in the approved shadow corpus');
      return makeVector([position]);
    }
    const item = queryCase.get(text);
    if (!item) throw new Error('mock query is not in the shadow evaluation fixture');
    const positions = item.relevantIds.map((id) => documentPosition.get(id));
    if (positions.some((position) => !Number.isInteger(position))) throw new Error('mock query references an unknown document');
    return makeVector(positions);
  });
  return {
    provider: 'nvidia',
    model: DEFAULT_NVIDIA_EMBEDDING_MODEL_ID,
    task,
    dimension,
    vectors,
    requestId: `shadow-mock-${requestCounter}`,
    usage: { prompt_tokens: texts.length * 10, total_tokens: texts.length * 10 },
  };
};

let clock = 0;
const now = () => {
  clock += 0.25;
  return clock;
};
const env = {
  NVIDIA_API_KEY: 'unit-test-placeholder',
  NVIDIA_EMBEDDING_MODEL_ID: DEFAULT_NVIDIA_EMBEDDING_MODEL_ID,
  NVIDIA_EMBEDDING_DIMENSIONS: '2048',
  GITHUB_SHA: '41dc4ab4f063bfd5190391cd47747cdcfd0188f7',
};

const description = describeNvidiaHybridShadowIndex(env);
assert(description.documentCount === 72, 'dry-run document count mismatch');
assert(description.queryCount === 24, 'dry-run query count mismatch');
assert(description.shadowOnly === true, 'dry-run must remain shadow-only');
assert(description.productionActivated === false, 'dry-run must not activate production');

const result = await runNvidiaHybridShadowIndex({ embed, env, now });
const candidate = result.evaluation.candidate;
const minimums = result.evaluation.gate.minimums;
assert(result.corpus.documentCount === 72, 'actual shadow corpus count mismatch');
assert(result.evaluation.queryCount === 24, 'actual shadow query count mismatch');
assert(candidate.recallAtK >= minimums.recallAtK, 'mock Hybrid Recall@5 must satisfy the shadow quality gate');
assert(candidate.mrr >= minimums.mrr, 'mock Hybrid MRR must satisfy the shadow quality gate');
assert(candidate.ndcgAtK >= minimums.ndcgAtK, 'mock Hybrid nDCG@5 must satisfy the shadow quality gate');
assert(candidate.hardNegativeRate <= minimums.maxHardNegativeRate, 'mock Hybrid hard-negative rate must satisfy the shadow quality gate');
assert(candidate.failureRate === 0, 'mock Hybrid failure rate must equal 0');
assert(result.evaluation.gate.passed === true, 'approved mock shadow gate must pass');
assert(result.evaluation.gate.vectorContribution === true, 'mock vectors must demonstrate contribution');
assert(result.manifest.stage === 'P1-2c', 'shadow manifest stage mismatch');
assert(result.manifest.shadowOnly === true, 'shadow manifest must remain shadow-only');
assert(result.manifest.liveSearchConnected === false, 'shadow manifest must not connect live search');
assert(result.manifest.productionActivated === false, 'shadow manifest must not activate production');
assert(result.manifest.documentCount === SHADOW_INDEX_CONTRACT.documentCount, 'shadow manifest document count mismatch');
assert(result.manifest.queryCount === SHADOW_INDEX_CONTRACT.queryCount, 'shadow manifest query count mismatch');
assert(result.manifest.vectorBytesEstimate === 72 * 2048 * 4, 'shadow vector size estimate mismatch');
validateShadowIndexManifest(result.manifest);

expectThrow(
  () => validateShadowIndexManifest({ ...result.manifest, productionActivated: true }),
  /activate.*production/i,
  'shadow manifest must reject production activation',
);
expectThrow(
  () => validateShadowIndexManifest({ ...result.manifest, liveSearchConnected: true }),
  /must not connect to live search/,
  'shadow manifest must reject live search connection',
);

const workflowPath = path.resolve(process.cwd(), '..', '.github', 'workflows', 'nvidia-hybrid-shadow-index.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');
assert(/^\s*workflow_dispatch:/m.test(workflow), 'shadow workflow must remain manual');
assert(!/^\s*(push|pull_request|schedule):/m.test(workflow), 'shadow workflow must not run automatically');
assert(workflow.includes('secrets.NVIDIA_API_KEY'), 'shadow workflow secret boundary missing');
assert(workflow.includes("NVIDIA_EMBEDDING_DIMENSIONS: '2048'"), 'shadow workflow must use 2048 dimensions');
assert(workflow.includes('permissions:\n  contents: read'), 'shadow workflow must remain read-only');
assert(workflow.includes('if: always()'), 'shadow workflow must preserve artifacts after a failed gate');
assert(workflow.includes('--require-pass'), 'shadow workflow must enforce the quality gate');

if (errors.length) {
  console.error(`✗ NVIDIA Hybrid shadow index verification failed (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log(
  `✓ NVIDIA Hybrid shadow index verified · documents ${result.corpus.documentCount} · queries ${result.evaluation.queryCount} · `
  + `Recall@5 ${candidate.recallAtK.toFixed(2)} · nDCG@5 ${candidate.ndcgAtK.toFixed(2)} · `
  + `manifest ${result.manifest.vectorDataSha256.slice(0, 12)} · no activation`,
);
