import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_DIMENSIONS = Object.freeze([384, 2048]);
const QUALITY_KEYS = Object.freeze(['recallAtK', 'mrr', 'ndcgAtK']);
const EPSILON = 1e-12;

function assertFiniteNumber(value, label) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be a finite number`);
  return value;
}

function normalizeReport(report, source = 'report') {
  if (!report || typeof report !== 'object') throw new Error(`${source} must be an object`);
  const embedding = report.embedding;
  const candidate = report.candidate;
  const corpus = report.corpus;
  if (!embedding || !candidate || !corpus) throw new Error(`${source} is missing embedding, candidate, or corpus data`);
  const dimension = Number(embedding.dimension);
  if (!REQUIRED_DIMENSIONS.includes(dimension)) throw new Error(`${source} dimension must be 384 or 2048`);
  if (embedding.requestedDimensions !== dimension) throw new Error(`${source} requested and actual dimensions must match`);
  if (typeof embedding.model !== 'string' || !embedding.model) throw new Error(`${source} model is required`);
  if (!Array.isArray(corpus.ids) || corpus.ids.length !== corpus.count) throw new Error(`${source} corpus IDs must match corpus count`);
  if (report.gate?.passed !== true || report.existingDbModified !== false) throw new Error(`${source} must pass the quality gate without DB mutation`);
  for (const key of QUALITY_KEYS) assertFiniteNumber(candidate[key], `${source} candidate.${key}`);
  assertFiniteNumber(candidate.failureRate, `${source} candidate.failureRate`);
  assertFiniteNumber(candidate.latencyMs?.p95, `${source} candidate.latencyMs.p95`);
  return Object.freeze({ ...report, embedding: { ...embedding, dimension }, source });
}

function metricDelta(low, high, key) {
  return Number((low.candidate[key] - high.candidate[key]).toFixed(12));
}

export function compareNvidiaEmbeddingDimensions(reports, { generatedAt = new Date().toISOString() } = {}) {
  if (!Array.isArray(reports) || reports.length !== 2) throw new Error('exactly two NVIDIA embedding reports are required');
  const normalized = reports.map((report, index) => normalizeReport(report, `report[${index}]`));
  const byDimension = new Map(normalized.map((report) => [report.embedding.dimension, report]));
  for (const dimension of REQUIRED_DIMENSIONS) if (!byDimension.has(dimension)) throw new Error(`missing ${dimension}-dimension report`);

  const compact = byDimension.get(384);
  const full = byDimension.get(2048);
  if (compact.embedding.model !== full.embedding.model) throw new Error('dimension reports must use the same model');
  if (compact.corpus.count !== full.corpus.count || JSON.stringify(compact.corpus.ids) !== JSON.stringify(full.corpus.ids)) {
    throw new Error('dimension reports must use the same corpus revision');
  }

  const qualityDelta = Object.fromEntries(QUALITY_KEYS.map((key) => [key, metricDelta(compact, full, key)]));
  qualityDelta.failureRate = metricDelta(compact, full, 'failureRate');
  const qualityMaintained = QUALITY_KEYS.every((key) => qualityDelta[key] >= -EPSILON)
    && qualityDelta.failureRate <= EPSILON;

  const bytesPerVector = Object.freeze({
    384: 384 * 4,
    2048: 2048 * 4,
  });
  const corpusVectorBytes = Object.freeze({
    384: bytesPerVector[384] * compact.corpus.count,
    2048: bytesPerVector[2048] * full.corpus.count,
  });
  const reductionRatio = 1 - bytesPerVector[384] / bytesPerVector[2048];
  const selectedDimensions = qualityMaintained ? 384 : 2048;

  return Object.freeze({
    schemaVersion: 1,
    model: compact.embedding.model,
    corpus: {
      count: compact.corpus.count,
      ids: [...compact.corpus.ids],
      sourceRefs: compact.corpus.sourceRefs,
    },
    results: REQUIRED_DIMENSIONS.map((dimension) => {
      const report = byDimension.get(dimension);
      return {
        dimensions: dimension,
        recallAtK: report.candidate.recallAtK,
        mrr: report.candidate.mrr,
        ndcgAtK: report.candidate.ndcgAtK,
        failureRate: report.candidate.failureRate,
        p95LatencyMs: report.candidate.latencyMs.p95,
        totalTokens: (report.embedding.documentUsage?.total_tokens || 0) + (report.embedding.queryUsage?.total_tokens || 0),
        bytesPerVector: bytesPerVector[dimension],
        corpusVectorBytes: corpusVectorBytes[dimension],
      };
    }),
    comparison: {
      compactMinusFull: {
        ...qualityDelta,
        p95LatencyMs: Number((compact.candidate.latencyMs.p95 - full.candidate.latencyMs.p95).toFixed(6)),
      },
      qualityMaintained,
      storageReductionRatio: Number(reductionRatio.toFixed(6)),
      storageReductionPercent: Number((reductionRatio * 100).toFixed(2)),
    },
    recommendation: {
      selectedDimensions,
      status: qualityMaintained ? 'prefer-compact' : 'retain-full',
      reason: qualityMaintained
        ? '384 dimensions preserved retrieval quality while reducing float32 vector storage by 81.25%.'
        : '384 dimensions regressed retrieval quality; retain 2048 dimensions.',
      requiresHumanApproval: true,
      changesProductionIndex: false,
    },
    generatedAt,
  });
}

function readReports(inputDir) {
  const files = fs.readdirSync(inputDir)
    .filter((name) => name.endsWith('.json'))
    .sort();
  if (files.length !== 2) throw new Error(`expected exactly two JSON reports in ${inputDir}, found ${files.length}`);
  return files.map((name) => JSON.parse(fs.readFileSync(path.join(inputDir, name), 'utf8')));
}

async function main() {
  const inputArg = process.argv.find((arg) => arg.startsWith('--input-dir='));
  const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
  if (!inputArg || !outputArg) throw new Error('--input-dir and --output are required');
  const inputDir = path.resolve(inputArg.slice('--input-dir='.length));
  const outputPath = path.resolve(outputArg.slice('--output='.length));
  const comparison = compareNvidiaEmbeddingDimensions(readReports(inputDir));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(comparison, null, 2)}\n`, 'utf8');
  console.log(`✓ NVIDIA embedding dimension comparison written: ${outputPath}`);
  console.log(`✓ Recommendation: ${comparison.recommendation.selectedDimensions} dimensions · storage reduction ${comparison.comparison.storageReductionPercent}%`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`✗ NVIDIA embedding dimension comparison failed: ${error.message}`);
    process.exit(1);
  });
}
