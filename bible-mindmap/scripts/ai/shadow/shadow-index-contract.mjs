import crypto from 'node:crypto';
import {
  createProductionIndexManifest,
  validateProductionIndexManifest,
} from '../retrieval/production-index-contract.mjs';
import {
  CANONICAL_SHADOW_CORPUS_REVISION,
  EXPECTED_CANONICAL_SHADOW_DOCUMENTS,
} from './canonical-shadow-corpus.mjs';
import {
  NVIDIA_SHADOW_EVALUATION_REVISION,
  SHADOW_EVALUATION_CASES,
} from './nvidia-shadow-evaluation-fixture.mjs';

function hashJson(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function hashVectors(entries) {
  const hash = crypto.createHash('sha256');
  const buffer = Buffer.allocUnsafe(4);
  for (const entry of entries) {
    for (const value of entry.vector) {
      buffer.writeFloatLE(value, 0);
      hash.update(buffer);
    }
  }
  return hash.digest('hex');
}

export const SHADOW_INDEX_CONTRACT = Object.freeze({
  schemaVersion: 1,
  stage: 'P1-2c',
  corpusRevision: CANONICAL_SHADOW_CORPUS_REVISION,
  evaluationRevision: NVIDIA_SHADOW_EVALUATION_REVISION,
  documentCount: EXPECTED_CANONICAL_SHADOW_DOCUMENTS,
  queryCount: SHADOW_EVALUATION_CASES.length,
  shadowOnly: true,
  productionActivated: false,
  liveSearchConnected: false,
  requiresHumanApproval: true,
});

export function createShadowIndexManifest({
  index,
  sourceCommit,
  approvedDocumentIds,
  generatedAt = new Date().toISOString(),
} = {}) {
  const base = createProductionIndexManifest({
    index,
    corpusRevision: CANONICAL_SHADOW_CORPUS_REVISION,
    sourceCommit,
    approvedDocumentIds,
    generatedAt,
  });
  validateProductionIndexManifest(base);
  if (base.documentCount !== EXPECTED_CANONICAL_SHADOW_DOCUMENTS) {
    throw new TypeError(`shadow index must contain ${EXPECTED_CANONICAL_SHADOW_DOCUMENTS} documents`);
  }

  const documentPayload = index.entries.map((entry) => ({
    id: entry.document.id,
    title: entry.document.title,
    text: entry.document.text,
    sourceRefs: entry.document.sourceRefs,
    metadata: entry.document.metadata,
  }));

  return Object.freeze({
    ...base,
    status: 'shadow-generated',
    stage: SHADOW_INDEX_CONTRACT.stage,
    evaluationRevision: NVIDIA_SHADOW_EVALUATION_REVISION,
    queryCount: SHADOW_EVALUATION_CASES.length,
    documentContentSha256: hashJson(documentPayload),
    vectorDataSha256: hashVectors(index.entries),
    shadowOnly: true,
    liveSearchConnected: false,
    productionActivated: false,
    requiresHumanApproval: true,
  });
}

export function validateShadowIndexManifest(manifest) {
  validateProductionIndexManifest(manifest);
  if (manifest.status !== 'shadow-generated') throw new TypeError('shadow manifest status mismatch');
  if (manifest.stage !== SHADOW_INDEX_CONTRACT.stage) throw new TypeError('shadow manifest stage mismatch');
  if (manifest.corpusRevision !== CANONICAL_SHADOW_CORPUS_REVISION) throw new TypeError('shadow corpus revision mismatch');
  if (manifest.evaluationRevision !== NVIDIA_SHADOW_EVALUATION_REVISION) throw new TypeError('shadow evaluation revision mismatch');
  if (manifest.documentCount !== EXPECTED_CANONICAL_SHADOW_DOCUMENTS) throw new TypeError('shadow document count mismatch');
  if (manifest.queryCount !== SHADOW_EVALUATION_CASES.length) throw new TypeError('shadow query count mismatch');
  if (!/^[0-9a-f]{64}$/.test(manifest.documentContentSha256 || '')) throw new TypeError('documentContentSha256 must be SHA-256');
  if (!/^[0-9a-f]{64}$/.test(manifest.vectorDataSha256 || '')) throw new TypeError('vectorDataSha256 must be SHA-256');
  if (manifest.shadowOnly !== true) throw new TypeError('shadowOnly must remain true');
  if (manifest.liveSearchConnected !== false) throw new TypeError('shadow index must not connect to live search');
  if (manifest.productionActivated !== false) throw new TypeError('shadow index must not activate production');
  if (manifest.requiresHumanApproval !== true) throw new TypeError('shadow promotion must require human approval');
  return manifest;
}
