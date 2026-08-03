export const AI_CANDIDATE_SCHEMA_VERSION = '1.0.0';

export const AI_CANDIDATE_STATUSES = Object.freeze([
  'candidate',
  'verified',
  'reviewed',
  'approved',
  'rejected',
]);

export const AI_CANDIDATE_TYPES = Object.freeze([
  'curated-chapter',
  'canonical-concept',
  'canonical-usage',
  'person-relation',
  'place-link',
  'period-link',
  'original-language-note',
  'search-keyword',
]);

export const AI_CANDIDATE_PROVIDERS = Object.freeze([
  'nvidia-build',
  'openai',
  'manual',
  'other',
]);

export const AI_CANDIDATE_REQUIRED_FIELDS = Object.freeze([
  'id',
  'schemaVersion',
  'type',
  'status',
  'payload',
  'provenance',
  'verification',
  'review',
  'createdAt',
  'updatedAt',
]);

export function createAiCandidate(input) {
  const now = new Date().toISOString();
  return {
    id: input.id,
    schemaVersion: AI_CANDIDATE_SCHEMA_VERSION,
    type: input.type,
    status: 'candidate',
    payload: input.payload,
    provenance: {
      provider: input.provenance?.provider,
      model: input.provenance?.model,
      modelVersion: input.provenance?.modelVersion || null,
      promptVersion: input.provenance?.promptVersion,
      sourceRefs: input.provenance?.sourceRefs || [],
      generatedAt: input.provenance?.generatedAt || now,
      requestId: input.provenance?.requestId || null,
    },
    verification: {
      passed: false,
      verifierVersion: null,
      checkedAt: null,
      checks: [],
      errors: [],
      warnings: [],
    },
    review: {
      reviewedBy: null,
      reviewedAt: null,
      decision: null,
      notes: null,
    },
    createdAt: now,
    updatedAt: now,
  };
}
