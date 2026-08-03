import crypto from 'node:crypto';
import { DEFAULT_NVIDIA_EMBEDDING_MODEL_ID } from '../poc/nvidia-embedding-model-policy.mjs';

const REQUIRED_DIMENSION = 2048;
const BYTES_PER_FLOAT32 = 4;

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function createProductionIndexManifest({
  index,
  corpusRevision,
  sourceCommit,
  approvedDocumentIds,
  generatedAt = new Date().toISOString(),
} = {}) {
  if (!index || index.version !== 1 || !Array.isArray(index.entries) || index.entries.length === 0) {
    throw new TypeError('production index source is invalid');
  }
  if (index.provider !== 'nvidia') throw new TypeError('production index provider must be nvidia');
  if (index.model !== DEFAULT_NVIDIA_EMBEDDING_MODEL_ID) {
    throw new TypeError(`production index model must be ${DEFAULT_NVIDIA_EMBEDDING_MODEL_ID}`);
  }
  if (index.dimension !== REQUIRED_DIMENSION) {
    throw new TypeError(`production index dimension must be ${REQUIRED_DIMENSION}`);
  }
  if (!nonEmpty(corpusRevision)) throw new TypeError('corpusRevision is required');
  if (!/^[0-9a-f]{40}$/.test(sourceCommit || '')) throw new TypeError('sourceCommit must be a full Git commit SHA');
  if (!Array.isArray(approvedDocumentIds) || approvedDocumentIds.length !== index.entries.length) {
    throw new TypeError('approvedDocumentIds must match the index entry count');
  }

  const entryIds = index.entries.map((entry, position) => {
    const id = String(entry?.document?.id || '').trim();
    if (!id) throw new TypeError(`index.entries[${position}].document.id is required`);
    if (!Array.isArray(entry.document.sourceRefs) || entry.document.sourceRefs.length === 0) {
      throw new TypeError(`index.entries[${position}] must preserve sourceRefs`);
    }
    return id;
  });
  const approved = approvedDocumentIds.map((id) => String(id || '').trim());
  if (approved.some((id) => !id)) throw new TypeError('approvedDocumentIds may not contain empty IDs');
  if (new Set(approved).size !== approved.length) throw new TypeError('approvedDocumentIds must be unique');
  if (entryIds.some((id, indexPosition) => id !== approved[indexPosition])) {
    throw new TypeError('index entries must exactly match the approved document order');
  }

  const sourceRefCount = index.entries.reduce((sum, entry) => sum + entry.document.sourceRefs.length, 0);
  const vectorBytesEstimate = index.entries.length * REQUIRED_DIMENSION * BYTES_PER_FLOAT32;
  return Object.freeze({
    schemaVersion: 1,
    status: 'design-validated',
    provider: index.provider,
    model: index.model,
    dimension: index.dimension,
    corpusRevision: corpusRevision.trim(),
    sourceCommit,
    documentCount: entryIds.length,
    sourceRefCount,
    documentIdsSha256: sha256(entryIds.join('\n')),
    vectorBytesEstimate,
    vectorEncoding: 'float32',
    approvedOnly: true,
    generatedAt,
    productionActivated: false,
    requiresHumanApproval: true,
  });
}

export function validateProductionIndexManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') throw new TypeError('production index manifest must be an object');
  if (manifest.schemaVersion !== 1) throw new TypeError('production index manifest schemaVersion must be 1');
  if (manifest.provider !== 'nvidia') throw new TypeError('production index manifest provider must be nvidia');
  if (manifest.model !== DEFAULT_NVIDIA_EMBEDDING_MODEL_ID) throw new TypeError('production index manifest model mismatch');
  if (manifest.dimension !== REQUIRED_DIMENSION) throw new TypeError('production index manifest dimension mismatch');
  if (!Number.isInteger(manifest.documentCount) || manifest.documentCount < 1) throw new TypeError('documentCount must be positive');
  if (!Number.isInteger(manifest.sourceRefCount) || manifest.sourceRefCount < manifest.documentCount) {
    throw new TypeError('sourceRefCount must cover every document');
  }
  if (!/^[0-9a-f]{64}$/.test(manifest.documentIdsSha256 || '')) throw new TypeError('documentIdsSha256 must be SHA-256');
  if (manifest.vectorBytesEstimate !== manifest.documentCount * REQUIRED_DIMENSION * BYTES_PER_FLOAT32) {
    throw new TypeError('vectorBytesEstimate mismatch');
  }
  if (manifest.approvedOnly !== true) throw new TypeError('production index must contain approved documents only');
  if (manifest.productionActivated !== false) throw new TypeError('P1-2a must not activate the production index');
  if (manifest.requiresHumanApproval !== true) throw new TypeError('production activation must require human approval');
  return manifest;
}

export const PRODUCTION_INDEX_CONTRACT = Object.freeze({
  dimension: REQUIRED_DIMENSION,
  model: DEFAULT_NVIDIA_EMBEDDING_MODEL_ID,
  vectorEncoding: 'float32',
  bytesPerVector: REQUIRED_DIMENSION * BYTES_PER_FLOAT32,
});
