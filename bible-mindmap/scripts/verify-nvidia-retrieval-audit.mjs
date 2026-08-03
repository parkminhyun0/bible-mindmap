import {
  NVIDIA_POC_EVALUATION_REVISION,
  POC_CASES,
  POC_DOCUMENTS,
} from './ai/poc/nvidia-embedding-evaluation-fixture.mjs';
import { validateSearchDocuments } from './ai/retrieval/hybrid-search.mjs';
import {
  assertRetrievalQuality,
  scoreRanking,
  validateEvaluationCases,
} from './ai/retrieval/retrieval-evaluation.mjs';

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const documents = validateSearchDocuments(POC_DOCUMENTS);
const cases = validateEvaluationCases(POC_CASES);
const documentIds = new Set(documents.map((item) => item.id));
const queryTypeCounts = new Map();
const relevantCoverage = new Set();

assert(NVIDIA_POC_EVALUATION_REVISION === 'canonical-audit-v2', 'evaluation revision must be explicit and stable');
assert(documents.length >= 12, 'quality audit requires at least 12 canonical documents');
assert(cases.length >= 16, 'quality audit requires at least 16 evaluation cases');

for (const document of documents) {
  assert(document.metadata.approvedForPoc === true, `${document.id}: approvedForPoc must be true`);
  assert(document.metadata.type === 'canonical-concept', `${document.id}: canonical-concept metadata is required`);
  assert(typeof document.metadata.topic === 'string' && document.metadata.topic, `${document.id}: topic metadata is required`);
  assert(document.sourceRefs.length >= 3, `${document.id}: at least three source references are required`);
}

for (const item of cases) {
  const queryType = item.metadata.queryType;
  queryTypeCounts.set(queryType, (queryTypeCounts.get(queryType) || 0) + 1);
  for (const id of item.relevantIds) {
    assert(documentIds.has(id), `${item.id}: unknown relevant document ${id}`);
    relevantCoverage.add(id);
  }
  for (const id of item.hardNegativeIds) {
    assert(documentIds.has(id), `${item.id}: unknown hard-negative document ${id}`);
  }
  assert(item.hardNegativeIds.length >= 1, `${item.id}: at least one hard negative is required`);
}

assert(relevantCoverage.size === documents.length, `every document must be relevant in at least one case (${relevantCoverage.size}/${documents.length})`);
assert((queryTypeCounts.get('direct') || 0) >= 4, 'at least four direct queries are required');
assert((queryTypeCounts.get('semantic') || 0) >= 8, 'at least eight semantic paraphrase queries are required');
assert((queryTypeCounts.get('multi-hop') || 0) >= 3, 'at least three multi-hop queries are required');

const hardNegativeExample = scoreRanking(
  ['canonical.seed', 'canonical.creation', 'canonical.king'],
  ['canonical.seed'],
  3,
  ['canonical.creation'],
);
assert(hardNegativeExample.recall === 1, 'relevant hit must still count');
assert(hardNegativeExample.hardNegativeRate === 1, 'hard-negative hit must be measured independently');
assert(hardNegativeExample.hardNegativeHits[0] === 'canonical.creation', 'hard-negative identity must be preserved');

try {
  assertRetrievalQuality({
    candidate: {
      k: 3,
      recallAtK: 1,
      mrr: 1,
      ndcgAtK: 1,
      hardNegativeRate: 0.75,
      failureRate: 0,
      latencyMs: { p95: 1 },
    },
    thresholds: {
      minRecallAtK: 0,
      minMrr: 0,
      minNdcgAtK: 0,
      maxHardNegativeRate: 0.5,
      maxFailureRate: 0,
      maxP95LatencyMs: 10,
    },
  });
  errors.push('quality gate must reject excessive hard-negative rate');
} catch {
  // Expected.
}

if (errors.length) {
  console.error(`✗ NVIDIA retrieval quality audit verification failed (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log(
  `✓ NVIDIA retrieval quality audit verified · revision ${NVIDIA_POC_EVALUATION_REVISION} · `
  + `documents ${documents.length} · cases ${cases.length} · `
  + `direct ${queryTypeCounts.get('direct')} · semantic ${queryTypeCounts.get('semantic')} · multi-hop ${queryTypeCounts.get('multi-hop')} · hard negatives ${cases.length}`,
);
