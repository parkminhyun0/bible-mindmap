const MAX_DOCUMENTS = 10_000;
const EMBEDDING_BATCH_SIZE = 128;

function normalizeText(value) {
  return value.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function tokenizeSearchText(value) {
  if (typeof value !== 'string') throw new TypeError('search text must be a string');
  const normalized = normalizeText(value);
  if (!normalized) return [];
  const words = normalized.split(/\s+/u).filter(Boolean);
  const cjkBigrams = [];
  for (const word of words) {
    if (/^[\p{Script=Hangul}\p{Script=Han}]+$/u.test(word) && word.length >= 2) {
      for (let index = 0; index < word.length - 1; index += 1) cjkBigrams.push(word.slice(index, index + 2));
    }
  }
  return [...words, ...cjkBigrams];
}

export function validateSearchDocuments(documents) {
  if (!Array.isArray(documents) || documents.length === 0) throw new TypeError('documents must be a non-empty array');
  if (documents.length > MAX_DOCUMENTS) throw new RangeError(`documents may contain at most ${MAX_DOCUMENTS} items`);
  const ids = new Set();
  return documents.map((document, index) => {
    if (!document || typeof document !== 'object') throw new TypeError(`documents[${index}] must be an object`);
    const id = String(document.id || '').trim();
    const text = String(document.text || '').trim();
    if (!id) throw new TypeError(`documents[${index}].id is required`);
    if (ids.has(id)) throw new TypeError(`duplicate document id: ${id}`);
    ids.add(id);
    if (!text) throw new TypeError(`documents[${index}].text is required`);
    if (!Array.isArray(document.sourceRefs) || document.sourceRefs.length === 0) {
      throw new TypeError(`documents[${index}].sourceRefs must be a non-empty array`);
    }
    const sourceRefs = document.sourceRefs.map((ref, refIndex) => {
      if (typeof ref !== 'string' || !ref.trim()) throw new TypeError(`documents[${index}].sourceRefs[${refIndex}] must be non-empty`);
      return ref.trim();
    });
    return Object.freeze({
      id,
      title: typeof document.title === 'string' ? document.title.trim() : '',
      text,
      sourceRefs: Object.freeze(sourceRefs),
      metadata: document.metadata && typeof document.metadata === 'object' ? Object.freeze({ ...document.metadata }) : Object.freeze({}),
    });
  });
}

export function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length || left.length < 1) {
    throw new TypeError('vectors must be non-empty arrays with equal dimensions');
  }
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (!Number.isFinite(a) || !Number.isFinite(b)) throw new TypeError('vectors must contain finite numbers');
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function keywordScore(query, document) {
  const queryTokens = [...new Set(tokenizeSearchText(query))];
  if (queryTokens.length === 0) return 0;
  const documentTokens = tokenizeSearchText(`${document.title} ${document.text}`);
  const frequencies = new Map();
  for (const token of documentTokens) frequencies.set(token, (frequencies.get(token) || 0) + 1);
  let matched = 0;
  let frequency = 0;
  for (const token of queryTokens) {
    const count = frequencies.get(token) || 0;
    if (count > 0) matched += 1;
    frequency += Math.min(count, 3);
  }
  const coverage = matched / queryTokens.length;
  const normalizedFrequency = Math.min(frequency / (queryTokens.length * 3), 1);
  const phraseBonus = normalizeText(`${document.title} ${document.text}`).includes(normalizeText(query)) ? 1 : 0;
  return coverage * 0.7 + normalizedFrequency * 0.2 + phraseBonus * 0.1;
}

