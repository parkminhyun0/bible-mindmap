export const ALIGNMENT_SCHEMA_VERSION = '1.0.0';

export const ALIGNMENT_RELATIONS = Object.freeze([
  'direct',
  'one-to-many',
  'many-to-one',
  'omitted',
  'supplied',
  'uncertain',
]);

export const ALIGNMENT_STATUSES = Object.freeze([
  'auto',
  'review',
  'verified',
  'rejected',
]);

export function normalizeStrongId(value) {
  const raw = String(value || '').trim().toUpperCase();
  const match = raw.match(/^([GH])0*(\d+)$/);
  if (!match) return raw;
  return `${match[1]}${Number(match[2])}`;
}

export function createTokenId({ bookId, chapter, verse, language, index }) {
  if (!bookId || !Number.isInteger(chapter) || !Number.isInteger(verse) || !language || !Number.isInteger(index)) {
    throw new TypeError('createTokenId requires bookId, integer chapter/verse/index, and language.');
  }
  return `${String(bookId).toLowerCase()}.${chapter}.${verse}.${String(language).toLowerCase()}.${index}`;
}

export function validateTextSpan(span, textLength = null) {
  const errors = [];
  if (!span || typeof span !== 'object') return ['span must be an object'];
  if (!Number.isInteger(span.start) || span.start < 0) errors.push('span.start must be a non-negative integer');
  if (!Number.isInteger(span.end) || span.end <= span.start) errors.push('span.end must be an integer greater than start');
  if (textLength != null && Number.isInteger(span.end) && span.end > textLength) errors.push('span.end exceeds text length');
  return errors;
}

export function validateAlignmentRecord(record) {
  const errors = [];
  if (!record || typeof record !== 'object') return ['record must be an object'];
  if (record.schemaVersion !== ALIGNMENT_SCHEMA_VERSION) errors.push(`schemaVersion must be ${ALIGNMENT_SCHEMA_VERSION}`);
  if (!record.tokenId || typeof record.tokenId !== 'string') errors.push('tokenId is required');
  if (!record.strong || !/^[GH]\d+$/.test(normalizeStrongId(record.strong))) errors.push('strong must be a normalized G/H Strong id');
  if (!ALIGNMENT_RELATIONS.includes(record.relation)) errors.push(`relation must be one of: ${ALIGNMENT_RELATIONS.join(', ')}`);
  if (!ALIGNMENT_STATUSES.includes(record.status)) errors.push(`status must be one of: ${ALIGNMENT_STATUSES.join(', ')}`);
  if (typeof record.confidence !== 'number' || record.confidence < 0 || record.confidence > 1) errors.push('confidence must be between 0 and 1');

  if (!record.targets || typeof record.targets !== 'object') {
    errors.push('targets object is required');
  } else {
    for (const [language, target] of Object.entries(record.targets)) {
      if (!target || typeof target !== 'object') {
        errors.push(`targets.${language} must be an object`);
        continue;
      }
      if (target.text != null && typeof target.text !== 'string') errors.push(`targets.${language}.text must be a string`);
      const spans = Array.isArray(target.spans) ? target.spans : [];
      if (!spans.length && !['omitted', 'supplied', 'uncertain'].includes(record.relation)) {
        errors.push(`targets.${language}.spans is required for ${record.relation}`);
      }
      spans.forEach((span, index) => {
        for (const error of validateTextSpan(span, target.text?.length ?? null)) {
          errors.push(`targets.${language}.spans[${index}]: ${error}`);
        }
      });
    }
  }
  return errors;
}

export function isAlignmentStale(record, currentVersions = {}) {
  const sourceVersions = record?.sourceVersions || {};
  return Object.entries(currentVersions).some(([key, value]) => value != null && sourceVersions[key] !== value);
}
