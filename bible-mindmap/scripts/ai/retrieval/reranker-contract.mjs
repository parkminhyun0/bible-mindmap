const MAX_RERANK_CANDIDATES = 50;

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateRerankCandidates(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new TypeError('rerank candidates must be a non-empty array');
  }
  if (candidates.length > MAX_RERANK_CANDIDATES) {
    throw new RangeError(`rerank candidates may contain at most ${MAX_RERANK_CANDIDATES} items`);
  }
  const ids = new Set();
  return candidates.map((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') throw new TypeError(`candidates[${index}] must be an object`);
    const id = String(candidate.id || '').trim();
    const text = String(candidate.text || '').trim();
    if (!id) throw new TypeError(`candidates[${index}].id is required`);
    if (ids.has(id)) throw new TypeError(`duplicate rerank candidate id: ${id}`);
    ids.add(id);
    if (!text) throw new TypeError(`candidates[${index}].text is required`);
    if (!Array.isArray(candidate.sourceRefs) || candidate.sourceRefs.length === 0) {
      throw new TypeError(`candidates[${index}].sourceRefs must be a non-empty array`);
    }
    const sourceRefs = candidate.sourceRefs.map((ref, refIndex) => {
      if (!nonEmpty(ref)) throw new TypeError(`candidates[${index}].sourceRefs[${refIndex}] must be non-empty`);
      return ref.trim();
    });
    const hybridRank = Number(candidate.rank);
    if (!Number.isInteger(hybridRank) || hybridRank < 1) throw new TypeError(`candidates[${index}].rank must be a positive integer`);
    return Object.freeze({
      ...candidate,
      id,
      title: typeof candidate.title === 'string' ? candidate.title.trim() : '',
      text,
      sourceRefs: Object.freeze(sourceRefs),
      rank: hybridRank,
      score: candidate.score && typeof candidate.score === 'object' ? Object.freeze({ ...candidate.score }) : Object.freeze({}),
      metadata: candidate.metadata && typeof candidate.metadata === 'object' ? Object.freeze({ ...candidate.metadata }) : Object.freeze({}),
    });
  });
}

export function normalizeRerankerResult(result, expectedCount) {
  if (!result || typeof result !== 'object') throw new TypeError('reranker result must be an object');
  if (!nonEmpty(result.provider) || !nonEmpty(result.model)) throw new TypeError('reranker provider and model are required');
  if (!Number.isInteger(expectedCount) || expectedCount < 1) throw new TypeError('expectedCount must be a positive integer');
  if (!Array.isArray(result.rankings) || result.rankings.length !== expectedCount) {
    throw new TypeError(`reranker rankings must contain exactly ${expectedCount} items`);
  }
  const seen = new Set();
  const rankings = result.rankings.map((ranking, position) => {
    if (!ranking || typeof ranking !== 'object') throw new TypeError(`rankings[${position}] must be an object`);
    if (!Number.isInteger(ranking.index) || ranking.index < 0 || ranking.index >= expectedCount) {
      throw new RangeError(`rankings[${position}].index is out of range`);
    }
    if (seen.has(ranking.index)) throw new TypeError(`duplicate reranker index: ${ranking.index}`);
    seen.add(ranking.index);
    if (!Number.isFinite(ranking.logit)) throw new TypeError(`rankings[${position}].logit must be finite`);
    return Object.freeze({ index: ranking.index, logit: ranking.logit });
  });
  const sorted = [...rankings].sort((left, right) => right.logit - left.logit || left.index - right.index);
  return Object.freeze({
    provider: result.provider.trim(),
    model: result.model.trim(),
    requestId: nonEmpty(result.requestId) ? result.requestId.trim() : null,
    usage: result.usage && typeof result.usage === 'object' ? Object.freeze({ ...result.usage }) : null,
    rankings: Object.freeze(sorted),
  });
}

export async function rerankHybridResults({ query, candidates, rerank, topK = 5 }) {
  if (!nonEmpty(query)) throw new TypeError('rerank query must be non-empty');
  if (typeof rerank !== 'function') throw new TypeError('rerank must be a function');
  if (!Number.isInteger(topK) || topK < 1 || topK > 20) throw new RangeError('rerank topK must be between 1 and 20');
  const normalizedCandidates = validateRerankCandidates(candidates);
  const response = normalizeRerankerResult(await rerank({
    query: query.trim(),
    passages: normalizedCandidates.map((candidate) => ({
      id: candidate.id,
      text: `${candidate.title ? `${candidate.title}\n` : ''}${candidate.text}`,
    })),
  }), normalizedCandidates.length);

  return Object.freeze({
    schemaVersion: 1,
    query: query.trim(),
    provider: response.provider,
    model: response.model,
    requestId: response.requestId,
    usage: response.usage,
    candidateCount: normalizedCandidates.length,
    results: Object.freeze(response.rankings
      .slice(0, Math.min(topK, response.rankings.length))
      .map((ranking, position) => {
        const candidate = normalizedCandidates[ranking.index];
        return Object.freeze({
          ...candidate,
          rank: position + 1,
          reranker: Object.freeze({
            logit: ranking.logit,
            rank: position + 1,
            originalHybridRank: candidate.rank,
          }),
        });
      })),
    changesProductionIndex: false,
  });
}

export const RERANKER_CONTRACT_LIMITS = Object.freeze({
  maxCandidates: MAX_RERANK_CANDIDATES,
  maxFinalResults: 20,
});
