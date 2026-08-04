import assert from 'node:assert/strict';
import { generateKoreanEvaluationCandidates } from './ai/evaluation/korean-query-candidates.mjs';
import { promoteApprovedKoreanQueries } from './ai/evaluation/promote-approved-korean-queries.mjs';

const candidates = generateKoreanEvaluationCandidates();
const first = candidates.candidates[0];

const approved = promoteApprovedKoreanQueries({
  candidateResult: candidates,
  manifest: {
    schemaVersion: 1,
    requiresHumanReviewer: true,
    decisions: [{
      candidateId: first.id,
      decision: 'approved',
      reviewer: 'human-reviewer',
      reviewedAt: '2026-08-04T09:30:00Z',
      autoApproved: false,
    }],
  },
});

assert.equal(approved.approvedCount, 1);
assert.equal(approved.cases[0].metadata.approvalStatus, 'human-approved');
assert.equal(approved.productionSearchConnected, false);
assert.equal(approved.browserNvidiaCallEnabled, false);

const rejected = promoteApprovedKoreanQueries({
  candidateResult: candidates,
  manifest: {
    schemaVersion: 1,
    requiresHumanReviewer: true,
    decisions: [{
      candidateId: first.id,
      decision: 'rejected',
      reviewer: 'human-reviewer',
      reviewedAt: '2026-08-04T09:30:00Z',
    }],
  },
});
assert.equal(rejected.approvedCount, 0);

assert.throws(() => promoteApprovedKoreanQueries({
  candidateResult: candidates,
  manifest: {
    schemaVersion: 1,
    requiresHumanReviewer: true,
    decisions: [{
      candidateId: first.id,
      decision: 'approved',
      reviewer: 'human-reviewer',
      reviewedAt: '2026-08-04T09:30:00Z',
      autoApproved: true,
    }],
  },
}), /automatic approval is forbidden/);

assert.throws(() => promoteApprovedKoreanQueries({
  candidateResult: candidates,
  manifest: {
    schemaVersion: 1,
    requiresHumanReviewer: true,
    decisions: [{
      candidateId: 'unknown.candidate',
      decision: 'approved',
      reviewer: 'human-reviewer',
      reviewedAt: '2026-08-04T09:30:00Z',
    }],
  },
}), /unknown Korean query candidate/);

assert.throws(() => promoteApprovedKoreanQueries({
  candidateResult: candidates,
  manifest: {
    schemaVersion: 1,
    requiresHumanReviewer: true,
    decisions: [
      { candidateId: first.id, decision: 'approved', reviewer: 'a', reviewedAt: '2026-08-04T09:30:00Z' },
      { candidateId: first.id, decision: 'rejected', reviewer: 'b', reviewedAt: '2026-08-04T09:31:00Z' },
    ],
  },
}), /duplicate approval decision/);

console.log('✓ Korean query approval promotion gate verified');
