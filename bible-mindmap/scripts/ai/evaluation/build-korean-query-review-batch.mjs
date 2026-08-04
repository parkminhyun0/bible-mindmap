import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateKoreanEvaluationCandidates } from './korean-query-candidates.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');

export const KOREAN_QUERY_REVIEW_BATCH_SCHEMA_VERSION = 1;
export const REVIEW_CRITERIA = Object.freeze([
  '한국어 문장이 실제 사용자의 검색 표현으로 자연스러운가',
  '검색 의도가 한 가지로 충분히 명확한가',
  '제안된 정답 라벨이 질의 의도와 신학적으로 부합하는가',
  'hard-negative가 혼동 가능성을 적절히 대표하는가',
  '기존 평가 질의와 의미상 중복되지 않는가',
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key];
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

export function buildKoreanQueryReviewBatch({
  batchManifest,
  approvalManifest = { decisions: [] },
  candidateResult = generateKoreanEvaluationCandidates(),
} = {}) {
  if (!batchManifest || !Array.isArray(batchManifest.candidateIds)) {
    throw new TypeError('batchManifest.candidateIds must be an array');
  }

  const candidateMap = new Map(candidateResult.candidates.map((item) => [item.id, item]));
  const decisionMap = new Map((approvalManifest.decisions || []).map((item) => [item.candidateId, item]));
  const seen = new Set();

  const items = batchManifest.candidateIds.map((candidateId, index) => {
    if (seen.has(candidateId)) throw new Error(`duplicate candidate id in review batch: ${candidateId}`);
    seen.add(candidateId);

    const candidate = candidateMap.get(candidateId);
    if (!candidate) throw new Error(`unknown candidate id in review batch: ${candidateId}`);
    const decision = decisionMap.get(candidateId) || null;

    return Object.freeze({
      order: index + 1,
      candidateId,
      sourceCaseId: candidate.sourceCaseId,
      query: candidate.query,
      style: candidate.style,
      queryType: candidate.queryType,
      proposedRelevantIds: Object.freeze([...candidate.proposedRelevantIds]),
      proposedHardNegativeIds: Object.freeze([...candidate.proposedHardNegativeIds]),
      reviewStatus: decision ? decision.decision : 'pending-human-review',
      decision,
    });
  });

  return Object.freeze({
    schemaVersion: KOREAN_QUERY_REVIEW_BATCH_SCHEMA_VERSION,
    batchId: batchManifest.batchId,
    selectionPolicy: batchManifest.selectionPolicy,
    itemCount: items.length,
    reviewStatus: items.every((item) => item.decision) ? 'review-complete' : 'pending-human-review',
    requiresHumanDecision: true,
    autoApprove: false,
    productionSearchConnected: false,
    queryTypeCounts: Object.freeze(countBy(items, 'queryType')),
    styleCounts: Object.freeze(countBy(items, 'style')),
    reviewCriteria: REVIEW_CRITERIA,
    items: Object.freeze(items),
  });
}

export function writeKoreanQueryReviewBatch(result, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, `${result.batchId}.json`),
    `${JSON.stringify(result, null, 2)}\n`,
    'utf8',
  );

  const lines = [
    `# 한국어 평가 질의 사람 검토 배치 · ${result.batchId}`,
    '',
    `- 검토 항목: ${result.itemCount}건`,
    `- 질의 유형 분포: ${Object.entries(result.queryTypeCounts).map(([key, value]) => `${key} ${value}`).join(' · ')}`,
    `- 문체 분포: ${Object.entries(result.styleCounts).map(([key, value]) => `${key} ${value}`).join(' · ')}`,
    '- 자동 승인: 금지',
    '- 공개 검색 연결: 없음',
    '',
    '## 검토 기준',
    '',
    ...result.reviewCriteria.map((criterion, index) => `${index + 1}. ${criterion}`),
    '',
    '## 검토 목록',
    '',
    '| 순서 | 후보 ID | 유형 | 문체 | 질의 | 제안 정답 | hard-negative | 현재 상태 |',
    '|---:|---|---|---|---|---|---|---|',
    ...result.items.map((item) => `| ${item.order} | ${item.candidateId} | ${item.queryType} | ${item.style} | ${item.query.replace(/\|/g, '\\|')} | ${item.proposedRelevantIds.join(', ')} | ${item.proposedHardNegativeIds.join(', ')} | ${item.reviewStatus} |`),
    '',
    '> 결정은 `korean-query-approvals.json`에 실제 검토자, UTC 검토 시각, 결정, 확정 라벨을 기록해야만 승인 게이트를 통과한다.',
    '',
  ];

  fs.writeFileSync(
    path.join(outputDir, `${result.batchId}.md`),
    `${lines.join('\n')}\n`,
    'utf8',
  );
}

async function main() {
  const batchArg = process.argv.find((arg) => arg.startsWith('--batch='));
  const approvalArg = process.argv.find((arg) => arg.startsWith('--approvals='));
  const outputArg = process.argv.find((arg) => arg.startsWith('--output-dir='));

  const batchPath = path.resolve(
    batchArg ? batchArg.slice('--batch='.length) : path.join(projectRoot, 'data/ai-evaluation/korean-query-review-batch-001.json'),
  );
  const approvalPath = path.resolve(
    approvalArg ? approvalArg.slice('--approvals='.length) : path.join(projectRoot, 'data/ai-evaluation/korean-query-approvals.json'),
  );

  const result = buildKoreanQueryReviewBatch({
    batchManifest: readJson(batchPath),
    approvalManifest: readJson(approvalPath),
  });

  if (outputArg) writeKoreanQueryReviewBatch(result, path.resolve(outputArg.slice('--output-dir='.length)));
  else process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`✗ Korean query review batch generation failed: ${error.message}`);
    process.exit(1);
  });
}
