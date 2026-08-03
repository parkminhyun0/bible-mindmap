function assertFiniteNumber(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number`);
}

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index];
}

function normalizeIdList(values, label) {
  if (!Array.isArray(values)) throw new TypeError(`${label} must be an array`);
  const normalized = values.map((value) => String(value || '').trim());
  if (normalized.some((value) => !value)) throw new TypeError(`${label} contains an empty id`);
  if (new Set(normalized).size !== normalized.length) throw new TypeError(`${label} contains duplicate ids`);
  return normalized;
}

export function validateEvaluationCases(cases) {
  if (!Array.isArray(cases) || cases.length === 0) throw new TypeError('evaluation cases must be a non-empty array');
  const ids = new Set();
  return cases.map((item, index) => {
    if (!item || typeof item !== 'object') throw new TypeError(`cases[${index}] must be an object`);
    const id = String(item.id || '').trim();
    const query = String(item.query || '').trim();
    if (!id) throw new TypeError(`cases[${index}].id is required`);
    if (ids.has(id)) throw new TypeError(`duplicate evaluation case id: ${id}`);
    ids.add(id);
    if (!query) throw new TypeError(`cases[${index}].query is required`);
    if (!Array.isArray(item.relevantIds) || item.relevantIds.length === 0) {
      throw new TypeError(`cases[${index}].relevantIds must be a non-empty array`);
    }
    const relevantIds = normalizeIdList(item.relevantIds, `cases[${index}].relevantIds`);
    const hardNegativeIds = normalizeIdList(item.hardNegativeIds || [], `cases[${index}].hardNegativeIds`);
    const relevant = new Set(relevantIds);
    const overlap = hardNegativeIds.filter((value) => relevant.has(value));
    if (overlap.length) throw new TypeError(`cases[${index}] relevantIds and hardNegativeIds overlap: ${overlap.join(', ')}`);
    return Object.freeze({
      id,
      query,
      relevantIds: Object.freeze(relevantIds),
      hardNegativeIds: Object.freeze(hardNegativeIds),
      metadata: Object.freeze({ ...(item.metadata || {}) }),
    });
  });
}

export function scoreRanking(resultIds, relevantIds, k = 10, hardNegativeIds = []) {
  if (!Array.isArray(resultIds) || !Array.isArray(relevantIds) || !Array.isArray(hardNegativeIds)) {
    throw new TypeError('resultIds, relevantIds, and hardNegativeIds must be arrays');
  }
  if (!Number.isInteger(k) || k < 1) throw new RangeError('k must be a positive integer');
  const ranked = resultIds.slice(0, k);
  if (new Set(ranked).size !== ranked.length) throw new TypeError('ranked result IDs must be unique');
  const relevant = new Set(relevantIds);
  const hardNegatives = new Set(hardNegativeIds);
  const hits = ranked.filter((id) => relevant.has(id));
  const hardNegativeHits = ranked.filter((id) => hardNegatives.has(id));
  const recall = relevant.size ? hits.length / relevant.size : 0;
  const firstRelevantIndex = ranked.findIndex((id) => relevant.has(id));
  const reciprocalRank = firstRelevantIndex >= 0 ? 1 / (firstRelevantIndex + 1) : 0;
  const dcg = ranked.reduce((total, id, index) => total + (relevant.has(id) ? 1 / Math.log2(index + 2) : 0), 0);
  const idealHits = Math.min(relevant.size, k);
  let idealDcg = 0;
  for (let index = 0; index < idealHits; index += 1) idealDcg += 1 / Math.log2(index + 2);
  const ndcg = idealDcg ? dcg / idealDcg : 0;
  const hardNegativeRate = hardNegatives.size ? hardNegativeHits.length / hardNegatives.size : 0;
  return Object.freeze({
    recall,
    reciprocalRank,
    ndcg,
    hits: Object.freeze(hits),
    firstRelevantRank: firstRelevantIndex + 1 || null,
    hardNegativeHits: Object.freeze(hardNegativeHits),
    hardNegativeRate,
  });
}

export async function evaluateRetriever({ name, cases, retrieve, k = 10, now = () => performance.now() }) {
  if (typeof retrieve !== 'function') throw new TypeError('retrieve must be a function');
  const normalizedCases = validateEvaluationCases(cases);
  const rows = [];
  const latencies = [];
  let failures = 0;

  for (const item of normalizedCases) {
    const startedAt = now();
    try {
      const results = await retrieve({ query: item.query, topK: k, caseId: item.id });
      const latencyMs = Math.max(0, now() - startedAt);
      latencies.push(latencyMs);
      if (!Array.isArray(results)) throw new TypeError('retriever result must be an array');
      const resultIds = results.map((result, index) => {
        const id = typeof result === 'string' ? result : result?.id;
        if (typeof id !== 'string' || !id.trim()) throw new TypeError(`retriever result ${index} has no id`);
        return id.trim();
      });
      const metrics = scoreRanking(resultIds, item.relevantIds, k, item.hardNegativeIds);
      rows.push(Object.freeze({
        caseId: item.id,
        query: item.query,
        relevantIds: item.relevantIds,
        hardNegativeIds: item.hardNegativeIds,
        metadata: item.metadata,
        resultIds: Object.freeze(resultIds),
        latencyMs,
        ...metrics,
      }));
    } catch (error) {
      const latencyMs = Math.max(0, now() - startedAt);
      latencies.push(latencyMs);
      failures += 1;
      rows.push(Object.freeze({
        caseId: item.id,
        query: item.query,
        relevantIds: item.relevantIds,
        hardNegativeIds: item.hardNegativeIds,
        metadata: item.metadata,
        resultIds: Object.freeze([]),
        latencyMs,
        recall: 0,
        reciprocalRank: 0,
        ndcg: 0,
        hits: Object.freeze([]),
        firstRelevantRank: null,
        hardNegativeHits: Object.freeze([]),
        hardNegativeRate: 0,
        error: String(error?.message || error),
      }));
    }
  }

  const average = (field) => rows.reduce((total, row) => total + row[field], 0) / rows.length;
  const queryTypes = [...new Set(rows.map((row) => row.metadata?.queryType).filter(Boolean))];
  const segments = Object.freeze(Object.fromEntries(queryTypes.map((queryType) => {
    const segmentRows = rows.filter((row) => row.metadata?.queryType === queryType);
    const segmentAverage = (field) => segmentRows.reduce((total, row) => total + row[field], 0) / segmentRows.length;
    return [queryType, Object.freeze({
      caseCount: segmentRows.length,
      recallAtK: segmentAverage('recall'),
      mrr: segmentAverage('reciprocalRank'),
      ndcgAtK: segmentAverage('ndcg'),
      hardNegativeRate: segmentAverage('hardNegativeRate'),
    })];
  })));

  return Object.freeze({
    name: String(name || 'retriever'),
    k,
    caseCount: rows.length,
    recallAtK: average('recall'),
    mrr: average('reciprocalRank'),
    ndcgAtK: average('ndcg'),
    hardNegativeRate: average('hardNegativeRate'),
    failureRate: failures / rows.length,
    latencyMs: Object.freeze({
      mean: latencies.reduce((total, value) => total + value, 0) / latencies.length,
      p95: percentile(latencies, 0.95),
      max: Math.max(...latencies),
    }),
    segments,
    rows: Object.freeze(rows),
  });
}

export function assertRetrievalQuality({ candidate, baseline = null, thresholds = {} }) {
  if (!candidate || typeof candidate !== 'object') throw new TypeError('candidate report is required');
  const config = {
    minRecallAtK: thresholds.minRecallAtK ?? 0.8,
    minMrr: thresholds.minMrr ?? 0.75,
    minNdcgAtK: thresholds.minNdcgAtK ?? 0.8,
    maxHardNegativeRate: thresholds.maxHardNegativeRate ?? 1,
    maxFailureRate: thresholds.maxFailureRate ?? 0,
    maxP95LatencyMs: thresholds.maxP95LatencyMs ?? 5_000,
    allowedRegression: thresholds.allowedRegression ?? 0,
  };
  Object.entries(config).forEach(([key, value]) => assertFiniteNumber(value, key));

  const candidateHardNegativeRate = candidate.hardNegativeRate ?? 0;
  const errors = [];
  if (candidate.recallAtK < config.minRecallAtK) errors.push(`Recall@${candidate.k} ${candidate.recallAtK.toFixed(4)} < ${config.minRecallAtK}`);
  if (candidate.mrr < config.minMrr) errors.push(`MRR ${candidate.mrr.toFixed(4)} < ${config.minMrr}`);
  if (candidate.ndcgAtK < config.minNdcgAtK) errors.push(`nDCG@${candidate.k} ${candidate.ndcgAtK.toFixed(4)} < ${config.minNdcgAtK}`);
  if (candidateHardNegativeRate > config.maxHardNegativeRate) errors.push(`hardNegativeRate ${candidateHardNegativeRate.toFixed(4)} > ${config.maxHardNegativeRate}`);
  if (candidate.failureRate > config.maxFailureRate) errors.push(`failureRate ${candidate.failureRate.toFixed(4)} > ${config.maxFailureRate}`);
  if (candidate.latencyMs.p95 > config.maxP95LatencyMs) errors.push(`p95 latency ${candidate.latencyMs.p95.toFixed(2)}ms > ${config.maxP95LatencyMs}ms`);

  if (baseline) {
    const floor = (value) => value - config.allowedRegression;
    if (candidate.recallAtK < floor(baseline.recallAtK)) errors.push('candidate Recall@K regressed below baseline');
    if (candidate.mrr < floor(baseline.mrr)) errors.push('candidate MRR regressed below baseline');
    if (candidate.ndcgAtK < floor(baseline.ndcgAtK)) errors.push('candidate nDCG regressed below baseline');
    if (candidateHardNegativeRate > (baseline.hardNegativeRate ?? 0) + config.allowedRegression) {
      errors.push('candidate hard-negative rate regressed above baseline');
    }
    if (candidate.failureRate > baseline.failureRate + config.allowedRegression) errors.push('candidate failure rate regressed above baseline');
  }

  if (errors.length) {
    const error = new Error(`retrieval quality gate failed (${errors.length}): ${errors.join('; ')}`);
    error.details = errors;
    throw error;
  }
  return Object.freeze({ passed: true, thresholds: Object.freeze(config) });
}
