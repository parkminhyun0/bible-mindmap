import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateKoreanEvaluationCandidates } from './korean-query-candidates.mjs';

export const KOREAN_QUERY_APPROVAL_SCHEMA_VERSION = 1;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function assertString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} must be a non-empty string`);
  return value.trim();
}

export function promoteApprovedKoreanQueries({ manifest, candidateResult = generateKoreanEvaluationCandidates() }) {
  if (!manifest || manifest.schemaVersion !== KOREAN_QUERY_APPROVAL_SCHEMA_VERSION) {
    throw new Error(`approval manifest schemaVersion must be ${KOREAN_QUERY_APPROVAL_SCHEMA_VERSION}`);
  }
  if (manifest.requiresHumanReviewer !== true) throw new Error('approval manifest must require a human reviewer');
  if (!Array.isArray(manifest.decisions)) throw new Error('approval manifest decisions must be an array');

  const candidatesById = new Map(candidateResult.candidates.map((candidate) => [candidate.id, candidate]));
  const seen = new Set();
  const approved = [];

  for (const decision of manifest.decisions) {
    const candidateId = assertString(decision.candidateId, 'candidateId');
    if (seen.has(candidateId)) throw new Error(`duplicate approval decision: ${candidateId}`);
    seen.add(candidateId);

    const candidate = candidatesById.get(candidateId);
    if (!candidate) throw new Error(`unknown Korean query candidate: ${candidateId}`);
    if (!['approved', 'rejected', 'changes-requested'].includes(decision.decision)) {
      throw new Error(`unsupported decision for ${candidateId}: ${decision.decision}`);
    }
    const reviewer = assertString(decision.reviewer, `reviewer for ${candidateId}`);
    const reviewedAt = assertString(decision.reviewedAt, `reviewedAt for ${candidateId}`);
    if (!ISO_DATE.test(reviewedAt)) throw new Error(`reviewedAt must be UTC ISO-8601 for ${candidateId}`);

    if (decision.decision !== 'approved') continue;
    if (decision.autoApproved === true) throw new Error(`automatic approval is forbidden: ${candidateId}`);

    const query = assertString(decision.query || candidate.query, `query for ${candidateId}`);
    const relevantIds = decision.relevantIds || candidate.proposedRelevantIds;
    const hardNegativeIds = decision.hardNegativeIds || candidate.proposedHardNegativeIds;
    if (!Array.isArray(relevantIds) || relevantIds.length === 0) throw new Error(`approved candidate requires relevantIds: ${candidateId}`);
    if (!Array.isArray(hardNegativeIds)) throw new Error(`approved candidate hardNegativeIds must be an array: ${candidateId}`);

    approved.push(Object.freeze({
      id: `ko.${candidateId}`,
      sourceCandidateId: candidateId,
      sourceCaseId: candidate.sourceCaseId,
      query,
      relevantIds: Object.freeze([...new Set(relevantIds)]),
      hardNegativeIds: Object.freeze([...new Set(hardNegativeIds)]),
      metadata: Object.freeze({
        queryType: candidate.queryType,
        language: 'ko',
        style: candidate.style,
        approvalStatus: 'human-approved',
        reviewer,
        reviewedAt,
      }),
    }));
  }

  return Object.freeze({
    schemaVersion: 1,
    sourceCandidateCount: candidateResult.candidateCount,
    decisionCount: manifest.decisions.length,
    approvedCount: approved.length,
    productionSearchConnected: false,
    browserNvidiaCallEnabled: false,
    fixtureStatus: approved.length > 0 ? 'approved-shadow-only' : 'empty-awaiting-human-approval',
    cases: Object.freeze(approved),
  });
}

export function writeApprovedKoreanFixture(result, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'approved-korean-shadow-fixture.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  const lines = [
    '# 승인된 한국어 Shadow 평가 질의',
    '',
    `- 승인 항목: ${result.approvedCount}개`,
    `- 상태: ${result.fixtureStatus}`,
    '- Production 검색 연결: 없음',
    '',
    '| ID | 질의 | 정답 라벨 | 검토자 | 검토 시각 |',
    '|---|---|---|---|---|',
    ...result.cases.map((item) => `| ${item.id} | ${item.query.replace(/\|/g, '\\|')} | ${item.relevantIds.join(', ')} | ${item.metadata.reviewer} | ${item.metadata.reviewedAt} |`),
    '',
  ];
  fs.writeFileSync(path.join(outputDir, 'approved-korean-shadow-fixture.md'), `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  const manifestArg = process.argv.find((arg) => arg.startsWith('--manifest='));
  if (!manifestArg) throw new Error('--manifest=<path> is required');
  const outputArg = process.argv.find((arg) => arg.startsWith('--output-dir='));
  const manifest = JSON.parse(fs.readFileSync(path.resolve(manifestArg.slice('--manifest='.length)), 'utf8'));
  const result = promoteApprovedKoreanQueries({ manifest });
  if (outputArg) writeApprovedKoreanFixture(result, path.resolve(outputArg.slice('--output-dir='.length)));
  else process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`✗ Korean query approval promotion failed: ${error.message}`);
    process.exit(1);
  });
}
