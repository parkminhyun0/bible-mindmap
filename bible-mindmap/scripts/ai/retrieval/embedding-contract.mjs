export const EMBEDDING_TASKS = Object.freeze(['query', 'document']);

export function validateEmbeddingInput(input) {
  if (!input || typeof input !== 'object') throw new TypeError('embedding input must be an object');
  const texts = Array.isArray(input.texts) ? input.texts : [];
  if (texts.length === 0) throw new TypeError('texts must be a non-empty array');
  if (texts.length > 128) throw new RangeError('texts may contain at most 128 items');
  texts.forEach((text, index) => {
    if (typeof text !== 'string' || !text.trim()) throw new TypeError(`texts[${index}] must be non-empty`);
    if (text.length > 12000) throw new RangeError(`texts[${index}] exceeds 12000 characters`);
  });
  const task = input.task || 'document';
  if (!EMBEDDING_TASKS.includes(task)) throw new TypeError(`task must be one of: ${EMBEDDING_TASKS.join(', ')}`);
  return { texts: texts.map((text) => text.trim()), task };
}

export function normalizeEmbeddingResult({ provider, model, task, vectors, requestId = null, usage = null }) {
  if (!provider || !model) throw new TypeError('provider and model are required');
  if (!Array.isArray(vectors) || vectors.length === 0) throw new TypeError('vectors must be a non-empty array');
  const dimension = vectors[0]?.length;
  if (!Number.isInteger(dimension) || dimension < 8) throw new TypeError('embedding dimension must be at least 8');
  vectors.forEach((vector, index) => {
    if (!Array.isArray(vector) || vector.length !== dimension) throw new TypeError(`vectors[${index}] dimension mismatch`);
    if (vector.some((value) => !Number.isFinite(value))) throw new TypeError(`vectors[${index}] contains non-finite values`);
  });
  return Object.freeze({ provider, model, task, dimension, count: vectors.length, vectors, requestId, usage });
}