function rankItems(items, scoreOf) {
  const itemId = (item) => item?.document?.id || item?.id || '';
  return items
    .map((item) => ({ item, score: scoreOf(item) }))
    .sort((left, right) => right.score - left.score || itemId(left.item).localeCompare(itemId(right.item)))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function validateEmbeddingResult(result, expectedTask, expectedCount) {
  if (!result || typeof result !== 'object') throw new TypeError('embedding result must be an object');
  if (result.task !== expectedTask) throw new TypeError(`embedding task must be ${expectedTask}`);
  if (!result.provider || !result.model) throw new TypeError('embedding provider and model are required');
  if (!Number.isInteger(result.dimension) || result.dimension < 8) throw new TypeError('embedding dimension must be at least 8');
  if (!Array.isArray(result.vectors) || result.vectors.length !== expectedCount) {
    throw new TypeError(`embedding vector count must be ${expectedCount}`);
  }
  result.vectors.forEach((vector, index) => {
    if (!Array.isArray(vector) || vector.length !== result.dimension) throw new TypeError(`embedding vector ${index} dimension mismatch`);
    if (vector.some((value) => !Number.isFinite(value))) throw new TypeError(`embedding vector ${index} contains non-finite values`);
  });
  return result;
}

export function buildHybridIndex({ documents, embeddingResult }) {
  const normalizedDocuments = validateSearchDocuments(documents);
  const embeddings = validateEmbeddingResult(embeddingResult, 'document', normalizedDocuments.length);
  return Object.freeze({
    version: 1,
    provider: embeddings.provider,
    model: embeddings.model,
    dimension: embeddings.dimension,
    count: normalizedDocuments.length,
    createdAt: new Date().toISOString(),
    entries: Object.freeze(normalizedDocuments.map((document, index) => Object.freeze({
      document,
      vector: Object.freeze([...embeddings.vectors[index]]),
    }))),
  });
}

export async function createHybridIndex({ documents, embed }) {
  if (typeof embed !== 'function') throw new TypeError('embed must be a function');
  const normalizedDocuments = validateSearchDocuments(documents);
  const vectors = [];
  let identity = null;
  for (let offset = 0; offset < normalizedDocuments.length; offset += EMBEDDING_BATCH_SIZE) {
    const batch = normalizedDocuments.slice(offset, offset + EMBEDDING_BATCH_SIZE);
    const result = validateEmbeddingResult(
      await embed({ texts: batch.map((item) => item.text), task: 'document' }),
      'document',
      batch.length,
    );
    if (identity && (
      identity.provider !== result.provider
      || identity.model !== result.model
      || identity.dimension !== result.dimension
    )) {
      throw new TypeError('embedding provider, model, and dimension must remain stable across batches');
    }
    identity ||= { provider: result.provider, model: result.model, dimension: result.dimension };
    vectors.push(...result.vectors);
  }
  return buildHybridIndex({
    documents: normalizedDocuments,
    embeddingResult: { ...identity, task: 'document', vectors },
  });
}

export function searchHybridIndex({ query, index, queryEmbedding, topK = 20, rrfK = 60, keywordWeight = 1, vectorWeight = 1 }) {
  if (typeof query !== 'string' || !query.trim()) throw new TypeError('query must be non-empty');
  if (!index || index.version !== 1 || !Array.isArray(index.entries) || index.entries.length === 0) throw new TypeError('index is invalid');
  if (!Number.isInteger(topK) || topK < 1 || topK > 100) throw new RangeError('topK must be between 1 and 100');
  if (!Number.isFinite(rrfK) || rrfK < 1) throw new RangeError('rrfK must be at least 1');
  if (!Number.isFinite(keywordWeight) || keywordWeight < 0 || !Number.isFinite(vectorWeight) || vectorWeight < 0) {
    throw new RangeError('search weights must be non-negative');
  }
  if (keywordWeight === 0 && vectorWeight === 0) throw new RangeError('at least one search weight must be positive');

  const queryResult = validateEmbeddingResult(queryEmbedding, 'query', 1);
  if (queryResult.provider !== index.provider || queryResult.model !== index.model || queryResult.dimension !== index.dimension) {
    throw new TypeError('query embedding identity must match the index');
  }
  const queryVector = queryResult.vectors[0];
  const keywordRanking = rankItems(index.entries, (entry) => keywordScore(query, entry.document));
  const vectorRanking = rankItems(index.entries, (entry) => cosineSimilarity(queryVector, entry.vector));
  const keywordById = new Map(keywordRanking.map((entry) => [entry.item.document.id, entry]));
  const vectorById = new Map(vectorRanking.map((entry) => [entry.item.document.id, entry]));

  return index.entries
    .map((entry) => {
      const keyword = keywordById.get(entry.document.id);
      const vector = vectorById.get(entry.document.id);
      return {
        id: entry.document.id,
        title: entry.document.title,
        text: entry.document.text,
        sourceRefs: entry.document.sourceRefs,
        metadata: entry.document.metadata,
        score: Object.freeze({
          hybrid: keywordWeight / (rrfK + keyword.rank) + vectorWeight / (rrfK + vector.rank),
          keyword: keyword.score,
          vector: vector.score,
          keywordRank: keyword.rank,
          vectorRank: vector.rank,
        }),
      };
    })
    .sort((left, right) => right.score.hybrid - left.score.hybrid || right.score.vector - left.score.vector || left.id.localeCompare(right.id))
    .slice(0, Math.min(topK, index.entries.length))
    .map((result, indexPosition) => Object.freeze({ ...result, rank: indexPosition + 1 }));
}

export async function runHybridSearch({ query, index, embed, ...options }) {
  if (typeof embed !== 'function') throw new TypeError('embed must be a function');
  const queryEmbedding = await embed({ texts: [query], task: 'query' });
  return searchHybridIndex({ query, index, queryEmbedding, ...options });
}
