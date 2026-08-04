import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildKoreanQueryReviewBatch,
  writeKoreanQueryReviewBatch,
} from './ai/evaluation/build-korean-query-review-batch.mjs';
import { generateKoreanEvaluationCandidates } from './ai/evaluation/korean-query-candidates.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const batchManifest = readJson('data/ai-evaluation/korean-query-review-batch-001.json');
const approvalManifest = readJson('data/ai-evaluation/korean-query-approvals.json');
const candidateResult = generateKoreanEvaluationCandidates();
const result = buildKoreanQueryReviewBatch({ batchManifest, approvalManifest, candidateResult });

assert(result.schemaVersion === 1, 'review batch schema version must be 1');
assert(result.itemCount === 12, `review batch must contain 12 items, got ${result.itemCount}`);
assert(result.requiresHumanDecision === true, 'review batch must require human decisions');
assert(result.autoApprove === false, 'review batch must never auto approve');
assert(result.productionSearchConnected === false, 'review batch must not connect to production search');
assert(new Set(result.items.map((item) => item.candidateId)).size === result.itemCount, 'candidate ids must be unique');
assert(result.reviewCriteria.length === 5, 'review batch must publish five review criteria');

for (const queryType of ['direct', 'semantic', 'multi-hop']) {
  assert(result.queryTypeCounts[queryType] === 4, `${queryType} must have exactly 4 review items`);
}
for (const style of ['question', 'pastoral', 'short-search']) {
  assert(result.styleCounts[style] === 4, `${style} must have exactly 4 review items`);
}

const allowedStatuses = new Set(['pending-human-review', 'approved', 'rejected', 'changes-requested']);
for (const item of result.items) {
  assert(allowedStatuses.has(item.reviewStatus), `unsupported review status: ${item.reviewStatus}`);
  assert(item.proposedRelevantIds.length > 0, `${item.candidateId} must keep proposed relevant labels`);
  assert(item.proposedHardNegativeIds.length > 0, `${item.candidateId} must keep proposed hard-negative labels`);
  if (item.decision) {
    assert(typeof item.decision.reviewer === 'string' && item.decision.reviewer.trim(), `${item.candidateId} decision needs reviewer`);
    assert(typeof item.decision.reviewedAt === 'string' && item.decision.reviewedAt.trim(), `${item.candidateId} decision needs reviewedAt`);
  }
}

const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'korean-query-review-batch-'));
writeKoreanQueryReviewBatch(result, outputDir);
const jsonPath = path.join(outputDir, `${result.batchId}.json`);
const markdownPath = path.join(outputDir, `${result.batchId}.md`);
assert(fs.existsSync(jsonPath), 'review batch JSON output was not written');
assert(fs.existsSync(markdownPath), 'review batch Markdown output was not written');
assert(fs.readFileSync(markdownPath, 'utf8').includes('자동 승인: 금지'), 'Markdown must state that auto approval is forbidden');

console.log(`✓ Korean query review batch verified: ${result.itemCount} items`);
console.log(`✓ Query types: ${JSON.stringify(result.queryTypeCounts)}`);
console.log(`✓ Styles: ${JSON.stringify(result.styleCounts)}`);
console.log(`✓ Status: ${result.reviewStatus}`);
