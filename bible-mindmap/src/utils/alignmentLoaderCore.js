import {
  ALIGNMENT_SCHEMA_VERSION,
  isAlignmentStale,
  normalizeStrongId,
  validateAlignmentRecord,
  verifyTokenChecksum,
} from '../data/translationAlignmentContract.js';

export function normalizeAlignmentTokenId(value) {
  return String(value || '').trim().toLowerCase();
}

function spanFromPilot(value) {
  if (!value?.span) return null;
  const { start, end, ...metadata } = value.span;
  if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
  return {
    text: value.text || '',
    spans: [{ start, end, ...metadata }],
    translation: value.translation || null,
  };
}

export function normalizeAlignmentPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (Array.isArray(payload.records)) return payload;

  if (payload.alignment && payload.tokenId) {
    const original = spanFromPilot(payload.alignment.original);
    const english = spanFromPilot(payload.alignment.web);
    const korean = spanFromPilot(payload.alignment.krv);
    const targets = {};
    if (original) targets.original = original;
    if (english) targets.english = english;
    if (korean) targets.korean = korean;

    const rawStatus = String(payload.alignment.status || '').toLowerCase();
    const status = rawStatus.startsWith('verified') ? 'verified'
      : rawStatus === 'auto' ? 'auto'
        : rawStatus === 'rejected' ? 'rejected'
          : 'review';

    return {
      schemaVersion: ALIGNMENT_SCHEMA_VERSION,
      book: String(payload.bookId || '').toLowerCase(),
      chapter: Number(payload.chapter),
      translation: 'multi',
      sourceVersions: payload.sourceVersions || {},
      records: [{
        schemaVersion: ALIGNMENT_SCHEMA_VERSION,
        tokenId: normalizeAlignmentTokenId(payload.tokenId),
        strong: normalizeStrongId(payload.strong),
        tokenChecksum: payload.tokenChecksum,
        relation: payload.alignment.relation || 'uncertain',
        status,
        confidence: Number(payload.alignment.confidence ?? 0),
        targets,
        sourceVersions: payload.sourceVersions || {},
        notes: 'verified pilot normalized by alignmentLoaderCore',
      }],
    };
  }

  return null;
}

export function selectAlignmentRecord(payload, tokenId) {
  const normalized = normalizeAlignmentPayload(payload);
  if (!normalized) return null;
  const wanted = normalizeAlignmentTokenId(tokenId);
  return normalized.records.find((record) => normalizeAlignmentTokenId(record?.tokenId) === wanted) || null;
}

function targetHasValidSpans(target) {
  if (!target || !Array.isArray(target.spans) || !target.spans.length) return false;
  return target.spans.every((span) => Number.isInteger(span.start)
    && Number.isInteger(span.end)
    && span.start >= 0
    && span.end > span.start
    && (!target.text || span.end <= target.text.length));
}

export function evaluateAlignmentRecord({
  record,
  targetLanguage = 'korean',
  currentSurface,
  currentSourceVersions = {},
  verseText,
}) {
  if (!record) return { status: 'missing', record: null, target: null };

  const errors = validateAlignmentRecord(record);
  if (errors.length) return { status: 'invalid', record, target: null, errors };

  const checksum = verifyTokenChecksum(record, currentSurface);
  if (!checksum.ok) return { status: checksum.reason, record, target: null, checksum };

  if (isAlignmentStale(record, currentSourceVersions)) {
    return { status: 'stale', record, target: null };
  }

  const target = record.targets?.[targetLanguage] || null;
  if (!target) return { status: 'missing-target', record, target: null };
  if (verseText != null && target.text != null && target.text !== verseText) {
    return { status: 'target-text-mismatch', record, target: null };
  }

  if (!['verified', 'auto'].includes(record.status)) {
    return { status: record.status === 'review' ? 'review' : record.status, record, target };
  }
  if (!targetHasValidSpans(target)) return { status: 'missing-spans', record, target };

  return { status: 'ready', record, target };
}

export function resolveAlignmentPayload({
  payload,
  tokenId,
  targetLanguage = 'korean',
  currentSurface,
  currentSourceVersions = {},
  verseText,
}) {
  const record = selectAlignmentRecord(payload, tokenId);
  return evaluateAlignmentRecord({
    record,
    targetLanguage,
    currentSurface,
    currentSourceVersions,
    verseText,
  });
}
